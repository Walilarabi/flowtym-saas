"""
Housekeeping Module - API Routes
Flowtym PMS - Module de gestion du ménage hôtelier
"""

from fastapi import APIRouter, HTTPException, Depends
from typing import List, Optional
from datetime import datetime, timezone
import uuid
import logging

from .models import (
    HousekeepingStaff, HousekeepingZone, HousekeepingTask, HousekeepingAssignment,
    RoomInspection, MaintenanceTicket, BreakfastOrder, InventoryItem, StockConsumption,
    ActivityEvent, CreateTaskRequest, UpdateTaskRequest, StartCleaningRequest,
    CompleteCleaningRequest, ValidateRoomRequest, CreateMaintenanceRequest,
    CreateBreakfastOrderRequest, AutoAssignRequest, HousekeepingStatsResponse,
    StaffPerformance, TaskStatus, CleaningStatus, CleaningType, StaffStatus,
    MaintenanceStatus, BreakfastStatus, Priority
)

logger = logging.getLogger(__name__)

housekeeping_router = APIRouter(prefix="/housekeeping", tags=["Housekeeping"])

# Database reference - will be set during initialization
db = None


def init_housekeeping_db(database):
    """Initialize the database reference for housekeeping module"""
    global db
    db = database
    logger.info("Housekeeping module database initialized")


# ═══════════════════════════════════════════════════════════════════════════════
# DASHBOARD & STATS
# ═══════════════════════════════════════════════════════════════════════════════

@housekeeping_router.get("/hotels/{hotel_id}/stats", response_model=HousekeepingStatsResponse)
async def get_housekeeping_stats(hotel_id: str):
    """Get housekeeping statistics for the hotel"""
    today = datetime.now().strftime("%Y-%m-%d")
    
    tasks = await db.housekeeping_tasks.find(
        {"hotel_id": hotel_id, "date": today}, {"_id": 0}
    ).to_list(500)
    
    staff = await db.housekeeping_staff.find(
        {"hotel_id": hotel_id, "status": "available"}, {"_id": 0}
    ).to_list(100)
    
    # Calculate stats
    total = len(tasks)
    pending = len([t for t in tasks if t.get("status") == "pending"])
    in_progress = len([t for t in tasks if t.get("status") == "in_progress"])
    completed = len([t for t in tasks if t.get("status") == "completed"])
    
    # Get inspections
    inspections = await db.housekeeping_inspections.find(
        {"hotel_id": hotel_id, "created_at": {"$regex": f"^{today}"}}, {"_id": 0}
    ).to_list(500)
    
    validated = len([i for i in inspections if i.get("status") == "valide"])
    refused = len([i for i in inspections if i.get("status") == "refuse"])
    
    departures = len([t for t in tasks if t.get("cleaning_type") == "departure_cleaning"])
    stayovers = len([t for t in tasks if t.get("cleaning_type") == "stay_cleaning"])
    
    # Calculate average cleaning time
    completed_tasks = [t for t in tasks if t.get("completed_at") and t.get("started_at")]
    avg_time = 0
    if completed_tasks:
        total_time = sum([
            (datetime.fromisoformat(t["completed_at"]) - datetime.fromisoformat(t["started_at"])).total_seconds() / 60
            for t in completed_tasks
        ])
        avg_time = total_time / len(completed_tasks)
    
    completion_rate = (completed / total * 100) if total > 0 else 0
    
    return HousekeepingStatsResponse(
        total_rooms=total,
        rooms_to_clean=pending,
        rooms_in_progress=in_progress,
        rooms_done=completed,
        rooms_validated=validated,
        rooms_refused=refused,
        departures=departures,
        stayovers=stayovers,
        out_of_service=0,
        staff_active=len(staff),
        avg_cleaning_time=round(avg_time, 1),
        completion_rate=round(completion_rate, 1)
    )


@housekeeping_router.get("/hotels/{hotel_id}/activity")
async def get_activity_feed(hotel_id: str, limit: int = 50):
    """Get recent activity events"""
    events = await db.housekeeping_activity.find(
        {"hotel_id": hotel_id}, {"_id": 0}
    ).sort("time", -1).limit(limit).to_list(limit)
    
    return events


# ═══════════════════════════════════════════════════════════════════════════════
# STAFF MANAGEMENT
# ═══════════════════════════════════════════════════════════════════════════════

