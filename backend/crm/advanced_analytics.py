"""
CRM Advanced Analytics Module
Includes:
- Retention cohort analysis
- LTV calculations and predictions
- AI-powered attrition risk scoring using GPT
"""

from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone, timedelta
from dateutil.relativedelta import relativedelta
import os
import uuid
from dotenv import load_dotenv

load_dotenv()

# ===================== MODELS =====================

class PeriodFilter(BaseModel):
    """Period filter for analytics"""
    type: str = "6m"  # "6m", "12m", "custom"
    start_date: Optional[str] = None
    end_date: Optional[str] = None

class RetentionCohort(BaseModel):
    """Retention cohort data"""
    cohort_month: str
    initial_clients: int
    retention_30d: float
    retention_60d: float
    retention_90d: float
    retention_180d: float

class LTVData(BaseModel):
    """LTV analytics data"""
    segment: str
    avg_ltv: float
    total_revenue: float
    client_count: int

class AttritionRisk(BaseModel):
    """Client attrition risk assessment"""
    client_id: str
    client_name: str
    email: str
    risk_score: int  # 0-100
    risk_level: str  # "low", "medium", "high", "critical"
    days_since_last_stay: int
    total_stays: int
    total_spent: float
    risk_factors: List[str]
    ai_analysis: str
    recommended_actions: List[str]

class AdvancedAnalyticsResponse(BaseModel):
    """Complete advanced analytics response"""
    period: Dict[str, str]
    retention_cohorts: List[RetentionCohort]
    ltv_by_segment: List[LTVData]
    ltv_trend: List[Dict[str, Any]]
    top_clients_by_ltv: List[Dict[str, Any]]
    attrition_risks: List[AttritionRisk]
    summary_kpis: Dict[str, Any]


# ===================== HELPER FUNCTIONS =====================

def calculate_period_dates(period_filter: PeriodFilter) -> tuple:
    """Calculate start and end dates based on period filter"""
    now = datetime.now(timezone.utc)
    
    if period_filter.type == "6m":
        start_date = now - relativedelta(months=6)
        end_date = now
    elif period_filter.type == "12m":
        start_date = now - relativedelta(months=12)
        end_date = now
    elif period_filter.type == "custom" and period_filter.start_date and period_filter.end_date:
        # Parse custom dates and ensure they have timezone info
        start_str = period_filter.start_date
        end_str = period_filter.end_date
        
        # Handle various date formats
        if 'Z' in start_str:
            start_date = datetime.fromisoformat(start_str.replace('Z', '+00:00'))
        elif '+' in start_str or start_str.endswith('00:00'):
            start_date = datetime.fromisoformat(start_str)
        else:
            # No timezone info - assume UTC
            start_date = datetime.fromisoformat(start_str).replace(tzinfo=timezone.utc)
        
        if 'Z' in end_str:
            end_date = datetime.fromisoformat(end_str.replace('Z', '+00:00'))
        elif '+' in end_str or end_str.endswith('00:00'):
            end_date = datetime.fromisoformat(end_str)
        else:
            # No timezone info - assume UTC
            end_date = datetime.fromisoformat(end_str).replace(tzinfo=timezone.utc)
    else:
        start_date = now - relativedelta(months=6)
        end_date = now
    
    return start_date, end_date


async def calculate_retention_cohorts(db, start_date: datetime, end_date: datetime) -> List[RetentionCohort]:
    """Calculate retention by cohort (month of first stay)"""
    cohorts = []
    
    # Get all clients with their stays
    clients = await db.crm_clients.find({}, {"_id": 0}).to_list(10000)
    
    # Group clients by their creation month (cohort)
    cohort_data = {}
    
    for client in clients:
        created_str = client.get("created_at", "")
        if not created_str:
            continue
        
        try:
            created_date = datetime.fromisoformat(created_str.replace('Z', '+00:00'))
        except:
            continue
        
        # Check if within period
        if created_date < start_date or created_date > end_date:
            continue
        
        cohort_key = created_date.strftime("%Y-%m")
        
        if cohort_key not in cohort_data:
            cohort_data[cohort_key] = {
                "initial": 0,
                "returned_30d": 0,
                "returned_60d": 0,
                "returned_90d": 0,
                "returned_180d": 0
            }
        
        cohort_data[cohort_key]["initial"] += 1
        
        # Check if client returned (based on total_stays or last_stay)
        total_stays = client.get("total_stays", 1)
        last_stay_str = client.get("last_stay")
        
        if total_stays > 1 and last_stay_str:
            try:
                last_stay = datetime.fromisoformat(last_stay_str.replace('Z', '+00:00'))
                days_diff = (last_stay - created_date).days
                
                if days_diff <= 30:
                    cohort_data[cohort_key]["returned_30d"] += 1
                if days_diff <= 60:
                    cohort_data[cohort_key]["returned_60d"] += 1
                if days_diff <= 90:
                    cohort_data[cohort_key]["returned_90d"] += 1
                if days_diff <= 180:
                    cohort_data[cohort_key]["returned_180d"] += 1
            except:
                pass
    
    # Convert to cohort objects
    for month, data in sorted(cohort_data.items()):
        initial = data["initial"]
        if initial > 0:
            cohorts.append(RetentionCohort(
                cohort_month=month,
                initial_clients=initial,
                retention_30d=round(data["returned_30d"] / initial * 100, 1),
                retention_60d=round(data["returned_60d"] / initial * 100, 1),
                retention_90d=round(data["returned_90d"] / initial * 100, 1),
                retention_180d=round(data["returned_180d"] / initial * 100, 1)
            ))
    
    return cohorts


