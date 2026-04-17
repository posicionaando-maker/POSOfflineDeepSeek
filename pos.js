// ============================================
// POS PRO - OFFLINE FIRST (VERSIÓN COMPLETA)
// ============================================

// CONFIGURACIÓN
const FORZAR_DATOS_LOCALES = false;
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbz80b08ZfIu-rZ6BuBTHlNUaOb_hDbgBGXqGkzZYi3sycZ7bolCPEytl2Ujk9CJSw/exec';

// DATOS DE EMERGENCIA
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
let sincronizando = false;
let terminoBusqueda = '';
let ventasDelDia = [];

// ============================================
// FUNCIONES DE UTILIDAD
// ============================================
function mostrarCargando(mostrar) {
    if (typeof mostrarLoading !== 'undefined') {
        mostrarLoading(mostrar);
    }
}

function mostrarToast(mensaje, tipo = 'success') {
    const toast = document.getElementById('toast-message');
    if (!toast) {
        console.log(`📢 ${tipo}: ${mensaje}`);
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
    
    if (icon) icon.className = `fas ${iconos[tipo] || iconos.success} mr-3`;
    
    if (window.toastTimeout) clearTimeout(window.toastTimeout);
    
    toast.classList.remove('hidden', 'opacity-0');
    toast.classList.add('opacity-100');
    
    // Reproducir sonido según tipo
    if (tipo === 'success') {
        try { reproducirSonido('success'); } catch(e) {}
    } else if (tipo === 'info') {
        try { reproducirSonido('add'); } catch(e) {}
    }
    
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

async function verificarConexionReal() {
    if (!navigator.onLine) return false;
    
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        
        await fetch('https://www.google.com/favicon.ico', {
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

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ============================================
// CARGA DE PRODUCTOS
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
        
        if (data && data.success && Array.isArray(data.productos) && data.productos.length > 0) {
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
    localStorage.setItem('productos', JSON.stringify(productos));
}

// ============================================
// BÚSQUEDA DE PRODUCTOS
// ============================================
function filtrarProductosPorBusqueda(termino) {
    terminoBusqueda = termino.toLowerCase().trim();
    const searchResults = document.getElementById('search-results');
    const searchCount = document.getElementById('search-count');
    
    if (terminoBusqueda) {
        const filtrados = productos.filter(p => 
            p.nombre.toLowerCase().includes(terminoBusqueda)
        );
        if (searchCount) searchCount.textContent = filtrados.length;
        if (searchResults) searchResults.classList.remove('hidden');
    } else {
        if (searchResults) searchResults.classList.add('hidden');
    }
    
    renderizarProductos();
}

function obtenerProductosFiltrados() {
    let filtrados = categoriaActual === 'todos' 
        ? productos 
        : productos.filter(p => p.categoria === categoriaActual);
    
    if (terminoBusqueda) {
        filtrados = filtrados.filter(p => 
            p.nombre.toLowerCase().includes(terminoBusqueda)
        );
    }
    
    return filtrados;
}

// ============================================
// RENDERIZADO
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
    
    const filtrados = obtenerProductosFiltrados();
    
    if (filtrados.length === 0) {
        container.innerHTML = '<div class="col-span-full text-center py-10 text-gray-500">No hay productos que coincidan con tu búsqueda</div>';
        return;
    }
    
    container.innerHTML = filtrados.map(producto => {
        const stockClass = producto.stock < 10 ? 'low-stock' : '';
        const stockText = producto.stock < 10 ? `⚠️ Stock bajo: ${producto.stock}` : `Stock: ${producto.stock}`;
        
        return `
            <div class="product-card bg-white rounded-lg shadow-md p-4 cursor-pointer hover:shadow-lg transition transform hover:scale-105" 
                 data-producto-id="${producto.id}">
                <div class="text-center">
                    <i class="fas ${producto.imagen || 'fa-box'} text-4xl text-indigo-600 mb-2"></i>
                    <h3 class="font-semibold text-gray-800">${escapeHtml(producto.nombre)}</h3>
                    <p class="text-indigo-600 font-bold mt-2">$${producto.precio.toFixed(2)}</p>
                    <p class="text-xs ${producto.stock < 10 ? 'text-orange-600 font-semibold' : 'text-gray-400'} mt-1">
                        ${stockText}
                    </p>
                </div>
            </div>
        `;
    }).join('');
    
    document.querySelectorAll('.product-card').forEach(card => {
        card.removeEventListener('click', manejadorProducto);
        card.addEventListener('click', manejadorProducto);
    });
}

function manejadorProducto(event) {
    const card = event.currentTarget;
    const productoId = parseInt(card.dataset.productoId);
    if (productoId) {
        const producto = productos.find(p => p.id === productoId);
        if (producto && typeof mostrarModalCantidad !== 'undefined') {
            mostrarModalCantidad(producto);
        } else {
            agregarAlCarrito(productoId);
        }
    }
}

// ============================================
// FUNCIONES DEL CARRITO
// ============================================
function agregarAlCarritoConCantidad(productoId, cantidad) {
    const producto = productos.find(p => p.id === productoId);
    if (!producto) {
        mostrarToast('Producto no encontrado', 'error');
        return;
    }
    
    if (producto.stock <= 0) {
        mostrarToast('Sin stock disponible', 'error');
        return;
    }
    
    if (cantidad > producto.stock) {
        mostrarToast(`Solo hay ${producto.stock} unidades disponibles`, 'error');
        return;
    }
    
    const existente = carrito.find(i => i.id === productoId);
    if (existente) {
        if (existente.cantidad + cantidad <= producto.stock) {
            existente.cantidad += cantidad;
            mostrarToast(`+${cantidad} ${producto.nombre}`, 'success');
        } else {
            mostrarToast('Stock insuficiente', 'error');
            return;
        }
    } else {
        carrito.push({
            id: producto.id,
            nombre: producto.nombre,
            precio: producto.precio,
            cantidad: cantidad,
            imagen: producto.imagen
        });
        mostrarToast(`${cantidad}x ${producto.nombre} agregado`, 'success');
    }
    
    guardarCarrito();
    actualizarCarritoUI();
}

function agregarAlCarrito(productoId) {
    agregarAlCarritoConCantidad(productoId, 1);
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
            if (!Array.isArray(carrito)) carrito = [];
        }
    } catch (error) {
        console.error('Error cargando carrito:', error);
        carrito = [];
    }
}

function reiniciar() {
    if (carrito.length > 0 && typeof mostrarConfirmacion !== 'undefined') {
        mostrarConfirmacion('Vaciar carrito', '¿Estás seguro de vaciar el carrito?', (confirmado) => {
            if (confirmado) {
                carrito = [];
                guardarCarrito();
                actualizarCarritoUI();
                renderizarCarritoModal();
                mostrarToast('Carrito vaciado', 'warning');
            }
        });
    } else if (carrito.length > 0 && confirm('¿Estás seguro de vaciar el carrito?')) {
        carrito = [];
        guardarCarrito();
        actualizarCarritoUI();
        renderizarCarritoModal();
        mostrarToast('Carrito vaciado', 'warning');
    }
}

// ============================================
// ACTUALIZACIÓN DE STOCK
// ============================================
function actualizarStockLocal(itemsVendidos) {
    for (const item of itemsVendidos) {
        const producto = productos.find(p => p.id === item.id);
        if (producto) {
            producto.stock -= item.cantidad;
        }
    }
    localStorage.setItem('productos', JSON.stringify(productos));
    renderizarProductos();
}

async function sincronizarStockConGoogle(itemsVendidos) {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);
        
        const response = await fetch(APPS_SCRIPT_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                accion: 'actualizar_stock',
                items: itemsVendidos
            }),
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (response.ok) {
            console.log('✅ Stock sincronizado con Google');
            return true;
        }
        return false;
    } catch (error) {
        console.log('⚠️ No se pudo sincronizar stock:', error.message);
        return false;
    }
}

