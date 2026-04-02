# Satisfaction Survey Models for Flowtym
from pydantic import BaseModel, ConfigDict, Field
from typing import List, Optional, Dict, Any
from enum import Enum

# ═══════════════════════════════════════════════════════════════════════════════
# TRANSLATIONS - Multi-language support
# ═══════════════════════════════════════════════════════════════════════════════

SUPPORTED_LANGUAGES = {
    "fr": {"name": "Français", "flag": "🇫🇷"},
    "en": {"name": "English", "flag": "🇬🇧"},
    "es": {"name": "Español", "flag": "🇪🇸"},
    "it": {"name": "Italiano", "flag": "🇮🇹"},
    "ar": {"name": "العربية", "flag": "🇸🇦"},
    "zh": {"name": "中文", "flag": "🇨🇳"},
    "ja": {"name": "日本語", "flag": "🇯🇵"},
    "pt": {"name": "Português", "flag": "🇵🇹"},
    "de": {"name": "Deutsch", "flag": "🇩🇪"}
}

DEFAULT_SURVEY_TRANSLATIONS = {
    "fr": {
        "title": "Votre avis compte pour améliorer votre séjour dès maintenant",
        "subtitle": "Comment évaluez-vous votre expérience ?",
        "criteria": {
            "cleanliness": "🧹 Propreté de la chambre",
            "comfort": "🛏️ Confort",
            "equipment": "🧰 Équipements",
            "service": "🤝 Qualité du service"
        },
        "improvement_question": "Que pouvons-nous améliorer immédiatement ?",
        "improvement_placeholder": "Votre suggestion (facultatif)",
        "submit": "Envoyer",
        "thank_you": "Merci pour votre retour !",
        "thank_you_positive": "Nous sommes ravis que vous soyez satisfait ! Partagez votre expérience ?",
        "thank_you_negative": "Merci pour votre retour. Notre équipe va vous contacter rapidement.",
        "share_review": "Laisser un avis",
        "room": "Chambre"
    },
    "en": {
        "title": "Your feedback helps us improve your stay right now",
        "subtitle": "How do you rate your experience?",
        "criteria": {
            "cleanliness": "🧹 Room cleanliness",
            "comfort": "🛏️ Comfort",
            "equipment": "🧰 Equipment",
            "service": "🤝 Service quality"
        },
        "improvement_question": "What can we improve immediately?",
        "improvement_placeholder": "Your suggestion (optional)",
        "submit": "Submit",
        "thank_you": "Thank you for your feedback!",
        "thank_you_positive": "We're delighted you're satisfied! Share your experience?",
        "thank_you_negative": "Thank you for your feedback. Our team will contact you shortly.",
        "share_review": "Leave a review",
        "room": "Room"
    },
    "es": {
        "title": "Tu opinión nos ayuda a mejorar tu estancia ahora mismo",
        "subtitle": "¿Cómo calificas tu experiencia?",
        "criteria": {
            "cleanliness": "🧹 Limpieza de la habitación",
            "comfort": "🛏️ Comodidad",
            "equipment": "🧰 Equipamiento",
            "service": "🤝 Calidad del servicio"
        },
        "improvement_question": "¿Qué podemos mejorar de inmediato?",
        "improvement_placeholder": "Tu sugerencia (opcional)",
        "submit": "Enviar",
        "thank_you": "¡Gracias por tu opinión!",
        "thank_you_positive": "¡Nos alegra que estés satisfecho! ¿Comparte tu experiencia?",
        "thank_you_negative": "Gracias por tu opinión. Nuestro equipo te contactará pronto.",
        "share_review": "Dejar una reseña",
        "room": "Habitación"
    },
    "it": {
        "title": "Il tuo feedback ci aiuta a migliorare il tuo soggiorno subito",
        "subtitle": "Come valuti la tua esperienza?",
        "criteria": {
            "cleanliness": "🧹 Pulizia della camera",
            "comfort": "🛏️ Comfort",
            "equipment": "🧰 Attrezzature",
            "service": "🤝 Qualità del servizio"
        },
        "improvement_question": "Cosa possiamo migliorare subito?",
        "improvement_placeholder": "Il tuo suggerimento (facoltativo)",
        "submit": "Invia",
        "thank_you": "Grazie per il tuo feedback!",
        "thank_you_positive": "Siamo felici che tu sia soddisfatto! Condividi la tua esperienza?",
        "thank_you_negative": "Grazie per il tuo feedback. Il nostro team ti contatterà presto.",
        "share_review": "Lascia una recensione",
        "room": "Camera"
    },
    "ar": {
        "title": "رأيك يساعدنا على تحسين إقامتك الآن",
        "subtitle": "كيف تقيّم تجربتك؟",
        "criteria": {
            "cleanliness": "🧹 نظافة الغرفة",
            "comfort": "🛏️ الراحة",
            "equipment": "🧰 التجهيزات",
            "service": "🤝 جودة الخدمة"
        },
        "improvement_question": "ما الذي يمكننا تحسينه فوراً؟",
        "improvement_placeholder": "اقتراحك (اختياري)",
        "submit": "إرسال",
        "thank_you": "شكراً لملاحظاتك!",
        "thank_you_positive": "يسعدنا أنك راضٍ! شارك تجربتك؟",
        "thank_you_negative": "شكراً لملاحظاتك. سيتواصل معك فريقنا قريباً.",
        "share_review": "اترك تقييماً",
        "room": "غرفة"
    },
    "zh": {
        "title": "您的反馈帮助我们立即改善您的住宿体验",
        "subtitle": "您如何评价您的体验？",
        "criteria": {
            "cleanliness": "🧹 房间清洁度",
            "comfort": "🛏️ 舒适度",
            "equipment": "🧰 设施设备",
            "service": "🤝 服务质量"
        },
        "improvement_question": "我们可以立即改进什么？",
        "improvement_placeholder": "您的建议（可选）",
        "submit": "提交",
        "thank_you": "感谢您的反馈！",
        "thank_you_positive": "很高兴您满意！分享您的体验？",
        "thank_you_negative": "感谢您的反馈。我们的团队将尽快与您联系。",
        "share_review": "留下评价",
        "room": "房间"
    },
    "ja": {
        "title": "あなたのフィードバックが今すぐ滞在を改善します",
        "subtitle": "ご体験をどう評価されますか？",
        "criteria": {
            "cleanliness": "🧹 客室の清潔さ",
            "comfort": "🛏️ 快適さ",
            "equipment": "🧰 設備",
            "service": "🤝 サービスの質"
        },
        "improvement_question": "すぐに改善できることは？",
        "improvement_placeholder": "ご提案（任意）",
        "submit": "送信",
        "thank_you": "フィードバックありがとうございます！",
        "thank_you_positive": "ご満足いただけて嬉しいです！体験をシェアしませんか？",
        "thank_you_negative": "フィードバックありがとうございます。すぐにご連絡いたします。",
        "share_review": "レビューを書く",
        "room": "部屋"
    },
    "pt": {
        "title": "Sua opinião nos ajuda a melhorar sua estadia agora mesmo",
        "subtitle": "Como você avalia sua experiência?",
        "criteria": {
            "cleanliness": "🧹 Limpeza do quarto",
            "comfort": "🛏️ Conforto",
            "equipment": "🧰 Equipamentos",
            "service": "🤝 Qualidade do serviço"
        },
        "improvement_question": "O que podemos melhorar imediatamente?",
        "improvement_placeholder": "Sua sugestão (opcional)",
        "submit": "Enviar",
        "thank_you": "Obrigado pelo seu feedback!",
        "thank_you_positive": "Ficamos felizes que você esteja satisfeito! Compartilhe sua experiência?",
        "thank_you_negative": "Obrigado pelo seu feedback. Nossa equipe entrará em contato em breve.",
        "share_review": "Deixar uma avaliação",
        "room": "Quarto"
    },
    "de": {
        "title": "Ihr Feedback hilft uns, Ihren Aufenthalt sofort zu verbessern",
        "subtitle": "Wie bewerten Sie Ihre Erfahrung?",
        "criteria": {
            "cleanliness": "🧹 Sauberkeit des Zimmers",
            "comfort": "🛏️ Komfort",
            "equipment": "🧰 Ausstattung",
            "service": "🤝 Servicequalität"
        },
        "improvement_question": "Was können wir sofort verbessern?",
        "improvement_placeholder": "Ihr Vorschlag (optional)",
        "submit": "Absenden",
        "thank_you": "Vielen Dank für Ihr Feedback!",
        "thank_you_positive": "Wir freuen uns, dass Sie zufrieden sind! Teilen Sie Ihre Erfahrung?",
        "thank_you_negative": "Vielen Dank für Ihr Feedback. Unser Team wird Sie in Kürze kontaktieren.",
        "share_review": "Bewertung hinterlassen",
        "room": "Zimmer"
    }
}

