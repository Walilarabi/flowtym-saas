"""
Hoptym RMS - Pydantic Models & MongoDB Schemas
"""
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime, date
from enum import Enum
import uuid


# ═══════════════════════════════════════════════════════════════════════════════
# ENUMS
# ═══════════════════════════════════════════════════════════════════════════════

class StrategyType(str, Enum):
    CONSERVATIVE = "conservative"
    BALANCED = "balanced"
    AGGRESSIVE = "aggressive"
    DYNAMIC = "dynamic"


class RecommendationType(str, Enum):
    PRICE_INCREASE = "price_increase"
    PRICE_DECREASE = "price_decrease"
    PROMOTION = "promotion"
    RESTRICTION = "restriction"
    OVERBOOKING = "overbooking"
    ALERT = "alert"
    OPPORTUNITY = "opportunity"


class RecommendationStatus(str, Enum):
    PENDING = "pending"
    APPLIED = "applied"
    DISMISSED = "dismissed"
    EXPIRED = "expired"
    AUTO_APPLIED = "auto_applied"


class RecommendationPriority(str, Enum):
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


class DemandLevel(str, Enum):
    VERY_LOW = "very_low"
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    PEAK = "peak"


class ConnectorStatus(str, Enum):
    CONNECTED = "connected"
    DISCONNECTED = "disconnected"
    ERROR = "error"
    SYNCING = "syncing"


# ═══════════════════════════════════════════════════════════════════════════════
# WEIGHT FACTOR MODELS
# ═══════════════════════════════════════════════════════════════════════════════

class WeightFactor(BaseModel):
    """Individual weight factor for pricing algorithm"""
    factor_id: str
    label: str
    value: float = Field(ge=0, le=100, description="Weight percentage 0-100")
    color: str = "#4f46e5"
    description: Optional[str] = None


class WeightConfiguration(BaseModel):
    """Complete weight configuration for a hotel"""
    hotel_id: str
    factors: List[WeightFactor] = Field(default_factory=lambda: [
        WeightFactor(factor_id="demand", label="Demande", value=25, color="#4f46e5", description="Prévisions de demande marché"),
        WeightFactor(factor_id="competition", label="Concurrence", value=20, color="#0891b2", description="Tarifs concurrents"),
        WeightFactor(factor_id="events", label="Événements", value=15, color="#059669", description="Événements locaux et saisonnalité"),
        WeightFactor(factor_id="seasonality", label="Saisonnalité", value=20, color="#d97706", description="Patterns saisonniers historiques"),
        WeightFactor(factor_id="historical", label="Historique", value=20, color="#dc2626", description="Performance historique"),
    ])
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    updated_by: Optional[str] = None


# ═══════════════════════════════════════════════════════════════════════════════
# STRATEGY MODELS
# ═══════════════════════════════════════════════════════════════════════════════

class StrategyParameters(BaseModel):
    """Parameters for a pricing strategy"""
    price_elasticity: float = Field(default=1.0, ge=0.1, le=3.0, description="Price adjustment multiplier")
    min_price_floor_pct: float = Field(default=0.7, ge=0.3, le=1.0, description="Minimum price as % of base")
    max_price_ceiling_pct: float = Field(default=2.0, ge=1.0, le=5.0, description="Maximum price as % of base")
    competitor_weight: float = Field(default=0.5, ge=0, le=1.0, description="How much to consider competitors")
    demand_sensitivity: float = Field(default=1.0, ge=0.1, le=2.0, description="Reaction to demand changes")
    lead_time_factor: float = Field(default=1.0, ge=0.5, le=2.0, description="Lead time impact on pricing")
    overbooking_tolerance: float = Field(default=0.0, ge=0, le=0.2, description="Overbooking percentage allowed")


