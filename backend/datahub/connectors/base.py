"""
Flowtym Data Hub - Base Connector

This is the abstract base class for all connectors.
Every connector (PMS, OTA, Payment, etc.) must inherit from this class.

Design Principles:
- Plug-and-play: Easy to add new connectors without modifying core
- Standardized interface: All connectors have the same methods
- Built-in logging and error handling
- Multi-tenant support
"""
from abc import ABC, abstractmethod
from typing import Optional, List, Dict, Any, TypeVar, Generic
from datetime import datetime
from pydantic import BaseModel
import logging
import uuid

from ..models import (
    ConnectorConfig,
    ConnectorStatus,
    ConnectorType,
    SyncRecord,
    SyncStatus,
    SyncDirection,
    SourceSystem,
    UniversalReservation,
    UniversalGuest,
    UniversalRate,
    UniversalRoom,
    TransformationLogEntry,
)


logger = logging.getLogger(__name__)

T = TypeVar('T', bound=BaseModel)


class ConnectorError(Exception):
    """Base exception for connector errors"""
    def __init__(self, message: str, connector_name: str, error_code: str = None, details: Dict = None):
        self.message = message
        self.connector_name = connector_name
        self.error_code = error_code
        self.details = details or {}
        super().__init__(self.message)


class AuthenticationError(ConnectorError):
    """Authentication failed"""
    pass


class RateLimitError(ConnectorError):
    """Rate limit exceeded"""
    def __init__(self, message: str, connector_name: str, retry_after: int = 60, **kwargs):
        self.retry_after = retry_after
        super().__init__(message, connector_name, **kwargs)


class SyncError(ConnectorError):
    """Sync operation failed"""
    pass


