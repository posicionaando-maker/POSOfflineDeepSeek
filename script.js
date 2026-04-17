// ============================================
// POS PRO - OFFLINE FIRST
// Funciona sin internet, sincroniza cuando hay conexión
// ============================================

// CONFIGURACIÓN
const FORZAR_DATOS_LOCALES = false;
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbz80b08ZfIu-rZ6BuBTHlNUaOb_hDbgBGXqGkzZYi3sycZ7bolCPEytl2Ujk9CJSw/exec';

// DATOS DE EMERGENCIA (si todo falla)
const productosData = [
    { id: 1, nombre: "Café Amelia", precio: 2.50, categoria: "bebidas", stock: 100, imagen: "fa-mug-hot" },
    { id: 2, nombre: "Café Latte", precio: 3.00, categoria: "bebidas", stock: 100, imagen: "fa-mug-hot" },
    { id: 3, nombre: "Capuchino", precio: 3.50, categoria: "bebidas", stock: 100, imagen: "fa-mug-hot" },
    { id: 4, nombre: "Té Verde", precio: 2.00, categoria: "bebidas", stock: 50, imagen: "fa-leaf" },
    { id: 5, nombre: "Sándwich de Pollo", precio: 5.50, categoria: "comidas", stock: 30, imagen: "fa-bread-slice" },
    { id: 6, nombre: "Sándwich Vegano", precio: 4.50, categoria: "comidas", stock: 25, imagen: "fa-seedling" },
    { id: 7, nombre: "Ensalada César", precio: 6.00, categoria: "comidas", stock: 20, imagen: "fa-salad" },
    { id: 8, nombre: "Pastel de Chocolate", precio: 3.00, categoria: "postres", stock: 40, imagen: "fa-cake-candles" },
    { id: 9, nombre: "Cheesecake", precio: 3.50, categoria: "postres", stock: 35, imagen: "fa-cake-candles" },
    { id: 10, nombre: "Galletas", precio: 1.50, categoria: "postres", stock: 60, imagen: "fa-cookie" },
    { id: 11, nombre: "Agua Mineral", precio: 1.00, categoria: "bebidas", stock: 200, imagen: "fa-bottle-water" },
    { id: 12, nombre: "Jugo Natural", precio: 2.50, categoria: "bebidas", stock: 45, imagen: "fa-apple-alt" }
];

// ESTADO GLOBAL
let carrito = [];
let productos = [];
let categoriaActual = 'todos';
let sincronizando = false; // Prevenir sincronizaciones simultáneas

// ============================================
// MATADOR DE SERVICE WORKERS (MEJORADO)
// ============================================
(async function matarServiceWorkers() {
    if ('serviceWorker' in navigator) {
        try {
            const registrations = await navigator.serviceWorker.getRegistrations();
            for (const registration of registrations) {
                console.log('🗑️ Desregistrando SW:', registration.scope);
                await registration.unregister();
            }
            // No recargar automáticamente para evitar loops
            if (registrations.length > 0) {
                console.log('✅ Service Workers eliminados correctamente');
            }
        } catch (error) {
            console.error('Error eliminando SW:', error);
        }
    }
})();

// ============================================
// FUNCIONES DE UTILIDAD
// ============================================
function mostrarCargando(mostrar) {
    const container = document.getElementById('lista-productos');
    if (!container) return;
    
    if (mostrar) {
        // Guardar contenido actual para restaurar después
        container.dataset.contenidoOriginal = container.innerHTML;
        container.innerHTML = `
            <div class="col-span-full text-center py-10 text-gray-500">
                <i class="fas fa-spinner fa-spin text-4xl mb-2"></i>
                <p>Cargando productos...</p>
            </div>
        `;
    } else if (container.dataset.contenidoOriginal) {
        // Restaurar solo si no se ha modificado después
        if (container.innerHTML.includes('Cargando productos')) {
            container.innerHTML = container.dataset.contenidoOriginal;
        }
        delete container.dataset.contenidoOriginal;
    }
}

