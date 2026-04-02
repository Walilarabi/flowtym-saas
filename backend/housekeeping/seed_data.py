"""
Housekeeping Module - Seed Data
Demo data for testing the Housekeeping module
"""

from datetime import datetime, timedelta
import uuid

today = datetime.now().strftime("%Y-%m-%d")
now = datetime.now().isoformat()


def get_seed_staff(hotel_id: str):
    """Get demo staff data"""
    return [
        {
            "id": "hk-staff-1",
            "hotel_id": hotel_id,
            "first_name": "Maria",
            "last_name": "Lopez",
            "role": "femme_de_chambre",
            "status": "available",
            "max_rooms_per_day": 12,
            "current_load": 0,
            "phone": "+33612345678",
            "email": "maria.lopez@flowtym.com",
            "skills": ["vip", "suite", "deep_cleaning"],
            "created_at": now
        },
        {
            "id": "hk-staff-2",
            "hotel_id": hotel_id,
            "first_name": "Fatima",
            "last_name": "Benali",
            "role": "femme_de_chambre",
            "status": "available",
            "max_rooms_per_day": 14,
            "current_load": 0,
            "phone": "+33612345679",
            "email": "fatima.benali@flowtym.com",
            "skills": ["standard", "deep_cleaning"],
            "created_at": now
        },
        {
            "id": "hk-staff-3",
            "hotel_id": hotel_id,
            "first_name": "Sofia",
            "last_name": "Durand",
            "role": "femme_de_chambre",
            "status": "available",
            "max_rooms_per_day": 10,
            "current_load": 0,
            "phone": "+33612345680",
            "email": "sofia.durand@flowtym.com",
            "skills": ["vip", "standard"],
            "created_at": now
        },
        {
            "id": "hk-staff-4",
            "hotel_id": hotel_id,
            "first_name": "Nadia",
            "last_name": "Petit",
            "role": "femme_de_chambre",
            "status": "off",
            "max_rooms_per_day": 12,
            "current_load": 0,
            "phone": "+33612345681",
            "email": "nadia.petit@flowtym.com",
            "skills": ["standard"],
            "created_at": now
        },
        {
            "id": "hk-staff-5",
            "hotel_id": hotel_id,
            "first_name": "Claire",
            "last_name": "Martin",
            "role": "gouvernante",
            "status": "available",
            "max_rooms_per_day": 0,
            "current_load": 0,
            "phone": "+33612345682",
            "email": "claire.martin@flowtym.com",
            "skills": ["supervision", "inspection"],
            "created_at": now
        },
        {
            "id": "hk-staff-6",
            "hotel_id": hotel_id,
            "first_name": "Thomas",
            "last_name": "Bernard",
            "role": "maintenance",
            "status": "available",
            "max_rooms_per_day": 0,
            "current_load": 0,
            "phone": "+33612345683",
            "email": "thomas.bernard@flowtym.com",
            "skills": ["plomberie", "electricite", "climatisation"],
            "created_at": now
        },
        {
            "id": "hk-staff-7",
            "hotel_id": hotel_id,
            "first_name": "Julie",
            "last_name": "Rousseau",
            "role": "pdj",
            "status": "available",
            "max_rooms_per_day": 0,
            "current_load": 0,
            "phone": "+33612345684",
            "email": "julie.rousseau@flowtym.com",
            "skills": ["cuisine", "service"],
            "created_at": now
        }
    ]


