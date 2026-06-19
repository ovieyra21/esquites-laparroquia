// fix-validator.js
const fs = require('fs');
const path = require('path');
const { glob } = require('glob');

// Busca todos los archivos .functions.ts en src/
const files = glob.sync('src/**/*.functions.ts');

if (files.length === 0) {
  console.log('❌ No se encontraron archivos .functions.ts');
  process.exit(0);
}

console.log(`📁 Encontrados ${files.length} archivos para procesar:\n`);

files.forEach(file => {
  try {
    const content = fs.readFileSync(file, 'utf8');
    const updated = content.replace(/\.inputValidator\(/g, '.validator(');
    
    if (content !== updated) {
      fs.writeFileSync(file, updated);
      console.log(`✅ Fixed: ${file}`);
    } else {
      console.log(`ℹ️  Sin cambios: ${file}`);
    }
  } catch (error) {
    console.log(`❌ Error en ${file}:`, error.message);
  }
});

console.log('\n🎉 ¡Proceso completado!');