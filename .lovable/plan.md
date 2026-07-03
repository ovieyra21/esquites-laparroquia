# Impresión térmica confiable vía Proxy ESC/POS local

## Diagnóstico confirmado

1. **La tablet usa el camino equivocado**: el POS, el `ReceiptDialog` y el corte de caja llaman `printTicketBrowser()` / `printCorteBrowser()` (HTML + `window.print()`). El driver de la tablet rasteriza ese HTML con su propia codepage → acentos rotos ("Acámbaro" → "Acßmbaro") y texto pegado (flexbox no respeta el ancho real del rollo). El ticket de tu foto coincide 100% con esta firma.
2. **El camino ESC/POS del servidor está bien construido pero es inalcanzable en producción**: `printSaleTicket` corre en la nube y no puede abrir una conexión TCP hacia `192.168.1.101` (IP privada de tu red local). Solo funcionaba en pruebas locales. Por eso "cambiar la tablet al server function" no basta.
3. **La solución correcta es el proxy que adjuntaste**: un mini-servidor Node en tu red recibe los bytes ESC/POS por HTTP y los reenvía por TCP a la impresora. El navegador de la tablet SÍ está en la misma red, así que puede hablar con el proxy directamente.

## Qué voy a construir

### 1. Motor ESC/POS compartido (cliente)
- Mover `TicketBuilder`, `toAscii()` y los constructores de bytes (`buildTicketBytes`, `buildCashCutBytes`) de `printer.functions.ts` a un módulo compartido `src/lib/escpos.ts` que corre en el navegador.
- La tablet genera los bytes localmente (transliteración de acentos + alineación por columnas garantizada, que ya funcionan bien) y los envía al proxy — sin depender del driver del sistema.

### 2. Proxy de impresión descargable
- Crear los archivos del proxy en `public/proxy/`:
  - `escpos-proxy.mjs` — servidor Node: `POST /` recibe bytes ESC/POS y los reenvía por TCP a la impresora; `GET /health` y `GET /panel` para verificar; ticket de prueba integrado.
  - `start-proxy.bat` (Windows), `start-proxy-termux.sh` (Android/Termux) y la guía README que adjuntaste.
- El proxy incluirá cabeceras CORS y de red privada (`Access-Control-Allow-Private-Network`) para que el navegador permita la conexión.
- Sección en **Configuración → Impresora** con botones para descargar estos archivos y las instrucciones resumidas.

### 3. Configuración de impresión
- Migración de base de datos: agregar a `settings` los campos `print_mode` (`proxy` | `navegador`) y `proxy_url` (default `http://localhost:3128`).
- UI en Configuración para elegir el modo y la URL del proxy, con botón "Probar impresora" que ahora prueba vía proxy.

### 4. Conectar los puntos de impresión
- `pos.tsx` (3 llamadas), `ReceiptDialog` y el corte en `caja.tsx`: si `print_mode = proxy`, generar bytes ESC/POS y enviarlos al proxy; si falla o el modo es `navegador`, caer al overlay HTML como respaldo con aviso claro.

### 5. Corregir el camino HTML (respaldo/vista previa)
- Aplicar `escapeHtml()` a `item.name` y a cada modificador en `printTicketBrowser` (hoy no se escapan, a diferencia de `printCorteBrowser`).
- No se necesita `toAscii()` en el HTML de respaldo — se mantiene como vista previa en pantalla.

## Recomendación de instalación

**Corre el proxy en la misma tablet con Termux (Opción B de tu guía).** Razón técnica: la web POS se sirve por HTTPS, y los navegadores solo permiten llamadas HTTP inseguras hacia `localhost`. Si el proxy corre en otra PC de la red (`http://192.168.1.X:3128`), Chrome puede bloquear la conexión por "contenido mixto". Con el proxy en la tablet, `http://localhost:3128` funciona siempre.

Si prefieres correrlo en una PC/Raspberry, lo dejamos configurable y te explico cómo permitirlo en Chrome de la tablet (ajuste de sitio inseguro permitido).

## Detalles técnicos

- `src/lib/escpos.ts`: módulo puro TypeScript (sin dependencias de servidor) con los bytes crudos ya probados: `ESC @`, `ESC t 0` (PC437), `GS ! 0x11`, corte parcial `GS V 1`, cajón `ESC p`.
- Envío al proxy: `fetch(proxyUrl, { method: "POST", body: bytes })` con timeout y manejo de error visible ("¿Está corriendo el proxy?").
- Las server functions `printSaleTicket` / `printCashCutReceipt` / `testPrinter` se eliminan (transporte TCP inalcanzable desde la nube) — su lógica vive ahora en `escpos.ts`.
- Migración: `ALTER TABLE settings ADD COLUMN print_mode text DEFAULT 'proxy', ADD COLUMN proxy_url text DEFAULT 'http://localhost:3128'`.