def get_seed_tasks(hotel_id: str):
    """Get demo tasks data"""
    base_time = datetime.now()
    
    return [
        # Departures - urgent
        {
            "id": "hk-task-1",
            "hotel_id": hotel_id,
            "room_id": "room-101",
            "room_number": "101",
            "room_type": "Standard",
            "floor": 1,
            "cleaning_type": "departure_cleaning",
            "status": "pending",
            "priority": "haute",
            "assigned_to": "hk-staff-1",
            "assigned_to_name": "Maria Lopez",
            "estimated_minutes": 35,
            "client_badge": "vip",
            "vip_instructions": "Client fidèle - attention aux détails",
            "guest_name": "Jean Dupont",
            "date": today,
            "created_at": now
        },
        {
            "id": "hk-task-2",
            "hotel_id": hotel_id,
            "room_id": "room-102",
            "room_number": "102",
            "room_type": "Standard",
            "floor": 1,
            "cleaning_type": "departure_cleaning",
            "status": "in_progress",
            "priority": "haute",
            "assigned_to": "hk-staff-1",
            "assigned_to_name": "Maria Lopez",
            "started_at": (base_time - timedelta(minutes=15)).isoformat(),
            "estimated_minutes": 35,
            "client_badge": "normal",
            "guest_name": "Marie Martin",
            "date": today,
            "created_at": now
        },
        {
            "id": "hk-task-3",
            "hotel_id": hotel_id,
            "room_id": "room-201",
            "room_number": "201",
            "room_type": "Supérieure",
            "floor": 2,
            "cleaning_type": "departure_cleaning",
            "status": "completed",
            "priority": "moyenne",
            "assigned_to": "hk-staff-2",
            "assigned_to_name": "Fatima Benali",
            "started_at": (base_time - timedelta(hours=2)).isoformat(),
            "completed_at": (base_time - timedelta(hours=1, minutes=25)).isoformat(),
            "actual_minutes": 35,
            "estimated_minutes": 35,
            "client_badge": "normal",
            "guest_name": "Pierre Leroy",
            "date": today,
            "created_at": now
        },
        # Stayovers
        {
            "id": "hk-task-4",
            "hotel_id": hotel_id,
            "room_id": "room-103",
            "room_number": "103",
            "room_type": "Standard",
            "floor": 1,
            "cleaning_type": "stay_cleaning",
            "status": "pending",
            "priority": "moyenne",
            "assigned_to": "hk-staff-2",
            "assigned_to_name": "Fatima Benali",
            "estimated_minutes": 20,
            "client_badge": "prioritaire",
            "guest_name": "Sophie Bernard",
            "date": today,
            "created_at": now
        },
        {
            "id": "hk-task-5",
            "hotel_id": hotel_id,
            "room_id": "room-202",
            "room_number": "202",
            "room_type": "Supérieure",
            "floor": 2,
            "cleaning_type": "stay_cleaning",
            "status": "in_progress",
            "priority": "moyenne",
            "assigned_to": "hk-staff-2",
            "assigned_to_name": "Fatima Benali",
            "started_at": (base_time - timedelta(minutes=8)).isoformat(),
            "estimated_minutes": 20,
            "client_badge": "normal",
            "guest_name": "Lucas Moreau",
            "date": today,
            "created_at": now
        },
        {
            "id": "hk-task-6",
            "hotel_id": hotel_id,
            "room_id": "room-301",
            "room_number": "301",
            "room_type": "Suite",
            "floor": 3,
            "cleaning_type": "stay_cleaning",
            "status": "pending",
            "priority": "haute",
            "assigned_to": "hk-staff-3",
            "assigned_to_name": "Sofia Durand",
            "estimated_minutes": 25,
            "client_badge": "vip",
            "vip_instructions": "Ajouter fleurs fraîches et chocolats",
            "guest_name": "Emma Laurent",
            "date": today,
            "created_at": now
        },
        # Completed tasks
        {
            "id": "hk-task-7",
            "hotel_id": hotel_id,
            "room_id": "room-104",
            "room_number": "104",
            "room_type": "Standard",
            "floor": 1,
            "cleaning_type": "departure_cleaning",
            "status": "completed",
            "priority": "moyenne",
            "assigned_to": "hk-staff-3",
            "assigned_to_name": "Sofia Durand",
            "started_at": (base_time - timedelta(hours=3)).isoformat(),
            "completed_at": (base_time - timedelta(hours=2, minutes=30)).isoformat(),
            "actual_minutes": 30,
            "estimated_minutes": 35,
            "client_badge": "normal",
            "guest_name": "Antoine Petit",
            "date": today,
            "created_at": now
        },
        {
            "id": "hk-task-8",
            "hotel_id": hotel_id,
            "room_id": "room-203",
            "room_number": "203",
            "room_type": "Supérieure",
            "floor": 2,
            "cleaning_type": "stay_cleaning",
            "status": "completed",
            "priority": "basse",
            "assigned_to": "hk-staff-1",
            "assigned_to_name": "Maria Lopez",
            "started_at": (base_time - timedelta(hours=4)).isoformat(),
            "completed_at": (base_time - timedelta(hours=3, minutes=40)).isoformat(),
            "actual_minutes": 20,
            "estimated_minutes": 20,
            "client_badge": "normal",
            "guest_name": "Julie Roux",
            "date": today,
            "created_at": now
        }
    ]


