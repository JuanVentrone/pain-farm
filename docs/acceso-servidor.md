# Acceso al servidor (SSH y remoto)

Guía para el servidor definitivo de **Pain Farm** (panel Next.js + API Core Swicht en la misma red o accesible por VPN).

---

## 1. Claves SSH (recomendado)

Haz esto **en tu PC Windows** (PowerShell), no en el servidor.

### 1.1 Generar clave (una vez)

```powershell
ssh-keygen -t ed25519 -C "tu-email@ejemplo.com" -f "$env:USERPROFILE\.ssh\pain_farm_server"
```

- Pulsa Enter en la frase secreta (passphrase) o pon una si quieres más seguridad.
- Quedan dos archivos:
  - `pain_farm_server` → **privada** (nunca la subas a git ni la envíes por chat)
  - `pain_farm_server.pub` → **pública** (va al servidor)

### 1.2 Copiar la clave al servidor

Sustituye `IP` y `usuario` por los del servidor nuevo (ej. `server@192.168.1.150`):

```powershell
type $env:USERPROFILE\.ssh\pain_farm_server.pub | ssh usuario@IP "mkdir -p ~/.ssh && chmod 700 ~/.ssh && cat >> ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys"
```

La primera vez pedirá contraseña; después ya no (si todo está bien).

### 1.3 Configurar acceso rápido en tu PC

Crea o edita `C:\Users\TU_USUARIO\.ssh\config`:

```
Host pain-farm
    HostName 192.168.1.150
    User server
    IdentityFile ~/.ssh/pain_farm_server
    IdentitiesOnly yes
```

Conexión:

```powershell
ssh pain-farm
```

### 1.4 Endurecer SSH en el servidor (después de probar la clave)

En el servidor, **solo cuando `ssh pain-farm` entre sin contraseña**:

```bash
sudo nano /etc/ssh/sshd_config
```

Ajustes recomendados:

```
PubkeyAuthentication yes
PasswordAuthentication no
PermitRootLogin no
```

Reiniciar SSH:

```bash
sudo systemctl restart sshd
```

**Importante:** deja otra sesión SSH abierta mientras pruebas, por si algo falla.

---

## 2. Acceso desde la LAN (misma red)

| Servicio | Puerto | URL ejemplo |
|----------|--------|-------------|
| Panel Pain Farm (dev) | 3000 | `http://192.168.1.150:3000` |
| Panel (producción) | 3000 | `npm run build` + `npm run start` |
| API Core Swicht | 8000 | `http://192.168.1.150:8000` |

Firewall en el servidor (Ubuntu):

```bash
sudo ufw allow OpenSSH
sudo ufw allow 3000/tcp
sudo ufw allow 8000/tcp
sudo ufw enable
sudo ufw status
```

---

## 3. Acceso remoto (fuera de casa / otra red)

No expongas SSH o el panel a Internet solo con contraseña. Opciones ordenadas de más segura a menos:

### Opción A — VPN (recomendada)

- **Tailscale**, **WireGuard** o VPN del router.
- Tu PC y el servidor quedan en la misma red virtual; usas la IP de Tailscale y el mismo `ssh pain-farm`.

### Opción B — Túnel SSH (rápido para administrar)

Desde tu PC (con acceso previo al servidor por LAN o VPN):

```powershell
ssh -L 3000:127.0.0.1:3000 pain-farm
```

Luego abres en tu PC: `http://localhost:3000`

### Opción C — Puerto SSH/API en el router (solo si es imprescindible)

- Reenvío de puerto 22 → servidor (SSH).
- Cambia el puerto SSH por defecto, usa **solo claves**, fail2ban, IP allowlist si puedes.
- El panel (3000) no debería ir a Internet sin HTTPS y autenticación.

---

## 4. Checklist al mudar el servidor

1. [ ] Instalar **Node 20+** (nvm o paquete del sistema).
2. [ ] Clonar repo: `git clone …` en `/home/server/pain-farm` (o ruta acordada).
3. [ ] `npm install` **en el servidor** (no copiar `node_modules`).
4. [ ] `.env.local` con `BACKEND_URL` y modo (`NEXT_PUBLIC_BOOT_RUN_MODE`).
5. [ ] Claves SSH configuradas y probadas.
6. [ ] Firewall (22, 3000, 8000 según necesidad).
7. [ ] Proceso persistente: `pm2` o `systemd` para `npm run start` en producción.
8. [ ] Cambiar contraseñas que se hayan usado en chats o documentos.

### Node 20 + arranque (recordatorio)

```bash
export NVM_DIR="$HOME/.nvm" && . "$NVM_DIR/nvm.sh"
cd /home/server/pain-farm
rm -rf node_modules .next
npm install
npm run dev:test    # prueba
# producción:
npm run build
npm run start
```

---

## 5. Arranque automático (systemd usuario) — jvserver 192.168.1.150

En el host **jvserver** (`192.168.1.150`) el usuario SSH operativo es **`server`** (no `jvserver`: esa cuenta rechaza la clave/contraseña probada).

Rutas:

| Componente | Ruta |
|------------|------|
| Pain Farm | `/home/server/pain-farm` |
| Core Swicht V2 | `/home/server/Core-Swicht-V2` |

Unidades en `~/.config/systemd/user/` (plantillas en `deploy/systemd/`):

```bash
loginctl enable-linger "$(whoami)"
systemctl --user daemon-reload
systemctl --user enable core-swicht.service pain-farm.service
systemctl --user start core-swicht.service pain-farm.service
systemctl --user status core-swicht pain-farm
```

`.env.local` en pain-farm:

```
BACKEND_URL=http://127.0.0.1:8000
NEXT_PUBLIC_BOOT_RUN_MODE=main
```

Orden al boot: **API (8000) → panel (3000)**. La API puede tardar ~90 s en escuchar si `[VOLTAGE_PROTECTION] enabled = true` y no hay lectura RS485 al arranque.

Comprobación:

```bash
curl -s http://127.0.0.1:8000/health
curl -s http://127.0.0.1:3000/api/backend/heartbeat
```

Panel: **http://192.168.1.150:3000**

---

## 6. Producción con PM2 (opcional)

```bash
export NVM_DIR="$HOME/.nvm" && . "$NVM_DIR/nvm.sh"
cd /home/server/pain-farm
npm run build
npm install -g pm2
pm2 start npm --name pain-farm -- start
pm2 save
pm2 startup
```

---

## 7. Cursor / VS Code Remote SSH

1. Extensión **Remote - SSH**.
2. `Ctrl+Shift+P` → *Remote-SSH: Connect to Host* → `pain-farm`.
3. Abres la carpeta `/home/server/pain-farm` y trabajas como si fuera local.
