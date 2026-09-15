"""
SecureVault Semantic Search Engine (Component 8.1)
Vector similarity search over legal case summaries and indexed document embeddings.
Uses local SentenceTransformer ('all-MiniLM-L6-v2') and pgvector with ABAC filtering.
"""

from typing import Any, Dict, List, Optional
from sentence_transformers import SentenceTransformer
from sqlalchemy.orm import Session

try:
    from database import Case, User, CaseStatus, RoleType
    from abac import AccessControlEngine
except ImportError:
    from .database import Case, User, CaseStatus, RoleType
    from .abac import AccessControlEngine

# Lazy-loaded singleton for CPU-efficient sentence transformer
_EMBEDDING_MODEL: Optional[SentenceTransformer] = None


def get_embedding_model() -> SentenceTransformer:
    """Returns or initializes the singleton embedding model."""
    global _EMBEDDING_MODEL
    if _EMBEDDING_MODEL is None:
        _EMBEDDING_MODEL = SentenceTransformer("all-MiniLM-L6-v2")
    return _EMBEDDING_MODEL


def generate_embedding(text: str) -> List[float]:
    """Generates a 384-dimensional dense vector embedding for input text."""
    if not text or not text.strip():
        return [0.0] * 384
    model = get_embedding_model()
    embedding = model.encode(text.strip(), normalize_embeddings=True)
    return embedding.tolist()


def search_cases(
    db: Session,
    query: str,
    user: User,
    limit: int = 5,
) -> List[Dict[str, Any]]:
    """
    Vector similarity search over Case summaries with ABAC policy filtering.
    Only returns cases the requesting user is authorized to view.
    """
    if not query or not query.strip():
        return []

    query_vector = generate_embedding(query)

    # Perform pgvector cosine distance search
    distance_col = Case.semantic_embedding.cosine_distance(query_vector).label("distance")
    results = (
        db.query(Case, distance_col)
        .filter(Case.semantic_embedding.is_not(None))
        .order_by(distance_col.asc())
        .limit(limit * 2)  # Over-fetch for ABAC post-filter
        .all()
    )

    filtered_results = []
    for case, distance in results:
        # Evaluate clearance tier
        if user.clearance_tier < case.classification_tier:
            continue

        # Convert cosine distance to cosine similarity score (0.0 to 1.0)
        similarity_score = max(0.0, round(1.0 - float(distance), 4))

        filtered_results.append({
            "id": str(case.id),
            "case_number": case.case_number,
            "title": case.title,
            "origin_station": case.origin_station,
            "classification_tier": case.classification_tier,
            "status": case.status.value if hasattr(case.status, "value") else str(case.status),
            "summary": case.summary,
            "tags": case.tags or [],
            "similarity_score": similarity_score,
        })

        if len(filtered_results) >= limit:
            break

    return filtered_results
