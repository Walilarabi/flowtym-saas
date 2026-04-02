"""
Flowtym - Export Variables de Paie vers Logiciels Comptables
Génère des fichiers aux formats spécifiques : Sage, Silae, Cegid, ADP
"""
import io
import csv
import json
from datetime import datetime
from typing import List, Dict, Any, Optional
from .models import EmployeePayrollData, GlobalPayrollSummary

MONTHS_FR = {
    1: "Janvier", 2: "Fevrier", 3: "Mars", 4: "Avril",
    5: "Mai", 6: "Juin", 7: "Juillet", 8: "Aout",
    9: "Septembre", 10: "Octobre", 11: "Novembre", 12: "Decembre"
}

DEPARTMENT_LABELS = {
    "front_office": "Reception",
    "housekeeping": "Hebergement",
    "food_beverage": "Restauration",
    "maintenance": "Maintenance",
    "administration": "Direction",
    "kitchen": "Cuisine",
}


class PayrollSoftwareExporter:
    """
    Générateur d'exports vers les logiciels de paie français.
    Supporte : Sage Paie, Silae, Cegid, ADP iHCM
    """

    def __init__(self, summary: GlobalPayrollSummary, hotel_name: str):
        self.summary = summary
        self.hotel_name = hotel_name

    # ═══════════════════════════════════════════════════════════
    # SAGE PAIE
    # ═══════════════════════════════════════════════════════════
    def generate_sage(self) -> bytes:
        """
        Format Sage Paie & RH - Variables de paie mensuelles.
        Colonnes compatibles Sage 100 Paie / Sage Paie Expert.
        Séparateur point-virgule, encodage UTF-8 BOM (requis par Sage).
        """
        output = io.StringIO()
        writer = csv.writer(output, delimiter=";", quoting=csv.QUOTE_MINIMAL)

        # En-tête Sage
        writer.writerow([
            "MATRICULE",
            "NOM",
            "PRENOM",
            "ETABLISSEMENT",
            "PERIODE",
            "RUBRIQUE_001",  # Heures normales
            "RUBRIQUE_002",  # Heures sup 25%
            "RUBRIQUE_003",  # Heures sup 50%
            "RUBRIQUE_004",  # Heures nuit
            "RUBRIQUE_005",  # Heures jours feries
            "RUBRIQUE_CP",   # Conges payes (jours)
            "RUBRIQUE_MAL",  # Absences maladie (jours)
            "RUBRIQUE_ABS",  # Autres absences (jours)
            "RUBRIQUE_ABJ",  # Absences non justifiees (jours)
            "TOTAL_HEURES",
            "JOURS_TRAVAILLES",
            "TAUX_HORAIRE",
            "COMMENTAIRE",
        ])

        periode = f"{str(self.summary.month).zfill(2)}/{self.summary.year}"

        for emp in self.summary.employees:
            # Matricule Sage = 6 premiers chars de l'ID pour unicité
            matricule = emp.employee_id[:8].upper().replace("-", "")
            writer.writerow([
                matricule,
                emp.last_name.upper(),
                emp.first_name,
                self.hotel_name[:30],
                periode,
                self._fmt(emp.normal_hours),
                self._fmt(emp.overtime_25_hours),
                self._fmt(emp.overtime_50_hours),
                self._fmt(emp.night_hours),
                self._fmt(emp.holiday_hours),
                self._fmt(emp.cp_days),
                self._fmt(emp.sick_days),
                self._fmt(emp.other_absences),
                self._fmt(emp.unjustified_absences),
                self._fmt(emp.total_hours_to_pay),
                str(emp.worked_days),
                self._fmt(emp.hourly_rate),
                "",
            ])

        # Encodage UTF-8 BOM (requis pour Sage sous Windows)
        return ("\ufeff" + output.getvalue()).encode("utf-8")

    # ═══════════════════════════════════════════════════════════
    # SILAE
    # ═══════════════════════════════════════════════════════════
    def generate_silae(self) -> bytes:
        """
        Format Silae (Septeo) - Import variables de paie.
        Format CSV UTF-8, séparateur virgule.
        Compatible avec l'import automatique Silae Business / Enterprise.
        """
        output = io.StringIO()
        writer = csv.writer(output, delimiter=",", quoting=csv.QUOTE_ALL)

        # En-tête Silae
        writer.writerow([
            "Matricule",
            "Nom",
            "Prenom",
            "Societe",
            "Mois",
            "Annee",
            "Heures_Base",
            "Heures_Sup_1",    # 25%
            "Heures_Sup_2",    # 50%
            "Heures_Nuit",
            "Heures_Feries",
            "CP_Pris",
            "Maladie",
            "Absence_Autorisee",
            "Absence_Non_Autorisee",
            "Total_Heures_Payees",
            "Jours_Travailles",
            "Taux_Horaire_Brut",
        ])

        for emp in self.summary.employees:
            writer.writerow([
                emp.employee_id[:10].upper().replace("-", ""),
                emp.last_name.upper(),
                emp.first_name,
                self.hotel_name[:40],
                str(self.summary.month),
                str(self.summary.year),
                self._fmt(emp.normal_hours),
                self._fmt(emp.overtime_25_hours),
                self._fmt(emp.overtime_50_hours),
                self._fmt(emp.night_hours),
                self._fmt(emp.holiday_hours),
                self._fmt(emp.cp_days),
                self._fmt(emp.sick_days),
                self._fmt(emp.other_absences),
                self._fmt(emp.unjustified_absences),
                self._fmt(emp.total_hours_to_pay),
                str(emp.worked_days),
                self._fmt(emp.hourly_rate),
            ])

        return output.getvalue().encode("utf-8")

    # ═══════════════════════════════════════════════════════════
    # CEGID
    # ═══════════════════════════════════════════════════════════
    def generate_cegid(self) -> bytes:
        """
        Format Cegid HR Ultimate / Cegid Peoplenet.
        Fichier texte à largeur fixe / CSV avec structure Cegid.
        Séparateur tabulation, encodage ANSI (latin-1) pour compatibilité.
        """
        output = io.StringIO()
        writer = csv.writer(output, delimiter="\t", quoting=csv.QUOTE_MINIMAL)

        # En-tête Cegid (pas de ligne d'en-tête dans le format Cegid natif,
        # mais on inclut une ligne commentaire reconnue par Cegid)
        writer.writerow([
            "#FLOWTYM_EXPORT",
            f"PERIODE:{str(self.summary.month).zfill(2)}/{self.summary.year}",
            f"SOCIETE:{self.hotel_name[:30]}",
            f"DATE_EXPORT:{datetime.now().strftime('%d/%m/%Y %H:%M')}",
        ])

        # Ligne de headers lisibles
        writer.writerow([
            "MATRICULE",
            "NOM_PRENOM",
            "PERIODE_PAIE",
            "CODE_SERVICE",
            "H_BASE",
            "H_SUP_25",
            "H_SUP_50",
            "H_NUIT",
            "H_FERIES",
            "J_CP",
            "J_MALADIE",
            "J_ABSENCES_AUST",
            "J_ABSENCES_INUST",
            "H_TOTAL_PAYE",
            "NB_JOURS_TRAVAILLES",
            "TAUX_HORAIRE",
        ])

        periode = f"{str(self.summary.month).zfill(2)}{self.summary.year}"

        for emp in self.summary.employees:
            dept_code = DEPARTMENT_LABELS.get(emp.department, emp.department or "AUTRE")[:10]
            nom_prenom = f"{emp.last_name.upper()} {emp.first_name}"[:40]
            writer.writerow([
                emp.employee_id[:8].upper().replace("-", ""),
                nom_prenom,
                periode,
                dept_code,
                self._fmt(emp.normal_hours),
                self._fmt(emp.overtime_25_hours),
                self._fmt(emp.overtime_50_hours),
                self._fmt(emp.night_hours),
                self._fmt(emp.holiday_hours),
                self._fmt(emp.cp_days),
                self._fmt(emp.sick_days),
                self._fmt(emp.other_absences),
                self._fmt(emp.unjustified_absences),
                self._fmt(emp.total_hours_to_pay),
                str(emp.worked_days),
                self._fmt(emp.hourly_rate),
            ])

        # Cegid préfère latin-1 mais on retombe sur UTF-8 si erreur
        try:
            return output.getvalue().encode("latin-1")
        except UnicodeEncodeError:
            return output.getvalue().encode("utf-8")

    # ═══════════════════════════════════════════════════════════
    # ADP iHCM
    # ═══════════════════════════════════════════════════════════
    def generate_adp(self) -> bytes:
        """
        Format ADP iHCM / ADP Decidium.
        Export JSON structuré compatible avec l'API ADP Workforce Now.
        Les champs respectent le schéma ADP workerID / payData.
        """
        records = []
        for emp in self.summary.employees:
            dept = DEPARTMENT_LABELS.get(emp.department, emp.department or "AUTRE")
            records.append({
                "workerId": emp.employee_id[:12].upper().replace("-", ""),
                "workerLastName": emp.last_name.upper(),
                "workerFirstName": emp.first_name,
                "businessUnit": self.hotel_name[:30],
                "department": dept,
                "payPeriod": {
                    "month": self.summary.month,
                    "year": self.summary.year,
                },
                "payData": {
                    "baseHours": float(emp.normal_hours),
                    "overtimeHours25": float(emp.overtime_25_hours),
                    "overtimeHours50": float(emp.overtime_50_hours),
                    "nightHours": float(emp.night_hours),
                    "holidayHours": float(emp.holiday_hours),
                    "paidLeaveDays": float(emp.cp_days),
                    "sickDays": float(emp.sick_days),
                    "authorizedAbsenceDays": float(emp.other_absences),
                    "unauthorizedAbsenceDays": float(emp.unjustified_absences),
                    "totalPaidHours": float(emp.total_hours_to_pay),
                    "workedDays": emp.worked_days,
                    "hourlyRate": float(emp.hourly_rate),
                    "contractType": emp.contract_type,
                    "weeklyContractHours": float(emp.weekly_hours),
                },
                "hireDate": emp.hire_date or "",
                "exportTimestamp": datetime.now().isoformat(),
            })

        payload = {
            "schemaVersion": "1.0",
            "exportSource": "Flowtym PMS",
            "exportDate": datetime.now().strftime("%Y-%m-%d"),
            "company": self.hotel_name,
            "payPeriod": {
                "month": self.summary.month,
                "year": self.summary.year,
                "label": f"{MONTHS_FR[self.summary.month]} {self.summary.year}",
            },
            "totalEmployees": len(records),
            "workers": records,
        }

        return json.dumps(payload, ensure_ascii=False, indent=2).encode("utf-8")

    # ═══════════════════════════════════════════════════════════
    # DSN PREVIEW (format de référence nationale)
    # ═══════════════════════════════════════════════════════════
    def generate_dsn_preview(self) -> bytes:
        """
        Aperçu DSN (Déclaration Sociale Nominative) — fichier CSV récapitulatif
        avec les rubriques nécessaires à la préparation de la DSN mensuelle.
        Ce n'est pas une DSN complète mais un fichier d'aide à la saisie.
        """
        output = io.StringIO()
        writer = csv.writer(output, delimiter=";", quoting=csv.QUOTE_MINIMAL)

        periode = f"{str(self.summary.month).zfill(2)}/{self.summary.year}"

        writer.writerow([
            "# FLOWTYM - PREPARATION DSN MENSUELLE",
            f"# Periode : {periode}",
            f"# Societe : {self.hotel_name}",
            f"# Genere le : {datetime.now().strftime('%d/%m/%Y a %H:%M')}",
        ])
        writer.writerow([])  # ligne vide

        writer.writerow([
            "NOM",
            "PRENOM",
            "NIR_PARTIEL",       # Numéro sécu (masqué - à compléter)
            "PERIODE",
            "H_TRAVAILLEES",
            "H_SUP_MAJOREES",    # H sup 25% + 50%
            "H_NUIT",
            "H_FERIES_TRAVAILLEES",
            "CP_PRIS",
            "ARRET_MALADIE_JOURS",
            "ABSENCE_NON_JUSTIFIEE",
            "TAUX_HORAIRE_BRUT",
            "SALAIRE_BASE_BRUT_ESTIME",
        ])

        for emp in self.summary.employees:
            h_sup_total = emp.overtime_25_hours + emp.overtime_50_hours
            salaire_base_estime = round(emp.total_hours_to_pay * emp.hourly_rate, 2)
            writer.writerow([
                emp.last_name.upper(),
                emp.first_name,
                "X-XX-XX-XXX-XXX-XX",   # NIR masqué par sécurité
                periode,
                self._fmt(emp.worked_hours),
                self._fmt(h_sup_total),
                self._fmt(emp.night_hours),
                self._fmt(emp.holiday_hours),
                self._fmt(emp.cp_days),
                self._fmt(emp.sick_days),
                self._fmt(emp.unjustified_absences),
                self._fmt(emp.hourly_rate),
                self._fmt(salaire_base_estime),
            ])

        # Totaux
        writer.writerow([])
        total_h_sup = sum(e.overtime_25_hours + e.overtime_50_hours for e in self.summary.employees)
        writer.writerow([
            "TOTAL",
            "",
            "",
            periode,
            self._fmt(self.summary.total_worked_hours),
            self._fmt(total_h_sup),
            self._fmt(self.summary.total_night_hours),
            self._fmt(self.summary.total_holiday_hours),
            self._fmt(self.summary.total_cp_days),
            self._fmt(self.summary.total_sick_days),
            self._fmt(self.summary.total_unjustified),
            "",
            "",
        ])

        return ("\ufeff" + output.getvalue()).encode("utf-8")

    # ═══════════════════════════════════════════════════════════
    # Utilitaires
    # ═══════════════════════════════════════════════════════════
    @staticmethod
    def _fmt(value: float) -> str:
        """Formate un float avec virgule (convention française)"""
        return f"{value:.2f}".replace(".", ",")

    @staticmethod
    def get_software_info() -> List[Dict[str, Any]]:
        """Retourne les métadonnées des logiciels supportés"""
        return [
            {
                "id": "sage",
                "name": "Sage Paie & RH",
                "logo": "sage",
                "description": "Compatible Sage 100 Paie, Sage Paie Expert",
                "format": "CSV (;) UTF-8 BOM",
                "extension": "csv",
                "media_type": "text/csv",
                "filename_template": "sage_paie_{month}_{year}.csv",
                "notes": "Importez via Sage Paie > Gestion > Import de variables",
            },
            {
                "id": "silae",
                "name": "Silae (Septeo)",
                "logo": "silae",
                "description": "Compatible Silae Business & Enterprise",
                "format": "CSV (,) UTF-8",
                "extension": "csv",
                "media_type": "text/csv",
                "filename_template": "silae_variables_{month}_{year}.csv",
                "notes": "Importez via Silae > Paramétrage > Import automatique",
            },
            {
                "id": "cegid",
                "name": "Cegid HR Ultimate",
                "logo": "cegid",
                "description": "Compatible Cegid Peoplenet, HR Ultimate",
                "format": "TSV (tab) ANSI",
                "extension": "txt",
                "media_type": "text/plain",
                "filename_template": "cegid_variables_{month}_{year}.txt",
                "notes": "Importez via Cegid > Paie > Saisie des variables > Import",
            },
            {
                "id": "adp",
                "name": "ADP iHCM",
                "logo": "adp",
                "description": "Compatible ADP iHCM, ADP Decidium, Workforce Now",
                "format": "JSON",
                "extension": "json",
                "media_type": "application/json",
                "filename_template": "adp_paydata_{month}_{year}.json",
                "notes": "Uploadez via ADP iHCM > Saisie de masse ou via API",
            },
            {
                "id": "dsn",
                "name": "Préparation DSN",
                "logo": "dsn",
                "description": "Aide à la préparation de la DSN mensuelle (tous logiciels)",
                "format": "CSV (;) UTF-8",
                "extension": "csv",
                "media_type": "text/csv",
                "filename_template": "dsn_preparation_{month}_{year}.csv",
                "notes": "Fichier d'aide à la saisie DSN — à transmettre à votre expert-comptable",
            },
        ]