// ============================================
// REPORTE DE VENTAS
// ============================================
function guardarVentaEnReporte(venta) {
    ventasDelDia.push({
        ...venta,
        timestamp: Date.now()
    });
    localStorage.setItem('ventasDelDia', JSON.stringify(ventasDelDia));
    
    // Limpiar ventas de días anteriores
    const hoy = new Date().toDateString();
    ventasDelDia = ventasDelDia.filter(v => new Date(v.fecha).toDateString() === hoy);
}

function cargarVentasDelDia() {
    try {
        const guardadas = localStorage.getItem('ventasDelDia');
        if (guardadas) {
            ventasDelDia = JSON.parse(guardadas);
            const hoy = new Date().toDateString();
            ventasDelDia = ventasDelDia.filter(v => new Date(v.fecha).toDateString() === hoy);
        }
    } catch (error) {
        console.error('Error cargando ventas del día:', error);
        ventasDelDia = [];
    }
}

function mostrarReporteVentas() {
    const totalVentas = ventasDelDia.length;
    const totalIngresos = ventasDelDia.reduce((sum, v) => sum + v.total, 0);
    const totalItems = ventasDelDia.reduce((sum, v) => sum + v.itemCount, 0);
    
    const pagoMethods = {
        'Efectivo': 0,
        'Tarjeta': 0,
        'Transferencia': 0
    };
    
    ventasDelDia.forEach(v => {
        pagoMethods[v.metodoPago] = (pagoMethods[v.metodoPago] || 0) + 1;
    });
    
    const productosVendidos = {};
    ventasDelDia.forEach(v => {
        v.items.forEach(item => {
            productosVendidos[item.nombre] = (productosVendidos[item.nombre] || 0) + item.cantidad;
        });
    });
    
    const topProductos = Object.entries(productosVendidos)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);
    
    const container = document.getElementById('reporte-content');
    if (container) {
        container.innerHTML = `
            <div class="space-y-6">
                <!-- Resumen -->
                <div class="grid grid-cols-2 gap-4">
                    <div class="bg-blue-50 p-4 rounded-lg text-center">
                        <p class="text-2xl font-bold text-blue-600">${totalVentas}</p>
                        <p class="text-sm text-gray-600">Ventas</p>
                    </div>
                    <div class="bg-green-50 p-4 rounded-lg text-center">
                        <p class="text-2xl font-bold text-green-600">$${totalIngresos.toFixed(2)}</p>
                        <p class="text-sm text-gray-600">Ingresos</p>
                    </div>
                    <div class="bg-purple-50 p-4 rounded-lg text-center">
                        <p class="text-2xl font-bold text-purple-600">${totalItems}</p>
                        <p class="text-sm text-gray-600">Items vendidos</p>
                    </div>
                    <div class="bg-orange-50 p-4 rounded-lg text-center">
                        <p class="text-2xl font-bold text-orange-600">$${(totalIngresos / (totalVentas || 1)).toFixed(2)}</p>
                        <p class="text-sm text-gray-600">Ticket promedio</p>
                    </div>
                </div>
                
                <!-- Métodos de pago -->
                <div>
                    <h3 class="font-semibold text-gray-700 mb-2">Métodos de pago</h3>
                    <div class="space-y-2">
                        ${Object.entries(pagoMethods).map(([metodo, count]) => `
                            <div class="flex justify-between items-center">
                                <span>${metodo}</span>
                                <div class="flex items-center gap-2">
                                    <div class="w-32 bg-gray-200 rounded-full h-2">
                                        <div class="bg-indigo-600 h-2 rounded-full" style="width: ${(count / (totalVentas || 1)) * 100}%"></div>
                                    </div>
                                    <span class="text-sm font-semibold">${count}</span>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
                
                <!-- Top productos -->
                ${topProductos.length > 0 ? `
                <div>
                    <h3 class="font-semibold text-gray-700 mb-2">Productos más vendidos</h3>
                    <div class="space-y-2">
                        ${topProductos.map(([nombre, cantidad]) => `
                            <div class="flex justify-between items-center">
                                <span>${escapeHtml(nombre)}</span>
                                <span class="font-semibold text-indigo-600">${cantidad} unidades</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
                ` : ''}
                
                <!-- Últimas ventas -->
                <div>
                    <h3 class="font-semibold text-gray-700 mb-2">Últimas ventas</h3>
                    <div class="space-y-2 max-h-60 overflow-y-auto">
                        ${ventasDelDia.slice(-5).reverse().map(v => `
                            <div class="border-b pb-2">
                                <div class="flex justify-between text-sm">
                                    <span class="text-gray-600">${new Date(v.fecha).toLocaleTimeString()}</span>
                                    <span class="font-semibold">$${v.total.toFixed(2)}</span>
                                </div>
                                <div class="text-xs text-gray-500">
                                    ${v.metodoPago} - ${v.itemCount} items
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;
    }
    
    const modal = document.getElementById('reporte-modal');
    if (modal) {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
    }
}

