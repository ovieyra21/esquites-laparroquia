## Alcance

Seis mejoras agrupadas en bloques para implementarse de forma ordenada. Confirma o ajusta antes de implementar.

---

### 1. Tabulador de denominaciones (apertura y corte de caja)

En `src/routes/_authenticated/caja.tsx`, dentro de `OpenCashDialog` y `CloseCashDialog`, añadir una tabla con las denominaciones MXN:

```
Billetes: 1000, 500, 200, 100, 50, 20
Monedas:  20, 10, 5, 2, 1, 0.50
```

Cada fila: denominación · input numérico de cantidad · subtotal. Total se calcula automáticamente y rellena el campo de "monto" (fondo inicial / efectivo real). Se mantiene la opción de capturar monto manual.

Se guarda el desglose como JSON en una columna nueva `denominations_breakdown jsonb` en `cash_register` (apertura y cierre por separado: `opening_breakdown`, `closing_breakdown`) — migración requerida.

### 2. Corte de caja impreso en impresora 80 mm

Agregar `printCashCutReceipt(registerId)` en `src/lib/printer.functions.ts` (estilo ESC/POS 80 mm, igual que el ticket de venta con logo raster 384px). Contenido:

- Logo + nombre del negocio
- "CORTE DE CAJA" · fecha apertura/cierre · cajero
- Fondo inicial
- Ventas: efectivo / tarjeta / transferencia / mixto / total · # tickets
- Entradas y salidas de efectivo
- Efectivo esperado vs real · diferencia
- Notas

Botón "Imprimir corte" en el diálogo de cierre (después de confirmar) y en el historial de cortes.

### 3. Eliminar catálogo hardcodeado (`src/data/catalog.ts`)

Reemplazar las lecturas de `PRODUCTS` / `CATEGORIES` por consultas a la base de datos (las tablas `products`, `categories`, `modifier_groups`, `modifiers`, `product_modifiers` ya existen):

- `src/routes/_authenticated/pos.tsx` — usar `getProductsForPOS` server fn (autenticada).
- `src/routes/index.tsx` (landing pública) — nueva server fn pública `getPublicCatalog` con cliente publishable + política `TO anon SELECT` en `products` y `categories` (solo columnas seguras, `is_active = true`).
- `src/routes/m.$id.tsx` (menú digital) — misma fn pública.

Seed inicial: migración que inserta las categorías y productos actuales de `catalog.ts` en la base de datos (idempotente con `ON CONFLICT`). Después se borra `src/data/catalog.ts`.

### 4. Menú digital (mejoras)

El menú digital ya existe (`/menu` y `/m/$id`). Mejoras propuestas:

- Conectar a catálogo real (punto 3) en lugar de mock.
- Cada item con foto/emoji, precio, descripción e ingredientes desde la BD.
- Filtro por categoría y buscador.
- Botón "Pedir por WhatsApp" por item y carrito flotante (ver punto 5).
- Configuración del menú (nombre, descripción, logo, color) leída desde `digital_menus` + `settings`.

### 5. Integración con WhatsApp para pedidos

- Mover el número WhatsApp hardcodeado (`524171234567`) a `settings` → nueva columna `whatsapp_number text`. Editable en `/configuracion`.
- En la landing y menú digital: carrito ligero (localStorage) con +/− por item, total y botón "Enviar pedido por WhatsApp" que genera el mensaje formateado:

```
*Pedido Esquites La Parroquia*
2x Esquite grande - $80
1x Maruchan loko - $65
Total: $145
Nombre: ___  Para: comer aquí/llevar
```

- Link `https://wa.me/<number>?text=<encoded>` abre WhatsApp Web/app.
- Opcional: registrar el pedido como `sale` en estado `pendiente_whatsapp` para que aparezca en POS al confirmarse en local (lo dejo fuera por defecto salvo que lo pidas).

### 6. Modo claro (light mode)

`src/styles.css` ya tiene la base con `.dark` variant. Hay que:

- Definir variables de color para tema claro en `:root` y mover el oscuro actual a `.dark`.
- Añadir `ThemeProvider` (contexto + localStorage `theme: light | dark | system`) inicializado en `__root.tsx` aplicando la clase `dark` al `<html>`.
- Botón toggle (sol/luna) en el Sidebar y en el header de la landing.
- Verificar contraste de la paleta dorada sobre fondo claro (probablemente ajustar `--gold` y bordes).

---

## Resumen técnico

**Migraciones SQL** (en este orden):
1. `cash_register`: agregar `opening_breakdown jsonb`, `closing_breakdown jsonb`.
2. `settings`: agregar `whatsapp_number text`.
3. Política `TO anon SELECT` en `products`, `categories`, `modifier_groups`, `modifiers`, `product_modifiers` (solo activos).
4. Seed de categorías/productos desde `catalog.ts`.

**Server functions nuevas**:
- `getPublicCatalog` (pública, publishable client)
- `printCashCutReceipt` (autenticada, devuelve raster ESC/POS)
- `getRegisterFullSummary` (para el ticket de corte)

**Archivos a editar**: `caja.tsx`, `pos.tsx`, `index.tsx`, `m.$id.tsx`, `menu.tsx`, `configuracion.tsx`, `printer.functions.ts`, `cash.functions.ts`, `settings.functions.ts`, `styles.css`, `__root.tsx`, `Sidebar.tsx`.

**Archivos a crear**: `DenominationCounter.tsx`, `ThemeProvider.tsx`, `ThemeToggle.tsx`, `WhatsAppCart.tsx`, `public-catalog.functions.ts`.

**Archivo a eliminar**: `src/data/catalog.ts` (tras seed).

---

## Orden de entrega sugerido

Para evitar PRs gigantes, propongo entregarlo en 3 tandas:

- **Tanda A**: Denominaciones + corte impreso 80 mm (puntos 1 y 2).
- **Tanda B**: Conectar BD + seed + eliminar hardcode + menú digital con BD (puntos 3 y 4).
- **Tanda C**: WhatsApp configurable con carrito + modo claro (puntos 5 y 6).

¿Implemento las tres tandas seguidas, o prefieres aprobar tanda por tanda? ¿Algún ajuste al alcance (p. ej. otras denominaciones, no querer seed automático, conservar `catalog.ts` como fallback)?