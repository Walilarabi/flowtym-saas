"""
Hoptym RMS - Pricing Engine
Real algorithm for dynamic pricing based on multiple factors
"""
from datetime import datetime, timedelta
from typing import List, Dict, Optional, Tuple
import math
import random
from .models import (
    Strategy, StrategyType, StrategyParameters, WeightFactor,
    Recommendation, RecommendationType, RecommendationStatus, RecommendationPriority,
    PriceChange, DailyPricing, DemandLevel, MarketDemand, CompetitorRate,
    EngineInput, EngineOutput, EngineRun, RMSKPIs
)


class PricingEngine:
    """
    Multi-layer Revenue Management Pricing Engine
    
    Layers:
    1. Base Price Layer - Historical average and seasonality
    2. Demand Layer - Market demand signals
    3. Competition Layer - Competitor pricing intelligence
    4. Event Layer - Special events and holidays
    5. Pickup Layer - Booking pace analysis
    6. Optimization Layer - Final price optimization
    """
    
    def __init__(self, hotel_id: str):
        self.hotel_id = hotel_id
        self.calculation_start = None
    
    # ═══════════════════════════════════════════════════════════════════════════
    # LAYER 1: BASE PRICE CALCULATION
    # ═══════════════════════════════════════════════════════════════════════════
    
    def calculate_base_price(
        self,
        historical_adr: float,
        day_of_week: int,  # 0=Monday
        month: int,
        seasonality_factors: Dict[int, float] = None
    ) -> float:
        """
        Calculate base price from historical data and seasonality.
        
        Args:
            historical_adr: Average Daily Rate from historical data
            day_of_week: 0=Monday to 6=Sunday
            month: 1-12
            seasonality_factors: Optional custom factors per month
        
        Returns:
            Base price for the day
        """
        # Default seasonality factors (France hotel market)
        default_seasonality = {
            1: 0.75,   # January - Low season
            2: 0.80,   # February
            3: 0.90,   # March - Spring break
            4: 0.95,   # April - Easter
            5: 1.05,   # May - High season starts
            6: 1.15,   # June
            7: 1.25,   # July - Peak
            8: 1.25,   # August - Peak
            9: 1.10,   # September
            10: 0.95,  # October
            11: 0.85,  # November
            12: 1.00   # December - Holidays
        }
        
        # Day of week factors
        dow_factors = {
            0: 0.90,  # Monday
            1: 0.92,  # Tuesday
            2: 0.95,  # Wednesday
            3: 1.00,  # Thursday
            4: 1.10,  # Friday
            5: 1.15,  # Saturday
            6: 1.05   # Sunday
        }
        
        factors = seasonality_factors or default_seasonality
        season_factor = factors.get(month, 1.0)
        dow_factor = dow_factors.get(day_of_week, 1.0)
        
        base_price = historical_adr * season_factor * dow_factor
        return round(base_price, 2)
    
    # ═══════════════════════════════════════════════════════════════════════════
    # LAYER 2: DEMAND ADJUSTMENT
    # ═══════════════════════════════════════════════════════════════════════════
    
    def adjust_for_demand(
        self,
        base_price: float,
        demand_level: DemandLevel,
        demand_raw: float,
        strategy_params: StrategyParameters,
        weight: float = 0.25
    ) -> Tuple[float, float]:
        """
        Adjust price based on market demand signals.
        
        Returns:
            Tuple of (adjusted_price, demand_contribution)
        """
        # Demand level multipliers
        demand_multipliers = {
            DemandLevel.VERY_LOW: 0.85,
            DemandLevel.LOW: 0.92,
            DemandLevel.MEDIUM: 1.00,
            DemandLevel.HIGH: 1.10,
            DemandLevel.PEAK: 1.25
        }
        
        base_multiplier = demand_multipliers.get(demand_level, 1.0)
        
        # Apply strategy sensitivity
        sensitivity = strategy_params.demand_sensitivity
        adjusted_multiplier = 1 + (base_multiplier - 1) * sensitivity
        
        # Use raw demand for fine-tuning
        if demand_raw > 0:
            # Higher demand = higher price
            fine_tune = min(demand_raw * 0.1 * sensitivity, 0.15)
        else:
            # Lower demand = lower price
            fine_tune = max(demand_raw * 0.1 * sensitivity, -0.10)
        
        final_multiplier = adjusted_multiplier + fine_tune
        
        # Apply weight
        contribution = (final_multiplier - 1) * weight
        adjusted_price = base_price * (1 + contribution)
        
        return round(adjusted_price, 2), contribution
    
    # ═══════════════════════════════════════════════════════════════════════════
    # LAYER 3: COMPETITION ADJUSTMENT
    # ═══════════════════════════════════════════════════════════════════════════
    
    def adjust_for_competition(
        self,
        current_price: float,
        competitor_rates: List[CompetitorRate],
        strategy_params: StrategyParameters,
        weight: float = 0.20
    ) -> Tuple[float, float, Dict[str, float]]:
        """
        Adjust price based on competitor intelligence.
        
        Returns:
            Tuple of (adjusted_price, competition_contribution, competitor_analysis)
        """
        if not competitor_rates:
            return current_price, 0.0, {}
        
        # Calculate competitor statistics
        rates = [c.rate for c in competitor_rates if c.rate > 0]
        if not rates:
            return current_price, 0.0, {}
        
        comp_avg = sum(rates) / len(rates)
        comp_min = min(rates)
        comp_max = max(rates)
        comp_median = sorted(rates)[len(rates) // 2]
        
        competitor_analysis = {
            "average": round(comp_avg, 2),
            "min": round(comp_min, 2),
            "max": round(comp_max, 2),
            "median": round(comp_median, 2),
            "count": len(rates)
        }
        
        # Determine positioning based on strategy
        competitor_weight = strategy_params.competitor_weight
        
        # Calculate position index (how we want to position vs competition)
        if strategy_params.price_elasticity > 1.2:
            # Aggressive: position above median
            target_position = comp_median * 1.05
        elif strategy_params.price_elasticity < 0.8:
            # Conservative: position below median
            target_position = comp_median * 0.95
        else:
            # Balanced: match median
            target_position = comp_median
        
        # Calculate adjustment needed
        price_diff = target_position - current_price
        adjustment_factor = price_diff / current_price if current_price > 0 else 0
        
        # Apply weight and competitor sensitivity
        contribution = adjustment_factor * competitor_weight * weight
        adjusted_price = current_price * (1 + contribution)
        
        return round(adjusted_price, 2), contribution, competitor_analysis
    
    # ═══════════════════════════════════════════════════════════════════════════
    # LAYER 4: EVENT ADJUSTMENT
    # ═══════════════════════════════════════════════════════════════════════════
    
    def adjust_for_events(
        self,
        current_price: float,
        is_event_day: bool,
        event_importance: float = 1.0,  # 0.5 = minor, 1.0 = major, 1.5 = exceptional
        weight: float = 0.15
    ) -> Tuple[float, float]:
        """
        Adjust price based on special events.
        
        Returns:
            Tuple of (adjusted_price, event_contribution)
        """
        if not is_event_day:
            return current_price, 0.0
        
        # Event multiplier based on importance
        event_multiplier = 1 + (0.15 * event_importance)
        
        contribution = (event_multiplier - 1) * weight
        adjusted_price = current_price * (1 + contribution)
        
        return round(adjusted_price, 2), contribution
    
    # ═══════════════════════════════════════════════════════════════════════════
    # LAYER 5: PICKUP/BOOKING PACE ADJUSTMENT
    # ═══════════════════════════════════════════════════════════════════════════
    
    def adjust_for_pickup(
        self,
        current_price: float,
        current_occupancy: float,
        days_until: int,  # Days until arrival
        historical_occupancy_at_day: float,  # What occupancy was at this lead time historically
        strategy_params: StrategyParameters,
        weight: float = 0.20
    ) -> Tuple[float, float]:
        """
        Adjust price based on booking pace vs historical patterns.
        
        Returns:
            Tuple of (adjusted_price, pickup_contribution)
        """
        if days_until <= 0:
            return current_price, 0.0
        
        # Calculate pickup difference
        pickup_diff = current_occupancy - historical_occupancy_at_day
        
        # Normalize based on days until (more sensitive closer to date)
        urgency_factor = max(0.5, 2 - (days_until / 30))
        
        if pickup_diff > 10:
            # Selling faster than expected - increase price
            multiplier = 1 + (min(pickup_diff, 30) / 100) * urgency_factor
        elif pickup_diff < -10:
            # Selling slower than expected - decrease price
            multiplier = 1 + (max(pickup_diff, -30) / 100) * urgency_factor
        else:
            # On track
            multiplier = 1.0
        
        # Apply lead time factor from strategy
        multiplier = 1 + (multiplier - 1) * strategy_params.lead_time_factor
        
        contribution = (multiplier - 1) * weight
        adjusted_price = current_price * (1 + contribution)
        
        return round(adjusted_price, 2), contribution
    
    # ═══════════════════════════════════════════════════════════════════════════
    # LAYER 6: OPTIMIZATION & CONSTRAINTS
    # ═══════════════════════════════════════════════════════════════════════════
    
    def apply_constraints(
        self,
        calculated_price: float,
        base_price: float,
        strategy_params: StrategyParameters
    ) -> float:
        """
        Apply price floor/ceiling constraints based on strategy.
        """
        min_price = base_price * strategy_params.min_price_floor_pct
        max_price = base_price * strategy_params.max_price_ceiling_pct
        
        constrained_price = max(min_price, min(calculated_price, max_price))
        
        # Round to nice price points
        if constrained_price > 100:
            # Round to nearest 5
            constrained_price = round(constrained_price / 5) * 5
        else:
            # Round to nearest 1
            constrained_price = round(constrained_price)
        
        return constrained_price
    
    # ═══════════════════════════════════════════════════════════════════════════
    # MAIN CALCULATION
    # ═══════════════════════════════════════════════════════════════════════════
    
    def calculate_optimal_price(
        self,
        date_str: str,
        historical_adr: float,
        demand_data: Optional[MarketDemand],
        competitor_rates: List[CompetitorRate],
        current_occupancy: float,
        historical_occupancy: float,
        is_event_day: bool,
        event_importance: float,
        strategy: Strategy,
        weights: Dict[str, float]
    ) -> Dict[str, any]:
        """
        Run full pricing calculation through all layers.
        
        Returns comprehensive pricing analysis.
        """
        self.calculation_start = datetime.utcnow()
        
        # Parse date
        date_obj = datetime.strptime(date_str, "%Y-%m-%d")
        days_until = (date_obj - datetime.utcnow()).days
        
        params = strategy.parameters
        contributions = {}
        
        # Layer 1: Base Price
        base_price = self.calculate_base_price(
            historical_adr,
            date_obj.weekday(),
            date_obj.month
        )
        contributions["base"] = 0.0
        
        # Layer 2: Demand Adjustment
        demand_level = DemandLevel.MEDIUM
        demand_raw = 0.0
        if demand_data:
            demand_level = self._index_to_level(demand_data.demand_index)
            demand_raw = demand_data.demand_raw
        
        price_after_demand, demand_contrib = self.adjust_for_demand(
            base_price, demand_level, demand_raw, params, 
            weights.get("demand", 0.25)
        )
        contributions["demand"] = demand_contrib
        
        # Layer 3: Competition Adjustment
        day_competitors = [c for c in competitor_rates if c.date == date_str]
        price_after_comp, comp_contrib, comp_analysis = self.adjust_for_competition(
            price_after_demand, day_competitors, params,
            weights.get("competition", 0.20)
        )
        contributions["competition"] = comp_contrib
        
        # Layer 4: Event Adjustment
        price_after_events, event_contrib = self.adjust_for_events(
            price_after_comp, is_event_day, event_importance,
            weights.get("events", 0.15)
        )
        contributions["events"] = event_contrib
        
        # Layer 5: Pickup Adjustment
        price_after_pickup, pickup_contrib = self.adjust_for_pickup(
            price_after_events, current_occupancy, days_until,
            historical_occupancy, params,
            weights.get("historical", 0.20)
        )
        contributions["historical"] = pickup_contrib
        
        # Layer 6: Apply Constraints
        final_price = self.apply_constraints(
            price_after_pickup, base_price, params
        )
        
        # Calculate confidence score
        confidence = self._calculate_confidence(
            has_demand_data=demand_data is not None,
            competitor_count=len(day_competitors),
            days_until=days_until
        )
        
        calculation_time = int((datetime.utcnow() - self.calculation_start).total_seconds() * 1000)
        
        return {
            "date": date_str,
            "base_price": base_price,
            "calculated_price": round(price_after_pickup, 2),
            "final_price": final_price,
            "price_change": round(final_price - base_price, 2),
            "price_change_pct": round((final_price - base_price) / base_price * 100, 2) if base_price > 0 else 0,
            "contributions": contributions,
            "competitor_analysis": comp_analysis,
            "demand_level": demand_level.value,
            "confidence_score": confidence,
            "calculation_time_ms": calculation_time,
            "strategy_used": strategy.strategy_type.value
        }
    
    def _index_to_level(self, index: int) -> DemandLevel:
        """Convert Lighthouse demand index (1-6) to DemandLevel"""
        mapping = {
            1: DemandLevel.VERY_LOW,
            2: DemandLevel.LOW,
            3: DemandLevel.MEDIUM,
            4: DemandLevel.HIGH,
            5: DemandLevel.HIGH,
            6: DemandLevel.PEAK
        }
        return mapping.get(index, DemandLevel.MEDIUM)
    
    def _calculate_confidence(
        self,
        has_demand_data: bool,
        competitor_count: int,
        days_until: int
    ) -> float:
        """Calculate confidence score for the recommendation"""
        score = 0.5  # Base confidence
        
        # Demand data adds confidence
        if has_demand_data:
            score += 0.15
        
        # More competitors = more confidence
        if competitor_count >= 5:
            score += 0.15
        elif competitor_count >= 3:
            score += 0.10
        elif competitor_count >= 1:
            score += 0.05
        
        # Closer dates = higher confidence
        if days_until <= 7:
            score += 0.15
        elif days_until <= 14:
            score += 0.10
        elif days_until <= 30:
            score += 0.05
        
        return min(round(score, 2), 1.0)
    
    # ═══════════════════════════════════════════════════════════════════════════
    # RECOMMENDATION GENERATION
    # ═══════════════════════════════════════════════════════════════════════════
    
    def generate_recommendations(
        self,
        hotel_id: str,
        pricing_results: List[Dict],
        current_prices: Dict[str, float],
        engine_run_id: str
    ) -> List[Recommendation]:
        """
        Generate actionable recommendations from pricing calculations.
        """
        recommendations = []
        
        # Group significant price changes
        price_increases = []
        price_decreases = []
        
        for result in pricing_results:
            date_str = result["date"]
            current = current_prices.get(date_str, result["base_price"])
            recommended = result["final_price"]
            
            change_pct = (recommended - current) / current * 100 if current > 0 else 0
            
            if change_pct >= 5:
                price_increases.append({
                    "date": date_str,
                    "current": current,
                    "recommended": recommended,
                    "change_pct": change_pct,
                    "confidence": result["confidence_score"],
                    "demand_level": result["demand_level"],
                    "contributions": result["contributions"]
                })
            elif change_pct <= -5:
                price_decreases.append({
                    "date": date_str,
                    "current": current,
                    "recommended": recommended,
                    "change_pct": change_pct,
                    "confidence": result["confidence_score"],
                    "demand_level": result["demand_level"],
                    "contributions": result["contributions"]
                })
        
        # Create price increase recommendations
        if price_increases:
            # Sort by potential impact
            price_increases.sort(key=lambda x: x["change_pct"] * x["confidence"], reverse=True)
            
            for item in price_increases[:5]:  # Top 5 opportunities
                priority = self._determine_priority(item["change_pct"], item["confidence"])
                
                rec = Recommendation(
                    hotel_id=hotel_id,
                    type=RecommendationType.PRICE_INCREASE,
                    priority=priority,
                    title=f"Augmenter tarif {item['date']}",
                    description=f"Demande {item['demand_level']} détectée. Augmentation de €{item['current']:.0f} à €{item['recommended']:.0f} recommandée.",
                    reasoning=self._generate_reasoning(item, "increase"),
                    target_dates=[item["date"]],
                    price_changes=[PriceChange(
                        current_price=item["current"],
                        recommended_price=item["recommended"],
                        change_amount=item["recommended"] - item["current"],
                        change_percentage=item["change_pct"]
                    )],
                    estimated_revenue_impact=self._estimate_revenue_impact(item, "increase"),
                    confidence_score=item["confidence"],
                    contributing_factors=item["contributions"],
                    engine_run_id=engine_run_id,
                    expires_at=datetime.utcnow() + timedelta(hours=24)
                )
                recommendations.append(rec)
        
        # Create price decrease recommendations
        if price_decreases:
            price_decreases.sort(key=lambda x: abs(x["change_pct"]) * x["confidence"], reverse=True)
            
            for item in price_decreases[:3]:  # Top 3 promotions
                priority = self._determine_priority(abs(item["change_pct"]), item["confidence"])
                
                rec = Recommendation(
                    hotel_id=hotel_id,
                    type=RecommendationType.PROMOTION,
                    priority=priority,
                    title=f"Promotion flash {item['date']}",
                    description=f"Occupation faible prévue. Réduction de €{item['current']:.0f} à €{item['recommended']:.0f} suggérée.",
                    reasoning=self._generate_reasoning(item, "decrease"),
                    target_dates=[item["date"]],
                    price_changes=[PriceChange(
                        current_price=item["current"],
                        recommended_price=item["recommended"],
                        change_amount=item["recommended"] - item["current"],
                        change_percentage=item["change_pct"]
                    )],
                    estimated_revenue_impact=self._estimate_revenue_impact(item, "decrease"),
                    estimated_occupancy_impact=5.0,  # Estimated +5% occupancy
                    confidence_score=item["confidence"],
                    contributing_factors=item["contributions"],
                    engine_run_id=engine_run_id,
                    expires_at=datetime.utcnow() + timedelta(hours=24)
                )
                recommendations.append(rec)
        
        # Add opportunity recommendations based on events
        opportunities = self._detect_opportunities(pricing_results)
        recommendations.extend(opportunities)
        
        return recommendations
    
    def _determine_priority(self, change_pct: float, confidence: float) -> RecommendationPriority:
        """Determine recommendation priority"""
        score = abs(change_pct) * confidence
        
        if score >= 15:
            return RecommendationPriority.CRITICAL
        elif score >= 10:
            return RecommendationPriority.HIGH
        elif score >= 5:
            return RecommendationPriority.MEDIUM
        return RecommendationPriority.LOW
    
    def _generate_reasoning(self, item: Dict, direction: str) -> str:
        """Generate AI-style reasoning for recommendation"""
        factors = []
        contributions = item["contributions"]
        
        if contributions.get("demand", 0) != 0:
            if contributions["demand"] > 0:
                factors.append(f"forte demande marché (+{contributions['demand']*100:.1f}%)")
            else:
                factors.append(f"demande faible ({contributions['demand']*100:.1f}%)")
        
        if contributions.get("competition", 0) != 0:
            if contributions["competition"] > 0:
                factors.append("tarifs concurrents élevés")
            else:
                factors.append("pression tarifaire concurrents")
        
        if contributions.get("events", 0) > 0:
            factors.append("événement local détecté")
        
        if contributions.get("historical", 0) != 0:
            if contributions["historical"] > 0:
                factors.append("rythme de réservation supérieur à l'historique")
            else:
                factors.append("rythme de réservation inférieur à l'historique")
        
        if direction == "increase":
            base = "L'analyse multi-facteurs indique une opportunité d'optimisation tarifaire"
        else:
            base = "L'analyse suggère un ajustement promotionnel pour stimuler les réservations"
        
        if factors:
            return f"{base} : {', '.join(factors)}."
        return base + "."
    
    def _estimate_revenue_impact(self, item: Dict, direction: str) -> float:
        """Estimate revenue impact of a price change"""
        # Simplified model: estimate based on price change and assumed bookings
        avg_bookings_per_day = 5  # Assumption
        price_diff = abs(item["recommended"] - item["current"])
        
        if direction == "increase":
            # Higher price but potentially fewer bookings
            elasticity_factor = 0.8
        else:
            # Lower price but potentially more bookings
            elasticity_factor = 1.2
        
        estimated_impact = price_diff * avg_bookings_per_day * elasticity_factor
        return round(estimated_impact, 2)
    
    def _detect_opportunities(self, pricing_results: List[Dict]) -> List[Recommendation]:
        """Detect special opportunities from patterns"""
        opportunities = []
        
        # Look for consecutive high-demand days
        high_demand_streak = []
        for result in sorted(pricing_results, key=lambda x: x["date"]):
            if result["demand_level"] in ["high", "peak"]:
                high_demand_streak.append(result)
            else:
                if len(high_demand_streak) >= 3:
                    # Found a high-demand period
                    dates = [r["date"] for r in high_demand_streak]
                    avg_change = sum(r["price_change_pct"] for r in high_demand_streak) / len(high_demand_streak)
                    
                    opportunities.append(Recommendation(
                        hotel_id=self.hotel_id,
                        type=RecommendationType.OPPORTUNITY,
                        priority=RecommendationPriority.HIGH,
                        title=f"Période forte du {dates[0]} au {dates[-1]}",
                        description=f"Période de {len(dates)} jours avec demande élevée détectée. Potentiel d'optimisation significatif.",
                        reasoning="Plusieurs jours consécutifs montrent une demande supérieure à la normale. Une stratégie tarifaire cohérente sur cette période maximiserait le revenu.",
                        target_dates=dates,
                        estimated_revenue_impact=avg_change * len(dates) * 50,  # Rough estimate
                        confidence_score=0.85,
                        expires_at=datetime.utcnow() + timedelta(hours=48)
                    ))
                high_demand_streak = []
        
        return opportunities


# ═══════════════════════════════════════════════════════════════════════════════
# DEFAULT STRATEGIES
# ═══════════════════════════════════════════════════════════════════════════════

def get_default_strategies() -> List[Strategy]:
    """Return default pricing strategies"""
    return [
        Strategy(
            strategy_type=StrategyType.CONSERVATIVE,
            name="Conservateur",
            description="Approche prudente privilégiant la stabilité des tarifs et un remplissage régulier",
            emoji="🛡️",
            tag="Stabilité maximale",
            parameters=StrategyParameters(
                price_elasticity=0.7,
                min_price_floor_pct=0.85,
                max_price_ceiling_pct=1.3,
                competitor_weight=0.3,
                demand_sensitivity=0.7,
                lead_time_factor=0.8,
                overbooking_tolerance=0.0
            )
        ),
        Strategy(
            strategy_type=StrategyType.BALANCED,
            name="Équilibré",
            description="Équilibre optimal entre maximisation du revenu et taux d'occupation",
            emoji="⚖️",
            tag="Optimum rendement",
            parameters=StrategyParameters(
                price_elasticity=1.0,
                min_price_floor_pct=0.75,
                max_price_ceiling_pct=1.6,
                competitor_weight=0.5,
                demand_sensitivity=1.0,
                lead_time_factor=1.0,
                overbooking_tolerance=0.02
            ),
            is_default=True
        ),
        Strategy(
            strategy_type=StrategyType.AGGRESSIVE,
            name="Agressif",
            description="Maximisation du RevPAR avec forte réactivité aux pics de demande",
            emoji="🚀",
            tag="Croissance rapide",
            parameters=StrategyParameters(
                price_elasticity=1.4,
                min_price_floor_pct=0.65,
                max_price_ceiling_pct=2.2,
                competitor_weight=0.7,
                demand_sensitivity=1.4,
                lead_time_factor=1.3,
                overbooking_tolerance=0.05
            )
        ),
        Strategy(
            strategy_type=StrategyType.DYNAMIC,
            name="Dynamique",
            description="Stratégie adaptative pilotée par l'IA avec ajustements en temps réel",
            emoji="🎯",
            tag="Adaptatif AI",
            parameters=StrategyParameters(
                price_elasticity=1.2,
                min_price_floor_pct=0.70,
                max_price_ceiling_pct=1.9,
                competitor_weight=0.6,
                demand_sensitivity=1.2,
                lead_time_factor=1.1,
                overbooking_tolerance=0.03
            )
        )
    ]
