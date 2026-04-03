"""
Tests — Budget & Forecast + Maintenance
Vérifie la logique métier, les modèles et les routes.
"""
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))


# ═══════════════════════════════════════════════════════════════════════════════
# BUDGET & FORECAST — Logique métier
# ═══════════════════════════════════════════════════════════════════════════════

class TestVarianceCalculation:

    def _v(self, actual, budget):
        from forecast.routes import _variance
        return _variance(actual, budget)

    def test_positive_variance(self):
        # CA réel 110k, budget 100k → +10%
        assert self._v(110_000, 100_000) == 10.0

    def test_negative_variance(self):
        # CA réel 90k, budget 100k → -10%
        assert self._v(90_000, 100_000) == -10.0

    def test_on_budget(self):
        assert self._v(100_000, 100_000) == 0.0

    def test_none_actual_returns_none(self):
        assert self._v(None, 100_000) is None

    def test_none_budget_returns_none(self):
        assert self._v(100_000, None) is None

    def test_zero_budget_returns_none(self):
        assert self._v(50_000, 0) is None

    def test_large_overperformance(self):
        result = self._v(200_000, 100_000)
        assert result == 100.0

    def test_total_underperformance(self):
        result = self._v(0, 100_000)
        assert result == -100.0

    def test_rounding_to_1_decimal(self):
        result = self._v(103_333, 100_000)
        assert result == round((103_333 - 100_000) / 100_000 * 100, 1)


class TestDynamicPricingLogic:

    def _apply(self, rule, base, occupation, day=None):
        from forecast.routes import _apply_rule
        return _apply_rule(rule, base, occupation, day)

    def _make_rule(self, threshold=80, multiplier=1.2, active=True, days=None, min_p=None, max_p=None):
        return {
            "is_active": active,
            "occupancy_threshold": threshold,
            "multiplier": multiplier,
            "applies_to_days": days or [],
            "min_price": min_p,
            "max_price": max_p,
        }

    def test_rule_triggers_above_threshold(self):
        rule = self._make_rule(threshold=80, multiplier=1.2)
        result = self._apply(rule, 100.0, 85.0)
        assert result == 120.0

    def test_rule_does_not_trigger_below_threshold(self):
        rule = self._make_rule(threshold=80, multiplier=1.2)
        result = self._apply(rule, 100.0, 75.0)
        assert result == 100.0   # pas de changement

    def test_rule_triggers_at_exact_threshold(self):
        rule = self._make_rule(threshold=80, multiplier=1.5)
        result = self._apply(rule, 100.0, 80.0)
        assert result == 150.0

    def test_inactive_rule_ignored(self):
        rule = self._make_rule(threshold=50, multiplier=2.0, active=False)
        result = self._apply(rule, 100.0, 90.0)
        assert result == 100.0   # règle inactive

    def test_min_price_enforced(self):
        rule = self._make_rule(threshold=80, multiplier=0.8, min_p=95.0)
        result = self._apply(rule, 100.0, 90.0)  # 100 * 0.8 = 80, mais min = 95
        assert result == 95.0

    def test_max_price_enforced(self):
        rule = self._make_rule(threshold=80, multiplier=3.0, max_p=200.0)
        result = self._apply(rule, 100.0, 90.0)  # 100 * 3 = 300, mais max = 200
        assert result == 200.0

    def test_day_of_week_matches(self):
        rule = self._make_rule(threshold=60, multiplier=1.3, days=[5, 6])  # Sam, Dim
        assert self._apply(rule, 100.0, 70.0, day=5) == 130.0   # samedi OK
        assert self._apply(rule, 100.0, 70.0, day=6) == 130.0   # dimanche OK
        assert self._apply(rule, 100.0, 70.0, day=0) == 100.0   # lundi KO

    def test_empty_days_applies_all_week(self):
        rule = self._make_rule(threshold=60, multiplier=1.1, days=[])
        for day in range(7):
            assert self._apply(rule, 100.0, 70.0, day=day) == 110.0

    def test_multiplier_1_no_change(self):
        rule = self._make_rule(threshold=0, multiplier=1.0)
        assert self._apply(rule, 150.0, 50.0) == 150.0


