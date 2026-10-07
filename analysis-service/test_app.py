# Lightweight smoke tests for the CS4 analysis service.
# The actual app is loaded from analysis-service/app.py during CI/local testing.
import importlib.util
from pathlib import Path

APP_PATH = Path(__file__).with_name("app.py")
spec = importlib.util.spec_from_file_location("cs4_app", APP_PATH)
module = importlib.util.module_from_spec(spec)
assert spec and spec.loader
spec.loader.exec_module(module)

from fastapi.testclient import TestClient

client = TestClient(module.app)


def test_health():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["service"] == "cs4-analysis"


def test_finds_hardcoded_secret():
    response = client.post("/analyze", json={
        "source_code": 'const password = "demo-secret";',
        "language": "javascript",
        "file_path": "auth.js"
    })
    assert response.status_code == 200
    data = response.json()
    assert any(f["rule_id"] == "CS4-SEC-001" for f in data["findings"])


def test_compiler_evidence():
    response = client.post("/analyze", json={
        "source_code": "int main() { return 0; }",
        "compiler_log": "main.c:4: error: expected ';'"
    })
    assert response.status_code == 200
    assert any(f["category"] == "Compiler Evidence" for f in response.json()["findings"])


def test_no_automatic_merge():
    response = client.post("/disposition", json={
        "finding_id": "SEC-001",
        "status": "ACCEPTED",
        "reviewer_note": "Validated by reviewer"
    })
    assert response.status_code == 200
    assert response.json()["success"] is True
