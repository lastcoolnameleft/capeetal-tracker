import os
import requests

BASE_URL = os.environ.get("PROD_BASE_URL", "https://capeetaltracker.com")


def test_homepage_loads():
    """Homepage returns 200 and contains expected content."""
    r = requests.get(BASE_URL, timeout=10)
    assert r.status_code == 200
    assert "Ca-PEE-tal" in r.text


def test_health_endpoint():
    """Health endpoint returns JSON with status ok."""
    r = requests.get(f"{BASE_URL}/api/health", timeout=10)
    assert r.status_code == 200
    data = r.json()
    assert data["status"] == "ok"
    assert "sha" in data
    assert "uptime" in data


def test_share_page_loads():
    """Share page returns 200."""
    r = requests.get(f"{BASE_URL}/share/CA", timeout=10)
    assert r.status_code == 200


def test_static_assets():
    """CSS and JS files are served."""
    r = requests.get(f"{BASE_URL}/css/app.css", timeout=10)
    assert r.status_code == 200
    r = requests.get(f"{BASE_URL}/js/app.js", timeout=10)
    assert r.status_code == 200
