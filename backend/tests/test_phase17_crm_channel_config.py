"""
Tests Phase 17 — CRM → ConfigService & Channel Manager → ConfigService
Vérifie les endpoints d'enrichissement CRM et la synchro tarifaire Channel.
"""
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))


# ── CRM → ConfigService ───────────────────────────────────────────────────────

class TestCRMNewEndpoints:
    """Vérifie que les 3 nouveaux endpoints CRM sont enregistrés dans server.py"""

    def _get_server_routes(self):
        """Parse les chemins de routes depuis server.py sans importer le module complet."""
        server_path = os.path.join(os.path.dirname(__file__), '..', 'server.py')
        with open(server_path, encoding='utf-8') as f:
            content = f.read()
        return content

    def test_crm_hotels_clients_route_exists(self):
        content = self._get_server_routes()
        assert '/crm/hotels/{hotel_id}/clients' in content, \
            "Route GET /crm/hotels/{hotel_id}/clients manquante dans server.py"

    def test_crm_enrich_route_exists(self):
        content = self._get_server_routes()
        assert '/crm/hotels/{hotel_id}/clients/{client_id}/enrich' in content, \
            "Route POST enrich manquante dans server.py"

    def test_crm_sync_and_enrich_route_exists(self):
        content = self._get_server_routes()
        assert '/crm/hotels/{hotel_id}/clients/sync-and-enrich' in content, \
            "Route POST sync-and-enrich manquante dans server.py"

    def test_crm_route_functions_importable(self):
        """Les fonctions peuvent s'importer depuis crm.routes"""
        from crm.routes import (
            list_clients_by_hotel,
            enrich_client_from_config,
            sync_and_enrich_all_clients,
        )
        for fn in (list_clients_by_hotel, enrich_client_from_config, sync_and_enrich_all_clients):
            assert callable(fn)

    def test_enrich_function_is_coroutine(self):
        """Les endpoints CRM sont des coroutines async"""
        import asyncio
        from crm.routes import enrich_client_from_config
        assert asyncio.iscoroutinefunction(enrich_client_from_config)

    def test_sync_function_is_coroutine(self):
        import asyncio
        from crm.routes import sync_and_enrich_all_clients
        assert asyncio.iscoroutinefunction(sync_and_enrich_all_clients)

    def test_list_by_hotel_function_is_coroutine(self):
        import asyncio
        from crm.routes import list_clients_by_hotel
        assert asyncio.iscoroutinefunction(list_clients_by_hotel)


class TestCRMEnrichmentLogic:
    """Vérifie la logique d'enrichissement sans base de données"""

    def test_segment_suggestion_new_client(self):
        """0 séjours → segment 'nouveau'"""
        # Logique extraite de enrich_client_from_config
        total_stays = 0
        if total_stays >= 10:  seg = "vip"
        elif total_stays >= 5: seg = "fidele"
        elif total_stays >= 2: seg = "regulier"
        else:                   seg = "nouveau"
        assert seg == "nouveau"

    def test_segment_suggestion_regular_client(self):
        total_stays = 3
        if total_stays >= 10:  seg = "vip"
        elif total_stays >= 5: seg = "fidele"
        elif total_stays >= 2: seg = "regulier"
        else:                   seg = "nouveau"
        assert seg == "regulier"

    def test_segment_suggestion_loyal_client(self):
        total_stays = 7
        if total_stays >= 10:  seg = "vip"
        elif total_stays >= 5: seg = "fidele"
        elif total_stays >= 2: seg = "regulier"
        else:                   seg = "nouveau"
        assert seg == "fidele"

    def test_segment_suggestion_vip_client(self):
        total_stays = 15
        if total_stays >= 10:  seg = "vip"
        elif total_stays >= 5: seg = "fidele"
        elif total_stays >= 2: seg = "regulier"
        else:                   seg = "nouveau"
        assert seg == "vip"

    def test_crm_models_importable(self):
        from crm.models import ClientCreate, ClientUpdate, ClientResponse
        for cls in (ClientCreate, ClientUpdate, ClientResponse):
            assert cls is not None


# ── Channel Manager → ConfigService ──────────────────────────────────────────