def get_seed_inspections(hotel_id: str):
    """Get demo inspections data"""
    base_time = datetime.now()
    
    return [
        {
            "id": "hk-insp-1",
            "hotel_id": hotel_id,
            "room_id": "room-201",
            "room_number": "201",
            "room_type": "Supérieure",
            "floor": 2,
            "task_id": "hk-task-3",
            "cleaned_by": "hk-staff-2",
            "cleaned_by_name": "Fatima Benali",
            "status": "en_attente",
            "completed_at": (base_time - timedelta(hours=1, minutes=25)).isoformat(),
            "created_at": now
        },
        {
            "id": "hk-insp-2",
            "hotel_id": hotel_id,
            "room_id": "room-104",
            "room_number": "104",
            "room_type": "Standard",
            "floor": 1,
            "task_id": "hk-task-7",
            "cleaned_by": "hk-staff-3",
            "cleaned_by_name": "Sofia Durand",
            "status": "valide",
            "completed_at": (base_time - timedelta(hours=2, minutes=30)).isoformat(),
            "validated_at": (base_time - timedelta(hours=2)).isoformat(),
            "validated_by": "Claire Martin",
            "rating": 5,
            "created_at": now
        },
        {
            "id": "hk-insp-3",
            "hotel_id": hotel_id,
            "room_id": "room-203",
            "room_number": "203",
            "room_type": "Supérieure",
            "floor": 2,
            "task_id": "hk-task-8",
            "cleaned_by": "hk-staff-1",
            "cleaned_by_name": "Maria Lopez",
            "status": "valide",
            "completed_at": (base_time - timedelta(hours=3, minutes=40)).isoformat(),
            "validated_at": (base_time - timedelta(hours=3)).isoformat(),
            "validated_by": "Claire Martin",
            "rating": 4,
            "created_at": now
        }
    ]


def get_seed_maintenance(hotel_id: str):
    """Get demo maintenance tickets"""
    base_time = datetime.now()
    
    return [
        {
            "id": "hk-maint-1",
            "hotel_id": hotel_id,
            "room_id": "room-105",
            "room_number": "105",
            "title": "Fuite robinet salle de bain",
            "description": "Le robinet de la douche fuit constamment",
            "category": "plomberie",
            "priority": "haute",
            "status": "en_attente",
            "reported_by": "hk-staff-1",
            "reported_by_name": "Maria Lopez",
            "reported_at": (base_time - timedelta(hours=1)).isoformat()
        },
        {
            "id": "hk-maint-2",
            "hotel_id": hotel_id,
            "room_id": "room-204",
            "room_number": "204",
            "title": "Climatisation ne fonctionne pas",
            "description": "La climatisation ne produit plus d'air froid",
            "category": "climatisation",
            "priority": "haute",
            "status": "en_cours",
            "reported_by": "hk-staff-2",
            "reported_by_name": "Fatima Benali",
            "assigned_to": "hk-staff-6",
            "assigned_to_name": "Thomas Bernard",
            "reported_at": (base_time - timedelta(hours=3)).isoformat(),
            "started_at": (base_time - timedelta(hours=2)).isoformat()
        },
        {
            "id": "hk-maint-3",
            "hotel_id": hotel_id,
            "room_id": "room-302",
            "room_number": "302",
            "title": "Ampoule grillée",
            "description": "Ampoule du plafonnier à remplacer",
            "category": "electricite",
            "priority": "basse",
            "status": "resolu",
            "reported_by": "hk-staff-3",
            "reported_by_name": "Sofia Durand",
            "assigned_to": "hk-staff-6",
            "assigned_to_name": "Thomas Bernard",
            "reported_at": (base_time - timedelta(days=1)).isoformat(),
            "started_at": (base_time - timedelta(hours=20)).isoformat(),
            "resolved_at": (base_time - timedelta(hours=19)).isoformat(),
            "resolution_notes": "Ampoule LED remplacée"
        }
    ]


