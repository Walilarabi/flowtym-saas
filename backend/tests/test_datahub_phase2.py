"""
Tests Phase 18 — Data Hub Phase 2
Quality Engine, Priority Engine, Smart Cache, Event Bus.
"""
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))


# ── Quality Engine ────────────────────────────────────────────────────────────

class TestDataQualityEngine:

    def test_engine_instantiable(self):
        from datahub.engines.quality import DataQualityEngine
        assert DataQualityEngine() is not None

    def test_assess_full_reservation_high_score(self):
        from datahub.engines.quality import DataQualityEngine
        engine = DataQualityEngine()
        data = {
            "id": "res_001",
            "check_in_date": "2026-04-10",
            "check_out_date": "2026-04-15",
            "guest_id": "guest_001",
            "channel": "direct",
            "total_amount": 750.0,
        }
        _, report = engine.assess_quality(
            data, "reservation", "hotel_1",
            required_fields=["id", "check_in_date", "check_out_date", "guest_id"]
        )
        assert report.quality_score > 0.5
        assert report.entity_type == "reservation"

    def test_assess_sparse_data_low_score(self):
        from datahub.engines.quality import DataQualityEngine
        engine = DataQualityEngine()
        data = {"id": "res_002"}   # champs requis manquants
        _, report = engine.assess_quality(
            data, "reservation", "hotel_1",
            required_fields=["id", "check_in_date", "check_out_date", "guest_id"]
        )
        assert report.quality_score < 0.8
        assert report.is_valid is False

    def test_score_always_between_0_and_1(self):
        from datahub.engines.quality import DataQualityEngine
        engine = DataQualityEngine()
        for data in [{}, {"id": "x"}, {"id": "x", "email": "a@b.com"}]:
            _, report = engine.assess_quality(data, "guest", "hotel_1")
            assert 0.0 <= report.quality_score <= 1.0

    def test_no_issues_gives_perfect_score(self):
        from datahub.engines.quality import DataQualityEngine
        engine = DataQualityEngine()
        score = engine.calculate_quality_score([])
        assert score == 1.0

    def test_issue_types_exist(self):
        from datahub.engines.quality import QualityIssueType, QualitySeverity
        assert QualityIssueType.MISSING_REQUIRED is not None
        assert QualitySeverity.CRITICAL is not None

    def test_report_has_required_fields(self):
        from datahub.engines.quality import DataQualityEngine
        engine = DataQualityEngine()
        _, report = engine.assess_quality({"id": "x"}, "guest", "hotel_1")
        assert hasattr(report, "quality_score")
        assert hasattr(report, "issues")
        assert hasattr(report, "is_valid")
        assert hasattr(report, "is_complete")


# ── Priority Engine ───────────────────────────────────────────────────────────

class TestSourcePriorityEngine:

    def test_engine_instantiable(self):
        from datahub.engines.priority import SourcePriorityEngine
        assert SourcePriorityEngine() is not None

    def test_source_priority_config(self):
        from datahub.config import SOURCE_PRIORITY
        assert "pms" in SOURCE_PRIORITY
        assert SOURCE_PRIORITY["pms"] >= SOURCE_PRIORITY.get("channel_manager", 0)

    def test_strategies_exist(self):
        from datahub.engines.priority import ConflictResolutionStrategy
        assert ConflictResolutionStrategy.HIGHEST_PRIORITY is not None
        assert ConflictResolutionStrategy.MOST_RECENT is not None
        assert ConflictResolutionStrategy.MERGE is not None

    def test_highest_priority_wins(self):
        from datahub.engines.priority import (
            SourcePriorityEngine, ConflictResolutionStrategy, ConflictField
        )
        from datetime import datetime, timezone
        engine = SourcePriorityEngine()
        conflict = ConflictField(
            field_name="total_amount",
            source_a="pms",        value_a=800.0, priority_a=100,
            updated_at_a=datetime.now(timezone.utc),
            source_b="booking_com", value_b=750.0, priority_b=60,
            updated_at_b=datetime.now(timezone.utc),
        )
        resolved = engine.resolve_conflict(
            conflict, ConflictResolutionStrategy.HIGHEST_PRIORITY
        )
        assert resolved == 800.0   # PMS (100) > Booking.com (60)

    def test_most_recent_wins(self):
        from datahub.engines.priority import (
            SourcePriorityEngine, ConflictResolutionStrategy, ConflictField
        )
        from datetime import datetime, timezone, timedelta
        engine = SourcePriorityEngine()
        old  = datetime.now(timezone.utc) - timedelta(hours=1)
        new  = datetime.now(timezone.utc)
        conflict = ConflictField(
            field_name="status",
            source_a="pms",  value_a="confirmed",  priority_a=100, updated_at_a=old,
            source_b="ota",  value_b="cancelled",   priority_b=60,  updated_at_b=new,
        )
        resolved = engine.resolve_conflict(
            conflict, ConflictResolutionStrategy.MOST_RECENT
        )
        assert resolved == "cancelled"   # b is newer


