"""
Payroll Reporting Routes - API endpoints for payroll report generation
"""
import uuid
import base64
import logging
import calendar
from datetime import datetime, timezone
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, HTTPException, Depends, Response
from motor.motor_asyncio import AsyncIOMotorClient
import os

from .models import (
    PayrollReportConfigCreate, PayrollReportConfigResponse,
    GenerateReportRequest, PayrollReportResponse, SendReportRequest,
    EmployeePayrollData, GlobalPayrollSummary, EmailLogResponse,
    OvertimeConfig
)
from .pdf_generator import PayrollPDFGenerator
from .excel_generator import PayrollExcelGenerator
from .email_service import send_payroll_email

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/payroll-reports", tags=["Payroll Reports"])

# Database connection (will be set by main app)
db = None

def set_database(database):
    global db
    db = database


# ===================== HELPER FUNCTIONS =====================

def calculate_days_in_month(year: int, month: int) -> int:
    """Calcule le nombre de jours dans un mois"""
    return calendar.monthrange(year, month)[1]


def calculate_contractual_hours(weekly_hours: float, days_in_month: int) -> float:
    """Calcule les heures contractuelles pour le mois"""
    # Moyenne de semaines dans un mois: jours / 7
    weeks_in_month = days_in_month / 7
    return round(weekly_hours * weeks_in_month, 2)


def calculate_overtime_split(
    total_overtime: float,
    threshold_25: float = 8.0
) -> tuple:
    """
    Repartit les heures supplementaires entre 25% et 50%
    
    Args:
        total_overtime: Total des heures supplementaires
        threshold_25: Seuil pour les heures a 25% (par defaut 8h)
    
    Returns:
        tuple (overtime_25, overtime_50)
    """
    if total_overtime <= 0:
        return (0.0, 0.0)
    
    if total_overtime <= threshold_25:
        return (total_overtime, 0.0)
    else:
        return (threshold_25, total_overtime - threshold_25)


