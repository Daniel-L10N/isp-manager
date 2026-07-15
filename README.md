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

## ⚠️ ADVERTENCIA: Lo que NO debe modificarse

Este documento describe las piezas críticas del sistema. Modificarlas sin cuidado **rompe la aplicación**.

### Frontend (`frontend/lib/api.ts`)

| Línea / función | Por qué NO tocarlo |
|---|---|
| `const API_BASE = '';` | Debe estar **vacío** para que las llamadas vayan al mismo origen (nginx proxy). Si se cambia a `http://localhost:8000`, el celular intentará conectarse a sí mismo y fallará. |
| `cache: 'no-cache'` en `fetch()` | Evita que el navegador use respuestas viejas. Si se quita, pueden aparecer datos desactualizados. |
| `credentials: 'same-origin'` | Envía cookies/credenciales solo al mismo origen. Cambiarlo puede causar errores de autenticación. |
| Solo enviar `Content-Type: application/json` cuando hay body | Ponerlo en GET requests puede hacer que algunos proxies rechacen la petición. |

### Backend (`backend/requirements.txt`)

| Paquete | Por qué la versión es crítica |
|---|---|
| `bcrypt==4.0.1` | Versiones 5.x rompen la compatibilidad con `passlib`. No actualizar. |
| `passlib[bcrypt]` | No cambiar a otra versión sin probar que el hash de contraseñas siga funcionando. |

Si se necesita actualizar, **probar en un entorno aparte primero**.

### nginx (`/etc/nginx/sites-available/isp-manager`)

| Directiva | Por qué NO tocarlo |
|---|---|
| `proxy_pass http://backend_isp;` en `/api/` | Debe apuntar al backend en puerto 8000. |
| `proxy_pass http://frontend_isp;` en `/` | Debe apuntar al frontend en puerto 3000. |
| `proxy_set_header Authorization $http_authorization;` | Sin esto, el backend no recibe el token JWT y todas las peticiones autenticadas fallan. |
| `proxy_next_upstream` | Permite reintentar si el backend se está reiniciando. Sin esto, cualquier reinicio genera 502. |

### Tailscale Funnel

```bash
tailscale funnel --bg 8080
```

El funnel debe apuntar **siempre al puerto 8080** (nginx), no al 3000 (Next.js) ni al 8000 (FastAPI). Si se apunta directo a Next.js, las llamadas a la API fallarán porque Next.js no sirve `/api/*`.

### Servicios systemd

- **No agregar `Requires=` entre servicios.** Si el backend y frontend están vinculados, al reiniciar uno se cae el otro y no se levanta solo.
- Los tres servicios deben ser independientes:
  - `isp-manager-backend.service` → puerto 8000
  - `isp-manager-frontend.service` → puerto 3000
  - nginx → puerto 8080 (ya viene con el sistema)

### Base de datos

La DB se crea automáticamente al iniciar el backend. Si se borra el archivo `backend/isp_manager.db`, **se pierden todos los datos** pero el sistema la recrea vacía sin problema.

---

## SSH remoto vía Tailscale

Desde cualquier dispositivo en tu tailnet (celular, laptop, etc.) puedes conectarte por SSH a este servidor:

```bash
ssh root@100.100.174.98
```

O usando el nombre del host:

```bash
ssh root@fibraya-server
```

Te pedirá la **contraseña del usuario root** del servidor.

### Seguridad

- El puerto SSH (22) **solo acepta conexiones desde la red de Tailscale** (100.64.0.0/10).
- Intentar SSH desde la IP pública del servidor (187.188.11.68) **será bloqueado**.
- Si pierdes acceso a Tailscale, necesitas acceder físicamente al servidor o por consola VPS.

### Cambiar contraseña de root (si no la sabes)

```bash
passwd root
```

Elige una contraseña segura y guárdala en un lugar seguro.

---

## Licencia

Uso interno.