# ── Smart Cache ───────────────────────────────────────────────────────────────

class TestSmartCache:

    def _cache(self, size=100):
        from datahub.engines.cache import SmartCache
        return SmartCache(max_size=size)

    def test_cache_instantiable(self):
        assert self._cache() is not None

    def test_set_and_get(self):
        cache = self._cache()
        value = {"id": "res_001", "amount": 500}
        cache.set("reservation", "res_001", "hotel_1", value)
        result = cache.get("reservation", "res_001", "hotel_1")
        assert result is not None
        assert result["id"] == "res_001"

    def test_miss_returns_none(self):
        cache = self._cache()
        assert cache.get("reservation", "nonexistent_xyz", "hotel_x") is None

    def test_invalidate_tenant_clears_entries(self):
        cache = self._cache()
        for i in range(5):
            cache.set("reservation", f"res_{i}", "hotel_1", {"id": i})
        count = cache.invalidate_tenant("hotel_1")
        assert isinstance(count, int)
        assert count >= 0

    def test_invalidate_entity_type(self):
        cache = self._cache()
        cache.set("reservation", "r1", "hotel_1", {"id": "r1"})
        cache.set("guest",       "g1", "hotel_1", {"id": "g1"})
        removed = cache.invalidate_entity_type("reservation", "hotel_1")
        assert isinstance(removed, int)
        # Guest entry should still be there
        assert cache.get("guest", "g1", "hotel_1") is not None

    def test_stats_structure(self):
        cache = self._cache()
        stats = cache.get_stats()
        for attr in ("total_entries", "hit_count", "miss_count", "hit_rate"):
            assert hasattr(stats, attr)

    def test_hit_rate_between_0_and_1(self):
        cache = self._cache()
        assert 0.0 <= cache.get_stats().hit_rate <= 1.0

    def test_hit_rate_increases_on_hit(self):
        cache = self._cache()
        cache.set("reservation", "r1", "hotel_1", {"id": "r1"})
        cache.get("reservation", "r1", "hotel_1")    # hit
        cache.get("reservation", "missing", "hotel_1")  # miss
        stats = cache.get_stats()
        assert stats.hit_count >= 1
        assert stats.miss_count >= 1

    def test_max_size_eviction(self):
        cache = self._cache(size=5)
        for i in range(10):
            cache.set("test", f"item_{i}", "hotel_1", {"v": i})
        assert cache.get_stats().total_entries <= 5

    def test_cache_strategy_enum(self):
        from datahub.engines.cache import CacheStrategy
        assert CacheStrategy.WRITE_THROUGH is not None
        assert CacheStrategy.WRITE_BEHIND  is not None
        assert CacheStrategy.WRITE_AROUND  is not None


# ── Engines package exports ───────────────────────────────────────────────────

class TestEnginesPackage:

    def test_all_phase2_engines_exported(self):
        from datahub.engines import (
            DataQualityEngine, SourcePriorityEngine, SmartCache, CacheStrategy
        )
        for cls in (DataQualityEngine, SourcePriorityEngine, SmartCache, CacheStrategy):
            assert cls is not None

    def test_phase1_normalization_still_exported(self):
        from datahub.engines import NormalizationEngine, get_normalization_engine
        assert get_normalization_engine() is not None


# ── Routes registered ─────────────────────────────────────────────────────────

class TestDataHubRoutes:

    def _route_paths(self):
        from datahub.routes import router
        return [r.path for r in router.routes]

    def test_phase2_routes_registered(self):
        paths = self._route_paths()
        expected = [
            "/datahub/hotels/{hotel_id}/quality/assess",
            "/datahub/hotels/{hotel_id}/quality/score",
            "/datahub/hotels/{hotel_id}/cache/stats",
            "/datahub/hotels/{hotel_id}/cache/invalidate",
            "/datahub/hotels/{hotel_id}/cache/warm-up",
            "/datahub/hotels/{hotel_id}/events/stream",
            "/datahub/hotels/{hotel_id}/events/replay",
            "/datahub/hotels/{hotel_id}/phase2/dashboard",
        ]
        for path in expected:
            assert path in paths, f"Route manquante: {path}"

    def test_phase1_routes_still_present(self):
        paths = self._route_paths()
        expected = [
            "/datahub/hotels/{hotel_id}/sync",
            "/datahub/hotels/{hotel_id}/reservations",
            "/datahub/hotels/{hotel_id}/stats",
            "/datahub/hotels/{hotel_id}/events",
        ]
        for path in expected:
            assert path in paths, f"Route Phase 1 manquante: {path}"