class Strategy(BaseModel):
    """Pricing strategy definition"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    strategy_type: StrategyType
    name: str
    description: str
    emoji: str
    tag: str
    parameters: StrategyParameters
    is_default: bool = False
    is_active: bool = True
    created_at: datetime = Field(default_factory=datetime.utcnow)


class StrategyConfiguration(BaseModel):
    """Strategy configuration for a hotel"""
    hotel_id: str
    active_strategy: StrategyType = StrategyType.BALANCED
    strategies: List[Strategy] = Field(default_factory=list)
    autopilot_enabled: bool = False
    autopilot_confidence_threshold: float = Field(default=0.75, ge=0.5, le=1.0, description="Min confidence for auto-apply")
    autopilot_max_price_change_pct: float = Field(default=0.15, ge=0.05, le=0.5, description="Max % change in autopilot")
    updated_at: datetime = Field(default_factory=datetime.utcnow)


# ═══════════════════════════════════════════════════════════════════════════════
# RECOMMENDATION MODELS
# ═══════════════════════════════════════════════════════════════════════════════

class PriceChange(BaseModel):
    """Price change details"""
    room_type_id: Optional[str] = None
    room_type_name: Optional[str] = None
    current_price: float
    recommended_price: float
    change_amount: float
    change_percentage: float


class Recommendation(BaseModel):
    """AI-generated pricing recommendation"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    hotel_id: str
    type: RecommendationType
    priority: RecommendationPriority
    status: RecommendationStatus = RecommendationStatus.PENDING
    
    # Content
    title: str
    description: str
    reasoning: str  # AI explanation
    
    # Impact
    target_dates: List[str]  # YYYY-MM-DD format
    price_changes: List[PriceChange] = []
    estimated_revenue_impact: float = 0.0
    estimated_occupancy_impact: float = 0.0
    
    # Confidence
    confidence_score: float = Field(ge=0, le=1.0, description="Algorithm confidence 0-1")
    contributing_factors: Dict[str, float] = {}  # Factor contributions
    
    # Timing
    created_at: datetime = Field(default_factory=datetime.utcnow)
    expires_at: Optional[datetime] = None
    applied_at: Optional[datetime] = None
    applied_by: Optional[str] = None  # "autopilot" or user_id
    
    # Engine run reference
    engine_run_id: Optional[str] = None


class RecommendationHistoryEntry(BaseModel):
    """Historical record of a recommendation action"""
    recommendation_id: str
    hotel_id: str
    action: str  # applied, dismissed, expired
    action_by: str  # user_id or "autopilot" or "system"
    action_at: datetime = Field(default_factory=datetime.utcnow)
    
    # Snapshot at action time
    recommendation_snapshot: Dict[str, Any]
    
    # Actual results (populated later)
    actual_revenue_impact: Optional[float] = None
    actual_occupancy_impact: Optional[float] = None
    accuracy_score: Optional[float] = None  # How accurate was the prediction


# ═══════════════════════════════════════════════════════════════════════════════
# PRICING CALENDAR MODELS
# ═══════════════════════════════════════════════════════════════════════════════

class DailyPricing(BaseModel):
    """Pricing data for a single day"""
    date: str  # YYYY-MM-DD
    base_price: float
    recommended_price: Optional[float] = None
    final_price: float  # Actually applied price
    
    # Metrics
    occupancy_forecast: float = Field(ge=0, le=100)
    demand_level: DemandLevel = DemandLevel.MEDIUM
    competitor_avg_price: Optional[float] = None
    competitor_min_price: Optional[float] = None
    competitor_max_price: Optional[float] = None
    
    # Flags
    is_event_day: bool = False
    event_name: Optional[str] = None
    is_manually_locked: bool = False
    locked_by: Optional[str] = None
    locked_at: Optional[datetime] = None
    
    # History
    price_history: List[Dict[str, Any]] = []  # [{price, changed_at, changed_by, reason}]
    
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class PricingCalendar(BaseModel):
    """Complete pricing calendar for a hotel"""
    hotel_id: str
    room_type_id: Optional[str] = None  # None = all rooms / default pricing
    room_type_name: Optional[str] = None
    days: Dict[str, DailyPricing] = {}  # Key: YYYY-MM-DD
    updated_at: datetime = Field(default_factory=datetime.utcnow)


# ═══════════════════════════════════════════════════════════════════════════════
# MARKET DATA MODELS (from Lighthouse)
# ═══════════════════════════════════════════════════════════════════════════════

class CompetitorRate(BaseModel):
    """Competitor rate data from rate shopping"""
    competitor_id: str
    competitor_name: str
    stars: Optional[int] = None
    
    # Rate info
    date: str  # YYYY-MM-DD
    rate: float
    currency: str = "EUR"
    room_type: Optional[str] = None
    room_name: Optional[str] = None
    meal_included: Optional[int] = None  # 0=none, 1=breakfast, etc.
    cancellable: bool = False
    
    # Source
    ota: str = "bookingdotcom"
    extracted_at: datetime = Field(default_factory=datetime.utcnow)


