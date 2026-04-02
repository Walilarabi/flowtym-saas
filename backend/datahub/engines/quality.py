"""
Flowtym Data Hub - Data Quality Engine
Validates, enriches, and ensures data quality
"""
from typing import Dict, List, Any, Optional, Callable, Tuple
from datetime import datetime, date
from pydantic import BaseModel, ValidationError
import re
import logging
from enum import Enum

logger = logging.getLogger(__name__)


class QualityIssueType(str, Enum):
    MISSING_REQUIRED = "missing_required"
    INVALID_FORMAT = "invalid_format"
    INVALID_VALUE = "invalid_value"
    DUPLICATE = "duplicate"
    INCONSISTENT = "inconsistent"
    OUTDATED = "outdated"
    INCOMPLETE = "incomplete"


class QualitySeverity(str, Enum):
    CRITICAL = "critical"  # Block processing
    ERROR = "error"        # Flag but process
    WARNING = "warning"    # Log only
    INFO = "info"          # Informational


class QualityIssue(BaseModel):
    """A single data quality issue"""
    field: str
    issue_type: QualityIssueType
    severity: QualitySeverity
    message: str
    expected: Optional[Any] = None
    actual: Optional[Any] = None
    suggestion: Optional[Any] = None


class QualityReport(BaseModel):
    """Quality assessment report"""
    entity_type: str
    entity_id: Optional[str] = None
    tenant_id: str
    
    # Score
    quality_score: float  # 0-1
    
    # Issues
    issues: List[QualityIssue]
    critical_count: int = 0
    error_count: int = 0
    warning_count: int = 0
    
    # Flags
    is_valid: bool
    is_complete: bool
    is_enriched: bool
    
    # Enrichment
    enrichments_applied: List[str] = []
    
    # Timestamp
    assessed_at: datetime