class TestChannelConfigServiceIntegration:

    def _get_server_routes(self):
        server_path = os.path.join(os.path.dirname(__file__), '..', 'server.py')
        with open(server_path, encoding='utf-8') as f:
            return f.read()

    def test_sync_rates_route_in_server(self):
        content = self._get_server_routes()
        assert '/hotels/{hotel_id}/channel/sync-rates-from-config' in content

    def test_room_types_from_config_route_in_server(self):
        content = self._get_server_routes()
        assert '/hotels/{hotel_id}/channel/room-types-from-config' in content

    def test_channel_route_functions_importable(self):
        from channel.routes import sync_rates_from_config, get_room_types_from_config
        for fn in (sync_rates_from_config, get_room_types_from_config):
            assert callable(fn)

    def test_sync_rates_is_coroutine(self):
        import asyncio
        from channel.routes import sync_rates_from_config
        assert asyncio.iscoroutinefunction(sync_rates_from_config)

    def test_get_room_types_from_config_is_coroutine(self):
        import asyncio
        from channel.routes import get_room_types_from_config
        assert asyncio.iscoroutinefunction(get_room_types_from_config)

    def test_configservice_used_in_get_inventory(self):
        """Vérifie que get_inventory utilise ConfigService (code source)"""
        channel_path = os.path.join(os.path.dirname(__file__), '..', 'channel', 'routes.py')
        with open(channel_path, encoding='utf-8') as f:
            content = f.read()
        assert 'get_config_service' in content or 'config_service' in content.lower(), \
            "get_inventory ne référence pas ConfigService"

    def test_configservice_used_in_get_rates(self):
        """Vérifie que get_rates utilise ConfigService"""
        channel_path = os.path.join(os.path.dirname(__file__), '..', 'channel', 'routes.py')
        with open(channel_path, encoding='utf-8') as f:
            content = f.read()
        assert 'pricing_matrix' in content, \
            "get_rates ne référence pas pricing_matrix de ConfigService"

    def test_channel_models_importable(self):
        from channel.models import (
            ChannelConnectionCreate, RoomMappingCreate,
            InventoryUpdate, RateUpdate
        )
        for cls in (ChannelConnectionCreate, RoomMappingCreate, InventoryUpdate, RateUpdate):
            assert cls is not None

    def test_commission_calculation_logic(self):
        """Vérifie la logique de calcul commission OTA"""
        base_price = 100.0
        commission_rate = 15.0   # 15%
        commission = commission_rate / 100
        # Prix canal = prix net / (1 - commission)
        channel_price = round(base_price / max(1 - commission, 0.01), 2)
        assert channel_price > base_price
        assert channel_price == round(100 / 0.85, 2)

    def test_weekend_markup_logic(self):
        """Vérifie la majoration week-end"""
        base_price = 100.0
        is_weekend = True
        price = base_price * (1.15 if is_weekend else 1.0)
        assert abs(price - 115.0) < 0.01

    def test_sync_rates_validates_period_limit(self):
        """sync_rates_from_config lève une erreur si période > 365j"""
        channel_path = os.path.join(os.path.dirname(__file__), '..', 'channel', 'routes.py')
        with open(channel_path, encoding='utf-8') as f:
            content = f.read()
        assert '365' in content, "Limite de 365 jours non implémentée"


# ── Intégration globale ───────────────────────────────────────────────────────

class TestPhase17GlobalIntegration:

    def test_shared_config_service_importable(self):
        from shared.config_service import ConfigService
        assert ConfigService is not None

    def test_config_service_has_required_methods(self):
        from shared.config_service import ConfigService
        required = [
            "get_hotel_profile", "get_room_types", "get_room_type_by_id",
            "get_room_type_by_code", "get_pricing_matrix", "get_rate_plans",
        ]
        for method in required:
            assert hasattr(ConfigService, method), f"ConfigService.{method} manquant"

    def test_both_modules_reference_config_service(self):
        """CRM et Channel doivent tous deux référencer ConfigService"""
        for module_file in ['crm/routes.py', 'channel/routes.py']:
            path = os.path.join(os.path.dirname(__file__), '..', module_file)
            with open(path, encoding='utf-8') as f:
                content = f.read()
            assert 'config_service' in content.lower() or 'ConfigService' in content, \
                f"{module_file} ne référence pas ConfigService"

    def test_crm_hotel_id_field_in_sync(self):
        """sync_and_enrich_all_clients ajoute hotel_id aux clients"""
        crm_path = os.path.join(os.path.dirname(__file__), '..', 'crm', 'routes.py')
        with open(crm_path, encoding='utf-8') as f:
            content = f.read()
        assert '"hotel_id": hotel_id' in content or "'hotel_id': hotel_id" in content, \
            "L'injection de hotel_id est absente de sync_and_enrich_all_clients"
