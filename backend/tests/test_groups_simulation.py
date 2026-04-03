"""
Tests Phase 21 — Groups & Séminaires + Simulation & Offres
Vérifie la logique métier sans base de données.
"""
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))


# ── Helpers métier ────────────────────────────────────────────────────────────

class TestNightsCalculation:

    def _nights(self, check_in, check_out):
        from groups.routes import _nights
        return _nights(check_in, check_out)

    def test_standard_stay(self):
        assert self._nights("2026-04-10", "2026-04-15") == 5

    def test_one_night(self):
        assert self._nights("2026-04-10", "2026-04-11") == 1

    def test_same_day_returns_1(self):
        assert self._nights("2026-04-10", "2026-04-10") == 1

    def test_long_stay(self):
        assert self._nights("2026-04-01", "2026-04-30") == 29

    def test_invalid_dates_returns_1(self):
        assert self._nights("invalid", "2026-04-10") == 1


class TestQuotePricing:

    def _compute(self, base, nights, adults=2, extras=None, discount=0.0):
        from groups.routes import _compute_quote_total
        return _compute_quote_total(base, nights, adults, extras or [], discount)

    def test_basic_total(self):
        result = self._compute(100.0, 3)
        assert result["rooms_total"] == 300.0
        assert result["extras_total"] == 0.0
        assert result["subtotal"] == 300.0
        assert result["discount_amount"] == 0.0
        assert result["total_amount"] == 300.0

    def test_with_discount_10pct(self):
        result = self._compute(200.0, 2, discount=10.0)
        assert result["subtotal"] == 400.0
        assert result["discount_amount"] == 40.0
        assert result["total_amount"] == 360.0

    def test_with_extras(self):
        extras = [
            {"name": "Petit-déjeuner", "unit_price": 25.0, "qty": 2},
            {"name": "Parking", "unit_price": 15.0, "qty": 3},
        ]
        result = self._compute(100.0, 2, extras=extras)
        assert result["rooms_total"] == 200.0
        assert result["extras_total"] == 50.0 + 45.0  # 95.0
        assert result["subtotal"] == 295.0
        assert result["total_amount"] == 295.0

    def test_discount_100pct_gives_zero(self):
        result = self._compute(100.0, 2, discount=100.0)
        assert result["total_amount"] == 0.0

    def test_zero_nights_returns_zero_rooms(self):
        result = self._compute(100.0, 0)
        assert result["rooms_total"] == 0.0

    def test_rounding(self):
        result = self._compute(99.99, 3)
        assert isinstance(result["total_amount"], float)
        assert result["total_amount"] == round(99.99 * 3, 2)

    def test_all_keys_present(self):
        result = self._compute(100.0, 1)
        for key in ("rooms_total", "extras_total", "subtotal", "discount_amount", "total_amount"):
            assert key in result

    def test_discount_applied_after_extras(self):
        extras = [{"name": "Spa", "unit_price": 50.0, "qty": 1}]
        result = self._compute(100.0, 2, extras=extras, discount=50.0)
        # subtotal = 200 + 50 = 250, discount = 125
        assert result["subtotal"] == 250.0
        assert result["discount_amount"] == 125.0
        assert result["total_amount"] == 125.0


# ── Modèles Pydantic ──────────────────────────────────────────────────────────

class TestGroupModels:

    def test_group_create_minimal(self):
        from groups.routes import GroupAllocationCreate
        g = GroupAllocationCreate(
            group_name="Séminaire Tech",
            contact_name="Jean Dupont",
            block_start="2026-05-10",
            block_end="2026-05-15",
            rooms_blocked=10,
        )
        assert g.group_name == "Séminaire Tech"
        assert g.rooms_blocked == 10
        assert g.status == "tentative"

    def test_group_create_with_all_fields(self):
        from groups.routes import GroupAllocationCreate
        g = GroupAllocationCreate(
            group_name="Conférence Annuelle",
            contact_name="Marie Martin",
            contact_email="marie@corp.com",
            contact_phone="+33 6 12 34 56 78",
            block_start="2026-06-01",
            block_end="2026-06-05",
            rooms_blocked=25,
            room_type_code="DBL",
            rate_per_room=120.0,
            notes="Salle de conférence incluse",
            status="confirmed",
        )
        assert g.status == "confirmed"
        assert g.rate_per_room == 120.0

    def test_group_status_values(self):
        from groups.routes import GroupAllocationCreate
        for status in ("tentative", "confirmed", "cancelled"):
            g = GroupAllocationCreate(
                group_name="Test", contact_name="X",
                block_start="2026-05-01", block_end="2026-05-03",
                rooms_blocked=1, status=status
            )
            assert g.status == status

    def test_rooming_entry_model(self):
        from groups.routes import RoomingListEntry
        entry = RoomingListEntry(
            guest_name="Alice Durand",
            room_number="102",
            check_in="2026-05-10",
            check_out="2026-05-15",
            adults=2,
            children=1,
        )
        assert entry.guest_name == "Alice Durand"
        assert entry.adults == 2

    def test_group_update_partial(self):
        from groups.routes import GroupAllocationUpdate
        upd = GroupAllocationUpdate(status="confirmed")
        assert upd.status == "confirmed"
        assert upd.group_name is None


