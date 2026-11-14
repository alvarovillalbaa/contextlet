"""Own one bounded CI scratch tree and retain complete outer command streams."""
import hashlib
import json
import os
from pathlib import Path
import shutil
import signal
import subprocess
import tempfile
import time
import uuid

repo = Path(__file__).resolve().parents[2]
output = Path(os.environ["CONTEXTLET_OUTPUT"])
output.mkdir(exist_ok=False)
scratch = Path(tempfile.mkdtemp(prefix="contextlet-preview-"))
nonce = uuid.uuid4().hex
(scratch / "owner").write_text(nonce)
identity = scratch.stat().st_ino
receipt = {"commands": [], "passed": False, "cleanup": False}
environment = dict(os.environ, CONTEXTLET_SCRATCH=str(scratch),
                   CONTEXTLET_OUTPUT=str(output), npm_config_cache=str(scratch / "npm-cache"))

def source_vector():
    paths = subprocess.check_output(["git", "ls-files", "-z"], cwd=repo).split(b"\0")
    return [{"path": os.fsdecode(p), "bytes": (repo / os.fsdecode(p)).stat().st_size,
             "sha256": hashlib.sha256((repo / os.fsdecode(p)).read_bytes()).hexdigest()}
            for p in paths if p]

before = source_vector()
(output / "source-before.json").write_text(json.dumps(before, indent=2))

def execute(name, arguments, timeout):
    started = time.monotonic()
    process = subprocess.Popen(arguments, cwd=repo, env=environment, stdout=subprocess.PIPE,
                               stderr=subprocess.PIPE, start_new_session=True)
    timed_out = False
    try:
        stdout, stderr = process.communicate(timeout=timeout)
    except subprocess.TimeoutExpired:
        timed_out = True
        os.killpg(process.pid, signal.SIGTERM)
        try:
            stdout, stderr = process.communicate(timeout=10)
        except subprocess.TimeoutExpired:
            os.killpg(process.pid, signal.SIGKILL)
            stdout, stderr = process.communicate(timeout=10)
    (output / f"{name}.stdout.txt").write_bytes(stdout)
    (output / f"{name}.stderr.txt").write_bytes(stderr)
    group_absent = False
    deadline = time.monotonic() + 10
    while time.monotonic() < deadline:
        try:
            os.killpg(process.pid, 0)
            time.sleep(0.1)
        except ProcessLookupError:
            group_absent = True
            break
    row = {"name": name, "argv": arguments, "exit": process.returncode,
           "timedOut": timed_out, "leaderReaped": process.poll() is not None,
           "groupAbsent": group_absent, "seconds": time.monotonic() - started,
           "stdoutBytes": len(stdout), "stderrBytes": len(stderr),
           "stdoutSha256": hashlib.sha256(stdout).hexdigest(),
           "stderrSha256": hashlib.sha256(stderr).hexdigest()}
    receipt["commands"].append(row)
    print(json.dumps(row), flush=True)
    if process.returncode or timed_out or not group_absent:
        raise RuntimeError(f"{name} did not close successfully")

try:
    execute("versions", ["node", "--version"], 10)
    execute("tools", ["npm", "install", "--prefix", str(scratch / "tools"),
                      "--ignore-scripts", "--no-audit", "--no-fund",
                      "@vscode/test-electron@2.5.2", "@vscode/vsce@3.6.2"], 240)
    shutil.copyfile(scratch / "tools/package-lock.json", output / "tools-lock.json")
    execute("package", [str(scratch / "tools/node_modules/.bin/vsce"), "package",
                        "--no-dependencies", "--out", str(output / "contextlet-0.1.0.vsix")], 90)
    environment["NODE_PATH"] = str(scratch / "tools/node_modules")
    execute("host", ["xvfb-run", "-a", "node", "tests/scripts/run-host.cjs"], 360)
    results = json.loads((output / "host-result.json").read_text())
    if results["vscodeVersion"] != "1.95.3" or len(results["rows"]) != 4 or not all(row["passed"] for row in results["rows"]):
        raise RuntimeError("Native host result incomplete")
    archive = output / "contextlet-0.1.0.vsix"
    digest = hashlib.sha256(archive.read_bytes()).hexdigest()
    (output / "contextlet-0.1.0.vsix.sha256").write_text(f"{digest}  {archive.name}\n")
    receipt["package"] = {"bytes": archive.stat().st_size, "sha256": digest}
    receipt["passed"] = True
except Exception as error:
    receipt["error"] = repr(error)
finally:
    after = source_vector()
    (output / "source-after.json").write_text(json.dumps(after, indent=2))
    receipt["sourceUnchanged"] = before == after
    receipt["scratchBytes"] = sum(p.stat().st_size for p in scratch.rglob("*") if p.is_file() and not p.is_symlink())
    if scratch.stat().st_ino == identity and (scratch / "owner").read_text() == nonce and all(row["groupAbsent"] for row in receipt["commands"]):
        shutil.rmtree(scratch)
        receipt["cleanup"] = not scratch.exists()
    receipt["passed"] = receipt["passed"] and receipt["sourceUnchanged"] and receipt["cleanup"]
    (output / "receipt.json").write_text(json.dumps(receipt, indent=2))
    print(json.dumps(receipt), flush=True)
if not receipt["passed"]:
    raise SystemExit(1)
