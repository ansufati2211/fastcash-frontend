document.addEventListener('DOMContentLoaded', () => {
    
    // ==========================================
    // 1. GESTIÓN DE PERFIL LATERAL Y PERMISOS
    // ==========================================
    if (typeof window.USUARIO_DATA !== 'undefined' && window.USUARIO_DATA) {
        
        const elNombreSidebar = document.getElementById('nombreUsuarioSidebar');
        const elRolSidebar = document.getElementById('rolUsuarioSidebar');
        const elFotoPerfil = document.getElementById('fotoPerfilUsuario');
        const elIconoDefault = document.getElementById('iconoAvatarDefault');
        
        const itemsAdmin = document.querySelectorAll('.admin, .item-menu[data-target="vista-reportes"], .item-menu[data-target="vista-roles"], .item-menu[data-target="vista-financiero"], #btn-nav-admin');

        // A. Asignar el Nombre (Lectura limpia del backend estandarizado)
        if (elNombreSidebar) {
            elNombreSidebar.textContent = window.USUARIO_DATA.nombreCompleto || window.USUARIO_DATA.username || 'Usuario';
        }

        // B. Asignar el Rol, pintar el globo y ocultar/mostrar menús
        if (elRolSidebar) {
            const rolActual = window.ROL_USUARIO || 'CAJERO';
            elRolSidebar.textContent = rolActual;
            elRolSidebar.className = 'rol-cajero'; // Reset de la clase base
            
            if (rolActual === 'ADMINISTRADOR') {
                elRolSidebar.classList.add('rol-admin');
                
                itemsAdmin.forEach(item => {
                    if (item.id === 'btn-nav-admin') {
                        item.style.display = 'flex'; 
                    } else {
                        item.style.display = ''; 
                    }
                });
            } else {
                elRolSidebar.classList.add('rol-cajero');
                itemsAdmin.forEach(item => item.style.display = 'none');
            }
        }

        // C. Espacio listo para la Foto de Perfil
        if (elFotoPerfil && elIconoDefault) {
            const rutaFoto = null; // Modificar si en el futuro agregas fotos
            
            if (rutaFoto) {
                elFotoPerfil.src = rutaFoto;
                elFotoPerfil.style.display = 'block';
                elIconoDefault.style.display = 'none';
            } else {
                elFotoPerfil.style.display = 'none';
                elIconoDefault.style.display = 'block';
            }
        }
    }

    // ==========================================
    // 2. RELOJ DEL SISTEMA
    // ==========================================
    function actualizarReloj() {
        const ahora = new Date();
        const texto = ahora.toLocaleString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true });
        document.querySelectorAll('.fecha-hora-reloj').forEach(s => s.textContent = texto);
        const fc = document.getElementById('fechaCierre'); 
        if(fc) fc.textContent = ahora.toLocaleDateString('es-PE');
    }
    setInterval(actualizarReloj, 1000); 
    actualizarReloj();

    // ==========================================
    // 3. NAVEGACIÓN (TABS)
    // ==========================================
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
                        v.style.display = 'block'; 
                        setTimeout(() => v.classList.add('activa'), 10);
                        
                        // Disparar eventos de carga según la vista de forma segura
                        if(targetId === 'vista-cierre' && typeof window.cargarDatosCierre === 'function') window.cargarDatosCierre();
                        if(targetId === 'vista-anulacion' && typeof window.cargarHistorial === 'function') window.cargarHistorial();
                        if(targetId === 'vista-roles' && typeof window.cargarUsuarios === 'function') window.cargarUsuarios();
                        if(targetId === 'vista-financiero' && typeof window.inicializarGraficos === 'function') window.inicializarGraficos();
                        if(targetId === 'vista-admin-maestros' && typeof window.cargarAdminCategorias === 'function') window.cargarAdminCategorias(); 
                    }
                });
            }
            if(window.innerWidth <= 768 && sidebar) { 
                sidebar.classList.remove('mobile-open'); 
                if(btnToggle) btnToggle.classList.remove('activo'); 
            }
        });
    });

    if(btnToggle) {
        btnToggle.addEventListener('click', (e) => { 
            e.stopPropagation(); 
            btnToggle.classList.toggle('activo'); 
            sidebar.classList.toggle(window.innerWidth > 768 ? 'colapsado' : 'mobile-open'); 
        });
    }

    // ==========================================
    // 4. LOGOUT (Cierre Seguro)
    // ==========================================
    const btnLogout = document.getElementById('btnCerrarSesion');
    if(btnLogout) {
        btnLogout.addEventListener('click', () => {
            if(!confirm("¿Deseas cerrar sesión del sistema?")) return;
            localStorage.removeItem('usuarioSesion');
            // 🚀 MEJORA: .replace() borra el historial de navegación para evitar volver atrás con el botón del navegador
            window.location.replace('../html/login.html');
        });
    }

    // ==========================================
    // 5. CONFIGURACIÓN INICIAL DE INPUTS
    // ==========================================
    window.activarSelector('selectorComprobante', 'segmento', 'inputComprobante');
    window.activarSelector('selectorComprobanteTarjeta', 'segmento', 'inputComprobanteTarjeta');
    window.configurarInputAlfanumerico('numOperacion', 15); 
    window.configurarInputAlfanumerico('numOperacionTarjeta', 6);

    // ==========================================
    // 6. MOTOR DE TEMAS (THEMING) - NUEVO
    // ==========================================
    const btnTema = document.getElementById('btnSelectorTema');
    const menuTemas = document.getElementById('menuTemasOpciones');
    const iconoTema = document.getElementById('iconoTemaActual');
    const btnOpcionesTema = document.querySelectorAll('.opcion-tema');

    const iconosTema = {
        'light': '☀️',
        'dark': '🌙',
        'pink': '🌸',
        'red': '🔥'
    };

    const temaGuardado = localStorage.getItem('temaFastCash') || 'light';
    aplicarTema(temaGuardado);

    if (btnTema) {
        btnTema.addEventListener('click', (e) => {
            e.stopPropagation();
            if(menuTemas) menuTemas.classList.toggle('mostrar');
        });
    }

    document.addEventListener('click', (e) => {
        if (menuTemas && menuTemas.classList.contains('mostrar')) {
            menuTemas.classList.remove('mostrar');
        }
    });

    btnOpcionesTema.forEach(boton => {
        boton.addEventListener('click', () => {
            const nuevoTema = boton.getAttribute('data-theme');
            aplicarTema(nuevoTema);
        });
    });

    function aplicarTema(tema) {
        document.body.setAttribute('data-theme', tema);
        if (iconoTema) iconoTema.textContent = iconosTema[tema] || '🎨';
        localStorage.setItem('temaFastCash', tema);
    }
});

// ==========================================
// FUNCIONES UTILITARIAS EXPORTADAS GLOBALES
// ==========================================

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
    
    setTimeout(() => { 
        toast.style.opacity = '0'; 
        setTimeout(() => toast.remove(), 500); 
    }, 3000);
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

// ==========================================
// MODAL DE USUARIOS (Con Animación) - NUEVO
// ==========================================
window.abrirModalUsuario = () => {
    const modal = document.getElementById('modalUsuario');
    if(modal) {
        modal.classList.remove('saliendo');
        modal.classList.add('mostrar');
    }
};

window.cerrarModalUsuario = () => {
    const modal = document.getElementById('modalUsuario');
    if(modal) {
        modal.classList.remove('mostrar');
        modal.classList.add('saliendo');
        setTimeout(() => {
            modal.classList.remove('saliendo');
        }, 300);
    }
};