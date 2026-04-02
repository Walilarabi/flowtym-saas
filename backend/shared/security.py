"""
Flowtym — Sécurité RBAC & Isolation par Hôtel (Phase 19)

Ce module fournit :
1. require_hotel_access() : vérifie qu'un utilisateur peut accéder à un hôtel donné
2. require_role() : vérifie le rôle minimum requis
3. require_super_admin() : accès réservé aux super admins
4. require_permission() : vérification granulaire d'une permission
5. AuditLogger : log des accès sensibles en base

Architecture :
- Super Admin  : accès à TOUS les hôtels
- Admin hôtel  : accès à SON hôtel uniquement
- Manager      : accès limité selon permissions du rôle
- Employé      : accès très restreint (lecture seule + son propre profil)
"""

from fastapi import HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Optional, List, Dict, Any, Callable
from datetime import datetime, timezone
from functools import wraps
import jwt
import os
import logging
import uuid

logger = logging.getLogger(__name__)

JWT_SECRET = os.environ.get("JWT_SECRET", "flowtym-secret-key-2024")
JWT_ALGORITHM = "HS256"

security = HTTPBearer()

# ── Hiérarchie des rôles ────────────────────────────────────────────────────
ROLE_HIERARCHY: Dict[str, int] = {
    "super_admin":    100,
    "admin":           80,
    "manager":         60,
    "revenue_manager": 55,
    "reception":       40,
    "receptionist":    40,
    "housekeeping":    30,
    "housekeeper":     25,
    "maintenance":     25,
    "breakfast":       20,
    "spa":             20,
    "restaurant":      20,
    "serveur":         20,
    "readonly":        10,
    "accounting":      35,
    "support":         70,
}

# Rôles autorisés à gérer plusieurs hôtels
MULTI_HOTEL_ROLES = {"super_admin", "support"}

# Permissions granulaires par rôle
ROLE_PERMISSIONS: Dict[str, List[str]] = {
    "super_admin": ["*"],  # Tout
    "admin": [
        "reservations.read", "reservations.write",
        "clients.read", "clients.write",
        "staff.read", "staff.write",
        "housekeeping.read", "housekeeping.write",
        "reports.read", "reports.write",
        "config.read", "config.write",
        "billing.read",
        "channel.read", "channel.write",
        "crm.read", "crm.write",
    ],
    "manager": [
        "reservations.read", "reservations.write",
        "clients.read",
        "staff.read",
        "housekeeping.read", "housekeeping.write",
        "reports.read",
        "channel.read",
        "crm.read",
    ],
    "revenue_manager": [
        "reservations.read",
        "reports.read", "reports.write",
        "channel.read", "channel.write",
        "config.read",
    ],
    "reception": [
        "reservations.read", "reservations.write",
        "clients.read", "clients.write",
        "housekeeping.read",
    ],
    "receptionist": [
        "reservations.read", "reservations.write",
        "clients.read", "clients.write",
        "housekeeping.read",
    ],
    "housekeeping": [
        "housekeeping.read", "housekeeping.write",
        "reservations.read",
    ],
    "housekeeper": [
        "housekeeping.read", "housekeeping.write",
    ],
    "maintenance": [
        "housekeeping.read",
        "maintenance.read", "maintenance.write",
    ],
    "accounting": [
        "reservations.read",
        "billing.read", "billing.write",
        "reports.read",
    ],
    "readonly": [
        "reservations.read",
        "reports.read",
    ],
}


# ── Décodage JWT ─────────────────────────────────────────────────────────────

def decode_token(token: str) -> dict:
    """Décode et valide un JWT Flowtym."""
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expiré")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Token invalide")