def get_seed_breakfast(hotel_id: str):
    """Get demo breakfast orders"""
    
    return [
        {
            "id": "hk-pdj-1",
            "hotel_id": hotel_id,
            "room_id": "room-101",
            "room_number": "101",
            "guest_name": "Jean Dupont",
            "formule": "continental",
            "person_count": 2,
            "boissons": ["cafe", "jus_orange"],
            "options": [],
            "included": True,
            "status": "a_preparer",
            "delivery_time": "08:00",
            "ordered_at": now
        },
        {
            "id": "hk-pdj-2",
            "hotel_id": hotel_id,
            "room_id": "room-301",
            "room_number": "301",
            "guest_name": "Emma Laurent",
            "formule": "americain",
            "person_count": 1,
            "boissons": ["the", "jus_pomme"],
            "options": ["sans_gluten"],
            "included": True,
            "status": "prepare",
            "delivery_time": "07:30",
            "ordered_at": now,
            "notes": "VIP - Service prioritaire"
        },
        {
            "id": "hk-pdj-3",
            "hotel_id": hotel_id,
            "room_id": "room-202",
            "room_number": "202",
            "guest_name": "Lucas Moreau",
            "formule": "continental",
            "person_count": 2,
            "boissons": ["cafe", "chocolat_chaud"],
            "options": ["vegetarien"],
            "included": False,
            "status": "en_livraison",
            "delivery_time": "08:30",
            "ordered_at": now,
            "price": 25.0
        },
        {
            "id": "hk-pdj-4",
            "hotel_id": hotel_id,
            "room_id": "room-104",
            "room_number": "104",
            "guest_name": "Antoine Petit",
            "formule": "buffet",
            "person_count": 1,
            "boissons": ["cafe"],
            "options": [],
            "included": True,
            "status": "servi",
            "delivery_time": "07:00",
            "ordered_at": now,
            "served_at": (datetime.now() - timedelta(hours=2)).isoformat(),
            "served_by": "Julie Rousseau"
        }
    ]


def get_seed_inventory(hotel_id: str):
    """Get demo inventory items"""
    return [
        {"id": "inv-1", "hotel_id": hotel_id, "item_name": "Serviettes de bain", "category": "linge", "unit": "pieces", "current_stock": 150, "minimum_threshold": 50, "location": "Lingerie 1er"},
        {"id": "inv-2", "hotel_id": hotel_id, "item_name": "Draps 140x190", "category": "linge", "unit": "pieces", "current_stock": 80, "minimum_threshold": 30, "location": "Lingerie 1er"},
        {"id": "inv-3", "hotel_id": hotel_id, "item_name": "Draps 160x200", "category": "linge", "unit": "pieces", "current_stock": 45, "minimum_threshold": 20, "location": "Lingerie 1er"},
        {"id": "inv-4", "hotel_id": hotel_id, "item_name": "Taies d'oreiller", "category": "linge", "unit": "pieces", "current_stock": 120, "minimum_threshold": 40, "location": "Lingerie 1er"},
        {"id": "inv-5", "hotel_id": hotel_id, "item_name": "Savon 30g", "category": "amenities", "unit": "pieces", "current_stock": 500, "minimum_threshold": 200, "location": "Stock principal"},
        {"id": "inv-6", "hotel_id": hotel_id, "item_name": "Shampoing 30ml", "category": "amenities", "unit": "pieces", "current_stock": 450, "minimum_threshold": 200, "location": "Stock principal"},
        {"id": "inv-7", "hotel_id": hotel_id, "item_name": "Gel douche 30ml", "category": "amenities", "unit": "pieces", "current_stock": 380, "minimum_threshold": 200, "location": "Stock principal"},
        {"id": "inv-8", "hotel_id": hotel_id, "item_name": "Bonnet de douche", "category": "amenities", "unit": "pieces", "current_stock": 200, "minimum_threshold": 100, "location": "Stock principal"},
        {"id": "inv-9", "hotel_id": hotel_id, "item_name": "Produit vitres", "category": "produits_nettoyage", "unit": "litres", "current_stock": 15, "minimum_threshold": 5, "location": "Local ménage"},
        {"id": "inv-10", "hotel_id": hotel_id, "item_name": "Désinfectant WC", "category": "produits_nettoyage", "unit": "litres", "current_stock": 8, "minimum_threshold": 10, "location": "Local ménage"},
        {"id": "inv-11", "hotel_id": hotel_id, "item_name": "Papier toilette", "category": "amenities", "unit": "rouleaux", "current_stock": 300, "minimum_threshold": 100, "location": "Stock principal"},
        {"id": "inv-12", "hotel_id": hotel_id, "item_name": "Mouchoirs", "category": "amenities", "unit": "boites", "current_stock": 150, "minimum_threshold": 50, "location": "Stock principal"}
    ]


