#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────
//  ESC/POS Printer Proxy — Esquites La Parroquia
//  Mini-servidor que corre en tu red local. Recibe trabajos de
//  impresión del POS (HTTP) y los reenvía a la impresora térmica
//  por TCP (ESC/POS, puerto 9100).
//
//  Uso:
//    PRINTER_IP=192.168.1.101 node escpos-proxy.mjs
//
//  Variables de entorno:
//    PRINTER_IP    IP de la impresora térmica   (default 192.168.1.101)
//    PRINTER_PORT  Puerto TCP de la impresora   (default 9100)
//    PROXY_PORT    Puerto HTTP de este proxy    (default 3128)
// ─────────────────────────────────────────────────────────────
import http from "node:http";
import net from "node:net";

const PRINTER_IP = process.env.PRINTER_IP || "192.168.1.101";
const PRINTER_PORT = Number(process.env.PRINTER_PORT || 9100);
const PROXY_PORT = Number(process.env.PROXY_PORT || 3128);

let jobCount = 0;
let lastJob = null; // { at, ok, bytes, ip, error }

// CORS + Private Network Access (Chrome exige esta cabecera para que una
// página HTTPS pueda hablar con un servidor HTTP de la red local).
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Private-Network": "true",
  "Access-Control-Max-Age": "86400",
};

function sendToPrinter(ip, port, data) {
  return new Promise((resolve, reject) => {
    const client = new net.Socket();
    client.setTimeout(7000);
    client.connect(port, ip, () => {
      client.write(data, () => {
        client.end();
        resolve();
      });
    });
    client.on("error", (err) => {
      client.destroy();
      reject(new Error(`Error de conexion con impresora ${ip}:${port} — ${err.message}`));
    });
    client.on("timeout", () => {
      client.destroy();
      reject(new Error(`Timeout con impresora ${ip}:${port}`));
    });
  });
}

