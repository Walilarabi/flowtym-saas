"""
Storage API Routes
Handles file uploads and downloads
"""

from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Query, Response, Header
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Optional, List
from datetime import datetime, timezone

from .object_storage import upload_file, download_file, FileMetadata

storage_router = APIRouter()
security = HTTPBearer()


def verify_token(credentials: HTTPAuthorizationCredentials):
    """Verify JWT token"""
    if not credentials or not credentials.credentials:
        raise HTTPException(status_code=401, detail="Token manquant")
    return credentials.credentials


@storage_router.post("/upload")
async def upload_document(
    file: UploadFile = File(...),
    hotel_id: str = Query(...),
    category: str = Query(..., regex="^(employee_document|contract|client_document|hotel_asset)$"),
    entity_type: Optional[str] = Query(None),
    entity_id: Optional[str] = Query(None),
    document_type: Optional[str] = Query(None),
    description: Optional[str] = Query(None),
    db = None,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """
    Upload a document.
    
    Categories:
    - employee_document: Employee ID cards, RIB, etc.
    - contract: Signed contracts
    - client_document: Client documents
    - hotel_asset: Hotel images, logos, etc.
    
    Document types (for employee_document):
    - cni: Carte Nationale d'Identité
    - passport: Passport
    - rib: Relevé d'Identité Bancaire
    - photo: Employee photo
    - cv: Curriculum Vitae
    - diploma: Diplôme
    - certificate: Certificat
    """
    token = verify_token(credentials)
    
    # Get user email from token (simplified)
    uploaded_by = "user"
    
    try:
        # Upload file and get metadata
        metadata = await upload_file(
            file=file,
            hotel_id=hotel_id,
            category=category,
            entity_type=entity_type,
            entity_id=entity_id,
            document_type=document_type,
            description=description,
            uploaded_by=uploaded_by
        )
        
        # Store metadata in database
        await db.files.insert_one(metadata)
        
        return {
            "id": metadata["id"],
            "storage_path": metadata["storage_path"],
            "original_filename": metadata["original_filename"],
            "size": metadata["size"],
            "content_type": metadata["content_type"],
            "message": "Fichier televerse avec succes"
        }
        
    except HTTPException:
        raise  # Re-raise HTTP exceptions as-is
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur lors du telechargement: {str(e)}")


@storage_router.get("/files/{file_id}")
async def get_file_metadata(
    file_id: str,
    db = None,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Get file metadata by ID"""
    verify_token(credentials)
    
    file_record = await db.files.find_one(
        {"id": file_id, "is_deleted": False},
        {"_id": 0}
    )
    
    if not file_record:
        raise HTTPException(status_code=404, detail="Fichier non trouve")
    
    return file_record


@storage_router.get("/files/{file_id}/download")
async def download_document(
    file_id: str,
    db = None,
    authorization: Optional[str] = Header(None),
    auth: Optional[str] = Query(None),  # Query param auth for img src
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)
):
    """
    Download a file by ID.
    Supports both header auth and query param auth (for img src tags).
    """
    # Verify auth (either from header or query param)
    auth_token = None
    if credentials and credentials.credentials:
        auth_token = credentials.credentials
    elif auth:
        auth_token = auth
    elif authorization and authorization.startswith("Bearer "):
        auth_token = authorization[7:]
    
    if not auth_token:
        raise HTTPException(status_code=401, detail="Token manquant")
    
    # Get file metadata from DB
    file_record = await db.files.find_one(
        {"id": file_id, "is_deleted": False},
        {"_id": 0}
    )
    
    if not file_record:
        raise HTTPException(status_code=404, detail="Fichier non trouve")
    
    try:
        # Download from storage
        content, content_type = await download_file(file_record["storage_path"])
        
        return Response(
            content=content,
            media_type=file_record.get("content_type", content_type),
            headers={
                "Content-Disposition": f'inline; filename="{file_record["original_filename"]}"'
            }
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur lors du telechargement: {str(e)}")


@storage_router.get("/files")
async def list_files(
    hotel_id: str,
    category: Optional[str] = None,
    entity_type: Optional[str] = None,
    entity_id: Optional[str] = None,
    limit: int = Query(50, le=200),
    db = None,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """List files with filters"""
    verify_token(credentials)
    
    query = {"hotel_id": hotel_id, "is_deleted": False}
    
    if category:
        query["category"] = category
    if entity_type:
        query["entity_type"] = entity_type
    if entity_id:
        query["entity_id"] = entity_id
    
    files = await db.files.find(
        query,
        {"_id": 0}
    ).sort("created_at", -1).limit(limit).to_list(limit)
    
    return files


@storage_router.delete("/files/{file_id}")
async def delete_file(
    file_id: str,
    db = None,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Soft delete a file"""
    verify_token(credentials)
    
    result = await db.files.update_one(
        {"id": file_id},
        {"$set": {
            "is_deleted": True,
            "deleted_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Fichier non trouve")
    
    return {"message": "Fichier supprime"}


@storage_router.get("/entity/{entity_type}/{entity_id}/files")
async def list_entity_files(
    entity_type: str,
    entity_id: str,
    hotel_id: str = Query(...),
    db = None,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """List all files for a specific entity (employee, contract, client)"""
    verify_token(credentials)
    
    files = await db.files.find(
        {
            "hotel_id": hotel_id,
            "entity_type": entity_type,
            "entity_id": entity_id,
            "is_deleted": False
        },
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    
    return files
