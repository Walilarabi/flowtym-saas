"""
Flowtym Configuration Module - Validation Service

Provides validation logic for configuration data.
"""
from typing import List, Dict, Any, Optional, Tuple
import re


class ValidationService:
    """Service for validating configuration data"""
    
    @staticmethod
    def validate_room_number(room_number: str) -> Tuple[bool, Optional[str]]:
        """
        Validate room number format.
        Accepts formats like: 101, 201A, P-01, 3-105
        """
        if not room_number:
            return False, "Le numéro de chambre est requis"
        
        # Allow alphanumeric with optional dashes
        pattern = r'^[A-Za-z0-9\-]{1,10}$'
        if not re.match(pattern, room_number):
            return False, f"Format de numéro invalide: {room_number}"
        
        return True, None
    
    @staticmethod
    def validate_room_type_code(code: str) -> Tuple[bool, Optional[str]]:
        """
        Validate room type code format.
        Codes should be uppercase alphanumeric, 2-10 chars.
        """
        if not code:
            return False, "Le code de type de chambre est requis"
        
        pattern = r'^[A-Z0-9_]{2,10}$'
        if not re.match(pattern, code.upper()):
            return False, f"Format de code invalide: {code}. Utilisez 2-10 caractères alphanumériques."
        
        return True, None
    
    @staticmethod
    def validate_rate_plan_code(code: str) -> Tuple[bool, Optional[str]]:
        """Validate rate plan code format."""
        if not code:
            return False, "Le code du plan tarifaire est requis"
        
        pattern = r'^[A-Z0-9_]{2,15}$'
        if not re.match(pattern, code.upper()):
            return False, f"Format de code invalide: {code}"
        
        return True, None
    
    @staticmethod
    def validate_email(email: str) -> Tuple[bool, Optional[str]]:
        """Validate email format."""
        if not email:
            return True, None  # Email can be optional
        
        pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        if not re.match(pattern, email):
            return False, f"Format d'email invalide: {email}"
        
        return True, None
    
    @staticmethod
    def validate_phone(phone: str) -> Tuple[bool, Optional[str]]:
        """Validate phone number format."""
        if not phone:
            return True, None  # Phone can be optional
        
        # Remove common separators for validation
        cleaned = re.sub(r'[\s\-\.]', '', phone)
        
        # Allow international format
        pattern = r'^\+?[0-9]{8,15}$'
        if not re.match(pattern, cleaned):
            return False, f"Format de téléphone invalide: {phone}"
        
        return True, None
    
    @staticmethod
    def validate_time_format(time_str: str) -> Tuple[bool, Optional[str]]:
        """Validate time format (HH:MM)."""
        if not time_str:
            return False, "L'heure est requise"
        
        pattern = r'^([01]?[0-9]|2[0-3]):[0-5][0-9]$'
        if not re.match(pattern, time_str):
            return False, f"Format d'heure invalide: {time_str}. Utilisez HH:MM."
        
        return True, None
    
    @staticmethod
    def validate_price(price: float, field_name: str = "prix") -> Tuple[bool, Optional[str]]:
        """Validate price value."""
        if price is None:
            return False, f"Le {field_name} est requis"
        
        if price < 0:
            return False, f"Le {field_name} ne peut pas être négatif"
        
        if price > 99999:
            return False, f"Le {field_name} semble trop élevé"
        
        return True, None
    
    @staticmethod
    def validate_floor(floor: int) -> Tuple[bool, Optional[str]]:
        """Validate floor number."""
        if floor is None:
            return True, None  # Default will be applied
        
        if floor < -5 or floor > 200:
            return False, f"Numéro d'étage invalide: {floor}"
        
        return True, None
    
    @staticmethod
    def validate_occupancy(occupancy: int, field_name: str = "capacité") -> Tuple[bool, Optional[str]]:
        """Validate occupancy value."""
        if occupancy is None:
            return True, None
        
        if occupancy < 1:
            return False, f"La {field_name} doit être au moins 1"
        
        if occupancy > 20:
            return False, f"La {field_name} semble trop élevée: {occupancy}"
        
        return True, None
    
    @staticmethod
    def validate_percentage(value: float, field_name: str = "pourcentage") -> Tuple[bool, Optional[str]]:
        """Validate percentage value (0-100)."""
        if value is None:
            return True, None
        
        if value < 0 or value > 100:
            return False, f"Le {field_name} doit être entre 0 et 100"
        
        return True, None
    
    @staticmethod
    def validate_batch(
        items: List[Dict[str, Any]],
        validators: Dict[str, callable]
    ) -> Tuple[List[Dict], List[Dict]]:
        """
        Validate a batch of items.
        Returns (valid_items, errors).
        """
        valid_items = []
        errors = []
        
        for idx, item in enumerate(items):
            item_errors = []
            
            for field, validator in validators.items():
                if field in item:
                    is_valid, error = validator(item[field])
                    if not is_valid:
                        item_errors.append({
                            "field": field,
                            "value": item.get(field),
                            "error": error
                        })
            
            if item_errors:
                errors.append({
                    "row": idx + 1,
                    "data": item,
                    "errors": item_errors
                })
            else:
                valid_items.append(item)
        
        return valid_items, errors
