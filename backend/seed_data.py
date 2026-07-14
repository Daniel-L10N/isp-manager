#!/usr/bin/env python3
import requests, json, datetime, calendar

BASE = "http://localhost:8000"
TOKEN = None

def api(method, path, data=None):
    global TOKEN
    h = {"Content-Type": "application/json"}
    if TOKEN:
        h["Authorization"] = f"Bearer {TOKEN}"
    r = requests.request(method, f"{BASE}{path}", headers=h, json=data)
    if r.status_code >= 400 and "auth/login" not in path:
        print(f"  ERROR {method} {path}: {r.status_code} {r.text}")
    return r.json()

# Login
resp = api("POST", "/api/auth/login", {"username": "admin", "password": "L10Nstad"})
TOKEN = resp["access_token"]
print("✓ Login OK")

# Update company info
api("PUT", "/api/settings/", {
    "company_name": "FibraYA Telecom",
    "company_address": "Av. Principal 123, Col. Centro",
    "company_phone": "555-123-4567",
    "company_email": "contacto@fibraya.mx",
    "currency": "MXN",
})
print("✓ Settings updated")

# Create plans
plans_data = [
    {"name": "Plan Básico", "speed": "10 Mbps", "monthly_price": 299.00, "description": "Velocidad ideal para navegación y redes sociales"},
    {"name": "Plan Estándar", "speed": "30 Mbps", "monthly_price": 399.00, "description": "Perfecto para streaming en HD y videollamadas"},
    {"name": "Plan Premium", "speed": "50 Mbps", "monthly_price": 549.00, "description": "Ideal para streaming 4K y gaming online"},
    {"name": "Plan Ultra", "speed": "100 Mbps", "monthly_price": 799.00, "description": "Máxima velocidad para hogares con múltiples dispositivos"},
    {"name": "Plan Empresarial", "speed": "200 Mbps", "monthly_price": 1299.00, "description": "Conexión dedicada para tu negocio con soporte prioritario"},
    {"name": "Plan Básico Anual", "speed": "10 Mbps", "monthly_price": 249.00, "description": "Plan Básico con descuento por pago anual"},
]
for pd in plans_data:
    api("POST", "/api/plans/", pd)
print("✓ 6 plans created")

# Create clients
clients = [
    {"name": "María García López", "contract_date": "2026-01-15", "plan_id": 3, "cutoff_day": 15, "phone": "555-1001", "address": "Calle Roble 45, Col. Del Valle", "email": "maria@email.com", "ine": "GALM860101"},
    {"name": "Carlos Rodríguez Méndez", "contract_date": "2026-02-01", "plan_id": 2, "cutoff_day": 10, "phone": "555-1002", "address": "Av. Insurgentes 500, Col. Roma", "email": "carlos@email.com", "ine": "ROMC750203"},
    {"name": "Ana Patricia Hernández", "contract_date": "2025-11-20", "plan_id": 1, "cutoff_day": 5, "phone": "555-1003", "address": "Privada Las Flores 12, Col. Jardines", "email": "ana@email.com", "ine": "HERA880304"},
    {"name": "Roberto Sánchez Vega", "contract_date": "2026-03-10", "plan_id": 4, "cutoff_day": 20, "phone": "555-1004", "address": "Boulevard del Sol 789, Col. Reforma", "email": "roberto@email.com"},
    {"name": "Laura Jiménez Ruiz", "contract_date": "2025-09-05", "plan_id": 2, "cutoff_day": 25, "phone": "555-1005", "address": "Calle Luna 234, Col. Condesa", "email": "laura@email.com", "ine": "JIRL920506"},
    {"name": "Miguel Ángel Torres", "contract_date": "2026-06-01", "plan_id": 5, "cutoff_day": 1, "phone": "555-1006", "address": "Av. Tecnológico 1000, Col. Industrial", "email": "miguel@empresa.com"},
    {"name": "Sofía Martínez Castillo", "contract_date": "2026-04-15", "plan_id": 3, "cutoff_day": 15, "phone": "555-1007", "address": "Calle Olivo 67, Col. Santa Fe", "email": "sofia@email.com"},
    {"name": "Jorge Luis Pérez", "contract_date": "2026-05-01", "plan_id": 1, "cutoff_day": 8, "phone": "555-1008", "address": "Fraccionamiento Los Pinos 890", "email": "jorge@email.com"},
    {"name": "Diana Flores González", "contract_date": "2025-12-01", "plan_id": 2, "cutoff_day": 12, "phone": "555-1009", "address": "Calle Roble 123, Col. Arboledas", "email": "diana@email.com", "status": "suspendido"},
    {"name": "Pedro Infante Cruz", "contract_date": "2026-03-20", "plan_id": 4, "cutoff_day": 18, "phone": "555-1010", "address": "Av. Siempre Viva 742", "email": "pedro@email.com"},
    {"name": "Gabriela Ortiz Nava", "contract_date": "2026-07-01", "plan_id": 3, "cutoff_day": 28, "phone": "555-1011", "address": "Calle Jazmín 456, Col. Primavera", "email": "gabriela@email.com", "status": "suspendido"},
    {"name": "Fernando López Torres", "contract_date": "2026-01-10", "plan_id": 2, "cutoff_day": 10, "phone": "555-1012", "address": "Calle Roble 789, Col. Residencial", "email": "fernando@email.com"},
]
client_ids = []
for cd in clients:
    r = api("POST", "/api/clients/", cd)
    client_ids.append(r["id"])
    print(f"  ✓ {r['client_id']} - {r['name']}")