class MarketDemand(BaseModel):
    """Market demand data"""
    date: str  # YYYY-MM-DD
    demand_index: int = Field(ge=1, le=6, description="1=Very Low to 6=Very High")
    demand_raw: float
    price_level: int = Field(ge=1, le=6, description="1=Very Low to 6=Very High")
    extracted_at: datetime = Field(default_factory=datetime.utcnow)


class MarketData(BaseModel):
    """Complete market data snapshot"""
    hotel_id: str
    lighthouse_subscription_id: Optional[str] = None
    
    # Competitor rates
    competitor_rates: List[CompetitorRate] = []
    
    # Market demand
    demand_data: List[MarketDemand] = []
    
    # Rankings
    ranking_position: Optional[int] = None
    ranking_total_hotels: Optional[int] = None
    
    # Reviews
    review_score: Optional[float] = None
    review_count: Optional[int] = None
    
    last_sync_at: datetime = Field(default_factory=datetime.utcnow)
    sync_status: ConnectorStatus = ConnectorStatus.DISCONNECTED


# ═══════════════════════════════════════════════════════════════════════════════
# ENGINE RUN MODELS
# ═══════════════════════════════════════════════════════════════════════════════

class EngineInput(BaseModel):
    """Input data for engine calculation"""
    # From PMS
    current_occupancy: float
    rooms_available: int
    rooms_sold: int
    reservations_count: int
    average_daily_rate: float
    revpar: float
    
    # From Market Data
    competitor_rates: List[CompetitorRate]
    demand_forecasts: List[MarketDemand]
    
    # From Channel Manager
    channel_distribution: Dict[str, float] = {}  # channel -> revenue %
    
    # From Booking Engine
    direct_booking_rate: float = 0.0
    website_conversion_rate: float = 0.0


class EngineOutput(BaseModel):
    """Output from engine calculation"""
    recommendations: List[Recommendation]
    pricing_updates: Dict[str, DailyPricing]  # date -> pricing
    kpis: Dict[str, float]
    analysis_summary: str
    calculation_time_ms: int


