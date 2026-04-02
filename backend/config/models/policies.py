"""
Flowtym Configuration Module - Policies Models

These models define cancellation and payment policies.
"""
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum
import uuid


# ═══════════════════════════════════════════════════════════════════════════════
# CANCELLATION POLICIES
# ═══════════════════════════════════════════════════════════════════════════════

class CancellationPolicyType(str, Enum):
    """Cancellation policy types"""
    FLEXIBLE = "flexible"
    SEMI_FLEXIBLE = "semi_flexible"
    NON_REFUNDABLE = "non_refundable"
    GROUP = "group"
    CUSTOM = "custom"


class PenaltyType(str, Enum):
    """Type of cancellation penalty"""
    NO_PENALTY = "no_penalty"
    FIRST_NIGHT = "first_night"
    PERCENTAGE = "percentage"
    FIXED_AMOUNT = "fixed_amount"
    FULL_STAY = "full_stay"


class CancellationRule(BaseModel):
    """A rule within a cancellation policy"""
    days_before_arrival: int  # Apply this rule if cancelled X days before
    penalty_type: PenaltyType = PenaltyType.NO_PENALTY
    penalty_value: float = 0  # Percentage or fixed amount
    penalty_nights: int = 0  # Number of nights charged


class CancellationPolicy(BaseModel):
    """
    Cancellation Policy Model
    
    Defines the rules for cancellations and modifications.
    Linked to rate plans.
    """
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    tenant_id: str
    
    # Identification
    code: str  # FLEX, SEMI, NRF, GROUP
    name: str  # "Flexible - Annulation gratuite"
    name_en: Optional[str] = None
    policy_type: CancellationPolicyType = CancellationPolicyType.FLEXIBLE
    
    # Rules (ordered by days_before_arrival descending)
    rules: List[CancellationRule] = Field(default_factory=list)
    
    # No-show
    no_show_penalty_type: PenaltyType = PenaltyType.FIRST_NIGHT
    no_show_penalty_value: float = 0
    
    # Modification rules
    allow_modifications: bool = True
    modification_fee: float = 0
    modification_deadline_hours: int = 24
    
    # Description
    description: Optional[str] = None
    description_en: Optional[str] = None
    terms_short: Optional[str] = None  # For display on booking engine
    terms_full: Optional[str] = None  # Full legal text
    
    # Status
    is_active: bool = True
    is_default: bool = False
    sort_order: int = 0
    
    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class CancellationPolicyCreate(BaseModel):
    """Schema for creating a cancellation policy"""
    code: str
    name: str
    name_en: Optional[str] = None
    policy_type: CancellationPolicyType = CancellationPolicyType.FLEXIBLE
    rules: List[CancellationRule] = Field(default_factory=list)
    no_show_penalty_type: PenaltyType = PenaltyType.FIRST_NIGHT
    allow_modifications: bool = True
    description: Optional[str] = None
    terms_short: Optional[str] = None


class CancellationPolicyUpdate(BaseModel):
    """Schema for updating a cancellation policy"""
    code: Optional[str] = None
    name: Optional[str] = None
    name_en: Optional[str] = None
    policy_type: Optional[CancellationPolicyType] = None
    rules: Optional[List[CancellationRule]] = None
    no_show_penalty_type: Optional[PenaltyType] = None
    no_show_penalty_value: Optional[float] = None
    allow_modifications: Optional[bool] = None
    modification_fee: Optional[float] = None
    modification_deadline_hours: Optional[int] = None
    description: Optional[str] = None
    description_en: Optional[str] = None
    terms_short: Optional[str] = None
    terms_full: Optional[str] = None
    is_active: Optional[bool] = None
    is_default: Optional[bool] = None
    sort_order: Optional[int] = None


# ═══════════════════════════════════════════════════════════════════════════════
# PAYMENT POLICIES
# ═══════════════════════════════════════════════════════════════════════════════

class PaymentTiming(str, Enum):
    """When payment is required"""
    AT_BOOKING = "at_booking"  # Full payment when booking
    AT_ARRIVAL = "at_arrival"  # Payment on check-in
    AT_DEPARTURE = "at_departure"  # Payment on check-out
    DEPOSIT = "deposit"  # Partial payment at booking
    INVOICE = "invoice"  # Post-stay invoice (corporate)


class PaymentMethod(str, Enum):
    """Accepted payment methods"""
    CREDIT_CARD = "credit_card"
    DEBIT_CARD = "debit_card"
    BANK_TRANSFER = "bank_transfer"
    CASH = "cash"
    INVOICE = "invoice"
    VIRTUAL_CARD = "virtual_card"  # OTA virtual cards


class PaymentPolicy(BaseModel):
    """
    Payment Policy Model
    
    Defines when and how payment is collected.
    Linked to rate plans.
    """
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    tenant_id: str
    
    # Identification
    code: str  # PAY_ARR, PREPAY, DEPOSIT
    name: str  # "Paiement à l'arrivée"
    name_en: Optional[str] = None
    
    # Payment timing
    timing: PaymentTiming = PaymentTiming.AT_ARRIVAL
    
    # Deposit settings (if timing == DEPOSIT)
    deposit_percentage: float = 0  # e.g., 30%
    deposit_fixed_amount: float = 0  # Or fixed amount
    deposit_due_days: int = 0  # Days after booking
    
    # Balance due
    balance_due_timing: PaymentTiming = PaymentTiming.AT_ARRIVAL
    balance_due_days_before: int = 0  # Days before arrival
    
    # Accepted methods
    accepted_methods: List[PaymentMethod] = Field(default_factory=lambda: [
        PaymentMethod.CREDIT_CARD,
        PaymentMethod.CASH
    ])
    
    # Card guarantee
    requires_card_guarantee: bool = False
    card_pre_auth_amount: float = 0  # Pre-authorization amount
    
    # Description
    description: Optional[str] = None
    description_en: Optional[str] = None
    
    # Status
    is_active: bool = True
    is_default: bool = False
    sort_order: int = 0
    
    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class PaymentPolicyCreate(BaseModel):
    """Schema for creating a payment policy"""
    code: str
    name: str
    name_en: Optional[str] = None
    timing: PaymentTiming = PaymentTiming.AT_ARRIVAL
    deposit_percentage: float = 0
    deposit_fixed_amount: float = 0
    balance_due_timing: PaymentTiming = PaymentTiming.AT_ARRIVAL
    accepted_methods: List[PaymentMethod] = Field(default_factory=lambda: [PaymentMethod.CREDIT_CARD])
    requires_card_guarantee: bool = False
    description: Optional[str] = None


class PaymentPolicyUpdate(BaseModel):
    """Schema for updating a payment policy"""
    code: Optional[str] = None
    name: Optional[str] = None
    name_en: Optional[str] = None
    timing: Optional[PaymentTiming] = None
    deposit_percentage: Optional[float] = None
    deposit_fixed_amount: Optional[float] = None
    deposit_due_days: Optional[int] = None
    balance_due_timing: Optional[PaymentTiming] = None
    balance_due_days_before: Optional[int] = None
    accepted_methods: Optional[List[PaymentMethod]] = None
    requires_card_guarantee: Optional[bool] = None
    card_pre_auth_amount: Optional[float] = None
    description: Optional[str] = None
    description_en: Optional[str] = None
    is_active: Optional[bool] = None
    is_default: Optional[bool] = None
    sort_order: Optional[int] = None
