"""
Flowtym Data Hub - Normalization Engine

This engine handles the transformation of raw data from external systems
into the Universal Data Model format.

Key Features:
- Field mapping and transformation
- Data type conversion
- Value normalization (statuses, types, etc.)
- Validation
- Audit logging
"""
from typing import Dict, Any, List, Optional, Callable, Type
from datetime import datetime
from pydantic import BaseModel
import logging
import re

from ..models import (
    SourceSystem,
    TransformationLogEntry,
    UniversalBase,
    UniversalReservation,
    UniversalGuest,
    UniversalRate,
    UniversalRoom,
    ReservationStatus,
    PaymentStatus,
    GuestType,
    ChannelType,
    RoomStatus,
    RateType,
    MealPlan,
)


logger = logging.getLogger(__name__)


# ═══════════════════════════════════════════════════════════════════════════════
# FIELD MAPPINGS
# ═══════════════════════════════════════════════════════════════════════════════

class FieldMapping(BaseModel):
    """Definition of a field mapping"""
    source_field: str  # Path in source data (dot notation)
    target_field: str  # Path in universal model
    transformation: Optional[str] = None  # Name of transformation function
    default: Any = None
    required: bool = False


class SourceMapping(BaseModel):
    """Complete mapping configuration for a source system"""
    source_system: SourceSystem
    entity_type: str  # reservation, guest, rate, etc.
    field_mappings: List[FieldMapping]
    status_mappings: Dict[str, str] = {}  # Source status -> Universal status
    custom_transformations: Dict[str, str] = {}


# ═══════════════════════════════════════════════════════════════════════════════
# TRANSFORMATION FUNCTIONS
# ═══════════════════════════════════════════════════════════════════════════════

def transform_date(value: Any) -> Optional[str]:
    """Transform various date formats to YYYY-MM-DD"""
    if not value:
        return None
    
    if isinstance(value, datetime):
        return value.strftime("%Y-%m-%d")
    
    if isinstance(value, str):
        # Handle ISO format with timezone
        value = value.replace("Z", "+00:00")
        
        # Try common formats
        for fmt in ["%Y-%m-%d", "%Y-%m-%dT%H:%M:%S", "%Y-%m-%dT%H:%M:%S%z", 
                   "%d/%m/%Y", "%d-%m-%Y", "%m/%d/%Y"]:
            try:
                dt = datetime.strptime(value[:len("2024-01-01T00:00:00")], fmt[:len(fmt.split("%z")[0])])
                return dt.strftime("%Y-%m-%d")
            except ValueError:
                continue
        
        # If it's already YYYY-MM-DD, return as is
        if re.match(r"^\d{4}-\d{2}-\d{2}$", value):
            return value
    
    return None


def transform_datetime(value: Any) -> Optional[datetime]:
    """Transform various datetime formats to datetime object"""
    if not value:
        return None
    
    if isinstance(value, datetime):
        return value
    
    if isinstance(value, str):
        value = value.replace("Z", "+00:00")
        
        for fmt in ["%Y-%m-%dT%H:%M:%S%z", "%Y-%m-%dT%H:%M:%S", 
                   "%Y-%m-%d %H:%M:%S", "%Y-%m-%d"]:
            try:
                return datetime.strptime(value, fmt)
            except ValueError:
                continue
    
    return None


def transform_phone(value: Any) -> Optional[str]:
    """Normalize phone number format"""
    if not value:
        return None
    
    # Remove all non-digit characters except +
    phone = re.sub(r"[^\d+]", "", str(value))
    
    # Ensure it starts with + for international
    if phone and not phone.startswith("+"):
        # Assume French number if 10 digits
        if len(phone) == 10 and phone.startswith("0"):
            phone = "+33" + phone[1:]
    
    return phone


