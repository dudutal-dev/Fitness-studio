"""Thin ElevenLabs Flows helper (image/video generation). Auth is injected by the proxy / XI_API_KEY env."""
import json, os, time, urllib.request

API = "https://api.elevenlabs.io"

def _req(method, path, body=None):
    headers = {"Content-Type": "application/json"}
    if os.environ.get("XI_API_KEY"):
        headers["xi-api-key"] = os.environ["XI_API_KEY"]
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(API + path, data=data, method=method, headers=headers)
    with urllib.request.urlopen(req, timeout=120) as r:
        return json.loads(r.read())

def create(kind, body):
    return _req("POST", f"/v1/flows/{kind}", body)["id"]

def wait(kind, gid, timeout=900):
    t0 = time.time()
    while time.time() - t0 < timeout:
        r = _req("GET", f"/v1/flows/{kind}/{gid}")
        if r["status"] == "completed":
            return r
        if r["status"] == "failed":
            raise RuntimeError(f"{kind} {gid} failed: {r}")
        time.sleep(5)
    raise TimeoutError(gid)

def download(url, path):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with urllib.request.urlopen(url, timeout=300) as r, open(path, "wb") as f:
        f.write(r.read())
