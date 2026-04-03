"""
Flowtym Test Configuration
Configure sys.path so test modules can import backend packages directly.
"""
import sys
import os

# Add backend directory to path for direct module imports
BACKEND_DIR = os.path.join(os.path.dirname(__file__), '..')
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)
