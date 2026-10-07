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


def test_auto_language_detection():
    response = client.post("/analyze", json={
        "source_code": 'function login(user) { return fetch("/login?user=" + user); }',
        "language": "auto",
        "file_path": "submitted_code"
    })
    assert response.status_code == 200
    assert response.json()["code_structure"]["language"] == "javascript"


def test_disposition_is_audited():
    response = client.post("/disposition", json={
        "finding_id": "TEST-AUDIT",
        "status": "ACCEPTED",
        "reviewer_note": "Audit test"
    })
    assert response.status_code == 200
    events = client.get("/audit?limit=10").json()["events"]
    assert any(e["finding_id"] == "TEST-AUDIT" and e["status"] == "ACCEPTED" for e in events)


def test_runtime_evidence():
    response = client.post("/analyze", json={
        "source_code": "int main() { return 0; }",
        "language": "c",
        "runtime_log": "RuntimeError: buffer access failed"
    })
    assert response.status_code == 200
    assert any(f["category"] == "Runtime Evidence" for f in response.json()["findings"])
