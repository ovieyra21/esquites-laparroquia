#!/data/data/com.termux/files/usr/bin/sh
# Esquites La Parroquia — POS (Termux / Android)
# Copia este archivo a ~/.termux/boot/ para auto-inicio (requiere Termux:Boot)

# --- Configuración ---
APP_DIR="$HOME/esquites-laparroquia"
PORT="${PORT:-8080}"
LOG_DIR="$HOME/esquites-laparroquia/logs"

# Evita que Android suspenda Termux
command -v termux-wake-lock >/dev/null 2>&1 && termux-wake-lock

mkdir -p "$LOG_DIR"
cd "$APP_DIR" || exit 1

# 1. API REST (Express + SQLite) — puerto 3000
nohup node server.cjs \
  >> "$LOG_DIR/api.log" 2>&1 &

# 2. Proxy de impresión ESC/POS — puerto 3128
PRINTER_IP="${PRINTER_IP:-192.168.1.101}" \
PRINTER_PORT="${PRINTER_PORT:-9100}" \
PROXY_PORT="${PROXY_PORT:-3128}" \
nohup node public/proxy/escpos-proxy.mjs \
  >> "$LOG_DIR/proxy.log" 2>&1 &

# Espera a que la API esté lista
sleep 2

# 3. Servidor POS (TanStack Start) — puerto 8080
echo "🌽 API:        http://localhost:3000"
echo "🖨️ Proxy:      http://localhost:3128"
echo "📱 POS:        http://localhost:$PORT"
exec npm run dev -- --host 0.0.0.0 --port "$PORT" \
  >> "$LOG_DIR/app.log" 2>&1