class EngineRun(BaseModel):
    """Record of an engine execution"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    hotel_id: str
    
    # Execution info
    triggered_by: str  # user_id, "autopilot", "scheduled", "webhook"
    started_at: datetime = Field(default_factory=datetime.utcnow)
    completed_at: Optional[datetime] = None
    duration_ms: Optional[int] = None
    
    # Strategy used
    strategy_type: StrategyType
    weights_snapshot: Dict[str, float]
    
    # Input/Output
    input_data: Optional[EngineInput] = None
    output_summary: Optional[Dict[str, Any]] = None
    
    # Results
    recommendations_generated: int = 0
    recommendations_auto_applied: int = 0
    pricing_updates_count: int = 0
    
    # Status
    status: str = "running"  # running, completed, failed
    error_message: Optional[str] = None


# ═══════════════════════════════════════════════════════════════════════════════
# CONNECTOR CONFIG MODELS
# ═══════════════════════════════════════════════════════════════════════════════

class LighthouseConfig(BaseModel):
    """Configuration for Lighthouse integration"""
    api_token: Optional[str] = None
    subscription_id: Optional[str] = None
    compset_ids: List[int] = [1]  # Default compset
    sync_interval_minutes: int = 60
    enabled: bool = False


class DEdgeConfig(BaseModel):
    """Configuration for D-EDGE integration"""
    api_key: Optional[str] = None
    hotel_code: Optional[str] = None
    sync_interval_minutes: int = 30
    enabled: bool = False


class PMSConnectorConfig(BaseModel):
    """Configuration for PMS integration"""
    enabled: bool = True
    sync_interval_minutes: int = 5
    sync_reservations: bool = True
    sync_availability: bool = True
    sync_rates: bool = True


class ChannelManagerConnectorConfig(BaseModel):
    """Configuration for Channel Manager integration"""
    enabled: bool = True
    sync_interval_minutes: int = 15
    push_rates_enabled: bool = False  # Auto-push rate changes
    channels: List[str] = []  # Active channels


class BookingEngineConnectorConfig(BaseModel):
    """Configuration for Booking Engine integration"""
    enabled: bool = True
    sync_interval_minutes: int = 10


class ConnectorConfigurations(BaseModel):
    """All connector configurations for a hotel"""
    hotel_id: str
    lighthouse: LighthouseConfig = Field(default_factory=LighthouseConfig)
    dedge: DEdgeConfig = Field(default_factory=DEdgeConfig)
    pms: PMSConnectorConfig = Field(default_factory=PMSConnectorConfig)
    channel_manager: ChannelManagerConnectorConfig = Field(default_factory=ChannelManagerConnectorConfig)
    booking_engine: BookingEngineConnectorConfig = Field(default_factory=BookingEngineConnectorConfig)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


# ═══════════════════════════════════════════════════════════════════════════════
# RMS CONFIG MODEL (MAIN)
# ═══════════════════════════════════════════════════════════════════════════════

class RMSConfig(BaseModel):
    """Main RMS configuration for a hotel"""
    hotel_id: str
    
    # Feature flags
    is_enabled: bool = True
    is_trial: bool = True
    trial_ends_at: Optional[datetime] = None
    
    # Strategy
    strategy_config: StrategyConfiguration
    
    # Weights
    weight_config: WeightConfiguration
    
    # Connectors
    connector_config: ConnectorConfigurations
    
    # Engine settings
    auto_run_enabled: bool = False
    auto_run_schedule: str = "0 6 * * *"  # Cron: daily at 6am
    
    # Notifications
    notification_emails: List[str] = []
    notify_on_recommendation: bool = True
    notify_on_auto_apply: bool = True
    
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


# ═══════════════════════════════════════════════════════════════════════════════
# KPI MODELS
# ═══════════════════════════════════════════════════════════════════════════════

class RMSKPIs(BaseModel):
    """RMS Key Performance Indicators"""
    hotel_id: str
    date: str  # YYYY-MM-DD or period identifier
    
    # Revenue metrics
    revpar: float = 0.0
    revpar_change_pct: float = 0.0
    adr: float = 0.0
    adr_change_pct: float = 0.0
    total_revenue: float = 0.0
    revenue_change_pct: float = 0.0
    
    # Occupancy
    occupancy_pct: float = 0.0
    occupancy_change_pct: float = 0.0
    
    # Targets
    revpar_target: float = 0.0
    adr_target: float = 0.0
    occupancy_target: float = 0.0
    revenue_target: float = 0.0
    
    # Engine performance
    recommendations_generated: int = 0
    recommendations_applied: int = 0
    recommendations_accuracy: float = 0.0  # How accurate were past recommendations
    estimated_revenue_gain: float = 0.0
    
    calculated_at: datetime = Field(default_factory=datetime.utcnow)


# ═══════════════════════════════════════════════════════════════════════════════
# API REQUEST/RESPONSE MODELS
# ═══════════════════════════════════════════════════════════════════════════════

class UpdateWeightsRequest(BaseModel):
    """Request to update weight factors"""
    factors: List[WeightFactor]


class UpdateStrategyRequest(BaseModel):
    """Request to update strategy configuration"""
    active_strategy: Optional[StrategyType] = None
    autopilot_enabled: Optional[bool] = None
    autopilot_confidence_threshold: Optional[float] = None
    autopilot_max_price_change_pct: Optional[float] = None


class ApplyRecommendationRequest(BaseModel):
    """Request to apply a recommendation"""
    recommendation_id: str
    override_prices: Optional[Dict[str, float]] = None  # date -> price overrides


class UpdatePricingRequest(BaseModel):
    """Request to update pricing for specific dates"""
    date: str
    price: float
    lock: bool = False
    reason: Optional[str] = None


class RunEngineRequest(BaseModel):
    """Request to trigger engine calculation"""
    force_refresh_market_data: bool = False
    target_dates: Optional[List[str]] = None  # Specific dates to calculate


class ConnectorSyncRequest(BaseModel):
    """Request to sync a specific connector"""
    connector: str  # lighthouse, dedge, pms, channel_manager, booking_engine


class WebhookPayload(BaseModel):
    """Webhook payload for real-time updates"""
    source: str
    event_type: str
    timestamp: datetime
    data: Dict[str, Any]