def transform_email(value: Any) -> Optional[str]:
    """Normalize and validate email"""
    if not value:
        return None
    
    email = str(value).lower().strip()
    
    # Basic validation
    if re.match(r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$", email):
        return email
    
    return None


def transform_price(value: Any) -> float:
    """Transform price to float"""
    if value is None:
        return 0.0
    
    if isinstance(value, (int, float)):
        return float(value)
    
    if isinstance(value, str):
        # Remove currency symbols and spaces
        cleaned = re.sub(r"[€$£\s,]", "", value)
        try:
            return float(cleaned)
        except ValueError:
            return 0.0
    
    if isinstance(value, dict):
        # Handle {value: 100, currency: "EUR"} format
        return float(value.get("value", value.get("Value", value.get("amount", 0))))
    
    return 0.0


def transform_country(value: Any) -> str:
    """Normalize country code to ISO 3166-1 alpha-2"""
    if not value:
        return "FR"  # Default to France
    
    value = str(value).upper().strip()
    
    # Common mappings
    country_map = {
        "FRANCE": "FR", "FRA": "FR", "FRENCH": "FR",
        "GERMANY": "DE", "DEU": "DE", "GERMAN": "DE",
        "UNITED KINGDOM": "GB", "GBR": "GB", "UK": "GB", "ENGLAND": "GB",
        "UNITED STATES": "US", "USA": "US", "AMERICA": "US",
        "SPAIN": "ES", "ESP": "ES", "SPANISH": "ES",
        "ITALY": "IT", "ITA": "IT", "ITALIAN": "IT",
        "BELGIUM": "BE", "BEL": "BE",
        "NETHERLANDS": "NL", "NLD": "NL", "HOLLAND": "NL",
        "SWITZERLAND": "CH", "CHE": "CH",
        "PORTUGAL": "PT", "PRT": "PT",
    }
    
    return country_map.get(value, value[:2] if len(value) >= 2 else "FR")


def transform_language(value: Any) -> str:
    """Normalize language code to ISO 639-1"""
    if not value:
        return "fr"
    
    value = str(value).lower().strip()
    
    # Common mappings
    lang_map = {
        "french": "fr", "fra": "fr", "français": "fr",
        "english": "en", "eng": "en",
        "german": "de", "deu": "de", "deutsch": "de",
        "spanish": "es", "spa": "es", "español": "es",
        "italian": "it", "ita": "it", "italiano": "it",
        "dutch": "nl", "nld": "nl", "nederlands": "nl",
        "portuguese": "pt", "por": "pt", "português": "pt",
    }
    
    return lang_map.get(value, value[:2] if len(value) >= 2 else "fr")


# ═══════════════════════════════════════════════════════════════════════════════
# TRANSFORMATION REGISTRY
# ═══════════════════════════════════════════════════════════════════════════════

TRANSFORMATIONS: Dict[str, Callable] = {
    "date": transform_date,
    "datetime": transform_datetime,
    "phone": transform_phone,
    "email": transform_email,
    "price": transform_price,
    "country": transform_country,
    "language": transform_language,
}


# ═══════════════════════════════════════════════════════════════════════════════
# NORMALIZATION ENGINE
# ═══════════════════════════════════════════════════════════════════════════════

class NormalizationEngine:
    """
    Engine for normalizing data from external systems to Universal format.
    
    Usage:
        engine = NormalizationEngine()
        normalized = engine.normalize_reservation(raw_data, source_system)
    """
    
    def __init__(self):
        self.transformations = TRANSFORMATIONS.copy()
        self.source_mappings: Dict[str, SourceMapping] = {}
        self._register_default_mappings()
    
    def _register_default_mappings(self):
        """Register default field mappings for known sources"""
        # These can be extended or overridden per tenant
        pass
    
    def register_transformation(self, name: str, func: Callable):
        """Register a custom transformation function"""
        self.transformations[name] = func
    
    def get_nested_value(self, data: Dict, path: str, default: Any = None) -> Any:
        """Get a value from nested dict using dot notation path"""
        keys = path.split(".")
        current = data
        
        for key in keys:
            if isinstance(current, dict):
                current = current.get(key)
            elif isinstance(current, list) and key.isdigit():
                idx = int(key)
                current = current[idx] if idx < len(current) else None
            else:
                return default
            
            if current is None:
                return default
        
        return current
    
    def apply_transformation(
        self,
        value: Any,
        transformation_name: Optional[str],
        source_field: str,
        target_field: str
    ) -> tuple[Any, Optional[TransformationLogEntry]]:
        """Apply a transformation function and create log entry"""
        
        if not transformation_name or transformation_name not in self.transformations:
            return value, None
        
        original_value = value
        transform_func = self.transformations[transformation_name]
        
        try:
            transformed_value = transform_func(value)
            
            log_entry = TransformationLogEntry(
                source_system=SourceSystem.MANUAL,  # Will be set by caller
                source_field=source_field,
                original_value=str(original_value) if original_value else None,
                normalized_value=str(transformed_value) if transformed_value else None,
                transformation_rule=transformation_name,
            )
            
            return transformed_value, log_entry
        except Exception as e:
            logger.warning(f"Transformation {transformation_name} failed for {source_field}: {e}")
            return value, None
    
    def calculate_nights(self, check_in: str, check_out: str) -> int:
        """Calculate number of nights between dates"""
        try:
            start = datetime.strptime(check_in, "%Y-%m-%d")
            end = datetime.strptime(check_out, "%Y-%m-%d")
            return max(1, (end - start).days)
        except Exception:
            return 1
    
    def map_reservation_status(
        self,
        source_status: str,
        source_system: SourceSystem
    ) -> ReservationStatus:
        """Map source system status to universal status"""
        
        # Status mappings per source system
        mappings = {
            SourceSystem.MEWS: {
                "enquired": ReservationStatus.PENDING,
                "requested": ReservationStatus.PENDING,
                "optional": ReservationStatus.PENDING,
                "confirmed": ReservationStatus.CONFIRMED,
                "started": ReservationStatus.CHECKED_IN,
                "processed": ReservationStatus.CHECKED_OUT,
                "canceled": ReservationStatus.CANCELLED,
            },
            SourceSystem.BOOKING_COM: {
                "booked": ReservationStatus.CONFIRMED,
                "modified": ReservationStatus.MODIFIED,
                "cancelled": ReservationStatus.CANCELLED,
                "no_show": ReservationStatus.NO_SHOW,
            },
            SourceSystem.DEDGE: {
                "confirmed": ReservationStatus.CONFIRMED,
                "modified": ReservationStatus.MODIFIED,
                "cancelled": ReservationStatus.CANCELLED,
            },
            SourceSystem.FLOWTYM_PMS: {
                "pending": ReservationStatus.PENDING,
                "confirmed": ReservationStatus.CONFIRMED,
                "checked_in": ReservationStatus.CHECKED_IN,
                "checked_out": ReservationStatus.CHECKED_OUT,
                "cancelled": ReservationStatus.CANCELLED,
                "no_show": ReservationStatus.NO_SHOW,
            },
        }
        
        source_mapping = mappings.get(source_system, {})
        return source_mapping.get(source_status.lower(), ReservationStatus.CONFIRMED)
    
    def map_channel(self, source_channel: str, source_system: SourceSystem) -> ChannelType:
        """Map source channel to universal channel type"""
        
        channel_mappings = {
            "booking.com": ChannelType.BOOKING_COM,
            "booking_com": ChannelType.BOOKING_COM,
            "bkg": ChannelType.BOOKING_COM,
            "expedia": ChannelType.EXPEDIA,
            "exp": ChannelType.EXPEDIA,
            "airbnb": ChannelType.AIRBNB,
            "air": ChannelType.AIRBNB,
            "hrs": ChannelType.HRS,
            "direct": ChannelType.DIRECT,
            "dir": ChannelType.DIRECT,
            "website": ChannelType.DIRECT,
            "walk-in": ChannelType.DIRECT,
            "phone": ChannelType.DIRECT,
        }
        
        return channel_mappings.get(source_channel.lower(), ChannelType.OTHER)
    
    def map_meal_plan(self, source_meal: str) -> MealPlan:
        """Map source meal plan to universal meal plan"""
        
        meal_mappings = {
            "ro": MealPlan.ROOM_ONLY,
            "room_only": MealPlan.ROOM_ONLY,
            "no meal": MealPlan.ROOM_ONLY,
            "bb": MealPlan.BREAKFAST,
            "breakfast": MealPlan.BREAKFAST,
            "breakfast_included": MealPlan.BREAKFAST,
            "hb": MealPlan.HALF_BOARD,
            "half_board": MealPlan.HALF_BOARD,
            "half board": MealPlan.HALF_BOARD,
            "fb": MealPlan.FULL_BOARD,
            "full_board": MealPlan.FULL_BOARD,
            "full board": MealPlan.FULL_BOARD,
            "ai": MealPlan.ALL_INCLUSIVE,
            "all_inclusive": MealPlan.ALL_INCLUSIVE,
            "all inclusive": MealPlan.ALL_INCLUSIVE,
        }
        
        return meal_mappings.get(source_meal.lower(), MealPlan.ROOM_ONLY)
    
    def validate_reservation(self, reservation: UniversalReservation) -> List[str]:
        """Validate a normalized reservation and return list of issues"""
        issues = []
        
        # Required fields
        if not reservation.confirmation_number:
            issues.append("Missing confirmation_number")
        
        if not reservation.check_in_date:
            issues.append("Missing check_in_date")
        
        if not reservation.check_out_date:
            issues.append("Missing check_out_date")
        
        # Date validation
        if reservation.check_in_date and reservation.check_out_date:
            if reservation.check_in_date >= reservation.check_out_date:
                issues.append("check_in_date must be before check_out_date")
        
        # Financial validation
        if reservation.total_amount < 0:
            issues.append("total_amount cannot be negative")
        
        # Guest validation
        if not reservation.guests:
            issues.append("No guests attached to reservation")
        else:
            primary_guests = [g for g in reservation.guests if g.is_primary]
            if not primary_guests:
                issues.append("No primary guest designated")
        
        return issues


# ═══════════════════════════════════════════════════════════════════════════════
# SINGLETON INSTANCE
# ═══════════════════════════════════════════════════════════════════════════════

_engine_instance: Optional[NormalizationEngine] = None


def get_normalization_engine() -> NormalizationEngine:
    """Get the singleton normalization engine instance"""
    global _engine_instance
    if _engine_instance is None:
        _engine_instance = NormalizationEngine()
    return _engine_instance


__all__ = [
    "NormalizationEngine",
    "get_normalization_engine",
    "FieldMapping",
    "SourceMapping",
    "transform_date",
    "transform_datetime",
    "transform_phone",
    "transform_email",
    "transform_price",
    "transform_country",
    "transform_language",
]
