"""
PDF Generation Service for Contracts and SEPA Mandates
"""
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm, mm
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image, PageBreak
from reportlab.pdfgen import canvas
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT, TA_JUSTIFY
from io import BytesIO
from datetime import datetime, timedelta
from typing import Dict, Any, Optional
import os

# Flowtym Company Info
FLOWTYM_INFO = {
    "name": "Flowtym SAS",
    "address": "15 rue de la Innovation",
    "postal_code": "75008",
    "city": "Paris",
    "country": "France",
    "siret": "123 456 789 00012",
    "tva_intra": "FR12 345678901",
    "email": "contact@flowtym.com",
    "phone": "+33 1 23 45 67 89",
    "ics": "FR98ZZZ123456",  # Identifiant Créancier SEPA
    "iban": "FR76 1234 5678 9012 3456 7890 123",
    "bic": "BNPAFRPP"
}

class PDFGenerator:
    """Generate PDF documents for SaaS contracts and SEPA mandates"""
    
    def __init__(self):
        self.styles = getSampleStyleSheet()
        self._setup_custom_styles()
    
    def _setup_custom_styles(self):
        """Setup custom paragraph styles"""
        self.styles.add(ParagraphStyle(
            name='Title_Custom',
            parent=self.styles['Heading1'],
            fontSize=18,
            spaceAfter=30,
            alignment=TA_CENTER,
            textColor=colors.HexColor('#6B21A8')  # Violet
        ))
        
        self.styles.add(ParagraphStyle(
            name='Section_Header',
            parent=self.styles['Heading2'],
            fontSize=12,
            spaceBefore=20,
            spaceAfter=10,
            textColor=colors.HexColor('#1E293B')
        ))
        
        self.styles.add(ParagraphStyle(
            name='Body_Justified',
            parent=self.styles['Normal'],
            fontSize=10,
            alignment=TA_JUSTIFY,
            spaceAfter=8,
            leading=14
        ))
        
        self.styles.add(ParagraphStyle(
            name='Small_Text',
            parent=self.styles['Normal'],
            fontSize=8,
            textColor=colors.grey
        ))
    
    def generate_contract_pdf(self, hotel_data: Dict, subscription_data: Dict) -> bytes:
        """
        Generate SaaS Contract PDF
        
        Args:
            hotel_data: Hotel/client information
            subscription_data: Subscription details
            
        Returns:
            PDF bytes
        """
        buffer = BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=A4,
            rightMargin=2*cm,
            leftMargin=2*cm,
            topMargin=2*cm,
            bottomMargin=2*cm
        )
        
        story = []
        
        # ===== HEADER =====
        story.append(Paragraph("CONTRAT D'ABONNEMENT SAAS", self.styles['Title_Custom']))
        story.append(Paragraph("Logiciel de Gestion Hôtelière Flowtym", self.styles['Normal']))
        story.append(Spacer(1, 20))
        
        # Contract reference and date
        contract_ref = f"CTR-{datetime.now().strftime('%Y%m%d')}-{hotel_data.get('id', 'XXX')[:8].upper()}"
        story.append(Paragraph(f"<b>Référence :</b> {contract_ref}", self.styles['Normal']))
        story.append(Paragraph(f"<b>Date :</b> {datetime.now().strftime('%d/%m/%Y')}", self.styles['Normal']))
        story.append(Spacer(1, 30))
        
        # ===== PARTIES =====
        story.append(Paragraph("ARTICLE 1 - PARTIES", self.styles['Section_Header']))
        
        # Prestataire (Flowtym)
        story.append(Paragraph("<b>LE PRESTATAIRE :</b>", self.styles['Normal']))
        prestataire_text = f"""
        {FLOWTYM_INFO['name']}<br/>
        {FLOWTYM_INFO['address']}<br/>
        {FLOWTYM_INFO['postal_code']} {FLOWTYM_INFO['city']}, {FLOWTYM_INFO['country']}<br/>
        SIRET : {FLOWTYM_INFO['siret']}<br/>
        N° TVA Intracommunautaire : {FLOWTYM_INFO['tva_intra']}<br/>
        """
        story.append(Paragraph(prestataire_text, self.styles['Body_Justified']))
        story.append(Spacer(1, 15))
        
        # Client
        story.append(Paragraph("<b>LE CLIENT :</b>", self.styles['Normal']))
        client_text = f"""
        {hotel_data.get('legal_name', hotel_data.get('name', ''))}<br/>
        {hotel_data.get('address', '')}<br/>
        {hotel_data.get('postal_code', '')} {hotel_data.get('city', '')}, {hotel_data.get('country', 'France')}<br/>
        SIRET : {hotel_data.get('siret', '')}<br/>
        Représenté par : {hotel_data.get('contact_name', '')}<br/>
        Email : {hotel_data.get('contact_email', '')}<br/>
        """
        story.append(Paragraph(client_text, self.styles['Body_Justified']))
        story.append(Spacer(1, 20))
        
        # ===== OBJET =====
        story.append(Paragraph("ARTICLE 2 - OBJET DU CONTRAT", self.styles['Section_Header']))
        story.append(Paragraph(
            "Le présent contrat a pour objet de définir les conditions dans lesquelles le Prestataire "
            "met à disposition du Client la solution logicielle Flowtym, accessible en mode SaaS "
            "(Software as a Service), permettant la gestion complète de son établissement hôtelier.",
            self.styles['Body_Justified']
        ))
        story.append(Spacer(1, 15))
        
        # ===== SERVICES INCLUS =====
        story.append(Paragraph("ARTICLE 3 - SERVICES INCLUS", self.styles['Section_Header']))
        
        plan_name = subscription_data.get('plan_name', subscription_data.get('plan', '').upper())
        modules = subscription_data.get('modules', [])
        features = subscription_data.get('features', {})
        
        story.append(Paragraph(f"<b>Formule souscrite :</b> {plan_name}", self.styles['Normal']))
        story.append(Spacer(1, 10))
        
        story.append(Paragraph("<b>Modules activés :</b>", self.styles['Normal']))
        modules_text = ", ".join([m.upper() for m in modules]) if modules else "Selon la formule"
        story.append(Paragraph(f"• {modules_text}", self.styles['Body_Justified']))
        story.append(Spacer(1, 15))
        
        # ===== UTILISATEURS =====
        story.append(Paragraph("ARTICLE 4 - NOMBRE D'UTILISATEURS", self.styles['Section_Header']))
        max_users = subscription_data.get('max_users', 5)
        users_text = "Illimité" if max_users == -1 else str(max_users)
        story.append(Paragraph(
            f"Le Client bénéficie d'un accès pour <b>{users_text} utilisateur(s)</b> simultanément. "
            "Tout dépassement fera l'objet d'une facturation complémentaire selon les tarifs en vigueur.",
            self.styles['Body_Justified']
        ))
        story.append(Spacer(1, 15))
        
        # ===== TARIFICATION =====
        story.append(Paragraph("ARTICLE 5 - TARIFICATION ET PAIEMENT", self.styles['Section_Header']))
        
        price_monthly = subscription_data.get('price_monthly', 0)
        price_annual = subscription_data.get('price_annual', price_monthly * 12 * 0.95)
        payment_freq = subscription_data.get('payment_frequency', 'monthly')
        
        tarif_table_data = [
            ['Périodicité', 'Prix HT', 'Économie'],
            ['Mensuel', f"{price_monthly:.2f} €/mois", '-'],
            ['Annuel', f"{price_annual/12:.2f} €/mois", '5%'],
        ]
        
        tarif_table = Table(tarif_table_data, colWidths=[5*cm, 5*cm, 3*cm])
        tarif_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#6B21A8')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, -1), colors.HexColor('#F5F3FF')),
            ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#E9D5FF')),
        ]))
        story.append(tarif_table)
        story.append(Spacer(1, 10))
        
        freq_text = "mensuel" if payment_freq == "monthly" else "annuel"
        story.append(Paragraph(
            f"<b>Mode de paiement choisi :</b> Prélèvement {freq_text} par mandat SEPA.",
            self.styles['Body_Justified']
        ))
        story.append(Spacer(1, 15))
        
        # ===== PERIODE D'ESSAI =====
        story.append(Paragraph("ARTICLE 6 - PÉRIODE D'ESSAI", self.styles['Section_Header']))
        trial_type = subscription_data.get('trial_type', 'free_15_days')
        
        if trial_type == 'free_15_days':
            trial_text = "Le Client bénéficie d'une période d'essai gratuite de 15 jours à compter de la date d'activation."
        elif trial_type == 'half_price_first_month':
            trial_text = "Le Client bénéficie d'une réduction de 50% sur le premier mois d'abonnement."
        else:
            trial_text = "Aucune période d'essai n'est applicable à ce contrat."
        
        story.append(Paragraph(trial_text, self.styles['Body_Justified']))
        story.append(Spacer(1, 15))
        
        # ===== DUREE =====
        story.append(Paragraph("ARTICLE 7 - DURÉE DU CONTRAT", self.styles['Section_Header']))
        story.append(Paragraph(
            "Le présent contrat est conclu pour une durée initiale de 12 mois à compter de sa date de signature. "
            "Il sera ensuite renouvelé tacitement par périodes successives de même durée, sauf dénonciation "
            "par l'une ou l'autre des parties notifiée par écrit avec un préavis de 30 jours avant l'échéance.",
            self.styles['Body_Justified']
        ))
        story.append(Spacer(1, 15))
        
        # ===== ACCES ET SECURITE =====
        story.append(Paragraph("ARTICLE 8 - ACCÈS ET SÉCURITÉ", self.styles['Section_Header']))
        story.append(Paragraph(
            "L'accès à la plateforme s'effectue via une connexion internet sécurisée (HTTPS). "
            "Les données sont hébergées sur des serveurs cloud certifiés ISO 27001, localisés en Union Européenne. "
            "Le Client s'engage à préserver la confidentialité de ses identifiants de connexion.",
            self.styles['Body_Justified']
        ))
        story.append(Spacer(1, 15))
        
        # ===== SUPPORT =====
        story.append(Paragraph("ARTICLE 9 - SUPPORT ET ASSISTANCE", self.styles['Section_Header']))
        story.append(Paragraph(
            "Le Prestataire met à disposition du Client un service de support technique accessible par email "
            "et via l'interface de l'application. Le mode support permet une assistance à distance avec "
            "simulation de l'interface utilisateur pour une résolution rapide des problèmes.",
            self.styles['Body_Justified']
        ))
        story.append(Spacer(1, 15))
        
        # ===== RESILIATION =====
        story.append(Paragraph("ARTICLE 10 - RÉSILIATION", self.styles['Section_Header']))
        story.append(Paragraph(
            "Chaque partie peut résilier le contrat avec un préavis de 30 jours. En cas de manquement grave "
            "aux obligations du présent contrat, la partie lésée pourra résilier de plein droit après mise en demeure "
            "restée infructueuse pendant 15 jours.",
            self.styles['Body_Justified']
        ))
        story.append(Spacer(1, 15))
        
        # ===== RESPONSABILITE =====
        story.append(Paragraph("ARTICLE 11 - LIMITATION DE RESPONSABILITÉ", self.styles['Section_Header']))
        story.append(Paragraph(
            "La responsabilité du Prestataire est limitée au montant des sommes effectivement perçues au titre "
            "du présent contrat au cours des 12 derniers mois. Le Prestataire ne saurait être tenu responsable "
            "des dommages indirects, pertes d'exploitation ou manque à gagner.",
            self.styles['Body_Justified']
        ))
        story.append(Spacer(1, 20))
        
        # ===== SIGNATURE =====
        story.append(Paragraph("ARTICLE 12 - ACCEPTATION ET SIGNATURE", self.styles['Section_Header']))
        story.append(Paragraph(
            f"Fait à Paris, le {datetime.now().strftime('%d/%m/%Y')}, en deux exemplaires originaux.",
            self.styles['Body_Justified']
        ))
        story.append(Spacer(1, 30))
        
        # Signature table
        sig_data = [
            ['LE PRESTATAIRE', 'LE CLIENT'],
            [FLOWTYM_INFO['name'], hotel_data.get('legal_name', hotel_data.get('name', ''))],
            ['', ''],
            ['', ''],
            ['Signature :', 'Signature :'],
            ['', ''],
            ['', ''],
        ]
        
        sig_table = Table(sig_data, colWidths=[8*cm, 8*cm])
        sig_table.setStyle(TableStyle([
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('BOTTOMPADDING', (0, -3), (-1, -1), 40),
            ('BOX', (0, 0), (0, -1), 1, colors.grey),
            ('BOX', (1, 0), (1, -1), 1, colors.grey),
        ]))
        story.append(sig_table)
        
        # Build PDF
        doc.build(story)
        return buffer.getvalue()
    
    def generate_sepa_mandate_pdf(self, hotel_data: Dict, sepa_data: Dict) -> bytes:
        """
        Generate SEPA Direct Debit Mandate PDF
        
        Args:
            hotel_data: Hotel/client information
            sepa_data: SEPA mandate details (IBAN, BIC, etc.)
            
        Returns:
            PDF bytes
        """
        buffer = BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=A4,
            rightMargin=2*cm,
            leftMargin=2*cm,
            topMargin=2*cm,
            bottomMargin=2*cm
        )
        
        story = []
        
        # ===== HEADER =====
        story.append(Paragraph("MANDAT DE PRÉLÈVEMENT SEPA", self.styles['Title_Custom']))
        story.append(Paragraph("Prélèvement SEPA Interentreprises (B2B)", self.styles['Normal']))
        story.append(Spacer(1, 20))
        
        # Mandate reference
        rum = sepa_data.get('reference', f"RUM-{datetime.now().strftime('%Y%m%d')}-{hotel_data.get('id', 'XXX')[:8].upper()}")
        story.append(Paragraph(f"<b>Référence Unique du Mandat (RUM) :</b> {rum}", self.styles['Normal']))
        story.append(Paragraph(f"<b>Date :</b> {datetime.now().strftime('%d/%m/%Y')}", self.styles['Normal']))
        story.append(Spacer(1, 30))
        
        # ===== CREANCIER =====
        story.append(Paragraph("CRÉANCIER", self.styles['Section_Header']))
        
        creditor_data = [
            ['Nom / Raison sociale', FLOWTYM_INFO['name']],
            ['Adresse', f"{FLOWTYM_INFO['address']}, {FLOWTYM_INFO['postal_code']} {FLOWTYM_INFO['city']}"],
            ['Identifiant Créancier SEPA (ICS)', FLOWTYM_INFO['ics']],
        ]
        
        creditor_table = Table(creditor_data, colWidths=[6*cm, 10*cm])
        creditor_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#F5F3FF')),
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#E9D5FF')),
            ('PADDING', (0, 0), (-1, -1), 8),
        ]))
        story.append(creditor_table)
        story.append(Spacer(1, 20))
        
        # ===== DEBITEUR =====
        story.append(Paragraph("DÉBITEUR", self.styles['Section_Header']))
        
        # Mask IBAN for display
        iban = sepa_data.get('iban', '')
        iban_masked = iban[:4] + '****' + iban[-4:] if len(iban) > 8 else iban
        
        debtor_data = [
            ['Nom / Raison sociale', hotel_data.get('legal_name', hotel_data.get('name', ''))],
            ['Adresse', f"{hotel_data.get('address', '')}, {hotel_data.get('postal_code', '')} {hotel_data.get('city', '')}"],
            ['Titulaire du compte', sepa_data.get('account_holder', '')],
            ['IBAN', iban],
            ['BIC', sepa_data.get('bic', '')],
        ]
        
        debtor_table = Table(debtor_data, colWidths=[6*cm, 10*cm])
        debtor_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#F5F3FF')),
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#E9D5FF')),
            ('PADDING', (0, 0), (-1, -1), 8),
        ]))
        story.append(debtor_table)
        story.append(Spacer(1, 20))
        
        # ===== TYPE DE PAIEMENT =====
        story.append(Paragraph("TYPE DE PAIEMENT", self.styles['Section_Header']))
        
        payment_type = sepa_data.get('payment_type', 'RCUR')
        if payment_type == 'RCUR':
            payment_text = "☑ Paiement récurrent (RCUR)"
            payment_desc = "Le mandat autorise des prélèvements récurrents."
        else:
            payment_text = "☑ Paiement ponctuel (OOFF)"
            payment_desc = "Le mandat autorise un prélèvement unique."
        
        story.append(Paragraph(payment_text, self.styles['Normal']))
        story.append(Paragraph(payment_desc, self.styles['Body_Justified']))
        story.append(Spacer(1, 20))
        
        # ===== AUTORISATION =====
        story.append(Paragraph("AUTORISATION", self.styles['Section_Header']))
        story.append(Paragraph(
            f"En signant ce formulaire de mandat, vous autorisez <b>{FLOWTYM_INFO['name']}</b> à envoyer des instructions "
            f"à votre banque pour débiter votre compte, et votre banque à débiter votre compte conformément "
            f"aux instructions de <b>{FLOWTYM_INFO['name']}</b>.",
            self.styles['Body_Justified']
        ))
        story.append(Spacer(1, 10))
        story.append(Paragraph(
            "Vous bénéficiez du droit d'être remboursé par votre banque selon les conditions décrites dans "
            "la convention que vous avez passée avec elle. Une demande de remboursement doit être présentée "
            "dans les 8 semaines suivant la date de débit de votre compte pour un prélèvement autorisé.",
            self.styles['Body_Justified']
        ))
        story.append(Spacer(1, 20))
        
        # ===== NOTE =====
        story.append(Paragraph(
            "<i>Note : Vos droits concernant le présent mandat sont expliqués dans un document que vous pouvez "
            "obtenir auprès de votre banque.</i>",
            self.styles['Small_Text']
        ))
        story.append(Spacer(1, 30))
        
        # ===== SIGNATURE =====
        story.append(Paragraph("SIGNATURE DU DÉBITEUR", self.styles['Section_Header']))
        
        sig_data = [
            ['Lieu :', '__________________________'],
            ['Date :', '__________________________'],
            ['Signature :', ''],
            ['', ''],
            ['', ''],
            ['', ''],
        ]
        
        sig_table = Table(sig_data, colWidths=[4*cm, 8*cm])
        sig_table.setStyle(TableStyle([
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('BOTTOMPADDING', (0, -4), (-1, -1), 30),
            ('BOX', (0, 2), (1, -1), 1, colors.grey),
        ]))
        story.append(sig_table)
        
        # Build PDF
        doc.build(story)
        return buffer.getvalue()
    
    def generate_invoice_pdf(self, hotel_data: Dict, invoice_data: Dict) -> bytes:
        """
        Generate Invoice PDF
        
        Args:
            hotel_data: Hotel/client information
            invoice_data: Invoice details
            
        Returns:
            PDF bytes
        """
        buffer = BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=A4,
            rightMargin=2*cm,
            leftMargin=2*cm,
            topMargin=2*cm,
            bottomMargin=2*cm
        )
        
        story = []
        
        # ===== HEADER =====
        story.append(Paragraph("FACTURE", self.styles['Title_Custom']))
        story.append(Spacer(1, 10))
        
        # Invoice info
        invoice_number = invoice_data.get('number', f"FACT-{datetime.now().strftime('%Y%m')}-001")
        story.append(Paragraph(f"<b>Facture N° :</b> {invoice_number}", self.styles['Normal']))
        story.append(Paragraph(f"<b>Date d'émission :</b> {datetime.now().strftime('%d/%m/%Y')}", self.styles['Normal']))
        story.append(Paragraph(f"<b>Date d'échéance :</b> {invoice_data.get('due_date', '')}", self.styles['Normal']))
        story.append(Spacer(1, 20))
        
        # Two column header: Flowtym | Client
        header_data = [
            ['ÉMETTEUR', 'DESTINATAIRE'],
            [
                f"{FLOWTYM_INFO['name']}\n{FLOWTYM_INFO['address']}\n{FLOWTYM_INFO['postal_code']} {FLOWTYM_INFO['city']}\nSIRET: {FLOWTYM_INFO['siret']}\nTVA: {FLOWTYM_INFO['tva_intra']}",
                f"{hotel_data.get('legal_name', hotel_data.get('name', ''))}\n{hotel_data.get('address', '')}\n{hotel_data.get('postal_code', '')} {hotel_data.get('city', '')}\nSIRET: {hotel_data.get('siret', '')}"
            ]
        ]
        
        header_table = Table(header_data, colWidths=[8*cm, 8*cm])
        header_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#6B21A8')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#E9D5FF')),
            ('PADDING', (0, 0), (-1, -1), 10),
        ]))
        story.append(header_table)
        story.append(Spacer(1, 30))
        
        # ===== PERIOD =====
        period_start = invoice_data.get('period_start', '')
        period_end = invoice_data.get('period_end', '')
        story.append(Paragraph(f"<b>Période de facturation :</b> {period_start} au {period_end}", self.styles['Normal']))
        story.append(Spacer(1, 20))
        
        # ===== ITEMS =====
        plan_name = invoice_data.get('plan_name', 'Abonnement Flowtym')
        amount_ht = invoice_data.get('amount_ht', 0)
        tva_rate = 20.0
        tva = amount_ht * (tva_rate / 100)
        amount_ttc = amount_ht + tva
        
        items_data = [
            ['Description', 'Quantité', 'Prix HT', 'Total HT'],
            [f"Abonnement {plan_name}", '1', f"{amount_ht:.2f} €", f"{amount_ht:.2f} €"],
        ]
        
        items_table = Table(items_data, colWidths=[9*cm, 2*cm, 3*cm, 3*cm])
        items_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#F1F5F9')),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('ALIGN', (1, 0), (-1, -1), 'CENTER'),
            ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#E2E8F0')),
            ('PADDING', (0, 0), (-1, -1), 8),
        ]))
        story.append(items_table)
        story.append(Spacer(1, 20))
        
        # ===== TOTALS =====
        totals_data = [
            ['Total HT', f"{amount_ht:.2f} €"],
            [f'TVA ({tva_rate:.0f}%)', f"{tva:.2f} €"],
            ['Total TTC', f"{amount_ttc:.2f} €"],
        ]
        
        totals_table = Table(totals_data, colWidths=[5*cm, 3*cm])
        totals_table.setStyle(TableStyle([
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('ALIGN', (0, 0), (-1, -1), 'RIGHT'),
            ('FONTNAME', (0, -1), (-1, -1), 'Helvetica-Bold'),
            ('BACKGROUND', (0, -1), (-1, -1), colors.HexColor('#6B21A8')),
            ('TEXTCOLOR', (0, -1), (-1, -1), colors.white),
            ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#E2E8F0')),
            ('PADDING', (0, 0), (-1, -1), 8),
        ]))
        
        # Right align totals table
        totals_wrapper = Table([[totals_table]], colWidths=[17*cm])
        totals_wrapper.setStyle(TableStyle([
            ('ALIGN', (0, 0), (-1, -1), 'RIGHT'),
        ]))
        story.append(totals_wrapper)
        story.append(Spacer(1, 30))
        
        # ===== PAYMENT INFO =====
        story.append(Paragraph("MODALITÉS DE PAIEMENT", self.styles['Section_Header']))
        story.append(Paragraph(
            f"Paiement par prélèvement SEPA selon le mandat référencé ci-dessous.\n"
            f"ICS : {FLOWTYM_INFO['ics']}",
            self.styles['Body_Justified']
        ))
        story.append(Spacer(1, 20))
        
        # ===== BANK DETAILS =====
        bank_data = [
            ['Banque', 'BNP Paribas'],
            ['IBAN', FLOWTYM_INFO['iban']],
            ['BIC', FLOWTYM_INFO['bic']],
        ]
        
        bank_table = Table(bank_data, colWidths=[4*cm, 10*cm])
        bank_table.setStyle(TableStyle([
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#F5F3FF')),
            ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#E9D5FF')),
            ('PADDING', (0, 0), (-1, -1), 6),
        ]))
        story.append(bank_table)
        
        # Build PDF
        doc.build(story)
        return buffer.getvalue()


# Global instance
pdf_generator = PDFGenerator()