# ═══════════════════════════════════════════════════════════════════════════════
# SURVEY CONFIG MODELS
# ═══════════════════════════════════════════════════════════════════════════════

class SurveyCriterion(BaseModel):
    key: str  # cleanliness, comfort, equipment, service
    weight: float = 1.0  # Poids dans le calcul du score global
    is_active: bool = True

class SurveyConfigCreate(BaseModel):
    """Configuration du formulaire de satisfaction pour un hôtel"""
    satisfaction_threshold: float = 4.0  # Seuil de satisfaction (≥4 = satisfait)
    criteria: List[SurveyCriterion] = [
        SurveyCriterion(key="cleanliness", weight=1.0),
        SurveyCriterion(key="comfort", weight=1.0),
        SurveyCriterion(key="equipment", weight=1.0),
        SurveyCriterion(key="service", weight=1.0)
    ]
    google_review_url: Optional[str] = None
    tripadvisor_url: Optional[str] = None
    booking_review_url: Optional[str] = None
    custom_review_urls: Dict[str, str] = {}  # {"platform_name": "url"}
    auto_escalation_enabled: bool = True  # Escalade automatique
    escalation_notification_emails: List[str] = []  # Emails pour alertes
    custom_translations: Dict[str, Dict[str, Any]] = {}  # Traductions personnalisées

class SurveyConfigResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    hotel_id: str
    satisfaction_threshold: float
    criteria: List[Dict[str, Any]]
    google_review_url: Optional[str] = None
    tripadvisor_url: Optional[str] = None
    booking_review_url: Optional[str] = None
    custom_review_urls: Dict[str, str]
    auto_escalation_enabled: bool
    escalation_notification_emails: List[str]
    custom_translations: Dict[str, Dict[str, Any]]
    created_at: str
    updated_at: str

# ═══════════════════════════════════════════════════════════════════════════════
# SURVEY RESPONSE MODELS
# ═══════════════════════════════════════════════════════════════════════════════

class SurveyResponseCreate(BaseModel):
    """Soumission d'un formulaire de satisfaction"""
    zone_id: str
    language: str = "fr"
    ratings: Dict[str, int]  # {"cleanliness": 4, "comfort": 5, ...}
    improvement_text: Optional[str] = None

class SurveyResponseModel(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    hotel_id: str
    zone_id: str
    zone_name: str
    room_number: Optional[str] = None
    language: str
    ratings: Dict[str, int]
    average_rating: float
    improvement_text: Optional[str] = None
    is_satisfied: bool  # average >= threshold
    status: str  # new, acknowledged, resolved, escalated
    escalation_ticket_id: Optional[str] = None
    acknowledged_by: Optional[str] = None
    acknowledged_at: Optional[str] = None
    resolved_by: Optional[str] = None
    resolved_at: Optional[str] = None
    resolution_notes: Optional[str] = None
    created_at: str

class SurveyAcknowledge(BaseModel):
    notes: Optional[str] = None

class SurveyResolve(BaseModel):
    resolution_notes: str

# ═══════════════════════════════════════════════════════════════════════════════
# ESCALATION TICKET MODELS
# ═══════════════════════════════════════════════════════════════════════════════

class EscalationPriority(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

class EscalationTicketResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    hotel_id: str
    survey_id: str
    room_number: Optional[str] = None
    priority: str
    average_rating: float
    improvement_text: Optional[str] = None
    status: str  # open, in_progress, resolved, closed
    assigned_to: Optional[str] = None
    assigned_to_name: Optional[str] = None
    resolution_notes: Optional[str] = None
    created_at: str
    updated_at: str

# ═══════════════════════════════════════════════════════════════════════════════
# STATS MODELS
# ═══════════════════════════════════════════════════════════════════════════════

class SatisfactionStatsResponse(BaseModel):
    hotel_id: str
    period_start: str
    period_end: str
    total_responses: int
    satisfied_count: int
    unsatisfied_count: int
    satisfaction_rate: float
    average_rating: float
    ratings_by_criterion: Dict[str, float]
    pending_escalations: int
    response_trend: List[Dict[str, Any]]  # Daily trend
