"""
Flowtym Configuration Module - Users & RBAC Models

These models define user management and role-based access control.
"""
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum
import uuid


class UserRole(str, Enum):
    """Predefined user roles"""
    SUPER_ADMIN = "super_admin"  # Flowtym platform admin
    ADMIN = "admin"  # Hotel administrator - full access
    MANAGER = "manager"  # Hotel manager
    RECEPTION = "reception"  # Front desk
    REVENUE_MANAGER = "revenue_manager"  # RMS access
    HOUSEKEEPING = "housekeeping"  # Housekeeping module
    ACCOUNTING = "accounting"  # Finance/accounting
    READONLY = "readonly"  # View only access
    CUSTOM = "custom"  # Custom permissions


class ModuleAccess(str, Enum):
    """Modules that can be accessed"""
    PMS = "pms"
    RMS = "rms"
    CHANNEL = "channel"
    CRM = "crm"
    BOOKING = "booking"
    HOUSEKEEPING = "housekeeping"
    STAFF = "staff"
    REPORTS = "reports"
    DATAHUB = "datahub"
    CONFIG = "config"


class PermissionLevel(str, Enum):
    """Permission levels for modules"""
    NONE = "none"
    READ = "read"
    WRITE = "write"
    ADMIN = "admin"


class ModulePermission(BaseModel):
    """Permission for a specific module"""
    module: ModuleAccess
    level: PermissionLevel = PermissionLevel.READ
    
    # Granular permissions within module
    can_create: bool = False
    can_edit: bool = False
    can_delete: bool = False
    can_export: bool = False
    can_manage_settings: bool = False


class RoleDefinition(BaseModel):
    """
    Role Definition Model
    
    Defines what each role can access.
    Can be default or custom per hotel.
    """
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    tenant_id: Optional[str] = None  # None = global default role
    
    # Identification
    code: UserRole
    name: str  # Display name
    description: Optional[str] = None
    
    # Permissions
    permissions: List[ModulePermission] = Field(default_factory=list)
    
    # Special flags
    can_manage_users: bool = False
    can_manage_config: bool = False
    can_view_financials: bool = False
    can_export_data: bool = False
    
    # Status
    is_system: bool = False  # System roles can't be deleted
    is_active: bool = True
    
    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class ConfigUser(BaseModel):
    """
    Configuration Module User Model
    
    Represents a user with access to the hotel configuration.
    Different from auth users - this is for hotel staff management.
    """
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    tenant_id: str
    
    # Link to auth system
    auth_user_id: Optional[str] = None  # Link to main users collection
    
    # Identity
    email: str
    first_name: str
    last_name: str
    full_name: Optional[str] = None
    
    # Contact
    phone: Optional[str] = None
    mobile: Optional[str] = None
    
    # Role & Permissions
    role: UserRole = UserRole.RECEPTION
    role_definition_id: Optional[str] = None  # For custom roles
    custom_permissions: List[ModulePermission] = Field(default_factory=list)
    
    # Department
    department: Optional[str] = None  # Reception, Housekeeping, etc.
    job_title: Optional[str] = None
    
    # Access
    hotels: List[str] = Field(default_factory=list)  # For multi-property users
    
    # Status
    is_active: bool = True
    is_locked: bool = False
    locked_reason: Optional[str] = None
    
    # Login tracking
    last_login: Optional[datetime] = None
    login_count: int = 0
    
    # Preferences
    language: str = "fr"
    timezone: str = "Europe/Paris"
    notifications_enabled: bool = True
    
    # Avatar
    avatar_url: Optional[str] = None
    
    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    created_by: Optional[str] = None


class ConfigUserCreate(BaseModel):
    """Schema for creating a config user"""
    email: str
    first_name: str
    last_name: str
    phone: Optional[str] = None
    role: UserRole = UserRole.RECEPTION
    department: Optional[str] = None
    job_title: Optional[str] = None
    hotels: List[str] = Field(default_factory=list)
    language: str = "fr"