async def compute_employee_payroll_data(
    employee: dict,
    hotel_id: str,
    month: int,
    year: int,
    config: dict
) -> EmployeePayrollData:
    """
    Calcule toutes les donnees de paie pour un employe
    """
    # Dates de la periode
    start_date = f"{year}-{str(month).zfill(2)}-01"
    if month == 12:
        end_date = f"{year + 1}-01-01"
    else:
        end_date = f"{year}-{str(month + 1).zfill(2)}-01"
    
    days_in_month = calculate_days_in_month(year, month)
    
    # Recuperer les shifts de l'employe
    shifts = await db.staff_shifts.find({
        "hotel_id": hotel_id,
        "employee_id": employee["id"],
        "date": {"$gte": start_date, "$lt": end_date}
    }, {"_id": 0}).to_list(100)
    
    # Recuperer les conges approuves
    leaves = await db.leave_requests.find({
        "hotel_id": hotel_id,
        "employee_id": employee["id"],
        "status": "approved",
        "date_start": {"$lte": end_date},
        "date_end": {"$gte": start_date}
    }, {"_id": 0}).to_list(50)
    
    # Calculer les heures travaillees
    total_worked_hours = sum(s.get("worked_hours", 0) for s in shifts)
    total_overtime = sum(s.get("overtime_hours", 0) for s in shifts)
    night_hours = sum(s.get("night_hours", 0) for s in shifts)
    holiday_hours = sum(s.get("holiday_hours", 0) for s in shifts if s.get("is_holiday", False))
    worked_days = len([s for s in shifts if s.get("worked_hours", 0) > 0])
    
    # Repartition heures sup 25%/50%
    overtime_config = config.get("overtime_config", {})
    threshold_25 = overtime_config.get("threshold_25_percent", 8.0)
    overtime_25, overtime_50 = calculate_overtime_split(total_overtime, threshold_25)
    
    # Heures normales = total - overtime
    normal_hours = max(0, total_worked_hours - total_overtime)
    
    # Calculer les absences par type
    cp_days = 0.0
    sick_days = 0.0
    unjustified_days = 0.0
    other_absences = 0.0
    
    for leave in leaves:
        leave_type = leave.get("leave_type", "")
        days = leave.get("days_count", 0)
        
        if leave_type == "cp":
            cp_days += days
        elif leave_type == "maladie":
            sick_days += days
        elif leave_type == "absence_injustifiee":
            unjustified_days += days
        else:
            other_absences += days
    
    total_absences = cp_days + sick_days + unjustified_days + other_absences
    
    # Heures contractuelles
    weekly_hours = employee.get("weekly_hours", 35.0)
    contractual_hours = calculate_contractual_hours(weekly_hours, days_in_month)
    
    # Total heures a payer (normales + sup)
    total_hours_to_pay = normal_hours + overtime_25 + overtime_50 + night_hours + holiday_hours
    
    # Ecart vs contrat
    hours_difference = total_worked_hours - contractual_hours
    
    return EmployeePayrollData(
        employee_id=employee["id"],
        employee_name=f"{employee['first_name']} {employee['last_name']}",
        first_name=employee["first_name"],
        last_name=employee["last_name"],
        position=employee.get("position", ""),
        department=employee.get("department", ""),
        contract_type=employee.get("contract_type", "cdi"),
        hire_date=employee.get("hire_date"),
        hourly_rate=employee.get("hourly_rate", 11.65),
        weekly_hours=weekly_hours,
        month=month,
        year=year,
        days_in_period=days_in_month,
        contractual_hours=contractual_hours,
        worked_hours=round(total_worked_hours, 2),
        normal_hours=round(normal_hours, 2),
        overtime_25_hours=round(overtime_25, 2),
        overtime_50_hours=round(overtime_50, 2),
        night_hours=round(night_hours, 2),
        holiday_hours=round(holiday_hours, 2),
        worked_days=worked_days,
        cp_days=round(cp_days, 1),
        sick_days=round(sick_days, 1),
        unjustified_absences=round(unjustified_days, 1),
        other_absences=round(other_absences, 1),
        total_absences=round(total_absences, 1),
        total_hours_to_pay=round(total_hours_to_pay, 2),
        hours_difference=round(hours_difference, 2)
    )


async def compute_global_summary(
    employees_data: List[EmployeePayrollData],
    hotel_name: str,
    hotel_id: str,
    month: int,
    year: int
) -> GlobalPayrollSummary:
    """
    Calcule le resume global pour tous les employes
    """
    days_in_month = calculate_days_in_month(year, month)
    
    # Totaux
    total_worked_hours = sum(e.worked_hours for e in employees_data)
    total_normal_hours = sum(e.normal_hours for e in employees_data)
    total_overtime_25 = sum(e.overtime_25_hours for e in employees_data)
    total_overtime_50 = sum(e.overtime_50_hours for e in employees_data)
    total_night_hours = sum(e.night_hours for e in employees_data)
    total_holiday_hours = sum(e.holiday_hours for e in employees_data)
    total_worked_days = sum(e.worked_days for e in employees_data)
    
    total_cp_days = sum(e.cp_days for e in employees_data)
    total_sick_days = sum(e.sick_days for e in employees_data)
    total_unjustified = sum(e.unjustified_absences for e in employees_data)
    total_other_absences = sum(e.other_absences for e in employees_data)
    
    # Par departement
    by_department: Dict[str, Dict[str, float]] = {}
    for emp in employees_data:
        dept = emp.department or "Autre"
        if dept not in by_department:
            by_department[dept] = {"hours": 0, "overtime": 0, "count": 0}
        by_department[dept]["hours"] += emp.worked_hours
        by_department[dept]["overtime"] += emp.overtime_25_hours + emp.overtime_50_hours
        by_department[dept]["count"] += 1
    
    return GlobalPayrollSummary(
        hotel_id=hotel_id,
        hotel_name=hotel_name,
        month=month,
        year=year,
        days_in_period=days_in_month,
        total_employees=len(employees_data),
        total_worked_hours=round(total_worked_hours, 2),
        total_normal_hours=round(total_normal_hours, 2),
        total_overtime_25=round(total_overtime_25, 2),
        total_overtime_50=round(total_overtime_50, 2),
        total_night_hours=round(total_night_hours, 2),
        total_holiday_hours=round(total_holiday_hours, 2),
        total_worked_days=total_worked_days,
        total_cp_days=round(total_cp_days, 1),
        total_sick_days=round(total_sick_days, 1),
        total_unjustified=round(total_unjustified, 1),
        total_other_absences=round(total_other_absences, 1),
        by_department=by_department,
        employees=employees_data
    )


