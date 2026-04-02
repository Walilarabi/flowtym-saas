"""
Flowtym Data Hub - Connectors Package

This package contains all connectors for external systems:
- PMS: Mews, Oracle OPERA (planned)
- OTA: Booking.com, Expedia (planned)
- Channel Manager: D-EDGE, SiteMinder (planned)
- Payment: Stripe, Adyen (planned)
- Rate Shopper: Lighthouse

All connectors inherit from BaseConnector and use the ConnectorRegistry
for automatic discovery and instantiation.
"""

from .base import (
    BaseConnector,
    ConnectorRegistry,
    register_connector,
    ConnectorError,
    AuthenticationError,
    RateLimitError,
    SyncError,
)

# Import all connector packages to trigger registration
from .pms import MewsConnector
from .ota import BookingComConnector
from .channel import DEdgeConnector
from .payment import StripeConnector
from .rateshopper import LighthouseConnector


__all__ = [
    # Base
    "BaseConnector",
    "ConnectorRegistry",
    "register_connector",
    "ConnectorError",
    "AuthenticationError",
    "RateLimitError",
    "SyncError",
    
    # Connectors
    "MewsConnector",
    "BookingComConnector",
    "DEdgeConnector",
    "StripeConnector",
    "LighthouseConnector",
]
