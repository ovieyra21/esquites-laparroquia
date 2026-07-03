# 🖨️ ESC/POS Printer Proxy — Guía de Configuración

## ¿Qué es?

Un mini-servidor que corre en tu red local. Recibe trabajos de impresión del POS
(vía HTTP) y los reenvía a la impresora térmica (vía TCP/ESC/POS).

## Requisitos

- Node.js 18+ instalado en el dispositivo que correrá el proxy
- El dispositivo debe estar en la MISMA red WiFi que la impresora (`192.168.1.101`)
- La impresora térmica encendida y conectada por WiFi

## Opciones de instalación

### Opción A: Windows (PC o laptop en la red)

```bash
# 1. Instalar Node.js desde https://nodejs.org (versión LTS)

# 2. Copiar los archivos a una carpeta (ej: C:\esquites-proxy\)
#    - escpos-proxy.mjs
#    - start-proxy.bat

# 3. Doble clic en start-proxy.bat

# 4. Abrir http://localhost:3128/panel para verificar
```

**Auto-inicio en Windows:**
1. Presiona `Win+R`, escribe `shell:startup`
2. Arrastra `start-proxy.bat` a la carpeta que se abre
3. El proxy iniciará automáticamente al encender la PC

### Opción B: Android Tablet (Termux)

```bash
# 1. Instalar Termux desde F-Droid (NO desde Play Store)
#    https://f-droid.org/packages/com.termux/

# 2. En Termux:
pkg update && pkg upgrade
pkg install nodejs termux-api

# 3. Copiar escpos-proxy.mjs a la tablet
#    (puedes usar un cable USB y copiarlo a /sdcard/)

# 4. Crear carpeta y mover:
mkdir -p ~/esquites-proxy
cp /sdcard/escpos-proxy.mjs ~/esquites-proxy/
cp /sdcard/start-proxy-termux.sh ~/esquites-proxy/

# 5. Iniciar manualmente:
cd ~/esquites-proxy
node escpos-proxy.mjs

# 6. Abrir en el navegador de la tablet:
#    http://localhost:3128/panel
```

**Auto-inicio en Android (Termux:Boot):**
1. Instalar Termux:Boot desde F-Droid
2. Crear carpeta `~/.termux/boot/`
3. Copiar `start-proxy-termux.sh` ahí:
   ```bash
   mkdir -p ~/.termux/boot
   cp ~/esquites-proxy/start-proxy-termux.sh ~/.termux/boot/
   chmod +x ~/.termux/boot/start-proxy-termux.sh
   ```
4. El proxy iniciará automáticamente al encender la tablet

### Opción C: Raspberry Pi (recomendado para 24/7)

```bash
# 1. Copiar escpos-proxy.mjs al Raspberry Pi
scp escpos-proxy.mjs pi@192.168.1.X:/home/pi/

# 2. SSH al Raspberry Pi e instalar Node.js:
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# 3. Iniciar:
PRINTER_IP=192.168.1.101 node escpos-proxy.mjs

# 4. Auto-inicio con systemd:
sudo tee /etc/systemd/system/escpos-proxy.service << 'EOF'
[Unit]
Description=ESC/POS Printer Proxy
After=network.target

[Service]
Type=simple
User=pi
WorkingDirectory=/home/pi
Environment=PRINTER_IP=192.168.1.101
Environment=PRINTER_PORT=9100
Environment=PROXY_PORT=3128
ExecStart=/usr/bin/node escpos-proxy.mjs
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl enable escpos-proxy
sudo systemctl start escpos-proxy
```

## Verificar que funciona

1. Abre el panel web: `http://<IP-DEL-DISPOSITIVO>:3128/panel`
2. Haz clic en "🧪 Imprimir ticket de prueba"
3. La impresora debería imprimir un ticket con:
   - "Esquites La Parroquia"
   - "PRUEBA DE IMPRESION"
   - "Proxy ESC/POS funcionando!"

## Configurar en el POS

1. En el POS, ve a Settings → Impresora
2. Configura la URL del proxy:
   - Si el proxy corre en la misma tablet: `http://localhost:3128`
   - Si corre en otro dispositivo: `http://192.168.1.X:3128`
3. Guarda y prueba desde el botón de impresión térmica

## Variables de entorno

| Variable | Default | Descripción |
|---|---|---|
| `PRINTER_IP` | `192.168.1.101` | IP de la impresora térmica |
| `PRINTER_PORT` | `9100` | Puerto TCP de la impresora |
| `PROXY_PORT` | `3128` | Puerto HTTP del proxy |

## Endpoints

| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/health` | Estado del proxy (JSON) |
| `GET` | `/panel` | Panel web de control |
| `GET` | `/` | Igual que `/health` |
| `POST` | `/` | Recibe ESC/POS binario y lo imprime |
| `POST` | `/print` | Imprime ticket de prueba |

## Solución de problemas

**"Connection refused" al probar:**
- ¿La impresora está encendida?
- ¿Está en la misma red WiFi?
- Verifica la IP: imprime el reporte de red de la impresora

**El proxy no inicia:**
- ¿Node.js está instalado? `node --version`
- ¿El puerto 3128 está en uso? Cambia `PROXY_PORT`

**El ticket sale con caracteres raros:**
- La impresora debe estar configurada para recibir ESC/POS (no TSPL/ZPL)
- Verifica el code page (cp850 para español)
