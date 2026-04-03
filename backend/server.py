from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr, ConfigDict
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
import jwt
import bcrypt

# Import ConfigService for PMS integration
from shared.config_service import get_config_service, ConfigService

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Configuration
JWT_SECRET = os.environ.get('JWT_SECRET', 'flowtym-secret-key-2024')
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24

security = HTTPBearer()

# Create the main app
app = FastAPI(title="Flowtym PMS API", version="1.0.0")
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# ===================== MODELS =====================

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    first_name: str
    last_name: str
    role: str = "receptionist"  # admin, manager, receptionist, housekeeping

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    email: str
    first_name: str
    last_name: str
    role: str
    hotel_id: Optional[str] = None
    created_at: Optional[str] = None

class HotelCreate(BaseModel):
    name: str
    address: Optional[str] = None
    city: Optional[str] = None
    country: str = "France"
    phone: Optional[str] = None
    email: Optional[EmailStr] = None
    stars: int = 3
    timezone: str = "Europe/Paris"

class HotelResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    name: str
    address: Optional[str] = None
    city: Optional[str] = None
    country: str
    phone: Optional[str] = None
    email: Optional[str] = None
    stars: int
    timezone: str
    created_at: str

class RoomCreate(BaseModel):
    number: str
    room_type: str  # single, double, twin, suite, family
    floor: int = 1
    max_occupancy: int = 2
    base_price: float = 100.0
    amenities: List[str] = []
    status: str = "available"  # available, occupied, cleaning, maintenance, out_of_service

class RoomResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    hotel_id: str
    number: str
    room_type: str
    floor: int
    max_occupancy: int
    base_price: float
    amenities: List[str]
    status: str
    created_at: str

class ClientCreate(BaseModel):
    first_name: str
    last_name: str
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    country: str = "France"
    language: str = "fr"
    birth_date: Optional[str] = None
    id_type: Optional[str] = None  # passport, id_card, driver_license
    id_number: Optional[str] = None
    company: Optional[str] = None
    vat_number: Optional[str] = None
    tags: List[str] = []
    preferences: Dict[str, Any] = {}
    notes: Optional[str] = None

class ClientResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    hotel_id: str
    first_name: str
    last_name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    country: str
    language: str
    birth_date: Optional[str] = None
    id_type: Optional[str] = None
    id_number: Optional[str] = None
    company: Optional[str] = None
    vat_number: Optional[str] = None
    tags: List[str]
    preferences: Dict[str, Any]
    notes: Optional[str] = None
    total_stays: int = 0
    total_revenue: float = 0.0
    created_at: str

class ReservationCreate(BaseModel):
    client_id: str
    room_id: str
    check_in: str  # ISO date format
    check_out: str
    adults: int = 1
    children: int = 0
    channel: str = "direct"  # direct, booking_com, expedia, airbnb, other
    rate_type: str = "standard"  # standard, flex, non_refundable, corporate
    room_rate: Optional[float] = None  # Optional: Will be calculated from ConfigService if not provided
    total_amount: Optional[float] = None  # Optional: Will be calculated from ConfigService if not provided
    notes: Optional[str] = None
    special_requests: Optional[str] = None
    source: Optional[str] = None  # website, phone, walk-in, ota
    room_type_code: Optional[str] = None  # Room type from Configuration (STD, DLX, STE, etc.)
    rate_plan_code: Optional[str] = None  # Rate plan from Configuration (BAR, NRF, etc.)

class ReservationUpdate(BaseModel):
    room_id: Optional[str] = None
    check_in: Optional[str] = None
    check_out: Optional[str] = None
    adults: Optional[int] = None
    children: Optional[int] = None
    status: Optional[str] = None
    room_rate: Optional[float] = None
    total_amount: Optional[float] = None
    notes: Optional[str] = None
    special_requests: Optional[str] = None

class ReservationResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    hotel_id: str
    client_id: str
    client_name: str
    client_email: Optional[str] = None
    room_id: str
    room_number: str
    room_type: str
    check_in: str
    check_out: str
    nights: int
    adults: int
    children: int
    status: str  # pending, confirmed, checked_in, checked_out, cancelled, no_show
    channel: str
    rate_type: str
    room_rate: float
    total_amount: float
    paid_amount: float
    balance: float
    notes: Optional[str] = None
    special_requests: Optional[str] = None
    source: Optional[str] = None
    created_at: str
    updated_at: str

class InvoiceLineCreate(BaseModel):
    description: str
    quantity: int = 1
    unit_price: float
    vat_rate: float = 10.0
    category: str = "room"  # room, breakfast, extra, tax, discount

class InvoiceCreate(BaseModel):
    reservation_id: str
    lines: List[InvoiceLineCreate] = []

class InvoiceResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    hotel_id: str
    reservation_id: str
    client_id: str
    client_name: str
    invoice_number: str
    lines: List[Dict[str, Any]]
    subtotal: float
    vat_total: float
    total: float
    status: str  # draft, sent, paid, cancelled
    payment_method: Optional[str] = None
    paid_at: Optional[str] = None
    created_at: str

class PaymentCreate(BaseModel):
    reservation_id: str
    amount: float
    method: str = "card"  # card, cash, transfer, check
    reference: Optional[str] = None
    notes: Optional[str] = None

class PaymentResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    hotel_id: str
    reservation_id: str
    invoice_id: Optional[str] = None
    amount: float
    method: str
    reference: Optional[str] = None
    notes: Optional[str] = None
    status: str  # pending, completed, failed, refunded
    created_at: str

class NightAuditCreate(BaseModel):
    date: str  # ISO date for which audit is being done
    notes: Optional[str] = None

class NightAuditResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    hotel_id: str
    date: str
    status: str  # in_progress, completed
    total_rooms: int
    occupied_rooms: int
    occupancy_rate: float
    arrivals: int
    departures: int
    no_shows: int
    revenue: float
    adr: float
    revpar: float
    completed_by: Optional[str] = None
    completed_at: Optional[str] = None
    notes: Optional[str] = None
    created_at: str

# ===================== AUTH HELPERS =====================

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_token(user_id: str, email: str, role: str, hotel_id: str = None) -> str:
    payload = {
        "user_id": user_id,
        "email": email,
        "role": role,
        "hotel_id": hotel_id,
        "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        token = credentials.credentials
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expiré")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Token invalide")

def verify_token(token: str):
    """Simple token verification helper"""
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expiré")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Token invalide")

# ===================== AUTH ROUTES =====================

