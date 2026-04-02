"""
Flowtym Data Hub - Smart Cache Strategy
Intelligent caching with TTL management, invalidation, and warm-up
"""
from typing import Dict, Any, Optional, List, Callable, Set
from datetime import datetime, timedelta
from pydantic import BaseModel
import asyncio
import hashlib
import json
import logging
from enum import Enum

logger = logging.getLogger(__name__)


class CacheStrategy(str, Enum):
    WRITE_THROUGH = "write_through"    # Write to cache and DB simultaneously
    WRITE_BEHIND = "write_behind"      # Write to cache, async to DB
    WRITE_AROUND = "write_around"      # Write to DB only, invalidate cache
    REFRESH_AHEAD = "refresh_ahead"    # Proactive refresh before expiry


class CacheEntry(BaseModel):
    """Cache entry with metadata"""
    key: str
    value: Any
    entity_type: str
    tenant_id: str
    
    # TTL
    created_at: datetime
    expires_at: datetime
    ttl_seconds: int
    
    # Stats
    hit_count: int = 0
    last_accessed_at: Optional[datetime] = None
    
    # Tags for invalidation
    tags: List[str] = []
    
    # Refresh
    needs_refresh: bool = False
    refresh_at: Optional[datetime] = None


class CacheStats(BaseModel):
    """Cache statistics"""
    total_entries: int = 0
    memory_usage_bytes: int = 0
    hit_count: int = 0
    miss_count: int = 0
    hit_rate: float = 0.0
    eviction_count: int = 0
    expired_count: int = 0