def get_seed_activity(hotel_id: str):
    """Get demo activity events"""
    base_time = datetime.now()
    
    return [
        {"id": "evt-1", "hotel_id": hotel_id, "time": (base_time - timedelta(minutes=5)).isoformat(), "type": "cleaning", "description": "Nettoyage commencé", "room_number": "102", "staff_name": "Maria Lopez"},
        {"id": "evt-2", "hotel_id": hotel_id, "time": (base_time - timedelta(minutes=20)).isoformat(), "type": "cleaning", "description": "Nettoyage commencé", "room_number": "202", "staff_name": "Fatima Benali"},
        {"id": "evt-3", "hotel_id": hotel_id, "time": (base_time - timedelta(hours=1, minutes=25)).isoformat(), "type": "cleaning", "description": "Nettoyage terminé (35 min)", "room_number": "201", "staff_name": "Fatima Benali"},
        {"id": "evt-4", "hotel_id": hotel_id, "time": (base_time - timedelta(hours=2)).isoformat(), "type": "cleaning", "description": "Chambre validée", "room_number": "104"},
        {"id": "evt-5", "hotel_id": hotel_id, "time": (base_time - timedelta(hours=2, minutes=30)).isoformat(), "type": "cleaning", "description": "Nettoyage terminé (30 min)", "room_number": "104", "staff_name": "Sofia Durand"},
        {"id": "evt-6", "hotel_id": hotel_id, "time": (base_time - timedelta(hours=3)).isoformat(), "type": "cleaning", "description": "Chambre validée", "room_number": "203"},
        {"id": "evt-7", "hotel_id": hotel_id, "time": (base_time - timedelta(hours=1)).isoformat(), "type": "maintenance", "description": "Ticket créé: Fuite robinet", "room_number": "105"},
        {"id": "evt-8", "hotel_id": hotel_id, "time": (base_time - timedelta(hours=2)).isoformat(), "type": "maintenance", "description": "Intervention en cours: Climatisation", "room_number": "204"},
        {"id": "evt-9", "hotel_id": hotel_id, "time": (base_time - timedelta(minutes=30)).isoformat(), "type": "checkout", "description": "Check-out effectué", "room_number": "101"},
        {"id": "evt-10", "hotel_id": hotel_id, "time": (base_time - timedelta(minutes=45)).isoformat(), "type": "checkout", "description": "Check-out effectué", "room_number": "102"}
    ]


async def seed_housekeeping_data(db, hotel_id: str):
    """Seed all housekeeping demo data"""
    import logging
    logger = logging.getLogger(__name__)
    
    try:
        # Check if data already exists
        existing = await db.housekeeping_staff.find_one({"hotel_id": hotel_id})
        if existing:
            logger.info(f"Housekeeping data already exists for hotel {hotel_id}")
            return {"status": "exists", "message": "Data already seeded"}
        
        # Insert all seed data
        staff_data = get_seed_staff(hotel_id)
        await db.housekeeping_staff.insert_many(staff_data)
        logger.info(f"Inserted {len(staff_data)} staff members")
        
        tasks_data = get_seed_tasks(hotel_id)
        await db.housekeeping_tasks.insert_many(tasks_data)
        logger.info(f"Inserted {len(tasks_data)} tasks")
        
        inspections_data = get_seed_inspections(hotel_id)
        await db.housekeeping_inspections.insert_many(inspections_data)
        logger.info(f"Inserted {len(inspections_data)} inspections")
        
        maintenance_data = get_seed_maintenance(hotel_id)
        await db.housekeeping_maintenance.insert_many(maintenance_data)
        logger.info(f"Inserted {len(maintenance_data)} maintenance tickets")
        
        breakfast_data = get_seed_breakfast(hotel_id)
        await db.housekeeping_breakfast.insert_many(breakfast_data)
        logger.info(f"Inserted {len(breakfast_data)} breakfast orders")
        
        inventory_data = get_seed_inventory(hotel_id)
        await db.housekeeping_inventory.insert_many(inventory_data)
        logger.info(f"Inserted {len(inventory_data)} inventory items")
        
        activity_data = get_seed_activity(hotel_id)
        await db.housekeeping_activity.insert_many(activity_data)
        logger.info(f"Inserted {len(activity_data)} activity events")
        
        return {
            "status": "success",
            "message": "Housekeeping data seeded successfully",
            "counts": {
                "staff": len(staff_data),
                "tasks": len(tasks_data),
                "inspections": len(inspections_data),
                "maintenance": len(maintenance_data),
                "breakfast": len(breakfast_data),
                "inventory": len(inventory_data),
                "activity": len(activity_data)
            }
        }
        
    except Exception as e:
        logger.error(f"Error seeding housekeeping data: {e}")
        return {"status": "error", "message": str(e)}
