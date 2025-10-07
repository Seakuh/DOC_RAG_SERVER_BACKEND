from pydantic import BaseModel, Field
from typing import List, Optional


class IngestResponse(BaseModel):
    ingested: int
    collection: str


class ChatRequest(BaseModel):
    message: str = Field(..., description="Benutzerfrage (Deutsch oder beliebig)")
    top_k: int = Field(5, ge=1, le=20)


class ChatResponse(BaseModel):
    answer: str
    sources: List[dict]


class QdrantCollectionsResponse(BaseModel):
    collections: List[str]


class QdrantCollectionInfo(BaseModel):
    name: str
    vectors_count: Optional[int] = None
    status: Optional[str] = None
    config: Optional[dict] = None


class QdrantCountResponse(BaseModel):
    collection: str
    count: int