class SmartCache:
    """
    Intelligent caching layer with:
    - Dynamic TTL based on entity type and access patterns
    - Tag-based invalidation
    - Warm-up strategies
    - Refresh-ahead for frequently accessed data
    """
    
    # Default TTLs by entity type (seconds)
    DEFAULT_TTLS = {
        "reservation": 60,       # Reservations change frequently
        "rate": 300,             # Rates cached for 5 minutes
        "availability": 30,      # Availability is critical, short TTL
        "guest": 3600,           # Guests cached for 1 hour
        "room": 3600,            # Rooms rarely change
        "review": 86400,         # Reviews cached for 24 hours
        "connector_config": 300, # Configs cached for 5 minutes
        "default": 300           # Default 5 minutes
    }
    
    # High-frequency entities get refresh-ahead
    REFRESH_AHEAD_ENTITIES = {"availability", "rate", "reservation"}
    REFRESH_AHEAD_THRESHOLD = 0.8  # Refresh when 80% of TTL elapsed
    
    def __init__(self, db=None, max_size: int = 10000):
        self.db = db
        self.max_size = max_size
        self.cache: Dict[str, CacheEntry] = {}
        self.tag_index: Dict[str, Set[str]] = {}  # tag -> set of keys
        self.stats = CacheStats()
        
        # Background tasks
        self._cleanup_task = None
        self._refresh_task = None
    
    def _generate_key(
        self,
        entity_type: str,
        entity_id: str,
        tenant_id: str,
        variant: Optional[str] = None
    ) -> str:
        """Generate cache key"""
        parts = [tenant_id, entity_type, entity_id]
        if variant:
            parts.append(variant)
        key_str = ":".join(parts)
        return hashlib.md5(key_str.encode()).hexdigest()
    
    def _get_ttl(self, entity_type: str, custom_ttl: Optional[int] = None) -> int:
        """Get TTL for entity type"""
        if custom_ttl:
            return custom_ttl
        return self.DEFAULT_TTLS.get(entity_type, self.DEFAULT_TTLS["default"])
    
    def _create_tags(
        self,
        entity_type: str,
        entity_id: str,
        tenant_id: str,
        extra_tags: Optional[List[str]] = None
    ) -> List[str]:
        """Create tags for cache entry"""
        tags = [
            f"tenant:{tenant_id}",
            f"type:{entity_type}",
            f"entity:{entity_type}:{entity_id}"
        ]
        if extra_tags:
            tags.extend(extra_tags)
        return tags
    
    def get(
        self,
        entity_type: str,
        entity_id: str,
        tenant_id: str,
        variant: Optional[str] = None
    ) -> Optional[Any]:
        """Get value from cache"""
        key = self._generate_key(entity_type, entity_id, tenant_id, variant)
        
        entry = self.cache.get(key)
        if not entry:
            self.stats.miss_count += 1
            return None
        
        # Check expiration
        if datetime.utcnow() > entry.expires_at:
            self._remove_entry(key)
            self.stats.miss_count += 1
            self.stats.expired_count += 1
            return None
        
        # Update stats
        entry.hit_count += 1
        entry.last_accessed_at = datetime.utcnow()
        self.stats.hit_count += 1
        
        # Check if refresh needed
        if entity_type in self.REFRESH_AHEAD_ENTITIES:
            time_to_expire = (entry.expires_at - datetime.utcnow()).total_seconds()
            if time_to_expire < entry.ttl_seconds * (1 - self.REFRESH_AHEAD_THRESHOLD):
                entry.needs_refresh = True
        
        return entry.value
    
    def set(
        self,
        entity_type: str,
        entity_id: str,
        tenant_id: str,
        value: Any,
        ttl: Optional[int] = None,
        variant: Optional[str] = None,
        tags: Optional[List[str]] = None
    ) -> str:
        """Set value in cache"""
        key = self._generate_key(entity_type, entity_id, tenant_id, variant)
        ttl_seconds = self._get_ttl(entity_type, ttl)
        
        # Check cache size
        if len(self.cache) >= self.max_size:
            self._evict_lru()
        
        # Create entry
        all_tags = self._create_tags(entity_type, entity_id, tenant_id, tags)
        entry = CacheEntry(
            key=key,
            value=value,
            entity_type=entity_type,
            tenant_id=tenant_id,
            created_at=datetime.utcnow(),
            expires_at=datetime.utcnow() + timedelta(seconds=ttl_seconds),
            ttl_seconds=ttl_seconds,
            tags=all_tags
        )
        
        # Store
        self.cache[key] = entry
        
        # Update tag index
        for tag in all_tags:
            if tag not in self.tag_index:
                self.tag_index[tag] = set()
            self.tag_index[tag].add(key)
        
        self.stats.total_entries = len(self.cache)
        return key
    
    def delete(
        self,
        entity_type: str,
        entity_id: str,
        tenant_id: str,
        variant: Optional[str] = None
    ) -> bool:
        """Delete specific entry from cache"""
        key = self._generate_key(entity_type, entity_id, tenant_id, variant)
        return self._remove_entry(key)
    
    def invalidate_by_tag(self, tag: str) -> int:
        """Invalidate all entries with a specific tag"""
        keys = self.tag_index.get(tag, set()).copy()
        count = 0
        for key in keys:
            if self._remove_entry(key):
                count += 1
        return count
    
    def invalidate_tenant(self, tenant_id: str) -> int:
        """Invalidate all entries for a tenant"""
        return self.invalidate_by_tag(f"tenant:{tenant_id}")
    
    def invalidate_entity_type(self, entity_type: str, tenant_id: str) -> int:
        """Invalidate all entries of a type for a tenant"""
        tag = f"tenant:{tenant_id}"
        type_tag = f"type:{entity_type}"
        
        tenant_keys = self.tag_index.get(tag, set())
        type_keys = self.tag_index.get(type_tag, set())
        
        keys_to_remove = tenant_keys.intersection(type_keys)
        count = 0
        for key in keys_to_remove:
            if self._remove_entry(key):
                count += 1
        return count
    
    def _remove_entry(self, key: str) -> bool:
        """Remove entry and update indexes"""
        entry = self.cache.pop(key, None)
        if not entry:
            return False
        
        # Update tag index
        for tag in entry.tags:
            if tag in self.tag_index:
                self.tag_index[tag].discard(key)
                if not self.tag_index[tag]:
                    del self.tag_index[tag]
        
        self.stats.total_entries = len(self.cache)
        return True
    
    def _evict_lru(self, count: int = 100):
        """Evict least recently used entries"""
        # Sort by last access time
        sorted_entries = sorted(
            self.cache.items(),
            key=lambda x: x[1].last_accessed_at or x[1].created_at
        )
        
        for key, _ in sorted_entries[:count]:
            self._remove_entry(key)
            self.stats.eviction_count += 1
    
    def get_stats(self) -> CacheStats:
        """Get cache statistics"""
        total = self.stats.hit_count + self.stats.miss_count
        self.stats.hit_rate = self.stats.hit_count / total if total > 0 else 0.0
        self.stats.total_entries = len(self.cache)
        return self.stats
    
    def clear(self):
        """Clear all cache"""
        self.cache.clear()
        self.tag_index.clear()
        self.stats = CacheStats()
    
    async def warm_up(
        self,
        tenant_id: str,
        entity_type: str,
        loader: Callable
    ):
        """
        Warm up cache for a tenant's entity type.
        Loader is an async function that returns list of entities.
        """
        try:
            entities = await loader(tenant_id)
            for entity in entities:
                entity_id = entity.get("id") or entity.get("_id")
                if entity_id:
                    self.set(entity_type, str(entity_id), tenant_id, entity)
            logger.info(f"Warmed up {len(entities)} {entity_type} entries for tenant {tenant_id}")
        except Exception as e:
            logger.error(f"Cache warm-up error: {e}")
    
    async def refresh_stale(self, refresher: Callable):
        """
        Refresh entries marked as needing refresh.
        Refresher is an async function that takes (entity_type, entity_id, tenant_id).
        """
        stale_entries = [
            entry for entry in self.cache.values()
            if entry.needs_refresh
        ]
        
        for entry in stale_entries:
            try:
                # Extract entity_id from tags
                entity_tag = next((t for t in entry.tags if t.startswith("entity:")), None)
                if entity_tag:
                    _, entity_type, entity_id = entity_tag.split(":")
                    new_value = await refresher(entity_type, entity_id, entry.tenant_id)
                    if new_value:
                        self.set(entity_type, entity_id, entry.tenant_id, new_value)
            except Exception as e:
                logger.error(f"Cache refresh error: {e}")
    
    async def cleanup_expired(self):
        """Remove expired entries"""
        now = datetime.utcnow()
        expired_keys = [
            key for key, entry in self.cache.items()
            if entry.expires_at < now
        ]
        
        for key in expired_keys:
            self._remove_entry(key)
            self.stats.expired_count += 1
    
    def start_background_tasks(self):
        """Start background cleanup and refresh tasks"""
        async def cleanup_loop():
            while True:
                await asyncio.sleep(60)  # Every minute
                await self.cleanup_expired()
        
        self._cleanup_task = asyncio.create_task(cleanup_loop())
    
    def stop_background_tasks(self):
        """Stop background tasks"""
        if self._cleanup_task:
            self._cleanup_task.cancel()
        if self._refresh_task:
            self._refresh_task.cancel()


# Global cache instance
_cache: Optional[SmartCache] = None


def get_cache() -> SmartCache:
    """Get or create cache instance"""
    global _cache
    if _cache is None:
        _cache = SmartCache()
    return _cache


def init_cache(db=None, max_size: int = 10000) -> SmartCache:
    """Initialize cache with database"""
    global _cache
    _cache = SmartCache(db=db, max_size=max_size)
    return _cache
