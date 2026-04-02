"""
Flowtym Configuration Module

Central configuration hub for hotel management.
Provides APIs for hotel profile, rooms, rate plans, policies, users, and settings.
"""

from .routes import config_router

__all__ = ["config_router"]