function mostrarToast(mensaje, tipo = 'success') {
    const toast = document.getElementById('toast-message');
    if (!toast) {
        console.warn('Toast container no encontrado');
        return;
    }
    
    const toastText = document.getElementById('toast-text');
    const icon = toast.querySelector('i');
    
    if (toastText) toastText.textContent = mensaje;
    
    const iconos = {
        success: 'fa-check-circle text-green-400',
        error: 'fa-exclamation-circle text-red-400',
        warning: 'fa-exclamation-triangle text-yellow-400',
        info: 'fa-info-circle text-blue-400'
    };
    
    if (icon) icon.className = `fas ${iconos[tipo] || iconos.success} mr-2`;
    
    // Limpiar timeout anterior si existe
    if (window.toastTimeout) clearTimeout(window.toastTimeout);
    
    toast.classList.remove('hidden', 'opacity-0');
    toast.classList.add('opacity-100');
    
    window.toastTimeout = setTimeout(() => {
        toast.classList.add('hidden');
        toast.classList.remove('opacity-100');
    }, 3000);
}

function mostrarError(mensaje, recargar = true) {
    const container = document.getElementById('lista-productos');
    if (container) {
        container.innerHTML = `
            <div class="col-span-full text-center py-10 text-red-500">
                <i class="fas fa-exclamation-triangle text-4xl mb-2"></i>
                <p class="font-semibold">${mensaje}</p>
                ${recargar ? `
                <button onclick="location.reload()" class="mt-4 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition">
                    <i class="fas fa-sync-alt mr-2"></i>Recargar
                </button>
                ` : ''}
            </div>
        `;
    }
}