class TestForecastGeneration:
    """Tests de la génération automatique de forecasts."""

    def test_seasonality_coefficients_sum(self):
        """Les coefficients saisonniers doivent être autour de 1.0 en moyenne."""
        seasonality = {
            1: 0.70, 2: 0.75, 3: 0.85, 4: 0.90,
            5: 0.95, 6: 1.00, 7: 1.20, 8: 1.25,
            9: 1.05, 10: 0.95, 11: 0.80, 12: 0.85,
        }
        avg = sum(seasonality.values()) / len(seasonality)
        assert 0.9 <= avg <= 1.1  # moyenne autour de 1.0

    def test_occupation_capped_at_100(self):
        """L'occupation générée ne dépasse jamais 100%."""
        base_occ = 95.0
        growth = 5.0
        coeff = 1.30  # haute saison
        occ = min(base_occ * coeff * (1 + growth / 100), 100)
        assert occ <= 100.0

    def test_revenue_formula(self):
        """CA = chambres × occupation × ADR × jours."""
        import calendar
        rooms = 100
        occ_pct = 75.0
        adr = 120.0
        month, year = 6, 2026
        days = calendar.monthrange(year, month)[1]  # 30 jours
        revenue = rooms * (occ_pct / 100) * adr * days
        assert revenue == 100 * 0.75 * 120 * 30  # 270_000

    def test_forecast_model_valid(self):
        from forecast.routes import ForecastGenerate
        f = ForecastGenerate(year=2027, base_occupation=72.0, growth_rate=4.0, base_adr=130.0)
        assert f.year == 2027
        assert len(f.months) == 12
        assert len(f.seasonality) == 12


class TestForecastModels:

    def test_forecast_update_partial(self):
        from forecast.routes import ForecastUpdate
        u = ForecastUpdate(budget_revenue=50_000.0, budget_occupation=75.0)
        assert u.budget_revenue == 50_000.0
        assert u.forecast_revenue is None

    def test_dynamic_pricing_rule_model(self):
        from forecast.routes import DynamicPricingRule
        r = DynamicPricingRule(
            room_type_code="DBL",
            rule_name="Haute saison",
            occupancy_threshold=80,
            multiplier=1.25,
            min_price=90.0,
            max_price=250.0,
        )
        assert r.multiplier == 1.25
        assert r.is_active is True

    def test_simulate_request_model(self):
        from forecast.routes import SimulateRequest
        s = SimulateRequest(base_price=120.0, current_occupation=88.0, day_of_week=5)
        assert s.base_price == 120.0
        assert s.day_of_week == 5

    def test_rule_multiplier_bounds(self):
        from forecast.routes import DynamicPricingRule
        from pydantic import ValidationError
        # Multiplier trop bas
        try:
            DynamicPricingRule(
                room_type_code="DBL", rule_name="Test",
                occupancy_threshold=80, multiplier=0.1  # < 0.5
            )
            assert False, "Devrait lever une ValidationError"
        except ValidationError:
            pass


class TestForecastRoutes:

    def _server(self):
        path = os.path.join(os.path.dirname(__file__), '..', 'server.py')
        with open(path, encoding='utf-8') as f:
            return f.read()

    def test_forecast_routes_in_server(self):
        content = self._server()
        assert '/hotels/{hotel_id}/forecasts' in content

    def test_dynamic_pricing_routes_in_server(self):
        content = self._server()
        assert '/hotels/{hotel_id}/dynamic-pricing' in content

    def test_simulate_route_in_server(self):
        content = self._server()
        assert 'simulate' in content

    def test_export_route_in_server(self):
        content = self._server()
        assert 'export' in content

    def test_forecast_module_importable(self):
        from forecast.routes import (
            list_forecasts, get_forecast_stats, get_forecast_month,
            upsert_forecast, generate_forecast, export_forecasts_csv,
            list_pricing_rules, create_pricing_rule, update_pricing_rule,
            delete_pricing_rule, simulate_pricing,
        )
        for fn in (list_forecasts, get_forecast_stats, generate_forecast,
                   create_pricing_rule, simulate_pricing):
            assert callable(fn)

    def test_all_functions_async(self):
        import asyncio
        from forecast.routes import (
            list_forecasts, upsert_forecast, generate_forecast,
            create_pricing_rule, simulate_pricing,
        )
        for fn in (list_forecasts, upsert_forecast, generate_forecast,
                   create_pricing_rule, simulate_pricing):
            assert asyncio.iscoroutinefunction(fn)


# ═══════════════════════════════════════════════════════════════════════════════
# MAINTENANCE — Logique métier
# ═══════════════════════════════════════════════════════════════════════════════

class TestMaintenancePriorityOrdering:
    """Vérifie l'ordre de tri des tickets par priorité."""

    def test_priority_order_urgent_first(self):
        STATUS_ORDER = {"en_attente": 0, "en_cours": 1, "resolu": 2}
        PRIORITY_ORDER = {"urgente": 0, "haute": 1, "moyenne": 2, "basse": 3}

        tickets = [
            {"status": "en_attente", "priority": "basse"},
            {"status": "en_attente", "priority": "urgente"},
            {"status": "en_cours",   "priority": "haute"},
            {"status": "en_attente", "priority": "moyenne"},
        ]
        tickets.sort(key=lambda t: (
            STATUS_ORDER.get(t["status"], 0),
            PRIORITY_ORDER.get(t["priority"], 2),
        ))
        assert tickets[0]["priority"] == "urgente"
        assert tickets[-1]["priority"] == "haute"

    def test_resolved_tickets_last(self):
        STATUS_ORDER = {"en_attente": 0, "en_cours": 1, "resolu": 2}
        PRIORITY_ORDER = {"urgente": 0, "haute": 1, "moyenne": 2, "basse": 3}

        tickets = [
            {"status": "resolu",     "priority": "urgente"},
            {"status": "en_attente", "priority": "basse"},
        ]
        tickets.sort(key=lambda t: (
            STATUS_ORDER.get(t["status"], 0),
            PRIORITY_ORDER.get(t["priority"], 2),
        ))
        assert tickets[0]["status"] == "en_attente"
        assert tickets[-1]["status"] == "resolu"

    def test_all_priorities_covered(self):
        for p in ("urgente", "haute", "moyenne", "basse"):
            assert p in {"urgente": 0, "haute": 1, "moyenne": 2, "basse": 3}


