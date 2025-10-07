from __future__ import annotations

from typing import List

from fastapi import FastAPI
from fastapi.responses import JSONResponse

from .config import settings
from .ingest import ingest_data
from .vectorstore import QdrantVectorStore
from .llm import generate_answer
from .schemas import IngestResponse, ChatRequest, ChatResponse


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

