# ISP Manager

Sistema de Administración para Empresas de Internet (ISP).

**Stack:** FastAPI (backend) + Next.js 14 (frontend) + SQLite (base de datos) + Tailscale Funnel (acceso remoto)

---

## Requisitos

- **Python 3.11+** con `pip` y `venv`
- **Node.js 18+** con `npm`
- **systemd** (para servicios persistentes)
- **Tailscale** (para acceso remoto, opcional)

---

## Instalación y despliegue paso a paso

### 1. Clonar el repositorio

```bash
git clone https://github.com/daniel-l10n/isp-manager.git
cd isp-manager
```

### 2. Configurar backend

```bash
cd backend

# Crear entorno virtual e instalar dependencias
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Regresar a raíz
cd ..
```

### 3. Configurar frontend

```bash
cd frontend
npm install
cd ..
```

### 4. Iniciar servidores

**Opción A — Desarrollo (con recarga automática):**

```bash
# Terminal 1: Backend
cd backend && source venv/bin/activate && uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Terminal 2: Frontend
cd frontend && npm run dev
```

**Opción B — Producción (servicios systemd):**

```bash
# Backend
cp isp-manager-backend.service /etc/systemd/system/
systemctl daemon-reload
systemctl enable --now isp-manager-backend

# Frontend (construir primero)
cd frontend && npm run build && cd ..
cp isp-manager-frontend.service /etc/systemd/system/
systemctl enable --now isp-manager-frontend
```

### 5. Acceso local

| Servicio        | URL                          |
|-----------------|------------------------------|
| Frontend        | http://localhost:3000        |
| Backend (API)   | http://localhost:8000        |
| Documentación   | http://localhost:8000/docs   |

Credenciales por defecto: **admin / L10Nstad**

### 6. (Opcional) Acceso remoto con Tailscale Funnel

```bash
# Instalar Tailscale
curl -fsSL https://tailscale.com/install.sh | sh
sudo tailscale up

# Exponer con nginx + Funnel
apt install nginx
cp etc-nginx-sites-available-isp-manager /etc/nginx/sites-available/isp-manager
ln -s /etc/nginx/sites-available/isp-manager /etc/nginx/sites-enabled/
systemctl restart nginx

tailscale funnel --bg 8080
```

La app quedará accesible en: `https://<hostname>.<tailnet-name>.ts.net`

### 7. Poblado de datos de prueba (opcional)

```bash
cd backend
source venv/bin/activate
python3 seed_data.py
```

Esto crea 6 planes, 12 clientes, 10 pagos, 8 bienes y movimientos de caja.

---

## Estructura del proyecto

```
isp-manager/
├── backend/
│   ├── app/
│   │   ├── main.py             # Punto de entrada FastAPI
│   │   ├── database.py         # Configuración SQLite + SQLAlchemy
│   │   ├── models.py           # Modelos de base de datos
│   │   ├── schemas.py          # Esquemas Pydantic
│   │   ├── auth.py             # Autenticación JWT
│   │   └── routes/
│   │       ├── auth.py         # Login
│   │       ├── dashboard.py    # Dashboard
│   │       ├── clients.py      # CRUD clientes + pagos
│   │       ├── plans.py        # CRUD planes
│   │       ├── assets.py       # CRUD bienes
│   │       ├── cash.py         # Caja (ingresos/egresos)
│   │       ├── history.py      # Historial
│   │       └── settings.py     # Configuración empresa
│   ├── requirements.txt
│   └── seed_data.py            # Datos de prueba
├── frontend/
│   ├── app/
│   │   ├── page.tsx            # Página raíz (redirección)
│   │   ├── layout.tsx          # Layout principal
│   │   ├── login/              # Login
│   │   ├── dashboard/          # Dashboard
│   │   ├── clients/            # Lista y detalle clientes
│   │   ├── plans/              # Planes
│   │   ├── assets/             # Bienes
│   │   ├── cash/               # Caja
│   │   ├── history/            # Historial
│   │   └── settings/           # Configuración
│   ├── components/
│   │   ├── Layout.tsx          # Layout con sidebar
│   │   └── Sidebar.tsx         # Barra lateral navegación
│   ├── context/
│   │   └── AuthContext.tsx     # Contexto de autenticación
│   └── lib/
│       └── api.ts              # Cliente API
├── package.json                # Scripts raíz
├── start.sh                    # Inicio rápido
└── README.md
```

---

## Arquitectura de red (producción)

```
Cliente (navegador)
    ↕ HTTPS
Tailscale Funnel (:443)
    ↕ HTTP
nginx (:8080)
    ├── /api/* → FastAPI (:8000)
    └── /*     → Next.js  (:3000)
```

## Variables de entorno

| Variable               | Defecto            | Descripción                     |
|------------------------|--------------------|---------------------------------|
| `NEXT_PUBLIC_API_URL`  | (mismo origen)     | URL base para API del frontend  |
| `JWT_SECRET_KEY`       | (hardcoded)        | Clave secreta para JWT          |

> En producción, cambia `SECRET_KEY` en `backend/app/auth.py` por una variable de entorno.

---

## Licencia

Uso interno.