async def get_current_user_payload(
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> dict:
    """Dépendance FastAPI : retourne le payload JWT du token courant."""
    return decode_token(credentials.credentials)


# ── Guards de sécurité ───────────────────────────────────────────────────────

def require_hotel_access(
    hotel_id_param: str = "hotel_id",
    allow_super_admin: bool = True,
    allow_multi_hotel_roles: bool = True,
):
    """
    Fabrique une dépendance FastAPI qui vérifie qu'un utilisateur
    a le droit d'accéder au hotel_id passé dans le path.

    Usage dans un endpoint :
        @router.get("/hotels/{hotel_id}/data")
        async def my_route(
            hotel_id: str,
            user=Depends(require_hotel_access())
        ):
    """
    async def _check(
        hotel_id: str,
        credentials: HTTPAuthorizationCredentials = Depends(security),
    ) -> dict:
        payload = decode_token(credentials.credentials)
        role = payload.get("role", "")
        user_hotel_id = payload.get("hotel_id")

        # Super admin : accès global
        if allow_super_admin and role == "super_admin":
            return payload

        # Rôles multi-hôtels (ex: support)
        if allow_multi_hotel_roles and role in MULTI_HOTEL_ROLES:
            return payload

        # Vérification isolation hôtel
        if user_hotel_id != hotel_id:
            logger.warning(
                f"Hotel access denied: user {payload.get('user_id')} "
                f"(hotel={user_hotel_id}) tried to access hotel {hotel_id}"
            )
            raise HTTPException(
                status_code=403,
                detail="Accès refusé : vous n'êtes pas affecté à cet établissement"
            )

        return payload

    return _check


def require_role(minimum_role: str):
    """
    Vérifie que l'utilisateur a le rang minimum requis.

    Usage :
        @router.delete("/hotels/{hotel_id}/rooms/{room_id}")
        async def delete_room(user=Depends(require_role("admin"))):
    """
    min_level = ROLE_HIERARCHY.get(minimum_role, 0)

    async def _check(
        credentials: HTTPAuthorizationCredentials = Depends(security),
    ) -> dict:
        payload = decode_token(credentials.credentials)
        role = payload.get("role", "")
        user_level = ROLE_HIERARCHY.get(role, 0)

        if user_level < min_level:
            raise HTTPException(
                status_code=403,
                detail=f"Rôle insuffisant. Requis : {minimum_role} (niveau {min_level}), vous avez : {role} (niveau {user_level})"
            )

        return payload

    return _check


def require_super_admin():
    """Réservé aux super admins Flowtym."""
    return require_role("super_admin")


def require_permission(permission: str):
    """
    Vérifie une permission granulaire (ex: 'reservations.write').

    Usage :
        @router.post("/hotels/{hotel_id}/reservations")
        async def create_res(user=Depends(require_permission("reservations.write"))):
    """
    async def _check(
        credentials: HTTPAuthorizationCredentials = Depends(security),
    ) -> dict:
        payload = decode_token(credentials.credentials)
        role = payload.get("role", "")

        # Super admin a tout
        if role == "super_admin":
            return payload

        perms = ROLE_PERMISSIONS.get(role, [])

        # Wildcard match
        if "*" in perms:
            return payload

        if permission not in perms:
            raise HTTPException(
                status_code=403,
                detail=f"Permission manquante : {permission}"
            )

        return payload

    return _check


def combined_guard(hotel_id_check: bool = True, minimum_role: Optional[str] = None, permission: Optional[str] = None):
    """
    Guard combiné : isolation hôtel + rôle minimum + permission.
    Pratique pour éviter d'empiler plusieurs Depends().

    Usage :
        @router.put("/hotels/{hotel_id}/config")
        async def update_config(
            hotel_id: str,
            user=Depends(combined_guard(minimum_role="admin", permission="config.write"))
        ):
    """
    min_level = ROLE_HIERARCHY.get(minimum_role, 0) if minimum_role else 0

    async def _check(
        hotel_id: str,
        credentials: HTTPAuthorizationCredentials = Depends(security),
    ) -> dict:
        payload = decode_token(credentials.credentials)
        role = payload.get("role", "")
        user_hotel_id = payload.get("hotel_id")
        user_level = ROLE_HIERARCHY.get(role, 0)

        # Super admin bypass
        if role == "super_admin":
            return payload

        # Isolation hôtel
        if hotel_id_check and role not in MULTI_HOTEL_ROLES:
            if user_hotel_id != hotel_id:
                raise HTTPException(
                    status_code=403,
                    detail="Accès refusé : établissement non autorisé"
                )

        # Niveau de rôle
        if user_level < min_level:
            raise HTTPException(
                status_code=403,
                detail=f"Rôle insuffisant : {role} (niveau {user_level}) < {minimum_role} (niveau {min_level})"
            )

        # Permission granulaire
        if permission:
            perms = ROLE_PERMISSIONS.get(role, [])
            if "*" not in perms and permission not in perms:
                raise HTTPException(
                    status_code=403,
                    detail=f"Permission manquante : {permission}"
                )

        return payload

    return _check


# ── Audit Logger ─────────────────────────────────────────────────────────────

class SecurityAuditLogger:
    """
    Log les accès sensibles en base MongoDB.
    Usage : await audit.log(db, action, user, hotel_id, details)
    """

    @staticmethod
    async def log(
        db,
        action: str,
        user_payload: dict,
        hotel_id: Optional[str] = None,
        resource_type: Optional[str] = None,
        resource_id: Optional[str] = None,
        details: Optional[dict] = None,
        success: bool = True,
    ) -> None:
        try:
            await db.security_audit_logs.insert_one({
                "id": str(uuid.uuid4()),
                "action": action,
                "user_id": user_payload.get("user_id"),
                "user_email": user_payload.get("email"),
                "user_role": user_payload.get("role"),
                "hotel_id": hotel_id or user_payload.get("hotel_id"),
                "resource_type": resource_type,
                "resource_id": resource_id,
                "details": details or {},
                "success": success,
                "timestamp": datetime.now(timezone.utc).isoformat(),
            })
        except Exception as e:
            logger.error(f"Audit log failed: {e}")

    @staticmethod
    async def get_logs(
        db,
        hotel_id: Optional[str] = None,
        user_id: Optional[str] = None,
        action: Optional[str] = None,
        limit: int = 100,
    ) -> list:
        query: dict = {}
        if hotel_id:
            query["hotel_id"] = hotel_id
        if user_id:
            query["user_id"] = user_id
        if action:
            query["action"] = {"$regex": action, "$options": "i"}

        logs = await db.security_audit_logs.find(
            query, {"_id": 0}
        ).sort("timestamp", -1).limit(limit).to_list(limit)

        return logs


audit = SecurityAuditLogger()


# ── Helpers utilitaires ──────────────────────────────────────────────────────

def get_user_permissions(role: str) -> List[str]:
    """Retourne la liste des permissions d'un rôle."""
    if role == "super_admin":
        return ["*"]
    return ROLE_PERMISSIONS.get(role, [])


def check_permission(role: str, permission: str) -> bool:
    """Vérifie si un rôle a une permission sans lever d'exception."""
    perms = ROLE_PERMISSIONS.get(role, [])
    return "*" in perms or permission in perms


def get_role_info(role: str) -> dict:
    """Retourne les infos complètes d'un rôle."""
    return {
        "role": role,
        "level": ROLE_HIERARCHY.get(role, 0),
        "is_multi_hotel": role in MULTI_HOTEL_ROLES,
        "permissions": get_user_permissions(role),
    }
