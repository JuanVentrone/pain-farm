#!/usr/bin/env python3
"""Deploy Core Swicht + Pain Farm on remote server."""
import base64
import os
import sys
import io
import paramiko

HOST = "192.168.1.150"
PASSWORD = os.environ.get("REMOTE_SSH_PASSWORD", sys.argv[1] if len(sys.argv) > 1 else "")
USER = os.environ.get("REMOTE_SSH_USER", "jvserver")
HOME = "/home/server"
PAIN = f"{HOME}/pain-farm"
CORE = f"{HOME}/Core-Swicht-V2"

ENV_LOCAL = """BACKEND_URL=http://127.0.0.1:8000
NEXT_PUBLIC_BOOT_RUN_MODE=main
"""

CORE_UNIT = f"""[Unit]
Description=Core Swicht V2 API (Pain Farm backend)
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
WorkingDirectory={CORE}
ExecStart={CORE}/venv/bin/uvicorn main:app --host 127.0.0.1 --port 8000
Restart=on-failure
RestartSec=5
Environment=PYTHONUNBUFFERED=1

[Install]
WantedBy=default.target
"""

PAIN_UNIT = f"""[Unit]
Description=Pain Farm dashboard (Next.js)
After=network-online.target core-swicht.service
Wants=core-swicht.service

[Service]
Type=simple
WorkingDirectory={PAIN}
Environment=NODE_ENV=production
Environment=BACKEND_URL=http://127.0.0.1:8000
Environment=NEXT_PUBLIC_BOOT_RUN_MODE=main
Environment=HOSTNAME=0.0.0.0
Environment=PORT=3000
ExecStart=/bin/bash -lc 'export NVM_DIR="$HOME/.nvm"; . "$NVM_DIR/nvm.sh"; cd {PAIN} && npm run start'
Restart=on-failure
RestartSec=8

[Install]
WantedBy=default.target
"""


def run(ssh, cmd: str, timeout: int = 600) -> tuple[int, str, str]:
    _, stdout, stderr = ssh.exec_command(cmd, timeout=timeout)
    out = stdout.read().decode(errors="replace")
    err = stderr.read().decode(errors="replace")
    code = stdout.channel.recv_exit_status()
    return code, out, err


def run_bash(ssh, script: str, timeout: int = 600) -> tuple[int, str, str]:
    payload = base64.b64encode(script.encode()).decode()
    return run(ssh, f"echo {payload} | base64 -d | bash", timeout=timeout)


def upload_text(sftp, path: str, content: str) -> None:
    sftp.putfo(io.BytesIO(content.encode()), path)


def connect() -> paramiko.SSHClient:
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    try:
        ssh.connect(HOST, username=USER, password=PASSWORD, timeout=25)
        print(f"Connected as {USER}")
    except Exception:
        print(f"Connect as {USER} failed; using server")
        ssh.connect(HOST, username="server", password=PASSWORD, timeout=25)
        print("Connected as server")
    return ssh


def main() -> int:
    if not PASSWORD:
        print("Set REMOTE_SSH_PASSWORD", file=sys.stderr)
        return 1

    ssh = connect()
    sftp = ssh.open_sftp()
    try:
        sftp.mkdir(f"{HOME}/.config", mode=0o755)
    except OSError:
        pass
    try:
        sftp.mkdir(f"{HOME}/.config/systemd", mode=0o755)
    except OSError:
        pass
    try:
        sftp.mkdir(f"{HOME}/.config/systemd/user", mode=0o755)
    except OSError:
        pass

    upload_text(sftp, f"{PAIN}/.env.local", ENV_LOCAL)
    upload_text(sftp, f"{HOME}/.config/systemd/user/core-swicht.service", CORE_UNIT)
    upload_text(sftp, f"{HOME}/.config/systemd/user/pain-farm.service", PAIN_UNIT)
    sftp.close()
    print("Uploaded .env.local and systemd units")

    nvm = 'export NVM_DIR="$HOME/.nvm"; . "$NVM_DIR/nvm.sh" 2>/dev/null'
    steps = [
        ("env", f"cat {PAIN}/.env.local"),
        ("core-venv", f"""
cd {CORE}
test -d venv || python3 -m venv venv
{CORE}/venv/bin/pip install -q -r requirements.txt
{CORE}/venv/bin/pip install -q 'uvicorn[standard]'
"""),
        ("kill-3000", """
for pid in $(ss -tlnp 2>/dev/null | grep ':3000' | grep -oP 'pid=\\K[0-9]+' || true); do
  kill "$pid" 2>/dev/null || true
done
sleep 1
"""),
        ("build", f"""
{nvm}
cd {PAIN}
export BACKEND_URL=http://127.0.0.1:8000
export NEXT_PUBLIC_BOOT_RUN_MODE=main
npm run build
"""),
        ("systemd", """
systemctl --user daemon-reload
loginctl enable-linger "$(whoami)" 2>/dev/null || true
systemctl --user enable core-swicht.service pain-farm.service
systemctl --user restart core-swicht.service
sleep 4
systemctl --user restart pain-farm.service
sleep 5
"""),
        ("verify", """
systemctl --user is-active core-swicht.service pain-farm.service || true
ss -tlnp | grep -E ':3000|:8000' || true
curl -sf http://127.0.0.1:8000/health; echo
curl -sf http://127.0.0.1:8000/heartbeat; echo
curl -sf http://127.0.0.1:3000/api/backend/heartbeat; echo
journalctl --user -u core-swicht.service -n 20 --no-pager 2>/dev/null || true
echo '---'
journalctl --user -u pain-farm.service -n 20 --no-pager 2>/dev/null || true
systemctl --user status core-swicht.service --no-pager -l 2>&1 | head -20
systemctl --user status pain-farm.service --no-pager -l 2>&1 | head -20
"""),
    ]

    last_code = 0
    for name, body in steps:
        code, out, err = run_bash(ssh, body, timeout=900 if name == "build" else 120)
        print(f"\n=== {name} (exit {code}) ===")
        if out:
            print(out[-12000:] if len(out) > 12000 else out)
        if err:
            print("ERR:", err[-3000:])
        if code != 0 and name in ("core-venv", "build", "systemd"):
            last_code = code
            if name == "build":
                break

    ssh.close()
    return last_code


if __name__ == "__main__":
    sys.exit(main())