# ===================== CONFIGURATION ENDPOINTS =====================

@router.get("/{hotel_id}/config", response_model=PayrollReportConfigResponse)
async def get_payroll_config(hotel_id: str):
    """Recuperer la configuration des rapports de paie"""
    config = await db.payroll_report_config.find_one({"hotel_id": hotel_id}, {"_id": 0})
    
    if not config:
        now = datetime.now(timezone.utc).isoformat()
        config = {
            "id": str(uuid.uuid4()),
            "hotel_id": hotel_id,
            "accountant_emails": [],
            "cc_emails": [],
            "email_subject_template": "Rapport de paie - {hotel_name} - {month}/{year}",
            "email_body_template": "Bonjour,\n\nVeuillez trouver ci-joint les rapports de paie pour la periode {month}/{year}.\n\nCordialement,\nL'equipe {hotel_name}",
            "auto_send_enabled": False,
            "auto_send_day": 5,
            "overtime_config": OvertimeConfig().model_dump(),
            "include_night_hours": True,
            "include_holiday_hours": True,
            "updated_at": now
        }
        await db.payroll_report_config.insert_one(config)
    
    return PayrollReportConfigResponse(**config)


@router.put("/{hotel_id}/config", response_model=PayrollReportConfigResponse)
async def update_payroll_config(hotel_id: str, config_update: PayrollReportConfigCreate):
    """Mettre a jour la configuration des rapports de paie"""
    now = datetime.now(timezone.utc).isoformat()
    
    update_data = config_update.model_dump()
    update_data["overtime_config"] = config_update.overtime_config.model_dump()
    update_data["updated_at"] = now
    
    await db.payroll_report_config.update_one(
        {"hotel_id": hotel_id},
        {"$set": update_data},
        upsert=True
    )
    
    config = await db.payroll_report_config.find_one({"hotel_id": hotel_id}, {"_id": 0})
    return PayrollReportConfigResponse(**config)


# ===================== REPORT GENERATION ENDPOINTS =====================