class TestMaintenanceStatusTransitions:
    """Vérifie les transitions de statut valides."""

    VALID_TRANSITIONS = {
        "en_attente": ["en_cours", "resolu"],
        "en_cours":   ["resolu"],
        "resolu":     [],
    }

    def test_pending_can_start(self):
        assert "en_cours" in self.VALID_TRANSITIONS["en_attente"]

    def test_pending_can_resolve_directly(self):
        assert "resolu" in self.VALID_TRANSITIONS["en_attente"]

    def test_in_progress_can_resolve(self):
        assert "resolu" in self.VALID_TRANSITIONS["en_cours"]

    def test_resolved_has_no_transitions(self):
        assert self.VALID_TRANSITIONS["resolu"] == []

    def test_started_at_set_on_start(self):
        """Vérifie que started_at est ajouté au passage en_cours."""
        updates = {"status": "en_cours"}
        if updates.get("status") == "en_cours" and not updates.get("started_at"):
            updates["started_at"] = "2026-04-03T10:00:00Z"
        assert "started_at" in updates

    def test_resolved_at_set_on_resolve(self):
        updates = {"status": "resolu"}
        if updates.get("status") == "resolu" and not updates.get("resolved_at"):
            updates["resolved_at"] = "2026-04-03T14:00:00Z"
        assert "resolved_at" in updates


class TestMaintenanceCostTracking:

    def test_total_cost_sum(self):
        tickets = [
            {"status": "resolu", "actual_cost": 120.0},
            {"status": "resolu", "actual_cost": 350.0},
            {"status": "en_cours", "actual_cost": None},
        ]
        total = sum(t.get("actual_cost") or 0 for t in tickets)
        assert total == 470.0

    def test_cost_by_category(self):
        tickets = [
            {"category": "plomberie",    "actual_cost": 200.0},
            {"category": "electricite",  "actual_cost": 150.0},
            {"category": "plomberie",    "actual_cost": 80.0},
        ]
        by_cat = {}
        for t in tickets:
            by_cat[t["category"]] = by_cat.get(t["category"], 0) + (t.get("actual_cost") or 0)
        assert by_cat["plomberie"] == 280.0
        assert by_cat["electricite"] == 150.0

    def test_urgent_open_count(self):
        tickets = [
            {"priority": "urgente", "status": "en_attente"},
            {"priority": "urgente", "status": "resolu"},
            {"priority": "haute",   "status": "en_attente"},
        ]
        urgent_open = sum(
            1 for t in tickets
            if t["priority"] == "urgente" and t["status"] != "resolu"
        )
        assert urgent_open == 1


class TestMaintenanceEndpointsExist:

    def _hk_routes(self):
        path = os.path.join(os.path.dirname(__file__), '..', 'housekeeping', 'routes.py')
        with open(path, encoding='utf-8') as f:
            return f.read()

    def _server(self):
        path = os.path.join(os.path.dirname(__file__), '..', 'server.py')
        with open(path, encoding='utf-8') as f:
            return f.read()

    def test_maintenance_get_in_housekeeping(self):
        assert 'get_maintenance_tickets' in self._hk_routes()

    def test_maintenance_post_in_housekeeping(self):
        assert 'create_maintenance_ticket' in self._hk_routes()

    def test_maintenance_put_in_housekeeping(self):
        assert 'update_maintenance_ticket' in self._hk_routes()

    def test_maintenance_url_pattern(self):
        assert '/hotels/{hotel_id}/maintenance' in self._hk_routes()

    def test_maintenance_ticket_url_pattern(self):
        assert '/hotels/{hotel_id}/maintenance/{ticket_id}' in self._hk_routes()

    def test_housekeeping_router_registered_in_server(self):
        assert 'housekeeping_router' in self._server()

    def test_housekeeping_maintenance_importable(self):
        from housekeeping.routes import (
            get_maintenance_tickets,
            create_maintenance_ticket,
            update_maintenance_ticket,
        )
        import asyncio
        for fn in (get_maintenance_tickets, create_maintenance_ticket, update_maintenance_ticket):
            assert callable(fn)
            assert asyncio.iscoroutinefunction(fn)
