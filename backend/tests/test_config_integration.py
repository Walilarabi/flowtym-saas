"""
Test Configuration Integration APIs
Tests for Phase A & B of Configuration module integration with RMS and Data Hub.

Endpoints tested:
- Shared Config API: /api/shared/config/{hotel_id}/*
- RMS Integration: /api/rms/hotels/{hotel_id}/config-integration, sync-from-config, room-types-from-config
- Data Hub Integration: /api/datahub/hotels/{hotel_id}/config-integration, pricing-for-distribution
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
HOTEL_ID = "4f02769a-5f63-4121-bb97-a7061563d934"


class TestSharedConfigAPI:
    """Tests for /api/shared/config/* endpoints - Central ConfigService"""
    
    def test_get_full_configuration(self):
        """GET /api/shared/config/{hotel_id}/all - Full configuration"""
        response = requests.get(f"{BASE_URL}/api/shared/config/{HOTEL_ID}/all")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        # Verify structure
        assert "hotel_id" in data
        assert "hotel" in data
        assert "room_types" in data
        assert "rate_plans" in data
        assert "pricing_matrix" in data
        assert "cancellation_policies" in data
        assert "payment_policies" in data
        assert "taxes" in data
        assert "settings" in data
        assert "fetched_at" in data
        
        print(f"Full config fetched: {len(data['room_types'])} room types, {len(data['rate_plans'])} rate plans")
    
    def test_get_room_types(self):
        """GET /api/shared/config/{hotel_id}/room-types - Room types list"""
        response = requests.get(f"{BASE_URL}/api/shared/config/{HOTEL_ID}/room-types")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list)
        
        # Verify room type structure if data exists
        if len(data) > 0:
            rt = data[0]
            assert "id" in rt
            assert "code" in rt
            assert "name" in rt
            print(f"Room types: {[r['code'] for r in data]}")
    
    def test_get_room_types_with_count(self):
        """GET /api/shared/config/{hotel_id}/room-types?include_room_count=true"""
        response = requests.get(f"{BASE_URL}/api/shared/config/{HOTEL_ID}/room-types?include_room_count=true")
        
        assert response.status_code == 200
        data = response.json()
        
        if len(data) > 0:
            # Should have room_count field
            rt = data[0]
            assert "room_count" in rt or "base_price" in rt  # At least one of these
            print(f"Room type {rt.get('code')}: {rt.get('room_count', 'N/A')} rooms")
    
    def test_get_room_type_mapping(self):
        """GET /api/shared/config/{hotel_id}/room-types/mapping - Code to data mapping"""
        response = requests.get(f"{BASE_URL}/api/shared/config/{HOTEL_ID}/room-types/mapping")
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, dict)
        
        # Keys should be room type codes
        if data:
            first_key = list(data.keys())[0]
            assert isinstance(data[first_key], dict)
            print(f"Room type mapping keys: {list(data.keys())}")
    
    def test_get_room_type_prices(self):
        """GET /api/shared/config/{hotel_id}/room-types/prices - Base prices"""
        response = requests.get(f"{BASE_URL}/api/shared/config/{HOTEL_ID}/room-types/prices")
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, dict)
        
        # Values should be prices (numbers)
        if data:
            for code, price in data.items():
                assert isinstance(price, (int, float))
            print(f"Room type prices: {data}")
    
    def test_get_pricing_matrix(self):
        """GET /api/shared/config/{hotel_id}/pricing-matrix - Full pricing matrix"""
        response = requests.get(f"{BASE_URL}/api/shared/config/{HOTEL_ID}/pricing-matrix")
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, dict)
        
        # Structure: {rate_code: {room_type_code: price}}
        if data:
            for rate_code, room_prices in data.items():
                assert isinstance(room_prices, dict)
                for room_code, price in room_prices.items():
                    assert isinstance(price, (int, float))
            print(f"Pricing matrix: {len(data)} rate plans")
            
            # Verify BAR and NRF rates exist (from test data)
            if "BAR" in data and "NRF" in data:
                # NRF should be -10% of BAR
                for room_code in data["BAR"]:
                    bar_price = data["BAR"][room_code]
                    nrf_price = data["NRF"].get(room_code)
                    if nrf_price:
                        expected_nrf = bar_price * 0.9
                        # Allow small rounding difference
                        assert abs(nrf_price - expected_nrf) < 2, f"NRF price {nrf_price} should be ~{expected_nrf} (-10% of BAR {bar_price})"
                        print(f"  {room_code}: BAR={bar_price}, NRF={nrf_price} (expected ~{expected_nrf})")
    
    def test_get_rate_plans(self):
        """GET /api/shared/config/{hotel_id}/rate-plans - All rate plans"""
        response = requests.get(f"{BASE_URL}/api/shared/config/{HOTEL_ID}/rate-plans")
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        
        if len(data) > 0:
            rp = data[0]
            assert "id" in rp
            assert "code" in rp
            assert "name" in rp
            print(f"Rate plans: {[r['code'] for r in data]}")
    
    def test_get_base_rate_plans(self):
        """GET /api/shared/config/{hotel_id}/rate-plans/base - Only base rates"""
        response = requests.get(f"{BASE_URL}/api/shared/config/{HOTEL_ID}/rate-plans/base")
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        
        # All should be non-derived
        for rp in data:
            assert rp.get("is_derived", False) == False
        print(f"Base rate plans: {[r['code'] for r in data]}")
    
    def test_get_hotel_profile(self):
        """GET /api/shared/config/{hotel_id}/hotel - Hotel profile"""
        response = requests.get(f"{BASE_URL}/api/shared/config/{HOTEL_ID}/hotel")
        
        assert response.status_code == 200
        data = response.json()
        
        # Should have basic hotel info
        assert "tenant_id" in data or "name" in data
        print(f"Hotel profile: {data.get('name', 'N/A')}")
    
    def test_get_hotel_timezone(self):
        """GET /api/shared/config/{hotel_id}/timezone"""
        response = requests.get(f"{BASE_URL}/api/shared/config/{HOTEL_ID}/timezone")
        
        assert response.status_code == 200
        data = response.json()
        assert "timezone" in data
        print(f"Timezone: {data['timezone']}")
    
    def test_get_hotel_currency(self):
        """GET /api/shared/config/{hotel_id}/currency"""
        response = requests.get(f"{BASE_URL}/api/shared/config/{HOTEL_ID}/currency")
        
        assert response.status_code == 200
        data = response.json()
        assert "currency" in data
        print(f"Currency: {data['currency']}")
    
    def test_get_inventory_summary(self):
        """GET /api/shared/config/{hotel_id}/inventory - Inventory summary"""
        response = requests.get(f"{BASE_URL}/api/shared/config/{HOTEL_ID}/inventory")
        
        assert response.status_code == 200
        data = response.json()
        
        assert "total_rooms" in data
        assert "by_type" in data
        assert "by_floor" in data
        print(f"Inventory: {data['total_rooms']} total rooms")
    
    def test_get_rms_data(self):
        """GET /api/shared/config/{hotel_id}/rms-data - RMS specific data"""
        response = requests.get(f"{BASE_URL}/api/shared/config/{HOTEL_ID}/rms-data")
        
        assert response.status_code == 200
        data = response.json()
        
        assert "hotel_id" in data
        assert "room_types" in data
        assert "inventory" in data
        assert "rate_plans" in data
        assert "pricing_matrix" in data
        assert "overbooking_allowed" in data
        print(f"RMS data: {len(data['room_types'])} room types, overbooking={data['overbooking_allowed']}")
    
    def test_get_datahub_data(self):
        """GET /api/shared/config/{hotel_id}/datahub-data - Data Hub specific data"""
        response = requests.get(f"{BASE_URL}/api/shared/config/{HOTEL_ID}/datahub-data")
        
        assert response.status_code == 200
        data = response.json()
        
        assert "hotel_id" in data
        assert "room_types" in data
        assert "rate_plans" in data
        assert "check_in_time" in data
        assert "check_out_time" in data
        print(f"DataHub data: check-in={data['check_in_time']}, check-out={data['check_out_time']}")


class TestRMSConfigIntegration:
    """Tests for RMS integration with Configuration module"""
    
    def test_get_config_integration(self):
        """GET /api/rms/hotels/{hotel_id}/config-integration - RMS config from Configuration"""
        response = requests.get(f"{BASE_URL}/api/rms/hotels/{HOTEL_ID}/config-integration")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "hotel_id" in data
        assert "source" in data
        assert data["source"] == "configuration_module"
        assert "room_types" in data
        assert "rate_plans" in data
        assert "inventory" in data
        assert "pricing_matrix" in data
        assert "settings" in data
        assert "synced_at" in data
        
        # Verify room type structure
        if data["room_types"]:
            rt = data["room_types"][0]
            assert "id" in rt
            assert "code" in rt
            assert "name" in rt
            assert "base_price" in rt
            assert "room_count" in rt
        
        # Verify rate plan structure
        if data["rate_plans"]:
            rp = data["rate_plans"][0]
            assert "id" in rp
            assert "code" in rp
            assert "name" in rp
            assert "is_derived" in rp
        
        print(f"RMS config integration: {len(data['room_types'])} room types, {len(data['rate_plans'])} rate plans")
    
    def test_sync_from_config(self):
        """POST /api/rms/hotels/{hotel_id}/sync-from-config - Sync RMS with Configuration"""
        response = requests.post(f"{BASE_URL}/api/rms/hotels/{HOTEL_ID}/sync-from-config")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["status"] == "success"
        assert "message" in data
        assert "updates" in data
        assert "synced_at" in data
        
        updates = data["updates"]
        assert "base_adr" in updates
        assert "room_types_synced" in updates
        assert "rate_plans_in_matrix" in updates
        
        print(f"RMS sync: base_adr={updates['base_adr']}, {updates['room_types_synced']} room types synced")
    
    def test_get_room_types_from_config(self):
        """GET /api/rms/hotels/{hotel_id}/room-types-from-config - Room types for RMS UI"""
        response = requests.get(f"{BASE_URL}/api/rms/hotels/{HOTEL_ID}/room-types-from-config")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "hotel_id" in data
        assert "source" in data
        assert "room_types" in data
        
        # Should be from configuration_module
        assert data["source"] == "configuration_module"
        
        if data["room_types"]:
            rt = data["room_types"][0]
            assert "code" in rt
            assert "name" in rt
            assert "base_price" in rt
        
        print(f"Room types from config: {[r['code'] for r in data['room_types']]}")


class TestDataHubConfigIntegration:
    """Tests for Data Hub integration with Configuration module"""
    
    def test_get_config_integration(self):
        """GET /api/datahub/hotels/{hotel_id}/config-integration - Data Hub config from Configuration"""
        response = requests.get(f"{BASE_URL}/api/datahub/hotels/{HOTEL_ID}/config-integration")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "hotel_id" in data
        assert "source" in data
        assert data["source"] == "configuration_module"
        assert "hotel" in data
        assert "check_times" in data
        assert "room_types" in data
        assert "rate_plans" in data
        assert "synced_at" in data
        
        # Verify hotel info
        hotel = data["hotel"]
        assert "currency" in hotel
        assert "timezone" in hotel
        
        # Verify room type structure for OTA mapping
        if data["room_types"]:
            rt = data["room_types"][0]
            assert "id" in rt
            assert "code" in rt
            assert "name" in rt
            assert "ota_mappings" in rt
        
        # Verify rate plan structure for distribution
        if data["rate_plans"]:
            rp = data["rate_plans"][0]
            assert "id" in rp
            assert "code" in rp
            assert "channels" in rp or "is_public" in rp
        
        print(f"DataHub config integration: {len(data['room_types'])} room types, {len(data['rate_plans'])} rate plans")
    
    def test_get_pricing_for_distribution(self):
        """GET /api/datahub/hotels/{hotel_id}/pricing-for-distribution - Pricing for OTA channels"""
        response = requests.get(f"{BASE_URL}/api/datahub/hotels/{HOTEL_ID}/pricing-for-distribution")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "hotel_id" in data
        assert "currency" in data
        assert "room_types_count" in data
        assert "rate_plans_count" in data
        assert "distribution_data" in data
        assert "generated_at" in data
        
        # Verify distribution data structure
        if data["distribution_data"]:
            dist = data["distribution_data"][0]
            assert "room_type_id" in dist
            assert "room_type_code" in dist
            assert "room_type_name" in dist
            assert "base_price" in dist
            assert "rates" in dist
            
            # Verify rate structure
            if dist["rates"]:
                rate = dist["rates"][0]
                assert "rate_plan_id" in rate
                assert "rate_plan_code" in rate
                assert "price" in rate
                assert "currency" in rate
        
        print(f"Pricing for distribution: {data['room_types_count']} room types, {data['rate_plans_count']} rate plans")
    
    def test_get_room_type_ota_mapping(self):
        """GET /api/datahub/hotels/{hotel_id}/room-type-mapping/{ota_code} - OTA room type mapping"""
        response = requests.get(f"{BASE_URL}/api/datahub/hotels/{HOTEL_ID}/room-type-mapping/booking_com")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "hotel_id" in data
        assert "ota_code" in data
        assert "source" in data
        assert "mapping" in data
        
        print(f"OTA room type mapping: {len(data['mapping'])} mappings")
    
    def test_get_rate_plan_ota_mapping(self):
        """GET /api/datahub/hotels/{hotel_id}/rate-plan-mapping/{ota_code} - OTA rate plan mapping"""
        response = requests.get(f"{BASE_URL}/api/datahub/hotels/{HOTEL_ID}/rate-plan-mapping/expedia")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "hotel_id" in data
        assert "ota_code" in data
        assert "source" in data
        assert "mapping" in data
        
        print(f"OTA rate plan mapping: {len(data['mapping'])} mappings")


class TestPricingMatrixDerivation:
    """Tests for pricing matrix derivation rules (BAR -> NRF with -10%)"""
    
    def test_derived_rate_calculation(self):
        """Verify NRF rate is correctly derived from BAR (-10%)"""
        response = requests.get(f"{BASE_URL}/api/shared/config/{HOTEL_ID}/pricing-matrix")
        
        assert response.status_code == 200
        matrix = response.json()
        
        if "BAR" in matrix and "NRF" in matrix:
            print("Verifying BAR -> NRF derivation (-10%):")
            for room_code in matrix["BAR"]:
                bar_price = matrix["BAR"][room_code]
                nrf_price = matrix["NRF"].get(room_code)
                
                if nrf_price:
                    expected_nrf = bar_price * 0.9
                    diff_pct = abs(nrf_price - expected_nrf) / bar_price * 100
                    
                    print(f"  {room_code}: BAR={bar_price}€, NRF={nrf_price}€ (expected={expected_nrf:.2f}€, diff={diff_pct:.1f}%)")
                    
                    # Allow 2% tolerance for rounding
                    assert diff_pct < 2, f"NRF derivation error for {room_code}: expected ~{expected_nrf}, got {nrf_price}"
        else:
            print("BAR or NRF rate plan not found - skipping derivation test")


class TestCancellationAndPaymentPolicies:
    """Tests for policy endpoints via shared config"""
    
    def test_get_cancellation_policies(self):
        """GET /api/shared/config/{hotel_id}/policies/cancellation"""
        response = requests.get(f"{BASE_URL}/api/shared/config/{HOTEL_ID}/policies/cancellation")
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Cancellation policies: {len(data)}")
    
    def test_get_payment_policies(self):
        """GET /api/shared/config/{hotel_id}/policies/payment"""
        response = requests.get(f"{BASE_URL}/api/shared/config/{HOTEL_ID}/policies/payment")
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Payment policies: {len(data)}")
    
    def test_get_default_policies(self):
        """GET /api/shared/config/{hotel_id}/policies/defaults"""
        response = requests.get(f"{BASE_URL}/api/shared/config/{HOTEL_ID}/policies/defaults")
        
        assert response.status_code == 200
        data = response.json()
        assert "cancellation" in data
        assert "payment" in data
        print(f"Default policies: cancellation={data['cancellation'] is not None}, payment={data['payment'] is not None}")


class TestTaxesAndSettings:
    """Tests for taxes and advanced settings via shared config"""
    
    def test_get_taxes(self):
        """GET /api/shared/config/{hotel_id}/taxes"""
        response = requests.get(f"{BASE_URL}/api/shared/config/{HOTEL_ID}/taxes")
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Taxes: {len(data)}")
    
    def test_get_advanced_settings(self):
        """GET /api/shared/config/{hotel_id}/settings"""
        response = requests.get(f"{BASE_URL}/api/shared/config/{HOTEL_ID}/settings")
        
        assert response.status_code == 200
        data = response.json()
        
        # Should have booking rules
        assert "min_booking_advance_hours" in data or "tenant_id" in data
        print(f"Settings: overbooking={data.get('overbooking_allowed', 'N/A')}")
    
    def test_calculate_price_with_tax(self):
        """GET /api/shared/config/{hotel_id}/calculate-price"""
        response = requests.get(
            f"{BASE_URL}/api/shared/config/{HOTEL_ID}/calculate-price",
            params={"base_price": 100, "service_type": "room"}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert "base_price" in data
        assert "tax_rate" in data
        assert "tax_amount" in data
        assert "total_price" in data
        
        print(f"Price calculation: base={data['base_price']}, tax={data['tax_rate']}%, total={data['total_price']}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
