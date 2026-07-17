#!/data/data/com.termux/files/usr/bin/bash
# Termux:Boot — Inicia el servidor de Esquites La Parroquia al arrancar

PROJECT_DIR="/data/data/com.termux/files/home/esquites-laparroquia"
LOG_FILE="$PROJECT_DIR/server.log"
PID_FILE="$PROJECT_DIR/server.pid"

cd "$PROJECT_DIR" || exit 1

# Detener instancia previa si existe
if [ -f "$PID_FILE" ]; then
  kill "$(cat "$PID_FILE")" 2>/dev/null
  rm -f "$PID_FILE"
fi

# Iniciar servidor en segundo plano con reinicio automático
while true; do
  echo "[$(date)] Iniciando servidor..." >> "$LOG_FILE"
  node server.cjs >> "$LOG_FILE" 2>&1 &
  echo $! > "$PID_FILE"
  wait $!
  sleep 2
done