@api_router.post("/auth/register", response_model=dict)
async def register(user: UserCreate):
    existing = await db.users.find_one({"email": user.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email déjà utilisé")
    
    user_id = str(uuid.uuid4())
    user_doc = {
        "id": user_id,
        "email": user.email,
        "password": hash_password(user.password),
        "first_name": user.first_name,
        "last_name": user.last_name,
        "role": user.role,
        "hotel_id": None,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.users.insert_one(user_doc)
    
    token = create_token(user_id, user.email, user.role)
    return {
        "token": token,
        "user": {
            "id": user_id,
            "email": user.email,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "role": user.role
        }
    }

@api_router.post("/auth/login", response_model=dict)
async def login(credentials: UserLogin):
    user = await db.users.find_one({"email": credentials.email}, {"_id": 0})
    if not user or not verify_password(credentials.password, user["password"]):
        raise HTTPException(status_code=401, detail="Email ou mot de passe incorrect")
    
    token = create_token(user["id"], user["email"], user["role"], user.get("hotel_id"))
    return {
        "token": token,
        "user": {
            "id": user["id"],
            "email": user["email"],
            "first_name": user["first_name"],
            "last_name": user["last_name"],
            "role": user["role"],
            "hotel_id": user.get("hotel_id")
        }
    }

# Super Admin Registration (secured with secret key)
class SuperAdminCreate(BaseModel):
    email: EmailStr
    password: str
    first_name: str
    last_name: str
    secret_key: str

@api_router.post("/auth/register-superadmin")
async def register_superadmin(user: SuperAdminCreate):
    """Register a Super Admin (requires secret key)"""
    # Verify secret key
    SUPERADMIN_SECRET = os.environ.get('SUPERADMIN_SECRET', 'flowtym-superadmin-2024')
    if user.secret_key != SUPERADMIN_SECRET:
        raise HTTPException(status_code=403, detail="Clé secrète invalide")
    
    # Check if email exists
    existing = await db.users.find_one({"email": user.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email déjà utilisé")
    
    user_id = str(uuid.uuid4())
    user_doc = {
        "id": user_id,
        "email": user.email,
        "password": hash_password(user.password),
        "first_name": user.first_name,
        "last_name": user.last_name,
        "role": "super_admin",
        "hotel_id": None,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.users.insert_one(user_doc)
    
    token = create_token(user_id, user.email, "super_admin")
    return {
        "token": token,
        "user": {
            "id": user_id,
            "email": user.email,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "role": "super_admin"
        }
    }

@api_router.get("/auth/me", response_model=UserResponse)
async def get_me(current_user: dict = Depends(get_current_user)):
    user = await db.users.find_one({"id": current_user["user_id"]}, {"_id": 0, "password": 0})
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur non trouvé")
    # Convert datetime to string if needed
    if user.get("created_at") and hasattr(user["created_at"], "isoformat"):
        user["created_at"] = user["created_at"].isoformat()
    return UserResponse(**user)

# ===================== HOTELS ROUTES =====================

@api_router.post("/hotels", response_model=HotelResponse)
async def create_hotel(hotel: HotelCreate, current_user: dict = Depends(get_current_user)):
    hotel_id = str(uuid.uuid4())
    hotel_doc = {
        "id": hotel_id,
        **hotel.model_dump(),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.hotels.insert_one(hotel_doc)
    
    # Update user's hotel_id
    await db.users.update_one(
        {"id": current_user["user_id"]},
        {"$set": {"hotel_id": hotel_id}}
    )
    
    return HotelResponse(**hotel_doc)

@api_router.get("/hotels", response_model=List[HotelResponse])
async def get_hotels(current_user: dict = Depends(get_current_user)):
    hotels = await db.hotels.find({}, {"_id": 0}).to_list(100)
    return [HotelResponse(**h) for h in hotels]

@api_router.get("/hotels/{hotel_id}", response_model=HotelResponse)
async def get_hotel(hotel_id: str, current_user: dict = Depends(get_current_user)):
    hotel = await db.hotels.find_one({"id": hotel_id}, {"_id": 0})
    if not hotel:
        raise HTTPException(status_code=404, detail="Hôtel non trouvé")
    return HotelResponse(**hotel)

# ===================== ROOMS ROUTES =====================

@api_router.post("/hotels/{hotel_id}/rooms", response_model=RoomResponse)
async def create_room(hotel_id: str, room: RoomCreate, current_user: dict = Depends(get_current_user)):
    existing = await db.rooms.find_one({"hotel_id": hotel_id, "number": room.number})
    if existing:
        raise HTTPException(status_code=400, detail="Numéro de chambre déjà utilisé")
    
    room_id = str(uuid.uuid4())
    room_doc = {
        "id": room_id,
        "hotel_id": hotel_id,
        **room.model_dump(),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.rooms.insert_one(room_doc)
    return RoomResponse(**room_doc)

@api_router.get("/hotels/{hotel_id}/rooms", response_model=List[RoomResponse])
async def get_rooms(hotel_id: str, current_user: dict = Depends(get_current_user)):
    rooms = await db.rooms.find({"hotel_id": hotel_id}, {"_id": 0}).sort("number", 1).to_list(500)
    return [RoomResponse(**r) for r in rooms]

@api_router.put("/hotels/{hotel_id}/rooms/{room_id}", response_model=RoomResponse)
async def update_room(hotel_id: str, room_id: str, room: RoomCreate, current_user: dict = Depends(get_current_user)):
    result = await db.rooms.update_one(
        {"id": room_id, "hotel_id": hotel_id},
        {"$set": room.model_dump()}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Chambre non trouvée")
    
    updated = await db.rooms.find_one({"id": room_id}, {"_id": 0})
    return RoomResponse(**updated)

@api_router.patch("/hotels/{hotel_id}/rooms/{room_id}/status", response_model=RoomResponse)
async def update_room_status(hotel_id: str, room_id: str, status: str, current_user: dict = Depends(get_current_user)):
    result = await db.rooms.update_one(
        {"id": room_id, "hotel_id": hotel_id},
        {"$set": {"status": status}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Chambre non trouvée")
    
    updated = await db.rooms.find_one({"id": room_id}, {"_id": 0})
    return RoomResponse(**updated)

# ===================== CLIENTS ROUTES =====================

@api_router.post("/hotels/{hotel_id}/clients", response_model=ClientResponse)
async def create_client(hotel_id: str, client: ClientCreate, current_user: dict = Depends(get_current_user)):
    client_id = str(uuid.uuid4())
    client_doc = {
        "id": client_id,
        "hotel_id": hotel_id,
        **client.model_dump(),
        "total_stays": 0,
        "total_revenue": 0.0,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.clients.insert_one(client_doc)
    return ClientResponse(**client_doc)

@api_router.get("/hotels/{hotel_id}/clients", response_model=List[ClientResponse])
async def get_clients(
    hotel_id: str, 
    search: Optional[str] = None,
    tag: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    query = {"hotel_id": hotel_id}
    if search:
        query["$or"] = [
            {"first_name": {"$regex": search, "$options": "i"}},
            {"last_name": {"$regex": search, "$options": "i"}},
            {"email": {"$regex": search, "$options": "i"}}
        ]
    if tag:
        query["tags"] = tag
    
    clients = await db.clients.find(query, {"_id": 0}).sort("last_name", 1).to_list(1000)
    return [ClientResponse(**c) for c in clients]

@api_router.get("/hotels/{hotel_id}/clients/{client_id}", response_model=ClientResponse)
async def get_client(hotel_id: str, client_id: str, current_user: dict = Depends(get_current_user)):
    client = await db.clients.find_one({"id": client_id, "hotel_id": hotel_id}, {"_id": 0})
    if not client:
        raise HTTPException(status_code=404, detail="Client non trouvé")
    return ClientResponse(**client)

@api_router.put("/hotels/{hotel_id}/clients/{client_id}", response_model=ClientResponse)
async def update_client(hotel_id: str, client_id: str, client: ClientCreate, current_user: dict = Depends(get_current_user)):
    result = await db.clients.update_one(
        {"id": client_id, "hotel_id": hotel_id},
        {"$set": client.model_dump()}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Client non trouvé")
    
    updated = await db.clients.find_one({"id": client_id}, {"_id": 0})
    return ClientResponse(**updated)

# ===================== RESERVATIONS ROUTES =====================

@api_router.post("/hotels/{hotel_id}/reservations", response_model=ReservationResponse)
async def create_reservation(hotel_id: str, reservation: ReservationCreate, current_user: dict = Depends(get_current_user)):
    """
    Create a new reservation.
    Integrates with ConfigService for room type validation and pricing.
    """
    # Validate client exists
    client = await db.clients.find_one({"id": reservation.client_id, "hotel_id": hotel_id}, {"_id": 0})
    if not client:
        raise HTTPException(status_code=404, detail="Client non trouvé")
    
    # Validate room exists
    room = await db.rooms.find_one({"id": reservation.room_id, "hotel_id": hotel_id}, {"_id": 0})
    if not room:
        raise HTTPException(status_code=404, detail="Chambre non trouvée")
    
    # ═══════════════════════════════════════════════════════════════════════════════
    # INTEGRATION ConfigService - Validate room type and get pricing
    # ═══════════════════════════════════════════════════════════════════════════════
    config_service = None
    room_type_config = None
    rate_plan_config = None
    calculated_rate = None
    
    try:
        config_service = get_config_service()
        
        # Get room type from Configuration module if code provided
        if reservation.room_type_code:
            room_type_config = await config_service.get_room_type_by_code(hotel_id, reservation.room_type_code)
            if not room_type_config:
                logger.warning(f"Room type code '{reservation.room_type_code}' not found in config, using room data")
        
        # Get rate plan from Configuration if code provided
        if reservation.rate_plan_code:
            rate_plan_config = await config_service.get_rate_plan_by_code(hotel_id, reservation.rate_plan_code)
            if not rate_plan_config:
                logger.warning(f"Rate plan code '{reservation.rate_plan_code}' not found in config")
        
        # Calculate price from pricing matrix if not provided
        if reservation.room_rate is None or reservation.total_amount is None:
            pricing_matrix = await config_service.get_pricing_matrix(hotel_id)
            
            # Determine room type code
            rt_code = reservation.room_type_code or room.get("room_type", "STD").upper()
            rp_code = reservation.rate_plan_code or "BAR"
            
            # Get price from matrix
            if rp_code in pricing_matrix and rt_code in pricing_matrix[rp_code]:
                calculated_rate = pricing_matrix[rp_code][rt_code]
                logger.info(f"Got price from ConfigService: {rp_code}/{rt_code} = {calculated_rate}€")
            elif room_type_config:
                calculated_rate = room_type_config.get("base_price", 100)
                logger.info(f"Using base_price from room_type config: {calculated_rate}€")
            else:
                calculated_rate = room.get("base_price", 100)
                logger.info(f"Using room base_price: {calculated_rate}€")
                
    except Exception as e:
        logger.warning(f"ConfigService not available or error: {e}. Using room base_price.")
        calculated_rate = room.get("base_price", 100)
    
    # ═══════════════════════════════════════════════════════════════════════════════
    # Calculate final pricing
    # ═══════════════════════════════════════════════════════════════════════════════
    check_in = datetime.fromisoformat(reservation.check_in.replace('Z', '+00:00'))
    check_out = datetime.fromisoformat(reservation.check_out.replace('Z', '+00:00'))
    # Use date() to calculate calendar nights (not time-based difference)
    nights = (check_out.date() - check_in.date()).days
    
    # Use provided rate or calculated rate
    final_room_rate = reservation.room_rate if reservation.room_rate is not None else calculated_rate
    final_total_amount = reservation.total_amount if reservation.total_amount is not None else (final_room_rate * nights)
    
    # Check availability
    conflict = await db.reservations.find_one({
        "room_id": reservation.room_id,
        "status": {"$nin": ["cancelled", "no_show"]},
        "$or": [
            {"check_in": {"$lt": reservation.check_out, "$gte": reservation.check_in}},
            {"check_out": {"$gt": reservation.check_in, "$lte": reservation.check_out}},
            {"$and": [{"check_in": {"$lte": reservation.check_in}}, {"check_out": {"$gte": reservation.check_out}}]}
        ]
    })
    if conflict:
        raise HTTPException(status_code=400, detail="La chambre n'est pas disponible pour ces dates")
    
    # Determine room type name from config or room data
    room_type_name = room_type_config.get("name") if room_type_config else room.get("room_type", "Standard")
    
    reservation_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    reservation_doc = {
        "id": reservation_id,
        "hotel_id": hotel_id,
        "client_id": reservation.client_id,
        "room_id": reservation.room_id,
        "check_in": reservation.check_in,
        "check_out": reservation.check_out,
        "adults": reservation.adults,
        "children": reservation.children,
        "channel": reservation.channel,
        "rate_type": reservation.rate_type,
        "room_rate": final_room_rate,
        "total_amount": final_total_amount,
        "notes": reservation.notes,
        "special_requests": reservation.special_requests,
        "source": reservation.source,
        "client_name": f"{client['first_name']} {client['last_name']}",
        "client_email": client.get("email"),
        "room_number": room["number"],
        "room_type": room_type_name,
        "room_type_code": reservation.room_type_code or room.get("room_type", "STD").upper()[:3],
        "rate_plan_code": reservation.rate_plan_code or "BAR",
        "nights": nights,
        "status": "confirmed",
        "paid_amount": 0.0,
        "balance": final_total_amount,
        "created_at": now,
        "updated_at": now,
        # Metadata from ConfigService
        "pricing_source": "config_service" if config_service else "room_default",
        "config_room_type_id": room_type_config.get("id") if room_type_config else None,
        "config_rate_plan_id": rate_plan_config.get("id") if rate_plan_config else None,
    }
    await db.reservations.insert_one(reservation_doc)
    
    # Update client stats
    await db.clients.update_one(
        {"id": reservation.client_id},
        {"$inc": {"total_stays": 1, "total_revenue": final_total_amount}}
    )
    
    # Auto-sync to CRM
    await auto_sync_reservation_to_crm(reservation_doc)

    # Phase 15 - Webhooks sortants : déclencher l'événement reservation.created
    try:
        from integrations.webhook_delivery import fire_event as _fire_event
        webhook_payload = {
            "reservation_id": reservation_id,
            "hotel_id": hotel_id,
            "client_name": reservation_doc["client_name"],
            "room_number": reservation_doc["room_number"],
            "check_in": reservation_doc["check_in"],
            "check_out": reservation_doc["check_out"],
            "total_amount": final_total_amount,
            "channel": reservation.channel,
            "status": "confirmed",
        }
        await _fire_event(hotel_id, "reservation.created", webhook_payload)
    except Exception as _we:
        logger.warning(f"Webhook fire_event skipped: {_we}")

    logger.info(f"Reservation created: {reservation_id} with rate {final_room_rate}€/night (source: {reservation_doc['pricing_source']})")
    
    return ReservationResponse(**reservation_doc)


# ═══════════════════════════════════════════════════════════════════════════════
# BOOKING ENGINE INTEGRATION - Public endpoint for booking widget
# ═══════════════════════════════════════════════════════════════════════════════

@api_router.get("/hotels/{hotel_id}/booking-engine/availability")
async def get_booking_engine_availability(
    hotel_id: str,
    check_in: str,
    check_out: str,
    adults: int = 2,
    children: int = 0
):
    """
    Public endpoint for the Booking Engine to get available room types with pricing.
    Uses ConfigService for real-time room types and pricing data.
    """
    try:
        config_service = get_config_service()
        
        # Get hotel profile
        hotel = await config_service.get_hotel_profile(hotel_id)
        if not hotel:
            raise HTTPException(status_code=404, detail="Hôtel non trouvé")
        
        # Get room types from Configuration
        room_types = await config_service.get_room_types(hotel_id, include_room_count=True)
        
        # Get pricing matrix
        pricing_matrix = await config_service.get_pricing_matrix(hotel_id)
        
        # Get rate plans
        rate_plans = await config_service.get_rate_plans(hotel_id)
        
        # Get policies
        policies = await config_service.get_default_policies(hotel_id)
        
        # Get check-in/out times
        check_times = await config_service.get_check_times(hotel_id)
        
        # Calculate nights
        check_in_dt = datetime.fromisoformat(check_in.replace('Z', '+00:00'))
        check_out_dt = datetime.fromisoformat(check_out.replace('Z', '+00:00'))
        nights = (check_out_dt - check_in_dt).days
        
        # Build availability response
        available_rooms = []
        for rt in room_types:
            # Check occupancy compatibility
            max_occ = rt.get("max_occupancy", 2)
            if adults + children > max_occ:
                continue
            
            # Get room count
            room_count = rt.get("room_count", 0)
            
            # Get pricing for different rate plans
            pricing = {}
            for rp in rate_plans:
                rate_code = rp.get("code", "BAR")
                if rate_code in pricing_matrix and rt.get("code") in pricing_matrix[rate_code]:
                    price_per_night = pricing_matrix[rate_code][rt["code"]]
                    pricing[rate_code] = {
                        "rate_plan_id": rp.get("id"),
                        "rate_plan_name": rp.get("name", rate_code),
                        "meal_plan": rp.get("meal_plan", "room_only"),
                        "price_per_night": price_per_night,
                        "total_price": price_per_night * nights,
                        "is_refundable": not rp.get("is_non_refundable", False),
                        "cancellation_policy_id": rp.get("cancellation_policy_id")
                    }
            
            # Build room type response
            available_rooms.append({
                "id": rt.get("id"),
                "code": rt.get("code"),
                "name": rt.get("name", "Chambre Standard"),
                "name_en": rt.get("name_en"),
                "description": rt.get("description", ""),
                "category": rt.get("category", "standard"),
                "max_occupancy": max_occ,
                "max_adults": rt.get("max_adults", 2),
                "max_children": rt.get("max_children", 2),
                "size_sqm": rt.get("size_sqm"),
                "view": rt.get("view"),
                "equipment": rt.get("equipment", []),
                "images": rt.get("images", []),
                "available_rooms": room_count,
                "base_price": rt.get("base_price", 100),
                "pricing": pricing
            })
        
        return {
            "hotel": {
                "id": hotel_id,
                "name": hotel.get("name", ""),
                "stars": hotel.get("stars", 3),
                "currency": hotel.get("currency", "EUR"),
                "check_in_time": check_times.get("check_in", "15:00"),
                "check_out_time": check_times.get("check_out", "11:00")
            },
            "search": {
                "check_in": check_in,
                "check_out": check_out,
                "nights": nights,
                "adults": adults,
                "children": children
            },
            "room_types": available_rooms,
            "rate_plans": [
                {
                    "id": rp.get("id"),
                    "code": rp.get("code"),
                    "name": rp.get("name"),
                    "meal_plan": rp.get("meal_plan", "room_only"),
                    "is_derived": rp.get("is_derived", False)
                }
                for rp in rate_plans
            ],
            "policies": {
                "cancellation": policies.get("cancellation"),
                "payment": policies.get("payment")
            }
        }
        
    except Exception as e:
        logger.error(f"Booking Engine availability error: {e}")
        # Fallback to legacy room data
        rooms = await db.rooms.find(
            {"hotel_id": hotel_id, "status": "available"},
            {"_id": 0}
        ).to_list(100)
        
        return {
            "hotel": {"id": hotel_id, "name": "Hôtel", "currency": "EUR"},
            "search": {"check_in": check_in, "check_out": check_out, "nights": 1, "adults": adults, "children": children},
            "room_types": [
                {
                    "id": r.get("id"),
                    "code": r.get("room_type", "STD").upper()[:3],
                    "name": r.get("room_type", "Standard"),
                    "base_price": r.get("base_price", 100),
                    "pricing": {}
                }
                for r in rooms
            ],
            "rate_plans": [],
            "policies": {},
            "source": "legacy_fallback"
        }


@api_router.get("/hotels/{hotel_id}/booking-engine/config")
async def get_booking_engine_config(hotel_id: str):
    """
    Get full configuration for Booking Engine initialization.
    """
    try:
        config_service = get_config_service()
        
        hotel = await config_service.get_hotel_profile(hotel_id)
        room_types = await config_service.get_room_types(hotel_id, include_room_count=True)
        rate_plans = await config_service.get_rate_plans(hotel_id)
        pricing_matrix = await config_service.get_pricing_matrix(hotel_id)
        policies = await config_service.get_default_policies(hotel_id)
        settings = await config_service.get_advanced_settings(hotel_id)
        check_times = await config_service.get_check_times(hotel_id)
        
        return {
            "hotel": hotel,
            "room_types": room_types,
            "rate_plans": rate_plans,
            "pricing_matrix": pricing_matrix,
            "policies": policies,
            "settings": {
                "min_booking_advance_hours": settings.get("min_booking_advance_hours", 0),
                "max_booking_advance_days": settings.get("max_booking_advance_days", 365),
                "allow_same_day_booking": settings.get("allow_same_day_booking", True),
                "check_in_time": check_times.get("check_in", "15:00"),
                "check_out_time": check_times.get("check_out", "11:00")
            },
            "currency": hotel.get("currency", "EUR") if hotel else "EUR",
            "source": "config_service"
        }
        
    except Exception as e:
        logger.error(f"Booking Engine config error: {e}")
        return {
            "hotel": None,
            "room_types": [],
            "rate_plans": [],
            "pricing_matrix": {},
            "policies": {},
            "settings": {},
            "currency": "EUR",
            "source": "error",
            "error": str(e)
        }



@api_router.get("/hotels/{hotel_id}/reservations", response_model=List[ReservationResponse])
async def get_reservations(
    hotel_id: str,
    status: Optional[str] = None,
    channel: Optional[str] = None,
    from_date: Optional[str] = None,
    to_date: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    query = {"hotel_id": hotel_id}
    if status:
        query["status"] = status
    if channel:
        query["channel"] = channel
    if from_date and to_date:
        query["$or"] = [
            {"check_in": {"$gte": from_date, "$lte": to_date}},
            {"check_out": {"$gte": from_date, "$lte": to_date}},
            {"$and": [{"check_in": {"$lte": from_date}}, {"check_out": {"$gte": to_date}}]}
        ]
    
    reservations = await db.reservations.find(query, {"_id": 0}).sort("check_in", 1).to_list(1000)
    return [ReservationResponse(**r) for r in reservations]

@api_router.get("/hotels/{hotel_id}/reservations/{reservation_id}", response_model=ReservationResponse)
async def get_reservation(hotel_id: str, reservation_id: str, current_user: dict = Depends(get_current_user)):
    reservation = await db.reservations.find_one({"id": reservation_id, "hotel_id": hotel_id}, {"_id": 0})
    if not reservation:
        raise HTTPException(status_code=404, detail="Réservation non trouvée")
    return ReservationResponse(**reservation)

@api_router.put("/hotels/{hotel_id}/reservations/{reservation_id}", response_model=ReservationResponse)
async def update_reservation(hotel_id: str, reservation_id: str, update: ReservationUpdate, current_user: dict = Depends(get_current_user)):
    update_data = {k: v for k, v in update.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    result = await db.reservations.update_one(
        {"id": reservation_id, "hotel_id": hotel_id},
        {"$set": update_data}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Réservation non trouvée")
    
    updated = await db.reservations.find_one({"id": reservation_id}, {"_id": 0})
    return ReservationResponse(**updated)

@api_router.patch("/hotels/{hotel_id}/reservations/{reservation_id}/status", response_model=ReservationResponse)
async def update_reservation_status(hotel_id: str, reservation_id: str, status: str, current_user: dict = Depends(get_current_user)):
    valid_statuses = ["pending", "confirmed", "checked_in", "checked_out", "cancelled", "no_show"]
    if status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Statut invalide. Valeurs acceptées: {valid_statuses}")
    
    result = await db.reservations.update_one(
        {"id": reservation_id, "hotel_id": hotel_id},
        {"$set": {"status": status, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Réservation non trouvée")
    
    updated = await db.reservations.find_one({"id": reservation_id}, {"_id": 0})
    return ReservationResponse(**updated)

# ===================== ARRIVALS/DEPARTURES =====================

@api_router.get("/hotels/{hotel_id}/arrivals", response_model=List[ReservationResponse])
async def get_arrivals(hotel_id: str, date: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    target_date = date or datetime.now(timezone.utc).strftime("%Y-%m-%d")
    reservations = await db.reservations.find({
        "hotel_id": hotel_id,
        "check_in": {"$regex": f"^{target_date}"},
        "status": {"$in": ["confirmed", "pending"]}
    }, {"_id": 0}).to_list(100)
    return [ReservationResponse(**r) for r in reservations]

@api_router.get("/hotels/{hotel_id}/departures", response_model=List[ReservationResponse])
async def get_departures(hotel_id: str, date: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    target_date = date or datetime.now(timezone.utc).strftime("%Y-%m-%d")
    reservations = await db.reservations.find({
        "hotel_id": hotel_id,
        "check_out": {"$regex": f"^{target_date}"},
        "status": "checked_in"
    }, {"_id": 0}).to_list(100)
    return [ReservationResponse(**r) for r in reservations]

# ===================== INVOICES ROUTES =====================

@api_router.post("/hotels/{hotel_id}/invoices", response_model=InvoiceResponse)
async def create_invoice(hotel_id: str, invoice: InvoiceCreate, current_user: dict = Depends(get_current_user)):
    reservation = await db.reservations.find_one({"id": invoice.reservation_id, "hotel_id": hotel_id}, {"_id": 0})
    if not reservation:
        raise HTTPException(status_code=404, detail="Réservation non trouvée")
    
    # Generate invoice number
    count = await db.invoices.count_documents({"hotel_id": hotel_id})
    invoice_number = f"FAC-{datetime.now().strftime('%Y%m')}-{str(count + 1).zfill(5)}"
    
    # Calculate totals
    lines = []
    subtotal = 0.0
    vat_total = 0.0
    
    for line in invoice.lines:
        line_total = line.quantity * line.unit_price
        line_vat = line_total * (line.vat_rate / 100)
        lines.append({
            "description": line.description,
            "quantity": line.quantity,
            "unit_price": line.unit_price,
            "vat_rate": line.vat_rate,
            "vat_amount": round(line_vat, 2),
            "total": round(line_total + line_vat, 2),
            "category": line.category
        })
        subtotal += line_total
        vat_total += line_vat
    
    invoice_id = str(uuid.uuid4())
    invoice_doc = {
        "id": invoice_id,
        "hotel_id": hotel_id,
        "reservation_id": invoice.reservation_id,
        "client_id": reservation["client_id"],
        "client_name": reservation["client_name"],
        "invoice_number": invoice_number,
        "lines": lines,
        "subtotal": round(subtotal, 2),
        "vat_total": round(vat_total, 2),
        "total": round(subtotal + vat_total, 2),
        "status": "draft",
        "payment_method": None,
        "paid_at": None,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.invoices.insert_one(invoice_doc)
    return InvoiceResponse(**invoice_doc)

@api_router.get("/hotels/{hotel_id}/invoices", response_model=List[InvoiceResponse])
async def get_invoices(hotel_id: str, status: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    query = {"hotel_id": hotel_id}
    if status:
        query["status"] = status
    invoices = await db.invoices.find(query, {"_id": 0}).sort("created_at", -1).to_list(500)
    return [InvoiceResponse(**i) for i in invoices]

@api_router.get("/hotels/{hotel_id}/invoices/{invoice_id}", response_model=InvoiceResponse)
async def get_invoice(hotel_id: str, invoice_id: str, current_user: dict = Depends(get_current_user)):
    invoice = await db.invoices.find_one({"id": invoice_id, "hotel_id": hotel_id}, {"_id": 0})
    if not invoice:
        raise HTTPException(status_code=404, detail="Facture non trouvée")
    return InvoiceResponse(**invoice)

# ===================== PAYMENTS ROUTES =====================

@api_router.post("/hotels/{hotel_id}/payments", response_model=PaymentResponse)
async def create_payment(hotel_id: str, payment: PaymentCreate, current_user: dict = Depends(get_current_user)):
    reservation = await db.reservations.find_one({"id": payment.reservation_id, "hotel_id": hotel_id}, {"_id": 0})
    if not reservation:
        raise HTTPException(status_code=404, detail="Réservation non trouvée")
    
    payment_id = str(uuid.uuid4())
    payment_doc = {
        "id": payment_id,
        "hotel_id": hotel_id,
        **payment.model_dump(),
        "invoice_id": None,
        "status": "completed",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.payments.insert_one(payment_doc)
    
    # Update reservation balance
    new_paid = reservation["paid_amount"] + payment.amount
    new_balance = reservation["total_amount"] - new_paid
    await db.reservations.update_one(
        {"id": payment.reservation_id},
        {"$set": {"paid_amount": new_paid, "balance": new_balance, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    return PaymentResponse(**payment_doc)

@api_router.get("/hotels/{hotel_id}/payments", response_model=List[PaymentResponse])
async def get_payments(hotel_id: str, reservation_id: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    query = {"hotel_id": hotel_id}
    if reservation_id:
        query["reservation_id"] = reservation_id
    payments = await db.payments.find(query, {"_id": 0}).sort("created_at", -1).to_list(500)
    return [PaymentResponse(**p) for p in payments]

# ===================== NIGHT AUDIT ROUTES =====================

@api_router.post("/hotels/{hotel_id}/night-audit", response_model=NightAuditResponse)
async def create_night_audit(hotel_id: str, audit: NightAuditCreate, current_user: dict = Depends(get_current_user)):
    # Check if audit already exists for this date
    existing = await db.night_audits.find_one({"hotel_id": hotel_id, "date": audit.date})
    if existing:
        raise HTTPException(status_code=400, detail="La clôture existe déjà pour cette date")
    
    # Get statistics for the date
    total_rooms = await db.rooms.count_documents({"hotel_id": hotel_id, "status": {"$ne": "out_of_service"}})
    
    # Count occupied rooms (reservations that span this date)
    occupied_reservations = await db.reservations.find({
        "hotel_id": hotel_id,
        "check_in": {"$lte": audit.date},
        "check_out": {"$gt": audit.date},
        "status": {"$in": ["checked_in", "confirmed"]}
    }, {"_id": 0}).to_list(1000)
    occupied_rooms = len(occupied_reservations)
    
    # Count arrivals
    arrivals = await db.reservations.count_documents({
        "hotel_id": hotel_id,
        "check_in": {"$regex": f"^{audit.date}"},
        "status": {"$in": ["checked_in", "confirmed"]}
    })
    
    # Count departures
    departures = await db.reservations.count_documents({
        "hotel_id": hotel_id,
        "check_out": {"$regex": f"^{audit.date}"},
        "status": "checked_out"
    })
    
    # Count no-shows
    no_shows = await db.reservations.count_documents({
        "hotel_id": hotel_id,
        "check_in": {"$regex": f"^{audit.date}"},
        "status": "no_show"
    })
    
    # Calculate revenue
    revenue = sum(r.get("room_rate", 0) for r in occupied_reservations)
    
    # Calculate metrics
    occupancy_rate = (occupied_rooms / total_rooms * 100) if total_rooms > 0 else 0
    adr = (revenue / occupied_rooms) if occupied_rooms > 0 else 0
    revpar = (revenue / total_rooms) if total_rooms > 0 else 0
    
    audit_id = str(uuid.uuid4())
    audit_doc = {
        "id": audit_id,
        "hotel_id": hotel_id,
        "date": audit.date,
        "status": "completed",
        "total_rooms": total_rooms,
        "occupied_rooms": occupied_rooms,
        "occupancy_rate": round(occupancy_rate, 2),
        "arrivals": arrivals,
        "departures": departures,
        "no_shows": no_shows,
        "revenue": round(revenue, 2),
        "adr": round(adr, 2),
        "revpar": round(revpar, 2),
        "completed_by": current_user["user_id"],
        "completed_at": datetime.now(timezone.utc).isoformat(),
        "notes": audit.notes,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.night_audits.insert_one(audit_doc)
    return NightAuditResponse(**audit_doc)

@api_router.get("/hotels/{hotel_id}/night-audit", response_model=List[NightAuditResponse])
async def get_night_audits(hotel_id: str, current_user: dict = Depends(get_current_user)):
    audits = await db.night_audits.find({"hotel_id": hotel_id}, {"_id": 0}).sort("date", -1).to_list(365)
    return [NightAuditResponse(**a) for a in audits]

@api_router.get("/hotels/{hotel_id}/night-audit/{date}", response_model=NightAuditResponse)
async def get_night_audit(hotel_id: str, date: str, current_user: dict = Depends(get_current_user)):
    audit = await db.night_audits.find_one({"hotel_id": hotel_id, "date": date}, {"_id": 0})
    if not audit:
        raise HTTPException(status_code=404, detail="Clôture non trouvée")
    return NightAuditResponse(**audit)

# ===================== DASHBOARD/KPIs ROUTES =====================

@api_router.get("/hotels/{hotel_id}/dashboard")
async def get_dashboard(hotel_id: str, current_user: dict = Depends(get_current_user)):
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    
    # Get total rooms
    total_rooms = await db.rooms.count_documents({"hotel_id": hotel_id, "status": {"$ne": "out_of_service"}})
    
    # Get today's occupied rooms
    occupied = await db.reservations.count_documents({
        "hotel_id": hotel_id,
        "check_in": {"$lte": today},
        "check_out": {"$gt": today},
        "status": {"$in": ["checked_in", "confirmed"]}
    })
    
    # Get today's arrivals
    arrivals = await db.reservations.count_documents({
        "hotel_id": hotel_id,
        "check_in": {"$regex": f"^{today}"},
        "status": {"$in": ["confirmed", "pending"]}
    })
    
    # Get today's departures
    departures = await db.reservations.count_documents({
        "hotel_id": hotel_id,
        "check_out": {"$regex": f"^{today}"},
        "status": "checked_in"
    })
    
    # Get today's revenue
    today_reservations = await db.reservations.find({
        "hotel_id": hotel_id,
        "check_in": {"$lte": today},
        "check_out": {"$gt": today},
        "status": {"$in": ["checked_in", "confirmed"]}
    }, {"_id": 0, "room_rate": 1}).to_list(1000)
    revenue = sum(r.get("room_rate", 0) for r in today_reservations)
    
    # Calculate metrics
    occupancy_rate = (occupied / total_rooms * 100) if total_rooms > 0 else 0
    adr = (revenue / occupied) if occupied > 0 else 0
    revpar = (revenue / total_rooms) if total_rooms > 0 else 0
    
    # Get reservations count
    total_reservations = await db.reservations.count_documents({
        "hotel_id": hotel_id,
        "status": {"$nin": ["cancelled"]}
    })
    
    return {
        "date": today,
        "total_rooms": total_rooms,
        "occupied_rooms": occupied,
        "available_rooms": total_rooms - occupied,
        "occupancy_rate": round(occupancy_rate, 1),
        "arrivals": arrivals,
        "departures": departures,
        "revenue": round(revenue, 2),
        "adr": round(adr, 2),
        "revpar": round(revpar, 2),
        "total_reservations": total_reservations
    }

# ===================== REPORTS ROUTES =====================

@api_router.get("/hotels/{hotel_id}/reports/occupancy")
async def get_occupancy_report(hotel_id: str, from_date: str, to_date: str, current_user: dict = Depends(get_current_user)):
    # Get daily occupancy for date range
    total_rooms = await db.rooms.count_documents({"hotel_id": hotel_id, "status": {"$ne": "out_of_service"}})
    
    data = []
    current = datetime.fromisoformat(from_date)
    end = datetime.fromisoformat(to_date)
    
    while current <= end:
        date_str = current.strftime("%Y-%m-%d")
        occupied = await db.reservations.count_documents({
            "hotel_id": hotel_id,
            "check_in": {"$lte": date_str},
            "check_out": {"$gt": date_str},
            "status": {"$in": ["checked_in", "confirmed", "checked_out"]}
        })
        
        occupancy = (occupied / total_rooms * 100) if total_rooms > 0 else 0
        data.append({
            "date": date_str,
            "occupied": occupied,
            "available": total_rooms - occupied,
            "occupancy_rate": round(occupancy, 1)
        })
        current += timedelta(days=1)
    
    return {"total_rooms": total_rooms, "data": data}

@api_router.get("/hotels/{hotel_id}/reports/revenue")
async def get_revenue_report(hotel_id: str, from_date: str, to_date: str, current_user: dict = Depends(get_current_user)):
    # Get revenue by channel
    pipeline = [
        {
            "$match": {
                "hotel_id": hotel_id,
                "check_in": {"$gte": from_date, "$lte": to_date},
                "status": {"$nin": ["cancelled"]}
            }
        },
        {
            "$group": {
                "_id": "$channel",
                "count": {"$sum": 1},
                "revenue": {"$sum": "$total_amount"}
            }
        }
    ]
    
    results = await db.reservations.aggregate(pipeline).to_list(100)
    
    by_channel = []
    total_revenue = 0
    total_count = 0
    for r in results:
        by_channel.append({
            "channel": r["_id"],
            "count": r["count"],
            "revenue": round(r["revenue"], 2)
        })
        total_revenue += r["revenue"]
        total_count += r["count"]
    
    return {
        "from_date": from_date,
        "to_date": to_date,
        "total_revenue": round(total_revenue, 2),
        "total_reservations": total_count,
        "by_channel": by_channel
    }

@api_router.get("/hotels/{hotel_id}/reports/payments")
async def get_payments_report(hotel_id: str, from_date: str, to_date: str, current_user: dict = Depends(get_current_user)):
    pipeline = [
        {
            "$match": {
                "hotel_id": hotel_id,
                "created_at": {"$gte": from_date, "$lte": to_date + "T23:59:59"},
                "status": "completed"
            }
        },
        {
            "$group": {
                "_id": "$method",
                "count": {"$sum": 1},
                "total": {"$sum": "$amount"}
            }
        }
    ]
    
    results = await db.payments.aggregate(pipeline).to_list(100)
    
    by_method = []
    total = 0
    for r in results:
        by_method.append({
            "method": r["_id"],
            "count": r["count"],
            "total": round(r["total"], 2)
        })
        total += r["total"]
    
    return {
        "from_date": from_date,
        "to_date": to_date,
        "total": round(total, 2),
        "by_method": by_method
    }

# ===================== PLANNING DATA =====================

@api_router.get("/hotels/{hotel_id}/planning")
async def get_planning_data(hotel_id: str, from_date: str, to_date: str, current_user: dict = Depends(get_current_user)):
    # Get all rooms
    rooms = await db.rooms.find({"hotel_id": hotel_id}, {"_id": 0}).sort([("floor", 1), ("number", 1)]).to_list(500)
    
    # Get all reservations in date range
    reservations = await db.reservations.find({
        "hotel_id": hotel_id,
        "status": {"$nin": ["cancelled"]},
        "$or": [
            {"check_in": {"$gte": from_date, "$lte": to_date}},
            {"check_out": {"$gte": from_date, "$lte": to_date}},
            {"$and": [{"check_in": {"$lte": from_date}}, {"check_out": {"$gte": to_date}}]}
        ]
    }, {"_id": 0}).to_list(1000)
    
    # Calculate daily availability
    total_rooms = len([r for r in rooms if r["status"] != "out_of_service"])
    daily_stats = []
    current = datetime.fromisoformat(from_date)
    end = datetime.fromisoformat(to_date)
    
    while current <= end:
        date_str = current.strftime("%Y-%m-%d")
        occupied = sum(1 for r in reservations 
                      if r["check_in"][:10] <= date_str and r["check_out"][:10] > date_str)
        revenue = sum(r.get("room_rate", 0) for r in reservations 
                     if r["check_in"][:10] <= date_str and r["check_out"][:10] > date_str)
        
        daily_stats.append({
            "date": date_str,
            "available": total_rooms - occupied,
            "occupied": occupied,
            "occupancy_rate": round((occupied / total_rooms * 100) if total_rooms > 0 else 0, 1),
            "adr": round((revenue / occupied) if occupied > 0 else 0, 2)
        })
        current += timedelta(days=1)
    
    return {
        "rooms": rooms,
        "reservations": reservations,
        "daily_stats": daily_stats
    }

# ===================== STAFF MODELS =====================

class EmployeeCreate(BaseModel):
    first_name: str
    last_name: str
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    position: str  # receptionist, housekeeper, maintenance, manager, chef, waiter
    department: str  # front_office, housekeeping, maintenance, food_beverage, administration
    contract_type: str = "cdi"  # cdi, cdd, interim, stage, apprentissage
    hire_date: str
    birth_date: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    postal_code: Optional[str] = None
    social_security_number: Optional[str] = None
    hourly_rate: float = 11.65  # SMIC horaire
    weekly_hours: float = 35.0
    bank_iban: Optional[str] = None
    emergency_contact: Optional[str] = None
    emergency_phone: Optional[str] = None
    notes: Optional[str] = None
    is_active: bool = True

class EmployeeResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    hotel_id: str
    first_name: str
    last_name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    position: str
    department: str
    contract_type: str
    hire_date: str
    birth_date: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    postal_code: Optional[str] = None
    social_security_number: Optional[str] = None
    hourly_rate: float
    weekly_hours: float
    bank_iban: Optional[str] = None
    emergency_contact: Optional[str] = None
    emergency_phone: Optional[str] = None
    notes: Optional[str] = None
    is_active: bool
    total_hours_month: float = 0.0
    created_at: str

class ShiftCreate(BaseModel):
    employee_id: str
    date: str
    start_time: str  # HH:MM format
    end_time: str
    break_duration: int = 60  # minutes
    shift_type: str = "regular"  # regular, overtime, holiday, sick, vacation
    notes: Optional[str] = None

class ShiftResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    hotel_id: str
    employee_id: str
    employee_name: str
    date: str
    start_time: str
    end_time: str
    break_duration: int
    worked_hours: float
    shift_type: str
    status: str  # scheduled, in_progress, completed, cancelled
    notes: Optional[str] = None
    created_at: str

class TimeEntryCreate(BaseModel):
    employee_id: str
    date: str
    clock_in: str  # ISO datetime
    clock_out: Optional[str] = None
    notes: Optional[str] = None

class TimeEntryResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    hotel_id: str
    employee_id: str
    employee_name: str
    date: str
    clock_in: str
    clock_out: Optional[str] = None
    worked_hours: Optional[float] = None
    status: str  # clocked_in, clocked_out, validated
    notes: Optional[str] = None
    created_at: str

class ContractCreate(BaseModel):
    employee_id: str
    contract_type: str  # cdi, cdd, interim, stage, apprentissage
    start_date: str
    end_date: Optional[str] = None  # For CDD
    position: str
    department: str
    hourly_rate: float
    weekly_hours: float
    trial_period_days: int = 60
    notes: Optional[str] = None

class ContractResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    hotel_id: str
    employee_id: str
    employee_name: str
    contract_type: str
    start_date: str
    end_date: Optional[str] = None
    position: str
    department: str
    hourly_rate: float
    weekly_hours: float
    monthly_gross: float
    trial_period_days: int
    status: str  # draft, active, ended, terminated
    document_url: Optional[str] = None
    notes: Optional[str] = None
    created_at: str

class PayrollPeriod(BaseModel):
    employee_id: str
    month: int
    year: int

class PayrollResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    hotel_id: str
    employee_id: str
    employee_name: str
    month: int
    year: int
    worked_hours: float
    overtime_hours: float
    gross_salary: float
    social_charges_employee: float
    social_charges_employer: float
    net_salary: float
    urssaf_declarations: Dict[str, float]
    status: str  # draft, validated, paid
    paid_at: Optional[str] = None
    created_at: str

# ===================== LEAVE (CP) MODELS =====================

class LeaveConfigCreate(BaseModel):
    """Configuration des règles de congés payés pour un hôtel"""
    accrual_rate_monthly: float = 2.08  # Jours acquis par mois (25/12)
    max_days_per_year: float = 25.0  # Maximum CP annuel
    reference_period_start_month: int = 6  # 1er juin
    reference_period_start_day: int = 1
    n1_deadline_month: int = 5  # 31 mai pour utiliser N-1
    n1_deadline_day: int = 31
    allow_n1_rollover: bool = True  # Autoriser le report N-1
    max_n1_rollover_days: float = 10.0  # Maximum jours N-1 reportables
    seniority_bonus_years: int = 5  # Années d'ancienneté pour bonus
    seniority_bonus_days: float = 1.0  # Jours bonus par tranche

class LeaveConfigResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    hotel_id: str
    accrual_rate_monthly: float
    max_days_per_year: float
    reference_period_start_month: int
    reference_period_start_day: int
    n1_deadline_month: int
    n1_deadline_day: int
    allow_n1_rollover: bool
    max_n1_rollover_days: float
    seniority_bonus_years: int
    seniority_bonus_days: float
    created_at: str
    updated_at: str

class LeaveBalanceResponse(BaseModel):
    """Solde CP d'un employé pour une année de référence"""
    model_config = ConfigDict(extra="ignore")
    id: str
    hotel_id: str
    employee_id: str
    employee_name: str
    reference_year: int  # Année de référence (ex: 2025 pour période juin 2025 - mai 2026)
    cp_acquis: float  # CP acquis dans l'année
    cp_pris: float  # CP pris dans l'année
    cp_restant: float  # CP restant (acquis - pris)
    cp_n1: float  # CP reportés de l'année précédente
    cp_n1_pris: float  # CP N-1 utilisés
    cp_n1_restant: float  # CP N-1 restants
    cp_total_disponible: float  # Total disponible (restant + N-1 restant)
    last_accrual_date: Optional[str] = None
    created_at: str
    updated_at: str
    
    def __init__(self, **data):
        # Round all float values to 2 decimal places
        for key in ['cp_acquis', 'cp_pris', 'cp_restant', 'cp_n1', 'cp_n1_pris', 'cp_n1_restant', 'cp_total_disponible']:
            if key in data and data[key] is not None:
                data[key] = round(data[key], 2)
        super().__init__(**data)

class LeaveTransactionCreate(BaseModel):
    """Création d'une transaction de congé (prise ou acquisition)"""
    employee_id: str
    transaction_type: str  # accrual, taken, adjustment, rollover_in, rollover_out, expiry
    leave_type: str  # cp_n, cp_n1 (congé année N ou N-1)
    date_start: Optional[str] = None  # Pour les prises de congé
    date_end: Optional[str] = None
    days_count: float
    reason: Optional[str] = None
    notes: Optional[str] = None

class LeaveTransactionResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    hotel_id: str
    employee_id: str
    employee_name: str
    transaction_type: str
    leave_type: str
    date_start: Optional[str] = None
    date_end: Optional[str] = None
    days_count: float
    balance_before: float
    balance_after: float
    reason: Optional[str] = None
    notes: Optional[str] = None
    created_by: str
    created_at: str

class LeaveRequestCreate(BaseModel):
    """Demande de congé par un employé"""
    employee_id: str
    date_start: str
    date_end: str
    leave_type: str = "cp"  # cp, rtt, maladie, sans_solde, evenement_familial
    use_n1_first: bool = True  # Utiliser les CP N-1 en priorité
    reason: Optional[str] = None
    notes: Optional[str] = None

class LeaveRequestResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    hotel_id: str
    employee_id: str
    employee_name: str
    date_start: str
    date_end: str
    days_count: float
    leave_type: str
    use_n1_first: bool
    cp_n1_used: float  # Jours N-1 utilisés
    cp_n_used: float  # Jours N utilisés
    status: str  # pending, approved, rejected, cancelled
    reason: Optional[str] = None
    notes: Optional[str] = None
    approved_by: Optional[str] = None
    approved_at: Optional[str] = None
    rejection_reason: Optional[str] = None
    created_at: str

# ===================== PUBLIC HOLIDAYS MODELS =====================

class PublicHolidayCreate(BaseModel):
    """Création d'un jour férié"""
    date: str  # Format YYYY-MM-DD
    name: str  # Ex: "Jour de l'An", "Fête du Travail"
    holiday_type: str = "national"  # national, regional, custom
    is_mandatory: bool = True  # Jour férié obligatoire (chômé)
    compensation_type: str = "off"  # off (repos), recovery (récupération), bonus (majoration)
    bonus_rate: float = 1.0  # Taux de majoration si travaillé (1.0 = 100%, 2.0 = 200%)
    applies_to_all: bool = True  # S'applique à tous les employés
    department_restrictions: List[str] = []  # Départements concernés si pas tous

class PublicHolidayResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    hotel_id: str
    date: str
    name: str
    holiday_type: str
    is_mandatory: bool
    compensation_type: str
    bonus_rate: float
    applies_to_all: bool
    department_restrictions: List[str]
    created_at: str

class PublicHolidayWorkedCreate(BaseModel):
    """Enregistrement d'un jour férié travaillé"""
    employee_id: str
    holiday_id: str
    hours_worked: float
    compensation_choice: str  # recovery, bonus
    recovery_date: Optional[str] = None  # Date de récupération si choisi
    notes: Optional[str] = None

class PublicHolidayWorkedResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    hotel_id: str
    employee_id: str
    employee_name: str
    holiday_id: str
    holiday_name: str
    holiday_date: str
    hours_worked: float
    compensation_choice: str
    bonus_amount: Optional[float] = None
    recovery_date: Optional[str] = None
    recovery_used: bool = False
    notes: Optional[str] = None
    created_at: str

# ===================== STAFF EMPLOYEES ROUTES =====================

@api_router.post("/hotels/{hotel_id}/staff/employees", response_model=EmployeeResponse)
async def create_employee(hotel_id: str, employee: EmployeeCreate, current_user: dict = Depends(get_current_user)):
    employee_id = str(uuid.uuid4())
    employee_doc = {
        "id": employee_id,
        "hotel_id": hotel_id,
        **employee.model_dump(),
        "total_hours_month": 0.0,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.staff_employees.insert_one(employee_doc)
    return EmployeeResponse(**employee_doc)

@api_router.get("/hotels/{hotel_id}/staff/employees", response_model=List[EmployeeResponse])
async def get_employees(hotel_id: str, department: Optional[str] = None, is_active: Optional[bool] = None, current_user: dict = Depends(get_current_user)):
    query = {"hotel_id": hotel_id}
    if department:
        query["department"] = department
    if is_active is not None:
        query["is_active"] = is_active
    employees = await db.staff_employees.find(query, {"_id": 0}).sort("last_name", 1).to_list(500)
    return [EmployeeResponse(**e) for e in employees]

@api_router.get("/hotels/{hotel_id}/staff/employees/{employee_id}", response_model=EmployeeResponse)
async def get_employee(hotel_id: str, employee_id: str, current_user: dict = Depends(get_current_user)):
    employee = await db.staff_employees.find_one({"id": employee_id, "hotel_id": hotel_id}, {"_id": 0})
    if not employee:
        raise HTTPException(status_code=404, detail="Employe non trouve")
    return EmployeeResponse(**employee)

@api_router.put("/hotels/{hotel_id}/staff/employees/{employee_id}", response_model=EmployeeResponse)
async def update_employee(hotel_id: str, employee_id: str, employee: EmployeeCreate, current_user: dict = Depends(get_current_user)):
    result = await db.staff_employees.update_one(
        {"id": employee_id, "hotel_id": hotel_id},
        {"$set": employee.model_dump()}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Employe non trouve")
    updated = await db.staff_employees.find_one({"id": employee_id}, {"_id": 0})
    return EmployeeResponse(**updated)

@api_router.delete("/hotels/{hotel_id}/staff/employees/{employee_id}")
async def delete_employee(hotel_id: str, employee_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.staff_employees.update_one(
        {"id": employee_id, "hotel_id": hotel_id},
        {"$set": {"is_active": False}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Employe non trouve")
    return {"message": "Employe desactive"}

# ===================== STAFF SHIFTS/PLANNING ROUTES =====================

@api_router.post("/hotels/{hotel_id}/staff/shifts", response_model=ShiftResponse)
async def create_shift(hotel_id: str, shift: ShiftCreate, current_user: dict = Depends(get_current_user)):
    employee = await db.staff_employees.find_one({"id": shift.employee_id, "hotel_id": hotel_id}, {"_id": 0})
    if not employee:
        raise HTTPException(status_code=404, detail="Employe non trouve")
    
    # Calculate worked hours
    start_parts = shift.start_time.split(":")
    end_parts = shift.end_time.split(":")
    start_minutes = int(start_parts[0]) * 60 + int(start_parts[1])
    end_minutes = int(end_parts[0]) * 60 + int(end_parts[1])
    if end_minutes < start_minutes:
        end_minutes += 24 * 60  # Next day
    worked_minutes = end_minutes - start_minutes - shift.break_duration
    worked_hours = max(0, worked_minutes / 60)
    
    shift_id = str(uuid.uuid4())
    shift_doc = {
        "id": shift_id,
        "hotel_id": hotel_id,
        **shift.model_dump(),
        "employee_name": f"{employee['first_name']} {employee['last_name']}",
        "worked_hours": round(worked_hours, 2),
        "status": "scheduled",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.staff_shifts.insert_one(shift_doc)
    return ShiftResponse(**shift_doc)

@api_router.get("/hotels/{hotel_id}/staff/shifts", response_model=List[ShiftResponse])
async def get_shifts(hotel_id: str, from_date: Optional[str] = None, to_date: Optional[str] = None, employee_id: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    query = {"hotel_id": hotel_id}
    if from_date and to_date:
        query["date"] = {"$gte": from_date, "$lte": to_date}
    if employee_id:
        query["employee_id"] = employee_id
    shifts = await db.staff_shifts.find(query, {"_id": 0}).sort("date", 1).to_list(1000)
    return [ShiftResponse(**s) for s in shifts]

@api_router.put("/hotels/{hotel_id}/staff/shifts/{shift_id}", response_model=ShiftResponse)
async def update_shift(hotel_id: str, shift_id: str, shift: ShiftCreate, current_user: dict = Depends(get_current_user)):
    # Recalculate worked hours
    start_parts = shift.start_time.split(":")
    end_parts = shift.end_time.split(":")
    start_minutes = int(start_parts[0]) * 60 + int(start_parts[1])
    end_minutes = int(end_parts[0]) * 60 + int(end_parts[1])
    if end_minutes < start_minutes:
        end_minutes += 24 * 60
    worked_minutes = end_minutes - start_minutes - shift.break_duration
    worked_hours = max(0, worked_minutes / 60)
    
    update_data = shift.model_dump()
    update_data["worked_hours"] = round(worked_hours, 2)
    
    result = await db.staff_shifts.update_one(
        {"id": shift_id, "hotel_id": hotel_id},
        {"$set": update_data}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Shift non trouve")
    updated = await db.staff_shifts.find_one({"id": shift_id}, {"_id": 0})
    return ShiftResponse(**updated)

@api_router.delete("/hotels/{hotel_id}/staff/shifts/{shift_id}")
async def delete_shift(hotel_id: str, shift_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.staff_shifts.delete_one({"id": shift_id, "hotel_id": hotel_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Shift non trouve")
    return {"message": "Shift supprime"}

# ===================== STAFF TIME TRACKING ROUTES =====================

@api_router.post("/hotels/{hotel_id}/staff/time-entries", response_model=TimeEntryResponse)
async def create_time_entry(hotel_id: str, entry: TimeEntryCreate, current_user: dict = Depends(get_current_user)):
    employee = await db.staff_employees.find_one({"id": entry.employee_id, "hotel_id": hotel_id}, {"_id": 0})
    if not employee:
        raise HTTPException(status_code=404, detail="Employe non trouve")
    
    entry_id = str(uuid.uuid4())
    entry_doc = {
        "id": entry_id,
        "hotel_id": hotel_id,
        **entry.model_dump(),
        "employee_name": f"{employee['first_name']} {employee['last_name']}",
        "worked_hours": None,
        "status": "clocked_in" if not entry.clock_out else "clocked_out",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    # Calculate worked hours if clock_out provided
    if entry.clock_out:
        clock_in = datetime.fromisoformat(entry.clock_in.replace('Z', '+00:00'))
        clock_out = datetime.fromisoformat(entry.clock_out.replace('Z', '+00:00'))
        worked_hours = (clock_out - clock_in).total_seconds() / 3600
        entry_doc["worked_hours"] = round(worked_hours, 2)
    
    await db.staff_time_entries.insert_one(entry_doc)
    return TimeEntryResponse(**entry_doc)

@api_router.get("/hotels/{hotel_id}/staff/time-entries", response_model=List[TimeEntryResponse])
async def get_time_entries(hotel_id: str, from_date: Optional[str] = None, to_date: Optional[str] = None, employee_id: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    query = {"hotel_id": hotel_id}
    if from_date and to_date:
        query["date"] = {"$gte": from_date, "$lte": to_date}
    if employee_id:
        query["employee_id"] = employee_id
    entries = await db.staff_time_entries.find(query, {"_id": 0}).sort([("date", -1), ("clock_in", -1)]).to_list(1000)
    return [TimeEntryResponse(**e) for e in entries]

@api_router.patch("/hotels/{hotel_id}/staff/time-entries/{entry_id}/clock-out")
async def clock_out(hotel_id: str, entry_id: str, current_user: dict = Depends(get_current_user)):
    entry = await db.staff_time_entries.find_one({"id": entry_id, "hotel_id": hotel_id}, {"_id": 0})
    if not entry:
        raise HTTPException(status_code=404, detail="Pointage non trouve")
    
    if entry.get("clock_out"):
        raise HTTPException(status_code=400, detail="Deja pointe")
    
    clock_out_time = datetime.now(timezone.utc)
    clock_in = datetime.fromisoformat(entry["clock_in"].replace('Z', '+00:00'))
    worked_hours = (clock_out_time - clock_in).total_seconds() / 3600
    
    await db.staff_time_entries.update_one(
        {"id": entry_id},
        {"$set": {
            "clock_out": clock_out_time.isoformat(),
            "worked_hours": round(worked_hours, 2),
            "status": "clocked_out"
        }}
    )
    
    return {"message": "Pointage de sortie enregistre", "worked_hours": round(worked_hours, 2)}

# ===================== STAFF CONTRACTS ROUTES =====================

@api_router.post("/hotels/{hotel_id}/staff/contracts", response_model=ContractResponse)
async def create_contract(hotel_id: str, contract: ContractCreate, current_user: dict = Depends(get_current_user)):
    employee = await db.staff_employees.find_one({"id": contract.employee_id, "hotel_id": hotel_id}, {"_id": 0})
    if not employee:
        raise HTTPException(status_code=404, detail="Employe non trouve")
    
    # Calculate monthly gross salary (based on 4.33 weeks per month average)
    monthly_gross = contract.hourly_rate * contract.weekly_hours * 4.33
    
    contract_id = str(uuid.uuid4())
    contract_doc = {
        "id": contract_id,
        "hotel_id": hotel_id,
        **contract.model_dump(),
        "employee_name": f"{employee['first_name']} {employee['last_name']}",
        "monthly_gross": round(monthly_gross, 2),
        "status": "active",
        "document_url": None,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.staff_contracts.insert_one(contract_doc)
    
    # Update employee with contract info
    await db.staff_employees.update_one(
        {"id": contract.employee_id},
        {"$set": {
            "contract_type": contract.contract_type,
            "position": contract.position,
            "department": contract.department,
            "hourly_rate": contract.hourly_rate,
            "weekly_hours": contract.weekly_hours
        }}
    )
    
    return ContractResponse(**contract_doc)

@api_router.get("/hotels/{hotel_id}/staff/contracts", response_model=List[ContractResponse])
async def get_contracts(hotel_id: str, employee_id: Optional[str] = None, status: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    query = {"hotel_id": hotel_id}
    if employee_id:
        query["employee_id"] = employee_id
    if status:
        query["status"] = status
    contracts = await db.staff_contracts.find(query, {"_id": 0}).sort("created_at", -1).to_list(500)
    return [ContractResponse(**c) for c in contracts]

@api_router.get("/hotels/{hotel_id}/staff/contracts/{contract_id}", response_model=ContractResponse)
async def get_contract(hotel_id: str, contract_id: str, current_user: dict = Depends(get_current_user)):
    contract = await db.staff_contracts.find_one({"id": contract_id, "hotel_id": hotel_id}, {"_id": 0})
    if not contract:
        raise HTTPException(status_code=404, detail="Contrat non trouve")
    return ContractResponse(**contract)

# ===================== STAFF PAYROLL ROUTES =====================

@api_router.post("/hotels/{hotel_id}/staff/payroll/calculate", response_model=PayrollResponse)
async def calculate_payroll(hotel_id: str, period: PayrollPeriod, current_user: dict = Depends(get_current_user)):
    employee = await db.staff_employees.find_one({"id": period.employee_id, "hotel_id": hotel_id}, {"_id": 0})
    if not employee:
        raise HTTPException(status_code=404, detail="Employe non trouve")
    
    # Get time entries for the month
    start_date = f"{period.year}-{str(period.month).zfill(2)}-01"
    if period.month == 12:
        end_date = f"{period.year + 1}-01-01"
    else:
        end_date = f"{period.year}-{str(period.month + 1).zfill(2)}-01"
    
    entries = await db.staff_time_entries.find({
        "hotel_id": hotel_id,
        "employee_id": period.employee_id,
        "date": {"$gte": start_date, "$lt": end_date},
        "status": {"$in": ["clocked_out", "validated"]}
    }, {"_id": 0}).to_list(100)
    
    # Calculate total hours
    worked_hours = sum(e.get("worked_hours", 0) or 0 for e in entries)
    
    # Calculate expected hours (weekly_hours * 4.33)
    expected_hours = employee.get("weekly_hours", 35) * 4.33
    
    # Overtime (heures supplementaires)
    overtime_hours = max(0, worked_hours - expected_hours)
    
    # Calculate gross salary
    hourly_rate = employee.get("hourly_rate", 11.65)
    base_salary = min(worked_hours, expected_hours) * hourly_rate
    overtime_salary = overtime_hours * hourly_rate * 1.25  # 25% premium for overtime
    gross_salary = base_salary + overtime_salary
    
    # French social charges (simplified rates)
    # Employee charges ~22%
    social_charges_employee = gross_salary * 0.22
    # Employer charges ~42% (URSSAF, etc.)
    social_charges_employer = gross_salary * 0.42
    
    # Net salary
    net_salary = gross_salary - social_charges_employee
    
    # URSSAF declarations breakdown (simplified)
    urssaf_declarations = {
        "securite_sociale": round(gross_salary * 0.157, 2),
        "assurance_chomage": round(gross_salary * 0.0405, 2),
        "retraite_complementaire": round(gross_salary * 0.077, 2),
        "csg_crds": round(gross_salary * 0.097, 2),
        "formation_professionnelle": round(gross_salary * 0.0055, 2),
        "taxe_apprentissage": round(gross_salary * 0.0068, 2),
    }
    
    # Check if payroll already exists
    existing = await db.staff_payroll.find_one({
        "hotel_id": hotel_id,
        "employee_id": period.employee_id,
        "month": period.month,
        "year": period.year
    })
    
    payroll_id = existing["id"] if existing else str(uuid.uuid4())
    payroll_doc = {
        "id": payroll_id,
        "hotel_id": hotel_id,
        "employee_id": period.employee_id,
        "employee_name": f"{employee['first_name']} {employee['last_name']}",
        "month": period.month,
        "year": period.year,
        "worked_hours": round(worked_hours, 2),
        "overtime_hours": round(overtime_hours, 2),
        "gross_salary": round(gross_salary, 2),
        "social_charges_employee": round(social_charges_employee, 2),
        "social_charges_employer": round(social_charges_employer, 2),
        "net_salary": round(net_salary, 2),
        "urssaf_declarations": urssaf_declarations,
        "status": "draft",
        "paid_at": None,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    if existing:
        await db.staff_payroll.update_one({"id": payroll_id}, {"$set": payroll_doc})
    else:
        await db.staff_payroll.insert_one(payroll_doc)
    
    return PayrollResponse(**payroll_doc)

@api_router.get("/hotels/{hotel_id}/staff/payroll", response_model=List[PayrollResponse])
async def get_payrolls(hotel_id: str, month: Optional[int] = None, year: Optional[int] = None, current_user: dict = Depends(get_current_user)):
    query = {"hotel_id": hotel_id}
    if month:
        query["month"] = month
    if year:
        query["year"] = year
    payrolls = await db.staff_payroll.find(query, {"_id": 0}).sort([("year", -1), ("month", -1)]).to_list(500)
    return [PayrollResponse(**p) for p in payrolls]

@api_router.patch("/hotels/{hotel_id}/staff/payroll/{payroll_id}/validate")
async def validate_payroll(hotel_id: str, payroll_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.staff_payroll.update_one(
        {"id": payroll_id, "hotel_id": hotel_id},
        {"$set": {"status": "validated"}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Bulletin non trouve")
    return {"message": "Bulletin valide"}

@api_router.patch("/hotels/{hotel_id}/staff/payroll/{payroll_id}/mark-paid")
async def mark_payroll_paid(hotel_id: str, payroll_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.staff_payroll.update_one(
        {"id": payroll_id, "hotel_id": hotel_id},
        {"$set": {"status": "paid", "paid_at": datetime.now(timezone.utc).isoformat()}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Bulletin non trouve")
    return {"message": "Bulletin marque comme paye"}

# ===================== STAFF DASHBOARD =====================

@api_router.get("/hotels/{hotel_id}/staff/dashboard")
async def get_staff_dashboard(hotel_id: str, current_user: dict = Depends(get_current_user)):
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    
    # Count active employees
    total_employees = await db.staff_employees.count_documents({"hotel_id": hotel_id, "is_active": True})
    
    # Employees by department
    pipeline = [
        {"$match": {"hotel_id": hotel_id, "is_active": True}},
        {"$group": {"_id": "$department", "count": {"$sum": 1}}}
    ]
    by_department = await db.staff_employees.aggregate(pipeline).to_list(20)
    
    # Today's shifts
    today_shifts = await db.staff_shifts.count_documents({"hotel_id": hotel_id, "date": today})
    
    # Currently clocked in
    clocked_in = await db.staff_time_entries.count_documents({
        "hotel_id": hotel_id,
        "date": today,
        "status": "clocked_in"
    })
    
    # Contracts expiring soon (30 days)
    future_date = (datetime.now(timezone.utc) + timedelta(days=30)).strftime("%Y-%m-%d")
    expiring_contracts = await db.staff_contracts.count_documents({
        "hotel_id": hotel_id,
        "contract_type": "cdd",
        "end_date": {"$lte": future_date, "$gte": today},
        "status": "active"
    })
    
    # This month's payroll total
    current_month = datetime.now(timezone.utc).month
    current_year = datetime.now(timezone.utc).year
    payrolls = await db.staff_payroll.find({
        "hotel_id": hotel_id,
        "month": current_month,
        "year": current_year
    }, {"_id": 0, "gross_salary": 1, "net_salary": 1}).to_list(500)
    
    total_gross = sum(p.get("gross_salary", 0) for p in payrolls)
    total_net = sum(p.get("net_salary", 0) for p in payrolls)
    
    return {
        "total_employees": total_employees,
        "by_department": {d["_id"]: d["count"] for d in by_department},
        "today_shifts": today_shifts,
        "clocked_in_now": clocked_in,
        "expiring_contracts": expiring_contracts,
        "month_gross_salary": round(total_gross, 2),
        "month_net_salary": round(total_net, 2)
    }

# ===================== LEAVE CONFIGURATION ROUTES =====================

@api_router.get("/hotels/{hotel_id}/leave/config", response_model=LeaveConfigResponse)
async def get_leave_config(hotel_id: str, current_user: dict = Depends(get_current_user)):
    """Récupérer la configuration des CP pour un hôtel"""
    config = await db.leave_config.find_one({"hotel_id": hotel_id}, {"_id": 0})
    if not config:
        # Créer une config par défaut
        config_id = str(uuid.uuid4())
        now = datetime.now(timezone.utc).isoformat()
        config = {
            "id": config_id,
            "hotel_id": hotel_id,
            "accrual_rate_monthly": 2.08,
            "max_days_per_year": 25.0,
            "reference_period_start_month": 6,
            "reference_period_start_day": 1,
            "n1_deadline_month": 5,
            "n1_deadline_day": 31,
            "allow_n1_rollover": True,
            "max_n1_rollover_days": 10.0,
            "seniority_bonus_years": 5,
            "seniority_bonus_days": 1.0,
            "created_at": now,
            "updated_at": now
        }
        await db.leave_config.insert_one(config)
    return LeaveConfigResponse(**config)

@api_router.put("/hotels/{hotel_id}/leave/config", response_model=LeaveConfigResponse)
async def update_leave_config(hotel_id: str, config: LeaveConfigCreate, current_user: dict = Depends(get_current_user)):
    """Mettre à jour la configuration des CP"""
    now = datetime.now(timezone.utc).isoformat()
    existing = await db.leave_config.find_one({"hotel_id": hotel_id})
    
    if existing:
        await db.leave_config.update_one(
            {"hotel_id": hotel_id},
            {"$set": {**config.model_dump(), "updated_at": now}}
        )
        updated = await db.leave_config.find_one({"hotel_id": hotel_id}, {"_id": 0})
    else:
        config_id = str(uuid.uuid4())
        config_doc = {
            "id": config_id,
            "hotel_id": hotel_id,
            **config.model_dump(),
            "created_at": now,
            "updated_at": now
        }
        await db.leave_config.insert_one(config_doc)
        updated = config_doc
    
    return LeaveConfigResponse(**updated)

# ===================== LEAVE BALANCE ROUTES =====================

def get_current_reference_year() -> int:
    """Retourne l'année de référence actuelle (basée sur période juin-mai)"""
    now = datetime.now(timezone.utc)
    if now.month >= 6:  # Juin ou après
        return now.year
    else:  # Avant juin
        return now.year - 1

@api_router.get("/hotels/{hotel_id}/leave/balances", response_model=List[LeaveBalanceResponse])
async def get_leave_balances(hotel_id: str, reference_year: Optional[int] = None, employee_id: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    """Récupérer les soldes CP de tous les employés ou d'un employé spécifique"""
    if reference_year is None:
        reference_year = get_current_reference_year()
    
    query = {"hotel_id": hotel_id, "reference_year": reference_year}
    if employee_id:
        query["employee_id"] = employee_id
    
    balances = await db.leave_balances.find(query, {"_id": 0}).to_list(500)
    return [LeaveBalanceResponse(**b) for b in balances]

@api_router.get("/hotels/{hotel_id}/leave/balances/{employee_id}", response_model=LeaveBalanceResponse)
async def get_employee_leave_balance(hotel_id: str, employee_id: str, reference_year: Optional[int] = None, current_user: dict = Depends(get_current_user)):
    """Récupérer le solde CP d'un employé pour une année de référence"""
    if reference_year is None:
        reference_year = get_current_reference_year()
    
    balance = await db.leave_balances.find_one({
        "hotel_id": hotel_id,
        "employee_id": employee_id,
        "reference_year": reference_year
    }, {"_id": 0})
    
    if not balance:
        # Créer un solde initial pour cet employé
        employee = await db.staff_employees.find_one({"id": employee_id, "hotel_id": hotel_id}, {"_id": 0})
        if not employee:
            raise HTTPException(status_code=404, detail="Employé non trouvé")
        
        balance_id = str(uuid.uuid4())
        now = datetime.now(timezone.utc).isoformat()
        balance = {
            "id": balance_id,
            "hotel_id": hotel_id,
            "employee_id": employee_id,
            "employee_name": f"{employee['first_name']} {employee['last_name']}",
            "reference_year": reference_year,
            "cp_acquis": 0.0,
            "cp_pris": 0.0,
            "cp_restant": 0.0,
            "cp_n1": 0.0,
            "cp_n1_pris": 0.0,
            "cp_n1_restant": 0.0,
            "cp_total_disponible": 0.0,
            "last_accrual_date": None,
            "created_at": now,
            "updated_at": now
        }
        await db.leave_balances.insert_one(balance)
    
    return LeaveBalanceResponse(**balance)

@api_router.post("/hotels/{hotel_id}/leave/balances/initialize")
async def initialize_leave_balances(hotel_id: str, reference_year: Optional[int] = None, current_user: dict = Depends(get_current_user)):
    """Initialiser les soldes CP pour tous les employés actifs"""
    if reference_year is None:
        reference_year = get_current_reference_year()
    
    employees = await db.staff_employees.find({"hotel_id": hotel_id, "is_active": True}, {"_id": 0}).to_list(500)
    created_count = 0
    now = datetime.now(timezone.utc).isoformat()
    
    for employee in employees:
        existing = await db.leave_balances.find_one({
            "hotel_id": hotel_id,
            "employee_id": employee["id"],
            "reference_year": reference_year
        })
        
        if not existing:
            balance_id = str(uuid.uuid4())
            balance = {
                "id": balance_id,
                "hotel_id": hotel_id,
                "employee_id": employee["id"],
                "employee_name": f"{employee['first_name']} {employee['last_name']}",
                "reference_year": reference_year,
                "cp_acquis": 0.0,
                "cp_pris": 0.0,
                "cp_restant": 0.0,
                "cp_n1": 0.0,
                "cp_n1_pris": 0.0,
                "cp_n1_restant": 0.0,
                "cp_total_disponible": 0.0,
                "last_accrual_date": None,
                "created_at": now,
                "updated_at": now
            }
            await db.leave_balances.insert_one(balance)
            created_count += 1
    
    return {"message": f"{created_count} soldes créés pour l'année {reference_year}"}

# ===================== LEAVE TRANSACTIONS ROUTES =====================

@api_router.get("/hotels/{hotel_id}/leave/transactions", response_model=List[LeaveTransactionResponse])
async def get_leave_transactions(hotel_id: str, employee_id: Optional[str] = None, transaction_type: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    """Récupérer l'historique des transactions de congés"""
    query = {"hotel_id": hotel_id}
    if employee_id:
        query["employee_id"] = employee_id
    if transaction_type:
        query["transaction_type"] = transaction_type
    
    transactions = await db.leave_transactions.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return [LeaveTransactionResponse(**t) for t in transactions]

@api_router.post("/hotels/{hotel_id}/leave/transactions", response_model=LeaveTransactionResponse)
async def create_leave_transaction(hotel_id: str, transaction: LeaveTransactionCreate, current_user: dict = Depends(get_current_user)):
    """Créer une transaction de congé (acquisition, prise, ajustement)"""
    employee = await db.staff_employees.find_one({"id": transaction.employee_id, "hotel_id": hotel_id}, {"_id": 0})
    if not employee:
        raise HTTPException(status_code=404, detail="Employé non trouvé")
    
    reference_year = get_current_reference_year()
    balance = await db.leave_balances.find_one({
        "hotel_id": hotel_id,
        "employee_id": transaction.employee_id,
        "reference_year": reference_year
    }, {"_id": 0})
    
    if not balance:
        raise HTTPException(status_code=404, detail="Solde CP non initialisé pour cet employé")
    
    # Calculer le solde avant et après selon le type de transaction et de congé
    if transaction.leave_type == "cp_n1":
        balance_before = balance["cp_n1_restant"]
    else:
        balance_before = balance["cp_restant"]
    
    if transaction.transaction_type in ["accrual", "adjustment", "rollover_in"]:
        balance_after = balance_before + transaction.days_count
    elif transaction.transaction_type in ["taken", "rollover_out", "expiry"]:
        balance_after = balance_before - transaction.days_count
    else:
        balance_after = balance_before
    
    # Créer la transaction
    transaction_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    transaction_doc = {
        "id": transaction_id,
        "hotel_id": hotel_id,
        "employee_id": transaction.employee_id,
        "employee_name": f"{employee['first_name']} {employee['last_name']}",
        **transaction.model_dump(),
        "balance_before": balance_before,
        "balance_after": balance_after,
        "created_by": current_user["user_id"],
        "created_at": now
    }
    await db.leave_transactions.insert_one(transaction_doc)
    
    # Mettre à jour le solde
    if transaction.leave_type == "cp_n1":
        if transaction.transaction_type in ["taken"]:
            new_cp_n1_pris = balance["cp_n1_pris"] + transaction.days_count
            new_cp_n1_restant = balance["cp_n1"] - new_cp_n1_pris
            await db.leave_balances.update_one(
                {"id": balance["id"]},
                {"$set": {
                    "cp_n1_pris": new_cp_n1_pris,
                    "cp_n1_restant": new_cp_n1_restant,
                    "cp_total_disponible": balance["cp_restant"] + new_cp_n1_restant,
                    "updated_at": now
                }}
            )
    else:  # cp_n
        if transaction.transaction_type == "accrual":
            new_cp_acquis = balance["cp_acquis"] + transaction.days_count
            new_cp_restant = new_cp_acquis - balance["cp_pris"]
            await db.leave_balances.update_one(
                {"id": balance["id"]},
                {"$set": {
                    "cp_acquis": new_cp_acquis,
                    "cp_restant": new_cp_restant,
                    "cp_total_disponible": new_cp_restant + balance["cp_n1_restant"],
                    "last_accrual_date": now,
                    "updated_at": now
                }}
            )
        elif transaction.transaction_type == "taken":
            new_cp_pris = balance["cp_pris"] + transaction.days_count
            new_cp_restant = balance["cp_acquis"] - new_cp_pris
            await db.leave_balances.update_one(
                {"id": balance["id"]},
                {"$set": {
                    "cp_pris": new_cp_pris,
                    "cp_restant": new_cp_restant,
                    "cp_total_disponible": new_cp_restant + balance["cp_n1_restant"],
                    "updated_at": now
                }}
            )
    
    return LeaveTransactionResponse(**transaction_doc)

# ===================== LEAVE ACCRUAL (CRON) ROUTES =====================

@api_router.post("/hotels/{hotel_id}/leave/accrual/run")
async def run_monthly_accrual(hotel_id: str, month: Optional[int] = None, year: Optional[int] = None, current_user: dict = Depends(get_current_user)):
    """Exécuter l'acquisition mensuelle des CP pour tous les employés actifs"""
    now = datetime.now(timezone.utc)
    if month is None:
        month = now.month
    if year is None:
        year = now.year
    
    # Déterminer l'année de référence
    if month >= 6:
        reference_year = year
    else:
        reference_year = year - 1
    
    # Récupérer la config
    config = await db.leave_config.find_one({"hotel_id": hotel_id}, {"_id": 0})
    accrual_rate = config["accrual_rate_monthly"] if config else 2.08
    
    # Récupérer tous les employés actifs
    employees = await db.staff_employees.find({"hotel_id": hotel_id, "is_active": True}, {"_id": 0}).to_list(500)
    
    accrued_count = 0
    for employee in employees:
        # Vérifier si l'acquisition a déjà été faite ce mois
        accrual_key = f"{year}-{str(month).zfill(2)}"
        existing_accrual = await db.leave_transactions.find_one({
            "hotel_id": hotel_id,
            "employee_id": employee["id"],
            "transaction_type": "accrual",
            "created_at": {"$regex": f"^{accrual_key}"}
        })
        
        if existing_accrual:
            continue
        
        # S'assurer que le solde existe
        balance = await db.leave_balances.find_one({
            "hotel_id": hotel_id,
            "employee_id": employee["id"],
            "reference_year": reference_year
        }, {"_id": 0})
        
        if not balance:
            balance_id = str(uuid.uuid4())
            balance = {
                "id": balance_id,
                "hotel_id": hotel_id,
                "employee_id": employee["id"],
                "employee_name": f"{employee['first_name']} {employee['last_name']}",
                "reference_year": reference_year,
                "cp_acquis": 0.0,
                "cp_pris": 0.0,
                "cp_restant": 0.0,
                "cp_n1": 0.0,
                "cp_n1_pris": 0.0,
                "cp_n1_restant": 0.0,
                "cp_total_disponible": 0.0,
                "last_accrual_date": None,
                "created_at": now.isoformat(),
                "updated_at": now.isoformat()
            }
            await db.leave_balances.insert_one(balance)
        
        # Créer la transaction d'acquisition
        transaction_id = str(uuid.uuid4())
        new_cp_acquis = balance["cp_acquis"] + accrual_rate
        new_cp_restant = new_cp_acquis - balance["cp_pris"]
        
        transaction_doc = {
            "id": transaction_id,
            "hotel_id": hotel_id,
            "employee_id": employee["id"],
            "employee_name": f"{employee['first_name']} {employee['last_name']}",
            "transaction_type": "accrual",
            "leave_type": "cp_n",
            "date_start": None,
            "date_end": None,
            "days_count": accrual_rate,
            "balance_before": balance["cp_restant"],
            "balance_after": new_cp_restant,
            "reason": f"Acquisition mensuelle {month}/{year}",
            "notes": None,
            "created_by": "system",
            "created_at": now.isoformat()
        }
        await db.leave_transactions.insert_one(transaction_doc)
        
        # Mettre à jour le solde
        await db.leave_balances.update_one(
            {"id": balance["id"]},
            {"$set": {
                "cp_acquis": new_cp_acquis,
                "cp_restant": new_cp_restant,
                "cp_total_disponible": new_cp_restant + balance["cp_n1_restant"],
                "last_accrual_date": now.isoformat(),
                "updated_at": now.isoformat()
            }}
        )
        accrued_count += 1
    
    return {
        "message": f"Acquisition effectuée pour {accrued_count} employés",
        "month": month,
        "year": year,
        "accrual_rate": accrual_rate
    }

@api_router.post("/hotels/{hotel_id}/leave/rollover/run")
async def run_annual_rollover(hotel_id: str, from_year: int, current_user: dict = Depends(get_current_user)):
    """Exécuter le report annuel N vers N-1 (à faire au 1er juin)"""
    to_year = from_year + 1
    now = datetime.now(timezone.utc).isoformat()
    
    # Récupérer la config
    config = await db.leave_config.find_one({"hotel_id": hotel_id}, {"_id": 0})
    allow_rollover = config["allow_n1_rollover"] if config else True
    max_rollover = config["max_n1_rollover_days"] if config else 10.0
    
    if not allow_rollover:
        return {"message": "Le report N-1 est désactivé dans la configuration"}
    
    # Récupérer tous les soldes de l'année précédente
    old_balances = await db.leave_balances.find({
        "hotel_id": hotel_id,
        "reference_year": from_year
    }, {"_id": 0}).to_list(500)
    
    rollover_count = 0
    for old_balance in old_balances:
        # Calculer le montant à reporter (max = config)
        rollover_amount = min(old_balance["cp_restant"], max_rollover)
        
        if rollover_amount <= 0:
            continue
        
        # Vérifier/créer le solde de la nouvelle année
        new_balance = await db.leave_balances.find_one({
            "hotel_id": hotel_id,
            "employee_id": old_balance["employee_id"],
            "reference_year": to_year
        }, {"_id": 0})
        
        if not new_balance:
            balance_id = str(uuid.uuid4())
            new_balance = {
                "id": balance_id,
                "hotel_id": hotel_id,
                "employee_id": old_balance["employee_id"],
                "employee_name": old_balance["employee_name"],
                "reference_year": to_year,
                "cp_acquis": 0.0,
                "cp_pris": 0.0,
                "cp_restant": 0.0,
                "cp_n1": rollover_amount,
                "cp_n1_pris": 0.0,
                "cp_n1_restant": rollover_amount,
                "cp_total_disponible": rollover_amount,
                "last_accrual_date": None,
                "created_at": now,
                "updated_at": now
            }
            await db.leave_balances.insert_one(new_balance)
        else:
            await db.leave_balances.update_one(
                {"id": new_balance["id"]},
                {"$set": {
                    "cp_n1": rollover_amount,
                    "cp_n1_restant": rollover_amount,
                    "cp_total_disponible": new_balance["cp_restant"] + rollover_amount,
                    "updated_at": now
                }}
            )
        
        # Créer les transactions de rollover
        await db.leave_transactions.insert_one({
            "id": str(uuid.uuid4()),
            "hotel_id": hotel_id,
            "employee_id": old_balance["employee_id"],
            "employee_name": old_balance["employee_name"],
            "transaction_type": "rollover_out",
            "leave_type": "cp_n",
            "days_count": rollover_amount,
            "balance_before": old_balance["cp_restant"],
            "balance_after": old_balance["cp_restant"] - rollover_amount,
            "reason": f"Report vers N-1 ({to_year})",
            "created_by": "system",
            "created_at": now
        })
        
        await db.leave_transactions.insert_one({
            "id": str(uuid.uuid4()),
            "hotel_id": hotel_id,
            "employee_id": old_balance["employee_id"],
            "employee_name": old_balance["employee_name"],
            "transaction_type": "rollover_in",
            "leave_type": "cp_n1",
            "days_count": rollover_amount,
            "balance_before": 0,
            "balance_after": rollover_amount,
            "reason": f"Report depuis N ({from_year})",
            "created_by": "system",
            "created_at": now
        })
        
        rollover_count += 1
    
    return {
        "message": f"Report effectué pour {rollover_count} employés",
        "from_year": from_year,
        "to_year": to_year,
        "max_rollover_days": max_rollover
    }

# ===================== LEAVE REQUESTS ROUTES =====================

@api_router.post("/hotels/{hotel_id}/leave/requests", response_model=LeaveRequestResponse)
async def create_leave_request(hotel_id: str, request: LeaveRequestCreate, current_user: dict = Depends(get_current_user)):
    """Créer une demande de congé"""
    employee = await db.staff_employees.find_one({"id": request.employee_id, "hotel_id": hotel_id}, {"_id": 0})
    if not employee:
        raise HTTPException(status_code=404, detail="Employé non trouvé")
    
    # Calculer le nombre de jours
    start = datetime.strptime(request.date_start, "%Y-%m-%d")
    end = datetime.strptime(request.date_end, "%Y-%m-%d")
    days_count = (end - start).days + 1
    
    # Exclure les week-ends (simplification)
    working_days = 0
    current = start
    while current <= end:
        if current.weekday() < 5:  # Lundi = 0, Vendredi = 4
            working_days += 1
        current += timedelta(days=1)
    days_count = working_days
    
    # Récupérer le solde
    reference_year = get_current_reference_year()
    balance = await db.leave_balances.find_one({
        "hotel_id": hotel_id,
        "employee_id": request.employee_id,
        "reference_year": reference_year
    }, {"_id": 0})
    
    if not balance:
        raise HTTPException(status_code=400, detail="Solde CP non initialisé")
    
    # Vérifier le solde disponible
    if days_count > balance["cp_total_disponible"]:
        raise HTTPException(status_code=400, detail=f"Solde insuffisant. Disponible: {balance['cp_total_disponible']} jours")
    
    # Calculer la répartition N-1 / N
    cp_n1_used = 0.0
    cp_n_used = 0.0
    
    if request.use_n1_first and balance["cp_n1_restant"] > 0:
        cp_n1_used = min(days_count, balance["cp_n1_restant"])
        cp_n_used = days_count - cp_n1_used
    else:
        cp_n_used = min(days_count, balance["cp_restant"])
        cp_n1_used = days_count - cp_n_used
    
    request_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    request_doc = {
        "id": request_id,
        "hotel_id": hotel_id,
        "employee_id": request.employee_id,
        "employee_name": f"{employee['first_name']} {employee['last_name']}",
        "date_start": request.date_start,
        "date_end": request.date_end,
        "days_count": days_count,
        "leave_type": request.leave_type,
        "use_n1_first": request.use_n1_first,
        "cp_n1_used": cp_n1_used,
        "cp_n_used": cp_n_used,
        "status": "pending",
        "reason": request.reason,
        "notes": request.notes,
        "approved_by": None,
        "approved_at": None,
        "rejection_reason": None,
        "created_at": now
    }
    await db.leave_requests.insert_one(request_doc)
    
    return LeaveRequestResponse(**request_doc)

@api_router.get("/hotels/{hotel_id}/leave/requests", response_model=List[LeaveRequestResponse])
async def get_leave_requests(hotel_id: str, employee_id: Optional[str] = None, status: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    """Récupérer les demandes de congés"""
    query = {"hotel_id": hotel_id}
    if employee_id:
        query["employee_id"] = employee_id
    if status:
        query["status"] = status
    
    requests = await db.leave_requests.find(query, {"_id": 0}).sort("created_at", -1).to_list(500)
    return [LeaveRequestResponse(**r) for r in requests]

@api_router.patch("/hotels/{hotel_id}/leave/requests/{request_id}/approve")
async def approve_leave_request(hotel_id: str, request_id: str, current_user: dict = Depends(get_current_user)):
    """Approuver une demande de congé"""
    leave_request = await db.leave_requests.find_one({"id": request_id, "hotel_id": hotel_id}, {"_id": 0})
    if not leave_request:
        raise HTTPException(status_code=404, detail="Demande non trouvée")
    
    if leave_request["status"] != "pending":
        raise HTTPException(status_code=400, detail="Cette demande a déjà été traitée")
    
    now = datetime.now(timezone.utc).isoformat()
    
    # Mettre à jour la demande
    await db.leave_requests.update_one(
        {"id": request_id},
        {"$set": {
            "status": "approved",
            "approved_by": current_user["user_id"],
            "approved_at": now
        }}
    )
    
    # Créer les transactions de prise de congé
    reference_year = get_current_reference_year()
    balance = await db.leave_balances.find_one({
        "hotel_id": hotel_id,
        "employee_id": leave_request["employee_id"],
        "reference_year": reference_year
    }, {"_id": 0})
    
    if leave_request["cp_n1_used"] > 0:
        await db.leave_transactions.insert_one({
            "id": str(uuid.uuid4()),
            "hotel_id": hotel_id,
            "employee_id": leave_request["employee_id"],
            "employee_name": leave_request["employee_name"],
            "transaction_type": "taken",
            "leave_type": "cp_n1",
            "date_start": leave_request["date_start"],
            "date_end": leave_request["date_end"],
            "days_count": leave_request["cp_n1_used"],
            "balance_before": balance["cp_n1_restant"],
            "balance_after": balance["cp_n1_restant"] - leave_request["cp_n1_used"],
            "reason": leave_request.get("reason"),
            "created_by": current_user["user_id"],
            "created_at": now
        })
        
        new_cp_n1_pris = balance["cp_n1_pris"] + leave_request["cp_n1_used"]
        new_cp_n1_restant = balance["cp_n1"] - new_cp_n1_pris
        await db.leave_balances.update_one(
            {"id": balance["id"]},
            {"$set": {
                "cp_n1_pris": new_cp_n1_pris,
                "cp_n1_restant": new_cp_n1_restant,
                "updated_at": now
            }}
        )
        # Refresh balance for N calculation
        balance = await db.leave_balances.find_one({"id": balance["id"]}, {"_id": 0})
    
    if leave_request["cp_n_used"] > 0:
        await db.leave_transactions.insert_one({
            "id": str(uuid.uuid4()),
            "hotel_id": hotel_id,
            "employee_id": leave_request["employee_id"],
            "employee_name": leave_request["employee_name"],
            "transaction_type": "taken",
            "leave_type": "cp_n",
            "date_start": leave_request["date_start"],
            "date_end": leave_request["date_end"],
            "days_count": leave_request["cp_n_used"],
            "balance_before": balance["cp_restant"],
            "balance_after": balance["cp_restant"] - leave_request["cp_n_used"],
            "reason": leave_request.get("reason"),
            "created_by": current_user["user_id"],
            "created_at": now
        })
        
        new_cp_pris = balance["cp_pris"] + leave_request["cp_n_used"]
        new_cp_restant = balance["cp_acquis"] - new_cp_pris
        await db.leave_balances.update_one(
            {"id": balance["id"]},
            {"$set": {
                "cp_pris": new_cp_pris,
                "cp_restant": new_cp_restant,
                "cp_total_disponible": new_cp_restant + balance["cp_n1_restant"],
                "updated_at": now
            }}
        )
    
    return {"message": "Demande approuvée"}

@api_router.patch("/hotels/{hotel_id}/leave/requests/{request_id}/reject")
async def reject_leave_request(hotel_id: str, request_id: str, rejection_reason: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    """Rejeter une demande de congé"""
    result = await db.leave_requests.update_one(
        {"id": request_id, "hotel_id": hotel_id, "status": "pending"},
        {"$set": {
            "status": "rejected",
            "rejection_reason": rejection_reason,
            "approved_by": current_user["user_id"],
            "approved_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Demande non trouvée ou déjà traitée")
    return {"message": "Demande rejetée"}

# ===================== PUBLIC HOLIDAYS ROUTES =====================

@api_router.post("/hotels/{hotel_id}/holidays", response_model=PublicHolidayResponse)
async def create_public_holiday(hotel_id: str, holiday: PublicHolidayCreate, current_user: dict = Depends(get_current_user)):
    """Créer un jour férié"""
    holiday_id = str(uuid.uuid4())
    holiday_doc = {
        "id": holiday_id,
        "hotel_id": hotel_id,
        **holiday.model_dump(),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.public_holidays.insert_one(holiday_doc)
    return PublicHolidayResponse(**holiday_doc)

@api_router.get("/hotels/{hotel_id}/holidays", response_model=List[PublicHolidayResponse])
async def get_public_holidays(hotel_id: str, year: Optional[int] = None, current_user: dict = Depends(get_current_user)):
    """Récupérer les jours fériés"""
    query = {"hotel_id": hotel_id}
    if year:
        query["date"] = {"$regex": f"^{year}"}
    
    holidays = await db.public_holidays.find(query, {"_id": 0}).sort("date", 1).to_list(100)
    return [PublicHolidayResponse(**h) for h in holidays]

@api_router.post("/hotels/{hotel_id}/holidays/initialize/{year}")
async def initialize_french_holidays(hotel_id: str, year: int, current_user: dict = Depends(get_current_user)):
    """Initialiser les jours fériés français pour une année"""
    french_holidays = [
        {"date": f"{year}-01-01", "name": "Jour de l'An", "holiday_type": "national"},
        {"date": f"{year}-05-01", "name": "Fête du Travail", "holiday_type": "national"},
        {"date": f"{year}-05-08", "name": "Victoire 1945", "holiday_type": "national"},
        {"date": f"{year}-07-14", "name": "Fête Nationale", "holiday_type": "national"},
        {"date": f"{year}-08-15", "name": "Assomption", "holiday_type": "national"},
        {"date": f"{year}-11-01", "name": "Toussaint", "holiday_type": "national"},
        {"date": f"{year}-11-11", "name": "Armistice", "holiday_type": "national"},
        {"date": f"{year}-12-25", "name": "Noël", "holiday_type": "national"},
    ]
    
    # Calculer Pâques (algorithme de Meeus/Jones/Butcher)
    a = year % 19
    b = year // 100
    c = year % 100
    d = b // 4
    e = b % 4
    f = (b + 8) // 25
    g = (b - f + 1) // 3
    h = (19 * a + b - d - g + 15) % 30
    i = c // 4
    k = c % 4
    l = (32 + 2 * e + 2 * i - h - k) % 7
    m = (a + 11 * h + 22 * l) // 451
    month = (h + l - 7 * m + 114) // 31
    day = ((h + l - 7 * m + 114) % 31) + 1
    
    easter = datetime(year, month, day)
    french_holidays.extend([
        {"date": (easter + timedelta(days=1)).strftime("%Y-%m-%d"), "name": "Lundi de Pâques", "holiday_type": "national"},
        {"date": (easter + timedelta(days=39)).strftime("%Y-%m-%d"), "name": "Ascension", "holiday_type": "national"},
        {"date": (easter + timedelta(days=50)).strftime("%Y-%m-%d"), "name": "Lundi de Pentecôte", "holiday_type": "national"},
    ])
    
    created_count = 0
    for h in french_holidays:
        existing = await db.public_holidays.find_one({"hotel_id": hotel_id, "date": h["date"]})
        if not existing:
            holiday_id = str(uuid.uuid4())
            await db.public_holidays.insert_one({
                "id": holiday_id,
                "hotel_id": hotel_id,
                **h,
                "is_mandatory": True,
                "compensation_type": "off",
                "bonus_rate": 1.0,
                "applies_to_all": True,
                "department_restrictions": [],
                "created_at": datetime.now(timezone.utc).isoformat()
            })
            created_count += 1
    
    return {"message": f"{created_count} jours fériés créés pour {year}"}

@api_router.delete("/hotels/{hotel_id}/holidays/{holiday_id}")
async def delete_public_holiday(hotel_id: str, holiday_id: str, current_user: dict = Depends(get_current_user)):
    """Supprimer un jour férié"""
    result = await db.public_holidays.delete_one({"id": holiday_id, "hotel_id": hotel_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Jour férié non trouvé")
    return {"message": "Jour férié supprimé"}

# ===================== PUBLIC HOLIDAYS WORKED ROUTES =====================

@api_router.post("/hotels/{hotel_id}/holidays/worked", response_model=PublicHolidayWorkedResponse)
async def record_holiday_worked(hotel_id: str, worked: PublicHolidayWorkedCreate, current_user: dict = Depends(get_current_user)):
    """Enregistrer qu'un employé a travaillé un jour férié"""
    employee = await db.staff_employees.find_one({"id": worked.employee_id, "hotel_id": hotel_id}, {"_id": 0})
    if not employee:
        raise HTTPException(status_code=404, detail="Employé non trouvé")
    
    holiday = await db.public_holidays.find_one({"id": worked.holiday_id, "hotel_id": hotel_id}, {"_id": 0})
    if not holiday:
        raise HTTPException(status_code=404, detail="Jour férié non trouvé")
    
    # Calculer le bonus si applicable
    bonus_amount = None
    if worked.compensation_choice == "bonus":
        hourly_rate = employee.get("hourly_rate", 11.65)
        bonus_amount = worked.hours_worked * hourly_rate * holiday.get("bonus_rate", 1.0)
    
    worked_id = str(uuid.uuid4())
    worked_doc = {
        "id": worked_id,
        "hotel_id": hotel_id,
        "employee_id": worked.employee_id,
        "employee_name": f"{employee['first_name']} {employee['last_name']}",
        "holiday_id": worked.holiday_id,
        "holiday_name": holiday["name"],
        "holiday_date": holiday["date"],
        "hours_worked": worked.hours_worked,
        "compensation_choice": worked.compensation_choice,
        "bonus_amount": round(bonus_amount, 2) if bonus_amount else None,
        "recovery_date": worked.recovery_date,
        "recovery_used": False,
        "notes": worked.notes,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.holidays_worked.insert_one(worked_doc)
    
    return PublicHolidayWorkedResponse(**worked_doc)

@api_router.get("/hotels/{hotel_id}/holidays/worked", response_model=List[PublicHolidayWorkedResponse])
async def get_holidays_worked(hotel_id: str, employee_id: Optional[str] = None, year: Optional[int] = None, current_user: dict = Depends(get_current_user)):
    """Récupérer les jours fériés travaillés"""
    query = {"hotel_id": hotel_id}
    if employee_id:
        query["employee_id"] = employee_id
    if year:
        query["holiday_date"] = {"$regex": f"^{year}"}
    
    worked = await db.holidays_worked.find(query, {"_id": 0}).sort("holiday_date", -1).to_list(500)
    return [PublicHolidayWorkedResponse(**w) for w in worked]

@api_router.patch("/hotels/{hotel_id}/holidays/worked/{worked_id}/use-recovery")
async def mark_recovery_used(hotel_id: str, worked_id: str, current_user: dict = Depends(get_current_user)):
    """Marquer la récupération comme utilisée"""
    result = await db.holidays_worked.update_one(
        {"id": worked_id, "hotel_id": hotel_id},
        {"$set": {"recovery_used": True}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Enregistrement non trouvé")
    return {"message": "Récupération marquée comme utilisée"}

# ===================== STAFF PLANNING SUMMARY (for UI) =====================

@api_router.get("/hotels/{hotel_id}/staff/planning-summary")
async def get_staff_planning_summary(hotel_id: str, from_date: str, to_date: str, current_user: dict = Depends(get_current_user)):
    """Récupérer un résumé pour l'affichage dans le planning (CP, jours fériés, etc.)"""
    reference_year = get_current_reference_year()
    
    # Récupérer tous les employés actifs
    employees = await db.staff_employees.find({"hotel_id": hotel_id, "is_active": True}, {"_id": 0}).to_list(500)
    
    # Récupérer les soldes CP
    balances = await db.leave_balances.find({
        "hotel_id": hotel_id,
        "reference_year": reference_year
    }, {"_id": 0}).to_list(500)
    balance_map = {b["employee_id"]: b for b in balances}
    
    # Récupérer les demandes de congés approuvées dans la période
    leave_requests = await db.leave_requests.find({
        "hotel_id": hotel_id,
        "status": "approved",
        "date_start": {"$lte": to_date},
        "date_end": {"$gte": from_date}
    }, {"_id": 0}).to_list(500)
    
    # Récupérer les jours fériés dans la période
    holidays = await db.public_holidays.find({
        "hotel_id": hotel_id,
        "date": {"$gte": from_date, "$lte": to_date}
    }, {"_id": 0}).to_list(50)
    
    # Récupérer les jours fériés travaillés
    holidays_worked = await db.holidays_worked.find({
        "hotel_id": hotel_id,
        "holiday_date": {"$gte": from_date, "$lte": to_date}
    }, {"_id": 0}).to_list(500)
    worked_map = {}
    for hw in holidays_worked:
        key = f"{hw['employee_id']}_{hw['holiday_date']}"
        worked_map[key] = hw
    
    # Construire le résumé par employé
    summary = []
    for emp in employees:
        balance = balance_map.get(emp["id"], {})
        emp_leave_requests = [lr for lr in leave_requests if lr["employee_id"] == emp["id"]]
        emp_holidays_worked = [hw for hw in holidays_worked if hw["employee_id"] == emp["id"]]
        
        # Calculer les CP pris dans la période
        cp_pris_periode = sum(lr["days_count"] for lr in emp_leave_requests)
        
        summary.append({
            "employee_id": emp["id"],
            "employee_name": f"{emp['first_name']} {emp['last_name']}",
            "position": emp.get("position", ""),
            "department": emp.get("department", ""),
            "cp_acquis": balance.get("cp_acquis", 0),
            "cp_pris_total": balance.get("cp_pris", 0),
            "cp_restant": balance.get("cp_restant", 0),
            "cp_n1_restant": balance.get("cp_n1_restant", 0),
            "cp_total_disponible": balance.get("cp_total_disponible", 0),
            "cp_pris_periode": cp_pris_periode,
            "leave_requests": emp_leave_requests,
            "holidays_worked": emp_holidays_worked
        })
    
    return {
        "employees": summary,
        "holidays": holidays,
        "period": {"from": from_date, "to": to_date},
        "reference_year": reference_year
    }

# ===================== CONFIGURATION - DEPARTMENTS =====================

class DepartmentCreate(BaseModel):
    name: str
    code: str
    color: str = "#7c3aed"
    positions: List[str] = []

class DepartmentResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    hotel_id: str
    name: str
    code: str
    color: str
    positions: List[str]
    is_active: bool
    created_at: str

@api_router.get("/hotels/{hotel_id}/config/departments", response_model=List[DepartmentResponse])
async def get_departments(hotel_id: str, current_user: dict = Depends(get_current_user)):
    """Recuperer tous les departements/services"""
    departments = await db.departments.find({"hotel_id": hotel_id, "is_active": True}, {"_id": 0}).to_list(50)
    if not departments:
        # Creer les departements par defaut
        default_depts = [
            {"name": "Reception", "code": "REC", "color": "#7c3aed", "positions": ["Receptionniste", "Night Auditor", "Concierge"]},
            {"name": "Hebergement", "code": "HEB", "color": "#3b82f6", "positions": ["Gouvernante", "Femme de chambre", "Valet"]},
            {"name": "Restauration", "code": "REST", "color": "#f59e0b", "positions": ["Chef de rang", "Serveur", "Barman"]},
            {"name": "Cuisine", "code": "CUI", "color": "#ef4444", "positions": ["Chef de cuisine", "Sous-chef", "Commis"]},
            {"name": "Maintenance", "code": "MAINT", "color": "#22c55e", "positions": ["Technicien", "Agent polyvalent"]},
            {"name": "Direction", "code": "DIR", "color": "#8b5cf6", "positions": ["Directeur", "Assistant direction"]},
        ]
        now = datetime.now(timezone.utc).isoformat()
        for dept in default_depts:
            await db.departments.insert_one({
                "id": str(uuid.uuid4()),
                "hotel_id": hotel_id,
                **dept,
                "is_active": True,
                "created_at": now
            })
        departments = await db.departments.find({"hotel_id": hotel_id}, {"_id": 0}).to_list(50)
    return [DepartmentResponse(**d) for d in departments]

@api_router.post("/hotels/{hotel_id}/config/departments", response_model=DepartmentResponse)
async def create_department(hotel_id: str, dept: DepartmentCreate, current_user: dict = Depends(get_current_user)):
    dept_id = str(uuid.uuid4())
    dept_doc = {
        "id": dept_id,
        "hotel_id": hotel_id,
        **dept.model_dump(),
        "is_active": True,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.departments.insert_one(dept_doc)
    return DepartmentResponse(**dept_doc)

@api_router.put("/hotels/{hotel_id}/config/departments/{dept_id}", response_model=DepartmentResponse)
async def update_department(hotel_id: str, dept_id: str, dept: DepartmentCreate, current_user: dict = Depends(get_current_user)):
    await db.departments.update_one(
        {"id": dept_id, "hotel_id": hotel_id},
        {"$set": dept.model_dump()}
    )
    updated = await db.departments.find_one({"id": dept_id}, {"_id": 0})
    return DepartmentResponse(**updated)

@api_router.delete("/hotels/{hotel_id}/config/departments/{dept_id}")
async def delete_department(hotel_id: str, dept_id: str, current_user: dict = Depends(get_current_user)):
    await db.departments.update_one({"id": dept_id, "hotel_id": hotel_id}, {"$set": {"is_active": False}})
    return {"message": "Departement supprime"}

# ===================== CONFIGURATION - SHIFT TEMPLATES =====================

class ShiftTemplateCreate(BaseModel):
    name: str
    code: str
    start_time: str
    end_time: str
    duration_hours: float
    break_minutes: int = 0
    overtime_rate: float = 0.0  # Majoration en %
    color: str = "#3b82f6"

class ShiftTemplateResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    hotel_id: str
    name: str
    code: str
    start_time: str
    end_time: str
    duration_hours: float
    break_minutes: int
    overtime_rate: float
    color: str
    is_active: bool
    created_at: str

@api_router.get("/hotels/{hotel_id}/config/shifts", response_model=List[ShiftTemplateResponse])
async def get_shift_templates(hotel_id: str, current_user: dict = Depends(get_current_user)):
    shifts = await db.shift_templates.find({"hotel_id": hotel_id, "is_active": True}, {"_id": 0}).to_list(50)
    if not shifts:
        default_shifts = [
            {"name": "Matin", "code": "M", "start_time": "07:00", "end_time": "15:00", "duration_hours": 8, "break_minutes": 60, "overtime_rate": 0, "color": "#f97316"},
            {"name": "Soir", "code": "S", "start_time": "15:00", "end_time": "23:00", "duration_hours": 8, "break_minutes": 60, "overtime_rate": 10, "color": "#3b82f6"},
            {"name": "Nuit", "code": "N", "start_time": "23:00", "end_time": "07:00", "duration_hours": 8, "break_minutes": 60, "overtime_rate": 25, "color": "#8b5cf6"},
            {"name": "Matin long", "code": "ML", "start_time": "06:00", "end_time": "16:00", "duration_hours": 10, "break_minutes": 90, "overtime_rate": 10, "color": "#f59e0b"},
        ]
        now = datetime.now(timezone.utc).isoformat()
        for s in default_shifts:
            await db.shift_templates.insert_one({
                "id": str(uuid.uuid4()),
                "hotel_id": hotel_id,
                **s,
                "is_active": True,
                "created_at": now
            })
        shifts = await db.shift_templates.find({"hotel_id": hotel_id}, {"_id": 0}).to_list(50)
    return [ShiftTemplateResponse(**s) for s in shifts]

@api_router.post("/hotels/{hotel_id}/config/shifts", response_model=ShiftTemplateResponse)
async def create_shift_template(hotel_id: str, shift: ShiftTemplateCreate, current_user: dict = Depends(get_current_user)):
    shift_id = str(uuid.uuid4())
    shift_doc = {
        "id": shift_id,
        "hotel_id": hotel_id,
        **shift.model_dump(),
        "is_active": True,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.shift_templates.insert_one(shift_doc)
    return ShiftTemplateResponse(**shift_doc)

@api_router.put("/hotels/{hotel_id}/config/shifts/{shift_id}", response_model=ShiftTemplateResponse)
async def update_shift_template(hotel_id: str, shift_id: str, shift: ShiftTemplateCreate, current_user: dict = Depends(get_current_user)):
    await db.shift_templates.update_one({"id": shift_id, "hotel_id": hotel_id}, {"$set": shift.model_dump()})
    updated = await db.shift_templates.find_one({"id": shift_id}, {"_id": 0})
    return ShiftTemplateResponse(**updated)

@api_router.delete("/hotels/{hotel_id}/config/shifts/{shift_id}")
async def delete_shift_template(hotel_id: str, shift_id: str, current_user: dict = Depends(get_current_user)):
    await db.shift_templates.update_one({"id": shift_id, "hotel_id": hotel_id}, {"$set": {"is_active": False}})
    return {"message": "Shift supprime"}

# ===================== CONFIGURATION - CONTRACT TEMPLATES =====================

class ContractTemplateCreate(BaseModel):
    name: str
    contract_type: str  # cdi, cdd, extra, stage, apprentissage
    description: str = ""
    content_blocks: List[Dict] = []  # Blocks de contenu pour l'editeur
    status: str = "draft"  # draft, active

class ContractTemplateResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    hotel_id: str
    name: str
    contract_type: str
    description: str
    content_blocks: List[Dict]
    status: str
    created_at: str
    updated_at: str

@api_router.get("/hotels/{hotel_id}/config/contract-templates", response_model=List[ContractTemplateResponse])
async def get_contract_templates(hotel_id: str, current_user: dict = Depends(get_current_user)):
    templates = await db.contract_templates.find({"hotel_id": hotel_id}, {"_id": 0}).to_list(50)
    if not templates:
        now = datetime.now(timezone.utc).isoformat()
        default_templates = [
            {"name": "CDI - Plein temps", "contract_type": "cdi", "description": "Contrat CDI 35h/semaine", "status": "active"},
            {"name": "CDD - Plein temps", "contract_type": "cdd", "description": "Contrat CDD standard", "status": "active"},
            {"name": "CDI - Mi-temps", "contract_type": "cdi", "description": "Contrat CDI temps partiel", "status": "active"},
            {"name": "Extra - Journee", "contract_type": "extra", "description": "Contrat extra journalier", "status": "active"},
            {"name": "CDD - Saisonnier", "contract_type": "cdd", "description": "Contrat saisonnier HCR", "status": "draft"},
            {"name": "Stage / Alternance", "contract_type": "stage", "description": "Convention de stage", "status": "draft"},
        ]
        for t in default_templates:
            await db.contract_templates.insert_one({
                "id": str(uuid.uuid4()),
                "hotel_id": hotel_id,
                **t,
                "content_blocks": [],
                "created_at": now,
                "updated_at": now
            })
        templates = await db.contract_templates.find({"hotel_id": hotel_id}, {"_id": 0}).to_list(50)
    return [ContractTemplateResponse(**t) for t in templates]

@api_router.post("/hotels/{hotel_id}/config/contract-templates", response_model=ContractTemplateResponse)
async def create_contract_template(hotel_id: str, template: ContractTemplateCreate, current_user: dict = Depends(get_current_user)):
    now = datetime.now(timezone.utc).isoformat()
    template_doc = {
        "id": str(uuid.uuid4()),
        "hotel_id": hotel_id,
        **template.model_dump(),
        "created_at": now,
        "updated_at": now
    }
    await db.contract_templates.insert_one(template_doc)
    return ContractTemplateResponse(**template_doc)

@api_router.put("/hotels/{hotel_id}/config/contract-templates/{template_id}", response_model=ContractTemplateResponse)
async def update_contract_template(hotel_id: str, template_id: str, template: ContractTemplateCreate, current_user: dict = Depends(get_current_user)):
    now = datetime.now(timezone.utc).isoformat()
    await db.contract_templates.update_one(
        {"id": template_id, "hotel_id": hotel_id},
        {"$set": {**template.model_dump(), "updated_at": now}}
    )
    updated = await db.contract_templates.find_one({"id": template_id}, {"_id": 0})
    return ContractTemplateResponse(**updated)

@api_router.delete("/hotels/{hotel_id}/config/contract-templates/{template_id}")
async def delete_contract_template(hotel_id: str, template_id: str, current_user: dict = Depends(get_current_user)):
    await db.contract_templates.delete_one({"id": template_id, "hotel_id": hotel_id})
    return {"message": "Modele supprime"}

# ===================== CONFIGURATION - ROLES & PERMISSIONS =====================

class RoleCreate(BaseModel):
    name: str
    permissions: Dict[str, bool] = {}

class RoleResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    hotel_id: str
    name: str
    permissions: Dict[str, bool]
    is_system: bool
    created_at: str

DEFAULT_PERMISSIONS = [
    "voir_planning", "modifier_planning", "voir_personnel", "modifier_personnel",
    "generer_contrats", "exporter_donnees", "gerer_recrutement", "configuration"
]

@api_router.get("/hotels/{hotel_id}/config/roles", response_model=List[RoleResponse])
async def get_roles(hotel_id: str, current_user: dict = Depends(get_current_user)):
    roles = await db.roles.find({"hotel_id": hotel_id}, {"_id": 0}).to_list(50)
    if not roles:
        now = datetime.now(timezone.utc).isoformat()
        default_roles = [
            {"name": "Administrateur", "permissions": {p: True for p in DEFAULT_PERMISSIONS}, "is_system": True},
            {"name": "DRH", "permissions": {"voir_planning": True, "modifier_planning": True, "voir_personnel": True, "modifier_personnel": True, "generer_contrats": True, "exporter_donnees": True, "gerer_recrutement": True, "configuration": False}, "is_system": True},
            {"name": "Directeur", "permissions": {"voir_planning": True, "modifier_planning": True, "voir_personnel": True, "modifier_personnel": False, "generer_contrats": True, "exporter_donnees": True, "gerer_recrutement": True, "configuration": False}, "is_system": True},
            {"name": "Responsable service", "permissions": {"voir_planning": True, "modifier_planning": True, "voir_personnel": True, "modifier_personnel": False, "generer_contrats": False, "exporter_donnees": False, "gerer_recrutement": False, "configuration": False}, "is_system": True},
            {"name": "Receptionniste", "permissions": {"voir_planning": True, "modifier_planning": False, "voir_personnel": True, "modifier_personnel": False, "generer_contrats": False, "exporter_donnees": False, "gerer_recrutement": False, "configuration": False}, "is_system": True},
            {"name": "Employe", "permissions": {"voir_planning": True, "modifier_planning": False, "voir_personnel": False, "modifier_personnel": False, "generer_contrats": False, "exporter_donnees": False, "gerer_recrutement": False, "configuration": False}, "is_system": True},
        ]
        for r in default_roles:
            await db.roles.insert_one({"id": str(uuid.uuid4()), "hotel_id": hotel_id, **r, "created_at": now})
        roles = await db.roles.find({"hotel_id": hotel_id}, {"_id": 0}).to_list(50)
    return [RoleResponse(**r) for r in roles]

@api_router.put("/hotels/{hotel_id}/config/roles/{role_id}", response_model=RoleResponse)
async def update_role(hotel_id: str, role_id: str, role: RoleCreate, current_user: dict = Depends(get_current_user)):
    await db.roles.update_one({"id": role_id, "hotel_id": hotel_id}, {"$set": {"name": role.name, "permissions": role.permissions}})
    updated = await db.roles.find_one({"id": role_id}, {"_id": 0})
    return RoleResponse(**updated)

# ===================== CONFIGURATION - USERS (Mobile & Desktop) =====================

# Rôles système disponibles
SYSTEM_ROLES = [
    {"code": "admin", "name": "Administrateur", "description": "Accès complet à toutes les fonctionnalités", "is_mobile": False, "can_manage_config": True, "can_manage_users": True, "can_view_financials": True},
    {"code": "reception", "name": "Réception", "description": "Gestion des réservations et check-in/out", "is_mobile": False, "can_manage_config": False, "can_manage_users": False, "can_view_financials": False},
    {"code": "revenue_manager", "name": "Revenue Manager", "description": "Gestion des tarifs et revenus", "is_mobile": False, "can_manage_config": True, "can_manage_users": False, "can_view_financials": True},
    {"code": "housekeeping", "name": "Gouvernante", "description": "Supervision du service housekeeping", "is_mobile": True, "can_manage_config": False, "can_manage_users": False, "can_view_financials": False},
    {"code": "housekeeper", "name": "Femme de chambre", "description": "Nettoyage des chambres (mobile)", "is_mobile": True, "can_manage_config": False, "can_manage_users": False, "can_view_financials": False},
    {"code": "maintenance", "name": "Maintenance", "description": "Réparations et maintenance (mobile)", "is_mobile": True, "can_manage_config": False, "can_manage_users": False, "can_view_financials": False},
    {"code": "breakfast", "name": "Service Petit-déjeuner", "description": "Gestion du service PDJ (mobile)", "is_mobile": True, "can_manage_config": False, "can_manage_users": False, "can_view_financials": False},
    {"code": "spa", "name": "SPA", "description": "Gestion du service SPA (mobile)", "is_mobile": True, "can_manage_config": False, "can_manage_users": False, "can_view_financials": False},
    {"code": "restaurant", "name": "Restaurant", "description": "Service restauration (mobile)", "is_mobile": True, "can_manage_config": False, "can_manage_users": False, "can_view_financials": False},
    {"code": "accounting", "name": "Comptabilité", "description": "Accès aux données financières", "is_mobile": False, "can_manage_config": False, "can_manage_users": False, "can_view_financials": True},
    {"code": "readonly", "name": "Consultation", "description": "Accès en lecture seule", "is_mobile": False, "can_manage_config": False, "can_manage_users": False, "can_view_financials": False},
]

class ConfigUserCreate(BaseModel):
    email: str
    password: str  # Mot de passe obligatoire
    first_name: str
    last_name: str
    role: str
    department: Optional[str] = "front_office"
    phone: Optional[str] = None
    job_title: Optional[str] = None
    language: str = "fr"

class ConfigUserUpdate(BaseModel):
    email: Optional[str] = None
    password: Optional[str] = None  # Si fourni, reset le mot de passe
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    role: Optional[str] = None
    department: Optional[str] = None
    phone: Optional[str] = None
    job_title: Optional[str] = None
    language: Optional[str] = None
    is_active: Optional[bool] = None

class ConfigUserResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    hotel_id: str
    email: str
    first_name: str
    last_name: str
    full_name: str
    role: str
    department: Optional[str] = None
    phone: Optional[str] = None
    job_title: Optional[str] = None
    language: str
    is_active: bool
    is_mobile_role: bool
    created_at: str
    last_login: Optional[str] = None

@api_router.get("/config/roles")
async def get_available_roles(current_user: dict = Depends(get_current_user)):
    """Retourne tous les rôles système disponibles"""
    return SYSTEM_ROLES

@api_router.get("/config/hotels/{hotel_id}/users", response_model=List[ConfigUserResponse])
async def get_config_users(
    hotel_id: str,
    role: Optional[str] = None,
    is_active: bool = True,
    current_user: dict = Depends(get_current_user)
):
    """Liste des utilisateurs de l'hôtel"""
    query = {"hotel_id": hotel_id}
    if role:
        query["role"] = role
    if is_active is not None:
        query["is_active"] = is_active
    
    users = await db.users.find(query, {"_id": 0, "password": 0}).sort("created_at", -1).to_list(200)
    
    # Ajouter les infos dérivées
    for user in users:
        user["full_name"] = f"{user.get('first_name', '')} {user.get('last_name', '')}".strip()
        role_info = next((r for r in SYSTEM_ROLES if r["code"] == user.get("role")), None)
        user["is_mobile_role"] = role_info["is_mobile"] if role_info else False
    
    return [ConfigUserResponse(**u) for u in users]

@api_router.post("/config/hotels/{hotel_id}/users", response_model=ConfigUserResponse)
async def create_config_user(
    hotel_id: str,
    user: ConfigUserCreate,
    current_user: dict = Depends(get_current_user)
):
    """Créer un nouvel utilisateur pour l'hôtel"""
    # Vérifier que l'email n'existe pas déjà
    existing = await db.users.find_one({"email": user.email.lower()})
    if existing:
        raise HTTPException(status_code=400, detail="Cet email est déjà utilisé")
    
    # Vérifier le rôle
    role_info = next((r for r in SYSTEM_ROLES if r["code"] == user.role), None)
    if not role_info:
        raise HTTPException(status_code=400, detail="Rôle invalide")
    
    # Hasher le mot de passe
    import bcrypt
    password_hash = bcrypt.hashpw(user.password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    
    now = datetime.now(timezone.utc).isoformat()
    user_id = str(uuid.uuid4())
    
    user_doc = {
        "id": user_id,
        "hotel_id": hotel_id,
        "email": user.email.lower(),
        "password": password_hash,
        "first_name": user.first_name,
        "last_name": user.last_name,
        "full_name": f"{user.first_name} {user.last_name}",
        "role": user.role,
        "department": user.department,
        "phone": user.phone,
        "job_title": user.job_title,
        "language": user.language,
        "is_active": True,
        "is_mobile_role": role_info["is_mobile"],
        "created_at": now,
        "last_login": None
    }
    
    await db.users.insert_one(user_doc)
    
    # Retourner sans le mot de passe
    del user_doc["password"]
    return ConfigUserResponse(**user_doc)

@api_router.put("/config/hotels/{hotel_id}/users/{user_id}", response_model=ConfigUserResponse)
async def update_config_user(
    hotel_id: str,
    user_id: str,
    update: ConfigUserUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Mettre à jour un utilisateur"""
    existing = await db.users.find_one({"id": user_id, "hotel_id": hotel_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Utilisateur non trouvé")
    
    update_data = {k: v for k, v in update.model_dump().items() if v is not None}
    
    # Si nouveau mot de passe
    if "password" in update_data:
        import bcrypt
        update_data["password"] = bcrypt.hashpw(update_data["password"].encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    
    # Si changement de rôle, mettre à jour is_mobile_role
    if "role" in update_data:
        role_info = next((r for r in SYSTEM_ROLES if r["code"] == update_data["role"]), None)
        if role_info:
            update_data["is_mobile_role"] = role_info["is_mobile"]
    
    # Si changement de nom, mettre à jour full_name
    if "first_name" in update_data or "last_name" in update_data:
        first = update_data.get("first_name", existing.get("first_name", ""))
        last = update_data.get("last_name", existing.get("last_name", ""))
        update_data["full_name"] = f"{first} {last}".strip()
    
    if update_data:
        await db.users.update_one({"id": user_id}, {"$set": update_data})
    
    updated = await db.users.find_one({"id": user_id}, {"_id": 0, "password": 0})
    updated["full_name"] = f"{updated.get('first_name', '')} {updated.get('last_name', '')}".strip()
    role_info = next((r for r in SYSTEM_ROLES if r["code"] == updated.get("role")), None)
    updated["is_mobile_role"] = role_info["is_mobile"] if role_info else False
    
    return ConfigUserResponse(**updated)

@api_router.delete("/config/hotels/{hotel_id}/users/{user_id}")
async def delete_config_user(
    hotel_id: str,
    user_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Désactiver un utilisateur (soft delete)"""
    result = await db.users.update_one(
        {"id": user_id, "hotel_id": hotel_id},
        {"$set": {"is_active": False}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Utilisateur non trouvé")
    return {"success": True, "message": "Utilisateur désactivé"}

@api_router.post("/config/hotels/{hotel_id}/users/{user_id}/reset-password")
async def reset_user_password(
    hotel_id: str,
    user_id: str,
    new_password: str,
    current_user: dict = Depends(get_current_user)
):
    """Réinitialiser le mot de passe d'un utilisateur"""
    import bcrypt
    password_hash = bcrypt.hashpw(new_password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    
    result = await db.users.update_one(
        {"id": user_id, "hotel_id": hotel_id},
        {"$set": {"password": password_hash}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Utilisateur non trouvé")
    return {"success": True, "message": "Mot de passe réinitialisé"}

# ===================== CONFIGURATION - HR DOCUMENTS =====================

class HRDocumentTypeCreate(BaseModel):
    name: str
    is_mandatory: bool = True
    requires_ocr: bool = False

class HRDocumentTypeResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    hotel_id: str
    name: str
    is_mandatory: bool
    requires_ocr: bool
    is_active: bool
    created_at: str

@api_router.get("/hotels/{hotel_id}/config/hr-documents", response_model=List[HRDocumentTypeResponse])
async def get_hr_document_types(hotel_id: str, current_user: dict = Depends(get_current_user)):
    docs = await db.hr_document_types.find({"hotel_id": hotel_id, "is_active": True}, {"_id": 0}).to_list(50)
    if not docs:
        now = datetime.now(timezone.utc).isoformat()
        default_docs = [
            {"name": "Carte Nationale d'Identite", "is_mandatory": True, "requires_ocr": True},
            {"name": "Justificatif de domicile", "is_mandatory": True, "requires_ocr": False},
            {"name": "Carte Vitale", "is_mandatory": True, "requires_ocr": True},
            {"name": "RIB bancaire", "is_mandatory": True, "requires_ocr": True},
            {"name": "Photo identite", "is_mandatory": False, "requires_ocr": False},
            {"name": "Diplomes & certifications", "is_mandatory": False, "requires_ocr": False},
            {"name": "Contrat de travail signe", "is_mandatory": True, "requires_ocr": False},
            {"name": "Visite medicale", "is_mandatory": True, "requires_ocr": False},
        ]
        for d in default_docs:
            await db.hr_document_types.insert_one({"id": str(uuid.uuid4()), "hotel_id": hotel_id, **d, "is_active": True, "created_at": now})
        docs = await db.hr_document_types.find({"hotel_id": hotel_id}, {"_id": 0}).to_list(50)
    return [HRDocumentTypeResponse(**d) for d in docs]

@api_router.post("/hotels/{hotel_id}/config/hr-documents", response_model=HRDocumentTypeResponse)
async def create_hr_document_type(hotel_id: str, doc: HRDocumentTypeCreate, current_user: dict = Depends(get_current_user)):
    doc_id = str(uuid.uuid4())
    doc_data = {"id": doc_id, "hotel_id": hotel_id, **doc.model_dump(), "is_active": True, "created_at": datetime.now(timezone.utc).isoformat()}
    await db.hr_document_types.insert_one(doc_data)
    return HRDocumentTypeResponse(**doc_data)

@api_router.delete("/hotels/{hotel_id}/config/hr-documents/{doc_id}")
async def delete_hr_document_type(hotel_id: str, doc_id: str, current_user: dict = Depends(get_current_user)):
    await db.hr_document_types.update_one({"id": doc_id, "hotel_id": hotel_id}, {"$set": {"is_active": False}})
    return {"message": "Document supprime"}

# ===================== CONFIGURATION - STAFF SETTINGS =====================

class StaffSettingsUpdate(BaseModel):
    logo_url: Optional[str] = None
    reporting_emails: List[str] = []
    notifications_enabled: bool = True
    auto_reporting_enabled: bool = False
    docusign_enabled: bool = False
    auto_payroll_export: bool = False
    cp_rollover_date: str = "06-01"  # Date de bascule CP (jour-mois)
    cp_allow_early_use: bool = True

class StaffSettingsResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    hotel_id: str
    logo_url: Optional[str]
    reporting_emails: List[str]
    notifications_enabled: bool
    auto_reporting_enabled: bool
    docusign_enabled: bool
    auto_payroll_export: bool
    cp_rollover_date: str
    cp_allow_early_use: bool
    updated_at: str

@api_router.get("/hotels/{hotel_id}/config/settings", response_model=StaffSettingsResponse)
async def get_staff_settings(hotel_id: str, current_user: dict = Depends(get_current_user)):
    settings = await db.staff_settings.find_one({"hotel_id": hotel_id}, {"_id": 0})
    if not settings:
        now = datetime.now(timezone.utc).isoformat()
        settings = {
            "id": str(uuid.uuid4()),
            "hotel_id": hotel_id,
            "logo_url": None,
            "reporting_emails": [],
            "notifications_enabled": True,
            "auto_reporting_enabled": False,
            "docusign_enabled": False,
            "auto_payroll_export": False,
            "cp_rollover_date": "06-01",
            "cp_allow_early_use": True,
            "updated_at": now
        }
        await db.staff_settings.insert_one(settings)
    return StaffSettingsResponse(**settings)

@api_router.put("/hotels/{hotel_id}/config/settings", response_model=StaffSettingsResponse)
async def update_staff_settings(hotel_id: str, settings: StaffSettingsUpdate, current_user: dict = Depends(get_current_user)):
    now = datetime.now(timezone.utc).isoformat()
    await db.staff_settings.update_one(
        {"hotel_id": hotel_id},
        {"$set": {**settings.model_dump(), "updated_at": now}},
        upsert=True
    )
    updated = await db.staff_settings.find_one({"hotel_id": hotel_id}, {"_id": 0})
    return StaffSettingsResponse(**updated)

# ===================== REPORTING - STAFF ANALYTICS =====================

@api_router.get("/hotels/{hotel_id}/reporting/staff-analytics")
async def get_staff_analytics(hotel_id: str, month: int, year: int, current_user: dict = Depends(get_current_user)):
    """Recuperer les analytics staff pour le reporting comptabilite"""
    # Calculer les dates du mois
    start_date = f"{year}-{str(month).zfill(2)}-01"
    if month == 12:
        end_date = f"{year + 1}-01-01"
    else:
        end_date = f"{year}-{str(month + 1).zfill(2)}-01"
    
    # Recuperer les employes actifs
    employees = await db.staff_employees.find({"hotel_id": hotel_id, "is_active": True}, {"_id": 0}).to_list(500)
    
    # Recuperer tous les shifts du mois
    shifts = await db.staff_shifts.find({
        "hotel_id": hotel_id,
        "date": {"$gte": start_date, "$lt": end_date}
    }, {"_id": 0}).to_list(5000)
    
    # Recuperer les conges approuves
    leaves = await db.leave_requests.find({
        "hotel_id": hotel_id,
        "status": "approved",
        "date_start": {"$lte": end_date},
        "date_end": {"$gte": start_date}
    }, {"_id": 0}).to_list(500)
    
    # Calculer les stats par employe
    employee_stats = []
    total_hours = 0
    total_overtime = 0
    total_absences = 0
    total_cp = 0
    total_sick = 0
    
    for emp in employees:
        emp_shifts = [s for s in shifts if s["employee_id"] == emp["id"]]
        emp_leaves = [l for l in leaves if l["employee_id"] == emp["id"]]
        
        worked_days = len(emp_shifts)
        hours = sum(s.get("worked_hours", 0) for s in emp_shifts)
        overtime = sum(s.get("overtime_hours", 0) for s in emp_shifts)
        
        cp_days = sum(l.get("days_count", 0) for l in emp_leaves if l.get("leave_type") == "cp")
        sick_days = sum(l.get("days_count", 0) for l in emp_leaves if l.get("leave_type") == "maladie")
        other_absences = sum(l.get("days_count", 0) for l in emp_leaves if l.get("leave_type") not in ["cp", "maladie"])
        
        total_hours += hours
        total_overtime += overtime
        total_cp += cp_days
        total_sick += sick_days
        total_absences += other_absences
        
        employee_stats.append({
            "employee_id": emp["id"],
            "employee_name": f"{emp['first_name']} {emp['last_name']}",
            "department": emp.get("department", ""),
            "worked_days": worked_days,
            "total_hours": round(hours, 2),
            "overtime_hours": round(overtime, 2),
            "absences": other_absences,
            "cp_days": cp_days,
            "sick_days": sick_days
        })
    
    # Stats par service
    hours_by_service = {}
    for emp in employee_stats:
        dept = emp["department"] or "Autre"
        if dept not in hours_by_service:
            hours_by_service[dept] = 0
        hours_by_service[dept] += emp["total_hours"]
    
    dept_labels = {
        "front_office": "Reception",
        "housekeeping": "Hebergement",
        "food_beverage": "Restauration",
        "maintenance": "Maintenance",
        "administration": "Direction",
    }
    
    service_stats = [
        {"service": dept_labels.get(k, k), "hours": round(v, 2)}
        for k, v in hours_by_service.items()
    ]
    
    return {
        "period": {"month": month, "year": year},
        "summary": {
            "active_employees": len(employees),
            "total_hours": round(total_hours, 2),
            "total_overtime": round(total_overtime, 2),
            "total_sick_days": total_sick
        },
        "employees": employee_stats,
        "hours_by_service": sorted(service_stats, key=lambda x: x["hours"], reverse=True)
    }

# ===================== RECRUITMENT MODULE =====================

# ---- Models ----
class JobOfferCreate(BaseModel):
    title: str
    department: str
    contract_type: str  # CDI, CDD, Extra, Interim
    location: str = ""
    description: str = ""
    requirements: List[str] = []
    salary_min: Optional[float] = None
    salary_max: Optional[float] = None
    experience_years: int = 0
    status: str = "draft"  # draft, published, closed

class JobOfferResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    hotel_id: str
    title: str
    department: str
    contract_type: str
    location: str
    description: str
    requirements: List[str]
    salary_min: Optional[float]
    salary_max: Optional[float]
    experience_years: int
    status: str
    applications_count: int = 0
    created_at: str
    published_at: Optional[str] = None

class CandidateCreate(BaseModel):
    first_name: str
    last_name: str
    email: EmailStr
    phone: str = ""
    job_offer_id: Optional[str] = None
    source: str = "manual"  # manual, linkedin, indeed, spontaneous
    cv_url: Optional[str] = None
    cover_letter: str = ""
    status: str = "new"  # new, screening, interview, offer, hired, rejected
    notes: str = ""

class CandidateResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    hotel_id: str
    first_name: str
    last_name: str
    email: str
    phone: str
    job_offer_id: Optional[str]
    job_title: Optional[str] = None
    source: str
    cv_url: Optional[str]
    cover_letter: str
    status: str
    notes: str
    rating: int = 0
    interviews: List[Dict] = []
    created_at: str
    updated_at: str

class InterviewCreate(BaseModel):
    candidate_id: str
    date: str
    time: str
    interviewer: str
    type: str = "phone"  # phone, video, onsite
    notes: str = ""
    status: str = "scheduled"  # scheduled, completed, cancelled

class AIJobOfferRequest(BaseModel):
    title: str
    department: str
    contract_type: str
    keywords: List[str] = []

# ---- Job Offers Endpoints ----
@api_router.get("/hotels/{hotel_id}/recruitment/job-offers", response_model=List[JobOfferResponse])
async def get_job_offers(hotel_id: str, status: Optional[str] = None, credentials: HTTPAuthorizationCredentials = Depends(security)):
    verify_token(credentials.credentials)
    
    query = {"hotel_id": hotel_id}
    if status:
        query["status"] = status
    
    offers = await db.job_offers.find(query, {"_id": 0}).sort("created_at", -1).to_list(100)
    
    # Count applications for each offer
    for offer in offers:
        count = await db.candidates.count_documents({"job_offer_id": offer["id"]})
        offer["applications_count"] = count
    
    return offers

@api_router.post("/hotels/{hotel_id}/recruitment/job-offers", response_model=JobOfferResponse)
async def create_job_offer(hotel_id: str, offer: JobOfferCreate, credentials: HTTPAuthorizationCredentials = Depends(security)):
    verify_token(credentials.credentials)
    
    offer_doc = {
        "id": str(uuid.uuid4()),
        "hotel_id": hotel_id,
        **offer.model_dump(),
        "applications_count": 0,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "published_at": datetime.now(timezone.utc).isoformat() if offer.status == "published" else None
    }
    
    await db.job_offers.insert_one(offer_doc)
    del offer_doc["_id"]
    return offer_doc

@api_router.put("/hotels/{hotel_id}/recruitment/job-offers/{offer_id}", response_model=JobOfferResponse)
async def update_job_offer(hotel_id: str, offer_id: str, offer: JobOfferCreate, credentials: HTTPAuthorizationCredentials = Depends(security)):
    verify_token(credentials.credentials)
    
    existing = await db.job_offers.find_one({"id": offer_id, "hotel_id": hotel_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Job offer not found")
    
    update_data = offer.model_dump()
    
    # Set published_at if status changed to published
    if offer.status == "published" and existing.get("status") != "published":
        update_data["published_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.job_offers.update_one({"id": offer_id}, {"$set": update_data})
    
    updated = await db.job_offers.find_one({"id": offer_id}, {"_id": 0})
    count = await db.candidates.count_documents({"job_offer_id": offer_id})
    updated["applications_count"] = count
    return updated

@api_router.delete("/hotels/{hotel_id}/recruitment/job-offers/{offer_id}")
async def delete_job_offer(hotel_id: str, offer_id: str, credentials: HTTPAuthorizationCredentials = Depends(security)):
    verify_token(credentials.credentials)
    
    result = await db.job_offers.delete_one({"id": offer_id, "hotel_id": hotel_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Job offer not found")
    
    return {"message": "Job offer deleted"}

@api_router.post("/hotels/{hotel_id}/recruitment/job-offers/generate-ai")
async def generate_ai_job_offer(hotel_id: str, request: AIJobOfferRequest, credentials: HTTPAuthorizationCredentials = Depends(security)):
    """
    Real AI Generation using GPT-4o - Generates professional job offer descriptions in French
    """
    verify_token(credentials.credentials)
    
    # Import AI library
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
    except ImportError:
        # Fallback to mock if library not available
        logger.warning("emergentintegrations not available, falling back to mock")
        return await generate_ai_job_offer_mock(request)
    
    # Get API key
    api_key = os.environ.get('EMERGENT_LLM_KEY')
    if not api_key:
        logger.warning("EMERGENT_LLM_KEY not configured, falling back to mock")
        return await generate_ai_job_offer_mock(request)
    
    # Department labels for prompt
    dept_labels = {
        "front_office": "Réception",
        "housekeeping": "Hébergement/Housekeeping",
        "food_beverage": "Restauration",
        "maintenance": "Maintenance technique",
        "administration": "Direction/Administration"
    }
    department_name = dept_labels.get(request.department, request.department)
    
    # Keywords text
    keywords_text = f"Compétences recherchées: {', '.join(request.keywords)}" if request.keywords else ""
    
    # Create AI prompt
    system_prompt = """Tu es un expert RH spécialisé dans l'hôtellerie française. Tu génères des offres d'emploi professionnelles, attractives et conformes au marché français.

Règles:
- Utilise un ton professionnel mais engageant
- Adapte le contenu au secteur hôtelier français
- Inclus des missions concrètes et réalistes
- Propose des prérequis pertinents pour le poste
- Respecte les conventions du marché de l'emploi français"""

    user_prompt = f"""Génère une offre d'emploi pour le poste suivant:

**Titre du poste**: {request.title}
**Département**: {department_name}
**Type de contrat**: {request.contract_type}
{keywords_text}

Réponds UNIQUEMENT avec un JSON valide dans ce format exact (sans markdown, sans ```):
{{
    "description": "Description complète du poste avec missions principales (5-7 points)",
    "requirements": ["Prérequis 1", "Prérequis 2", "Prérequis 3", "Prérequis 4", "Prérequis 5"],
    "salary_min": 1800,
    "salary_max": 2500
}}

Notes pour les salaires:
- CDI/CDD: salaire mensuel brut en euros (ex: 1800-2500)
- Extra/Interim: taux horaire en euros (ex: 12-18)
- Adapte selon le niveau du poste et le marché français"""

    try:
        # Initialize AI chat
        chat = LlmChat(
            api_key=api_key,
            session_id=f"job-gen-{hotel_id}-{uuid.uuid4()}",
            system_message=system_prompt
        ).with_model("openai", "gpt-4o")
        
        # Send message and get response
        user_message = UserMessage(text=user_prompt)
        response_text = await chat.send_message(user_message)
        
        # Parse JSON response
        import json
        # Clean response if needed (remove markdown code blocks)
        response_text = response_text.strip()
        if response_text.startswith("```"):
            response_text = response_text.split("```")[1]
            if response_text.startswith("json"):
                response_text = response_text[4:]
        response_text = response_text.strip()
        
        ai_response = json.loads(response_text)
        
        return {
            "generated": True,
            "ai_powered": True,
            "title": request.title,
            "description": ai_response.get("description", ""),
            "requirements": ai_response.get("requirements", []),
            "salary_min": ai_response.get("salary_min", 1800),
            "salary_max": ai_response.get("salary_max", 2500),
            "note": "Contenu généré par IA - Vérifiez et personnalisez selon vos besoins"
        }
        
    except Exception as e:
        logger.error(f"AI generation error: {str(e)}")
        # Fallback to mock on error
        return await generate_ai_job_offer_mock(request)

async def generate_ai_job_offer_mock(request: AIJobOfferRequest):
    """Fallback mock generation when AI is unavailable"""
    templates = {
        "front_office": {
            "description": f"Nous recherchons un(e) {request.title} dynamique et passionné(e) pour rejoindre notre équipe de réception. Vous serez le premier point de contact de nos clients et veillerez à leur offrir une expérience exceptionnelle dès leur arrivée.\n\nVos missions principales :\n- Accueillir chaleureusement les clients et gérer les check-in/check-out\n- Répondre aux demandes et réclamations avec professionnalisme\n- Assurer la gestion des réservations (téléphone, email, OTA)\n- Coordonner avec les autres services (housekeeping, maintenance)\n- Promouvoir les services additionnels de l'établissement",
            "requirements": [
                "Formation en hôtellerie ou expérience équivalente",
                "Maîtrise du français et anglais courant (3ème langue appréciée)",
                "Excellentes qualités relationnelles et sens du service",
                "Maîtrise des outils informatiques et PMS hôteliers",
                "Disponibilité pour travail en horaires décalés (week-ends, jours fériés)"
            ]
        },
        "housekeeping": {
            "description": f"Nous recherchons un(e) {request.title} rigoureux(se) et organisé(e) pour garantir le confort et la propreté de notre établissement. Vous jouerez un rôle clé dans la satisfaction de nos clients.\n\nVos missions principales :\n- Assurer le nettoyage et la remise en état des chambres selon nos standards\n- Contrôler l'état des équipements et signaler les anomalies\n- Gérer le stock de linge et produits d'entretien\n- Respecter les protocoles d'hygiène et de sécurité\n- Collaborer avec la réception pour optimiser la rotation des chambres",
            "requirements": [
                "Expérience en hôtellerie souhaitée",
                "Sens du détail et rigueur dans le travail",
                "Capacité à travailler de manière autonome",
                "Condition physique adaptée au poste",
                "Discrétion et respect de la confidentialité"
            ]
        },
        "food_beverage": {
            "description": f"Nous recherchons un(e) {request.title} créatif(ve) et passionné(e) par la gastronomie pour rejoindre notre équipe de restauration. Vous contribuerez à offrir une expérience culinaire mémorable à nos clients.\n\nVos missions principales :\n- Préparer et dresser les plats selon les standards de qualité\n- Participer à l'élaboration des menus et suggestions du jour\n- Gérer les stocks et les commandes fournisseurs\n- Veiller au respect des normes HACCP\n- Encadrer et former les commis de cuisine",
            "requirements": [
                "CAP/BEP Cuisine ou formation équivalente",
                "Expérience en restauration gastronomique appréciée",
                "Créativité et sens du goût",
                "Capacité à travailler sous pression",
                "Connaissance des normes HACCP"
            ]
        },
        "default": {
            "description": f"Nous recherchons un(e) {request.title} motivé(e) pour rejoindre notre équipe au sein du service {request.department}. Vous contribuerez activement au bon fonctionnement de notre établissement et à la satisfaction de nos clients.\n\nVos missions principales :\n- Assurer les tâches quotidiennes liées à votre fonction\n- Collaborer avec les autres services de l'hôtel\n- Participer à l'amélioration continue de nos processus\n- Représenter l'image de l'établissement avec professionnalisme",
            "requirements": [
                "Formation ou expérience dans le domaine",
                "Sens du service et du travail en équipe",
                "Autonomie et capacité d'adaptation",
                "Bonne présentation",
                "Disponibilité et flexibilité horaire"
            ]
        }
    }
    
    template = templates.get(request.department, templates["default"])
    keywords_text = ""
    if request.keywords:
        keywords_text = f"\n\nCompétences clés recherchées : {', '.join(request.keywords)}"
    
    salary_ranges = {
        "CDI": {"min": 1800, "max": 2500},
        "CDD": {"min": 1700, "max": 2300},
        "Extra": {"min": 12, "max": 15},
        "Interim": {"min": 13, "max": 18}
    }
    salary = salary_ranges.get(request.contract_type, {"min": 1700, "max": 2200})
    
    return {
        "generated": True,
        "ai_powered": False,
        "title": request.title,
        "description": template["description"] + keywords_text,
        "requirements": template["requirements"],
        "salary_min": salary["min"],
        "salary_max": salary["max"],
        "note": "Contenu généré (mode fallback) - À personnaliser selon vos besoins"
    }

# ---- Candidates Endpoints ----
@api_router.get("/hotels/{hotel_id}/recruitment/candidates", response_model=List[CandidateResponse])
async def get_candidates(hotel_id: str, status: Optional[str] = None, job_offer_id: Optional[str] = None, credentials: HTTPAuthorizationCredentials = Depends(security)):
    verify_token(credentials.credentials)
    
    query = {"hotel_id": hotel_id}
    if status:
        query["status"] = status
    if job_offer_id:
        query["job_offer_id"] = job_offer_id
    
    candidates = await db.candidates.find(query, {"_id": 0}).sort("created_at", -1).to_list(200)
    
    # Add job title to each candidate
    for c in candidates:
        if c.get("job_offer_id"):
            job = await db.job_offers.find_one({"id": c["job_offer_id"]}, {"_id": 0, "title": 1})
            c["job_title"] = job["title"] if job else None
    
    return candidates

@api_router.post("/hotels/{hotel_id}/recruitment/candidates", response_model=CandidateResponse)
async def create_candidate(hotel_id: str, candidate: CandidateCreate, credentials: HTTPAuthorizationCredentials = Depends(security)):
    verify_token(credentials.credentials)
    
    now = datetime.now(timezone.utc).isoformat()
    candidate_doc = {
        "id": str(uuid.uuid4()),
        "hotel_id": hotel_id,
        **candidate.model_dump(),
        "rating": 0,
        "interviews": [],
        "created_at": now,
        "updated_at": now
    }
    
    await db.candidates.insert_one(candidate_doc)
    del candidate_doc["_id"]
    
    # Add job title
    if candidate.job_offer_id:
        job = await db.job_offers.find_one({"id": candidate.job_offer_id}, {"_id": 0, "title": 1})
        candidate_doc["job_title"] = job["title"] if job else None
    
    return candidate_doc

@api_router.put("/hotels/{hotel_id}/recruitment/candidates/{candidate_id}", response_model=CandidateResponse)
async def update_candidate(hotel_id: str, candidate_id: str, candidate: CandidateCreate, credentials: HTTPAuthorizationCredentials = Depends(security)):
    verify_token(credentials.credentials)
    
    existing = await db.candidates.find_one({"id": candidate_id, "hotel_id": hotel_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Candidate not found")
    
    update_data = candidate.model_dump()
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.candidates.update_one({"id": candidate_id}, {"$set": update_data})
    
    updated = await db.candidates.find_one({"id": candidate_id}, {"_id": 0})
    
    # Add job title
    if updated.get("job_offer_id"):
        job = await db.job_offers.find_one({"id": updated["job_offer_id"]}, {"_id": 0, "title": 1})
        updated["job_title"] = job["title"] if job else None
    
    return updated

@api_router.patch("/hotels/{hotel_id}/recruitment/candidates/{candidate_id}/status")
async def update_candidate_status(hotel_id: str, candidate_id: str, status: str, credentials: HTTPAuthorizationCredentials = Depends(security)):
    verify_token(credentials.credentials)
    
    valid_statuses = ["new", "screening", "interview", "offer", "hired", "rejected"]
    if status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {valid_statuses}")
    
    result = await db.candidates.update_one(
        {"id": candidate_id, "hotel_id": hotel_id},
        {"$set": {"status": status, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Candidate not found")
    
    return {"message": "Status updated", "status": status}

@api_router.patch("/hotels/{hotel_id}/recruitment/candidates/{candidate_id}/rating")
async def update_candidate_rating(hotel_id: str, candidate_id: str, rating: int, credentials: HTTPAuthorizationCredentials = Depends(security)):
    verify_token(credentials.credentials)
    
    if rating < 0 or rating > 5:
        raise HTTPException(status_code=400, detail="Rating must be between 0 and 5")
    
    result = await db.candidates.update_one(
        {"id": candidate_id, "hotel_id": hotel_id},
        {"$set": {"rating": rating, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Candidate not found")
    
    return {"message": "Rating updated", "rating": rating}

@api_router.delete("/hotels/{hotel_id}/recruitment/candidates/{candidate_id}")
async def delete_candidate(hotel_id: str, candidate_id: str, credentials: HTTPAuthorizationCredentials = Depends(security)):
    verify_token(credentials.credentials)
    
    result = await db.candidates.delete_one({"id": candidate_id, "hotel_id": hotel_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Candidate not found")
    
    return {"message": "Candidate deleted"}

# ---- Interviews Endpoints ----
@api_router.post("/hotels/{hotel_id}/recruitment/candidates/{candidate_id}/interviews")
async def add_interview(hotel_id: str, candidate_id: str, interview: InterviewCreate, credentials: HTTPAuthorizationCredentials = Depends(security)):
    verify_token(credentials.credentials)
    
    interview_doc = {
        "id": str(uuid.uuid4()),
        **interview.model_dump(exclude={"candidate_id"}),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    result = await db.candidates.update_one(
        {"id": candidate_id, "hotel_id": hotel_id},
        {
            "$push": {"interviews": interview_doc},
            "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}
        }
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Candidate not found")
    
    return {"message": "Interview scheduled", "interview": interview_doc}

# ---- Pipeline Stats ----
@api_router.get("/hotels/{hotel_id}/recruitment/pipeline-stats")
async def get_pipeline_stats(hotel_id: str, credentials: HTTPAuthorizationCredentials = Depends(security)):
    verify_token(credentials.credentials)
    
    pipeline = [
        {"$match": {"hotel_id": hotel_id}},
        {"$group": {"_id": "$status", "count": {"$sum": 1}}}
    ]
    
    results = await db.candidates.aggregate(pipeline).to_list(10)
    
    stats = {
        "new": 0,
        "screening": 0,
        "interview": 0,
        "offer": 0,
        "hired": 0,
        "rejected": 0
    }
    
    for r in results:
        if r["_id"] in stats:
            stats[r["_id"]] = r["count"]
    
    # Active job offers count
    active_offers = await db.job_offers.count_documents({"hotel_id": hotel_id, "status": "published"})
    
    return {
        "pipeline": stats,
        "total_candidates": sum(stats.values()),
        "active_job_offers": active_offers
    }

# ===================== ROOT & HEALTH =====================

@api_router.get("/")
async def root():
    return {"message": "Flowtym PMS API v1.0", "status": "running"}

@api_router.get("/health")
async def health():
    return {"status": "healthy", "timestamp": datetime.now(timezone.utc).isoformat()}

# ===================== SUPER ADMIN MODULE =====================
# Import and configure Super Admin routes with database dependency

from superadmin.routes import superadmin_router
from superadmin.models import (
    HotelCreate as SAHotelCreate, HotelUpdate as SAHotelUpdate, HotelResponse as SAHotelResponse,
    SubscriptionCreate, SubscriptionUpdate, SubscriptionResponse,
    UserInvite, SEPAMandateCreate, SEPAMandateResponse,
    DashboardStats, ActivityLog, SUBSCRIPTION_PLANS,
    HotelUserRole, SubscriptionPlan, PaymentFrequency, TrialType
)

# Inject database into superadmin routes
@api_router.get("/superadmin/dashboard")
async def sa_dashboard(credentials: HTTPAuthorizationCredentials = Depends(security)):
    from superadmin.routes import get_dashboard_stats, verify_superadmin
    return await get_dashboard_stats(db, credentials)

@api_router.get("/superadmin/hotels")
async def sa_list_hotels(status: Optional[str] = None, search: Optional[str] = None, credentials: HTTPAuthorizationCredentials = Depends(security)):
    from superadmin.routes import list_hotels
    return await list_hotels(db, status, search, credentials)

@api_router.post("/superadmin/hotels")
async def sa_create_hotel(hotel: SAHotelCreate, credentials: HTTPAuthorizationCredentials = Depends(security)):
    from superadmin.routes import create_hotel
    return await create_hotel(hotel, db, credentials)

@api_router.get("/superadmin/hotels/{hotel_id}")
async def sa_get_hotel(hotel_id: str, credentials: HTTPAuthorizationCredentials = Depends(security)):
    from superadmin.routes import get_hotel
    return await get_hotel(hotel_id, db, credentials)

@api_router.put("/superadmin/hotels/{hotel_id}")
async def sa_update_hotel(hotel_id: str, hotel: SAHotelUpdate, credentials: HTTPAuthorizationCredentials = Depends(security)):
    from superadmin.routes import update_hotel
    return await update_hotel(hotel_id, hotel, db, credentials)

@api_router.patch("/superadmin/hotels/{hotel_id}/status")
async def sa_update_hotel_status(hotel_id: str, status: str, credentials: HTTPAuthorizationCredentials = Depends(security)):
    from superadmin.routes import update_hotel_status
    return await update_hotel_status(hotel_id, status, db, credentials)

@api_router.delete("/superadmin/hotels/{hotel_id}")
async def sa_delete_hotel(hotel_id: str, credentials: HTTPAuthorizationCredentials = Depends(security)):
    from superadmin.routes import delete_hotel
    return await delete_hotel(hotel_id, db, credentials)

@api_router.get("/superadmin/plans")
async def sa_get_plans(credentials: HTTPAuthorizationCredentials = Depends(security)):
    from superadmin.routes import get_subscription_plans
    return await get_subscription_plans(credentials)

@api_router.post("/superadmin/subscriptions")
async def sa_create_subscription(sub: SubscriptionCreate, credentials: HTTPAuthorizationCredentials = Depends(security)):
    from superadmin.routes import create_subscription
    return await create_subscription(sub, db, credentials)

# Lifecycle - List subscriptions (MUST be before parameterized routes)
@api_router.get("/superadmin/subscriptions/list")
async def sa_list_subscriptions(status: Optional[str] = None, plan_id: Optional[str] = None, credentials: HTTPAuthorizationCredentials = Depends(security)):
    from superadmin.catalog_routes import list_hotel_subscriptions
    return await list_hotel_subscriptions(db, status, plan_id, credentials)

@api_router.get("/superadmin/subscriptions/{hotel_id}")
async def sa_get_subscription(hotel_id: str, credentials: HTTPAuthorizationCredentials = Depends(security)):
    from superadmin.routes import get_subscription
    return await get_subscription(hotel_id, db, credentials)

@api_router.put("/superadmin/subscriptions/{subscription_id}")
async def sa_update_subscription(subscription_id: str, sub_update: SubscriptionUpdate, credentials: HTTPAuthorizationCredentials = Depends(security)):
    from superadmin.routes import update_subscription
    return await update_subscription(subscription_id, sub_update, db, credentials)

@api_router.patch("/superadmin/subscriptions/{subscription_id}/cancel")
async def sa_cancel_subscription(subscription_id: str, credentials: HTTPAuthorizationCredentials = Depends(security)):
    from superadmin.routes import cancel_subscription
    return await cancel_subscription(subscription_id, db, credentials)

@api_router.get("/superadmin/hotels/{hotel_id}/users")
async def sa_list_hotel_users(hotel_id: str, credentials: HTTPAuthorizationCredentials = Depends(security)):
    from superadmin.routes import list_hotel_users
    return await list_hotel_users(hotel_id, db, credentials)

@api_router.post("/superadmin/hotels/{hotel_id}/users/invite")
async def sa_invite_user(hotel_id: str, invite: UserInvite, credentials: HTTPAuthorizationCredentials = Depends(security)):
    from superadmin.routes import invite_user
    return await invite_user(hotel_id, invite, db, credentials)

@api_router.delete("/superadmin/users/{user_id}")
async def sa_remove_user(user_id: str, credentials: HTTPAuthorizationCredentials = Depends(security)):
    from superadmin.routes import remove_user
    return await remove_user(user_id, db, credentials)

@api_router.post("/superadmin/sepa-mandates")
async def sa_create_sepa_mandate(mandate: SEPAMandateCreate, credentials: HTTPAuthorizationCredentials = Depends(security)):
    from superadmin.routes import create_sepa_mandate
    return await create_sepa_mandate(mandate, db, credentials)

@api_router.get("/superadmin/sepa-mandates/{hotel_id}")
async def sa_get_sepa_mandates(hotel_id: str, credentials: HTTPAuthorizationCredentials = Depends(security)):
    from superadmin.routes import get_sepa_mandates
    return await get_sepa_mandates(hotel_id, db, credentials)

@api_router.patch("/superadmin/sepa-mandates/{mandate_id}/sign")
async def sa_sign_sepa_mandate(mandate_id: str, credentials: HTTPAuthorizationCredentials = Depends(security)):
    from superadmin.routes import sign_sepa_mandate
    return await sign_sepa_mandate(mandate_id, db, credentials)

@api_router.get("/superadmin/hotels/{hotel_id}/contract/pdf")
async def sa_generate_contract_pdf(hotel_id: str, credentials: HTTPAuthorizationCredentials = Depends(security)):
    from superadmin.routes import generate_contract_pdf
    return await generate_contract_pdf(hotel_id, db, credentials)

@api_router.get("/superadmin/hotels/{hotel_id}/sepa-mandate/pdf")
async def sa_generate_sepa_mandate_pdf(hotel_id: str, credentials: HTTPAuthorizationCredentials = Depends(security)):
    from superadmin.routes import generate_sepa_mandate_pdf
    return await generate_sepa_mandate_pdf(hotel_id, db, credentials)

@api_router.get("/superadmin/invoices")
async def sa_list_invoices(hotel_id: Optional[str] = None, status: Optional[str] = None, credentials: HTTPAuthorizationCredentials = Depends(security)):
    from superadmin.routes import list_invoices
    return await list_invoices(db, hotel_id, status, credentials)

@api_router.post("/superadmin/invoices/generate")
async def sa_generate_invoice(hotel_id: str, credentials: HTTPAuthorizationCredentials = Depends(security)):
    from superadmin.routes import generate_invoice
    return await generate_invoice(hotel_id, db, credentials)

@api_router.get("/superadmin/invoices/{invoice_id}/pdf")
async def sa_get_invoice_pdf(invoice_id: str, credentials: HTTPAuthorizationCredentials = Depends(security)):
    from superadmin.routes import get_invoice_pdf
    return await get_invoice_pdf(invoice_id, db, credentials)

@api_router.get("/superadmin/logs")
async def sa_get_activity_logs(entity_type: Optional[str] = None, limit: int = 50, credentials: HTTPAuthorizationCredentials = Depends(security)):
    from superadmin.routes import get_activity_logs
    return await get_activity_logs(db, entity_type, limit, credentials)

@api_router.post("/superadmin/support/simulate-user")
async def sa_simulate_user_view(hotel_id: str, role: HotelUserRole, credentials: HTTPAuthorizationCredentials = Depends(security)):
    from superadmin.routes import simulate_user_view
    return await simulate_user_view(hotel_id, role, db, credentials)

@api_router.post("/superadmin/support/end-session")
async def sa_end_support_session(credentials: HTTPAuthorizationCredentials = Depends(security)):
    from superadmin.routes import end_support_session
    return await end_support_session(db, credentials)

# Electronic Signature endpoints
from superadmin.routes import SignatureRequestCreate

@api_router.post("/superadmin/signature/send")
async def sa_send_for_signature(request: SignatureRequestCreate, credentials: HTTPAuthorizationCredentials = Depends(security)):
    from superadmin.routes import send_for_signature
    return await send_for_signature(request, db, credentials)

@api_router.get("/superadmin/signature/status/{signature_request_id}")
async def sa_get_signature_status(signature_request_id: str, credentials: HTTPAuthorizationCredentials = Depends(security)):
    from superadmin.routes import get_signature_status
    return await get_signature_status(signature_request_id, db, credentials)

@api_router.get("/superadmin/signature/requests/{hotel_id}")
async def sa_list_signature_requests(hotel_id: str, credentials: HTTPAuthorizationCredentials = Depends(security)):
    from superadmin.routes import list_signature_requests
    return await list_signature_requests(hotel_id, db, credentials)

# ===================== SUBSCRIPTION CATALOG & LIFECYCLE =====================
from superadmin.catalog_models import (
    SubscriptionPlanCreate, SubscriptionPlanUpdate,
    PauseSubscriptionRequest, ReactivateSubscriptionRequest,
    UpgradeSubscriptionRequest, DowngradeSubscriptionRequest, DowngradeAction
)

# Catalog - Modules
@api_router.get("/superadmin/catalog/modules")
async def sa_get_modules(credentials: HTTPAuthorizationCredentials = Depends(security)):
    from superadmin.catalog_routes import get_available_modules
    return await get_available_modules(credentials)

# Catalog - Plans
@api_router.get("/superadmin/catalog/plans")
async def sa_list_catalog_plans(include_inactive: bool = False, credentials: HTTPAuthorizationCredentials = Depends(security)):
    from superadmin.catalog_routes import list_subscription_plans
    return await list_subscription_plans(db, include_inactive, credentials)

@api_router.get("/superadmin/catalog/plans/{plan_id}")
async def sa_get_catalog_plan(plan_id: str, credentials: HTTPAuthorizationCredentials = Depends(security)):
    from superadmin.catalog_routes import get_subscription_plan
    return await get_subscription_plan(plan_id, db, credentials)

@api_router.post("/superadmin/catalog/plans")
async def sa_create_catalog_plan(plan: SubscriptionPlanCreate, credentials: HTTPAuthorizationCredentials = Depends(security)):
    from superadmin.catalog_routes import create_subscription_plan
    return await create_subscription_plan(plan, db, credentials)

@api_router.put("/superadmin/catalog/plans/{plan_id}")
async def sa_update_catalog_plan(plan_id: str, plan_update: SubscriptionPlanUpdate, credentials: HTTPAuthorizationCredentials = Depends(security)):
    from superadmin.catalog_routes import update_subscription_plan
    return await update_subscription_plan(plan_id, plan_update, db, credentials)

@api_router.delete("/superadmin/catalog/plans/{plan_id}")
async def sa_delete_catalog_plan(plan_id: str, credentials: HTTPAuthorizationCredentials = Depends(security)):
    from superadmin.catalog_routes import delete_subscription_plan
    return await delete_subscription_plan(plan_id, db, credentials)

@api_router.get("/superadmin/subscriptions/{subscription_id}/detail")
async def sa_get_subscription_detail(subscription_id: str, credentials: HTTPAuthorizationCredentials = Depends(security)):
    from superadmin.catalog_routes import get_subscription_detail
    return await get_subscription_detail(subscription_id, db, credentials)

# Lifecycle - Pause/Reactivate
@api_router.post("/superadmin/subscriptions/{subscription_id}/pause")
async def sa_pause_subscription(subscription_id: str, request: PauseSubscriptionRequest, credentials: HTTPAuthorizationCredentials = Depends(security)):
    from superadmin.catalog_routes import pause_subscription
    return await pause_subscription(subscription_id, request, db, credentials)

@api_router.post("/superadmin/subscriptions/{subscription_id}/reactivate")
async def sa_reactivate_subscription(subscription_id: str, request: ReactivateSubscriptionRequest, credentials: HTTPAuthorizationCredentials = Depends(security)):
    from superadmin.catalog_routes import reactivate_subscription
    return await reactivate_subscription(subscription_id, request, db, credentials)

# Lifecycle - Upgrade
@api_router.post("/superadmin/subscriptions/{subscription_id}/upgrade/check")
async def sa_check_upgrade(subscription_id: str, request: UpgradeSubscriptionRequest, credentials: HTTPAuthorizationCredentials = Depends(security)):
    from superadmin.catalog_routes import check_upgrade_compatibility
    return await check_upgrade_compatibility(subscription_id, request, db, credentials)

@api_router.post("/superadmin/subscriptions/{subscription_id}/upgrade")
async def sa_upgrade_subscription(subscription_id: str, request: UpgradeSubscriptionRequest, credentials: HTTPAuthorizationCredentials = Depends(security)):
    from superadmin.catalog_routes import upgrade_subscription
    return await upgrade_subscription(subscription_id, request, db, credentials)

# Lifecycle - Downgrade
@api_router.post("/superadmin/subscriptions/{subscription_id}/downgrade/check")
async def sa_check_downgrade(subscription_id: str, request: DowngradeSubscriptionRequest, credentials: HTTPAuthorizationCredentials = Depends(security)):
    from superadmin.catalog_routes import check_downgrade_compatibility
    return await check_downgrade_compatibility(subscription_id, request, db, credentials)

@api_router.post("/superadmin/subscriptions/{subscription_id}/downgrade")
async def sa_downgrade_subscription(subscription_id: str, request: DowngradeSubscriptionRequest, credentials: HTTPAuthorizationCredentials = Depends(security)):
    from superadmin.catalog_routes import downgrade_subscription
    return await downgrade_subscription(subscription_id, request, db, credentials)

# Create subscription from catalog
@api_router.post("/superadmin/subscriptions/create-from-catalog")
async def sa_create_subscription_from_catalog(
    hotel_id: str,
    plan_id: str,
    payment_frequency: str = "monthly",
    trial_days: Optional[int] = None,
    custom_max_users: Optional[int] = None,
    custom_price: Optional[float] = None,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    from superadmin.catalog_routes import create_subscription_from_catalog
    return await create_subscription_from_catalog(hotel_id, plan_id, payment_frequency, trial_days, custom_max_users, custom_price, db, credentials)

# ===================== HOTEL CONFIGURATION & SUBSCRIPTION MANAGEMENT =====================
from superadmin.hotel_config_routes import (
    HotelConfigUpdate, RoomType, Room, Equipment, Service,
    SubscriptionAssignment, SubscriptionModification, TrialExtension
)

# Hotel Configuration
@api_router.get("/superadmin/hotels/{hotel_id}/config")
async def sa_get_hotel_config(hotel_id: str, credentials: HTTPAuthorizationCredentials = Depends(security)):
    from superadmin.hotel_config_routes import get_hotel_config
    return await get_hotel_config(hotel_id, db, credentials)

@api_router.put("/superadmin/hotels/{hotel_id}/config")
async def sa_update_hotel_config(hotel_id: str, config: HotelConfigUpdate, credentials: HTTPAuthorizationCredentials = Depends(security)):
    from superadmin.hotel_config_routes import update_hotel_config
    return await update_hotel_config(hotel_id, config, db, credentials)

# Room Types
@api_router.get("/superadmin/hotels/{hotel_id}/room-types")
async def sa_list_room_types(hotel_id: str, credentials: HTTPAuthorizationCredentials = Depends(security)):
    from superadmin.hotel_config_routes import list_room_types
    return await list_room_types(hotel_id, db, credentials)

@api_router.post("/superadmin/hotels/{hotel_id}/room-types")
async def sa_create_room_type(hotel_id: str, room_type: RoomType, credentials: HTTPAuthorizationCredentials = Depends(security)):
    from superadmin.hotel_config_routes import create_room_type
    return await create_room_type(hotel_id, room_type, db, credentials)

@api_router.put("/superadmin/hotels/{hotel_id}/room-types/{type_id}")
async def sa_update_room_type(hotel_id: str, type_id: str, room_type: RoomType, credentials: HTTPAuthorizationCredentials = Depends(security)):
    from superadmin.hotel_config_routes import update_room_type
    return await update_room_type(hotel_id, type_id, room_type, db, credentials)

@api_router.delete("/superadmin/hotels/{hotel_id}/room-types/{type_id}")
async def sa_delete_room_type(hotel_id: str, type_id: str, credentials: HTTPAuthorizationCredentials = Depends(security)):
    from superadmin.hotel_config_routes import delete_room_type
    return await delete_room_type(hotel_id, type_id, db, credentials)

# Rooms
@api_router.get("/superadmin/hotels/{hotel_id}/rooms")
async def sa_list_rooms(hotel_id: str, credentials: HTTPAuthorizationCredentials = Depends(security)):
    from superadmin.hotel_config_routes import list_rooms
    return await list_rooms(hotel_id, db, credentials)

@api_router.post("/superadmin/hotels/{hotel_id}/rooms")
async def sa_create_room(hotel_id: str, room: Room, credentials: HTTPAuthorizationCredentials = Depends(security)):
    from superadmin.hotel_config_routes import create_room
    return await create_room(hotel_id, room, db, credentials)

@api_router.post("/superadmin/hotels/{hotel_id}/rooms/bulk")
async def sa_create_rooms_bulk(hotel_id: str, rooms: List[Room], credentials: HTTPAuthorizationCredentials = Depends(security)):
    from superadmin.hotel_config_routes import create_rooms_bulk
    return await create_rooms_bulk(hotel_id, rooms, db, credentials)

@api_router.delete("/superadmin/hotels/{hotel_id}/rooms/{room_id}")
async def sa_delete_room(hotel_id: str, room_id: str, credentials: HTTPAuthorizationCredentials = Depends(security)):
    from superadmin.hotel_config_routes import delete_room
    return await delete_room(hotel_id, room_id, db, credentials)

# Equipment
@api_router.get("/superadmin/hotels/{hotel_id}/equipment")
async def sa_list_equipment(hotel_id: str, credentials: HTTPAuthorizationCredentials = Depends(security)):
    from superadmin.hotel_config_routes import list_equipment
    return await list_equipment(hotel_id, db, credentials)

@api_router.post("/superadmin/hotels/{hotel_id}/equipment")
async def sa_create_equipment(hotel_id: str, equipment: Equipment, credentials: HTTPAuthorizationCredentials = Depends(security)):
    from superadmin.hotel_config_routes import create_equipment
    return await create_equipment(hotel_id, equipment, db, credentials)

@api_router.delete("/superadmin/hotels/{hotel_id}/equipment/{equipment_id}")
async def sa_delete_equipment(hotel_id: str, equipment_id: str, credentials: HTTPAuthorizationCredentials = Depends(security)):
    from superadmin.hotel_config_routes import delete_equipment
    return await delete_equipment(hotel_id, equipment_id, db, credentials)

# Services
@api_router.get("/superadmin/hotels/{hotel_id}/services")
async def sa_list_services(hotel_id: str, credentials: HTTPAuthorizationCredentials = Depends(security)):
    from superadmin.hotel_config_routes import list_services
    return await list_services(hotel_id, db, credentials)

@api_router.post("/superadmin/hotels/{hotel_id}/services")
async def sa_create_service(hotel_id: str, service: Service, credentials: HTTPAuthorizationCredentials = Depends(security)):
    from superadmin.hotel_config_routes import create_service
    return await create_service(hotel_id, service, db, credentials)

@api_router.delete("/superadmin/hotels/{hotel_id}/services/{service_id}")
async def sa_delete_service(hotel_id: str, service_id: str, credentials: HTTPAuthorizationCredentials = Depends(security)):
    from superadmin.hotel_config_routes import delete_service
    return await delete_service(hotel_id, service_id, db, credentials)

# Subscription Management per Hotel
@api_router.post("/superadmin/hotels/{hotel_id}/subscription/assign")
async def sa_assign_subscription(hotel_id: str, assignment: SubscriptionAssignment, credentials: HTTPAuthorizationCredentials = Depends(security)):
    from superadmin.hotel_config_routes import assign_subscription
    return await assign_subscription(hotel_id, assignment, db, credentials)

@api_router.post("/superadmin/hotels/{hotel_id}/subscription/modify")
async def sa_modify_subscription(hotel_id: str, modification: SubscriptionModification, credentials: HTTPAuthorizationCredentials = Depends(security)):
    from superadmin.hotel_config_routes import modify_subscription
    return await modify_subscription(hotel_id, modification, db, credentials)

@api_router.post("/superadmin/hotels/{hotel_id}/subscription/extend-trial")
async def sa_extend_trial(hotel_id: str, extension: TrialExtension, credentials: HTTPAuthorizationCredentials = Depends(security)):
    from superadmin.hotel_config_routes import extend_trial
    return await extend_trial(hotel_id, extension, db, credentials)

@api_router.get("/superadmin/hotels/{hotel_id}/subscription/modules")
async def sa_get_hotel_modules(hotel_id: str, credentials: HTTPAuthorizationCredentials = Depends(security)):
    from superadmin.hotel_config_routes import get_hotel_modules
    return await get_hotel_modules(hotel_id, db, credentials)

# ===================== CRM MODULE =====================
from crm.models import (
    ClientCreate as CRMClientCreate, ClientUpdate as CRMClientUpdate,
    SegmentCreate as CRMSegmentCreate, SegmentUpdate as CRMSegmentUpdate,
    MessageCreate as CRMMessageCreate,
    CampaignCreate as CRMCampaignCreate, CampaignUpdate as CRMCampaignUpdate,
    WorkflowCreate as CRMWorkflowCreate, WorkflowUpdate as CRMWorkflowUpdate,
    AutoReplyCreate as CRMAutoReplyCreate,
    AlertCreate as CRMAlertCreate
)

# CRM Clients
@api_router.get("/crm/clients")
async def crm_list_clients(
    search: Optional[str] = None,
    client_type: Optional[str] = None,
    status: Optional[str] = None,
    segment_id: Optional[str] = None,
    sort_by: str = "created_at",
    sort_order: str = "desc",
    limit: int = 50,
    offset: int = 0,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    from crm.routes import list_clients
    return await list_clients(db, search, client_type, status, segment_id, sort_by, sort_order, limit, offset, credentials)

@api_router.get("/crm/clients/{client_id}")
async def crm_get_client(client_id: str, credentials: HTTPAuthorizationCredentials = Depends(security)):
    from crm.routes import get_client
    return await get_client(client_id, db, credentials)

@api_router.post("/crm/clients")
async def crm_create_client(client: CRMClientCreate, credentials: HTTPAuthorizationCredentials = Depends(security)):
    from crm.routes import create_client
    return await create_client(client, db, credentials)

@api_router.put("/crm/clients/{client_id}")
async def crm_update_client(client_id: str, client_update: CRMClientUpdate, credentials: HTTPAuthorizationCredentials = Depends(security)):
    from crm.routes import update_client
    return await update_client(client_id, client_update, db, credentials)

@api_router.delete("/crm/clients/{client_id}")
async def crm_delete_client(client_id: str, credentials: HTTPAuthorizationCredentials = Depends(security)):
    from crm.routes import delete_client
    return await delete_client(client_id, db, credentials)

# CRM Segments
@api_router.get("/crm/segments")
async def crm_list_segments(credentials: HTTPAuthorizationCredentials = Depends(security)):
    from crm.routes import list_segments
    return await list_segments(db, credentials)

@api_router.post("/crm/segments")
async def crm_create_segment(segment: CRMSegmentCreate, credentials: HTTPAuthorizationCredentials = Depends(security)):
    from crm.routes import create_segment
    return await create_segment(segment, db, credentials)

@api_router.put("/crm/segments/{segment_id}")
async def crm_update_segment(segment_id: str, segment_update: CRMSegmentUpdate, credentials: HTTPAuthorizationCredentials = Depends(security)):
    from crm.routes import update_segment
    return await update_segment(segment_id, segment_update, db, credentials)

@api_router.delete("/crm/segments/{segment_id}")
async def crm_delete_segment(segment_id: str, credentials: HTTPAuthorizationCredentials = Depends(security)):
    from crm.routes import delete_segment
    return await delete_segment(segment_id, db, credentials)

# CRM Conversations & Messages
@api_router.get("/crm/conversations")
async def crm_list_conversations(status: Optional[str] = None, channel: Optional[str] = None, credentials: HTTPAuthorizationCredentials = Depends(security)):
    from crm.routes import list_conversations
    return await list_conversations(db, status, channel, credentials)

@api_router.get("/crm/conversations/{conversation_id}/messages")
async def crm_get_conversation_messages(conversation_id: str, credentials: HTTPAuthorizationCredentials = Depends(security)):
    from crm.routes import get_conversation_messages
    return await get_conversation_messages(conversation_id, db, credentials)

@api_router.post("/crm/messages")
async def crm_send_message(message: CRMMessageCreate, credentials: HTTPAuthorizationCredentials = Depends(security)):
    from crm.routes import send_message
    return await send_message(message, db, credentials)

# CRM Campaigns
@api_router.get("/crm/campaigns")
async def crm_list_campaigns(status: Optional[str] = None, credentials: HTTPAuthorizationCredentials = Depends(security)):
    from crm.routes import list_campaigns
    return await list_campaigns(db, status, credentials)

@api_router.post("/crm/campaigns")
async def crm_create_campaign(campaign: CRMCampaignCreate, credentials: HTTPAuthorizationCredentials = Depends(security)):
    from crm.routes import create_campaign
    return await create_campaign(campaign, db, credentials)

@api_router.put("/crm/campaigns/{campaign_id}")
async def crm_update_campaign(campaign_id: str, campaign_update: CRMCampaignUpdate, credentials: HTTPAuthorizationCredentials = Depends(security)):
    from crm.routes import update_campaign
    return await update_campaign(campaign_id, campaign_update, db, credentials)

@api_router.post("/crm/campaigns/{campaign_id}/launch")
async def crm_launch_campaign(campaign_id: str, credentials: HTTPAuthorizationCredentials = Depends(security)):
    from crm.routes import launch_campaign
    return await launch_campaign(campaign_id, db, credentials)

# CRM Workflows
@api_router.get("/crm/workflows")
async def crm_list_workflows(credentials: HTTPAuthorizationCredentials = Depends(security)):
    from crm.routes import list_workflows
    return await list_workflows(db, credentials)

@api_router.post("/crm/workflows")
async def crm_create_workflow(workflow: CRMWorkflowCreate, credentials: HTTPAuthorizationCredentials = Depends(security)):
    from crm.routes import create_workflow
    return await create_workflow(workflow, db, credentials)

@api_router.put("/crm/workflows/{workflow_id}")
async def crm_update_workflow(workflow_id: str, workflow_update: CRMWorkflowUpdate, credentials: HTTPAuthorizationCredentials = Depends(security)):
    from crm.routes import update_workflow
    return await update_workflow(workflow_id, workflow_update, db, credentials)

@api_router.post("/crm/workflows/{workflow_id}/toggle")
async def crm_toggle_workflow(workflow_id: str, credentials: HTTPAuthorizationCredentials = Depends(security)):
    from crm.routes import toggle_workflow
    return await toggle_workflow(workflow_id, db, credentials)

# CRM Auto-Replies
@api_router.get("/crm/auto-replies")
async def crm_list_auto_replies(credentials: HTTPAuthorizationCredentials = Depends(security)):
    from crm.routes import list_auto_replies
    return await list_auto_replies(db, credentials)

@api_router.post("/crm/auto-replies")
async def crm_create_auto_reply(auto_reply: CRMAutoReplyCreate, credentials: HTTPAuthorizationCredentials = Depends(security)):
    from crm.routes import create_auto_reply
    return await create_auto_reply(auto_reply, db, credentials)

@api_router.delete("/crm/auto-replies/{rule_id}")
async def crm_delete_auto_reply(rule_id: str, credentials: HTTPAuthorizationCredentials = Depends(security)):
    from crm.routes import delete_auto_reply
    return await delete_auto_reply(rule_id, db, credentials)

# CRM Alerts
@api_router.get("/crm/alerts")
async def crm_list_alerts(unread_only: bool = False, credentials: HTTPAuthorizationCredentials = Depends(security)):
    from crm.routes import list_alerts
    return await list_alerts(db, unread_only, credentials)

@api_router.post("/crm/alerts")
async def crm_create_alert(alert: CRMAlertCreate, credentials: HTTPAuthorizationCredentials = Depends(security)):
    from crm.routes import create_alert
    return await create_alert(alert, db, credentials)

@api_router.post("/crm/alerts/{alert_id}/read")
async def crm_mark_alert_read(alert_id: str, credentials: HTTPAuthorizationCredentials = Depends(security)):
    from crm.routes import mark_alert_read
    return await mark_alert_read(alert_id, db, credentials)

# CRM Analytics
@api_router.get("/crm/analytics")
async def crm_get_analytics(credentials: HTTPAuthorizationCredentials = Depends(security)):
    from crm.routes import get_analytics
    return await get_analytics(db, credentials)

# CRM PMS Integration
@api_router.post("/crm/sync-from-pms")
async def crm_sync_from_pms(credentials: HTTPAuthorizationCredentials = Depends(security)):
    from crm.routes import sync_clients_from_pms
    return await sync_clients_from_pms(db, credentials)

@api_router.get("/crm/client-by-email/{email}")
async def crm_get_client_by_email(email: str, credentials: HTTPAuthorizationCredentials = Depends(security)):
    from crm.routes import get_client_by_email
    return await get_client_by_email(email, db, credentials)

# CRM Advanced Analytics
from crm.advanced_analytics import PeriodFilter

@api_router.post("/crm/analytics/advanced")
async def crm_get_advanced_analytics(
    period: PeriodFilter = None,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    from crm.routes import get_advanced_analytics
    return await get_advanced_analytics(db, period, credentials)

@api_router.get("/crm/analytics/attrition")
async def crm_get_attrition_analysis(
    limit: int = 20,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    from crm.routes import get_attrition_analysis
    return await get_attrition_analysis(db, limit, credentials)

@api_router.get("/crm/analytics/retention-cohorts")
async def crm_get_retention_cohorts(
    period_type: str = "6m",
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    from crm.routes import get_retention_cohorts
    return await get_retention_cohorts(db, period_type, credentials)

@api_router.get("/crm/analytics/ltv")
async def crm_get_ltv_analytics(
    period_type: str = "12m",
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    from crm.routes import get_ltv_analytics
    return await get_ltv_analytics(db, period_type, credentials)

# ── Phase 17 : CRM → ConfigService ───────────────────────────────────────────
@api_router.get("/crm/hotels/{hotel_id}/clients")
async def crm_list_clients_by_hotel(
    hotel_id: str,
    search: Optional[str] = None,
    client_type: Optional[str] = None,
    status: Optional[str] = None,
    segment_id: Optional[str] = None,
    sort_by: str = "created_at",
    sort_order: str = "desc",
    limit: int = 50,
    offset: int = 0,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    from crm.routes import list_clients_by_hotel
    return await list_clients_by_hotel(
        hotel_id, db, search, client_type, status,
        segment_id, sort_by, sort_order, limit, offset, credentials
    )

@api_router.post("/crm/hotels/{hotel_id}/clients/{client_id}/enrich")
async def crm_enrich_client(
    hotel_id: str,
    client_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    from crm.routes import enrich_client_from_config
    return await enrich_client_from_config(hotel_id, client_id, db, credentials)

@api_router.post("/crm/hotels/{hotel_id}/clients/sync-and-enrich")
async def crm_sync_and_enrich(
    hotel_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    from crm.routes import sync_and_enrich_all_clients
    return await sync_and_enrich_all_clients(hotel_id, db, credentials)

# ===================== CHANNEL MANAGER MODULE =====================
from channel.models import (
    ChannelConnectionCreate, ChannelConnectionUpdate,
    RoomMappingCreate, RoomMappingUpdate,
    InventoryUpdate, InventoryBulkUpdate,
    RateUpdate, RateBulkUpdate
)

# Channel Connections
@api_router.get("/hotels/{hotel_id}/channel/connections")
async def channel_list_connections(hotel_id: str, credentials: HTTPAuthorizationCredentials = Depends(security)):
    from channel.routes import list_channel_connections
    return await list_channel_connections(db, hotel_id, credentials)

@api_router.post("/hotels/{hotel_id}/channel/connections")
async def channel_create_connection(hotel_id: str, connection: ChannelConnectionCreate, credentials: HTTPAuthorizationCredentials = Depends(security)):
    from channel.routes import create_channel_connection
    return await create_channel_connection(hotel_id, connection, db, credentials)

@api_router.put("/channel/connections/{connection_id}")
async def channel_update_connection(connection_id: str, update: ChannelConnectionUpdate, credentials: HTTPAuthorizationCredentials = Depends(security)):
    from channel.routes import update_channel_connection
    return await update_channel_connection(connection_id, update, db, credentials)

@api_router.delete("/channel/connections/{connection_id}")
async def channel_delete_connection(connection_id: str, credentials: HTTPAuthorizationCredentials = Depends(security)):
    from channel.routes import delete_channel_connection
    return await delete_channel_connection(connection_id, db, credentials)

@api_router.post("/channel/connections/{connection_id}/test")
async def channel_test_connection(connection_id: str, credentials: HTTPAuthorizationCredentials = Depends(security)):
    from channel.routes import test_channel_connection
    return await test_channel_connection(connection_id, db, credentials)

# Channel Mappings
@api_router.get("/hotels/{hotel_id}/channel/mappings")
async def channel_list_mappings(hotel_id: str, channel_id: Optional[str] = None, credentials: HTTPAuthorizationCredentials = Depends(security)):
    from channel.routes import list_room_mappings
    return await list_room_mappings(db, hotel_id, channel_id, credentials)

@api_router.post("/hotels/{hotel_id}/channel/mappings")
async def channel_create_mapping(hotel_id: str, mapping: RoomMappingCreate, credentials: HTTPAuthorizationCredentials = Depends(security)):
    from channel.routes import create_room_mapping
    return await create_room_mapping(hotel_id, mapping, db, credentials)

@api_router.delete("/channel/mappings/{mapping_id}")
async def channel_delete_mapping(mapping_id: str, credentials: HTTPAuthorizationCredentials = Depends(security)):
    from channel.routes import delete_room_mapping
    return await delete_room_mapping(mapping_id, db, credentials)

# Channel Inventory
@api_router.get("/hotels/{hotel_id}/channel/inventory")
async def channel_get_inventory(hotel_id: str, start_date: str, end_date: str, room_type_id: Optional[str] = None, channel_id: Optional[str] = None, credentials: HTTPAuthorizationCredentials = Depends(security)):
    from channel.routes import get_inventory
    return await get_inventory(db, hotel_id, start_date, end_date, room_type_id, channel_id, credentials)

@api_router.post("/hotels/{hotel_id}/channel/inventory/update")
async def channel_update_inventory(hotel_id: str, update: InventoryUpdate, credentials: HTTPAuthorizationCredentials = Depends(security)):
    from channel.routes import update_inventory
    return await update_inventory(hotel_id, update, db, credentials)

@api_router.post("/hotels/{hotel_id}/channel/inventory/bulk-update")
async def channel_bulk_update_inventory(hotel_id: str, bulk: InventoryBulkUpdate, credentials: HTTPAuthorizationCredentials = Depends(security)):
    from channel.routes import bulk_update_inventory
    return await bulk_update_inventory(hotel_id, bulk, db, credentials)

# Channel Rates
@api_router.get("/hotels/{hotel_id}/channel/rates")
async def channel_get_rates(hotel_id: str, start_date: str, end_date: str, room_type_id: Optional[str] = None, channel_id: Optional[str] = None, credentials: HTTPAuthorizationCredentials = Depends(security)):
    from channel.routes import get_rates
    return await get_rates(db, hotel_id, start_date, end_date, room_type_id, channel_id, credentials)

@api_router.post("/hotels/{hotel_id}/channel/rates/update")
async def channel_update_rate(hotel_id: str, update: RateUpdate, credentials: HTTPAuthorizationCredentials = Depends(security)):
    from channel.routes import update_rate
    return await update_rate(hotel_id, update, db, credentials)

# Channel Reservations
@api_router.get("/hotels/{hotel_id}/channel/reservations")
async def channel_list_reservations(hotel_id: str, start_date: Optional[str] = None, end_date: Optional[str] = None, channel_id: Optional[str] = None, status: Optional[str] = None, limit: int = 50, offset: int = 0, credentials: HTTPAuthorizationCredentials = Depends(security)):
    from channel.routes import list_ota_reservations
    return await list_ota_reservations(db, hotel_id, start_date, end_date, channel_id, status, limit, offset, credentials)

@api_router.post("/hotels/{hotel_id}/channel/reservations/sync")
async def channel_sync_reservations(hotel_id: str, channel_id: Optional[str] = None, credentials: HTTPAuthorizationCredentials = Depends(security)):
    from channel.routes import sync_reservations
    return await sync_reservations(hotel_id, channel_id, db, credentials)

@api_router.post("/channel/reservations/{reservation_id}/sync-to-pms")
async def channel_sync_to_pms(reservation_id: str, credentials: HTTPAuthorizationCredentials = Depends(security)):
    from channel.routes import sync_reservation_to_pms
    return await sync_reservation_to_pms(reservation_id, db, credentials)

# Channel Sync Logs
@api_router.get("/hotels/{hotel_id}/channel/sync-logs")
async def channel_get_sync_logs(hotel_id: str, channel_id: Optional[str] = None, operation: Optional[str] = None, limit: int = 50, credentials: HTTPAuthorizationCredentials = Depends(security)):
    from channel.routes import get_sync_logs
    return await get_sync_logs(db, hotel_id, channel_id, operation, limit, credentials)

# Rate Shopper
@api_router.get("/hotels/{hotel_id}/channel/rate-shopper")
async def channel_rate_shopper(hotel_id: str, date: str, room_type_id: Optional[str] = None, credentials: HTTPAuthorizationCredentials = Depends(security)):
    from channel.routes import get_rate_shopper_data
    return await get_rate_shopper_data(db, hotel_id, date, room_type_id, credentials)

# ── Phase 17 : Channel Manager → ConfigService ───────────────────────────────
@api_router.post("/hotels/{hotel_id}/channel/sync-rates-from-config")
async def channel_sync_rates_from_config(
    hotel_id: str,
    start_date: str = Query(...),
    end_date: str = Query(...),
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    from channel.routes import sync_rates_from_config
    return await sync_rates_from_config(hotel_id, db, start_date, end_date, credentials)

@api_router.get("/hotels/{hotel_id}/channel/room-types-from-config")
async def channel_room_types_from_config(
    hotel_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    from channel.routes import get_room_types_from_config
    return await get_room_types_from_config(hotel_id, db, credentials)

# ===================== OBJECT STORAGE MODULE =====================
from fastapi import UploadFile, File, Query, Response, Header

@api_router.post("/storage/upload")
async def storage_upload(
    file: UploadFile = File(...),
    hotel_id: str = Query(...),
    category: str = Query(...),
    entity_type: Optional[str] = Query(None),
    entity_id: Optional[str] = Query(None),
    document_type: Optional[str] = Query(None),
    description: Optional[str] = Query(None),
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    from storage.routes import upload_document
    return await upload_document(file, hotel_id, category, entity_type, entity_id, document_type, description, db, credentials)

@api_router.get("/storage/files/{file_id}")
async def storage_get_file(file_id: str, credentials: HTTPAuthorizationCredentials = Depends(security)):
    from storage.routes import get_file_metadata
    return await get_file_metadata(file_id, db, credentials)

@api_router.get("/storage/files/{file_id}/download")
async def storage_download(file_id: str, authorization: Optional[str] = Header(None), auth: Optional[str] = Query(None), credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)):
    from storage.routes import download_document
    return await download_document(file_id, db, authorization, auth, credentials)

@api_router.get("/storage/files")
async def storage_list_files(hotel_id: str, category: Optional[str] = None, entity_type: Optional[str] = None, entity_id: Optional[str] = None, limit: int = 50, credentials: HTTPAuthorizationCredentials = Depends(security)):
    from storage.routes import list_files
    return await list_files(hotel_id, category, entity_type, entity_id, limit, db, credentials)

@api_router.delete("/storage/files/{file_id}")
async def storage_delete_file(file_id: str, credentials: HTTPAuthorizationCredentials = Depends(security)):
    from storage.routes import delete_file
    return await delete_file(file_id, db, credentials)

@api_router.get("/storage/entity/{entity_type}/{entity_id}/files")
async def storage_entity_files(entity_type: str, entity_id: str, hotel_id: str = Query(...), credentials: HTTPAuthorizationCredentials = Depends(security)):
    from storage.routes import list_entity_files
    return await list_entity_files(entity_type, entity_id, hotel_id, db, credentials)

# ===================== PAYROLL REPORTING MODULE =====================

from payroll_reporting.models import (
    PayrollReportConfigCreate, PayrollReportConfigResponse,
    GenerateReportRequest, PayrollReportResponse, SendReportRequest, EmailLogResponse
)
from payroll_reporting.routes import set_database as set_payroll_db

# Initialize payroll reporting with database
set_payroll_db(db)

@api_router.get("/hotels/{hotel_id}/payroll-reports/config", response_model=PayrollReportConfigResponse)
async def payroll_get_config(hotel_id: str, credentials: HTTPAuthorizationCredentials = Depends(security)):
    from payroll_reporting.routes import get_payroll_config
    return await get_payroll_config(hotel_id)

@api_router.put("/hotels/{hotel_id}/payroll-reports/config", response_model=PayrollReportConfigResponse)
async def payroll_update_config(hotel_id: str, config: PayrollReportConfigCreate, credentials: HTTPAuthorizationCredentials = Depends(security)):
    from payroll_reporting.routes import update_payroll_config
    return await update_payroll_config(hotel_id, config)

@api_router.post("/hotels/{hotel_id}/payroll-reports/generate", response_model=PayrollReportResponse)
async def payroll_generate_reports(hotel_id: str, request: GenerateReportRequest, credentials: HTTPAuthorizationCredentials = Depends(security)):
    from payroll_reporting.routes import generate_payroll_reports
    return await generate_payroll_reports(hotel_id, request)

@api_router.get("/hotels/{hotel_id}/payroll-reports/reports", response_model=List[PayrollReportResponse])
async def payroll_list_reports(hotel_id: str, year: Optional[int] = None, credentials: HTTPAuthorizationCredentials = Depends(security)):
    from payroll_reporting.routes import list_payroll_reports
    return await list_payroll_reports(hotel_id, year)

@api_router.get("/hotels/{hotel_id}/payroll-reports/reports/{report_id}")
async def payroll_get_report(hotel_id: str, report_id: str, credentials: HTTPAuthorizationCredentials = Depends(security)):
    from payroll_reporting.routes import get_payroll_report
    return await get_payroll_report(hotel_id, report_id)

@api_router.get("/hotels/{hotel_id}/payroll-reports/reports/{report_id}/download/{file_type}")
async def payroll_download_file(hotel_id: str, report_id: str, file_type: str, credentials: HTTPAuthorizationCredentials = Depends(security)):
    from payroll_reporting.routes import download_report_file
    return await download_report_file(hotel_id, report_id, file_type)

@api_router.post("/hotels/{hotel_id}/payroll-reports/reports/{report_id}/send")
async def payroll_send_email(hotel_id: str, report_id: str, request: SendReportRequest, credentials: HTTPAuthorizationCredentials = Depends(security)):
    from payroll_reporting.routes import send_payroll_report_email
    return await send_payroll_report_email(hotel_id, report_id, request)

@api_router.get("/hotels/{hotel_id}/payroll-reports/email-logs", response_model=List[EmailLogResponse])
async def payroll_email_logs(hotel_id: str, limit: int = 20, credentials: HTTPAuthorizationCredentials = Depends(security)):
    from payroll_reporting.routes import get_email_logs
    return await get_email_logs(hotel_id, limit)

@api_router.get("/hotels/{hotel_id}/payroll-reports/preview")
async def payroll_preview(hotel_id: str, month: int, year: int, credentials: HTTPAuthorizationCredentials = Depends(security)):
    from payroll_reporting.routes import preview_payroll_data
    return await preview_payroll_data(hotel_id, month, year)

# ===================== PMS-CRM AUTO SYNC =====================
# This function is called automatically when a new reservation is created

async def auto_sync_reservation_to_crm(reservation: dict):
    """Automatically sync new reservation to CRM"""
    try:
        # Support both guest_email and client_email field names
        email = reservation.get("guest_email") or reservation.get("client_email")
        if not email:
            return
        
        now = datetime.now(timezone.utc).isoformat()
        hotel_id = reservation.get("hotel_id")
        
        # Check if client exists
        existing = await db.crm_clients.find_one({"email": email, "hotel_id": hotel_id})
        
        if existing:
            # Update existing client
            total_amount = reservation.get("total_amount", 0) or 0
            await db.crm_clients.update_one(
                {"email": email, "hotel_id": hotel_id},
                {
                    "$set": {
                        "last_stay": reservation.get("check_out") or reservation.get("check_in"),
                        "updated_at": now
                    },
                    "$inc": {
                        "total_stays": 1,
                        "total_spent": total_amount
                    }
                }
            )
            logger.info(f"CRM client updated: {email}")
        else:
            # Create new CRM client
            guest_name = reservation.get("guest_name") or reservation.get("client_name", "")
            parts = guest_name.split(" ", 1)
            first_name = parts[0] if parts else ""
            last_name = parts[1] if len(parts) > 1 else ""
            
            client = {
                "id": str(uuid.uuid4()),
                "hotel_id": hotel_id,
                "first_name": first_name,
                "last_name": last_name,
                "email": email,
                "phone": reservation.get("guest_phone"),
                "country": "",
                "language": "fr",
                "client_type": "regular",
                "status": "active",
                "tags": [f"Source-{reservation.get('source', 'Direct')}"],
                "preferences": {},
                "loyalty_score": 50,
                "total_stays": 1,
                "total_spent": reservation.get("total_amount", 0) or 0,
                "last_stay": reservation.get("check_out") or reservation.get("check_in"),
                "notes": "",
                "segment_ids": [],
                "created_at": now,
                "updated_at": now,
                "created_by": "pms_auto_sync"
            }
            
            await db.crm_clients.insert_one(client)
            logger.info(f"CRM client created: {email}")
            
    except Exception as e:
        logger.error(f"Error syncing reservation to CRM: {e}")

# Include Data Hub router
from datahub import datahub_router
api_router.include_router(datahub_router)

# Include RMS router
from rms.routes import router as rms_router, set_db as set_rms_db
set_rms_db(db)  # Initialize RMS module with database
api_router.include_router(rms_router)

# Include Configuration Module router
from config.routes import config_router, set_db as set_config_db
set_config_db(db)  # Initialize Config module with database
api_router.include_router(config_router)

# Include Shared Configuration Service router
from shared.config_service import init_config_service
from shared.routes import shared_router
init_config_service(db)  # Initialize shared ConfigService
api_router.include_router(shared_router)

# Include Housekeeping Module router
from housekeeping.routes import housekeeping_router, init_housekeeping_db
from housekeeping.seed_data import seed_housekeeping_data
init_housekeeping_db(db)  # Initialize Housekeeping module with database
api_router.include_router(housekeeping_router)

# Include Flowboard Module router (Central Dashboard)
from flowboard.routes import router as flowboard_router
api_router.include_router(flowboard_router)

# Include Integrations Hub router (External PMS & Channel Manager)
from integrations.routes import router as integrations_router
api_router.include_router(integrations_router)

# Housekeeping Seed Data Endpoint
@api_router.post("/housekeeping/hotels/{hotel_id}/seed")
async def seed_hk_data(hotel_id: str, current_user: dict = Depends(get_current_user)):
    """Seed demo data for housekeeping module"""
    result = await seed_housekeeping_data(db, hotel_id)
    return result

# Include Staff Pointage routes
from staff.pointage_routes import router as pointage_router, init_pointage_db
init_pointage_db(db)
api_router.include_router(pointage_router)

# Include QR Codes Module router
from qrcodes.routes import router as qrcodes_router, init_qrcodes_db
init_qrcodes_db(db)
api_router.include_router(qrcodes_router)

# Include Satisfaction Survey Module router
from satisfaction.routes import router as satisfaction_router, init_satisfaction_db
init_satisfaction_db(db)
api_router.include_router(satisfaction_router)

# Include AI Support Center router
from support.routes import router as support_router
from support.remote_access import router as remote_access_router
from consignes.routes import router as consignes_router
api_router.include_router(support_router)
api_router.include_router(remote_access_router)
api_router.include_router(consignes_router)

# ── Groups & Séminaires + Simulation & Offres ─────────────────────────────────
from groups.routes import groups_router

def init_groups_db(database):
    """Injecte la DB dans le module groups (pattern cohérent)."""
    import groups.routes as gr
    gr.groups_router.__db__ = database  # Non utilisé, la DB est passée via le scope app

# Injection DB via dependency override (même pattern que les autres modules)
@api_router.get("/hotels/{hotel_id}/groups", tags=["Groups & Séminaires"])
async def list_groups_proxy(
    hotel_id: str,
    status: Optional[str] = None,
    from_date: Optional[str] = None,
    to_date: Optional[str] = None,
    limit: int = Query(50, le=200),
    offset: int = 0,
    credentials: HTTPAuthorizationCredentials = Depends(security),
):
    from groups.routes import list_group_allocations
    return await list_group_allocations(hotel_id, db, status, from_date, to_date, limit, offset, credentials)

@api_router.post("/hotels/{hotel_id}/groups", tags=["Groups & Séminaires"])
async def create_group_proxy(
    hotel_id: str,
    data,
    credentials: HTTPAuthorizationCredentials = Depends(security),
):
    from groups.routes import GroupAllocationCreate, create_group_allocation
    return await create_group_allocation(hotel_id, data, db, credentials)

@api_router.get("/hotels/{hotel_id}/groups/stats", tags=["Groups & Séminaires"])
async def groups_stats_proxy(hotel_id: str, credentials: HTTPAuthorizationCredentials = Depends(security)):
    from groups.routes import get_groups_stats
    return await get_groups_stats(hotel_id, db, credentials)

@api_router.get("/hotels/{hotel_id}/groups/{group_id}", tags=["Groups & Séminaires"])
async def get_group_proxy(hotel_id: str, group_id: str, credentials: HTTPAuthorizationCredentials = Depends(security)):
    from groups.routes import get_group
    return await get_group(hotel_id, group_id, db, credentials)

@api_router.put("/hotels/{hotel_id}/groups/{group_id}", tags=["Groups & Séminaires"])
async def update_group_proxy(hotel_id: str, group_id: str, data, credentials: HTTPAuthorizationCredentials = Depends(security)):
    from groups.routes import GroupAllocationUpdate, update_group
    return await update_group(hotel_id, group_id, data, db, credentials)

@api_router.delete("/hotels/{hotel_id}/groups/{group_id}", tags=["Groups & Séminaires"])
async def delete_group_proxy(hotel_id: str, group_id: str, credentials: HTTPAuthorizationCredentials = Depends(security)):
    from groups.routes import delete_group
    return await delete_group(hotel_id, group_id, db, credentials)

@api_router.get("/hotels/{hotel_id}/groups/{group_id}/rooming-list", tags=["Groups & Séminaires"])
async def get_rooming_proxy(hotel_id: str, group_id: str, credentials: HTTPAuthorizationCredentials = Depends(security)):
    from groups.routes import get_rooming_list
    return await get_rooming_list(hotel_id, group_id, db, credentials)

@api_router.post("/hotels/{hotel_id}/groups/{group_id}/rooming-list", tags=["Groups & Séminaires"])
async def add_rooming_proxy(hotel_id: str, group_id: str, entry, credentials: HTTPAuthorizationCredentials = Depends(security)):
    from groups.routes import RoomingListEntry, add_rooming_entry
    return await add_rooming_entry(hotel_id, group_id, entry, db, credentials)

@api_router.delete("/hotels/{hotel_id}/groups/{group_id}/rooming-list/{entry_id}", tags=["Groups & Séminaires"])
async def delete_rooming_proxy(hotel_id: str, group_id: str, entry_id: str, credentials: HTTPAuthorizationCredentials = Depends(security)):
    from groups.routes import delete_rooming_entry
    return await delete_rooming_entry(hotel_id, group_id, entry_id, db, credentials)

# ── Quotes / Simulation & Offres ─────────────────────────────────────────────
@api_router.get("/hotels/{hotel_id}/quotes", tags=["Simulation & Offres"])
async def list_quotes_proxy(
    hotel_id: str,
    status: Optional[str] = None,
    client_name: Optional[str] = None,
    limit: int = Query(50, le=200),
    offset: int = 0,
    credentials: HTTPAuthorizationCredentials = Depends(security),
):
    from groups.routes import list_quotes
    return await list_quotes(hotel_id, db, status, client_name, limit, offset, credentials)

@api_router.post("/hotels/{hotel_id}/quotes", tags=["Simulation & Offres"])
async def create_quote_proxy(hotel_id: str, data, credentials: HTTPAuthorizationCredentials = Depends(security)):
    from groups.routes import QuoteCreate, create_quote
    return await create_quote(hotel_id, data, db, credentials)

@api_router.get("/hotels/{hotel_id}/quotes/stats", tags=["Simulation & Offres"])
async def quotes_stats_proxy(hotel_id: str, credentials: HTTPAuthorizationCredentials = Depends(security)):
    from groups.routes import get_quotes_stats
    return await get_quotes_stats(hotel_id, db, credentials)

@api_router.get("/hotels/{hotel_id}/quotes/{quote_id}", tags=["Simulation & Offres"])
async def get_quote_proxy(hotel_id: str, quote_id: str, credentials: HTTPAuthorizationCredentials = Depends(security)):
    from groups.routes import get_quote
    return await get_quote(hotel_id, quote_id, db, credentials)

@api_router.put("/hotels/{hotel_id}/quotes/{quote_id}", tags=["Simulation & Offres"])
async def update_quote_proxy(hotel_id: str, quote_id: str, data, credentials: HTTPAuthorizationCredentials = Depends(security)):
    from groups.routes import QuoteUpdate, update_quote
    return await update_quote(hotel_id, quote_id, data, db, credentials)

@api_router.post("/hotels/{hotel_id}/quotes/{quote_id}/send", tags=["Simulation & Offres"])
async def send_quote_proxy(hotel_id: str, quote_id: str, credentials: HTTPAuthorizationCredentials = Depends(security)):
    from groups.routes import send_quote
    return await send_quote(hotel_id, quote_id, db, credentials)

@api_router.post("/hotels/{hotel_id}/quotes/{quote_id}/convert", tags=["Simulation & Offres"])
async def convert_quote_proxy(hotel_id: str, quote_id: str, credentials: HTTPAuthorizationCredentials = Depends(security)):
    from groups.routes import convert_quote_to_reservation
    return await convert_quote_to_reservation(hotel_id, quote_id, db, credentials)

@api_router.post("/hotels/{hotel_id}/quotes/{quote_id}/duplicate", tags=["Simulation & Offres"])
async def duplicate_quote_proxy(hotel_id: str, quote_id: str, credentials: HTTPAuthorizationCredentials = Depends(security)):
    from groups.routes import duplicate_quote
    return await duplicate_quote(hotel_id, quote_id, db, credentials)

# Include the router in the main app
app.include_router(api_router)


app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize object storage on startup
@app.on_event("startup")
async def startup_event():
    try:
        from storage.object_storage import init_storage
        init_storage()
        logger.info("Object Storage initialized")
    except Exception as e:
        logger.warning(f"Object Storage init skipped: {e}")

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()


# ═══════════════════════════════════════════════════════════════════════════════
# SÉCURITÉ RBAC & ISOLATION HÔTEL — Phase 19
# Endpoints de gestion des permissions et audit
# ═══════════════════════════════════════════════════════════════════════════════

from shared.security import (
    get_current_user_payload, require_role, require_hotel_access,
    require_permission, combined_guard, get_role_info,
    get_user_permissions, check_permission, audit,
    ROLE_HIERARCHY, ROLE_PERMISSIONS, MULTI_HOTEL_ROLES
)


@api_router.get("/security/my-permissions")
async def get_my_permissions(
    current_user: dict = Depends(get_current_user)
):
    """
    Retourne les permissions de l'utilisateur courant.
    Utilisé par le frontend pour afficher/masquer les fonctionnalités.
    """
    role = current_user.get("role", "")
    return {
        "user_id": current_user.get("user_id"),
        "email": current_user.get("email"),
        "role": role,
        "hotel_id": current_user.get("hotel_id"),
        "role_level": ROLE_HIERARCHY.get(role, 0),
        "is_multi_hotel": role in MULTI_HOTEL_ROLES,
        "permissions": get_user_permissions(role),
        "can_access_all_hotels": role in MULTI_HOTEL_ROLES or role == "super_admin",
    }


@api_router.get("/security/roles")
async def list_roles(
    current_user: dict = Depends(get_current_user)
):
    """Liste tous les rôles disponibles avec leur niveau et permissions."""
    roles = []
    for role, level in sorted(ROLE_HIERARCHY.items(), key=lambda x: -x[1]):
        roles.append({
            "role": role,
            "level": level,
            "is_multi_hotel": role in MULTI_HOTEL_ROLES,
            "permissions_count": len(ROLE_PERMISSIONS.get(role, [])),
            "permissions": ROLE_PERMISSIONS.get(role, []),
        })
    return {"roles": roles}


@api_router.get("/security/roles/{role}/permissions")
async def get_role_permissions(
    role: str,
    current_user: dict = Depends(get_current_user)
):
    """Retourne les permissions détaillées d'un rôle."""
    if role not in ROLE_HIERARCHY:
        raise HTTPException(status_code=404, detail=f"Rôle inconnu : {role}")
    return get_role_info(role)


@api_router.post("/security/check-permission")
async def check_user_permission(
    permission: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Vérifie si l'utilisateur courant possède une permission donnée.
    Retourne 200 avec allowed=True/False (ne lève pas d'exception).
    """
    role = current_user.get("role", "")
    has_perm = check_permission(role, permission)
    return {
        "permission": permission,
        "allowed": has_perm,
        "role": role,
    }


@api_router.get("/hotels/{hotel_id}/security/audit-logs")
async def get_hotel_audit_logs(
    hotel_id: str,
    limit: int = 50,
    action: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """
    Retourne les logs d'audit de sécurité pour un hôtel.
    Réservé aux admins et super admins.
    """
    role = current_user.get("role", "")
    user_hotel = current_user.get("hotel_id")

    # Vérification : admin de son hôtel ou super admin
    if role != "super_admin" and role not in MULTI_HOTEL_ROLES:
        if user_hotel != hotel_id:
            raise HTTPException(status_code=403, detail="Accès refusé")
        if role not in ("admin",):
            raise HTTPException(status_code=403, detail="Rôle admin requis pour les logs d'audit")

    logs = await audit.get_logs(db, hotel_id=hotel_id, action=action, limit=min(limit, 200))
    return {
        "hotel_id": hotel_id,
        "logs": logs,
        "total": len(logs),
    }


@api_router.get("/superadmin/security/audit-logs")
async def get_global_audit_logs(
    limit: int = 100,
    hotel_id: Optional[str] = None,
    user_id: Optional[str] = None,
    action: Optional[str] = None,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """
    Logs d'audit globaux — Super Admin uniquement.
    """
    from shared.security import decode_token
    payload = decode_token(credentials.credentials)
    if payload.get("role") != "super_admin":
        raise HTTPException(status_code=403, detail="Super Admin requis")

    logs = await audit.get_logs(
        db,
        hotel_id=hotel_id,
        user_id=user_id,
        action=action,
        limit=min(limit, 500)
    )
    return {
        "logs": logs,
        "total": len(logs),
        "filters": {"hotel_id": hotel_id, "user_id": user_id, "action": action}
    }


# ── Patch des routes critiques avec isolation hôtel ──────────────────────────
# Ces routes remplacent les anciennes qui n'avaient pas de vérification hotel_id

@api_router.delete("/hotels/{hotel_id}/rooms/{room_id}/secure")
async def delete_room_secure(
    hotel_id: str,
    room_id: str,
    user=Depends(combined_guard(minimum_role="admin", permission="config.write"))
):
    """Suppression de chambre sécurisée (admin uniquement, son hôtel)."""
    result = await db.rooms.update_one(
        {"id": room_id, "hotel_id": hotel_id},
        {"$set": {"status": "out_of_service"}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Chambre non trouvée")

    await audit.log(db, "room.deactivated", user, hotel_id, "room", room_id)
    return {"message": "Chambre désactivée", "room_id": room_id}


@api_router.post("/hotels/{hotel_id}/reservations/{reservation_id}/cancel-secure")
async def cancel_reservation_secure(
    hotel_id: str,
    reservation_id: str,
    reason: Optional[str] = None,
    user=Depends(combined_guard(minimum_role="reception", permission="reservations.write"))
):
    """Annulation de réservation sécurisée avec audit trail."""
    result = await db.reservations.update_one(
        {"id": reservation_id, "hotel_id": hotel_id},
        {"$set": {
            "status": "cancelled",
            "cancellation_reason": reason,
            "cancelled_by": user.get("user_id"),
            "cancelled_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Réservation non trouvée")

    await audit.log(
        db, "reservation.cancelled", user, hotel_id,
        "reservation", reservation_id,
        {"reason": reason}
    )
    return {"message": "Réservation annulée", "reservation_id": reservation_id}


@api_router.get("/hotels/{hotel_id}/staff/employees/secure")
async def list_employees_secure(
    hotel_id: str,
    department: Optional[str] = None,
    user=Depends(combined_guard(minimum_role="manager", permission="staff.read"))
):
    """Liste des employés avec isolation hôtel et vérification rôle."""
    query = {"hotel_id": hotel_id, "is_active": True}
    if department:
        query["department"] = department

    employees = await db.staff_employees.find(
        query, {"_id": 0, "social_security_number": 0, "bank_iban": 0}  # Masquer données sensibles
    ).sort("last_name", 1).to_list(500)

    return {
        "employees": employees,
        "total": len(employees),
        "hotel_id": hotel_id,
        "sensitive_fields_hidden": ["social_security_number", "bank_iban"]
    }


@api_router.get("/security/hotel-isolation-check/{hotel_id}")
async def verify_hotel_isolation(
    hotel_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Vérifie si l'utilisateur courant peut accéder à l'hôtel donné.
    Retourne le résultat sans lever d'exception (pour le frontend).
    """
    role = current_user.get("role", "")
    user_hotel = current_user.get("hotel_id")

    can_access = (
        role == "super_admin"
        or role in MULTI_HOTEL_ROLES
        or user_hotel == hotel_id
    )

    return {
        "hotel_id": hotel_id,
        "can_access": can_access,
        "user_hotel_id": user_hotel,
        "user_role": role,
        "reason": (
            "Super admin" if role == "super_admin"
            else "Multi-hotel role" if role in MULTI_HOTEL_ROLES
            else "Same hotel" if user_hotel == hotel_id
            else "Different hotel — access denied"
        )
    }