async def calculate_ltv_analytics(db, start_date: datetime, end_date: datetime) -> tuple:
    """Calculate LTV by segment and trends"""
    clients = await db.crm_clients.find({}, {"_id": 0}).to_list(10000)
    
    # LTV by segment (client_type)
    segment_data = {}
    
    for client in clients:
        client_type = client.get("client_type", "regular")
        total_spent = client.get("total_spent", 0) or 0
        
        if client_type not in segment_data:
            segment_data[client_type] = {"total": 0, "count": 0}
        
        segment_data[client_type]["total"] += total_spent
        segment_data[client_type]["count"] += 1
    
    ltv_by_segment = []
    for segment, data in segment_data.items():
        if data["count"] > 0:
            ltv_by_segment.append(LTVData(
                segment=segment,
                avg_ltv=round(data["total"] / data["count"], 2),
                total_revenue=data["total"],
                client_count=data["count"]
            ))
    
    # Sort by average LTV descending
    ltv_by_segment.sort(key=lambda x: x.avg_ltv, reverse=True)
    
    # Top 10 clients by LTV
    clients_sorted = sorted(clients, key=lambda x: x.get("total_spent", 0) or 0, reverse=True)[:10]
    top_clients = [
        {
            "id": c.get("id"),
            "name": f"{c.get('first_name', '')} {c.get('last_name', '')}".strip(),
            "email": c.get("email"),
            "total_spent": c.get("total_spent", 0),
            "total_stays": c.get("total_stays", 0),
            "client_type": c.get("client_type", "regular")
        }
        for c in clients_sorted
    ]
    
    # LTV trend over months (simulated based on created_at)
    ltv_trend = []
    current = start_date
    while current <= end_date:
        month_key = current.strftime("%Y-%m")
        
        # Filter clients created up to this month
        month_total = 0
        month_count = 0
        
        for client in clients:
            created_str = client.get("created_at", "")
            if created_str:
                try:
                    created_date = datetime.fromisoformat(created_str.replace('Z', '+00:00'))
                    if created_date <= current:
                        month_total += client.get("total_spent", 0) or 0
                        month_count += 1
                except:
                    pass
        
        ltv_trend.append({
            "month": month_key,
            "avg_ltv": round(month_total / month_count, 2) if month_count > 0 else 0,
            "total_clients": month_count
        })
        
        current += relativedelta(months=1)
    
    return ltv_by_segment, top_clients, ltv_trend


