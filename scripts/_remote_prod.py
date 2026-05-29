#!/usr/bin/env python3
"""Deploy production systemd (system-level) on 192.168.100.10."""
import base64
import io
import os
import sys
import textwrap
import paramiko

HOST = "192.168.100.10"
USER = "server"
PASSWORD = os.environ.get("REMOTE_SSH_PASSWORD", sys.argv[1] if len(sys.argv) > 1 else "")
HOME = "/home/server"
PAIN = f"{HOME}/pain-farm"
CORE = f"{HOME}/Core-Swicht-V2"

ENV_LOCAL = """BACKEND_URL=http://127.0.0.1:8000
NEXT_PUBLIC_BOOT_RUN_MODE=main
"""

CORE_UNIT = textwrap.dedent(f"""\
    [Unit]
    Description=Core Swicht V2 API (Pain Farm backend)
    After=network-online.target
    Wants=network-online.target

    [Service]
    Type=simple
    User=server
    Group=server
    WorkingDirectory={CORE}
    ExecStart={CORE}/venv/bin/uvicorn main:app --host 127.0.0.1 --port 8000
    Restart=always
    RestartSec=5
    Environment=PYTHONUNBUFFERED=1

    [Install]
    WantedBy=multi-user.target
""")

PAIN_UNIT = textwrap.dedent(f"""\
    [Unit]
    Description=Pain Farm dashboard (Next.js production)
    After=network-online.target core-swicht.service
    Wants=core-swicht.service

    [Service]
    Type=simple
    User=server
    Group=server
    WorkingDirectory={PAIN}
    Environment=NODE_ENV=production
    Environment=BACKEND_URL=http://127.0.0.1:8000
    Environment=NEXT_PUBLIC_BOOT_RUN_MODE=main
    Environment=HOSTNAME=0.0.0.0
    Environment=PORT=3000
    ExecStart=/bin/bash -lc 'export NVM_DIR="{HOME}/.nvm"; . "{HOME}/.nvm/nvm.sh"; cd {PAIN} && npm run start'
    Restart=always
    RestartSec=8

    [Install]
    WantedBy=multi-user.target
""")


def run_bash(ssh, script: str, timeout: int = 600) -> tuple[int, str, str]:
    payload = base64.b64encode(script.encode()).decode()
    _, stdout, stderr = ssh.exec_command(f"echo {payload} | base64 -d | bash", timeout=timeout)
    out = stdout.read().decode(errors="replace")
    err = stderr.read().decode(errors="replace")
    return stdout.channel.recv_exit_status(), out, err


def sudo_write(ssh, path: str, content: str) -> None:
    sftp = ssh.open_sftp()
    tmp = f"/tmp/_unit_{os.path.basename(path)}"
    sftp.putfo(io.BytesIO(content.encode()), tmp)
    sftp.close()
    payload = base64.b64encode(f"cp {tmp} {path} && chmod 644 {path}".encode()).decode()
    cmd = f"echo '{PASSWORD}' | sudo -S bash -c \"echo {payload} | base64 -d | bash\""
    _, stdout, stderr = ssh.exec_command(cmd, timeout=30)
    stdout.channel.recv_exit_status()
    err = stderr.read().decode()
    if "error" in err.lower() and "password" not in err.lower():
        print("sudo write err:", err[-500:])


def step(title: str, code: int, out: str, err: str) -> None:
    print(f"\n{'='*60}\n{title} (exit {code})")
    if out.strip():
        print(out[-12000:] if len(out) > 12000 else out)
    if err.strip():
        print("ERR:", err[-4000:])


def main() -> int:
    if not PASSWORD:
        return 1

    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(HOST, username=USER, password=PASSWORD, timeout=25)
    print(f"Connected to {HOST}")

    sftp = ssh.open_sftp()
    sftp.putfo(io.BytesIO(ENV_LOCAL.encode()), f"{PAIN}/.env.local")
    sftp.close()

    sudo_write(ssh, "/etc/systemd/system/core-swicht.service", CORE_UNIT)
    sudo_write(ssh, "/etc/systemd/system/pain-farm.service", PAIN_UNIT)
    print("Uploaded .env.local and systemd units")

    deploy = f"""
set -e
export NVM_DIR="{HOME}/.nvm"
. "$NVM_DIR/nvm.sh"

# Stop user-level services if present (migrate to system)
systemctl --user stop pain-farm.service core-swicht.service 2>/dev/null || true
systemctl --user disable pain-farm.service core-swicht.service 2>/dev/null || true

# Kill stray dev on 3000
for pid in $(ss -tlnp 2>/dev/null | grep ':3000' | grep -oP 'pid=\\K[0-9]+' || true); do
  kill "$pid" 2>/dev/null || true
done

# Core deps
cd {CORE}
test -d venv || python3 -m venv venv
{CORE}/venv/bin/pip install -q -r requirements.txt
{CORE}/venv/bin/pip install -q 'uvicorn[standard]'

# Production build
cd {PAIN}
git pull --ff-only 2>/dev/null || true
export BACKEND_URL=http://127.0.0.1:8000
export NEXT_PUBLIC_BOOT_RUN_MODE=main
npm install --no-audit --no-fund 2>&1 | tail -5
npm run build 2>&1 | tail -25

echo "=== enable system services ==="
echo '{PASSWORD}' | sudo -S systemctl daemon-reload
echo '{PASSWORD}' | sudo -S systemctl enable core-swicht.service pain-farm.service
echo '{PASSWORD}' | sudo -S systemctl restart core-swicht.service
sleep 5
echo '{PASSWORD}' | sudo -S systemctl restart pain-farm.service
sleep 6

echo "=== status ==="
echo '{PASSWORD}' | sudo -S systemctl is-active core-swicht.service pain-farm.service
ss -tlnp | grep -E ':3000|:8000' || true
curl -sf http://127.0.0.1:8000/health; echo
curl -sf -o /dev/null -w 'pain=%{{http_code}}\\n' http://127.0.0.1:3000/
curl -sf http://127.0.0.1:3000/api/backend/heartbeat; echo

echo "=== journal (last lines) ==="
echo '{PASSWORD}' | sudo -S journalctl -u pain-farm.service -n 12 --no-pager
echo '{PASSWORD}' | sudo -S journalctl -u core-swicht.service -n 8 --no-pager
"""
    code, out, err = run_bash(ssh, deploy, timeout=900)
    step("DEPLOY", code, out, err)
    ssh.close()
    return 0 if code == 0 else code


if __name__ == "__main__":
    sys.exit(main())