// Ticket de prueba en ESC/POS crudo
function testTicketBytes() {
  const ESC = 0x1b, GS = 0x1d;
  const bytes = [];
  const push = (...b) => bytes.push(...b);
  const text = (s) => { for (const ch of s) bytes.push(ch.charCodeAt(0) & 0x7f); };
  const line = (s = "") => { text(s); push(0x0a); };
  push(ESC, 0x40);            // init
  push(ESC, 0x74, 0x00);      // codepage PC437
  push(ESC, 0x61, 1);         // centrar
  push(ESC, 0x45, 1); push(GS, 0x21, 0x11);
  line("Esquites La Parroquia");
  push(GS, 0x21, 0x00); push(ESC, 0x45, 0);
  line("");
  line("PRUEBA DE IMPRESION");
  line("Proxy ESC/POS funcionando!");
  line(new Date().toLocaleString("es-MX", { hour12: false }));
  push(0x0a, 0x0a, 0x0a, 0x0a);
  push(GS, 0x56, 0x01);       // corte parcial
  return Buffer.from(bytes);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on("data", (c) => {
      size += c.length;
      if (size > 1024 * 1024) { reject(new Error("Trabajo demasiado grande")); req.destroy(); return; }
      chunks.push(c);
    });
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

function json(res, code, obj) {
  res.writeHead(code, { "Content-Type": "application/json; charset=utf-8", ...CORS });
  res.end(JSON.stringify(obj));
}

const PANEL_HTML = `<!DOCTYPE html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Proxy ESC/POS — Esquites La Parroquia</title>
<style>
  body{font-family:system-ui,sans-serif;background:#1a1a1a;color:#eee;max-width:520px;margin:40px auto;padding:0 16px}
  .card{background:#252525;border:1px solid #3a3a3a;border-radius:14px;padding:20px;margin-bottom:14px}
  h1{font-size:20px;color:#c8a84e}
  .ok{color:#4ade80}.err{color:#f87171}
  button{background:#c8a84e;color:#1a1a1a;font-weight:700;border:none;border-radius:10px;padding:12px 20px;font-size:15px;cursor:pointer;width:100%}
  button:active{opacity:.8}
  code{background:#111;padding:2px 6px;border-radius:6px;font-size:13px}
  .row{display:flex;justify-content:space-between;padding:4px 0;font-size:14px}
  #msg{margin-top:10px;font-size:14px;min-height:20px}
</style></head><body>
<h1>🖨️ Proxy de impresión ESC/POS</h1>
<div class="card">
  <div class="row"><span>Estado</span><span class="ok">● Activo</span></div>
  <div class="row"><span>Impresora</span><span><code id="pip"></code></span></div>
  <div class="row"><span>Trabajos impresos</span><span id="jobs">0</span></div>
  <div class="row"><span>Último trabajo</span><span id="last">—</span></div>
</div>
<div class="card">
  <button onclick="testPrint()">🧪 Imprimir ticket de prueba</button>
  <div id="msg"></div>
</div>
<script>
async function refresh(){
  try{
    const r = await fetch('/health'); const d = await r.json();
    document.getElementById('pip').textContent = d.printerIp + ':' + d.printerPort;
    document.getElementById('jobs').textContent = d.jobCount;
    document.getElementById('last').textContent = d.lastJob ? (d.lastJob.ok ? '✔ ' : '✖ ') + new Date(d.lastJob.at).toLocaleTimeString() : '—';
  }catch(e){}
}
async function testPrint(){
  const m = document.getElementById('msg');
  m.textContent = 'Imprimiendo…'; m.className='';
  try{
    const r = await fetch('/print', { method:'POST' });
    const t = await r.text();
    m.textContent = r.ok ? '✔ Ticket de prueba enviado' : '✖ ' + t;
    m.className = r.ok ? 'ok' : 'err';
  }catch(e){ m.textContent = '✖ ' + e.message; m.className='err'; }
  refresh();
}
refresh(); setInterval(refresh, 5000);
</script>
</body></html>`;

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PROXY_PORT}`);

  if (req.method === "OPTIONS") {
    res.writeHead(204, CORS);
    res.end();
    return;
  }

  if (req.method === "GET" && url.pathname === "/panel") {
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8", ...CORS });
    res.end(PANEL_HTML);
    return;
  }

  if (req.method === "GET" && (url.pathname === "/" || url.pathname === "/health")) {
    json(res, 200, {
      ok: true,
      service: "escpos-proxy",
      printerIp: PRINTER_IP,
      printerPort: PRINTER_PORT,
      jobCount,
      lastJob,
    });
    return;
  }

  // La IP/puerto pueden venir en la query (los manda el POS desde su configuración)
  const ip = url.searchParams.get("ip") || PRINTER_IP;
  const port = Number(url.searchParams.get("port") || PRINTER_PORT);

  if (req.method === "POST" && url.pathname === "/print") {
    try {
      await sendToPrinter(ip, port, testTicketBytes());
      jobCount++;
      lastJob = { at: new Date().toISOString(), ok: true, bytes: 0, ip };
      json(res, 200, { ok: true });
    } catch (e) {
      lastJob = { at: new Date().toISOString(), ok: false, ip, error: e.message };
      json(res, 502, { ok: false, error: e.message });
    }
    return;
  }

  if (req.method === "POST" && url.pathname === "/") {
    try {
      const body = await readBody(req);
      if (!body.length) { json(res, 400, { ok: false, error: "Cuerpo vacío" }); return; }
      await sendToPrinter(ip, port, body);
      jobCount++;
      lastJob = { at: new Date().toISOString(), ok: true, bytes: body.length, ip };
      console.log(`[${new Date().toLocaleTimeString()}] ✔ Impreso: ${body.length} bytes → ${ip}:${port}`);
      json(res, 200, { ok: true, bytes: body.length });
    } catch (e) {
      lastJob = { at: new Date().toISOString(), ok: false, ip, error: e.message };
      console.error(`[${new Date().toLocaleTimeString()}] ✖ ${e.message}`);
      json(res, 502, { ok: false, error: e.message });
    }
    return;
  }

  json(res, 404, { ok: false, error: "Ruta no encontrada" });
});

server.listen(PROXY_PORT, () => {
  console.log("─".repeat(50));
  console.log("🖨️  Proxy de impresión ESC/POS — Esquites La Parroquia");
  console.log(`   Escuchando en   → http://localhost:${PROXY_PORT}`);
  console.log(`   Panel de control → http://localhost:${PROXY_PORT}/panel`);
  console.log(`   Impresora        → ${PRINTER_IP}:${PRINTER_PORT}`);
  console.log("─".repeat(50));
});