async def analyze_attrition_with_ai(db, clients_at_risk: List[dict]) -> List[AttritionRisk]:
    """Use GPT to analyze attrition risk and provide recommendations"""
    from emergentintegrations.llm.chat import LlmChat, UserMessage
    
    api_key = os.environ.get("EMERGENT_LLM_KEY")
    results = []
    
    for client in clients_at_risk:
        # Calculate risk factors
        risk_factors = []
        risk_score = 0
        
        days_since = client.get("days_since_last_stay", 999)
        total_stays = client.get("total_stays", 0)
        total_spent = client.get("total_spent", 0)
        loyalty_score = client.get("loyalty_score", 50)
        
        # Factor 1: Days since last stay
        if days_since > 365:
            risk_factors.append("Plus de 12 mois sans séjour")
            risk_score += 35
        elif days_since > 180:
            risk_factors.append("Plus de 6 mois sans séjour")
            risk_score += 25
        elif days_since > 90:
            risk_factors.append("Plus de 3 mois sans séjour")
            risk_score += 15
        
        # Factor 2: Low engagement (few stays)
        if total_stays == 1:
            risk_factors.append("Client one-shot (1 seul séjour)")
            risk_score += 20
        elif total_stays < 3:
            risk_factors.append("Faible récurrence (<3 séjours)")
            risk_score += 10
        
        # Factor 3: Low loyalty score
        if loyalty_score < 30:
            risk_factors.append("Score fidélité faible (<30)")
            risk_score += 15
        elif loyalty_score < 50:
            risk_factors.append("Score fidélité moyen (<50)")
            risk_score += 8
        
        # Factor 4: Low spending (LTV)
        if total_spent < 200:
            risk_factors.append("Faible valeur client (<200€)")
            risk_score += 10
        
        # Cap at 100
        risk_score = min(risk_score, 100)
        
        # Determine risk level
        if risk_score >= 70:
            risk_level = "critical"
        elif risk_score >= 50:
            risk_level = "high"
        elif risk_score >= 30:
            risk_level = "medium"
        else:
            risk_level = "low"
        
        # Use GPT for AI analysis (only for high/critical risk)
        ai_analysis = ""
        recommended_actions = []
        
        if risk_score >= 50 and api_key:
            try:
                chat = LlmChat(
                    api_key=api_key,
                    session_id=f"attrition-{client.get('id', 'unknown')}",
                    system_message="""Tu es un expert CRM hôtelier. Analyse le profil client et donne:
1. Une brève analyse du risque d'attrition (2-3 phrases en français)
2. 3 actions concrètes pour réengager ce client

Réponds en JSON avec ce format:
{"analysis": "...", "actions": ["action1", "action2", "action3"]}"""
                ).with_model("openai", "gpt-4o")
                
                client_profile = f"""
Profil client:
- Nom: {client.get('first_name', '')} {client.get('last_name', '')}
- Type: {client.get('client_type', 'regular')}
- Total séjours: {total_stays}
- Dépenses totales: {total_spent}€
- Score fidélité: {loyalty_score}/100
- Jours depuis dernier séjour: {days_since}
- Facteurs de risque identifiés: {', '.join(risk_factors)}
"""
                
                user_message = UserMessage(text=client_profile)
                response = await chat.send_message(user_message)
                
                # Parse JSON response
                import json
                # Extract JSON from response
                try:
                    json_str = response
                    if "```json" in json_str:
                        json_str = json_str.split("```json")[1].split("```")[0]
                    elif "```" in json_str:
                        json_str = json_str.split("```")[1].split("```")[0]
                    
                    parsed = json.loads(json_str.strip())
                    ai_analysis = parsed.get("analysis", "")
                    recommended_actions = parsed.get("actions", [])
                except:
                    ai_analysis = response[:500] if response else ""
                    recommended_actions = [
                        "Envoyer une offre de bienvenue personnalisée",
                        "Appeler le client pour comprendre ses besoins",
                        "Proposer un programme de fidélité"
                    ]
            except Exception as e:
                ai_analysis = f"Analyse non disponible: {str(e)[:100]}"
                recommended_actions = [
                    "Envoyer une campagne de réactivation",
                    "Offrir une remise sur le prochain séjour",
                    "Demander un feedback sur l'expérience précédente"
                ]
        else:
            # Default recommendations for lower risk
            if risk_level == "medium":
                recommended_actions = [
                    "Envoyer une newsletter avec les nouveautés",
                    "Proposer une offre saisonnière",
                    "Inviter à rejoindre le programme fidélité"
                ]
            else:
                recommended_actions = [
                    "Maintenir la communication régulière",
                    "Envoyer des offres personnalisées"
                ]
            ai_analysis = f"Client à risque {risk_level} - {len(risk_factors)} facteur(s) identifié(s)."
        
        results.append(AttritionRisk(
            client_id=client.get("id", ""),
            client_name=f"{client.get('first_name', '')} {client.get('last_name', '')}".strip(),
            email=client.get("email", ""),
            risk_score=risk_score,
            risk_level=risk_level,
            days_since_last_stay=days_since,
            total_stays=total_stays,
            total_spent=total_spent,
            risk_factors=risk_factors,
            ai_analysis=ai_analysis,
            recommended_actions=recommended_actions
        ))
    
    # Sort by risk score descending
    results.sort(key=lambda x: x.risk_score, reverse=True)
    
    return results


async def get_clients_at_risk(db, limit: int = 20) -> List[dict]:
    """Get clients potentially at risk of churning"""
    now = datetime.now(timezone.utc)
    
    clients = await db.crm_clients.find(
        {"status": "active"},
        {"_id": 0}
    ).to_list(10000)
    
    clients_with_risk = []
    
    for client in clients:
        last_stay_str = client.get("last_stay")
        
        if last_stay_str:
            try:
                last_stay = datetime.fromisoformat(last_stay_str.replace('Z', '+00:00'))
                days_since = (now - last_stay).days
            except:
                days_since = 999
        else:
            # No last stay recorded
            created_str = client.get("created_at", "")
            if created_str:
                try:
                    created = datetime.fromisoformat(created_str.replace('Z', '+00:00'))
                    days_since = (now - created).days
                except:
                    days_since = 999
            else:
                days_since = 999
        
        client["days_since_last_stay"] = days_since
        
        # Include if potentially at risk (more than 60 days)
        if days_since > 60:
            clients_with_risk.append(client)
    
    # Sort by days since last stay (descending) and take top N
    clients_with_risk.sort(key=lambda x: x.get("days_since_last_stay", 0), reverse=True)
    
    return clients_with_risk[:limit]
