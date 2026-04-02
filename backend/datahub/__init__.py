"""
Flowtym Data Hub Package

The Data Hub is the central nervous system of the Flowtym ecosystem.
It provides:
- Unified data access across all modules
- Plug-and-play connector system for external integrations
- Data normalization to Universal Data Model
- Event-driven synchronization
- API for internal and external consumers

Phase 1 Features:
- Universal Data Models (Reservation, Guest, Rate, Room)
- 5 Mocked Connectors (Mews, Booking.com, D-EDGE, Stripe, Lighthouse)
- Normalization Engine
- Internal API endpoints

Phase 2 (Upcoming):
- Priority Engine for conflict resolution
- Data Quality Engine
- Event Bus for real-time sync
- Smart caching

Phase 3 (Future):
- External API (Marketplace)
- Billing & Usage tracking
- Sandbox environment
"""

from .routes import router as datahub_router

__all__ = ["datahub_router"]