class ConfigUserUpdate(BaseModel):
    """Schema for updating a config user"""
    email: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone: Optional[str] = None
    mobile: Optional[str] = None
    role: Optional[UserRole] = None
    role_definition_id: Optional[str] = None
    custom_permissions: Optional[List[ModulePermission]] = None
    department: Optional[str] = None
    job_title: Optional[str] = None
    hotels: Optional[List[str]] = None
    is_active: Optional[bool] = None
    is_locked: Optional[bool] = None
    locked_reason: Optional[str] = None
    language: Optional[str] = None
    timezone: Optional[str] = None
    notifications_enabled: Optional[bool] = None
    avatar_url: Optional[str] = None


# ═══════════════════════════════════════════════════════════════════════════════
# DEFAULT ROLE DEFINITIONS
# ═══════════════════════════════════════════════════════════════════════════════

DEFAULT_ROLES = {
    UserRole.ADMIN: RoleDefinition(
        code=UserRole.ADMIN,
        name="Administrateur",
        description="Accès complet à tous les modules",
        permissions=[
            ModulePermission(module=m, level=PermissionLevel.ADMIN, 
                           can_create=True, can_edit=True, can_delete=True, 
                           can_export=True, can_manage_settings=True)
            for m in ModuleAccess
        ],
        can_manage_users=True,
        can_manage_config=True,
        can_view_financials=True,
        can_export_data=True,
        is_system=True
    ),
    UserRole.RECEPTION: RoleDefinition(
        code=UserRole.RECEPTION,
        name="Réception",
        description="Accès réception et réservations",
        permissions=[
            ModulePermission(module=ModuleAccess.PMS, level=PermissionLevel.WRITE, can_create=True, can_edit=True),
            ModulePermission(module=ModuleAccess.CRM, level=PermissionLevel.READ),
            ModulePermission(module=ModuleAccess.BOOKING, level=PermissionLevel.WRITE, can_create=True, can_edit=True),
        ],
        can_manage_users=False,
        can_manage_config=False,
        can_view_financials=False,
        is_system=True
    ),
    UserRole.REVENUE_MANAGER: RoleDefinition(
        code=UserRole.REVENUE_MANAGER,
        name="Revenue Manager",
        description="Accès RMS, tarifs et distribution",
        permissions=[
            ModulePermission(module=ModuleAccess.RMS, level=PermissionLevel.ADMIN, can_create=True, can_edit=True, can_manage_settings=True),
            ModulePermission(module=ModuleAccess.CHANNEL, level=PermissionLevel.WRITE, can_create=True, can_edit=True),
            ModulePermission(module=ModuleAccess.REPORTS, level=PermissionLevel.READ, can_export=True),
            ModulePermission(module=ModuleAccess.DATAHUB, level=PermissionLevel.READ),
        ],
        can_view_financials=True,
        can_export_data=True,
        is_system=True
    ),
    UserRole.HOUSEKEEPING: RoleDefinition(
        code=UserRole.HOUSEKEEPING,
        name="Housekeeping",
        description="Accès gestion des chambres",
        permissions=[
            ModulePermission(module=ModuleAccess.HOUSEKEEPING, level=PermissionLevel.WRITE, can_edit=True),
            ModulePermission(module=ModuleAccess.PMS, level=PermissionLevel.READ),
        ],
        is_system=True
    ),
    UserRole.ACCOUNTING: RoleDefinition(
        code=UserRole.ACCOUNTING,
        name="Comptabilité",
        description="Accès rapports financiers",
        permissions=[
            ModulePermission(module=ModuleAccess.REPORTS, level=PermissionLevel.READ, can_export=True),
            ModulePermission(module=ModuleAccess.PMS, level=PermissionLevel.READ),
        ],
        can_view_financials=True,
        can_export_data=True,
        is_system=True
    ),
    UserRole.READONLY: RoleDefinition(
        code=UserRole.READONLY,
        name="Lecture seule",
        description="Consultation uniquement",
        permissions=[
            ModulePermission(module=m, level=PermissionLevel.READ)
            for m in [ModuleAccess.PMS, ModuleAccess.REPORTS]
        ],
        is_system=True
    ),
}
