from __future__ import annotations

from typing import List

from fastapi import FastAPI, Path
from fastapi.responses import JSONResponse

from .config import settings
from .ingest import ingest_data
from .vectorstore import QdrantVectorStore
from .llm import generate_answer
from .schemas import IngestResponse, ChatRequest, ChatResponse, QdrantCollectionsResponse, QdrantCollectionInfo, QdrantCountResponse


app = FastAPI(title="DOC RAG Server Backend", version="0.1.0")


@app.get("/health")
def health():
    return {"status": "ok", "collection": settings.collection_name}


@app.post("/ingest", response_model=IngestResponse)
def ingest():
    result = ingest_data()
    return IngestResponse(**result)


@app.post("/chat", response_model=ChatResponse)
async def chat(req: ChatRequest):
    store = QdrantVectorStore()
    hits = store.search(req.message, limit=req.top_k)
    contexts: List[str] = [h.get("text", "") for h in hits]
    answer = await generate_answer(req.message, contexts)
    return ChatResponse(answer=answer, sources=hits)


# Convenience endpoint to test search without LLM
@app.get("/search")
def search(q: str, k: int = 5):
    store = QdrantVectorStore()
    hits = store.search(q, limit=k)
    return JSONResponse({"query": q, "hits": hits})


# ---- Qdrant utility endpoints ----
@app.get("/qdrant/collections", response_model=QdrantCollectionsResponse)
def qdrant_collections():
    store = QdrantVectorStore()
    cols = store.list_collections()
    return QdrantCollectionsResponse(collections=cols)


@app.get("/qdrant/collections/{name}", response_model=QdrantCollectionInfo)
def qdrant_collection_info(name: str = Path(..., description="Collection name")):
    store = QdrantVectorStore(collection=name)
    info = store.get_collection_info(name)
    count = store.count(name)
    # info is a rich object; return key parts as dict
    cfg = {}
    try:
        cfg = info.dict() if hasattr(info, "dict") else dict(info)
    except Exception:
        cfg = {"repr": repr(info)}
    return QdrantCollectionInfo(name=name, vectors_count=count, status=getattr(info, "status", None), config=cfg)


@app.get("/qdrant/count", response_model=QdrantCountResponse)
def qdrant_count(name: str | None = None):
    store = QdrantVectorStore(collection=name or settings.collection_name)
    cnt = store.count(name)
    return QdrantCountResponse(collection=store.collection if name is None else name, count=cnt)


@app.delete("/qdrant/collections/{name}")
def qdrant_delete_collection(name: str = Path(..., description="Collection name")):
    store = QdrantVectorStore(collection=name)
    store.delete_collection(name)
    return {"deleted": name}


@app.post("/qdrant/collections/{name}/recreate")
def qdrant_recreate_collection(name: str = Path(..., description="Collection name")):
    store = QdrantVectorStore(collection=name)
    store.recreate_collection(name)
    return {"recreated": name, "dim": store.embeddings.dim, "distance": "COSINE"}