@housekeeping_router.get("/hotels/{hotel_id}/staff")
async def get_housekeeping_staff(hotel_id: str, role: Optional[str] = None):
    """Get all housekeeping staff"""
    query = {"hotel_id": hotel_id}
    if role:
        query["role"] = role
    
    staff = await db.housekeeping_staff.find(query, {"_id": 0}).to_list(100)
    return staff


@housekeeping_router.post("/hotels/{hotel_id}/staff")
async def create_staff(hotel_id: str, staff: HousekeepingStaff):
    """Create a new staff member"""
    staff_dict = staff.model_dump()
    staff_dict["id"] = str(uuid.uuid4())
    staff_dict["hotel_id"] = hotel_id
    staff_dict["created_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.housekeeping_staff.insert_one(staff_dict)
    return staff_dict


@housekeeping_router.put("/hotels/{hotel_id}/staff/{staff_id}")
async def update_staff(hotel_id: str, staff_id: str, updates: dict):
    """Update staff member"""
    updates["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    result = await db.housekeeping_staff.update_one(
        {"id": staff_id, "hotel_id": hotel_id},
        {"$set": updates}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Staff not found")
    
    return await db.housekeeping_staff.find_one(
        {"id": staff_id, "hotel_id": hotel_id}, {"_id": 0}
    )


@housekeeping_router.get("/hotels/{hotel_id}/staff/{staff_id}/performance")
async def get_staff_performance(hotel_id: str, staff_id: str):
    """Get staff performance metrics"""
    today = datetime.now().strftime("%Y-%m-%d")
    
    staff = await db.housekeeping_staff.find_one(
        {"id": staff_id, "hotel_id": hotel_id}, {"_id": 0}
    )
    if not staff:
        raise HTTPException(status_code=404, detail="Staff not found")
    
    tasks = await db.housekeeping_tasks.find(
        {"hotel_id": hotel_id, "assigned_to": staff_id, "date": today}, {"_id": 0}
    ).to_list(50)
    
    completed = [t for t in tasks if t.get("status") == "completed"]
    
    # Calculate average time
    avg_time = 0
    if completed:
        times = []
        for t in completed:
            if t.get("started_at") and t.get("completed_at"):
                duration = (datetime.fromisoformat(t["completed_at"]) - datetime.fromisoformat(t["started_at"])).total_seconds() / 60
                times.append(duration)
        if times:
            avg_time = sum(times) / len(times)
    
    # Get quality ratings from inspections
    inspections = await db.housekeeping_inspections.find(
        {"hotel_id": hotel_id, "cleaned_by": staff_id}, {"_id": 0}
    ).to_list(100)
    
    ratings = [i.get("rating", 0) for i in inspections if i.get("rating")]
    avg_rating = sum(ratings) / len(ratings) if ratings else 0
    
    return StaffPerformance(
        staff_id=staff_id,
        staff_name=f"{staff['first_name']} {staff['last_name']}",
        total_rooms=len(tasks),
        completed=len(completed),
        pending=len([t for t in tasks if t.get("status") == "pending"]),
        in_progress=len([t for t in tasks if t.get("status") == "in_progress"]),
        avg_time_minutes=round(avg_time, 1),
        quality_rating=round(avg_rating, 1)
    )


# ═══════════════════════════════════════════════════════════════════════════════
# TASKS MANAGEMENT
# ═══════════════════════════════════════════════════════════════════════════════

@housekeeping_router.get("/hotels/{hotel_id}/tasks")
async def get_tasks(
    hotel_id: str,
    date: Optional[str] = None,
    status: Optional[str] = None,
    floor: Optional[int] = None,
    assigned_to: Optional[str] = None
):
    """Get housekeeping tasks with optional filters"""
    query = {"hotel_id": hotel_id}
    
    if date:
        query["date"] = date
    else:
        query["date"] = datetime.now().strftime("%Y-%m-%d")
    
    if status:
        query["status"] = status
    if floor:
        query["floor"] = floor
    if assigned_to:
        query["assigned_to"] = assigned_to
    
    tasks = await db.housekeeping_tasks.find(query, {"_id": 0}).to_list(500)
    
    # Sort by priority and status
    priority_order = {"urgente": 0, "haute": 1, "moyenne": 2, "basse": 3}
    status_order = {"pending": 0, "in_progress": 1, "completed": 2}
    
    tasks.sort(key=lambda t: (
        priority_order.get(t.get("priority"), 2),
        status_order.get(t.get("status"), 0)
    ))
    
    return tasks


@housekeeping_router.post("/hotels/{hotel_id}/tasks")
async def create_task(hotel_id: str, request: CreateTaskRequest):
    """Create a new cleaning task"""
    task_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    today = datetime.now().strftime("%Y-%m-%d")
    
    # Get staff name if assigned
    assigned_to_name = None
    if request.assigned_to:
        staff = await db.housekeeping_staff.find_one(
            {"id": request.assigned_to, "hotel_id": hotel_id}, {"_id": 0}
        )
        if staff:
            assigned_to_name = f"{staff['first_name']} {staff['last_name']}"
    
    # Estimate minutes based on cleaning type
    estimated_minutes = {
        "departure_cleaning": 35,
        "stay_cleaning": 20,
        "deep_cleaning": 60,
        "inspection": 10,
        "touch_up": 15
    }.get(request.cleaning_type.value, 30)
    
    task = {
        "id": task_id,
        "hotel_id": hotel_id,
        "room_id": request.room_id,
        "room_number": request.room_number,
        "room_type": request.room_type,
        "floor": request.floor,
        "cleaning_type": request.cleaning_type.value,
        "status": "pending",
        "priority": request.priority.value,
        "assigned_to": request.assigned_to,
        "assigned_to_name": assigned_to_name,
        "estimated_minutes": estimated_minutes,
        "client_badge": request.client_badge.value,
        "vip_instructions": request.vip_instructions,
        "guest_name": request.guest_name,
        "notes": request.notes,
        "date": today,
        "created_at": now,
        "updated_at": now
    }
    
    await db.housekeeping_tasks.insert_one(task)
    
    # Log activity
    await log_activity(hotel_id, "task_created", f"Tâche créée pour chambre {request.room_number}", request.room_number)
    
    return task


@housekeeping_router.put("/hotels/{hotel_id}/tasks/{task_id}")
async def update_task(hotel_id: str, task_id: str, request: UpdateTaskRequest):
    """Update a task"""
    updates = request.model_dump(exclude_none=True)
    updates["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    # Get assigned staff name if updating assignment
    if request.assigned_to:
        staff = await db.housekeeping_staff.find_one(
            {"id": request.assigned_to, "hotel_id": hotel_id}, {"_id": 0}
        )
        if staff:
            updates["assigned_to_name"] = f"{staff['first_name']} {staff['last_name']}"
    
    result = await db.housekeeping_tasks.update_one(
        {"id": task_id, "hotel_id": hotel_id},
        {"$set": updates}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Task not found")
    
    return await db.housekeeping_tasks.find_one(
        {"id": task_id, "hotel_id": hotel_id}, {"_id": 0}
    )


@housekeeping_router.post("/hotels/{hotel_id}/tasks/{task_id}/start")
async def start_cleaning(hotel_id: str, task_id: str):
    """Start cleaning a room"""
    now = datetime.now(timezone.utc).isoformat()
    
    task = await db.housekeeping_tasks.find_one(
        {"id": task_id, "hotel_id": hotel_id}, {"_id": 0}
    )
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    await db.housekeeping_tasks.update_one(
        {"id": task_id},
        {"$set": {
            "status": "in_progress",
            "started_at": now,
            "updated_at": now
        }}
    )
    
    # Log activity
    await log_activity(
        hotel_id, "cleaning", 
        f"Nettoyage commencé par {task.get('assigned_to_name', 'Non assigné')}", 
        task["room_number"],
        task.get("assigned_to"),
        task.get("assigned_to_name")
    )
    
    return {"success": True, "started_at": now}


@housekeeping_router.post("/hotels/{hotel_id}/tasks/{task_id}/complete")
async def complete_cleaning(hotel_id: str, task_id: str, request: CompleteCleaningRequest):
    """Complete cleaning a room"""
    now = datetime.now(timezone.utc).isoformat()
    
    task = await db.housekeeping_tasks.find_one(
        {"id": task_id, "hotel_id": hotel_id}, {"_id": 0}
    )
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    # Calculate actual minutes
    actual_minutes = None
    if task.get("started_at"):
        started = datetime.fromisoformat(task["started_at"])
        actual_minutes = int((datetime.now(timezone.utc) - started).total_seconds() / 60)
    
    await db.housekeeping_tasks.update_one(
        {"id": task_id},
        {"$set": {
            "status": "completed",
            "completed_at": now,
            "actual_minutes": actual_minutes,
            "photos_after": request.photos_after,
            "notes": request.notes or task.get("notes"),
            "updated_at": now
        }}
    )
    
    # Create inspection record
    inspection_id = str(uuid.uuid4())
    inspection = {
        "id": inspection_id,
        "hotel_id": hotel_id,
        "room_id": task["room_id"],
        "room_number": task["room_number"],
        "room_type": task["room_type"],
        "floor": task["floor"],
        "task_id": task_id,
        "cleaned_by": task.get("assigned_to"),
        "cleaned_by_name": task.get("assigned_to_name", "Non assigné"),
        "status": "en_attente",
        "completed_at": now,
        "photos": request.photos_after,
        "created_at": now
    }
    await db.housekeeping_inspections.insert_one(inspection)
    
    # Log activity
    await log_activity(
        hotel_id, "cleaning",
        f"Nettoyage terminé ({actual_minutes or '?'} min)",
        task["room_number"],
        task.get("assigned_to"),
        task.get("assigned_to_name")
    )
    
    return {"success": True, "completed_at": now, "actual_minutes": actual_minutes, "inspection_id": inspection_id}


# ═══════════════════════════════════════════════════════════════════════════════
# INSPECTIONS / VALIDATION
# ═══════════════════════════════════════════════════════════════════════════════

@housekeeping_router.get("/hotels/{hotel_id}/inspections")
async def get_inspections(
    hotel_id: str,
    status: Optional[str] = None,
    floor: Optional[int] = None
):
    """Get room inspections"""
    query = {"hotel_id": hotel_id}
    if status:
        query["status"] = status
    if floor:
        query["floor"] = floor
    
    inspections = await db.housekeeping_inspections.find(query, {"_id": 0}).to_list(500)
    
    # Sort: pending first, then by time
    status_order = {"en_attente": 0, "valide": 1, "refuse": 2}
    inspections.sort(key=lambda i: (status_order.get(i.get("status"), 0), i.get("completed_at", "")))
    
    return inspections


@housekeeping_router.post("/hotels/{hotel_id}/inspections/{inspection_id}/validate")
async def validate_inspection(hotel_id: str, inspection_id: str, request: ValidateRoomRequest):
    """Validate or refuse a room inspection"""
    now = datetime.now(timezone.utc).isoformat()
    
    inspection = await db.housekeeping_inspections.find_one(
        {"id": inspection_id, "hotel_id": hotel_id}, {"_id": 0}
    )
    if not inspection:
        raise HTTPException(status_code=404, detail="Inspection not found")
    
    new_status = "valide" if request.approved else "refuse"
    
    updates = {
        "status": new_status,
        "validated_at": now,
        "validated_by": request.notes,  # Could be validator user ID
        "rating": request.rating,
        "notes": request.notes
    }
    
    if not request.approved:
        updates["refused_reason"] = request.refused_reason
    
    await db.housekeeping_inspections.update_one(
        {"id": inspection_id},
        {"$set": updates}
    )
    
    # Log activity
    event_type = "cleaning" if request.approved else "alert"
    description = f"Chambre validée" if request.approved else f"Chambre refusée: {request.refused_reason}"
    await log_activity(hotel_id, event_type, description, inspection["room_number"])
    
    # If refused, create new task
    if not request.approved:
        # Find original task and create a redo task
        original_task = await db.housekeeping_tasks.find_one(
            {"id": inspection["task_id"]}, {"_id": 0}
        )
        if original_task:
            new_task_id = str(uuid.uuid4())
            new_task = {
                **original_task,
                "id": new_task_id,
                "status": "pending",
                "priority": "haute",
                "started_at": None,
                "completed_at": None,
                "notes": f"À refaire: {request.refused_reason}",
                "created_at": now,
                "updated_at": now
            }
            await db.housekeeping_tasks.insert_one(new_task)
    
    return {"success": True, "status": new_status}


# ═══════════════════════════════════════════════════════════════════════════════
# ASSIGNMENTS
# ═══════════════════════════════════════════════════════════════════════════════

@housekeeping_router.get("/hotels/{hotel_id}/assignments")
async def get_assignments(hotel_id: str, date: Optional[str] = None):
    """Get staff assignments"""
    query = {"hotel_id": hotel_id}
    if date:
        query["date"] = date
    else:
        query["date"] = datetime.now().strftime("%Y-%m-%d")
    
    assignments = await db.housekeeping_assignments.find(query, {"_id": 0}).to_list(100)
    return assignments


@housekeeping_router.post("/hotels/{hotel_id}/assignments/auto")
async def auto_assign_rooms(hotel_id: str, request: AutoAssignRequest):
    """Automatically assign rooms to available staff"""
    today = request.date or datetime.now().strftime("%Y-%m-%d")
    
    # Get available staff
    staff = await db.housekeeping_staff.find(
        {"hotel_id": hotel_id, "status": "available", "role": "femme_de_chambre"}, {"_id": 0}
    ).to_list(100)
    
    if not staff:
        raise HTTPException(status_code=400, detail="Aucun personnel disponible")
    
    # Get pending tasks
    tasks = await db.housekeeping_tasks.find(
        {"hotel_id": hotel_id, "date": today, "status": "pending"}, {"_id": 0}
    ).to_list(500)
    
    if not tasks:
        return {"success": True, "message": "Aucune tâche à assigner", "assigned": 0}
    
    # Simple balanced assignment
    staff_loads = {s["id"]: {"staff": s, "tasks": [], "load": 0} for s in staff}
    
    # Sort tasks by priority
    priority_order = {"urgente": 0, "haute": 1, "moyenne": 2, "basse": 3}
    tasks.sort(key=lambda t: priority_order.get(t.get("priority", "moyenne"), 2))
    
    # Assign tasks
    for task in tasks:
        # Find staff with lowest load
        min_staff = min(staff_loads.values(), key=lambda x: x["load"])
        
        if min_staff["load"] < min_staff["staff"].get("max_rooms_per_day", 12):
            min_staff["tasks"].append(task["id"])
            min_staff["load"] += 1
            
            # Update task
            staff_name = f"{min_staff['staff']['first_name']} {min_staff['staff']['last_name']}"
            await db.housekeeping_tasks.update_one(
                {"id": task["id"]},
                {"$set": {
                    "assigned_to": min_staff["staff"]["id"],
                    "assigned_to_name": staff_name,
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }}
            )
    
    # Create assignment records
    now = datetime.now(timezone.utc).isoformat()
    for staff_id, data in staff_loads.items():
        if data["tasks"]:
            assignment = {
                "id": str(uuid.uuid4()),
                "hotel_id": hotel_id,
                "staff_id": staff_id,
                "staff_name": f"{data['staff']['first_name']} {data['staff']['last_name']}",
                "date": today,
                "task_ids": data["tasks"],
                "total_rooms": len(data["tasks"]),
                "completed_rooms": 0,
                "created_at": now
            }
            await db.housekeeping_assignments.insert_one(assignment)
    
    total_assigned = sum(len(d["tasks"]) for d in staff_loads.values())
    
    return {
        "success": True,
        "assigned": total_assigned,
        "staff_count": len([s for s in staff_loads.values() if s["tasks"]])
    }


# ═══════════════════════════════════════════════════════════════════════════════
# MAINTENANCE
# ═══════════════════════════════════════════════════════════════════════════════

@housekeeping_router.get("/hotels/{hotel_id}/maintenance")
async def get_maintenance_tickets(
    hotel_id: str,
    status: Optional[str] = None,
    priority: Optional[str] = None
):
    """Get maintenance tickets"""
    query = {"hotel_id": hotel_id}
    if status:
        query["status"] = status
    if priority:
        query["priority"] = priority
    
    tickets = await db.housekeeping_maintenance.find(query, {"_id": 0}).to_list(200)
    
    # Sort by status and priority
    status_order = {"en_attente": 0, "en_cours": 1, "resolu": 2}
    priority_order = {"urgente": 0, "haute": 1, "moyenne": 2, "basse": 3}
    tickets.sort(key=lambda t: (status_order.get(t.get("status"), 0), priority_order.get(t.get("priority"), 2)))
    
    return tickets


@housekeeping_router.post("/hotels/{hotel_id}/maintenance")
async def create_maintenance_ticket(hotel_id: str, request: CreateMaintenanceRequest):
    """Create a maintenance ticket"""
    ticket_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    ticket = {
        "id": ticket_id,
        "hotel_id": hotel_id,
        "room_id": request.room_id,
        "room_number": request.room_number,
        "title": request.title,
        "description": request.description,
        "category": request.category,
        "priority": request.priority.value,
        "status": "en_attente",
        "reported_by": "system",  # Could be user ID
        "reported_by_name": "Housekeeping",
        "reported_at": now,
        "photos": request.photos
    }
    
    await db.housekeeping_maintenance.insert_one(ticket)
    
    # Log activity
    await log_activity(hotel_id, "maintenance", f"Ticket créé: {request.title}", request.room_number)
    
    return ticket


@housekeeping_router.put("/hotels/{hotel_id}/maintenance/{ticket_id}")
async def update_maintenance_ticket(hotel_id: str, ticket_id: str, updates: dict):
    """Update a maintenance ticket"""
    updates["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    # Handle status changes
    if updates.get("status") == "en_cours" and not updates.get("started_at"):
        updates["started_at"] = updates["updated_at"]
    elif updates.get("status") == "resolu" and not updates.get("resolved_at"):
        updates["resolved_at"] = updates["updated_at"]
    
    result = await db.housekeeping_maintenance.update_one(
        {"id": ticket_id, "hotel_id": hotel_id},
        {"$set": updates}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Ticket not found")
    
    return await db.housekeeping_maintenance.find_one(
        {"id": ticket_id, "hotel_id": hotel_id}, {"_id": 0}
    )


# ═══════════════════════════════════════════════════════════════════════════════
# BREAKFAST
# ═══════════════════════════════════════════════════════════════════════════════

@housekeeping_router.get("/hotels/{hotel_id}/breakfast")
async def get_breakfast_orders(hotel_id: str, status: Optional[str] = None):
    """Get breakfast orders"""
    query = {"hotel_id": hotel_id}
    if status:
        query["status"] = status
    
    orders = await db.housekeeping_breakfast.find(query, {"_id": 0}).to_list(200)
    return orders


@housekeeping_router.post("/hotels/{hotel_id}/breakfast")
async def create_breakfast_order(hotel_id: str, request: CreateBreakfastOrderRequest):
    """Create a breakfast order"""
    order_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    order = {
        "id": order_id,
        "hotel_id": hotel_id,
        "room_id": request.room_id,
        "room_number": request.room_number,
        "guest_name": request.guest_name,
        "formule": request.formule,
        "person_count": request.person_count,
        "boissons": request.boissons,
        "options": request.options,
        "included": request.included,
        "status": "a_preparer",
        "delivery_time": request.delivery_time,
        "notes": request.notes,
        "ordered_at": now
    }
    
    await db.housekeeping_breakfast.insert_one(order)
    return order


@housekeeping_router.put("/hotels/{hotel_id}/breakfast/{order_id}")
async def update_breakfast_order(hotel_id: str, order_id: str, updates: dict):
    """Update a breakfast order"""
    now = datetime.now(timezone.utc).isoformat()
    
    # Handle status changes
    if updates.get("status") == "prepare" and not updates.get("prepared_at"):
        updates["prepared_at"] = now
    elif updates.get("status") == "servi" and not updates.get("served_at"):
        updates["served_at"] = now
    
    result = await db.housekeeping_breakfast.update_one(
        {"id": order_id, "hotel_id": hotel_id},
        {"$set": updates}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Order not found")
    
    return await db.housekeeping_breakfast.find_one(
        {"id": order_id, "hotel_id": hotel_id}, {"_id": 0}
    )


# ═══════════════════════════════════════════════════════════════════════════════
# INVENTORY
# ═══════════════════════════════════════════════════════════════════════════════

@housekeeping_router.get("/hotels/{hotel_id}/inventory")
async def get_inventory(hotel_id: str, category: Optional[str] = None):
    """Get inventory items"""
    query = {"hotel_id": hotel_id}
    if category:
        query["category"] = category
    
    items = await db.housekeeping_inventory.find(query, {"_id": 0}).to_list(500)
    return items


@housekeeping_router.get("/hotels/{hotel_id}/inventory/low-stock")
async def get_low_stock_items(hotel_id: str):
    """Get items below minimum threshold"""
    items = await db.housekeeping_inventory.find(
        {"hotel_id": hotel_id}, {"_id": 0}
    ).to_list(500)
    
    low_stock = [i for i in items if i.get("current_stock", 0) <= i.get("minimum_threshold", 10)]
    return low_stock


@housekeeping_router.post("/hotels/{hotel_id}/inventory/consume")
async def consume_stock(hotel_id: str, consumption: StockConsumption):
    """Record stock consumption"""
    consumption_dict = consumption.model_dump()
    consumption_dict["id"] = str(uuid.uuid4())
    consumption_dict["hotel_id"] = hotel_id
    
    # Update inventory
    await db.housekeeping_inventory.update_one(
        {"id": consumption.item_id, "hotel_id": hotel_id},
        {"$inc": {"current_stock": -consumption.quantity}}
    )
    
    # Record consumption
    await db.housekeeping_consumptions.insert_one(consumption_dict)
    
    return consumption_dict


# ═══════════════════════════════════════════════════════════════════════════════
# SYNC WITH PMS
# ═══════════════════════════════════════════════════════════════════════════════

@housekeeping_router.post("/hotels/{hotel_id}/sync-pms")
async def sync_with_pms(hotel_id: str):
    """Sync housekeeping tasks with PMS room status"""
    today = datetime.now().strftime("%Y-%m-%d")
    now = datetime.now(timezone.utc).isoformat()
    
    # Get rooms from PMS
    rooms = await db.rooms.find({"hotel_id": hotel_id}, {"_id": 0}).to_list(500)
    
    # Get existing tasks for today
    existing_tasks = await db.housekeeping_tasks.find(
        {"hotel_id": hotel_id, "date": today}, {"_id": 0}
    ).to_list(500)
    existing_room_ids = {t["room_id"] for t in existing_tasks}
    
    # Get reservations for today (departures and arrivals)
    reservations = await db.reservations.find({
        "hotel_id": hotel_id,
        "$or": [
            {"check_out": {"$regex": f"^{today}"}},
            {"check_in": {"$regex": f"^{today}"}}
        ]
    }, {"_id": 0}).to_list(500)
    
    departures = {r["room_id"] for r in reservations if r.get("check_out", "").startswith(today)}
    arrivals = {r["room_id"] for r in reservations if r.get("check_in", "").startswith(today)}
    
    tasks_created = 0
    
    for room in rooms:
        if room["id"] in existing_room_ids:
            continue
        
        # Determine cleaning type
        cleaning_type = None
        priority = "moyenne"
        guest_name = None
        
        if room["id"] in departures:
            cleaning_type = "departure_cleaning"
            priority = "haute"
        elif room.get("status") == "occupe" or room["id"] in arrivals:
            cleaning_type = "stay_cleaning"
            # Get guest name from reservation
            res = next((r for r in reservations if r.get("room_id") == room["id"]), None)
            if res:
                guest_name = res.get("client_name")
        
        if cleaning_type:
            task = {
                "id": str(uuid.uuid4()),
                "hotel_id": hotel_id,
                "room_id": room["id"],
                "room_number": room["number"],
                "room_type": room.get("room_type", "Standard"),
                "floor": room.get("floor", 1),
                "cleaning_type": cleaning_type,
                "status": "pending",
                "priority": priority,
                "client_badge": "normal",
                "guest_name": guest_name,
                "estimated_minutes": 35 if cleaning_type == "departure_cleaning" else 20,
                "date": today,
                "created_at": now,
                "updated_at": now
            }
            await db.housekeeping_tasks.insert_one(task)
            tasks_created += 1
    
    return {"success": True, "tasks_created": tasks_created}


# ═══════════════════════════════════════════════════════════════════════════════
# HELPER FUNCTIONS
# ═══════════════════════════════════════════════════════════════════════════════

async def log_activity(
    hotel_id: str,
    event_type: str,
    description: str,
    room_number: Optional[str] = None,
    staff_id: Optional[str] = None,
    staff_name: Optional[str] = None
):
    """Log an activity event"""
    event = {
        "id": str(uuid.uuid4()),
        "hotel_id": hotel_id,
        "time": datetime.now(timezone.utc).isoformat(),
        "type": event_type,
        "description": description,
        "room_number": room_number,
        "staff_id": staff_id,
        "staff_name": staff_name
    }
    await db.housekeeping_activity.insert_one(event)
