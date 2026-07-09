## 1. Notas de preparación (kitchen_notes)

**Base de datos** — migración: `ALTER TABLE public.sales ADD COLUMN kitchen_notes text;`.

**POS (`src/routes/_authenticated/pos.tsx` + `src/store/cart.ts`)**
- Añadir estado `kitchenNotes` al store del carrito con setter y limpieza al finalizar venta.
- Agregar un botón/textarea "Notas para cocina" en la barra lateral del carrito (junto a descuento/cliente), máx 200 caracteres.
- Pasar `kitchen_notes` a `saveSale`.

**Backend (`src/lib/sales.functions.ts`)**
- Aceptar `kitchen_notes` en el validador de `saveSale` y guardarlo en la fila.
- Incluirlo en el SELECT de KDS.

## 2. Monitor de cocina mejorado (`src/routes/_authenticated/cocina.tsx`)

**Vista expandida al tocar una orden**
- Modal a pantalla completa con tipografía grande (legible desde 1–2 m): folio, cliente, tiempo, `kitchen_notes` destacadas en amarillo.
- Lista de productos con **checkbox grande por producto** para marcar cada ítem como listo.
- Al marcar el último ítem, la orden pasa automáticamente a `listo` y el modal se cierra.
- Botones grandes al pie: "Iniciar preparación" / "Marcar todo listo" / "Cerrar".

**Estado por producto**
- Nueva columna `sale_items.kds_item_status text default 'pendiente'` (`pendiente` | `listo`).
- Server function `updateSaleItemKdsStatus({ itemId, status })` con RLS (cocinero/admin/supervisor).
- Real-time ampliado a `sale_items`.

**Menos toques**
- Auto-avance a "Listo" al marcar el último ítem.
- Modo "Iniciar al abrir": una orden pendiente pasa a "preparando" al abrirla (toggle en header, on por defecto).
- Auto-archivo de "Listo" tras 5 min.
- Wake Lock API para mantener la pantalla encendida.
- Áreas de toque ≥56 px y swipe: derecha = avanzar estado, izquierda = deshacer.

## 3. Reparar impresión de corte de caja

- Confirmar en runtime que `getPrintSettings()` en `caja.tsx` devuelve `print_mode: "proxy"` y `proxy_url` correctos.
- Auditar `buildCashCutBytes` contra el shape real de `getCashCutDetail` (campos `sales_mixto`, movimientos, denominaciones) y corregir cualquier `undefined` que rompa la generación.
- Reemplazar el `catch {}` silencioso de `printCorteSmart` en `caja.tsx` por `console.error` + `toast.error` con el mensaje real.
- Verificar que "Imprimir corte" del historial y el flujo automático post-cierre usen ambos el mismo `printCorteSmart` corregido.

## 4. Descuentos en el ticket de venta

- Extender `TicketPrintData` en `src/lib/escpos.ts` (y su respaldo HTML en `src/lib/utils.ts`) con `discount`, `discountReason`, `isCourtesy`.
- Renderizado ESC/POS: bajo el subtotal, si `discount > 0` o `isCourtesy`, agregar líneas:
  - `Descuento .......... -$XX.XX`
  - `Motivo: <razón>` (si existe, con wrap si es largo)
  - Si `isCourtesy = true`: línea grande `*** CORTESÍA ***` centrada en negrita.
- Mismo tratamiento en el HTML de respaldo (`printTicketBrowser`) con `escapeHtml`.
- Actualizar los tres puntos que arman `TicketPrintData` (POS al cobrar, `ReceiptDialog`, reimpresión desde historial) para pasar los campos de descuento desde la venta guardada.
- Añadir `discount`, `discount_reason`, `is_courtesy` al SELECT usado en la reimpresión desde historial si aún no están.

## Detalles técnicos

- Migración única: `sales.kitchen_notes`, `sale_items.kds_item_status` + índice, y `ALTER PUBLICATION supabase_realtime ADD TABLE public.sale_items`. Las columnas nuevas heredan GRANTs.
- Modal KDS: `Dialog` de shadcn `max-w-3xl` con `text-2xl`/`text-3xl`.
- Wake Lock: `navigator.wakeLock.request('screen')` en `useEffect` con cleanup y fallback silencioso.
- Swipe: handlers `pointerdown`/`pointerup` midiendo delta X (>80 px), sin dependencias nuevas.