// ============================================
// REGISTRAR VENTA EN GOOGLE
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
// COBRAR
// ============================================
async function cobrar() {
    if (carrito.length === 0) {
        mostrarToast('Carrito vacío', 'error');
        return;
    }
    
    const total = carrito.reduce((s, i) => s + (i.precio * i.cantidad), 0);
    const cantidadItems = carrito.reduce((s, i) => s + i.cantidad, 0);
    
    let metodoPago;
    if (typeof mostrarModalPago !== 'undefined') {
        metodoPago = await mostrarModalPago();
    } else {
        metodoPago = prompt('Método de pago:\n1 - Efectivo\n2 - Tarjeta\n3 - Transferencia', '1');
        const metodos = { '1': 'Efectivo', '2': 'Tarjeta', '3': 'Transferencia' };
        metodoPago = metodos[metodoPago] || null;
    }
    
    if (!metodoPago) return;
    
    const btnCobrar = document.getElementById('btn-cobrar');
    if (btnCobrar) {
        btnCobrar.disabled = true;
        btnCobrar.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Procesando...';
    }
    
    mostrarLoading(true);
    
    // Actualizar stock local
    const itemsVendidos = carrito.map(i => ({
        id: i.id,
        cantidad: i.cantidad,
        nombre: i.nombre
    }));
    actualizarStockLocal(itemsVendidos);
    
    // Guardar venta
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
    guardarVentaEnReporte(ventaPendiente);
    
    // Mostrar comprobante
    const resumen = carrito.map(i => `${i.cantidad}x ${i.nombre} - $${(i.precio * i.cantidad).toFixed(2)}`).join('\n');
    alert(`✅ ¡VENTA REGISTRADA!\n\n${resumen}\n\nTotal: $${total.toFixed(2)}\nPago: ${metodoPago}\n\n🔄 Se sincronizará automáticamente cuando haya internet.`);
    
    // Vaciar carrito
    carrito = [];
    guardarCarrito();
    actualizarCarritoUI();
    
    const modal = document.getElementById('cart-modal');
    if (modal && !modal.classList.contains('hidden')) {
        modal.classList.add('hidden');
    }
    
    const pendientes = obtenerCantidadPendientes();
    mostrarToast(`Venta registrada. ${pendientes} pendiente(s)`, 'success');
    
    // Sincronizar en segundo plano
    setTimeout(() => {
        sincronizarVentasPendientes();
        sincronizarStockConGoogle(itemsVendidos);
    }, 1000);
    
    mostrarLoading(false);
    
    if (btnCobrar) {
        btnCobrar.disabled = false;
        btnCobrar.innerHTML = '<i class="fas fa-credit-card mr-2"></i>Cobrar';
    }
}

