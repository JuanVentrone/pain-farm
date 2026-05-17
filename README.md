# Pain Farm — Panel de monitoreo industrial

Frontend web para **monitoreo y control** de instalaciones industriales (contactores, alarmas, voltaje trifásico y consumo). Se conecta a la API **Core Swicht V2** (FastAPI) y ofrece un modo de **simulación** independiente para desarrollo y pruebas sin hardware.

---

## Características

- **Dashboard en tiempo real** con actualización cada **1 segundo** (voltajes, gráficos de consumo y temperatura).
- **Control de contactores** C1, C2, C3 y **interruptor general** (encendido secuencial vía backend en modo producción).
- **Alarmas:** luces y bocina con breadcrumbs en la barra superior.
- **Voltaje trifásico (L1, L2, L3)** desde RS485 con **colores dinámicos** según umbrales configurables.
- **Gráficos** de consumo (kW total y por fase) y temperatura (simulada hasta conectar sensores).
- **Modal de confirmación** antes de cualquier acción de encendido/apagado.
- **Tema oscuro** estilo Monokai, diseño **responsivo** (escritorio y móvil).
- **Internacionalización** español / inglés (selector ES | EN en la barra).
- **Dos modos de arranque** separados (no conmutables en pantalla): **Main** (API real) y **Test** (simulación local).

---

## Stack tecnológico

