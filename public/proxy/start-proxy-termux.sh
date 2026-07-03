#!/data/data/com.termux/files/usr/bin/sh
# Proxy de impresión ESC/POS — Esquites La Parroquia (Termux / Android)
# Copia este archivo junto a escpos-proxy.mjs en ~/esquites-proxy/
# Para auto-inicio: cópialo también a ~/.termux/boot/ (requiere Termux:Boot)

export PRINTER_IP="${PRINTER_IP:-192.168.1.101}"
export PRINTER_PORT="${PRINTER_PORT:-9100}"
export PROXY_PORT="${PROXY_PORT:-3128}"

# Evita que Android suspenda Termux
command -v termux-wake-lock >/dev/null 2>&1 && termux-wake-lock

cd "$HOME/esquites-proxy" || exit 1
echo "Iniciando proxy en http://localhost:$PROXY_PORT (impresora $PRINTER_IP:$PRINTER_PORT)"
exec node escpos-proxy.mjs >> "$HOME/esquites-proxy/proxy.log" 2>&1
