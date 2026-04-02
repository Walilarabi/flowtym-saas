"""
Object Storage Module for Flowtym
Handles file uploads for employee documents, contracts, client files, etc.
Uses Emergent Object Storage API
"""

import os
import uuid
import requests
from datetime import datetime, timezone
from typing import Optional, Tuple
from pydantic import BaseModel
from fastapi import UploadFile, HTTPException
import logging

logger = logging.getLogger(__name__)

# Configuration
STORAGE_URL = "https://integrations.emergentagent.com/objstore/api/v1/storage"
APP_NAME = "flowtym-pms"

# Module-level storage key (set once, reused globally)
_storage_key: Optional[str] = None


# ===================== MODELS =====================

class FileMetadata(BaseModel):
    """File metadata stored in database"""
    id: str
    hotel_id: str
    storage_path: str
    original_filename: str
    content_type: str
    size: int
    category: str  # "employee_document", "contract", "client_document", "hotel_asset"
    entity_type: Optional[str] = None  # "employee", "contract", "client"
    entity_id: Optional[str] = None  # ID of the related entity
    document_type: Optional[str] = None  # "cni", "rib", "contract_signed", "photo", etc.
    description: Optional[str] = None
    is_deleted: bool = False
    uploaded_by: str
    created_at: str


class FileUploadResponse(BaseModel):
    """Response after successful upload"""
    id: str
    storage_path: str
    original_filename: str
    size: int
    content_type: str
    url: str  # URL to access the file


# ===================== MIME TYPES =====================

MIME_TYPES = {
    "jpg": "image/jpeg",
    "jpeg": "image/jpeg",
    "png": "image/png",
    "gif": "image/gif",
    "webp": "image/webp",
    "pdf": "application/pdf",
    "doc": "application/msword",
    "docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "xls": "application/vnd.ms-excel",
    "xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "csv": "text/csv",
    "txt": "text/plain",
    "json": "application/json"
}

# Allowed file types per category
ALLOWED_TYPES = {
    "employee_document": ["pdf", "jpg", "jpeg", "png"],
    "contract": ["pdf", "doc", "docx"],
    "client_document": ["pdf", "jpg", "jpeg", "png"],
    "hotel_asset": ["jpg", "jpeg", "png", "webp", "gif", "pdf"]
}

# Max file size per category (in bytes)
MAX_FILE_SIZES = {
    "employee_document": 10 * 1024 * 1024,  # 10 MB
    "contract": 20 * 1024 * 1024,  # 20 MB
    "client_document": 10 * 1024 * 1024,  # 10 MB
    "hotel_asset": 50 * 1024 * 1024  # 50 MB
}


# ===================== STORAGE FUNCTIONS =====================

def init_storage() -> str:
    """
    Initialize storage and get reusable storage key.
    Call ONCE at startup. Returns a session-scoped, reusable storage_key.
    """
    global _storage_key
    
    if _storage_key:
        return _storage_key
    
    emergent_key = os.environ.get("EMERGENT_LLM_KEY")
    if not emergent_key:
        raise ValueError("EMERGENT_LLM_KEY not set in environment")
    
    try:
        resp = requests.post(
            f"{STORAGE_URL}/init",
            json={"emergent_key": emergent_key},
            timeout=30
        )
        resp.raise_for_status()
        _storage_key = resp.json()["storage_key"]
        logger.info("Object Storage initialized successfully")
        return _storage_key
    except requests.exceptions.RequestException as e:
        logger.error(f"Failed to initialize storage: {e}")
        raise


def get_storage_key() -> str:
    """Get storage key, initializing if necessary"""
    global _storage_key
    if not _storage_key:
        return init_storage()
    return _storage_key


def put_object(path: str, data: bytes, content_type: str) -> dict:
    """
    Upload file to storage.
    Returns {"path": "...", "size": 123, "etag": "..."}
    """
    key = get_storage_key()
    
    try:
        resp = requests.put(
            f"{STORAGE_URL}/objects/{path}",
            headers={
                "X-Storage-Key": key,
                "Content-Type": content_type
            },
            data=data,
            timeout=120
        )
        resp.raise_for_status()
        return resp.json()
    except requests.exceptions.RequestException as e:
        logger.error(f"Failed to upload file: {e}")
        raise


