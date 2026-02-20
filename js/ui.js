document.addEventListener('DOMContentLoaded', () => {
    // Mostrar nombre en header
    const nombreCajeroEl = document.querySelector('.nombre-cajero');
    if (nombreCajeroEl && USUARIO_DATA) {
        nombreCajeroEl.textContent = USUARIO_DATA.NombreCompleto || USUARIO_DATA.nombreCompleto || USUARIO_DATA.username || 'Usuario';
    }

    // Reloj
    function actualizarReloj() {
        const ahora = new Date();
        const texto = ahora.toLocaleString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true });
        document.querySelectorAll('.fecha-hora-reloj').forEach(s => s.textContent = texto);
        const fc = document.getElementById('fechaCierre'); if(fc) fc.textContent = ahora.toLocaleDateString('es-PE');
    }
    setInterval(actualizarReloj, 1000); actualizarReloj();

    // Navegación (Tabs)
    const btnToggle = document.getElementById('btnToggleMenu');
    const sidebar = document.getElementById('sidebar');
    const menuItems = document.querySelectorAll('.item-menu');
    const vistas = document.querySelectorAll('.vista-seccion');

    menuItems.forEach(item => {
        item.addEventListener('click', function(e) {
            const href = this.getAttribute('href');
            if(href === '#' || !href) e.preventDefault();
            
            menuItems.forEach(i => i.classList.remove('activo'));
            this.classList.add('activo');
            
            const targetId = this.getAttribute('data-target');
            if(targetId) {
                vistas.forEach(v => {
                    v.style.display = 'none'; v.classList.remove('activa');
                    if(v.id === targetId) {
                        v.style.display = 'block'; setTimeout(() => v.classList.add('activa'), 10);
                        // Disparar eventos de carga según la vista
                        if(targetId === 'vista-cierre' && window.cargarDatosCierre) window.cargarDatosCierre();
                        if(targetId === 'vista-anulacion' && window.cargarHistorial) window.cargarHistorial();
                        if(targetId === 'vista-roles' && window.cargarUsuarios) window.cargarUsuarios();
                        if(targetId === 'vista-financiero' && window.inicializarGraficos) window.inicializarGraficos();
                        if(targetId === 'vista-admin-maestros' && window.cargarAdminCategorias) window.cargarAdminCategorias(); 
                    }
                });
            }
            if(window.innerWidth <= 768 && sidebar) { 
                sidebar.classList.remove('mobile-open'); 
                if(btnToggle) btnToggle.classList.remove('activo'); 
            }
        });
    });

    if(btnToggle) btnToggle.addEventListener('click', (e) => { 
        e.stopPropagation(); 
        btnToggle.classList.toggle('activo'); 
        sidebar.classList.toggle(window.innerWidth > 768 ? 'colapsado' : 'mobile-open'); 
    });

    // Logout
    const btnLogout = document.getElementById('btnCerrarSesion');
    if(btnLogout) {
        btnLogout.addEventListener('click', async () => {
            if(!confirm("¿Deseas cerrar sesión del sistema?")) return;
            localStorage.removeItem('usuarioSesion');
            window.location.href = '../html/login.html';
        });
    }

    // Configuración Inicial de Inputs
    window.activarSelector('selectorComprobante', 'segmento', 'inputComprobante');
    window.activarSelector('selectorComprobanteTarjeta', 'segmento', 'inputComprobanteTarjeta');
    window.configurarInputAlfanumerico('numOperacion', 15); 
    window.configurarInputAlfanumerico('numOperacionTarjeta', 6);
});

// --- FUNCIONES UTILITARIAS EXPORTADAS ---

window.mostrarNotificacion = function(mensaje, tipo = 'exito') {
    const toast = document.createElement('div');
    toast.style.cssText = `
        position: fixed; top: 20px; right: 20px; z-index: 9999;
        padding: 15px 25px; border-radius: 8px; color: white;
        font-family: 'Segoe UI', sans-serif; font-weight: bold;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        animation: deslizar 0.5s ease forwards;
        background: ${tipo === 'error' ? '#ef4444' : '#10b981'};
    `;
    toast.innerHTML = `${tipo === 'error' ? '❌' : '✅'} ${mensaje}`;
    document.body.appendChild(toast);
    setTimeout(() => { toast.style.opacity = '0'; setTimeout(() => toast.remove(), 500); }, 3000);
}

// Estilo de animación
const style = document.createElement('style');
style.innerHTML = `@keyframes deslizar { from { transform: translateX(100%); } to { transform: translateX(0); } }`;
document.head.appendChild(style);

window.activarSelector = function(idContenedor, claseItems, idInputHidden) {
    const contenedor = document.getElementById(idContenedor);
    const input = document.getElementById(idInputHidden);
    if (contenedor && input) {
        const items = contenedor.querySelectorAll(`.${claseItems}`);
        items.forEach(btn => {
            btn.addEventListener('click', () => {
                items.forEach(i => i.classList.remove('seleccionado'));
                btn.classList.add('seleccionado');
                input.value = btn.getAttribute('data-value');
            });
        });
    }
}

window.configurarInputAlfanumerico = function(idInput, longitudMaxima) {
    const input = document.getElementById(idInput);
    if (input) {
        input.setAttribute('maxlength', longitudMaxima);
        input.addEventListener('input', function() {
            let valor = this.value.toUpperCase();
            this.value = valor.replace(/[^A-Z0-9]/g, '');
        });
    }
}

window.abrirModalUsuario = () => document.getElementById('modalUsuario')?.classList.add('mostrar');
window.cerrarModalUsuario = () => document.getElementById('modalUsuario')?.classList.remove('mostrar');