| Tecnología | Uso |
|------------|-----|
| [Next.js 15](https://nextjs.org/) (App Router) | Framework React, SSR parcial, proxy API |
| [TypeScript](https://www.typescriptlang.org/) | Tipado estático |
| [Tailwind CSS 4](https://tailwindcss.com/) | Estilos utilitarios |
| [Recharts](https://recharts.org/) | Gráficos lineales / áreas (carga solo en cliente) |
| [Turbopack](https://turbo.build/pack) | Bundler en desarrollo |

---

## Requisitos previos

- **Node.js** 18+ (recomendado 20+)
- **npm** 9+
- Para **modo Main:** API **Core Swicht V2** en ejecución (por defecto `http://127.0.0.1:8000`)

---

## Instalación

```bash
cd "D:\Repositorios\Pain Farm"
npm install
```

Copia las variables de entorno:

```bash
copy .env.local.example .env.local
```

Edita `.env.local` si tu backend no está en `http://127.0.0.1:8000`.

---

## Modos de arranque (Main vs Test)

El modo **no se cambia desde la interfaz**. Se define **al iniciar** el servidor de Next.js y requiere **detener el proceso** y volver a lanzar el script correspondiente.

| Comando | Modo | Comportamiento |
|---------|------|----------------|
| `npm run dev` | **Main** | Consulta Core Swicht V2. Sin datos → **N/A**. Los switches llaman a la API. |
| `npm run dev:test` | **Test** | Datos **simulados** (voltaje, kW, temperatura). Los botones solo actualizan el **estado local** tras confirmar (sin llamadas API). |

Variable de entorno (inyectada por los scripts anteriores):

```env
NEXT_PUBLIC_BOOT_RUN_MODE=main   # npm run dev
NEXT_PUBLIC_BOOT_RUN_MODE=test   # npm run dev:test
```

En producción (`npm run build` + `npm start`), el modo depende de cómo definas `NEXT_PUBLIC_BOOT_RUN_MODE` en el entorno de despliegue.

---

## Scripts npm

| Script | Descripción |
|--------|-------------|
| `npm run dev` | Desarrollo en **Main** (Turbopack, puerto 3000) |
| `npm run dev:test` | Desarrollo en **Test** (simulación) |
| `npm run build` | Build de producción |
| `npm run start` | Servidor de producción (tras `build`) |
| `npm run lint` | ESLint (Next.js) |

URL local habitual: **http://localhost:3000**

---

## Variables de entorno

| Variable | Descripción | Por defecto |
|----------|-------------|-------------|
| `BACKEND_URL` | URL base de FastAPI (Core Swicht V2) | `http://127.0.0.1:8000` |
| `NEXT_PUBLIC_BOOT_RUN_MODE` | `test` o `main` (solo al arrancar) | `main` si no es `test` |

El cliente no llama al backend directamente: usa el **proxy** de Next.js en `/api/backend/*` (ver `next.config.ts`), lo que evita problemas de CORS en desarrollo.

---

## Integración con Core Swicht V2

Repositorio de referencia del backend:

- Local: `D:\Repositorios\Core Swicht V2`
- Remoto: [Core-Swicht-V2](https://github.com/JuanVentrone/Core-Swicht-V2)

### Endpoints utilizados por el frontend

| Método | Ruta | Uso en el panel |
|--------|------|-----------------|
| `GET` | `/status/general` | Estado ON/OFF de C1, C2, C3 |
| `GET` | `/metrics/power` | Voltajes, corrientes, potencia kW, frecuencia |
| `GET` | `/heartbeat` | Estado RS485 / multímetro |
| `GET` | `/devices/status` | Salud de dispositivos (disponible en cliente) |
| `POST` | `/switch/general` | Interruptor general (`{ "estado": true\|false }`) |
| `POST` | `/switch/C1` … `/switch/C3` | Contactores individuales |
| `POST` | `/switch/luces` | Luces de alarma |
| `POST` | `/switch/bocina` | Bocina |

Cuerpo típico de los POST de switch:

```json
{ "estado": true }
```

### Arrancar el backend (ejemplo)

Desde la carpeta de Core Swicht V2 (con entorno Python y dependencias instaladas):

```bash
uvicorn main:app --host 0.0.0.0 --port 8000
```

Sin backend en Main verás avisos de conexión y valores **N/A** en métricas; el proxy puede registrar `ECONNREFUSED` en la consola de Next.

---

## Interfaz de usuario

### Barra de navegación

- **General ON/OFF** — verde si C1+C2+C3 activos; rojo si no.
- **Pills C1, C2, C3** — reflejan estado (en Main: desde API; en Test: estado local).
- **Breadcrumbs alarmas:** Luces y Bocina (activo/inactivo).
- **Idioma:** ES | EN.

### Cuerpo principal

1. **Contactores C1, C2, C3** — tarjetas grandes con estado activo/inactivo (o N/A en Main sin API).
2. **Voltaje trifásico** — L1, L2, L3 con etiqueta de rango (óptimo / precaución / alerta).
3. **Gráfico consumo (kW)** — total en el título + series por fase.
4. **Gráfico temperatura (°C)** — simulado en Test; en Main depende de datos de potencia para el eje temporal (sensor físico pendiente).

### Umbrales de voltaje (colores)

| Rango | Color | Etiqueta |
|-------|-------|----------|
| 235 V – 245 V | Verde | Óptimo |
| 220 V – 234 V o 246 V – 255 V | Naranja | Precaución |
| &lt; 220 V o &gt; 255 V | Rojo | Alerta |

Lógica en `lib/voltage-color.ts`.

### Confirmaciones

Cualquier clic en General, C1–C3, Luces o Bocina abre un **modal** con mensaje del tipo: *«¿Estás seguro de que quieres encender/apagar …?»*

---

## Estructura del proyecto

```
Pain Farm/
├── app/
│   ├── globals.css          # Tokens Monokai + Tailwind
│   ├── layout.tsx           # Layout raíz + LocaleProvider
│   └── page.tsx             # Entrada → Dashboard
├── components/
│   ├── dashboard/
│   │   ├── dashboard.tsx    # Estado, polling, modos test/main
│   │   ├── industrial-navbar.tsx
│   │   ├── contactor-controls.tsx
│   │   ├── voltage-panel.tsx
│   │   ├── voltage-phase-card.tsx
│   │   ├── consumption-chart.tsx
│   │   └── temperature-chart.tsx
│   └── ui/
│       └── confirm-modal.tsx
├── lib/
│   ├── api.ts               # Cliente HTTP → /api/backend
│   ├── types.ts             # Tipos alineados con schemas.py
│   ├── i18n.tsx             # Traducciones ES/EN
│   ├── run-mode.ts          # getBootRunMode()
│   └── voltage-color.ts     # Umbrales de color
├── next.config.ts           # Rewrites al backend
├── package.json
├── .env.local.example
└── README.md
```

---

## Internacionalización

- Archivo central: `lib/i18n.tsx`
- Claves de traducción para nav, contactores, voltaje, gráficos, errores y confirmaciones.
- Preferencia de idioma en `localStorage` (`pain-farm-locale`).

---

## Notas de desarrollo

- **Recharts** se carga con `next/dynamic` y `ssr: false` para evitar errores 500 en el render del servidor (`ResponsiveContainer`).
- En **Test**, la temperatura y parte del consumo son **simulados** cada segundo; la estructura está lista para datos reales.
- En **Main**, luces y bocina usan estado **optimista** tras un POST correcto (no hay GET dedicado de alarmas en la API actual).
- Si `npm run build` falla en Windows con errores `ENOENT` en `.next`, borra la carpeta `.next` y vuelve a construir.

---

## Licencia y autoría

Proyecto privado (`"private": true` en `package.json`). Uso interno / farm industrial asociado a **Pain Farm** y **Core Swicht V2**.

---

## Resumen rápido

```bash
# Solo UI simulada (sin API)
npm run dev:test

# Panel contra Core Swicht (API en :8000)
npm run dev
```

Abre **http://localhost:3000** y confirma acciones críticas en el modal antes de conmutar equipos reales en modo **Main**.
