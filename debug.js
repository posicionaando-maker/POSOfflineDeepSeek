// ============================================
// DIAGNÓSTICO - Ver qué está pasando
// ============================================

// Mostrar logs en la página (para móviles)
function logEnPantalla(mensaje, tipo = 'info') {
    const div = document.createElement('div');
    div.style.cssText = `
        position: fixed;
        bottom: 10px;
        left: 10px;
        right: 10px;
        background: ${tipo === 'error' ? 'red' : tipo === 'success' ? 'green' : 'black'};
        color: white;
        padding: 8px;
        font-size: 12px;
        z-index: 9999;
        border-radius: 5px;
        text-align: center;
        opacity: 0.9;
    `;
    div.textContent = `🐛 ${mensaje}`;
    document.body.appendChild(div);
    console.log(mensaje);
    
    setTimeout(() => div.remove(), 5000);
}

// Probar conexión a Google Apps Script
async function probarConexion() {
    logEnPantalla('Probando conexión a Google Sheets...');
    
    const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzhA3elNOP64nGjVKZyO5t3a6jbqgxhuvBOrTbIxYT7i8NuuoL7XznhAYm4wqztND4F/exec';
    
    try {
        logEnPantalla('Enviando petición a: ' + APPS_SCRIPT_URL);
        const response = await fetch(APPS_SCRIPT_URL);
        logEnPantalla('Respuesta recibida. Status: ' + response.status);
        
        const data = await response.json();
        logEnPantalla('Datos recibidos: ' + (data.productos ? data.productos.length + ' productos' : 'sin productos'));
        
        if (data.productos && data.productos.length > 0) {
            logEnPantalla('✅ CONEXIÓN OK - ' + data.productos.length + ' productos', 'success');
            return data.productos;
        } else {
            logEnPantalla('⚠️ No hay productos en la respuesta', 'error');
            return null;
        }
    } catch (error) {
        logEnPantalla('❌ ERROR: ' + error.message, 'error');
        return null;
    }
}

// Cargar productos con fallback
async function cargarProductosConFallback() {
    // Intentar desde Google Sheets
    let productos = await probarConexion();
    
    if (productos && productos.length > 0) {
        localStorage.setItem('productos_backup', JSON.stringify(productos));
        logEnPantalla('✅ Productos guardados en backup local', 'success');
        return productos;
    }
    
    // Fallback: usar datos de emergencia
    logEnPantalla('⚠️ Usando datos de emergencia', 'warning');
    return [
        { id: 1, nombre: "Café Americano", precio: 2.50, categoria: "bebidas", stock: 100, imagen: "fa-mug-hot" },
        { id: 2, nombre: "Café Latte", precio: 3.00, categoria: "bebidas", stock: 100, imagen: "fa-mug-hot" },
        { id: 3, nombre: "Capuchino", precio: 3.50, categoria: "bebidas", stock: 100, imagen: "fa-mug-hot" }
    ];
}

// Ejecutar diagnóstico automático
window.addEventListener('load', async () => {
    logEnPantalla('🚀 Iniciando diagnóstico...');
    const productos = await cargarProductosConFallback();
    logEnPantalla('📦 Total productos: ' + productos.length);
    
    // Mostrar en la consola
    console.table(productos);
});