const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');
const { randomUUID } = require('crypto');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'lovable.db');

function uuid() { return randomUUID(); }

(async () => {
  const SQL = await initSqlJs();
  let db;
  if (fs.existsSync(DB_PATH)) {
    const buffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(buffer);
  } else {
    db = new SQL.Database();
  }

  const run = (sql, params = []) => db.run(sql, params);
  const save = () => fs.writeFileSync(DB_PATH, Buffer.from(db.export()));

  const categories = [
    { name: 'Esquites', icon: '🌽' },
    { name: 'Bebidas', icon: '🥤' },
    { name: 'Botanas', icon: '🍿' },
    { name: 'Tacos', icon: '🌮' },
    { name: 'Postres', icon: '🍨' },
    { name: 'Combos', icon: '📦' },
  ];

  const catIds = {};
  for (const cat of categories) {
    const id = uuid();
    run(`INSERT OR IGNORE INTO categories (id, name, icon, created_at) VALUES (?, ?, ?, ?)`, [id, cat.name, cat.icon, new Date().toISOString()]);
    catIds[cat.name] = id;
  }

  const products = [
    { name: 'Esquite Clásico', price: 35, category: 'Esquites', emoji: '🌽', desc: 'Elote desgranado con mayonesa, queso y chile' },
    { name: 'Esquite con Todo', price: 45, category: 'Esquites', emoji: '🌟', desc: 'Esquite con crema, mayonesa, queso, chile, limón y cueritos' },
    { name: 'Vaso de Elote', price: 30, category: 'Esquites', emoji: '🫘', desc: 'Elote en vaso con tus toppings favoritos' },
    { name: 'Elote Asado', price: 40, category: 'Esquites', emoji: '🔥', desc: 'Elote asado con mantequilla, crema y queso' },
    { name: 'Tostilocos', price: 50, category: 'Botanas', emoji: '🍟', desc: 'Tostitos con cueritos, cacahuate, jícama, pepino y chamoy' },
    { name: 'Dorilocos', price: 50, category: 'Botanas', emoji: '🫓', desc: 'Doritos con cueritos, cacahuate, jícama, pepino y chamoy' },
    { name: 'Papas Locas', price: 45, category: 'Botanas', emoji: '🥔', desc: 'Papas fritas con cueritos, queso y chamoy' },
    { name: 'Cueritos Solos', price: 25, category: 'Botanas', emoji: '🐷', desc: 'Cueritos en vinagre con chile' },
    { name: 'Coca Cola 600ml', price: 20, category: 'Bebidas', emoji: '🥤', desc: 'Coca Cola 600ml' },
    { name: 'Agua Embotellada', price: 15, category: 'Bebidas', emoji: '💧', desc: 'Agua natural 600ml' },
    { name: 'Jugo de Naranja', price: 25, category: 'Bebidas', emoji: '🍊', desc: 'Jugo de naranja natural' },
    { name: 'Refresco Lata', price: 15, category: 'Bebidas', emoji: '🥫', desc: 'Refresco en lata 355ml' },
    { name: 'Agua Fresca', price: 20, category: 'Bebidas', emoji: '🫗', desc: 'Agua fresca de horchata o jamaica' },
    { name: 'Taco de Canasta', price: 12, category: 'Tacos', emoji: '🌮', desc: 'Taco de canasta (papa, frijol o chicharrón)' },
    { name: 'Helado de Garrafa', price: 30, category: 'Postres', emoji: '🍦', desc: 'Helado de garrafa (limón, fresa, vainilla)' },
    { name: 'Combo Esquite + Bebida', price: 50, category: 'Combos', emoji: '📦', desc: 'Esquite clásico + refresco lata' },
    { name: 'Combo Tostilocos + Bebida', price: 60, category: 'Combos', emoji: '📦', desc: 'Tostilocos + refresco lata' },
  ];

  for (const p of products) {
    const id = uuid();
    run(`INSERT OR IGNORE INTO products (id, name, price, category_id, active, description, emoji, display_order, created_at) VALUES (?, ?, ?, ?, 1, ?, ?, ?, ?)`,
      [id, p.name, p.price, catIds[p.category], p.desc, p.emoji, 0, new Date().toISOString()]);
  }

  save();
  console.log('✅ Categorías y productos insertados correctamente');
})();
