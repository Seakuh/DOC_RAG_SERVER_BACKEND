from __future__ import annotations

from dataclasses import dataclass
from typing import Iterable, List, Dict, Any

from qdrant_client import QdrantClient
from qdrant_client.http import models as qmodels

from .config import settings


@dataclass
class VectorRecord:
    id: str
    text: str
    metadata: Dict[str, Any]


class Embeddings:
    def __init__(self, model_name: str | None = None):
        from sentence_transformers import SentenceTransformer

        self.model_name = model_name or settings.embedding_model
        self._model = SentenceTransformer(self.model_name)
        self.dim = self._model.get_sentence_embedding_dimension()

    def embed(self, texts: List[str]) -> List[List[float]]:
        return [vec.tolist() for vec in self._model.encode(texts, normalize_embeddings=True, convert_to_numpy=True)]


class QdrantVectorStore:
    def __init__(self, collection: str | None = None, embeddings: Embeddings | None = None):
        self.collection = collection or settings.collection_name
        self.embeddings = embeddings or Embeddings()
        self.client = QdrantClient(url=settings.qdrant_url, api_key=settings.qdrant_api_key)

        self._ensure_collection()

    def _ensure_collection(self):
        exists = False
        try:
            info = self.client.get_collection(self.collection)
            exists = info is not None
        except Exception:
            exists = False

        if not exists:
            self.client.recreate_collection(
                collection_name=self.collection,
                vectors_config=qmodels.VectorParams(size=self.embeddings.dim, distance=qmodels.Distance.COSINE),
            )

    def upsert(self, records: Iterable[VectorRecord]):
        recs = list(records)
        if not recs:
            return 0
        vectors = self.embeddings.embed([r.text for r in recs])
        points = [
            qmodels.PointStruct(id=r.id, vector=vectors[i], payload={"text": r.text, **r.metadata})
            for i, r in enumerate(recs)
        ]
        self.client.upsert(collection_name=self.collection, points=points, wait=True)
        return len(points)

    def search(self, query: str, limit: int = 5) -> List[Dict[str, Any]]:
        qvec = self.embeddings.embed([query])[0]
        hits = self.client.search(
            collection_name=self.collection,
            query_vector=qvec,
            limit=limit,
            with_payload=True,
            score_threshold=None,
        )
        results: List[Dict[str, Any]] = []
        for h in hits:
            payload = h.payload or {}
            results.append({
                "id": h.id,
                "score": h.score,
                "text": payload.get("text", ""),
                "metadata": {k: v for k, v in payload.items() if k != "text"},
            })
        return results

    # ---- Qdrant utility operations ----
    def count(self, collection: str | None = None, exact: bool = True) -> int:
        name = collection or self.collection
        try:
            res = self.client.count(collection_name=name, exact=exact)
            # qdrant-client >=1.7 returns object with 'count'
            return int(getattr(res, "count", 0))
        except Exception:
            return 0

    def get_collection_info(self, collection: str | None = None):
        name = collection or self.collection
        return self.client.get_collection(name)

    def list_collections(self) -> List[str]:
        cols = self.client.get_collections()
        return [c.name for c in getattr(cols, "collections", [])]

    def delete_collection(self, name: str | None = None):
        target = name or self.collection
        return self.client.delete_collection(target)

    def recreate_collection(self, name: str | None = None):
        target = name or self.collection
        return self.client.recreate_collection(
            collection_name=target,
            vectors_config=qmodels.VectorParams(size=self.embeddings.dim, distance=qmodels.Distance.COSINE),
        )
