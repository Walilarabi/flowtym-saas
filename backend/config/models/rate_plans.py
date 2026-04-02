"""
Flowtym Configuration Module - Rate Plans Models

These models define pricing structures, rate plans, and derivation rules.
"""
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime, date
from enum import Enum
import uuid


class RateType(str, Enum):
    """Rate plan types"""
    BAR = "bar"  # Best Available Rate
    FLEXIBLE = "flexible"
    NON_REFUNDABLE = "non_refundable"
    ADVANCE_PURCHASE = "advance_purchase"
    CORPORATE = "corporate"
    GROUP = "group"
    PACKAGE = "package"
    PROMOTIONAL = "promotional"
    MEMBER = "member"
    LAST_MINUTE = "last_minute"


class MealPlan(str, Enum):
    """Meal plan types"""
    ROOM_ONLY = "room_only"
    BREAKFAST = "breakfast"
    HALF_BOARD = "half_board"
    FULL_BOARD = "full_board"
    ALL_INCLUSIVE = "all_inclusive"


class DerivationMethod(str, Enum):
    """How to calculate derived rates"""
    PERCENTAGE = "percentage"  # +/- X%
    FIXED_AMOUNT = "fixed_amount"  # +/- X EUR
    MANUAL = "manual"  # No derivation, manual pricing


class DerivationRule(BaseModel):
    """Rule for deriving a rate from a parent rate"""
    method: DerivationMethod = DerivationMethod.PERCENTAGE
    value: float = 0  # -5 means -5% or -5 EUR depending on method
    round_to: float = 1  # Round to nearest X (1 = whole number, 0.5 = half)
    min_price: Optional[float] = None  # Minimum price floor
    max_price: Optional[float] = None  # Maximum price ceiling


class RatePlanRestrictions(BaseModel):
    """Booking restrictions for a rate plan"""
    min_stay: Optional[int] = None  # Minimum nights
    max_stay: Optional[int] = None  # Maximum nights
    min_advance_days: Optional[int] = None  # Book at least X days in advance
    max_advance_days: Optional[int] = None  # Book at most X days in advance
    closed_to_arrival: List[int] = Field(default_factory=list)  # Days of week (0=Mon, 6=Sun)
    closed_to_departure: List[int] = Field(default_factory=list)
    min_occupancy: Optional[int] = None
    max_occupancy: Optional[int] = None


class RatePlan(BaseModel):
    """
    Rate Plan Model
    
    Defines a pricing strategy that can be:
    - A base rate (BAR) with manual pricing
    - A derived rate calculated from a parent rate
    
    Links to:
    - Room Types (which rooms this rate applies to)
    - Policies (cancellation, payment conditions)
    - Channels (where this rate is distributed)
    """
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    tenant_id: str
    
    # Identification
    code: str  # BAR, NRF, CORP, etc.
    name: str  # "Best Available Rate - Flexible"
    name_en: Optional[str] = None
    
    # Classification
    rate_type: RateType = RateType.FLEXIBLE
    meal_plan: MealPlan = MealPlan.ROOM_ONLY
    
    # Derivation
    is_derived: bool = False
    parent_rate_id: Optional[str] = None  # If derived, reference to parent
    derivation_rule: Optional[DerivationRule] = None
    
    # Room Type Pricing (for base rates)
    # Maps room_type_id -> base price
    room_prices: Dict[str, float] = Field(default_factory=dict)
    currency: str = "EUR"
    
    # Reference room for display
    reference_room_type_id: Optional[str] = None
    reference_price: float = 0  # Base price for the reference room
    
    # Inclusions
    includes_breakfast: bool = False
    includes_parking: bool = False
    includes_wifi: bool = True
    extra_inclusions: List[str] = Field(default_factory=list)
    
    # Restrictions
    restrictions: RatePlanRestrictions = Field(default_factory=RatePlanRestrictions)
    
    # Policy References
    cancellation_policy_id: Optional[str] = None
    payment_policy_id: Optional[str] = None
    
    # Commission (for OTA distribution)
    is_commissionable: bool = True
    commission_rate: Optional[float] = None  # Override default
    
    # Distribution
    channels: List[str] = Field(default_factory=list)  # Channel IDs or names
    is_public: bool = True  # Visible on booking engine
    
    # Validity
    valid_from: Optional[date] = None
    valid_to: Optional[date] = None
    
    # Status
    is_active: bool = True
    sort_order: int = 0
    
    # Description
    description: Optional[str] = None
    description_en: Optional[str] = None
    terms: Optional[str] = None
    
    # OTA Mappings
    ota_mappings: Dict[str, str] = Field(default_factory=dict)
    
    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class RatePlanCreate(BaseModel):
    """Schema for creating a rate plan"""
    code: str
    name: str
    name_en: Optional[str] = None
    rate_type: RateType = RateType.FLEXIBLE
    meal_plan: MealPlan = MealPlan.ROOM_ONLY
    is_derived: bool = False
    parent_rate_id: Optional[str] = None
    derivation_rule: Optional[DerivationRule] = None
    room_prices: Dict[str, float] = Field(default_factory=dict)
    reference_room_type_id: Optional[str] = None
    reference_price: float = 0
    includes_breakfast: bool = False
    restrictions: Optional[RatePlanRestrictions] = None
    cancellation_policy_id: Optional[str] = None
    payment_policy_id: Optional[str] = None
    channels: List[str] = Field(default_factory=list)
    is_public: bool = True
    description: Optional[str] = None


class RatePlanUpdate(BaseModel):
    """Schema for updating a rate plan"""
    code: Optional[str] = None
    name: Optional[str] = None
    name_en: Optional[str] = None
    rate_type: Optional[RateType] = None
    meal_plan: Optional[MealPlan] = None
    is_derived: Optional[bool] = None
    parent_rate_id: Optional[str] = None
    derivation_rule: Optional[DerivationRule] = None
    room_prices: Optional[Dict[str, float]] = None
    reference_room_type_id: Optional[str] = None
    reference_price: Optional[float] = None
    includes_breakfast: Optional[bool] = None
    includes_parking: Optional[bool] = None
    includes_wifi: Optional[bool] = None
    extra_inclusions: Optional[List[str]] = None
    restrictions: Optional[RatePlanRestrictions] = None
    cancellation_policy_id: Optional[str] = None
    payment_policy_id: Optional[str] = None
    is_commissionable: Optional[bool] = None
    commission_rate: Optional[float] = None
    channels: Optional[List[str]] = None
    is_public: Optional[bool] = None
    valid_from: Optional[date] = None
    valid_to: Optional[date] = None
    is_active: Optional[bool] = None
    sort_order: Optional[int] = None
    description: Optional[str] = None
    description_en: Optional[str] = None
    terms: Optional[str] = None


class RateSimulation(BaseModel):
    """Response for rate simulation/preview"""
    room_type_id: str
    room_type_name: str
    base_rate_price: float
    derived_prices: Dict[str, float]  # rate_plan_id -> calculated price
    currency: str = "EUR"