print(f"✓ {len(clients)} clients created")

# Record payments
today = datetime.date.today()
current_month = today.month
current_year = today.year

payments = [
    (1, 549.00, 3),
    (1, 549.00, 6),
    (2, 399.00, 2),
    (3, 299.00, 1),
    (4, 799.00, 4),
    (5, 399.00, 5),
    (6, 1299.00, 6),
    (7, 549.00, 0),
    (8, 299.00, 0),
    (12, 399.00, 0),
]
for client_id, amount, months_ago in payments:
    pmt_date = today
    if months_ago > 0:
        m = current_month - months_ago
        y = current_year
        if m < 1:
            m += 12
            y -= 1
        last_day = calendar.monthrange(y, m)[1]
        day = min(15, last_day)
        pmt_date = datetime.date(y, m, day)
    api("POST", f"/api/clients/{client_id}/payments", {
        "date": pmt_date.isoformat(),
        "amount": amount,
        "method": "efectivo" if client_id % 2 == 0 else "transferencia",
    })
print(f"✓ {len(payments)} payments recorded")

# Cash movements
api("POST", "/api/cash/income", {
    "date": (today - datetime.timedelta(days=15)).isoformat(),
    "concept": "Venta de equipo WiFi (Router TP-Link)",
    "amount": 850.00,
    "notes": "Venta directa a cliente",
})
api("POST", "/api/cash/expense", {
    "date": (today - datetime.timedelta(days=5)).isoformat(),
    "concept": "Pago de renta del local",
    "amount": 8500.00,
    "notes": "Renta mensual julio 2026",
})
api("POST", "/api/cash/expense", {
    "date": (today - datetime.timedelta(days=3)).isoformat(),
    "concept": "Compra de materiales (fibra óptica)",
    "amount": 3200.00,
    "notes": "Rollos de fibra óptica para instalaciones",
})
api("POST", "/api/cash/expense", {
    "date": (today - datetime.timedelta(days=1)).isoformat(),
    "concept": "Pago de servicios (CFE + Internet)",
    "amount": 2100.00,
})
print("✓ 4 cash movements")

# Assets
assets = [
    {"name": "Router MikroTik CCR1036", "acquisition_date": "2025-06-15", "approximate_value": 28500.00, "status": "bueno", "description": "Router principal del núcleo de red"},
    {"name": "Switch Cisco Catalyst 3850", "acquisition_date": "2025-08-01", "approximate_value": 45000.00, "status": "bueno", "description": "Switch de capa 3 para distribución"},
    {"name": "Torre de Servidor Dell PowerEdge", "acquisition_date": "2025-04-10", "approximate_value": 62000.00, "status": "bueno", "description": "Servidor principal para sistemas internos"},
    {"name": "UPS APC 3000VA", "acquisition_date": "2025-05-20", "approximate_value": 8500.00, "status": "regular", "description": "Respaldo de energía para equipo de red"},
    {"name": "Camioneta Nissan NP300", "acquisition_date": "2025-03-01", "approximate_value": 285000.00, "status": "nuevo", "description": "Vehículo para instalaciones y mantenimiento"},
    {"name": "Kit de Herramientas Fibra Óptica", "acquisition_date": "2026-02-10", "approximate_value": 8500.00, "status": "nuevo", "description": "Equipo completo para fusiones y terminaciones"},
    {"name": "Laptop HP ProBook (2 unidades)", "acquisition_date": "2026-01-15", "approximate_value": 28000.00, "status": "bueno", "description": "Equipo de trabajo para técnicos de campo"},
    {"name": "Access Point UniFi U6 (x10)", "acquisition_date": "2026-06-01", "approximate_value": 15000.00, "status": "nuevo", "description": "Puntos de acceso WiFi 6 para clientes empresariales"},
]
for ad in assets:
    api("POST", "/api/assets/", ad)
print(f"✓ {len(assets)} assets created")

# Final summary
dash = api("GET", "/api/dashboard/")
print(f"""
╔══════════════════════════════════════════════╗
║         DATOS DE PRUEBA CARGADOS            ║
╠══════════════════════════════════════════════╣
║  Planes:         {len(plans_data):>2}                            ║
║  Clientes:       {dash['total_clients']:>2}                            ║
║  Activos:        {dash['active_clients']:>2}                            ║
║  Suspendidos:    {dash['suspended_clients']:>2}                           ║
║  Ingreso mensual: ${dash['monthly_income']:>8.2f}                ║
║  Fondos en caja: ${dash['cash_funds']:>8.2f}                ║
║  Valor bienes:   ${dash['total_assets']:>8.2f}                ║
╚══════════════════════════════════════════════╝

Accede desde tu celular: https://fibraya-server.curlew-vector.ts.net
Usuario: admin / Contraseña: L10Nstad
""")