class DataQualityEngine:
    """
    Ensures data quality through validation, deduplication, and enrichment.
    
    Features:
    - Field validation (format, range, required)
    - Business rule validation
    - Duplicate detection
    - Data enrichment
    - Quality scoring
    """
    
    def __init__(self, db=None):
        self.db = db
        self.validators: Dict[str, List[Callable]] = {}
        self.enrichers: Dict[str, List[Callable]] = {}
        self.duplicate_threshold = 0.85
        
        # Register default validators
        self._register_default_validators()
    
    def _register_default_validators(self):
        """Register built-in validators"""
        
        # Email validator
        def validate_email(value: Any, field: str) -> Optional[QualityIssue]:
            if value and not re.match(r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$", str(value)):
                return QualityIssue(
                    field=field,
                    issue_type=QualityIssueType.INVALID_FORMAT,
                    severity=QualitySeverity.ERROR,
                    message="Invalid email format",
                    actual=value
                )
            return None
        
        # Phone validator
        def validate_phone(value: Any, field: str) -> Optional[QualityIssue]:
            if value:
                cleaned = re.sub(r"[\s\-\(\)]", "", str(value))
                if not re.match(r"^\+?[0-9]{8,15}$", cleaned):
                    return QualityIssue(
                        field=field,
                        issue_type=QualityIssueType.INVALID_FORMAT,
                        severity=QualitySeverity.WARNING,
                        message="Phone number format may be invalid",
                        actual=value
                    )
            return None
        
        # Date validator
        def validate_date_range(value: Any, field: str) -> Optional[QualityIssue]:
            if isinstance(value, (date, datetime)):
                # Check if date is reasonable (not too far in past or future)
                if isinstance(value, datetime):
                    value = value.date()
                today = date.today()
                if value < date(2000, 1, 1):
                    return QualityIssue(
                        field=field,
                        issue_type=QualityIssueType.INVALID_VALUE,
                        severity=QualitySeverity.WARNING,
                        message="Date seems too far in the past",
                        actual=str(value)
                    )
                if value > date(today.year + 5, 12, 31):
                    return QualityIssue(
                        field=field,
                        issue_type=QualityIssueType.INVALID_VALUE,
                        severity=QualitySeverity.WARNING,
                        message="Date seems too far in the future",
                        actual=str(value)
                    )
            return None
        
        # Amount validator
        def validate_amount(value: Any, field: str) -> Optional[QualityIssue]:
            if value is not None:
                try:
                    amount = float(value)
                    if amount < 0:
                        return QualityIssue(
                            field=field,
                            issue_type=QualityIssueType.INVALID_VALUE,
                            severity=QualitySeverity.ERROR,
                            message="Amount cannot be negative",
                            actual=value
                        )
                except (TypeError, ValueError):
                    return QualityIssue(
                        field=field,
                        issue_type=QualityIssueType.INVALID_FORMAT,
                        severity=QualitySeverity.ERROR,
                        message="Invalid amount format",
                        actual=value
                    )
            return None
        
        # Register validators by field pattern
        self.field_validators = {
            "email": validate_email,
            "phone": validate_phone,
            "mobile": validate_phone,
            "date": validate_date_range,
            "amount": validate_amount,
            "total": validate_amount,
            "price": validate_amount,
            "rate": validate_amount,
        }
    
    def add_validator(self, entity_type: str, validator: Callable):
        """Add custom validator for an entity type"""
        if entity_type not in self.validators:
            self.validators[entity_type] = []
        self.validators[entity_type].append(validator)
    
    def add_enricher(self, entity_type: str, enricher: Callable):
        """Add enricher for an entity type"""
        if entity_type not in self.enrichers:
            self.enrichers[entity_type] = []
        self.enrichers[entity_type].append(enricher)
    
    def validate_field(self, field: str, value: Any) -> List[QualityIssue]:
        """Validate a single field"""
        issues = []
        
        # Find matching validator
        for pattern, validator in self.field_validators.items():
            if pattern in field.lower():
                issue = validator(value, field)
                if issue:
                    issues.append(issue)
        
        return issues
    
    def validate_required_fields(
        self,
        data: Dict[str, Any],
        required_fields: List[str]
    ) -> List[QualityIssue]:
        """Check for missing required fields"""
        issues = []
        
        for field in required_fields:
            value = data.get(field)
            if value is None or value == "" or value == []:
                issues.append(QualityIssue(
                    field=field,
                    issue_type=QualityIssueType.MISSING_REQUIRED,
                    severity=QualitySeverity.CRITICAL,
                    message=f"Required field '{field}' is missing"
                ))
        
        return issues
    
    def validate_entity(
        self,
        data: Dict[str, Any],
        entity_type: str,
        required_fields: Optional[List[str]] = None
    ) -> Tuple[bool, List[QualityIssue]]:
        """
        Validate an entity's data.
        
        Returns:
            Tuple of (is_valid, issues)
        """
        issues = []
        
        # Check required fields
        if required_fields:
            issues.extend(self.validate_required_fields(data, required_fields))
        
        # Validate each field
        for field, value in data.items():
            field_issues = self.validate_field(field, value)
            issues.extend(field_issues)
        
        # Run entity-specific validators
        if entity_type in self.validators:
            for validator in self.validators[entity_type]:
                try:
                    entity_issues = validator(data)
                    if entity_issues:
                        issues.extend(entity_issues)
                except Exception as e:
                    logger.error(f"Validator error: {e}")
        
        # Determine if valid (no critical issues)
        is_valid = not any(i.severity == QualitySeverity.CRITICAL for i in issues)
        
        return is_valid, issues
    
    def enrich_data(
        self,
        data: Dict[str, Any],
        entity_type: str
    ) -> Tuple[Dict[str, Any], List[str]]:
        """
        Enrich data with additional information.
        
        Returns:
            Tuple of (enriched_data, enrichments_applied)
        """
        enriched = data.copy()
        applied = []
        
        # Run entity-specific enrichers
        if entity_type in self.enrichers:
            for enricher in self.enrichers[entity_type]:
                try:
                    result = enricher(enriched)
                    if result:
                        enriched.update(result.get("data", {}))
                        if result.get("applied"):
                            applied.append(result["applied"])
                except Exception as e:
                    logger.error(f"Enricher error: {e}")
        
        # Default enrichments
        
        # Normalize country codes
        if "country" in enriched and enriched["country"]:
            country = enriched["country"]
            if len(country) == 2:
                enriched["country_code"] = country.upper()
            elif len(country) > 2:
                # Try to extract country code
                country_mapping = {
                    "france": "FR", "germany": "DE", "spain": "ES",
                    "italy": "IT", "united kingdom": "GB", "uk": "GB",
                    "united states": "US", "usa": "US"
                }
                mapped = country_mapping.get(country.lower())
                if mapped:
                    enriched["country_code"] = mapped
                    applied.append("country_code_normalized")
        
        # Calculate derived fields for reservations
        if entity_type == "reservation":
            if "check_in_date" in enriched and "check_out_date" in enriched:
                try:
                    check_in = enriched["check_in_date"]
                    check_out = enriched["check_out_date"]
                    if isinstance(check_in, str):
                        check_in = datetime.fromisoformat(check_in).date()
                    if isinstance(check_out, str):
                        check_out = datetime.fromisoformat(check_out).date()
                    nights = (check_out - check_in).days
                    if nights > 0 and "total_nights" not in enriched:
                        enriched["total_nights"] = nights
                        applied.append("nights_calculated")
                except Exception:
                    pass
        
        return enriched, applied
    
    def calculate_quality_score(self, issues: List[QualityIssue]) -> float:
        """Calculate quality score from issues"""
        if not issues:
            return 1.0
        
        # Weights by severity
        weights = {
            QualitySeverity.CRITICAL: 0.5,
            QualitySeverity.ERROR: 0.2,
            QualitySeverity.WARNING: 0.05,
            QualitySeverity.INFO: 0.01
        }
        
        penalty = sum(weights.get(i.severity, 0) for i in issues)
        score = max(0, 1.0 - penalty)
        
        return round(score, 3)
    
    def assess_quality(
        self,
        data: Dict[str, Any],
        entity_type: str,
        tenant_id: str,
        required_fields: Optional[List[str]] = None,
        enrich: bool = True
    ) -> Tuple[Dict[str, Any], QualityReport]:
        """
        Full quality assessment: validate, enrich, and score.
        
        Returns:
            Tuple of (processed_data, quality_report)
        """
        # Validate
        is_valid, issues = self.validate_entity(data, entity_type, required_fields)
        
        # Enrich if requested
        enrichments = []
        if enrich:
            data, enrichments = self.enrich_data(data, entity_type)
        
        # Calculate score
        score = self.calculate_quality_score(issues)
        
        # Count by severity
        critical = sum(1 for i in issues if i.severity == QualitySeverity.CRITICAL)
        errors = sum(1 for i in issues if i.severity == QualitySeverity.ERROR)
        warnings = sum(1 for i in issues if i.severity == QualitySeverity.WARNING)
        
        # Build report
        report = QualityReport(
            entity_type=entity_type,
            entity_id=data.get("id"),
            tenant_id=tenant_id,
            quality_score=score,
            issues=issues,
            critical_count=critical,
            error_count=errors,
            warning_count=warnings,
            is_valid=is_valid,
            is_complete=critical == 0 and errors == 0,
            is_enriched=len(enrichments) > 0,
            enrichments_applied=enrichments,
            assessed_at=datetime.utcnow()
        )
        
        # Add quality metadata to data
        data["quality_score"] = score
        data["validation_errors"] = [i.message for i in issues if i.severity in [QualitySeverity.CRITICAL, QualitySeverity.ERROR]]
        
        return data, report
    
    async def detect_duplicates(
        self,
        entity_type: str,
        data: Dict[str, Any],
        tenant_id: str,
        match_fields: List[str]
    ) -> List[Dict[str, Any]]:
        """
        Detect potential duplicates in database.
        
        Returns list of potential duplicate records.
        """
        if not self.db:
            return []
        
        # Build query for exact matches on key fields
        query = {"tenant_id": tenant_id}
        
        for field in match_fields:
            if field in data and data[field]:
                query[field] = data[field]
        
        # Find potential matches
        collection_name = f"dh_{entity_type}s"
        try:
            matches = await self.db[collection_name].find(query).limit(10).to_list(length=10)
            
            # Calculate similarity scores
            duplicates = []
            for match in matches:
                if str(match.get("_id")) != data.get("id"):
                    similarity = self._calculate_similarity(data, match, match_fields)
                    if similarity >= self.duplicate_threshold:
                        duplicates.append({
                            "id": str(match.get("_id")),
                            "similarity": similarity,
                            "data": match
                        })
            
            return duplicates
        except Exception as e:
            logger.error(f"Duplicate detection error: {e}")
            return []
    
    def _calculate_similarity(
        self,
        data1: Dict[str, Any],
        data2: Dict[str, Any],
        fields: List[str]
    ) -> float:
        """Calculate similarity score between two records"""
        if not fields:
            return 0.0
        
        matches = 0
        total = len(fields)
        
        for field in fields:
            val1 = data1.get(field)
            val2 = data2.get(field)
            
            if val1 is None or val2 is None:
                total -= 1
                continue
            
            if str(val1).lower() == str(val2).lower():
                matches += 1
        
        return matches / total if total > 0 else 0.0


# Create singleton
quality_engine = DataQualityEngine()


def get_quality_engine() -> DataQualityEngine:
    """Get quality engine instance"""
    return quality_engine
