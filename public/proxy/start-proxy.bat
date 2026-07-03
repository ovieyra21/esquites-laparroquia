@echo off
title Esquites La Parroquia - Proxy de Impresion
cd /d "%~dp0"

REM ── Configura aqui la IP de tu impresora termica ──
set PRINTER_IP=192.168.1.101
set PRINTER_PORT=9100
set PROXY_PORT=3128

echo ==================================================
echo   Proxy de impresion ESC/POS
echo   Panel: http://localhost:%PROXY_PORT%/panel
echo   Impresora: %PRINTER_IP%:%PRINTER_PORT%
echo ==================================================
node escpos-proxy.mjs
pause
