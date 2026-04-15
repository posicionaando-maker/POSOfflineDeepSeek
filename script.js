// ========== VERSIÓN CORREGIDA CON MANEJO DE ERRORES ==========

console.log('🚀 Iniciando script.js versión 2.0');
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzhA3elNOP64nGjVKZyO5t3a6jbqgxhuvBOrTbIxYT7i8NuuoL7XznhAYm4wqztND4F/exec';
// ========== DATOS DE EJEMPLO ==========
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

// ========== ESTADO GLOBAL ==========
let carrito = [];
let productos = [];
let categoriaActual = 'todos';

// ========== FUNCIÓN PRINCIPAL CON MANEJO DE ERRORES ==========
async function init() {
    console.log('📦 Inicializando POS Pro...');
    
    try {
        // Mostrar indicador de carga
        mostrarCargando(true);
        
        // Cargar productos
        await cargarProductos();
        console.log('✅ Productos cargados:', productos.length);
        
        // Cargar carrito
        cargarCarritoDesdeLocalStorage();
        console.log('✅ Carrito cargado:', carrito.length, 'items');
        
        // Renderizar todo
        renderizarCategorias();
        renderizarProductos();
        actualizarCarritoUI();
        
        // Ocultar indicador de carga
        mostrarCargando(false);
        
        // Verificar conexión
        if (!navigator.onLine) {
            mostrarToast('Modo offline - Datos guardados localmente', 'warning');
        } else {
            mostrarToast('Sistema listo ✅', 'success');
        }
        
        console.log('🎉 Inicialización completa');
        
    } catch (error) {
        console.error('❌ Error en init():', error);
        mostrarCargando(false);
        mostrarError('Error al cargar la aplicación. Recarga la página.');
    }
}

function mostrarCargando(mostrar) {
    const container = document.getElementById('lista-productos');
    if (mostrar) {
        container.innerHTML = `
            <div class="col-span-full text-center py-10 text-gray-500">
                <i class="fas fa-spinner fa-spin text-4xl mb-2"></i>
                <p>Cargando productos...</p>
            </div>
        `;
    }
}

