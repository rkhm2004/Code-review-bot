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


def test_unified_diff_validation_and_structure():
    diff = """diff --git a/demo/security_test.py b/demo/security_test.py
index 1111111..2222222 100644
--- a/demo/security_test.py
+++ b/demo/security_test.py
@@ -1,2 +1,5 @@
 import os
 
+def run_command(user_input):
+    os.system("ping " + user_input)
"""
    validation = client.post("/validate", json={
        "source_code": diff,
        "language": "auto",
        "file_path": "PR-8-diff",
    })
    assert validation.status_code == 200
    assert validation.json()["validated"] is True
    assert validation.json()["method"] == "git-diff-structure"

    analysis = client.post("/analyze", json={
        "source_code": diff,
        "language": "auto",
        "file_path": "PR-8-diff",
    })
    assert analysis.status_code == 200
    data = analysis.json()
    assert data["code_structure"]["source_kind"] == "git_unified_diff"
    assert "run_command" in data["code_structure"]["functions"]
    assert any(f["rule_id"] == "CS4-SEC-002" for f in data["findings"])


def test_invalid_disposition_status_is_rejected():
    response = client.post("/disposition", json={
        "finding_id": "TEST-INVALID",
        "status": "NOT_A_REAL_STATUS",
    })
    assert response.status_code == 200
    assert response.json()["success"] is False


def test_structured_static_evidence_preserves_message():
    response = client.post("/analyze", json={
        "source_code": "import os\nos.system(user_input)",
        "language": "python",
        "static_analysis": '[{"rule":"CS4-SEC-002","severity":"HIGH","message":"Command injection detected","file":"demo/security_test.py","line":4}]',
    })
    assert response.status_code == 200
    finding = next(f for f in response.json()["findings"] if f["category"] == "Static Analysis")
    assert finding["severity"] == "HIGH"
    assert finding["description"] == "Command injection detected"
    assert finding["file"] == "demo/security_test.py"
    assert finding["line"] == 4


def test_report_reflects_latest_human_disposition():
    report = client.post("/report", json={
        "repository": "rkhm2004/Code-review-bot",
        "file_path": "submitted_code",
        "analysis": {
            "summary": {"status": "NEEDS_REVIEW", "finding_count": 1},
            "code_structure": {"language": "python"},
            "findings": [{
                "id": "REPORT-ACCEPT-001",
                "title": "Test finding",
                "severity": "HIGH",
                "confidence": 0.9,
                "file": "submitted_code",
                "line": 1,
                "root_cause": "Test",
                "recommendation": "Test",
                "status": "NEEDS_REVIEW",
            }],
        },
    })
    assert report.status_code == 200
    assert "REPORT-ACCEPT-001 — Test finding" in report.json()["content"]
