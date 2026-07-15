"""
Seed script for comprehensive test database.
Creates realistic test data for ISP Manager.
"""
import sys
sys.path.insert(0, "/root/isp-manager/backend")

from datetime import datetime, date, timedelta
from app.database import engine, SessionLocal, Base
from app.models import User, Plan, Client, Payment, Asset, CashMovement, History, Setting
from app.auth import hash_password

# Reset database
Base.metadata.drop_all(bind=engine)
Base.metadata.create_all(bind=engine)

db = SessionLocal()

try:
    # ===== USER =====
    user = User(username="admin", hashed_password=hash_password("L10Nstad"), is_active=True)
    db.add(user)
    db.commit()
    print("✅ User created")

    # ===== PLANS (5 plans) =====
    plans_data = [
        ("Plan Básico", "10M/5M", 199.00, "Internet básico para navegación ligera"),
        ("Plan Vecino", "30M/30M", 299.00, "Internet para uso doméstico moderado"),
        ("Plan Familiar", "50M/50M", 449.00, "Internet para familia con streaming"),
        ("Plan Premium", "100M/100M", 699.00, "Internet de alta velocidad"),
        ("Plan Empresa", "200M/200M", 1299.00, "Internet empresarial dedicado"),
    ]
    plans = []
    for name, speed, price, desc in plans_data:
        p = Plan(name=name, speed=speed, monthly_price=price, description=desc, is_active=True)
        db.add(p)
        plans.append(p)
    db.commit()
    for p in plans:
        db.refresh(p)
    print(f"✅ {len(plans)} plans created")

    # ===== CLIENTS (12 clients - various statuses) =====
    clients_data = [
        # (name, ine, address, phone, email, contract_date, cutoff_day, plan_idx, status, notes)
        ("María García López", "1234567890123", "Calle Morelos 123, Col. Centro", "5551234567", "maria@gmail.com", "2025-01-15", 15, 0, "activo", "Cliente fiel, siempre paga a tiempo"),
        ("Juan Pérez Ramírez", "2345678901234", "Av. Reforma 456, Col. Norte", "5552345678", "juan@gmail.com", "2025-03-10", 10, 1, "activo", ""),
        ("Ana Martínez Sosa", "3456789012345", "Calle Hidalgo 789, Col. Sur", "5553456789", "ana@gmail.com", "2025-06-20", 20, 2, "activo", "Instalación en azotea"),
        ("Carlos López Díaz", "4567890123456", "Blvd. Independencia 321, Col. Este", "5554567890", "carlos@gmail.com", "2025-09-05", 5, 3, "activo", ""),
        ("Laura Hernández Vega", "5678901234567", "Calle Juárez 654, Col. Oeste", "5555678901", "laura@gmail.com", "2025-11-12", 12, 1, "activo", ""),
        ("Roberto Sánchez Ruiz", "6789012345678", "Av. Universidad 987, Col. Centro", "5556789012", "roberto@gmail.com", "2026-01-08", 8, 2, "activo", ""),
        ("Patricia Flores Gómez", "7890123456789", "Calle Morelos 147, Col. Norte", "5557890123", "patricia@gmail.com", "2026-02-14", 14, 0, "suspendido", "No pagó enero y febrero"),
        ("Miguel Torres Castillo", "8901234567890", "Blvd. López Mateos 258, Col. Sur", "5558901234", "miguel@gmail.com", "2026-03-20", 20, 3, "activo", ""),
        ("Elena Vargas Mendoza", "9012345678901", "Av. Juárez 369, Col. Este", "5559012345", "elena@gmail.com", "2026-04-01", 1, 4, "activo", "Cliente empresarial"),
        ("Francisco Morales Reyes", "0123456789012", "Calle Hidalgo 741, Col. Centro", "5550123456", "francisco@gmail.com", "2026-05-15", 15, 1, "activo", ""),
        ("Isabel Cruz Jiménez", "1112223334445", "Av. Insurgentes 852, Col. Norte", "5551112222", "isabel@gmail.com", "2026-06-10", 10, 2, "activo", ""),
        ("Pedro Ramírez Luna", "2223334445556", "Blvd. Ávila Camacho 963, Col. Oeste", "5553334444", "pedro@gmail.com", "2024-12-01", 25, 0, "cancelado", "Se mudó a otra ciudad"),
    ]
    
    clients = []
    for name, ine, addr, phone, email, cdate, cutoff, pidx, status, notes in clients_data:
        plan = plans[pidx]
        contract_date = date.fromisoformat(cdate)
        annual_cost = 12 * plan.monthly_price
        c = Client(
            client_id=f"CLI-{len(clients)+1:04d}",
            name=name, ine=ine, address=addr, phone=phone, email=email,
            contract_date=contract_date, service_start_date=contract_date,
            cutoff_day=cutoff, plan_id=plan.id,
            monthly_cost=plan.monthly_price, annual_cost=annual_cost,
            status=status, notes=notes, is_active=(status != "cancelado"),
        )
        db.add(c)
        clients.append(c)
    db.commit()
    for c in clients:
        db.refresh(c)
    print(f"✅ {len(clients)} clients created")

    # ===== PAYMENTS (15 payments across months) =====
    payments_data = [
        # (client_idx, date, amount, method, status, notes)
        (0, "2025-01-15", 199.00, "efectivo", "pagado", "Pago mensual enero"),
        (0, "2025-02-15", 199.00, "transferencia", "pagado", "Transferencia bancaria"),
        (0, "2025-03-15", 199.00, "efectivo", "pagado", ""),
        (1, "2025-03-10", 299.00, "efectivo", "pagado", "Primer pago"),
        (1, "2025-04-10", 299.00, "tarjeta", "pagado", "Pago con tarjeta"),
        (2, "2025-06-20", 449.00, "efectivo", "pagado", "Instalación + primer mes"),
        (2, "2025-07-20", 449.00, "transferencia", "pagado", ""),
        (3, "2025-09-05", 699.00, "efectivo", "pagado", ""),
        (3, "2025-10-05", 699.00, "transferencia", "pagado", ""),
        (3, "2025-11-05", 699.00, "efectivo", "pagado", ""),
        (4, "2025-11-12", 299.00, "efectivo", "pagado", ""),
        (5, "2026-01-08", 449.00, "transferencia", "pagado", ""),
        (5, "2026-02-08", 449.00, "efectivo", "pagado", ""),
        (7, "2026-03-20", 699.00, "efectivo", "pagado", ""),
        (8, "2026-04-01", 1299.00, "transferencia", "pagado", "Cliente empresarial - pago anual parcial"),
        (8, "2026-05-01", 1299.00, "transferencia", "pagado", ""),
        (8, "2026-06-01", 1299.00, "transferencia", "pagado", ""),
        (8, "2026-07-01", 1299.00, "transferencia", "pagado", ""),
        (9, "2026-05-15", 299.00, "efectivo", "pagado", ""),
        (9, "2026-06-15", 299.00, "tarjeta", "pagado", ""),
        (9, "2026-07-14", 299.00, "efectivo", "pagado", "Pago julio"),
        (10, "2026-06-10", 449.00, "efectivo", "pagado", ""),
        (10, "2026-07-10", 449.00, "transferencia", "pagado", ""),
        (0, "2026-07-15", 199.00, "efectivo", "pagado", "Pago julio"),
        (1, "2026-07-10", 299.00, "efectivo", "pagado", "Pago julio"),
    ]
    
    for cidx, pdate, amount, method, status, notes in payments_data:
        payment = Payment(
            client_id=clients[cidx].id,
            date=date.fromisoformat(pdate),
            amount=amount, method=method, status=status, notes=notes,
        )
        db.add(payment)
    db.commit()
    print(f"✅ {len(payments_data)} payments created")

    # ===== ASSETS (6 assets) =====
    assets_data = [
        ("Router MikroTik hEX", "Router principal para distribución", "2024-06-15", 2800.00, "bueno", "Activo en oficina principal"),
        ("Switch TP-Link 24 puertos", "Switch gestionable para red interna", "2024-06-15", 3500.00, "bueno", ""),
        ("Antena Ubiquiti LiteBeam 5AC", "Antena punto a punto para clientes", "2024-08-20", 4200.00, "bueno", "3 unidades en inventario"),
        ("UPS APC 1500VA", "No-break para equipo de red", "2024-06-15", 3200.00, "regular", "Batería mostrando desgaste"),
        ("Laptop Dell Latitude", "Equipo de administración", "2025-01-10", 15000.00, "bueno", ""),
        ("Camioneta Hilux 2022", "Vehículo de servicio para instalaciones", "2024-03-01", 350000.00, "bueno", "35,000 km recorridos"),
    ]
    
    assets = []
    for name, desc, aqdate, value, status, notes in assets_data:
        a = Asset(
            name=name, description=desc,
            acquisition_date=date.fromisoformat(aqdate),
            approximate_value=value, status=status, notes=notes, is_active=True,
        )
        db.add(a)
        assets.append(a)
    db.commit()
    print(f"✅ {len(assets)} assets created")

    # ===== CASH MOVEMENTS (8 movements) =====
    movements_data = [
        ("2025-01-15", "ingreso", "Capital inicial - aportación del dueño", 10000.00, ""),
        ("2025-06-01", "ingreso", "Venta de antena Ubiquiti a cliente externo", 5500.00, ""),
        ("2025-08-15", "egreso", "Compra de material de instalación (cable, conectores)", 2500.00, ""),
        ("2025-12-20", "egreso", "Pago de renta oficina diciembre", 3500.00, ""),
        ("2026-01-10", "egreso", "Mantenimiento preventivo equipo de red", 800.00, ""),
        ("2026-03-15", "ingreso", "Reembolso de garantía equipo defectuoso", 1200.00, ""),
        ("2026-06-01", "egreso", "Pago de renta oficina junio", 3500.00, ""),
        ("2026-07-01", "egreso", "Compra de UPS de respaldo", 4500.00, ""),
    ]
    
    for mdate, mtype, concept, amount, notes in movements_data:
        m = CashMovement(
            date=date.fromisoformat(mdate), type=mtype,
            concept=concept, amount=amount, notes=notes,
        )
        db.add(m)
    db.commit()
    print(f"✅ {len(movements_data)} cash movements created")

    # ===== HISTORY (auto-generated from operations) =====
    history_entries = [
        ("2025-01-15", "09:00", "admin", "alta_cliente", "Alta de cliente CLI-0001 - María García López - Plan: Plan Básico - $199.00/mes", 0, 10000.00),
        ("2025-01-15", "09:30", "admin", "pago_cliente", "Pago de CLI-0001 - María García López: $199.00 (efectivo)", 199.00, 10199.00),
        ("2025-03-10", "10:00", "admin", "alta_cliente", "Alta de cliente CLI-0002 - Juan Pérez Ramírez - Plan: Plan Vecino - $299.00/mes", 0, 10199.00),
        ("2025-06-01", "11:00", "admin", "ingreso", "Ingreso: Venta de antena Ubiquiti a cliente externo - $5500.00", 5500.00, 15699.00),
        ("2025-06-20", "14:00", "admin", "alta_cliente", "Alta de cliente CLI-0003 - Ana Martínez Sosa - Plan: Plan Familiar - $449.00/mes", 0, 15699.00),
        ("2025-08-15", "09:00", "admin", "egreso", "Egreso: Compra de material de instalación - $2500.00", -2500.00, 13199.00),
        ("2025-12-20", "10:00", "admin", "egreso", "Egreso: Pago de renta oficina diciembre - $3500.00", -3500.00, 9699.00),
        ("2026-01-08", "15:00", "admin", "alta_cliente", "Alta de cliente CLI-0006 - Roberto Sánchez Ruiz - Plan: Plan Familiar - $449.00/mes", 0, 9699.00),
        ("2026-07-14", "08:00", "admin", "pago_cliente", "Pago de CLI-0010 - Francisco Morales Reyes: $299.00 (efectivo)", 299.00, 7498.00),
    ]
    
    for hdate, htime, huser, htype, hdesc, hamount, hbalance in history_entries:
        h = History(
            date=date.fromisoformat(hdate), time=htime, user=huser,
            type=htype, description=hdesc, amount=hamount, balance_after=hbalance,
        )
        db.add(h)
    db.commit()
    print(f"✅ {len(history_entries)} history entries created")

    # ===== SETTINGS =====
    settings_data = {
        "company_name": "FibraYa!",
        "company_logo": "",
        "company_address": "Cerca de Bosque Pakistan, 56024 Ejido de Tequisistlán Primero, Méx.",
        "company_phone": "5659341070",
        "company_email": "controlmodularmx@gmail.com",
        "currency": "MXN",
    }
    for key, value in settings_data.items():
        s = Setting(key=key, value=value)
        db.add(s)
    db.commit()
    print(f"✅ {len(settings_data)} settings created")

    # ===== SUMMARY =====
    print("\n📊 Test Database Summary:")
    print(f"  Users: {db.query(User).count()}")
    print(f"  Plans: {db.query(Plan).count()}")
    print(f"  Clients: {db.query(Client).count()} (active: {db.query(Client).filter(Client.status==activo).count()})")
    print(f"  Payments: {db.query(Payment).count()}")
    print(f"  Assets: {db.query(Asset).count()}")
    print(f"  Cash Movements: {db.query(CashMovement).count()}")
    print(f"  History: {db.query(History).count()}")
    print(f"  Settings: {db.query(Setting).count()}")
    
    total_income = sum(m.amount for m in db.query(CashMovement).filter(CashMovement.type==ingreso).all())
    total_expenses = sum(m.amount for m in db.query(CashMovement).filter(CashMovement.type==egreso).all())
    print(f"\n  Cash Funds: ${total_income - total_expenses:.2f}")
    
    active_monthly = sum(c.monthly_cost for c in db.query(Client).filter(Client.status==activo, Client.is_active==True).all())
    print(f"  Expected Monthly: ${active_monthly:.2f}")
    print(f"  Expected Yearly: ${active_monthly * 12:.2f}")

finally:
    db.close()
