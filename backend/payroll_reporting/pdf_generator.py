"""
PDF Generator for Payroll Reports
Generates individual employee PDFs and global summary PDF
"""
import io
import os
from datetime import datetime
from typing import List, Optional
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm, mm
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, PageBreak
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT

from .models import EmployeePayrollData, GlobalPayrollSummary


MONTHS_FR = {
    1: "Janvier", 2: "Fevrier", 3: "Mars", 4: "Avril",
    5: "Mai", 6: "Juin", 7: "Juillet", 8: "Aout",
    9: "Septembre", 10: "Octobre", 11: "Novembre", 12: "Decembre"
}

CONTRACT_TYPES_FR = {
    "cdi": "CDI", "cdd": "CDD", "interim": "Interim",
    "stage": "Stage", "apprentissage": "Apprentissage", "extra": "Extra"
}

DEPARTMENTS_FR = {
    "front_office": "Reception", "housekeeping": "Hebergement",
    "food_beverage": "Restauration", "maintenance": "Maintenance",
    "administration": "Direction", "kitchen": "Cuisine"
}


class PayrollPDFGenerator:
    """Generateur de PDF pour les rapports de paie"""
    
    def __init__(self, hotel_name: str):
        self.hotel_name = hotel_name
        self.styles = getSampleStyleSheet()
        self._setup_styles()
    
    def _setup_styles(self):
        """Configure les styles personnalises"""
        self.styles.add(ParagraphStyle(
            name='Title_Custom',
            parent=self.styles['Heading1'],
            fontSize=18,
            spaceAfter=20,
            textColor=colors.HexColor('#1e293b'),
            alignment=TA_CENTER
        ))
        self.styles.add(ParagraphStyle(
            name='Subtitle',
            parent=self.styles['Normal'],
            fontSize=12,
            spaceAfter=10,
            textColor=colors.HexColor('#64748b'),
            alignment=TA_CENTER
        ))
        self.styles.add(ParagraphStyle(
            name='Section',
            parent=self.styles['Heading2'],
            fontSize=12,
            spaceBefore=15,
            spaceAfter=8,
            textColor=colors.HexColor('#7c3aed'),
            borderColor=colors.HexColor('#7c3aed'),
            borderWidth=0,
            borderPadding=0
        ))
        self.styles.add(ParagraphStyle(
            name='Footer',
            parent=self.styles['Normal'],
            fontSize=8,
            textColor=colors.HexColor('#94a3b8'),
            alignment=TA_CENTER
        ))
    
    def _create_header_table(self, title: str, subtitle: str) -> Table:
        """Cree l'en-tete du document"""
        data = [
            [Paragraph(f"<b>{self.hotel_name}</b>", self.styles['Title_Custom'])],
            [Paragraph(title, self.styles['Subtitle'])],
            [Paragraph(subtitle, self.styles['Subtitle'])]
        ]
        table = Table(data, colWidths=[18*cm])
        table.setStyle(TableStyle([
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ]))
        return table
    
    def _create_info_table(self, data: List[List], col_widths: List = None) -> Table:
        """Cree un tableau d'informations"""
        if col_widths is None:
            col_widths = [6*cm, 12*cm]
        
        table = Table(data, colWidths=col_widths)
        table.setStyle(TableStyle([
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('TEXTCOLOR', (0, 0), (0, -1), colors.HexColor('#475569')),
            ('TEXTCOLOR', (1, 0), (1, -1), colors.HexColor('#1e293b')),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
            ('TOPPADDING', (0, 0), (-1, -1), 6),
        ]))
        return table
    
    def _create_data_table(self, headers: List[str], rows: List[List], col_widths: List = None) -> Table:
        """Cree un tableau de donnees avec en-tetes"""
        data = [headers] + rows
        table = Table(data, colWidths=col_widths, repeatRows=1)
        
        style = [
            # En-tete
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#7c3aed')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 9),
            ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
            
            # Corps
            ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 1), (-1, -1), 9),
            ('ALIGN', (0, 1), (-1, -1), 'CENTER'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            
            # Bordures
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#e2e8f0')),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
            ('TOPPADDING', (0, 0), (-1, -1), 6),
        ]
        
        # Alternance couleurs lignes
        for i in range(1, len(data)):
            if i % 2 == 0:
                style.append(('BACKGROUND', (0, i), (-1, i), colors.HexColor('#f8fafc')))
        
        table.setStyle(TableStyle(style))
        return table
    
    def generate_employee_pdf(self, emp: EmployeePayrollData) -> bytes:
        """Genere le PDF individuel pour un employe"""
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            buffer, pagesize=A4,
            rightMargin=1.5*cm, leftMargin=1.5*cm,
            topMargin=1.5*cm, bottomMargin=1.5*cm
        )
        
        elements = []
        month_name = MONTHS_FR.get(emp.month, str(emp.month))
        
        # En-tete
        elements.append(self._create_header_table(
            "FICHE DE PAIE - VARIABLES",
            f"{month_name} {emp.year}"
        ))
        elements.append(Spacer(1, 15))
        
        # Section: Informations Salarie
        elements.append(Paragraph("INFORMATIONS SALARIE", self.styles['Section']))
        info_data = [
            ["Nom / Prenom:", f"{emp.last_name} {emp.first_name}"],
            ["Poste:", emp.position],
            ["Service:", DEPARTMENTS_FR.get(emp.department, emp.department)],
            ["Type de contrat:", CONTRACT_TYPES_FR.get(emp.contract_type, emp.contract_type)],
        ]
        if emp.hire_date:
            info_data.append(["Date d'entree:", emp.hire_date])
        info_data.append(["Heures hebdo contrat:", f"{emp.weekly_hours}h"])
        elements.append(self._create_info_table(info_data))
        elements.append(Spacer(1, 10))
        
        # Section: Periode
        elements.append(Paragraph("PERIODE", self.styles['Section']))
        period_data = [
            ["Mois concerne:", f"{month_name} {emp.year}"],
            ["Jours dans la periode:", str(emp.days_in_period)],
            ["Heures contractuelles:", f"{emp.contractual_hours:.2f}h"],
        ]
        elements.append(self._create_info_table(period_data))
        elements.append(Spacer(1, 10))
        
        # Section: Temps de travail
        elements.append(Paragraph("TEMPS DE TRAVAIL", self.styles['Section']))
        work_headers = ["Type", "Heures", "Details"]
        work_rows = [
            ["Heures normales", f"{emp.normal_hours:.2f}h", "Base"],
            ["Heures sup. 25%", f"{emp.overtime_25_hours:.2f}h", "Majoration 25%"],
            ["Heures sup. 50%", f"{emp.overtime_50_hours:.2f}h", "Majoration 50%"],
            ["Heures de nuit", f"{emp.night_hours:.2f}h", "Majoration nuit"],
            ["Heures feries", f"{emp.holiday_hours:.2f}h", "Jours feries travailles"],
            ["TOTAL TRAVAILLE", f"{emp.worked_hours:.2f}h", f"{emp.worked_days} jours"],
        ]
        elements.append(self._create_data_table(work_headers, work_rows, [6*cm, 4*cm, 6*cm]))
        elements.append(Spacer(1, 10))
        
        # Section: Absences
        elements.append(Paragraph("ABSENCES", self.styles['Section']))
        absence_headers = ["Type d'absence", "Jours", "Observations"]
        absence_rows = [
            ["Conges payes (CP)", f"{emp.cp_days:.1f}", ""],
            ["Maladie", f"{emp.sick_days:.1f}", ""],
            ["Absences non justifiees", f"{emp.unjustified_absences:.1f}", ""],
            ["Autres absences", f"{emp.other_absences:.1f}", ""],
            ["TOTAL ABSENCES", f"{emp.total_absences:.1f}", ""],
        ]
        elements.append(self._create_data_table(absence_headers, absence_rows, [6*cm, 4*cm, 6*cm]))
        elements.append(Spacer(1, 15))
        
        # Section: Synthese
        elements.append(Paragraph("SYNTHESE", self.styles['Section']))
        
        # Calcul ecart
        diff_sign = "+" if emp.hours_difference >= 0 else ""
        diff_text = f"{diff_sign}{emp.hours_difference:.2f}h"
        if emp.hours_difference > 0:
            diff_text += " (heures sup.)"
        elif emp.hours_difference < 0:
            diff_text += " (heures manquantes)"
        else:
            diff_text = "0h (conforme au contrat)"
        
        synthesis_data = [
            ["Total heures a payer:", f"{emp.total_hours_to_pay:.2f}h"],
            ["Ecart vs contrat:", diff_text],
        ]
        elements.append(self._create_info_table(synthesis_data))
        
        # Notes manager
        if emp.manager_notes:
            elements.append(Spacer(1, 10))
            elements.append(Paragraph("NOTES / COMMENTAIRES", self.styles['Section']))
            elements.append(Paragraph(emp.manager_notes, self.styles['Normal']))
        
        # Footer
        elements.append(Spacer(1, 30))
        footer_text = f"Document genere le {datetime.now().strftime('%d/%m/%Y a %H:%M')} - Flowtym PMS"
        elements.append(Paragraph(footer_text, self.styles['Footer']))
        
        doc.build(elements)
        buffer.seek(0)
        return buffer.getvalue()
    
    def generate_global_pdf(self, summary: GlobalPayrollSummary) -> bytes:
        """Genere le PDF recapitulatif global"""
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            buffer, pagesize=A4,
            rightMargin=1*cm, leftMargin=1*cm,
            topMargin=1.5*cm, bottomMargin=1.5*cm
        )
        
        elements = []
        month_name = MONTHS_FR.get(summary.month, str(summary.month))
        
        # En-tete
        elements.append(self._create_header_table(
            "RECAPITULATIF MENSUEL",
            f"{month_name} {summary.year}"
        ))
        elements.append(Spacer(1, 15))
        
        # KPIs globaux
        elements.append(Paragraph("SYNTHESE GLOBALE", self.styles['Section']))
        kpi_headers = ["Indicateur", "Valeur"]
        kpi_rows = [
            ["Nombre de salaries", str(summary.total_employees)],
            ["Total heures travaillees", f"{summary.total_worked_hours:.2f}h"],
            ["Heures normales", f"{summary.total_normal_hours:.2f}h"],
            ["Heures sup. 25%", f"{summary.total_overtime_25:.2f}h"],
            ["Heures sup. 50%", f"{summary.total_overtime_50:.2f}h"],
            ["Heures de nuit", f"{summary.total_night_hours:.2f}h"],
            ["Jours travailles (cumul)", str(summary.total_worked_days)],
        ]
        elements.append(self._create_data_table(kpi_headers, kpi_rows, [10*cm, 8*cm]))
        elements.append(Spacer(1, 10))
        
        # Absences globales
        elements.append(Paragraph("ABSENCES GLOBALES", self.styles['Section']))
        absence_headers = ["Type", "Total jours"]
        absence_rows = [
            ["Conges payes", f"{summary.total_cp_days:.1f}"],
            ["Maladie", f"{summary.total_sick_days:.1f}"],
            ["Absences non justifiees", f"{summary.total_unjustified:.1f}"],
            ["Autres absences", f"{summary.total_other_absences:.1f}"],
        ]
        elements.append(self._create_data_table(absence_headers, absence_rows, [10*cm, 8*cm]))
        elements.append(Spacer(1, 10))
        
        # Par departement
        if summary.by_department:
            elements.append(Paragraph("PAR SERVICE", self.styles['Section']))
            dept_headers = ["Service", "Heures", "H. Sup", "Effectif"]
            dept_rows = []
            for dept, data in summary.by_department.items():
                dept_name = DEPARTMENTS_FR.get(dept, dept)
                dept_rows.append([
                    dept_name,
                    f"{data.get('hours', 0):.2f}h",
                    f"{data.get('overtime', 0):.2f}h",
                    str(int(data.get('count', 0)))
                ])
            elements.append(self._create_data_table(dept_headers, dept_rows, [6*cm, 4*cm, 4*cm, 4*cm]))
        
        # Saut de page pour le detail
        elements.append(PageBreak())
        
        # Detail par salarie
        elements.append(Paragraph("DETAIL PAR SALARIE", self.styles['Section']))
        emp_headers = ["Salarie", "Service", "J. Trav", "H. Norm", "H.Sup 25%", "H.Sup 50%", "CP", "Maladie"]
        emp_rows = []
        for emp in summary.employees:
            emp_rows.append([
                f"{emp.last_name} {emp.first_name[:1]}.",
                DEPARTMENTS_FR.get(emp.department, emp.department)[:8],
                str(emp.worked_days),
                f"{emp.normal_hours:.1f}",
                f"{emp.overtime_25_hours:.1f}",
                f"{emp.overtime_50_hours:.1f}",
                f"{emp.cp_days:.1f}",
                f"{emp.sick_days:.1f}"
            ])
        
        # Ligne totaux
        emp_rows.append([
            "TOTAUX",
            "",
            str(summary.total_worked_days),
            f"{summary.total_normal_hours:.1f}",
            f"{summary.total_overtime_25:.1f}",
            f"{summary.total_overtime_50:.1f}",
            f"{summary.total_cp_days:.1f}",
            f"{summary.total_sick_days:.1f}"
        ])
        
        col_widths = [3.5*cm, 2.5*cm, 1.8*cm, 2.2*cm, 2.5*cm, 2.5*cm, 1.8*cm, 2*cm]
        table = self._create_data_table(emp_headers, emp_rows, col_widths)
        
        elements.append(table)
        
        # Footer
        elements.append(Spacer(1, 30))
        footer_text = f"Document genere le {datetime.now().strftime('%d/%m/%Y a %H:%M')} - Flowtym PMS"
        elements.append(Paragraph(footer_text, self.styles['Footer']))
        
        doc.build(elements)
        buffer.seek(0)
        return buffer.getvalue()