// Verificar conexión real (no solo navigator.onLine)
async function verificarConexionReal() {
    if (!navigator.onLine) return false;
    
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        
        const response = await fetch('https://www.google.com/favicon.ico', {
            method: 'HEAD',
            mode: 'no-cors',
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        return true;
    } catch (error) {
        return false;
    }
}

// ============================================
// CARGA DE PRODUCTOS (offline-first mejorado)
// ============================================
async function cargarProductosDesdeGoogle() {
    try {
        console.log('🔄 Cargando desde Google Sheets...');
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);
        
        const response = await fetch(APPS_SCRIPT_URL, {
            signal: controller.signal,
            cache: 'no-store'
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        
        const data = await response.json();
        
        // Validar estructura de datos
        if (data && data.success && Array.isArray(data.productos) && data.productos.length > 0) {
            // Validar que cada producto tenga los campos necesarios
            const productosValidos = data.productos.every(p => 
                p.id && p.nombre && typeof p.precio === 'number' && p.categoria
            );
            
            if (!productosValidos) {
                console.warn('Datos de productos inválidos desde Google');
                return false;
            }
            
            productos = data.productos;
            localStorage.setItem('productos', JSON.stringify(productos));
            localStorage.setItem('ultimaSincronizacion', Date.now());
            console.log(`✅ ${productos.length} productos desde Google Sheets`);
            return true;
        }
        return false;
    } catch (error) {
        console.error('Error cargando desde Google:', error);
        return false;
    }
}

function cargarProductosLocales() {
    const guardados = localStorage.getItem('productos');
    if (guardados) {
        try {
            productos = JSON.parse(guardados);
            if (Array.isArray(productos) && productos.length > 0) {
                console.log(`📀 ${productos.length} productos desde localStorage`);
                return true;
            }
        } catch (error) {
            console.error('Error parsing productos locales:', error);
        }
    }
    return false;
}

function cargarProductosEmergencia() {
    productos = [...productosData];
    console.log(`🚨 ${productos.length} productos de emergencia cargados`);
    // Guardar emergencia en localStorage para futuras cargas
    localStorage.setItem('productos', JSON.stringify(productos));
}

// ============================================
// RENDERIZADO (MEJORADO)
// ============================================
function renderizarCategorias() {
    const categorias = ['todos', ...new Set(productos.map(p => p.categoria))];
    const container = document.getElementById('categorias');
    if (!container) return;
    
    container.innerHTML = categorias.map(cat => `
        <button data-categoria="${cat}" 
                class="categoria-btn ${categoriaActual === cat ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'} 
                       px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition">
            ${cat === 'todos' ? 'Todos' : cat.charAt(0).toUpperCase() + cat.slice(1)}
        </button>
    `).join('');
    
    // Agregar event listeners
    document.querySelectorAll('.categoria-btn').forEach(btn => {
        btn.removeEventListener('click', manejadorCategoria);
        btn.addEventListener('click', manejadorCategoria);
    });
}

function manejadorCategoria(event) {
    const categoria = event.currentTarget.dataset.categoria;
    if (categoria) filtrarPorCategoria(categoria);
}

function renderizarProductos() {
    const container = document.getElementById('lista-productos');
    if (!container) return;
    
    if (!productos || productos.length === 0) {
        container.innerHTML = '<div class="col-span-full text-center py-10 text-gray-500">No hay productos disponibles</div>';
        return;
    }
    
    const filtrados = categoriaActual === 'todos' 
        ? productos 
        : productos.filter(p => p.categoria === categoriaActual);
    
    if (filtrados.length === 0) {
        container.innerHTML = '<div class="col-span-full text-center py-10 text-gray-500">No hay productos en esta categoría</div>';
        return;
    }
    
    container.innerHTML = filtrados.map(producto => `
        <div class="product-card bg-white rounded-lg shadow-md p-4 cursor-pointer hover:shadow-lg transition transform hover:scale-105" 
             data-producto-id="${producto.id}">
            <div class="text-center">
                <i class="fas ${producto.imagen || 'fa-box'} text-4xl text-indigo-600 mb-2"></i>
                <h3 class="font-semibold text-gray-800">${escapeHtml(producto.nombre)}</h3>
                <p class="text-indigo-600 font-bold mt-2">$${producto.precio.toFixed(2)}</p>
                <p class="text-xs text-gray-400 mt-1">Stock: ${producto.stock}</p>
            </div>
        </div>
    `).join('');
    
    // Agregar event listeners
    document.querySelectorAll('.product-card').forEach(card => {
        card.removeEventListener('click', manejadorProducto);
        card.addEventListener('click', manejadorProducto);
    });
}

function manejadorProducto(event) {
    const card = event.currentTarget;
    const productoId = parseInt(card.dataset.productoId);
    if (productoId) agregarAlCarrito(productoId);
}

// Escape HTML para prevenir XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ============================================
// FUNCIONES DEL CARRITO (MEJORADAS)
// ============================================
function agregarAlCarrito(productoId) {
    const producto = productos.find(p => p.id === productoId);
    if (!producto) {
        mostrarToast('Producto no encontrado', 'error');
        return;
    }
    
    if (producto.stock <= 0) {
        mostrarToast('Sin stock disponible', 'error');
        return;
    }
    
    const existente = carrito.find(i => i.id === productoId);
    if (existente) {
        if (existente.cantidad < producto.stock) {
            existente.cantidad++;
            mostrarToast(`+1 ${producto.nombre}`, 'success');
        } else {
            mostrarToast('Stock insuficiente', 'error');
            return;
        }
    } else {
        carrito.push({
            id: producto.id,
            nombre: producto.nombre,
            precio: producto.precio,
            cantidad: 1,
            imagen: producto.imagen
        });
        mostrarToast(`${producto.nombre} agregado`, 'success');
    }
    
    guardarCarrito();
    actualizarCarritoUI();
}

function actualizarCarritoUI() {
    const total = carrito.reduce((s, i) => s + (i.precio * i.cantidad), 0);
    const items = carrito.reduce((s, i) => s + i.cantidad, 0);
    
    const totalDisplay = document.getElementById('total-display');
    const cartCount = document.getElementById('cart-count');
    const itemsCount = document.getElementById('items-count');
    
    if (totalDisplay) totalDisplay.textContent = total.toFixed(2);
    if (cartCount) cartCount.textContent = items;
    if (itemsCount) itemsCount.textContent = items;
    
    // Actualizar badge de pendientes
    actualizarIndicadorPendientes();
}

function guardarCarrito() {
    try {
        localStorage.setItem('carrito', JSON.stringify(carrito));
    } catch (error) {
        console.error('Error guardando carrito:', error);
        mostrarToast('Error al guardar carrito', 'error');
    }
}

function cargarCarritoDesdeLocalStorage() {
    try {
        const guardado = localStorage.getItem('carrito');
        if (guardado) {
            carrito = JSON.parse(guardado);
            // Validar que el carrito sea un array
            if (!Array.isArray(carrito)) carrito = [];
        }
    } catch (error) {
        console.error('Error cargando carrito:', error);
        carrito = [];
    }
}

function reiniciar() {
    if (carrito.length > 0 && confirm('¿Estás seguro de vaciar el carrito?')) {
        carrito = [];
        guardarCarrito();
        actualizarCarritoUI();
        mostrarToast('Carrito vaciado', 'warning');
    }
}

// ============================================
// REGISTRAR VENTA EN GOOGLE (mejorado)
// ============================================
async function registrarVentaEnGoogle(venta) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    
    try {
        const response = await fetch(APPS_SCRIPT_URL, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({
                accion: 'registrar_venta',
                total: venta.total,
                cantidadItems: venta.itemCount,
                metodoPago: venta.metodoPago,
                items: venta.items,
                timestamp: new Date().toISOString()
            }),
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        
        const resultado = await response.json();
        return resultado;
        
    } catch (error) {
        clearTimeout(timeoutId);
        console.log('📡 Sin conexión o timeout, se guardará localmente:', error.message);
        return { success: false, error: error.message, offline: true };
    }
}

// ============================================
// COBRAR - GUARDA LOCAL PRIMERO (mejorado)
// ============================================
async function cobrar() {
    if (carrito.length === 0) {
        mostrarToast('Carrito vacío', 'error');
        return;
    }
    
    const total = carrito.reduce((s, i) => s + (i.precio * i.cantidad), 0);
    const cantidadItems = carrito.reduce((s, i) => s + i.cantidad, 0);
    
    // Crear modal personalizado en lugar de prompt
    const metodoPago = await mostrarModalPago();
    if (!metodoPago) return;
    
    // Deshabilitar botón
    const btnCobrar = document.querySelector('[data-action="cobrar"]');
    if (btnCobrar) {
        btnCobrar.disabled = true;
        btnCobrar.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Procesando...';
    }
    
    // 1️⃣ GUARDAR LOCALMENTE PRIMERO (SIEMPRE)
    const ventaPendiente = {
        id: Date.now(),
        fecha: new Date().toISOString(),
        total: total,
        itemCount: cantidadItems,
        metodoPago: metodoPago,
        items: carrito.map(i => ({
            id: i.id,
            nombre: i.nombre,
            cantidad: i.cantidad,
            precio: i.precio
        }))
    };
    
    guardarVentaPendiente(ventaPendiente);
    
    // 2️⃣ MOSTRAR COMPROBANTE AL USUARIO
    mostrarComprobante(carrito, total, metodoPago);
    
    // 3️⃣ VACIAR CARRITO
    carrito = [];
    guardarCarrito();
    actualizarCarritoUI();
    
    // Cerrar modal si está abierto
    const modal = document.getElementById('cart-modal');
    if (modal && !modal.classList.contains('hidden')) {
        modal.classList.add('hidden');
    }
    
    const pendientes = obtenerCantidadPendientes();
    mostrarToast(`Venta guardada. ${pendientes} pendiente(s)`, 'success');
    
    // 4️⃣ REINTENTAR SINCRONIZAR EN SEGUNDO PLANO
    setTimeout(() => {
        sincronizarVentasPendientes();
    }, 1000);
    
    // Rehabilitar botón
    if (btnCobrar) {
        btnCobrar.disabled = false;
        btnCobrar.innerHTML = '<i class="fas fa-credit-card mr-2"></i>Cobrar';
    }
}

// Modal de pago personalizado
function mostrarModalPago() {
    return new Promise((resolve) => {
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
        modal.innerHTML = `
            <div class="bg-white rounded-lg p-6 max-w-sm w-full mx-4">
                <h3 class="text-lg font-semibold mb-4">Método de pago</h3>
                <div class="space-y-2">
                    <button data-pago="Efectivo" class="w-full text-left px-4 py-2 hover:bg-gray-100 rounded">💵 Efectivo</button>
                    <button data-pago="Tarjeta" class="w-full text-left px-4 py-2 hover:bg-gray-100 rounded">💳 Tarjeta</button>
                    <button data-pago="Transferencia" class="w-full text-left px-4 py-2 hover:bg-gray-100 rounded">🏦 Transferencia</button>
                    <button data-cancelar class="w-full text-left px-4 py-2 text-red-600 hover:bg-gray-100 rounded mt-2">Cancelar</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        const handleClick = (e) => {
            const pago = e.target.dataset.pago;
            if (pago) {
                modal.remove();
                resolve(pago);
            } else if (e.target.dataset.cancelar) {
                modal.remove();
                resolve(null);
            }
        };
        
        modal.addEventListener('click', handleClick);
    });
}

function mostrarComprobante(carrito, total, metodoPago) {
    const resumen = carrito.map(i => `${i.cantidad}x ${i.nombre} - $${(i.precio * i.cantidad).toFixed(2)}`).join('\n');
    // Usar alert por simplicidad, pero idealmente sería un modal
    alert(`✅ ¡VENTA REGISTRADA!\n\n${resumen}\n\nTotal: $${total.toFixed(2)}\nPago: ${metodoPago}\n\n🔄 Se sincronizará automáticamente cuando haya internet.`);
}

// ============================================
// GESTIÓN DE VENTAS PENDIENTES (mejorada)
// ============================================
function guardarVentaPendiente(venta) {
    try {
        const pendientes = JSON.parse(localStorage.getItem('ventasPendientes') || '[]');
        pendientes.push(venta);
        localStorage.setItem('ventasPendientes', JSON.stringify(pendientes));
        console.log(`💾 Venta pendiente #${venta.id}. Total pendientes: ${pendientes.length}`);
        actualizarIndicadorPendientes();
    } catch (error) {
        console.error('Error guardando venta pendiente:', error);
        mostrarToast('Error al guardar la venta', 'error');
    }
}

function obtenerCantidadPendientes() {
    try {
        const pendientes = JSON.parse(localStorage.getItem('ventasPendientes') || '[]');
        return Array.isArray(pendientes) ? pendientes.length : 0;
    } catch (error) {
        return 0;
    }
}

function actualizarIndicadorPendientes() {
    const pendientes = obtenerCantidadPendientes();
    const badge = document.getElementById('pendientes-badge');
    if (badge) {
        if (pendientes > 0) {
            badge.textContent = pendientes > 99 ? '99+' : pendientes;
            badge.classList.remove('hidden');
        } else {
            badge.classList.add('hidden');
        }
    }
}

// ============================================
// SINCRONIZAR VENTAS PENDIENTES (mejorada)
// ============================================
async function sincronizarVentasPendientes() {
    // Evitar sincronizaciones simultáneas
    if (sincronizando) {
        console.log('⏳ Sincronización en curso, omitiendo...');
        return;
    }
    
    const pendientes = JSON.parse(localStorage.getItem('ventasPendientes') || '[]');
    
    if (pendientes.length === 0) return;
    
    // Verificar conexión REAL
    const tieneConexion = await verificarConexionReal();
    if (!tieneConexion) {
        console.log(`📡 Sin conexión real. ${pendientes.length} ventas pendientes`);
        return;
    }
    
    sincronizando = true;
    console.log(`🔄 Sincronizando ${pendientes.length} ventas...`);
    mostrarToast(`Sincronizando ${pendientes.length} venta(s)...`, 'info');
    
    let sincronizadas = 0;
    let errores = 0;
    const nuevasPendientes = [];
    
    for (const venta of pendientes) {
        try {
            const resultado = await registrarVentaEnGoogle({
                total: venta.total,
                itemCount: venta.itemCount,
                metodoPago: venta.metodoPago,
                items: venta.items
            });
            
            if (resultado && resultado.success) {
                sincronizadas++;
                console.log(`✅ Venta ${venta.id} sincronizada`);
            } else {
                errores++;
                nuevasPendientes.push(venta);
                console.log(`❌ Venta ${venta.id} no sincronizada:`, resultado?.error || 'Error desconocido');
            }
        } catch (error) {
            console.error(`❌ Error sincronizando venta ${venta.id}:`, error);
            errores++;
            nuevasPendientes.push(venta);
        }
        
        // Pequeña pausa entre requests para no sobrecargar
        await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // Guardar las que no se pudieron
    localStorage.setItem('ventasPendientes', JSON.stringify(nuevasPendientes));
    actualizarIndicadorPendientes();
    
    sincronizando = false;
    
    if (sincronizadas > 0) {
        mostrarToast(`✅ ${sincronizadas} venta(s) sincronizada(s)`, 'success');
    }
    
    if (nuevasPendientes.length > 0) {
        mostrarToast(`⚠️ ${nuevasPendientes.length} venta(s) pendiente(s)`, 'warning');
    }
    
    return { sincronizadas, errores, pendientes: nuevasPendientes.length };
}

// ============================================
// DETECTOR DE CONEXIÓN (mejorado)
// ============================================
function iniciarDetectorDeConexion() {
    let ultimaConexion = navigator.onLine;
    
    window.addEventListener('online', async () => {
        console.log('🌐 Conexión detectada!');
        // Esperar un momento para asegurar conectividad real
        setTimeout(async () => {
            const tieneConexionReal = await verificarConexionReal();
            if (tieneConexionReal) {
                mostrarToast('Conexión recuperada, sincronizando...', 'success');
                await sincronizarVentasPendientes();
                // También intentar sincronizar productos
                const exito = await cargarProductosDesdeGoogle();
                if (exito) {
                    renderizarCategorias();
                    renderizarProductos();
                    mostrarToast('Productos actualizados', 'success');
                }
            }
        }, 1000);
    });
    
    window.addEventListener('offline', () => {
        console.log('📡 Sin conexión a internet');
        mostrarToast('Modo offline - Las ventas se guardarán localmente', 'warning');
        ultimaConexion = false;
    });
    
    // Verificar periódicamente la conexión (cada 30 segundos)
    setInterval(async () => {
        if (navigator.onLine) {
            const tieneConexionReal = await verificarConexionReal();
            if (tieneConexionReal && !sincronizando) {
                await sincronizarVentasPendientes();
            }
        }
    }, 30000);
}

// ============================================
// VER VENTAS PENDIENTES (mejorado)
// ============================================
function verVentasPendientes() {
    const pendientes = JSON.parse(localStorage.getItem('ventasPendientes') || '[]');
    
    if (pendientes.length === 0) {
        alert('📭 No hay ventas pendientes');
        return;
    }
    
    let mensaje = `📋 VENTAS PENDIENTES (${pendientes.length})\n\n`;
    pendientes.forEach((v, i) => {
        const fecha = new Date(v.fecha);
        mensaje += `${i+1}. $${v.total.toFixed(2)} - ${v.metodoPago} - ${fecha.toLocaleString()}\n`;
        mensaje += `   Items: ${v.items.length}\n`;
    });
    mensaje += `\n🔄 Se sincronizarán automáticamente cuando haya internet.`;
    alert(mensaje);
}

// ============================================
// OTRAS FUNCIONES
// ============================================
function filtrarPorCategoria(categoria) {
    categoriaActual = categoria;
    renderizarCategorias();
    renderizarProductos();
}

async function importarDesdeGoogle() {
    mostrarToast('Sincronizando productos...', 'info');
    mostrarCargando(true);
    
    const exito = await cargarProductosDesdeGoogle();
    if (exito) {
        renderizarCategorias();
        renderizarProductos();
        mostrarToast(`${productos.length} productos sincronizados`, 'success');
    } else {
        mostrarToast('Error al sincronizar productos', 'error');
    }
    mostrarCargando(false);
}

function verCarrito() {
    const modal = document.getElementById('cart-modal');
    if (modal) {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
        renderizarCarritoModal();
    }
}

function cerrarModal() {
    const modal = document.getElementById('cart-modal');
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }
}

function renderizarCarritoModal() {
    const container = document.getElementById('cart-items-list');
    if (!container) return;
    
    const total = carrito.reduce((s, i) => s + (i.precio * i.cantidad), 0);
    
    if (carrito.length === 0) {
        container.innerHTML = '<div class="text-center py-8 text-gray-500">Carrito vacío</div>';
    } else {
        container.innerHTML = carrito.map(item => `
            <div class="flex justify-between items-center mb-4 pb-4 border-b">
                <div class="flex-1">
                    <p class="font-semibold">${escapeHtml(item.nombre)}</p>
                    <p class="text-sm text-gray-500">$${item.precio.toFixed(2)} c/u</p>
                </div>
                <div class="flex items-center gap-3">
                    <button data-action="modificar" data-id="${item.id}" data-cambio="-1" class="bg-gray-200 w-8 h-8 rounded-full hover:bg-gray-300 transition">-</button>
                    <span class="min-w-[2rem] text-center">${item.cantidad}</span>
                    <button data-action="modificar" data-id="${item.id}" data-cambio="1" class="bg-gray-200 w-8 h-8 rounded-full hover:bg-gray-300 transition">+</button>
                    <button data-action="eliminar" data-id="${item.id}" class="text-red-500 hover:text-red-700 transition">🗑️</button>
                </div>
            </div>
        `).join('');
    }
    
    const cartTotal = document.getElementById('cart-total');
    if (cartTotal) cartTotal.textContent = total.toFixed(2);
    
    // Agregar event listeners
    document.querySelectorAll('[data-action="modificar"]').forEach(btn => {
        btn.removeEventListener('click', manejadorModificar);
        btn.addEventListener('click', manejadorModificar);
    });
    
    document.querySelectorAll('[data-action="eliminar"]').forEach(btn => {
        btn.removeEventListener('click', manejadorEliminar);
        btn.addEventListener('click', manejadorEliminar);
    });
}

function manejadorModificar(event) {
    const btn = event.currentTarget;
    const productoId = parseInt(btn.dataset.id);
    const cambio = parseInt(btn.dataset.cambio);
    if (productoId && cambio) modificarCantidad(productoId, cambio);
}

function manejadorEliminar(event) {
    const btn = event.currentTarget;
    const productoId = parseInt(btn.dataset.id);
    if (productoId) eliminarDelCarrito(productoId);
}

function modificarCantidad(productoId, cambio) {
    const itemIndex = carrito.findIndex(i => i.id === productoId);
    if (itemIndex === -1) return;
    
    const item = carrito[itemIndex];
    const producto = productos.find(p => p.id === productoId);
    
    if (producto) {
        const nueva = item.cantidad + cambio;
        if (nueva <= 0) {
            eliminarDelCarrito(productoId);
        } else if (nueva <= producto.stock) {
            item.cantidad = nueva;
            guardarCarrito();
            actualizarCarritoUI();
            renderizarCarritoModal();
        } else {
            mostrarToast('Stock insuficiente', 'error');
        }
    }
}

function eliminarDelCarrito(productoId) {
    carrito = carrito.filter(i => i.id !== productoId);
    guardarCarrito();
    actualizarCarritoUI();
    renderizarCarritoModal();
}

// ============================================
// INICIALIZACIÓN PRINCIPAL (mejorada)
// ============================================
async function init() {
    console.log('🚀 Iniciando POS Pro (Offline First)...');
    mostrarCargando(true);
    
    try {
        // Verificar si hay elementos necesarios en el DOM
        const elementosNecesarios = ['lista-productos', 'categorias'];
        const missingElements = elementosNecesarios.filter(id => !document.getElementById(id));
        
        if (missingElements.length > 0) {
            console.error('Elementos HTML faltantes:', missingElements);
            mostrarError('Error de configuración de la página', false);
            return;
        }
        
        // 1. CARGAR PRODUCTOS (local primero si existe)
        if (FORZAR_DATOS_LOCALES) {
            console.log('📦 Modo datos locales forzado');
            cargarProductosEmergencia();
        } else {
            // Intentar Google Sheets primero
            const tieneConexion = await verificarConexionReal();
            
            if (tieneConexion) {
                const exito = await cargarProductosDesdeGoogle();
                if (!exito) {
                    // Fallback a localStorage
                    const localOk = cargarProductosLocales();
                    if (!localOk) {
                        cargarProductosEmergencia();
                        mostrarToast('Usando datos de emergencia', 'warning');
                    } else {
                        mostrarToast('Usando datos guardados localmente', 'info');
                    }
                } else {
                    mostrarToast('Productos sincronizados', 'success');
                }
            } else {
                const localOk = cargarProductosLocales();
                if (!localOk) {
                    cargarProductosEmergencia();
                    mostrarToast('Sin conexión - Usando datos locales', 'warning');
                } else {
                    mostrarToast('Modo offline - Usando datos guardados', 'info');
                }
            }
        }
        
        // 2. CARGAR CARRITO GUARDADO
        cargarCarritoDesdeLocalStorage();
        
        // 3. RENDERIZAR INTERFAZ
        renderizarCategorias();
        renderizarProductos();
        actualizarCarritoUI();
        
        // 4. SINCRONIZAR VENTAS PENDIENTES (si hay internet)
        const tieneConexion = await verificarConexionReal();
        if (tieneConexion) {
            await sincronizarVentasPendientes();
        } else {
            const pendientes = obtenerCantidadPendientes();
            if (pendientes > 0) {
                mostrarToast(`${pendientes} venta(s) pendiente(s) - Sin conexión`, 'warning');
            }
        }
        
        // 5. INICIAR DETECTOR DE CONEXIÓN
        iniciarDetectorDeConexion();
        
        // 6. ACTUALIZAR BADGE DE PENDIENTES
        actualizarIndicadorPendientes();
        
        // 7. Agregar event listener para cerrar modal al hacer clic fuera
        const modal = document.getElementById('cart-modal');
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) cerrarModal();
            });
        }
        
        // 8. FINALIZAR
        mostrarCargando(false);
        console.log(`🎉 Inicialización completa - ${productos.length} productos`);
        
        const pendientes = obtenerCantidadPendientes();
        if (pendientes > 0) {
            mostrarToast(`${productos.length} productos listos - ${pendientes} ventas pendientes`, 'info');
        } else {
            mostrarToast(`${productos.length} productos listos`, 'success');
        }
        
    } catch (error) {
        console.error('❌ Error en init:', error);
        mostrarCargando(false);
        mostrarError('Error al cargar la aplicación: ' + error.message, true);
    }
}

// ============================================
// EXPONER FUNCIONES GLOBALES
// ============================================
window.agregarAlCarrito = agregarAlCarrito;
window.filtrarPorCategoria = filtrarPorCategoria;
window.reiniciar = reiniciar;
window.cobrar = cobrar;
window.importarDesdeGoogle = importarDesdeGoogle;
window.verCarrito = verCarrito;
window.cerrarModal = cerrarModal;
window.modificarCantidad = modificarCantidad;
window.eliminarDelCarrito = eliminarDelCarrito;
window.verVentasPendientes = verVentasPendientes;

// ============================================
// INICIAR
// ============================================
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}