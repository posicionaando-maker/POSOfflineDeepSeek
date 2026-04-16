// ============================================
// VERSIÓN DEFINITIVA - POS PRO (CORREGIDA)
// ============================================

// CONFIGURACIÓN
const FORZAR_DATOS_LOCALES = false;
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxeAdt9FweLTYGgPRqyrEaFHjeukwG4-UMKQUu-wH_REsjF2QYVo7OoqSdN6mEMKS5V/exec';

// DATOS DE EMERGENCIA
const productosData = [
    { id: 1, nombre: "Café Americano", precio: 2.50, categoria: "bebidas", stock: 100, imagen: "fa-mug-hot" },
    { id: 2, nombre: "Café Latte", precio: 3.00, categoria: "bebidas", stock: 100, imagen: "fa-mug-hot" },
    { id: 3, nombre: "Capuchino", precio: 3.50, categoria: "bebidas", stock: 100, imagen: "fa-mug-hot" },
    { id: 4, nombre: "Té Verde", precio: 2.00, categoria: "bebidas", stock: 50, imagen: "fa-leaf" },
    { id: 5, nombre: "Sandwich de Pollo", precio: 5.50, categoria: "comidas", stock: 30, imagen: "fa-bread-slice" },
    { id: 6, nombre: "Sandwich Vegano", precio: 4.50, categoria: "comidas", stock: 25, imagen: "fa-seedling" },
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

// ============================================
// MATADOR DE SERVICE WORKERS
// ============================================
(async function matarServiceWorkers() {
    if ('serviceWorker' in navigator) {
        try {
            const registrations = await navigator.serviceWorker.getRegistrations();
            for (const registration of registrations) {
                console.log('🗑️ Desregistrando SW:', registration.scope);
                await registration.unregister();
            }
            if (registrations.length > 0) {
                console.log('🔄 Recargando para aplicar limpieza...');
                window.location.reload();
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
        container.innerHTML = `
            <div class="col-span-full text-center py-10 text-gray-500">
                <i class="fas fa-spinner fa-spin text-4xl mb-2"></i>
                <p>Cargando productos...</p>
            </div>
        `;
    }
}

function mostrarToast(mensaje, tipo = 'success') {
    const toast = document.getElementById('toast-message');
    if (!toast) return;
    
    const toastText = document.getElementById('toast-text');
    const icon = toast.querySelector('i');
    
    toastText.textContent = mensaje;
    
    const iconos = {
        success: 'fa-check-circle text-green-400',
        error: 'fa-exclamation-circle text-red-400',
        warning: 'fa-exclamation-triangle text-yellow-400',
        info: 'fa-info-circle text-blue-400'
    };
    
    if (icon) icon.className = `fas ${iconos[tipo] || iconos.success} mr-2`;
    toast.classList.remove('hidden');
    setTimeout(() => toast.classList.add('hidden'), 3000);
}

function mostrarError(mensaje) {
    const container = document.getElementById('lista-productos');
    if (container) {
        container.innerHTML = `
            <div class="col-span-full text-center py-10 text-red-500">
                <i class="fas fa-exclamation-triangle text-4xl mb-2"></i>
                <p class="font-semibold">${mensaje}</p>
                <button onclick="location.reload()" class="mt-4 bg-indigo-600 text-white px-4 py-2 rounded-lg">
                    <i class="fas fa-sync-alt mr-2"></i>Recargar
                </button>
            </div>
        `;
    }
}

// ============================================
// CARGA DE PRODUCTOS
// ============================================
async function cargarProductosDesdeGoogle() {
    try {
        console.log('🔄 Cargando desde Google Sheets...');
        const response = await fetch(APPS_SCRIPT_URL);
        const data = await response.json();
        
        if (data.success && data.productos && data.productos.length > 0) {
            productos = data.productos;
            localStorage.setItem('productos', JSON.stringify(productos));
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
        productos = JSON.parse(guardados);
        console.log(`📀 ${productos.length} productos desde localStorage`);
        return true;
    }
    return false;
}

function cargarProductosEmergencia() {
    productos = [...productosData];
    console.log(`🚨 ${productos.length} productos de emergencia`);
}

// ============================================
// RENDERIZADO
// ============================================
function renderizarCategorias() {
    const categorias = ['todos', ...new Set(productos.map(p => p.categoria))];
    const container = document.getElementById('categorias');
    if (!container) return;
    
    container.innerHTML = categorias.map(cat => `
        <button onclick="filtrarPorCategoria('${cat}')" 
                class="categoria-btn ${categoriaActual === cat ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-700'} 
                       px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap hover:bg-indigo-500 hover:text-white transition">
            ${cat === 'todos' ? 'Todos' : cat.charAt(0).toUpperCase() + cat.slice(1)}
        </button>
    `).join('');
}

function renderizarProductos() {
    const container = document.getElementById('lista-productos');
    if (!container) return;
    
    if (!productos || productos.length === 0) {
        container.innerHTML = '<div class="col-span-full text-center py-10 text-gray-500">No hay productos</div>';
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
        <div class="product-card bg-white rounded-lg shadow-md p-4 cursor-pointer hover:shadow-lg transition" 
             onclick="agregarAlCarrito(${producto.id})">
            <div class="text-center">
                <i class="fas ${producto.imagen} text-4xl text-indigo-600 mb-2"></i>
                <h3 class="font-semibold text-gray-800">${producto.nombre}</h3>
                <p class="text-indigo-600 font-bold mt-2">$${producto.precio.toFixed(2)}</p>
                <p class="text-xs text-gray-400 mt-1">Stock: ${producto.stock}</p>
            </div>
        </div>
    `).join('');
}

// ============================================
// FUNCIONES DEL CARRITO
// ============================================
function agregarAlCarrito(productoId) {
    const producto = productos.find(p => p.id === productoId);
    if (!producto) return mostrarToast('Producto no encontrado', 'error');
    if (producto.stock <= 0) return mostrarToast('Sin stock', 'error');
    
    const existente = carrito.find(i => i.id === productoId);
    if (existente) {
        if (existente.cantidad < producto.stock) {
            existente.cantidad++;
            mostrarToast(`+1 ${producto.nombre}`, 'success');
        } else {
            return mostrarToast('Stock insuficiente', 'error');
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
}

function guardarCarrito() {
    localStorage.setItem('carrito', JSON.stringify(carrito));
}

function cargarCarritoDesdeLocalStorage() {
    const guardado = localStorage.getItem('carrito');
    if (guardado) carrito = JSON.parse(guardado);
}

function reiniciar() {
    if (carrito.length > 0 && confirm('¿Vaciar carrito?')) {
        carrito = [];
        guardarCarrito();
        actualizarCarritoUI();
        mostrarToast('Carrito vaciado', 'warning');
    }
}

// ============================================
// REGISTRAR VENTA (CORREGIDO)
// ============================================
async function registrarVentaEnGoogle(venta) {
    try {
        const response = await fetch(APPS_SCRIPT_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                accion: 'registrar_venta',
                total: venta.total,
                cantidadItems: venta.itemCount,
                metodoPago: venta.metodoPago,
                items: venta.items
            })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const resultado = await response.json();
        return resultado;
        
    } catch (error) {
        console.error('Error en registrarVentaEnGoogle:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

function guardarVentaPendiente(venta) {
    const pendientes = JSON.parse(localStorage.getItem('ventasPendientes') || '[]');
    pendientes.push({
        ...venta,
        id: Date.now(),
        fechaLocal: new Date().toISOString()
    });
    localStorage.setItem('ventasPendientes', JSON.stringify(pendientes));
    console.log(`💾 Venta pendiente guardada. Total pendientes: ${pendientes.length}`);
}

async function sincronizarVentasPendientes() {
    const pendientes = JSON.parse(localStorage.getItem('ventasPendientes') || '[]');
    
    if (pendientes.length === 0) {
        console.log('No hay ventas pendientes');
        return;
    }
    
    mostrarToast(`Sincronizando ${pendientes.length} venta(s) pendiente(s)...`, 'info');
    
    let sincronizadas = 0;
    let errores = 0;
    
    for (let i = 0; i < pendientes.length; i++) {
        try {
            const venta = pendientes[i];
            const resultado = await registrarVentaEnGoogle({
                total: venta.total,
                itemCount: venta.itemCount,
                metodoPago: venta.metodoPago,
                items: venta.items
            });
            
            if (resultado.success) {
                sincronizadas++;
                pendientes.splice(i, 1);
                i--;
            } else {
                errores++;
            }
        } catch (error) {
            console.error('Error sincronizando venta:', error);
            errores++;
        }
    }
    
    localStorage.setItem('ventasPendientes', JSON.stringify(pendientes));
    
    if (sincronizadas > 0) {
        mostrarToast(`✅ ${sincronizadas} venta(s) sincronizada(s)`, 'success');
    }
    if (errores > 0) {
        mostrarToast(`⚠️ ${errores} venta(s) no sincronizada(s)`, 'warning');
    }
    
    return { sincronizadas, errores, pendientes: pendientes.length };
}

// ============================================
// COBRAR - FUNCIÓN PRINCIPAL (CORREGIDA)
// ============================================
async function cobrar() {
    if (carrito.length === 0) {
        mostrarToast('Carrito vacío', 'error');
        return;
    }
    
    const total = carrito.reduce((s, i) => s + (i.precio * i.cantidad), 0);
    const cantidadItems = carrito.reduce((s, i) => s + i.cantidad, 0);
    
    const metodoPago = prompt('💳 Método de pago:\n1 - Efectivo\n2 - Tarjeta\n3 - Transferencia', '1');
    
    if (!metodoPago) return;
    
    const metodos = {
        '1': 'Efectivo',
        '2': 'Tarjeta',
        '3': 'Transferencia'
    };
    
    const metodoPagoTexto = metodos[metodoPago] || 'Efectivo';
    
    const btnCobrar = document.querySelector('button[onclick="cobrar()"]');
    if (btnCobrar) {
        btnCobrar.disabled = true;
        btnCobrar.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Procesando...';
    }
    
    mostrarToast('Registrando venta...', 'info');
    
    try {
        const venta = {
            total: total,
            itemCount: cantidadItems,
            metodoPago: metodoPagoTexto,
            items: carrito.map(i => ({
                id: i.id,
                nombre: i.nombre,
                cantidad: i.cantidad,
                precio: i.precio
            }))
        };
        
        const resultado = await registrarVentaEnGoogle(venta);
        
        if (resultado.success) {
            const resumen = carrito.map(i => `${i.cantidad}x ${i.nombre} - $${(i.precio * i.cantidad).toFixed(2)}`).join('\n');
            alert(`✅ ¡VENTA REGISTRADA!\n\n${resumen}\n\nTotal: $${total.toFixed(2)}\nPago: ${metodoPagoTexto}\n\n${resultado.mensaje || ''}`);
            
            carrito = [];
            guardarCarrito();
            actualizarCarritoUI();
            
            const modal = document.getElementById('cart-modal');
            if (modal && modal.classList.contains('flex')) {
                cerrarModal();
            }
            
            mostrarToast(`Venta por $${total.toFixed(2)} registrada`, 'success');
        } else {
            throw new Error(resultado.error || 'Error al registrar');
        }
        
    } catch (error) {
        console.error('Error en cobrar:', error);
        mostrarToast(`Error: ${error.message}`, 'error');
        
        const ventaPendiente = {
            total: total,
            itemCount: cantidadItems,
            metodoPago: metodoPagoTexto,
            items: carrito.map(i => ({
                id: i.id,
                nombre: i.nombre,
                cantidad: i.cantidad,
                precio: i.precio
            })),
            timestamp: Date.now()
        };
        
        guardarVentaPendiente(ventaPendiente);
        mostrarToast('Venta guardada localmente. Se reintentará después.', 'warning');
        
        if (confirm('Error al registrar en Google Sheets. ¿Vaciar carrito de todas formas?')) {
            carrito = [];
            guardarCarrito();
            actualizarCarritoUI();
        }
        
    } finally {
        if (btnCobrar) {
            btnCobrar.disabled = false;
            btnCobrar.innerHTML = '<i class="fas fa-credit-card mr-2"></i>Cobrar';
        }
    }
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
    mostrarToast('Sincronizando...', 'info');
    mostrarCargando(true);
    
    const exito = await cargarProductosDesdeGoogle();
    if (exito) {
        renderizarCategorias();
        renderizarProductos();
        mostrarToast(`${productos.length} productos sincronizados`, 'success');
    } else {
        mostrarToast('Error al sincronizar', 'error');
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
                <div>
                    <p class="font-semibold">${item.nombre}</p>
                    <p class="text-sm text-gray-500">$${item.precio.toFixed(2)} c/u</p>
                </div>
                <div class="flex items-center gap-3">
                    <button onclick="modificarCantidad(${item.id}, -1)" class="bg-gray-200 w-8 h-8 rounded-full">-</button>
                    <span>${item.cantidad}</span>
                    <button onclick="modificarCantidad(${item.id}, 1)" class="bg-gray-200 w-8 h-8 rounded-full">+</button>
                    <button onclick="eliminarDelCarrito(${item.id})" class="text-red-500">🗑️</button>
                </div>
            </div>
        `).join('');
    }
    
    const cartTotal = document.getElementById('cart-total');
    if (cartTotal) cartTotal.textContent = total.toFixed(2);
}

function modificarCantidad(productoId, cambio) {
    const item = carrito.find(i => i.id === productoId);
    const producto = productos.find(p => p.id === productoId);
    
    if (item && producto) {
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
// INICIALIZACIÓN PRINCIPAL
// ============================================
async function init() {
    console.log('🚀 Iniciando POS Pro...');
    mostrarCargando(true);
    
    try {
        if (FORZAR_DATOS_LOCALES) {
            console.log('📦 Modo datos locales forzado');
            cargarProductosEmergencia();
        } else {
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
        }
        
        cargarCarritoDesdeLocalStorage();
        renderizarCategorias();
        renderizarProductos();
        actualizarCarritoUI();
        
        if (typeof sincronizarVentasPendientes === 'function') {
            console.log('🔄 Sincronizando ventas pendientes...');
            await sincronizarVentasPendientes();
        }
        
        mostrarCargando(false);
        console.log(`🎉 Inicialización completa - ${productos.length} productos`);
        mostrarToast(`${productos.length} productos listos`, 'success');
        
    } catch (error) {
        console.error('❌ Error en init:', error);
        mostrarCargando(false);
        mostrarError('Error al cargar la aplicación');
    }
}

// EXPONER FUNCIONES GLOBALES
window.agregarAlCarrito = agregarAlCarrito;
window.filtrarPorCategoria = filtrarPorCategoria;
window.reiniciar = reiniciar;
window.cobrar = cobrar;
window.importarDesdeGoogle = importarDesdeGoogle;
window.verCarrito = verCarrito;
window.cerrarModal = cerrarModal;
window.modificarCantidad = modificarCantidad;
window.eliminarDelCarrito = eliminarDelCarrito;

// INICIAR
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}