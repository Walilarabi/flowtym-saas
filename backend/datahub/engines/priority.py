"""
Flowtym Data Hub - Source Priority Engine
Manages data conflicts and priority resolution between sources
"""
from typing import Dict, List, Any, Optional, Tuple
from datetime import datetime
from enum import Enum
from pydantic import BaseModel
import logging

from ..config import SOURCE_PRIORITY

logger = logging.getLogger(__name__)


class ConflictResolutionStrategy(str, Enum):
    HIGHEST_PRIORITY = "highest_priority"
    MOST_RECENT = "most_recent"
    MERGE = "merge"
    MANUAL = "manual"


class ConflictField(BaseModel):
    """A single field conflict"""
    field_name: str
    source_a: str
    value_a: Any
    priority_a: int
    updated_at_a: datetime
    source_b: str
    value_b: Any
    priority_b: int
    updated_at_b: datetime
    resolved_value: Optional[Any] = None
    resolution_strategy: Optional[ConflictResolutionStrategy] = None


class ConflictResolution(BaseModel):
    """Result of conflict resolution"""
    entity_type: str
    entity_id: str
    conflicts: List[ConflictField]
    merged_data: Dict[str, Any]
    resolution_timestamp: datetime
    auto_resolved: bool
    requires_review: bool


class SourcePriorityEngine:
    """
    Manages data source priorities and conflict resolution.
    
    Priority hierarchy (default):
    - PMS: 100 (highest - source of truth)
    - Direct bookings: 90
    - RMS: 80
    - Channel Manager: 70
    - OTA: 60
    - CRM: 50
    - External API: 40
    - Import: 30
    - Manual: 20
    - Default: 10
    """
    
    def __init__(self, db=None):
        self.db = db
        self.default_priorities = SOURCE_PRIORITY.copy()
        self.custom_priorities: Dict[str, Dict[str, int]] = {}  # tenant_id -> source -> priority
    
    def get_priority(self, source: str, tenant_id: Optional[str] = None) -> int:
        """Get priority for a source, considering tenant overrides"""
        if tenant_id and tenant_id in self.custom_priorities:
            if source in self.custom_priorities[tenant_id]:
                return self.custom_priorities[tenant_id][source]
        return self.default_priorities.get(source, self.default_priorities["default"])
    
    def set_tenant_priority(self, tenant_id: str, source: str, priority: int):
        """Set custom priority for a tenant's source"""
        if tenant_id not in self.custom_priorities:
            self.custom_priorities[tenant_id] = {}
        self.custom_priorities[tenant_id][source] = priority
    
    async def load_tenant_priorities(self, tenant_id: str):
        """Load tenant-specific priority rules from database"""
        if not self.db:
            return
        
        rules = await self.db.dh_priority_rules.find_one({"tenant_id": tenant_id})
        if rules:
            self.custom_priorities[tenant_id] = rules.get("priorities", {})
    
    def detect_conflicts(
        self,
        existing_data: Dict[str, Any],
        new_data: Dict[str, Any],
        existing_source: str,
        new_source: str,
        tenant_id: Optional[str] = None
    ) -> List[ConflictField]:
        """Detect field-level conflicts between two data versions"""
        conflicts = []
        
        existing_priority = self.get_priority(existing_source, tenant_id)
        new_priority = self.get_priority(new_source, tenant_id)
        
        existing_updated = existing_data.get("updated_at", datetime.utcnow())
        new_updated = new_data.get("updated_at", datetime.utcnow())
        
        # Compare all fields
        all_fields = set(existing_data.keys()) | set(new_data.keys())
        excluded_fields = {"id", "_id", "created_at", "updated_at", "synced_at", "version", "metadata"}
        
        for field in all_fields:
            if field in excluded_fields:
                continue
            
            existing_val = existing_data.get(field)
            new_val = new_data.get(field)
            
            # Skip if values are equal
            if existing_val == new_val:
                continue
            
            # Skip if new value is None (don't overwrite with empty)
            if new_val is None:
                continue
            
            conflicts.append(ConflictField(
                field_name=field,
                source_a=existing_source,
                value_a=existing_val,
                priority_a=existing_priority,
                updated_at_a=existing_updated,
                source_b=new_source,
                value_b=new_val,
                priority_b=new_priority,
                updated_at_b=new_updated
            ))
        
        return conflicts
    
    def resolve_conflict(
        self,
        conflict: ConflictField,
        strategy: ConflictResolutionStrategy = ConflictResolutionStrategy.HIGHEST_PRIORITY
    ) -> Any:
        """Resolve a single field conflict"""
        
        if strategy == ConflictResolutionStrategy.HIGHEST_PRIORITY:
            # Higher priority wins
            if conflict.priority_b > conflict.priority_a:
                resolved = conflict.value_b
            elif conflict.priority_a > conflict.priority_b:
                resolved = conflict.value_a
            else:
                # Same priority - use most recent
                resolved = conflict.value_b if conflict.updated_at_b > conflict.updated_at_a else conflict.value_a
        
        elif strategy == ConflictResolutionStrategy.MOST_RECENT:
            resolved = conflict.value_b if conflict.updated_at_b > conflict.updated_at_a else conflict.value_a
        
        elif strategy == ConflictResolutionStrategy.MERGE:
            # For collections, merge; for others, use highest priority
            if isinstance(conflict.value_a, list) and isinstance(conflict.value_b, list):
                resolved = list(set(conflict.value_a + conflict.value_b))
            elif isinstance(conflict.value_a, dict) and isinstance(conflict.value_b, dict):
                resolved = {**conflict.value_a, **conflict.value_b}
            else:
                # Fall back to highest priority
                resolved = conflict.value_b if conflict.priority_b >= conflict.priority_a else conflict.value_a
        
        else:  # MANUAL
            resolved = None
        
        conflict.resolved_value = resolved
        conflict.resolution_strategy = strategy
        return resolved
    
    def resolve_all_conflicts(
        self,
        existing_data: Dict[str, Any],
        new_data: Dict[str, Any],
        existing_source: str,
        new_source: str,
        entity_type: str,
        entity_id: str,
        tenant_id: Optional[str] = None,
        strategy: ConflictResolutionStrategy = ConflictResolutionStrategy.HIGHEST_PRIORITY,
        field_strategies: Optional[Dict[str, ConflictResolutionStrategy]] = None
    ) -> ConflictResolution:
        """
        Resolve all conflicts between existing and new data.
        
        Args:
            existing_data: Current data in system
            new_data: Incoming data
            existing_source: Source of existing data
            new_source: Source of new data
            entity_type: Type of entity (reservation, rate, etc.)
            entity_id: ID of the entity
            tenant_id: Tenant identifier
            strategy: Default resolution strategy
            field_strategies: Per-field strategy overrides
        
        Returns:
            ConflictResolution with merged data
        """
        field_strategies = field_strategies or {}
        
        # Detect conflicts
        conflicts = self.detect_conflicts(
            existing_data, new_data, existing_source, new_source, tenant_id
        )
        
        # Start with existing data
        merged = existing_data.copy()
        requires_review = False
        
        # Resolve each conflict
        for conflict in conflicts:
            field_strategy = field_strategies.get(conflict.field_name, strategy)
            
            if field_strategy == ConflictResolutionStrategy.MANUAL:
                requires_review = True
                continue
            
            resolved_value = self.resolve_conflict(conflict, field_strategy)
            if resolved_value is not None:
                merged[conflict.field_name] = resolved_value
        
        # Update metadata
        merged["updated_at"] = datetime.utcnow()
        merged["version"] = merged.get("version", 0) + 1
        
        # Track source
        if not merged.get("source_history"):
            merged["source_history"] = []
        merged["source_history"].append({
            "source": new_source,
            "updated_at": datetime.utcnow().isoformat(),
            "fields_updated": [c.field_name for c in conflicts if c.resolved_value is not None]
        })
        
        return ConflictResolution(
            entity_type=entity_type,
            entity_id=entity_id,
            conflicts=conflicts,
            merged_data=merged,
            resolution_timestamp=datetime.utcnow(),
            auto_resolved=not requires_review,
            requires_review=requires_review
        )
    
    async def log_conflict_resolution(
        self,
        resolution: ConflictResolution,
        tenant_id: str
    ):
        """Log conflict resolution for audit trail"""
        if not self.db:
            return
        
        await self.db.dh_conflict_log.insert_one({
            "tenant_id": tenant_id,
            "entity_type": resolution.entity_type,
            "entity_id": resolution.entity_id,
            "conflicts_count": len(resolution.conflicts),
            "conflicts": [c.dict() for c in resolution.conflicts],
            "auto_resolved": resolution.auto_resolved,
            "requires_review": resolution.requires_review,
            "resolved_at": resolution.resolution_timestamp.isoformat()
        })
    
    def get_highest_priority_source(self, sources: List[str], tenant_id: Optional[str] = None) -> str:
        """Get the highest priority source from a list"""
        if not sources:
            return "default"
        
        return max(sources, key=lambda s: self.get_priority(s, tenant_id))
    
    def should_update(
        self,
        existing_source: str,
        new_source: str,
        tenant_id: Optional[str] = None
    ) -> bool:
        """Check if new source should update existing data based on priority"""
        existing_priority = self.get_priority(existing_source, tenant_id)
        new_priority = self.get_priority(new_source, tenant_id)
        return new_priority >= existing_priority


# Create singleton instance
priority_engine = SourcePriorityEngine()


def get_priority_engine() -> SourcePriorityEngine:
    """Get the priority engine instance"""
    return priority_engine