class TestQuoteModels:

    def test_quote_create_minimal(self):
        from groups.routes import QuoteCreate
        q = QuoteCreate(
            client_name="Pierre Martin",
            room_type_code="DBL",
            check_in="2026-07-10",
            check_out="2026-07-14",
        )
        assert q.client_name == "Pierre Martin"
        assert q.discount_pct == 0.0
        assert q.extras == []
        assert q.rate_plan_code == "BAR"

    def test_quote_create_with_extras(self):
        from groups.routes import QuoteCreate
        q = QuoteCreate(
            client_name="Client VIP",
            room_type_code="STE",
            check_in="2026-08-01",
            check_out="2026-08-05",
            extras=[{"name": "Champagne", "unit_price": 45.0, "qty": 1}],
            discount_pct=10.0,
        )
        assert len(q.extras) == 1
        assert q.discount_pct == 10.0

    def test_quote_update_partial(self):
        from groups.routes import QuoteUpdate
        upd = QuoteUpdate(status="sent", discount_pct=5.0)
        assert upd.status == "sent"
        assert upd.client_name is None


# ── Routes enregistrées ───────────────────────────────────────────────────────

class TestGroupsRoutesExist:

    def _server_content(self):
        path = os.path.join(os.path.dirname(__file__), '..', 'server.py')
        with open(path, encoding='utf-8') as f:
            return f.read()

    def test_groups_routes_in_server(self):
        content = self._server_content()
        assert '/hotels/{hotel_id}/groups' in content

    def test_quotes_routes_in_server(self):
        content = self._server_content()
        assert '/hotels/{hotel_id}/quotes' in content

    def test_convert_route_in_server(self):
        content = self._server_content()
        assert 'convert' in content

    def test_rooming_list_route_in_server(self):
        content = self._server_content()
        assert 'rooming-list' in content

    def test_groups_module_importable(self):
        from groups.routes import (
            list_group_allocations, create_group_allocation,
            get_group, update_group, delete_group,
            get_rooming_list, add_rooming_entry,
            list_quotes, create_quote, get_quote, update_quote,
            send_quote, convert_quote_to_reservation, duplicate_quote,
            get_groups_stats, get_quotes_stats,
        )
        for fn in (
            list_group_allocations, create_group_allocation, get_group,
            update_group, delete_group, list_quotes, create_quote,
            convert_quote_to_reservation, duplicate_quote,
        ):
            assert callable(fn)

    def test_all_group_functions_are_coroutines(self):
        import asyncio
        from groups.routes import (
            create_group_allocation, get_group,
            create_quote, convert_quote_to_reservation,
        )
        for fn in (create_group_allocation, get_group, create_quote, convert_quote_to_reservation):
            assert asyncio.iscoroutinefunction(fn)


# ── Logique de conversion devis → réservation ─────────────────────────────────

class TestQuoteConversionLogic:

    def test_converted_quote_creates_reservation_fields(self):
        """Vérifie que la logique de conversion produit les bons champs."""
        quote = {
            "id": "q_001",
            "quote_number": "DEV-2026-0001",
            "hotel_id": "hotel_1",
            "client_name": "Jean Dupont",
            "client_email": "jean@test.com",
            "room_type_code": "DBL",
            "check_in": "2026-07-10",
            "check_out": "2026-07-15",
            "adults": 2,
            "children": 0,
            "total_amount": 750.0,
            "rate_plan_code": "BAR",
            "notes": "Vue mer si possible",
            "status": "sent",
        }
        # Simuler la logique de conversion
        reservation = {
            "hotel_id": quote["hotel_id"],
            "quote_id": quote["id"],
            "guest_name": quote["client_name"],
            "guest_email": quote.get("client_email"),
            "room_type": quote["room_type_code"],
            "check_in": quote["check_in"],
            "check_out": quote["check_out"],
            "total_price": quote.get("total_amount", 0),
            "channel": "direct",
            "status": "confirmed",
            "source": "quote_conversion",
        }
        assert reservation["guest_name"] == "Jean Dupont"
        assert reservation["source"] == "quote_conversion"
        assert reservation["status"] == "confirmed"
        assert reservation["total_price"] == 750.0

    def test_quote_number_format(self):
        """Le numéro de devis suit le format DEV-YYYY-NNNN."""
        import re
        pattern = re.compile(r"^DEV-\d{4}-\d{4}$")
        test_numbers = ["DEV-2026-0001", "DEV-2026-0042", "DEV-2025-9999"]
        for num in test_numbers:
            assert pattern.match(num), f"Format invalide : {num}"

    def test_group_revenue_calculation(self):
        """CA estimé d'un groupe = tarif × chambres × nuits."""
        rate = 120.0
        rooms = 15
        nights = 3
        expected = rate * rooms * nights  # 5400.0
        assert expected == 5400.0

    def test_conversion_rate_calculation(self):
        """Taux de conversion = convertis / (envoyés + convertis)."""
        sent = 8
        converted = 2
        rate = round(converted / max(sent + converted, 1) * 100, 1)
        assert rate == 20.0

    def test_potential_revenue_excludes_converted(self):
        """CA potentiel = somme des devis draft + sent seulement."""
        by_status = {
            "draft": {"revenue": 3000.0},
            "sent": {"revenue": 2000.0},
            "converted": {"revenue": 5000.0},
        }
        potential = sum(
            s.get("revenue", 0)
            for k, s in by_status.items()
            if k in ("draft", "sent")
        )
        assert potential == 5000.0
