from __future__ import annotations

import csv
import json
import uuid
from pathlib import Path
from typing import Iterable, List

from .config import settings
from .vectorstore import QdrantVectorStore, VectorRecord


def _row_to_text(row: dict, file_path: Path, index: int) -> str:
    # Flatten row into readable text, trimming very long fields
    kv_pairs = []
    for k, v in row.items():
        if v is None:
            continue
        s = str(v)
        if len(s) > 300:
            s = s[:300] + "…"
        kv_pairs.append(f"{k}: {s}")
    return f"Source: {file_path.as_posix()} | Row: {index}\n" + " | ".join(kv_pairs)


def _json_item_to_text(item: dict, file_path: Path, index: int) -> str:
    # Keep it compact
    try:
        s = json.dumps(item, ensure_ascii=False)
    except Exception:
        s = str(item)
    if len(s) > 1000:
        s = s[:1000] + "…"
    return f"Source: {file_path.as_posix()} | Item: {index}\n{s}"


def _iter_csv_records(csv_path: Path) -> Iterable[VectorRecord]:
    with csv_path.open("r", encoding="utf-8", errors="ignore", newline="") as f:
        reader = csv.DictReader(f)
        for i, row in enumerate(reader):
            text = _row_to_text(row, csv_path, i)
            yield VectorRecord(
                id=str(uuid.uuid4()),
                text=text,
                metadata={
                    "source": csv_path.as_posix(),
                    "row_index": i,
                    "type": "csv",
                },
            )


def _iter_json_records(json_path: Path) -> Iterable[VectorRecord]:
    try:
        content = json.loads(json_path.read_text(encoding="utf-8", errors="ignore"))
    except Exception:
        return []

    if isinstance(content, list):
        items = content
    elif isinstance(content, dict):
        # Some Amazon exports are dicts with list under a key
        # Try to find a list-like value
        lists = [v for v in content.values() if isinstance(v, list)]
        items = lists[0] if lists else [content]
    else:
        items = [content]

    recs: List[VectorRecord] = []
    for i, item in enumerate(items):
        if not isinstance(item, dict):
            item = {"value": item}
        text = _json_item_to_text(item, json_path, i)
        recs.append(
            VectorRecord(
                id=str(uuid.uuid4()),
                text=text,
                metadata={
                    "source": json_path.as_posix(),
                    "item_index": i,
                    "type": "json",
                },
            )
        )
    return recs


def ingest_data(data_root: str | Path | None = None, batch_size: int | None = None) -> dict:
    root = Path(data_root or settings.data_root)
    if not root.exists():
        raise FileNotFoundError(f"Data root not found: {root}")

    store = QdrantVectorStore()
    bs = batch_size or settings.batch_size

    csv_files = list(root.rglob("*.csv"))
    json_files = list(root.rglob("*.json"))

    total = 0

    def _yield_batches(iterable, size):
        batch = []
        for x in iterable:
            batch.append(x)
            if len(batch) >= size:
                yield batch
                batch = []
        if batch:
            yield batch

    # CSVs
    for fp in csv_files:
        for batch in _yield_batches(_iter_csv_records(fp), bs):
            total += store.upsert(batch)

    # JSONs
    for fp in json_files:
        recs = _iter_json_records(fp)
        for batch in _yield_batches(recs, bs):
            total += store.upsert(batch)

    return {"ingested": total, "collection": store.collection}