@router.post("/{hotel_id}/generate", response_model=PayrollReportResponse)
async def generate_payroll_reports(hotel_id: str, request: GenerateReportRequest):
    """
    Generer les rapports de paie pour un mois donne.
    Cree les PDFs individuels, le PDF global et le fichier Excel.
    """
    now = datetime.now(timezone.utc).isoformat()
    report_id = str(uuid.uuid4())
    
    # Recuperer l'hotel
    hotel = await db.hotels.find_one({"id": hotel_id}, {"_id": 0})
    if not hotel:
        raise HTTPException(status_code=404, detail="Hotel non trouve")
    
    hotel_name = hotel.get("name", "Hotel")
    
    # Recuperer la config
    config = await db.payroll_report_config.find_one({"hotel_id": hotel_id}, {"_id": 0})
    if not config:
        config = {"overtime_config": OvertimeConfig().model_dump()}
    
    # Recuperer les employes actifs
    employees = await db.staff_employees.find(
        {"hotel_id": hotel_id, "is_active": True},
        {"_id": 0}
    ).to_list(500)
    
    if not employees:
        raise HTTPException(status_code=400, detail="Aucun employe actif trouve")
    
    # Calculer les donnees de paie pour chaque employe
    employees_data = []
    for emp in employees:
        emp_data = await compute_employee_payroll_data(
            emp, hotel_id, request.month, request.year, config
        )
        employees_data.append(emp_data)
    
    # Calculer le resume global
    summary = await compute_global_summary(
        employees_data, hotel_name, hotel_id, request.month, request.year
    )
    
    # Generer les fichiers
    pdf_generator = PayrollPDFGenerator(hotel_name)
    excel_generator = PayrollExcelGenerator(hotel_name)
    
    # PDFs individuels
    individual_pdfs = []
    if request.include_individual_pdfs:
        for emp_data in employees_data:
            pdf_content = pdf_generator.generate_employee_pdf(emp_data)
            individual_pdfs.append({
                "employee_id": emp_data.employee_id,
                "employee_name": emp_data.employee_name,
                "filename": f"fiche_paie_{emp_data.last_name}_{emp_data.first_name}_{request.month:02d}_{request.year}.pdf",
                "content": base64.b64encode(pdf_content).decode()
            })
    
    # PDF global
    global_pdf = None
    if request.include_global_pdf:
        global_pdf_content = pdf_generator.generate_global_pdf(summary)
        global_pdf = {
            "filename": f"recapitulatif_paie_{request.month:02d}_{request.year}.pdf",
            "content": base64.b64encode(global_pdf_content).decode()
        }
    
    # Excel
    excel_file = None
    if request.include_excel:
        excel_content = excel_generator.generate_excel(summary)
        excel_file = {
            "filename": f"variables_paie_{request.month:02d}_{request.year}.xlsx",
            "content": base64.b64encode(excel_content).decode()
        }
    
    # CSV supplementaire
    csv_content = excel_generator.generate_csv(summary)
    csv_file = {
        "filename": f"variables_paie_{request.month:02d}_{request.year}.csv",
        "content": base64.b64encode(csv_content.encode('utf-8-sig')).decode()
    }
    
    # Sauvegarder le rapport en base
    report_doc = {
        "id": report_id,
        "hotel_id": hotel_id,
        "month": request.month,
        "year": request.year,
        "status": "generated",
        "individual_pdfs_count": len(individual_pdfs),
        "individual_pdfs": individual_pdfs,
        "global_pdf": global_pdf,
        "excel_file": excel_file,
        "csv_file": csv_file,
        "summary": summary.model_dump(),
        "generated_at": now,
        "generated_by": None,
        "email_status": None,
        "email_sent_at": None,
        "email_recipients": [],
        "email_error": None,
        "created_at": now
    }
    
    await db.payroll_reports.insert_one(report_doc)
    
    logger.info(f"Rapport de paie genere: {report_id} pour {hotel_name} - {request.month}/{request.year}")
    
    return PayrollReportResponse(
        id=report_id,
        hotel_id=hotel_id,
        month=request.month,
        year=request.year,
        status="generated",
        individual_pdfs_count=len(individual_pdfs),
        global_pdf_path=global_pdf["filename"] if global_pdf else None,
        excel_path=excel_file["filename"] if excel_file else None,
        generated_at=now,
        created_at=now
    )


@router.get("/{hotel_id}/reports", response_model=List[PayrollReportResponse])
async def list_payroll_reports(hotel_id: str, year: Optional[int] = None):
    """Lister les rapports de paie generes"""
    query = {"hotel_id": hotel_id}
    if year:
        query["year"] = year
    
    reports = await db.payroll_reports.find(query, {"_id": 0, "individual_pdfs": 0, "global_pdf": 0, "excel_file": 0, "csv_file": 0, "summary": 0}).sort("created_at", -1).to_list(100)
    
    return [PayrollReportResponse(**r) for r in reports]


@router.get("/{hotel_id}/reports/{report_id}")
async def get_payroll_report(hotel_id: str, report_id: str):
    """Recuperer un rapport de paie avec ses fichiers"""
    report = await db.payroll_reports.find_one(
        {"id": report_id, "hotel_id": hotel_id},
        {"_id": 0}
    )
    
    if not report:
        raise HTTPException(status_code=404, detail="Rapport non trouve")
    
    return report