def get_object(path: str) -> Tuple[bytes, str]:
    """
    Download file from storage.
    Returns (content_bytes, content_type)
    """
    key = get_storage_key()
    
    try:
        resp = requests.get(
            f"{STORAGE_URL}/objects/{path}",
            headers={"X-Storage-Key": key},
            timeout=60
        )
        resp.raise_for_status()
        return resp.content, resp.headers.get("Content-Type", "application/octet-stream")
    except requests.exceptions.RequestException as e:
        logger.error(f"Failed to download file: {e}")
        raise


# ===================== HELPER FUNCTIONS =====================

def get_file_extension(filename: str) -> str:
    """Extract file extension from filename"""
    if "." in filename:
        return filename.rsplit(".", 1)[-1].lower()
    return "bin"


def get_content_type(filename: str) -> str:
    """Get content type from filename"""
    ext = get_file_extension(filename)
    return MIME_TYPES.get(ext, "application/octet-stream")


def validate_file(file: UploadFile, category: str) -> None:
    """Validate file type and size for category"""
    ext = get_file_extension(file.filename or "file.bin")
    allowed = ALLOWED_TYPES.get(category, ["pdf", "jpg", "png"])
    
    if ext not in allowed:
        raise HTTPException(
            status_code=400,
            detail=f"Type de fichier non autorise. Types acceptes: {', '.join(allowed)}"
        )


def generate_storage_path(
    hotel_id: str,
    category: str,
    entity_type: Optional[str],
    entity_id: Optional[str],
    filename: str
) -> str:
    """Generate storage path following convention"""
    ext = get_file_extension(filename)
    unique_id = uuid.uuid4().hex[:12]
    
    if entity_type and entity_id:
        return f"{APP_NAME}/{hotel_id}/{category}/{entity_type}/{entity_id}/{unique_id}.{ext}"
    else:
        return f"{APP_NAME}/{hotel_id}/{category}/{unique_id}.{ext}"


# ===================== UPLOAD FUNCTION =====================

async def upload_file(
    file: UploadFile,
    hotel_id: str,
    category: str,
    entity_type: Optional[str] = None,
    entity_id: Optional[str] = None,
    document_type: Optional[str] = None,
    description: Optional[str] = None,
    uploaded_by: str = "system"
) -> dict:
    """
    Upload a file to storage and return metadata.
    
    Args:
        file: The uploaded file
        hotel_id: Hotel ID
        category: File category (employee_document, contract, client_document, hotel_asset)
        entity_type: Related entity type (employee, contract, client)
        entity_id: Related entity ID
        document_type: Document type (cni, rib, contract_signed, photo)
        description: Optional description
        uploaded_by: User who uploaded the file
    
    Returns:
        File metadata dict ready to be stored in database
    """
    # Validate file
    validate_file(file, category)
    
    # Read file content
    content = await file.read()
    
    # Check file size
    max_size = MAX_FILE_SIZES.get(category, 10 * 1024 * 1024)
    if len(content) > max_size:
        raise HTTPException(
            status_code=400,
            detail=f"Fichier trop volumineux. Taille max: {max_size // (1024*1024)} MB"
        )
    
    # Generate storage path
    storage_path = generate_storage_path(
        hotel_id, category, entity_type, entity_id, file.filename or "file.bin"
    )
    
    # Get content type
    content_type = file.content_type or get_content_type(file.filename or "file.bin")
    
    # Upload to storage
    result = put_object(storage_path, content, content_type)
    
    # Generate metadata
    now = datetime.now(timezone.utc).isoformat()
    
    metadata = {
        "id": str(uuid.uuid4()),
        "hotel_id": hotel_id,
        "storage_path": result["path"],
        "original_filename": file.filename or "file",
        "content_type": content_type,
        "size": result.get("size", len(content)),
        "category": category,
        "entity_type": entity_type,
        "entity_id": entity_id,
        "document_type": document_type,
        "description": description,
        "is_deleted": False,
        "uploaded_by": uploaded_by,
        "created_at": now
    }
    
    return metadata


async def download_file(storage_path: str) -> Tuple[bytes, str]:
    """
    Download a file from storage.
    
    Returns:
        Tuple of (file_content, content_type)
    """
    return get_object(storage_path)
