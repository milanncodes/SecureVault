"""
Tests for Phase 8.1 - Vector Embeddings, Semantic Search, and Real-time SSE Stream.
"""

import pytest
from fastapi.testclient import TestClient
from main import app
from semantic_search import generate_embedding


@pytest.fixture
def client():
    return TestClient(app)


def test_embedding_generation():
    """Verify that sentence-transformers generates a 384-dimensional dense vector."""
    text = "Ransomware extortion targeting city hospital infrastructure"
    vec = generate_embedding(text)
    assert len(vec) == 384
    assert all(isinstance(val, float) for val in vec)


def test_realtime_upload_stream(client):
    """Verify SSE streaming emits sequential ingestion stages."""
    with client.stream("GET", "/api/v1/documents/upload-stream/test-uuid-999") as response:
        assert response.status_code == 200
        assert "text/event-stream" in response.headers.get("content-type", "")
        
        events = []
        for line in response.iter_lines():
            if line.startswith("data:"):
                events.append(line)
        
        # Verify 5 pipeline stages are emitted
        assert len(events) >= 5
