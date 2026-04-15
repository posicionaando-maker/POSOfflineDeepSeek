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

// ========== INICIALIZACIÓN ==========
function init() {
    cargarProductos();
    cargarCarritoDesdeLocalStorage();
    renderizarCategorias();
    renderizarProductos();
    actualizarCarritoUI();
}

// Cargar productos (simulando API)
function cargarProductos() {
    // Intentar cargar desde localStorage
    const productosGuardados = localStorage.getItem('productos');
    if (productosGuardados) {
        productos = JSON.parse(productosGuardados);
    } else {
        productos = [...productosData];
        guardarProductos();
    }
}

// Guardar productos en localStorage
function guardarProductos() {
    localStorage.setItem('productos', JSON.stringify(productos));
}

// ========== FUNCIONES DE CATEGORÍAS ==========
function renderizarCategorias() {
    const categorias = ['todos', ...new Set(productos.map(p => p.categoria))];
    const container = document.getElementById('categorias');
    
    container.innerHTML = categorias.map(cat => `
        <button onclick="filtrarPorCategoria('${cat}')" 
                class="categoria-btn ${categoriaActual === cat ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-700'} 
                       px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap hover:bg-indigo-500 hover:text-white transition">
            ${cat === 'todos' ? 'Todos' : cat.charAt(0).toUpperCase() + cat.slice(1)}
        </button>
    `).join('');
}

function filtrarPorCategoria(categoria) {
    categoriaActual = categoria;
    renderizarCategorias();
    renderizarProductos();
}

// ========== FUNCIONES DE PRODUCTOS ==========
function renderizarProductos() {
    const container = document.getElementById('lista-productos');
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
    
    document.getElementById('total-display').textContent = total.toFixed(2);
    document.getElementById('cart-count').textContent = itemsCount;
    document.getElementById('items-count').textContent = itemsCount;
    
    // Animación sutil en el total
    const totalElement = document.getElementById('total-display');
    totalElement.style.transform = 'scale(1.05)';
    setTimeout(() => {
        totalElement.style.transform = 'scale(1)';
    }, 200);
}

function renderizarCarritoModal() {
    const container = document.getElementById('cart-items-list');
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
            mostrarToast(`${cambio > 0 ? '+' : ''}${cambio} ${item.nombre}`, 'success');
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

function reiniciar() {
    if (carrito.length > 0 && confirm('¿Estás seguro de vaciar todo el carrito?')) {
        carrito = [];
        guardarCarrito();
        actualizarCarritoUI();
        renderizarCarritoModal();
        mostrarToast('Carrito vaciado completamente', 'warning');
    }
}

// ========== FUNCIONES DE COBRO ==========
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
    renderizarCarritoModal();
    renderizarProductos(); // Actualizar stock visible
    
    mostrarToast(`Venta por $${total.toFixed(2)} completada exitosamente`, 'success');
}

function guardarVenta(venta) {
    const ventas = JSON.parse(localStorage.getItem('ventas') || '[]');
    ventas.push(venta);
    localStorage.setItem('ventas', JSON.stringify(ventas));
}

// ========== FUNCIONES DE PERSISTENCIA ==========
function guardarCarrito() {
    localStorage.setItem('carrito', JSON.stringify(carrito));
}

function cargarCarritoDesdeLocalStorage() {
    const carritoGuardado = localStorage.getItem('carrito');
    if (carritoGuardado) {
        carrito = JSON.parse(carritoGuardado);
    }
}

// ========== FUNCIONES DE IMPORTACIÓN ==========
function importarDesdeGoogle() {
    mostrarToast('Conectando con Google Drive...', 'warning');
    
    // Simular importación desde Google Sheets
    setTimeout(() => {
        // Aquí iría la lógica real de importación desde Google Sheets API
        const productosImportados = prompt('Pega la URL o ID del documento de Google Sheets:');
        
        if (productosImportados) {
            // Simulación de importación exitosa
            mostrarToast('Productos importados exitosamente desde Google', 'success');
            cargarProductos();
            renderizarProductos();
            renderizarCategorias();
        } else {
            mostrarToast('Importación cancelada', 'error');
        }
    }, 1000);
}

// ========== FUNCIONES DE MODAL ==========
function verCarrito() {
    renderizarCarritoModal();
    const modal = document.getElementById('cart-modal');
    modal.classList.remove('hidden');
    modal.classList.add('flex');
}

function cerrarModal() {
    const modal = document.getElementById('cart-modal');
    modal.classList.add('hidden');
    modal.classList.remove('flex');
}

// ========== EXPORTAR FUNCIONES GLOBALES ==========
window.agregarAlCarrito = agregarAlCarrito;
window.filtrarPorCategoria = filtrarPorCategoria;
window.reiniciar = reiniciar;
window.cobrar = cobrar;
window.importarDesdeGoogle = importarDesdeGoogle;
window.verCarrito = verCarrito;
window.cerrarModal = cerrarModal;
window.modificarCantidad = modificarCantidad;
window.eliminarDelCarrito = eliminarDelCarrito;

// Inicializar la aplicación
init();