import os
from dotenv import load_dotenv

load_dotenv()


def env_str(key: str, default: str | None = None) -> str | None:
    val = os.getenv(key)
    return val if val is not None else default


class Settings:
    # Qdrant
    qdrant_url: str | None = env_str("QDRANT_URL", "http://localhost:6333")
    qdrant_api_key: str | None = env_str("QDRANT_API_KEY")
    collection_name: str = env_str("QDRANT_COLLECTION", "amazon_export")  # noqa: F722

    # Embeddings
    embedding_model: str = env_str("EMBEDDING_MODEL", "sentence-transformers/all-MiniLM-L6-v2")

    # LLM provider selection
    openai_api_key: str | None = env_str("OPENAI_API_KEY")
    openai_model: str = env_str("OPENAI_MODEL", "gpt-4o-mini")

    # If you don't use Ollama, leave it unset (None)
    ollama_host: str | None = env_str("OLLAMA_HOST")
    ollama_model: str = env_str("OLLAMA_MODEL", "llama3.1")

    # Ingestion
    data_root: str = env_str("AMAZON_DATA_PATH", "AMAZON_DATA")
    batch_size: int = int(env_str("INGEST_BATCH_SIZE", "64"))


settings = Settings()