class BaseConnector(ABC):
    """
    Abstract base class for all Data Hub connectors.
    
    Every external system connector must implement this interface.
    """
    
    # Class attributes - override in subclasses
    CONNECTOR_NAME: str = "base"
    CONNECTOR_TYPE: ConnectorType = ConnectorType.PMS
    DISPLAY_NAME: str = "Base Connector"
    SOURCE_SYSTEM: SourceSystem = SourceSystem.MANUAL
    VERSION: str = "1.0.0"
    
    def __init__(self, config: ConnectorConfig):
        """
        Initialize the connector with configuration.
        
        Args:
            config: ConnectorConfig with credentials and settings
        """
        self.config = config
        self.tenant_id = config.tenant_id
        self._is_connected = False
        self._last_error: Optional[str] = None
        self._sync_records: List[SyncRecord] = []
        
        self.logger = logging.getLogger(f"datahub.connectors.{self.CONNECTOR_NAME}")
    
    # ─────────────────────────────────────────────────────────────────────────
    # Connection Management
    # ─────────────────────────────────────────────────────────────────────────
    
    @abstractmethod
    async def connect(self) -> bool:
        """
        Establish connection to the external system.
        
        Returns:
            True if connection successful, False otherwise
        """
        pass
    
    @abstractmethod
    async def disconnect(self) -> bool:
        """
        Close connection to the external system.
        
        Returns:
            True if disconnection successful
        """
        pass
    
    @abstractmethod
    async def test_connection(self) -> Dict[str, Any]:
        """
        Test the connection and return status details.
        
        Returns:
            Dict with status, message, and any details
        """
        pass
    
    async def health_check(self) -> Dict[str, Any]:
        """
        Perform a health check on the connector.
        
        Returns:
            Dict with health status
        """
        try:
            test_result = await self.test_connection()
            return {
                "connector": self.CONNECTOR_NAME,
                "status": "healthy" if test_result.get("success") else "unhealthy",
                "is_connected": self._is_connected,
                "last_error": self._last_error,
                "checked_at": datetime.utcnow().isoformat(),
                "details": test_result
            }
        except Exception as e:
            return {
                "connector": self.CONNECTOR_NAME,
                "status": "unhealthy",
                "is_connected": False,
                "last_error": str(e),
                "checked_at": datetime.utcnow().isoformat()
            }
    
    @property
    def is_connected(self) -> bool:
        return self._is_connected
    
    @property
    def status(self) -> ConnectorStatus:
        if self._is_connected:
            return ConnectorStatus.CONNECTED
        elif self._last_error:
            return ConnectorStatus.ERROR
        else:
            return ConnectorStatus.DISCONNECTED
    
    # ─────────────────────────────────────────────────────────────────────────
    # Data Fetching (Pull) - Override in subclasses
    # ─────────────────────────────────────────────────────────────────────────
    
    async def fetch_reservations(
        self,
        from_date: Optional[str] = None,
        to_date: Optional[str] = None,
        modified_since: Optional[datetime] = None,
        limit: int = 100,
        cursor: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Fetch reservations from the external system.
        
        Args:
            from_date: Start date filter (YYYY-MM-DD)
            to_date: End date filter
            modified_since: Only fetch records modified after this time
            limit: Max records to fetch
            cursor: Pagination cursor
            
        Returns:
            Dict with 'data' (list of raw records), 'cursor' (for pagination), 'total'
        """
        raise NotImplementedError(f"{self.CONNECTOR_NAME} does not support fetching reservations")
    
    async def fetch_guests(
        self,
        modified_since: Optional[datetime] = None,
        limit: int = 100,
        cursor: Optional[str] = None
    ) -> Dict[str, Any]:
        """Fetch guests from the external system."""
        raise NotImplementedError(f"{self.CONNECTOR_NAME} does not support fetching guests")
    
    async def fetch_rates(
        self,
        from_date: Optional[str] = None,
        to_date: Optional[str] = None,
        room_type_codes: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """Fetch rates from the external system."""
        raise NotImplementedError(f"{self.CONNECTOR_NAME} does not support fetching rates")
    
    async def fetch_availability(
        self,
        from_date: str,
        to_date: str,
        room_type_codes: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """Fetch availability from the external system."""
        raise NotImplementedError(f"{self.CONNECTOR_NAME} does not support fetching availability")
    
    async def fetch_rooms(self) -> Dict[str, Any]:
        """Fetch room inventory from the external system."""
        raise NotImplementedError(f"{self.CONNECTOR_NAME} does not support fetching rooms")
    
    # ─────────────────────────────────────────────────────────────────────────
    # Data Pushing - Override in subclasses that support push
    # ─────────────────────────────────────────────────────────────────────────
    
    async def push_rates(self, rates: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Push rates to the external system."""
        raise NotImplementedError(f"{self.CONNECTOR_NAME} does not support pushing rates")
    
    async def push_availability(self, availability: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Push availability to the external system."""
        raise NotImplementedError(f"{self.CONNECTOR_NAME} does not support pushing availability")
    
    async def push_reservation(self, reservation: Dict[str, Any]) -> Dict[str, Any]:
        """Push a reservation to the external system."""
        raise NotImplementedError(f"{self.CONNECTOR_NAME} does not support pushing reservations")
    
    # ─────────────────────────────────────────────────────────────────────────
    # Data Normalization - Override in subclasses
    # ─────────────────────────────────────────────────────────────────────────
    
    @abstractmethod
    def normalize_reservation(self, raw_data: Dict[str, Any]) -> UniversalReservation:
        """
        Transform raw reservation data to universal format.
        
        Args:
            raw_data: Raw data from the external system
            
        Returns:
            UniversalReservation instance
        """
        pass
    
    def normalize_guest(self, raw_data: Dict[str, Any]) -> UniversalGuest:
        """Transform raw guest data to universal format."""
        raise NotImplementedError(f"{self.CONNECTOR_NAME} does not implement guest normalization")
    
    def normalize_rate(self, raw_data: Dict[str, Any]) -> UniversalRate:
        """Transform raw rate data to universal format."""
        raise NotImplementedError(f"{self.CONNECTOR_NAME} does not implement rate normalization")
    
    def normalize_room(self, raw_data: Dict[str, Any]) -> UniversalRoom:
        """Transform raw room data to universal format."""
        raise NotImplementedError(f"{self.CONNECTOR_NAME} does not implement room normalization")
    
    # ─────────────────────────────────────────────────────────────────────────
    # Sync Operations
    # ─────────────────────────────────────────────────────────────────────────
    
    async def sync_reservations(
        self,
        from_date: Optional[str] = None,
        to_date: Optional[str] = None,
        full_sync: bool = False
    ) -> SyncRecord:
        """
        Sync reservations from the external system.
        
        Returns:
            SyncRecord with sync results
        """
        sync = SyncRecord(
            direction=SyncDirection.INBOUND,
            entity_type="reservations",
            status=SyncStatus.SYNCING
        )
        
        try:
            self.logger.info(f"Starting reservation sync for tenant {self.tenant_id}")
            
            cursor = None
            all_normalized = []
            
            while True:
                result = await self.fetch_reservations(
                    from_date=from_date,
                    to_date=to_date,
                    modified_since=None if full_sync else self.config.last_sync_at,
                    cursor=cursor
                )
                
                raw_records = result.get("data", [])
                sync.total_records += len(raw_records)
                
                for raw in raw_records:
                    try:
                        normalized = self.normalize_reservation(raw)
                        all_normalized.append(normalized)
                        sync.processed_records += 1
                    except Exception as e:
                        sync.failed_records += 1
                        sync.errors.append({
                            "source_id": raw.get("id", "unknown"),
                            "error": str(e)
                        })
                
                cursor = result.get("cursor")
                if not cursor:
                    break
            
            sync.status = SyncStatus.SUCCESS if sync.failed_records == 0 else SyncStatus.PARTIAL
            sync.completed_at = datetime.utcnow()
            sync.duration_ms = int((sync.completed_at - sync.started_at).total_seconds() * 1000)
            
            self.logger.info(f"Sync completed: {sync.processed_records}/{sync.total_records} records")
            
            return sync
            
        except Exception as e:
            sync.status = SyncStatus.FAILED
            sync.error_sample = str(e)
            sync.completed_at = datetime.utcnow()
            self._last_error = str(e)
            self.logger.error(f"Sync failed: {e}")
            return sync
    
    # ─────────────────────────────────────────────────────────────────────────
    # Utility Methods
    # ─────────────────────────────────────────────────────────────────────────
    
    def create_transformation_log(
        self,
        source_field: str,
        original_value: Any,
        normalized_value: Any,
        transformation_rule: str
    ) -> TransformationLogEntry:
        """Create a transformation log entry for audit trail."""
        return TransformationLogEntry(
            source_system=self.SOURCE_SYSTEM,
            source_field=source_field,
            original_value=original_value,
            normalized_value=normalized_value,
            transformation_rule=transformation_rule,
            connector_version=self.VERSION
        )
    
    def get_connector_info(self) -> Dict[str, Any]:
        """Get connector information."""
        return {
            "connector_name": self.CONNECTOR_NAME,
            "connector_type": self.CONNECTOR_TYPE.value,
            "display_name": self.DISPLAY_NAME,
            "source_system": self.SOURCE_SYSTEM.value,
            "version": self.VERSION,
            "status": self.status.value,
            "is_connected": self._is_connected,
            "tenant_id": self.tenant_id,
            "last_error": self._last_error
        }


# ═══════════════════════════════════════════════════════════════════════════════
# CONNECTOR REGISTRY
# ═══════════════════════════════════════════════════════════════════════════════

class ConnectorRegistry:
    """
    Registry for all available connectors.
    
    Connectors register themselves here for discovery and instantiation.
    """
    
    _connectors: Dict[str, type] = {}
    
    @classmethod
    def register(cls, connector_class: type):
        """Register a connector class."""
        name = connector_class.CONNECTOR_NAME
        cls._connectors[name] = connector_class
        logger.info(f"Registered connector: {name}")
        return connector_class
    
    @classmethod
    def get_connector_class(cls, name: str) -> Optional[type]:
        """Get a connector class by name."""
        return cls._connectors.get(name)
    
    @classmethod
    def create_connector(cls, name: str, config: ConnectorConfig) -> BaseConnector:
        """Create a connector instance."""
        connector_class = cls.get_connector_class(name)
        if not connector_class:
            raise ValueError(f"Unknown connector: {name}")
        return connector_class(config)
    
    @classmethod
    def list_connectors(cls) -> List[Dict[str, Any]]:
        """List all registered connectors."""
        return [
            {
                "name": name,
                "type": conn.CONNECTOR_TYPE.value,
                "display_name": conn.DISPLAY_NAME,
                "version": conn.VERSION
            }
            for name, conn in cls._connectors.items()
        ]
    
    @classmethod
    def get_connectors_by_type(cls, connector_type: ConnectorType) -> List[str]:
        """Get all connector names of a specific type."""
        return [
            name for name, conn in cls._connectors.items()
            if conn.CONNECTOR_TYPE == connector_type
        ]


def register_connector(cls):
    """Decorator to register a connector."""
    ConnectorRegistry.register(cls)
    return cls