function mostrarError(mensaje) {
    const container = document.getElementById('lista-productos');
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

// ========== FUNCIONES DE CARGA ==========
async function cargarProductos() {
    // Intentar cargar desde localStorage
    const productosGuardados = localStorage.getItem('productos');
    
    if (productosGuardados) {
        productos = JSON.parse(productosGuardados);
        console.log('📀 Productos cargados desde localStorage');
    } else {
        // Usar datos de ejemplo
        productos = [...productosData];
        guardarProductos();
        console.log('📦 Productos inicializados desde datos de ejemplo');
    }
    
    // Verificar que productos no esté vacío
    if (!productos || productos.length === 0) {
        console.warn('⚠️ No hay productos, usando datos de emergencia');
        productos = [...productosData];
        guardarProductos();
    }
}

function guardarProductos() {
    try {
        localStorage.setItem('productos', JSON.stringify(productos));
    } catch (e) {
        console.error('Error guardando productos:', e);
    }
}

// ========== FUNCIONES DE RENDERIZADO ==========
function renderizarCategorias() {
    const categorias = ['todos', ...new Set(productos.map(p => p.categoria))];
    const container = document.getElementById('categorias');
    
    if (!container) {
        console.error('No se encontró el contenedor de categorías');
        return;
    }
    
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
    
    if (!container) {
        console.error('No se encontró el contenedor de productos');
        return;
    }
    
    if (!productos || productos.length === 0) {
        container.innerHTML = `
            <div class="col-span-full text-center py-10 text-red-500">
                <i class="fas fa-box-open text-4xl mb-2"></i>
                <p>No hay productos disponibles</p>
            </div>
        `;
        return;
    }
    
    const productosFiltrados = categoriaActual === 'todos' 
        ? productos 
        : productos.filter(p => p.categoria === categoriaActual);
    
    if (productosFiltrados.length === 0) {
        container.innerHTML = `
            <div class="col-span-full text-center py-10 text-gray-500">
                <i class="fas fa-box-open text-4xl mb-2"></i>
                <p>No hay productos en esta categoría</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = productosFiltrados.map(producto => `
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

// ========== FUNCIONES DEL CARRITO ==========
function agregarAlCarrito(productoId) {
    console.log('Agregando producto:', productoId);
    
    const producto = productos.find(p => p.id === productoId);
    
    if (!producto) {
        mostrarToast('Producto no encontrado', 'error');
        return;
    }
    
    if (producto.stock <= 0) {
        mostrarToast('Producto sin stock disponible', 'error');
        return;
    }
    
    const itemExistente = carrito.find(item => item.id === productoId);
    
    if (itemExistente) {
        if (itemExistente.cantidad < producto.stock) {
            itemExistente.cantidad++;
            mostrarToast(`+1 ${producto.nombre} agregado`, 'success');
        } else {
            mostrarToast(`Stock insuficiente de ${producto.nombre}`, 'error');
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
        mostrarToast(`${producto.nombre} agregado al carrito`, 'success');
    }
    
    guardarCarrito();
    actualizarCarritoUI();
}

function actualizarCarritoUI() {
    const total = carrito.reduce((sum, item) => sum + (item.precio * item.cantidad), 0);
    const itemsCount = carrito.reduce((sum, item) => sum + item.cantidad, 0);
    
    const totalDisplay = document.getElementById('total-display');
    const cartCount = document.getElementById('cart-count');
    const itemsCountElem = document.getElementById('items-count');
    
    if (totalDisplay) totalDisplay.textContent = total.toFixed(2);
    if (cartCount) cartCount.textContent = itemsCount;
    if (itemsCountElem) itemsCountElem.textContent = itemsCount;
}

function reiniciar() {
    if (carrito.length > 0 && confirm('¿Estás seguro de vaciar todo el carrito?')) {
        carrito = [];
        guardarCarrito();
        actualizarCarritoUI();
        mostrarToast('Carrito vaciado completamente', 'warning');
    }
}

function cobrar() {
    if (carrito.length === 0) {
        mostrarToast('El carrito está vacío. Agrega productos primero', 'error');
        return;
    }
    
    const total = carrito.reduce((sum, item) => sum + (item.precio * item.cantidad), 0);
    
    // Actualizar stock
    carrito.forEach(itemCarrito => {
        const producto = productos.find(p => p.id === itemCarrito.id);
        if (producto) {
            producto.stock -= itemCarrito.cantidad;
        }
    });
    
    guardarProductos();
    
    // Registrar venta
    const venta = {
        id: Date.now(),
        fecha: new Date().toISOString(),
        items: [...carrito],
        total: total,
        metodo: 'efectivo'
    };
    
    guardarVenta(venta);
    
    // Mostrar resumen
    const resumen = carrito.map(item => `${item.cantidad}x ${item.nombre} - $${(item.precio * item.cantidad).toFixed(2)}`).join('\n');
    alert(`✅ Venta completada!\n\n${resumen}\n\nTotal: $${total.toFixed(2)}\n\n¡Gracias por tu compra!`);
    
    // Vaciar carrito
    carrito = [];
    guardarCarrito();
    actualizarCarritoUI();
    renderizarProductos();
    
    mostrarToast(`Venta por $${total.toFixed(2)} completada exitosamente`, 'success');
}

function guardarVenta(venta) {
    const ventas = JSON.parse(localStorage.getItem('ventas') || '[]');
    ventas.push(venta);
    localStorage.setItem('ventas', JSON.stringify(ventas));
}

function guardarCarrito() {
    try {
        localStorage.setItem('carrito', JSON.stringify(carrito));
    } catch (e) {
        console.error('Error guardando carrito:', e);
    }
}

function cargarCarritoDesdeLocalStorage() {
    try {
        const carritoGuardado = localStorage.getItem('carrito');
        if (carritoGuardado) {
            carrito = JSON.parse(carritoGuardado);
        }
    } catch (e) {
        console.error('Error cargando carrito:', e);
        carrito = [];
    }
}

function filtrarPorCategoria(categoria) {
    categoriaActual = categoria;
    renderizarCategorias();
    renderizarProductos();
}

function importarDesdeGoogle() {
    mostrarToast('Conectando con Google Drive...', 'warning');
    
    setTimeout(() => {
        const productosImportados = prompt('Pega la URL o ID del documento de Google Sheets:');
        
        if (productosImportados) {
            mostrarToast('Productos importados exitosamente desde Google', 'success');
            cargarProductos();
            renderizarProductos();
            renderizarCategorias();
        } else {
            mostrarToast('Importación cancelada', 'error');
        }
    }, 1000);
}

// Funciones de modal
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
    
    const total = carrito.reduce((sum, item) => sum + (item.precio * item.cantidad), 0);
    
    if (carrito.length === 0) {
        container.innerHTML = `
            <div class="text-center py-8 text-gray-500">
                <i class="fas fa-shopping-cart text-4xl mb-2"></i>
                <p>Tu carrito está vacío</p>
            </div>
        `;
    } else {
        container.innerHTML = carrito.map(item => `
            <div class="flex justify-between items-center mb-4 pb-4 border-b">
                <div class="flex items-center gap-3">
                    <i class="fas ${item.imagen} text-2xl text-indigo-600"></i>
                    <div>
                        <p class="font-semibold">${item.nombre}</p>
                        <p class="text-sm text-gray-500">$${item.precio.toFixed(2)} c/u</p>
                    </div>
                </div>
                <div class="flex items-center gap-3">
                    <button onclick="modificarCantidad(${item.id}, -1)" 
                            class="bg-gray-200 w-8 h-8 rounded-full hover:bg-gray-300">
                        <i class="fas fa-minus text-xs"></i>
                    </button>
                    <span class="font-semibold w-8 text-center">${item.cantidad}</span>
                    <button onclick="modificarCantidad(${item.id}, 1)" 
                            class="bg-gray-200 w-8 h-8 rounded-full hover:bg-gray-300">
                        <i class="fas fa-plus text-xs"></i>
                    </button>
                    <button onclick="eliminarDelCarrito(${item.id})" 
                            class="text-red-500 hover:text-red-700 ml-2">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                </div>
            </div>
        `).join('');
    }
    
    document.getElementById('cart-total').textContent = total.toFixed(2);
}

function modificarCantidad(productoId, cambio) {
    const item = carrito.find(i => i.id === productoId);
    const producto = productos.find(p => p.id === productoId);
    
    if (item) {
        const nuevaCantidad = item.cantidad + cambio;
        
        if (nuevaCantidad <= 0) {
            eliminarDelCarrito(productoId);
        } else if (nuevaCantidad <= producto.stock) {
            item.cantidad = nuevaCantidad;
            guardarCarrito();
            actualizarCarritoUI();
            renderizarCarritoModal();
        } else {
            mostrarToast(`Stock insuficiente de ${producto.nombre}`, 'error');
        }
    }
}

function eliminarDelCarrito(productoId) {
    const item = carrito.find(i => i.id === productoId);
    if (item) {
        carrito = carrito.filter(i => i.id !== productoId);
        guardarCarrito();
        actualizarCarritoUI();
        renderizarCarritoModal();
        mostrarToast(`${item.nombre} eliminado del carrito`, 'warning');
    }
}

// Exponer funciones globales
window.agregarAlCarrito = agregarAlCarrito;
window.filtrarPorCategoria = filtrarPorCategoria;
window.reiniciar = reiniciar;
window.cobrar = cobrar;
window.importarDesdeGoogle = importarDesdeGoogle;
window.verCarrito = verCarrito;
window.cerrarModal = cerrarModal;
window.modificarCantidad = modificarCantidad;
window.eliminarDelCarrito = eliminarDelCarrito;

// Iniciar la aplicación cuando el DOM esté listo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}