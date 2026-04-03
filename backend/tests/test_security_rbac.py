"""
Tests Phase 19 — Sécurité RBAC & Isolation Hôtel
Vérifie les guards, la hiérarchie des rôles et l'isolation par hôtel.
"""
import pytest
import jwt
import os
from datetime import datetime, timezone, timedelta

JWT_SECRET = os.environ.get("JWT_SECRET", "flowtym-secret-key-2024")
JWT_ALGORITHM = "HS256"


def make_token(role: str, hotel_id: str = "hotel_1", user_id: str = "user_1") -> str:
    payload = {
        "user_id": user_id,
        "email": f"{role}@flowtym.com",
        "role": role,
        "hotel_id": hotel_id,
        "exp": datetime.now(timezone.utc) + timedelta(hours=1),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


class TestRoleHierarchy:
    """Tests de la hiérarchie des rôles"""

    def test_role_levels_ordered(self):
        from shared.security import ROLE_HIERARCHY
        assert ROLE_HIERARCHY["super_admin"] > ROLE_HIERARCHY["admin"]
        assert ROLE_HIERARCHY["admin"] > ROLE_HIERARCHY["manager"]
        assert ROLE_HIERARCHY["manager"] > ROLE_HIERARCHY["reception"]
        assert ROLE_HIERARCHY["reception"] > ROLE_HIERARCHY["housekeeping"]
        assert ROLE_HIERARCHY["housekeeping"] > ROLE_HIERARCHY["readonly"]

    def test_super_admin_highest(self):
        from shared.security import ROLE_HIERARCHY
        max_level = max(ROLE_HIERARCHY.values())
        assert ROLE_HIERARCHY["super_admin"] == max_level

    def test_all_roles_have_level(self):
        from shared.security import ROLE_HIERARCHY
        for role in ["super_admin", "admin", "manager", "reception", "housekeeping", "readonly"]:
            assert role in ROLE_HIERARCHY
            assert ROLE_HIERARCHY[role] > 0


class TestPermissions:
    """Tests des permissions granulaires"""

    def test_super_admin_has_all_permissions(self):
        from shared.security import check_permission
        for perm in ["reservations.read", "reservations.write", "config.write", "billing.read"]:
            assert check_permission("super_admin", perm) is True

    def test_readonly_only_reads(self):
        from shared.security import check_permission
        assert check_permission("readonly", "reservations.read") is True
        assert check_permission("readonly", "reservations.write") is False
        assert check_permission("readonly", "config.write") is False

    def test_reception_can_write_reservations(self):
        from shared.security import check_permission
        assert check_permission("reception", "reservations.write") is True
        assert check_permission("reception", "config.write") is False

    def test_housekeeping_limited_to_hk(self):
        from shared.security import check_permission
        assert check_permission("housekeeping", "housekeeping.write") is True
        assert check_permission("housekeeping", "reservations.write") is False
        assert check_permission("housekeeping", "billing.read") is False

    def test_admin_has_broad_permissions(self):
        from shared.security import check_permission
        for perm in ["reservations.read", "reservations.write", "staff.read",
                     "config.read", "config.write", "crm.read"]:
            assert check_permission("admin", perm) is True

    def test_unknown_role_no_permissions(self):
        from shared.security import check_permission
        assert check_permission("unknown_role", "reservations.read") is False

    def test_get_user_permissions_returns_list(self):
        from shared.security import get_user_permissions
        perms = get_user_permissions("manager")
        assert isinstance(perms, list)
        assert len(perms) > 0

    def test_super_admin_permissions_wildcard(self):
        from shared.security import get_user_permissions
        perms = get_user_permissions("super_admin")
        assert "*" in perms


class TestHotelIsolation:
    """Tests de l'isolation par hôtel"""

    def test_token_contains_hotel_id(self):
        token = make_token("reception", hotel_id="hotel_abc")
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        assert payload["hotel_id"] == "hotel_abc"

    def test_token_decode_role(self):
        token = make_token("admin", hotel_id="hotel_1")
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        assert payload["role"] == "admin"
        assert payload["hotel_id"] == "hotel_1"

    def test_super_admin_in_multi_hotel_roles(self):
        from shared.security import MULTI_HOTEL_ROLES
        assert "super_admin" in MULTI_HOTEL_ROLES

    def test_regular_role_not_multi_hotel(self):
        from shared.security import MULTI_HOTEL_ROLES
        assert "reception" not in MULTI_HOTEL_ROLES
        assert "housekeeping" not in MULTI_HOTEL_ROLES
        assert "admin" not in MULTI_HOTEL_ROLES

    def test_get_role_info(self):
        from shared.security import get_role_info
        info = get_role_info("manager")
        assert info["role"] == "manager"
        assert info["level"] > 0
        assert isinstance(info["permissions"], list)
        assert "is_multi_hotel" in info


class TestAuditLogger:
    """Tests du logger d'audit"""

    def test_audit_log_structure(self):
        from shared.security import SecurityAuditLogger
        # Vérifie que la classe existe et a les bonnes méthodes
        assert hasattr(SecurityAuditLogger, "log")
        assert hasattr(SecurityAuditLogger, "get_logs")

    def test_audit_singleton(self):
        from shared.security import audit
        assert audit is not None


class TestSecurityEndpoints:
    """Tests des endpoints de sécurité (sans serveur)"""

    def test_role_hierarchy_exported(self):
        from shared.security import ROLE_HIERARCHY, ROLE_PERMISSIONS
        assert len(ROLE_HIERARCHY) >= 9
        assert len(ROLE_PERMISSIONS) >= 8

    def test_accounting_can_read_billing(self):
        from shared.security import check_permission
        assert check_permission("accounting", "billing.read") is True
        assert check_permission("accounting", "billing.write") is True
        assert check_permission("accounting", "config.write") is False

    def test_revenue_manager_can_access_channel(self):
        from shared.security import check_permission
        assert check_permission("revenue_manager", "channel.read") is True
        assert check_permission("revenue_manager", "channel.write") is True
        assert check_permission("revenue_manager", "staff.write") is False
