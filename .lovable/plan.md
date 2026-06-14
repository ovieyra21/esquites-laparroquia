# Plan de implementación

Tres bloques grandes. Los ejecuto en este orden para que cada paso desbloquee el siguiente.

---

## Bloque 1 — Autenticación + Roles (admin / cajero / supervisor)

**Base de datos (migración):**
- Crear enum `app_role` con valores `admin`, `cajero`, `supervisor`.
- Crear `public.profiles` (id → `auth.users`, full_name, email, avatar_url) con trigger de auto-creación en signup.
- Crear `public.user_roles` (user_id, role) + función `has_role(uuid, app_role)` security definer.
- Migrar la tabla `users` existente: eliminarla (no está enlazada a auth.users, no sirve).
- RLS y GRANTs en todas las tablas del POS (categories, products, sales, sale_items, modifier_groups, modifiers, product_modifiers, sale_item_modifiers, cash_register, expenses, settings, digital_menus):
  - Lectura: `authenticated`
  - Escritura de catálogo y settings: solo `admin`
  - Crear ventas: `cajero`, `admin`, `supervisor`
  - Cancelar venta: `supervisor`, `admin`
  - Cortes de caja: el cajero solo ve/edita su propia caja; admin/supervisor ven todas.

**UI:**
- Ruta pública `/auth` (login con email/contraseña + Google vía `lovable.auth.signInWithOAuth`).
- Layout `_authenticated/route.tsx` (gestionado por la integración) protege todo el POS.
- Sidebar muestra/oculta secciones según rol (productos, configuración, cortes globales).
- Header del POS muestra cajero actual y caja abierta.
- Configurar provider Google.

---

## Bloque 2 — Cortes de Caja + Entradas/Salidas

**Base de datos (migración):**
- Ampliar `cash_register`: `user_id` (FK a auth.users), `expected_amount`, `real_amount`, `difference`, `notes`, `total_sales_cash`, `total_sales_card`, `total_sales_transfer`, `created_at`. Solo una caja con `status='abierta'` por cajero (índice parcial único).
- Ampliar `expenses` → renombrar conceptualmente a movimientos: agregar `type` (`entrada`|`salida`), `cash_register_id`, `user_id`, `payment_method`.
- Vincular `sales.cash_register_id` y `sales.user_id` (cajero que cobró).
- Función SQL `get_cash_register_summary(register_id)` que devuelve ventas por método, entradas, salidas, esperado en efectivo.

**Server functions (`src/lib/cash.functions.ts`):**
- `openCashRegister({ openingAmount })` — valida que no haya otra abierta del cajero.
- `closeCashRegister({ realAmount, notes })` — calcula diferencia y cierra.
- `addCashMovement({ type, amount, concept })` — entrada o salida con motivo.
- `getCurrentRegister()` — devuelve caja abierta + summary.
- `getRegisterHistory({ from, to, userId? })` — historial con filtros.

**UI nueva — ruta `/caja`:**
- Si no hay caja abierta: dialog "Abrir caja" con monto inicial.
- Si está abierta: panel con monto inicial, ventas por método, entradas, salidas, esperado en efectivo, botones "Entrada", "Salida", "Cerrar caja".
- Dialog "Cerrar caja": muestra esperado vs real (input), diferencia en vivo (verde/rojo), notas, confirmar.
- Dialog "Entrada/Salida": monto + concepto + método.
- Tab "Historial de cortes": tabla con folio, cajero, apertura/cierre, totales, diferencia. Click → detalle imprimible.
- POS bloquea cobrar si el cajero no tiene caja abierta.

---

## Bloque 3 — Impresora Térmica WiFi (ESC/POS por IP)

**Por qué esta vía:** las impresoras WiFi (Epson TM-m30, Xprinter, 3nstar, etc.) escuchan TCP en puerto 9100 con comandos ESC/POS binarios. El navegador no puede abrir sockets TCP raw, así que el envío va desde una **server function** de TanStack que sí puede hacer `fetch`/`net.connect`. Soporta corte automático, logo, código de barras y abrir cajón.

**Dependencia:**
- `bun add esc-pos-encoder` (genera el buffer ESC/POS puro, sin Node-only deps; compatible con Cloudflare Workers).

**Configuración (en `/configuracion` → Impresora):**
- Tabla `settings` ya existe; agrego campos `printer_ip`, `printer_port` (default 9100), `printer_enabled`, `printer_width` (58/80mm), `auto_print` (boolean), `auto_cut`, `open_drawer`.
- UI: inputs IP / puerto, switch habilitar, botón "Imprimir prueba".

**Server function `printTicket.functions.ts`:**
- Recibe `{ saleId }`, carga la venta + items + modifiers + settings.
- Genera buffer ESC/POS: logo, nombre del negocio, folio, fecha, items con modificadores, totales, método de pago, mensaje pie, corte automático.
- Abre conexión TCP a `printer_ip:printer_port` usando la API `connect()` de Cloudflare Workers (`cloudflare:sockets`).
- Si falla TCP (firewall/red): devuelve error claro y la UI cae a `window.print()` como fallback.

**Integración POS:**
- Tras cobrar, si `auto_print` está activo, dispara la server function automáticamente.
- En `ReceiptDialog`: botón "Imprimir térmica" además del actual "Imprimir navegador".
- Indicador de estado de impresora (puntito verde/rojo) en el header del POS basado en último intento.

---

## Detalles técnicos

- Wiring de `attachSupabaseAuth` en `src/start.ts` (verificar que ya está; si no, agregar).
- Refactor de `src/store/sales.ts` y `src/store/cart.ts`: las ventas dejan de vivir en Zustand y pasan a la base. Mantengo Zustand solo para el carrito en curso.
- Migración del catálogo hard-codeado de `src/data/catalog.ts`: las páginas leen de la BD vía server functions (`getCategories`, `getProducts`). El archivo `catalog.ts` queda como seed para una pantalla "Importar catálogo demo" en admin.
- Página `/productos`: CRUD básico (alta, precio, activo/inactivo, categoría, modificadores). Solo admin.
- Cancelar venta: server function que solo supervisor/admin pueden ejecutar (chequeo con `has_role`).
- Toda interacción con la BD pasa por server functions con `requireSupabaseAuth` para que RLS aplique correctamente.

---

## Orden de ejecución y entregables

1. Migración (auth + roles + ajustes de tablas + RLS + GRANTs).
2. UI de login + protección de rutas + sidebar con roles.
3. Server functions de catálogo y ventas; refactor del POS para usar BD.
4. CRUD de Productos.
5. Migración de tablas de caja + server functions + ruta `/caja` completa.
6. Configuración de impresora + server function ESC/POS + integración con POS y ticket.
7. Smoke test: signup → asignar admin manualmente vía SQL → login → abrir caja → vender → imprimir → cerrar caja.

---

## Notas para ti

- **Es trabajo grande** (≈ 25–35 archivos nuevos/modificados, 3 migraciones). Costará créditos proporcionalmente. Si prefieres acotar el alcance (ej. solo Bloque 1 + 2 ahora, impresora después), dímelo antes de aprobar.
- Para la impresora vas a necesitar darme la **IP local fija** de tu impresora una vez que el módulo esté listo (la configurarás tú desde `/configuracion`).
- Al primer usuario que se registre lo promovemos a `admin` manualmente con un SQL que te dejaré listo para ejecutar.