@router.get("/{hotel_id}/reports/{report_id}/download/{file_type}")
async def download_report_file(hotel_id: str, report_id: str, file_type: str):
    """
    Telecharger un fichier du rapport
    file_type: global_pdf, excel, csv, ou employee_pdf_{employee_id}
    """
    report = await db.payroll_reports.find_one(
        {"id": report_id, "hotel_id": hotel_id},
        {"_id": 0}
    )
    
    if not report:
        raise HTTPException(status_code=404, detail="Rapport non trouve")
    
    if file_type == "global_pdf":
        if not report.get("global_pdf"):
            raise HTTPException(status_code=404, detail="PDF global non disponible")
        content = base64.b64decode(report["global_pdf"]["content"])
        filename = report["global_pdf"]["filename"]
        media_type = "application/pdf"
        
    elif file_type == "excel":
        if not report.get("excel_file"):
            raise HTTPException(status_code=404, detail="Fichier Excel non disponible")
        content = base64.b64decode(report["excel_file"]["content"])
        filename = report["excel_file"]["filename"]
        media_type = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        
    elif file_type == "csv":
        if not report.get("csv_file"):
            raise HTTPException(status_code=404, detail="Fichier CSV non disponible")
        content = base64.b64decode(report["csv_file"]["content"])
        filename = report["csv_file"]["filename"]
        media_type = "text/csv"
        
    elif file_type.startswith("employee_pdf_"):
        employee_id = file_type.replace("employee_pdf_", "")
        pdfs = report.get("individual_pdfs", [])
        pdf_found = next((p for p in pdfs if p["employee_id"] == employee_id), None)
        if not pdf_found:
            raise HTTPException(status_code=404, detail="PDF employe non trouve")
        content = base64.b64decode(pdf_found["content"])
        filename = pdf_found["filename"]
        media_type = "application/pdf"
    else:
        raise HTTPException(status_code=400, detail="Type de fichier invalide")
    
    return Response(
        content=content,
        media_type=media_type,
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


# ===================== EMAIL ENDPOINTS =====================

@router.post("/{hotel_id}/reports/{report_id}/send")
async def send_payroll_report_email(hotel_id: str, report_id: str, request: SendReportRequest):
    """
    Envoyer le rapport de paie par email au comptable.
    ATTENTION: Actuellement en mode MOCK (simulation d'envoi)
    """
    # Validation des destinataires
    if not request.recipients or len(request.recipients) == 0:
        raise HTTPException(status_code=400, detail="Au moins un destinataire est requis")
    
    now = datetime.now(timezone.utc).isoformat()
    
    # Recuperer le rapport
    report = await db.payroll_reports.find_one(
        {"id": report_id, "hotel_id": hotel_id},
        {"_id": 0}
    )
    
    if not report:
        raise HTTPException(status_code=404, detail="Rapport non trouve")
    
    if report.get("status") != "generated":
        raise HTTPException(status_code=400, detail="Le rapport doit etre genere avant l'envoi")
    
    # Recuperer l'hotel et la config
    hotel = await db.hotels.find_one({"id": hotel_id}, {"_id": 0})
    config = await db.payroll_report_config.find_one({"hotel_id": hotel_id}, {"_id": 0})
    
    hotel_name = hotel.get("name", "Hotel") if hotel else "Hotel"
    month = report["month"]
    year = report["year"]
    
    # Preparer le sujet et le corps
    subject = request.subject or config.get("email_subject_template", "Rapport de paie - {hotel_name} - {month}/{year}")
    subject = subject.format(hotel_name=hotel_name, month=f"{month:02d}", year=year)
    
    body = request.body or config.get("email_body_template", "Veuillez trouver ci-joint les rapports de paie.")
    body = body.format(hotel_name=hotel_name, month=f"{month:02d}", year=year)
    
    # Preparer les pieces jointes
    attachments = []
    
    if report.get("global_pdf"):
        attachments.append({
            "filename": report["global_pdf"]["filename"],
            "content": base64.b64decode(report["global_pdf"]["content"]),
            "type": "application/pdf"
        })
    
    if report.get("excel_file"):
        attachments.append({
            "filename": report["excel_file"]["filename"],
            "content": base64.b64decode(report["excel_file"]["content"]),
            "type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        })
    
    # Envoyer l'email (MOCK)
    email_result = await send_payroll_email(
        recipients=request.recipients,
        cc=request.cc,
        subject=subject,
        body=body,
        attachments=attachments
    )
    
    # Log l'envoi
    email_log = {
        "id": str(uuid.uuid4()),
        "hotel_id": hotel_id,
        "report_id": report_id,
        "recipients": request.recipients,
        "cc": request.cc,
        "subject": subject,
        "status": "sent" if email_result["success"] else "failed",
        "error_message": email_result.get("error"),
        "is_mocked": email_result.get("is_mocked", True),
        "sent_at": now
    }
    await db.payroll_email_logs.insert_one(email_log)
    
    # Mettre a jour le rapport
    await db.payroll_reports.update_one(
        {"id": report_id},
        {"$set": {
            "email_status": "sent" if email_result["success"] else "failed",
            "email_sent_at": now,
            "email_recipients": request.recipients,
            "email_error": email_result.get("error")
        }}
    )
    
    return {
        "success": email_result["success"],
        "message": "Email envoye avec succes (MODE SIMULATION)" if email_result["success"] else "Erreur lors de l'envoi",
        "is_mocked": True,
        "recipients": request.recipients,
        "attachments_count": len(attachments),
        "note": "Pour activer l'envoi reel d'emails, configurez une cle API (Resend, SendGrid, etc.)"
    }


@router.get("/{hotel_id}/email-logs", response_model=List[EmailLogResponse])
async def get_email_logs(hotel_id: str, limit: int = 20):
    """Recuperer l'historique des envois d'emails"""
    logs = await db.payroll_email_logs.find(
        {"hotel_id": hotel_id},
        {"_id": 0}
    ).sort("sent_at", -1).to_list(limit)
    
    return [EmailLogResponse(**log) for log in logs]


# ===================== PREVIEW ENDPOINT =====================

@router.get("/{hotel_id}/preview")
async def preview_payroll_data(hotel_id: str, month: int, year: int):
    """
    Previsualiser les donnees de paie sans generer les fichiers.
    Utile pour verifier les donnees avant generation.
    """
    # Recuperer l'hotel
    hotel = await db.hotels.find_one({"id": hotel_id}, {"_id": 0})
    if not hotel:
        raise HTTPException(status_code=404, detail="Hotel non trouve")
    
    hotel_name = hotel.get("name", "Hotel")
    
    # Recuperer la config
    config = await db.payroll_report_config.find_one({"hotel_id": hotel_id}, {"_id": 0})
    if not config:
        config = {"overtime_config": OvertimeConfig().model_dump()}
    
    # Recuperer les employes actifs
    employees = await db.staff_employees.find(
        {"hotel_id": hotel_id, "is_active": True},
        {"_id": 0}
    ).to_list(500)
    
    if not employees:
        return {
            "hotel_name": hotel_name,
            "month": month,
            "year": year,
            "employees_count": 0,
            "message": "Aucun employe actif trouve"
        }
    
    # Calculer les donnees de paie pour chaque employe
    employees_data = []
    for emp in employees:
        emp_data = await compute_employee_payroll_data(
            emp, hotel_id, month, year, config
        )
        employees_data.append(emp_data)
    
    # Calculer le resume global
    summary = await compute_global_summary(
        employees_data, hotel_name, hotel_id, month, year
    )
    
    return {
        "hotel_name": hotel_name,
        "month": month,
        "year": year,
        "days_in_period": summary.days_in_period,
        "total_employees": summary.total_employees,
        "summary": {
            "total_worked_hours": summary.total_worked_hours,
            "total_normal_hours": summary.total_normal_hours,
            "total_overtime_25": summary.total_overtime_25,
            "total_overtime_50": summary.total_overtime_50,
            "total_night_hours": summary.total_night_hours,
            "total_cp_days": summary.total_cp_days,
            "total_sick_days": summary.total_sick_days
        },
        "by_department": summary.by_department,
        "employees": [e.model_dump() for e in employees_data]
    }


# ═══════════════════════════════════════════════════════════════════════════════
# EXPORT VERS LOGICIELS DE PAIE
# Phase 14 - Flowtym
# ═══════════════════════════════════════════════════════════════════════════════

from .payroll_software_export import PayrollSoftwareExporter

@router.get("/{hotel_id}/software-list")
async def get_supported_software():
    """
    Retourne la liste des logiciels de paie supportés pour l'export.
    """
    return {
        "softwares": PayrollSoftwareExporter.get_software_info()
    }


@router.get("/{hotel_id}/export-software/{software}")
async def export_payroll_for_software(
    hotel_id: str,
    software: str,
    month: int,
    year: int,
):
    """
    Génère et télécharge un fichier de variables de paie au format du logiciel demandé.
    
    software: sage | silae | cegid | adp | dsn
    """
    SUPPORTED = ["sage", "silae", "cegid", "adp", "dsn"]
    if software not in SUPPORTED:
        raise HTTPException(
            status_code=400,
            detail=f"Logiciel non supporté. Valeurs acceptées: {', '.join(SUPPORTED)}"
        )

    # Récupérer le nom de l'hôtel
    hotel = await db.hotels.find_one({"id": hotel_id}, {"_id": 0, "name": 1})
    hotel_name = hotel["name"] if hotel else "Hotel"

    # Récupérer la config des heures sup
    config = await db.payroll_report_config.find_one({"hotel_id": hotel_id}, {"_id": 0})
    if not config:
        config = {"overtime_config": OvertimeConfig().model_dump()}

    # Récupérer les employés actifs
    employees = await db.staff_employees.find(
        {"hotel_id": hotel_id, "is_active": True},
        {"_id": 0}
    ).to_list(500)

    if not employees:
        raise HTTPException(
            status_code=404,
            detail="Aucun employé actif trouvé pour cet hôtel"
        )

    # Calculer les données de paie
    employees_data = []
    for emp in employees:
        emp_data = await compute_employee_payroll_data(
            emp, hotel_id, month, year, config
        )
        employees_data.append(emp_data)

    # Générer le résumé global
    summary = await compute_global_summary(
        employees_data, hotel_name, hotel_id, month, year
    )

    # Générer le fichier selon le logiciel
    exporter = PayrollSoftwareExporter(summary, hotel_name)

    if software == "sage":
        content = exporter.generate_sage()
        media_type = "text/csv"
        filename = f"sage_paie_{str(month).zfill(2)}_{year}.csv"
    elif software == "silae":
        content = exporter.generate_silae()
        media_type = "text/csv"
        filename = f"silae_variables_{str(month).zfill(2)}_{year}.csv"
    elif software == "cegid":
        content = exporter.generate_cegid()
        media_type = "text/plain"
        filename = f"cegid_variables_{str(month).zfill(2)}_{year}.txt"
    elif software == "adp":
        content = exporter.generate_adp()
        media_type = "application/json"
        filename = f"adp_paydata_{str(month).zfill(2)}_{year}.json"
    elif software == "dsn":
        content = exporter.generate_dsn_preview()
        media_type = "text/csv"
        filename = f"dsn_preparation_{str(month).zfill(2)}_{year}.csv"

    # Logger l'export
    logger.info(
        f"Export {software.upper()} généré: hôtel={hotel_id}, "
        f"période={month}/{year}, employés={len(employees_data)}"
    )

    return Response(
        content=content,
        media_type=media_type,
        headers={
            "Content-Disposition": f"attachment; filename={filename}",
            "X-Export-Software": software,
            "X-Export-Count": str(len(employees_data)),
        }
    )
