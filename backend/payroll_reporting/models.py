"""
Payroll Reporting Models - Pydantic schemas for payroll reports
"""
from pydantic import BaseModel, Field, EmailStr, ConfigDict
from typing import List, Optional, Dict, Any
from datetime import datetime
from enum import Enum


class ReportStatus(str, Enum):
    PENDING = "pending"
    GENERATING = "generating"
    GENERATED = "generated"
    SENT = "sent"
    ERROR = "error"


class EmailStatus(str, Enum):
    PENDING = "pending"
    SENT = "sent"
    FAILED = "failed"


# ===================== CONFIGURATION MODELS =====================

class OvertimeConfig(BaseModel):
    """Configuration des heures supplementaires"""
    threshold_25_percent: float = 8.0  # Heures sup majorees a 25% (jusqu'a ce seuil)
    threshold_50_percent: float = 999.0  # Au-dela, majoration 50%
    night_hours_start: int = 21  # Debut heures de nuit (21h)
    night_hours_end: int = 6  # Fin heures de nuit (6h)
    night_bonus_rate: float = 0.25  # Majoration heures de nuit (25%)


class PayrollReportConfigCreate(BaseModel):
    """Configuration des rapports de paie"""
    accountant_emails: List[EmailStr] = []
    cc_emails: List[EmailStr] = []
    email_subject_template: str = "Rapport de paie - {hotel_name} - {month}/{year}"
    email_body_template: str = "Veuillez trouver ci-joint les rapports de paie pour la periode {month}/{year}."
    auto_send_enabled: bool = False
    auto_send_day: int = 5  # Jour du mois pour envoi auto (5 = le 5 du mois suivant)
    overtime_config: OvertimeConfig = OvertimeConfig()
    include_night_hours: bool = True
    include_holiday_hours: bool = True


class PayrollReportConfigResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    hotel_id: str
    accountant_emails: List[str]
    cc_emails: List[str]
    email_subject_template: str
    email_body_template: str
    auto_send_enabled: bool
    auto_send_day: int
    overtime_config: Dict[str, Any]
    include_night_hours: bool
    include_holiday_hours: bool
    updated_at: str


# ===================== EMPLOYEE PAYROLL DATA =====================

class EmployeePayrollData(BaseModel):
    """Donnees de paie pour un employe"""
    employee_id: str
    employee_name: str
    first_name: str
    last_name: str
    position: str
    department: str
    contract_type: str
    hire_date: Optional[str] = None
    hourly_rate: float
    weekly_hours: float
    
    # Periode
    month: int
    year: int
    days_in_period: int
    
    # Temps de travail
    contractual_hours: float  # Heures contractuelles du mois
    worked_hours: float  # Heures reellement travaillees
    normal_hours: float  # Heures normales
    overtime_25_hours: float  # Heures sup 25%
    overtime_50_hours: float  # Heures sup 50%
    night_hours: float  # Heures de nuit
    holiday_hours: float  # Heures jours feries
    worked_days: int
    
    # Absences
    cp_days: float  # Conges payes
    sick_days: float  # Maladie
    unjustified_absences: float  # Absences non justifiees
    other_absences: float  # Autres absences
    total_absences: float
    
    # Synthese
    total_hours_to_pay: float
    hours_difference: float  # Ecart vs contrat (+ = sup, - = manquantes)
    
    # Notes
    manager_notes: Optional[str] = None


class GlobalPayrollSummary(BaseModel):
    """Resume global entreprise"""
    hotel_id: str
    hotel_name: str
    month: int
    year: int
    days_in_period: int
    
    # Totaux
    total_employees: int
    total_worked_hours: float
    total_normal_hours: float
    total_overtime_25: float
    total_overtime_50: float
    total_night_hours: float
    total_holiday_hours: float
    total_worked_days: int
    
    # Absences totales
    total_cp_days: float
    total_sick_days: float
    total_unjustified: float
    total_other_absences: float
    
    # Par departement
    by_department: Dict[str, Dict[str, float]]
    
    # Liste employes
    employees: List[EmployeePayrollData]


# ===================== REPORT MODELS =====================

class GenerateReportRequest(BaseModel):
    """Requete de generation de rapport"""
    month: int
    year: int
    include_individual_pdfs: bool = True
    include_global_pdf: bool = True
    include_excel: bool = True


class PayrollReportResponse(BaseModel):
    """Reponse d'un rapport genere"""
    model_config = ConfigDict(extra="ignore")
    id: str
    hotel_id: str
    month: int
    year: int
    status: str
    
    # Fichiers generes
    individual_pdfs_count: int = 0
    global_pdf_path: Optional[str] = None
    excel_path: Optional[str] = None
    
    # Metadonnees
    generated_at: Optional[str] = None
    generated_by: Optional[str] = None
    
    # Envoi email
    email_status: Optional[str] = None
    email_sent_at: Optional[str] = None
    email_recipients: List[str] = []
    email_error: Optional[str] = None
    
    created_at: str


class SendReportRequest(BaseModel):
    """Requete d'envoi de rapport"""
    report_id: str
    recipients: List[EmailStr]
    cc: List[EmailStr] = []
    subject: Optional[str] = None
    body: Optional[str] = None


class EmailLogResponse(BaseModel):
    """Log d'envoi email"""
    model_config = ConfigDict(extra="ignore")
    id: str
    hotel_id: str
    report_id: str
    recipients: List[str]
    cc: List[str]
    subject: str
    status: str
    error_message: Optional[str] = None
    sent_at: str