// ============================================
// GESTIÓN DE VENTAS PENDIENTES
// ============================================
function guardarVentaPendiente(venta) {
    try {
        const pendientes = JSON.parse(localStorage.getItem('ventasPendientes') || '[]');
        pendientes.push(venta);
        localStorage.setItem('ventasPendientes', JSON.stringify(pendientes));
        console.log(`💾 Venta pendiente #${venta.id}. Total: ${pendientes.length}`);
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
// SINCRONIZAR VENTAS PENDIENTES
// ============================================
async function sincronizarVentasPendientes() {
    if (sincronizando) {
        console.log('⏳ Sincronización en curso, omitiendo...');
        return;
    }
    
    const pendientes = JSON.parse(localStorage.getItem('ventasPendientes') || '[]');
    
    if (pendientes.length === 0) return;
    
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
                console.log(`❌ Venta ${venta.id} no sincronizada`);
            }
        } catch (error) {
            console.error(`❌ Error sincronizando venta ${venta.id}:`, error);
            errores++;
            nuevasPendientes.push(venta);
        }
        
        await new Promise(resolve => setTimeout(resolve, 100));
    }
    
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
// DETECTOR DE CONEXIÓN
// ============================================
function iniciarDetectorDeConexion() {
    window.addEventListener('online', async () => {
        console.log('🌐 Conexión detectada!');
        setTimeout(async () => {
            const tieneConexionReal = await verificarConexionReal();
            if (tieneConexionReal) {
                mostrarToast('Conexión recuperada, sincronizando...', 'success');
                await sincronizarVentasPendientes();
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
    });
    
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
// OTRAS FUNCIONES
// ============================================
function filtrarPorCategoria(categoria) {
    categoriaActual = categoria;
    renderizarCategorias();
    renderizarProductos();
}

async function importarDesdeGoogle() {
    mostrarToast('Sincronizando productos...', 'info');
    mostrarLoading(true);
    
    const exito = await cargarProductosDesdeGoogle();
    if (exito) {
        renderizarCategorias();
        renderizarProductos();
        mostrarToast(`${productos.length} productos sincronizados`, 'success');
    } else {
        mostrarToast('Error al sincronizar productos', 'error');
    }
    mostrarLoading(false);
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
// INICIALIZACIÓN PRINCIPAL
// ============================================
async function init() {
    console.log('🚀 Iniciando POS Pro (Offline First)...');
    mostrarLoading(true);
    
    try {
        const elementosNecesarios = ['lista-productos', 'categorias'];
        const missingElements = elementosNecesarios.filter(id => !document.getElementById(id));
        
        if (missingElements.length > 0) {
            console.error('Elementos HTML faltantes:', missingElements);
            mostrarError('Error de configuración de la página', false);
            return;
        }
        
        if (FORZAR_DATOS_LOCALES) {
            console.log('📦 Modo datos locales forzado');
            cargarProductosEmergencia();
        } else {
            const tieneConexion = await verificarConexionReal();
            
            if (tieneConexion) {
                const exito = await cargarProductosDesdeGoogle();
                if (!exito) {
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
        
        cargarCarritoDesdeLocalStorage();
        cargarVentasDelDia();
        renderizarCategorias();
        renderizarProductos();
        actualizarCarritoUI();
        
        const tieneConexionFinal = await verificarConexionReal();
        if (tieneConexionFinal) {
            await sincronizarVentasPendientes();
        } else {
            const pendientes = obtenerCantidadPendientes();
            if (pendientes > 0) {
                mostrarToast(`${pendientes} venta(s) pendiente(s) - Sin conexión`, 'warning');
            }
        }
        
        iniciarDetectorDeConexion();
        actualizarIndicadorPendientes();
        
        mostrarLoading(false);
        console.log(`🎉 Inicialización completa - ${productos.length} productos`);
        
        const pendientes = obtenerCantidadPendientes();
        if (pendientes > 0) {
            mostrarToast(`${productos.length} productos listos - ${pendientes} ventas pendientes`, 'info');
        } else {
            mostrarToast(`${productos.length} productos listos`, 'success');
        }
        
    } catch (error) {
        console.error('❌ Error en init:', error);
        mostrarLoading(false);
        mostrarError('Error al cargar la aplicación: ' + error.message, true);
    }
}

// ============================================
// EXPONER FUNCIONES GLOBALES
// ============================================
window.agregarAlCarrito = agregarAlCarrito;
window.agregarAlCarritoConCantidad = agregarAlCarritoConCantidad;
window.filtrarPorCategoria = filtrarPorCategoria;
window.reiniciar = reiniciar;
window.cobrar = cobrar;
window.importarDesdeGoogle = importarDesdeGoogle;
window.verCarrito = verCarrito;
window.cerrarModal = cerrarModal;
window.modificarCantidad = modificarCantidad;
window.eliminarDelCarrito = eliminarDelCarrito;
window.verVentasPendientes = verVentasPendientes;
window.mostrarReporteVentas = mostrarReporteVentas;
window.mostrarLoading = mostrarLoading;

// ============================================
// INICIAR
// ============================================
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}