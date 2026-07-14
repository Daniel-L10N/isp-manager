#!/bin/bash
# ISP Manager - Inicio rápido
# Instala dependencias y arranca backend + frontend

set -e

echo "=== Instalando dependencias del backend ==="
cd backend
if [ ! -d "venv" ]; then
    python3 -m venv venv
fi
source venv/bin/activate
pip install -q -r requirements.txt

echo "=== Instalando dependencias del frontend ==="
cd ../frontend
npm install --silent

cd ..

echo "=== Iniciando servidores ==="
echo "Backend:  http://localhost:8000"
echo "Frontend: http://localhost:3000"
echo ""
echo "Credenciales: admin / L10Nstad"
echo ""

# Start backend
(cd backend && source venv/bin/activate && uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload) &

# Start frontend
(cd frontend && npm run dev) &

wait
