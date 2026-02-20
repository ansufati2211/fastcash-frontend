// ==========================================
// 1. CONFIGURACIÓN GLOBAL Y SESIÓN
// ==========================================
// Definimos las variables en el objeto WINDOW para acceso global absoluto
window.BASE_URL = 'https://fastcash-backend-production.up.railway.app/api';
window.CAJA_ABIERTA = false; 
window.USUARIO_ID = null;
window.TOKEN = '';
window.ROL_USUARIO = 'CAJERO';
window.USUARIO_DATA = null;

// Mapa de Iconos Global
window.MAPA_ICONOS = {
    'Comestibles': '🛒', 'Bebidas': '🥤', 'Licores': '🍷',
    'Limpieza': '🧹', 'Cuidado Personal': '🧴', 'Frescos': '🥦',
    'Plasticos': '🍽️', 'Libreria': '✏️', 'Bazar': '🛍️',
    'Yape': '🟣', 'Plin': '🔵', 'BCP': '🟠', 'BBVA': '🔵',
    'Interbank': '🟢', 'Scotiabank': '🔴', 'Efectivo': '💵'
};

// Inicialización Inmediata
(function initSession() {
    const usuarioData = localStorage.getItem('usuarioSesion');
    
    if (!usuarioData) { 
        window.location.href = '../html/login.html'; 
        return;
    }
    
    // Guardamos en window
    window.USUARIO_DATA = JSON.parse(usuarioData);
    
    // Obtención segura del ID
    window.USUARIO_ID = window.USUARIO_DATA.usuarioID || window.USUARIO_DATA.UsuarioID || window.USUARIO_DATA.usuarioid || window.USUARIO_DATA.id;
    window.TOKEN = window.USUARIO_DATA.token || ''; 

    // Validación Crítica
    if (!window.USUARIO_ID) {
        console.error("⛔ Error Crítico: ID de usuario no encontrado.");
        localStorage.removeItem('usuarioSesion');
        window.location.href = '../html/login.html';
        return;
    }

    // Determinación del Rol
    if (window.USUARIO_DATA.Rol) window.ROL_USUARIO = window.USUARIO_DATA.Rol.toUpperCase();
    else if (window.USUARIO_DATA.rol) window.ROL_USUARIO = window.USUARIO_DATA.rol.toUpperCase();
    else if (window.USUARIO_DATA.RolID === 1 || window.USUARIO_DATA.rolID === 1) window.ROL_USUARIO = "ADMINISTRADOR";

    console.log(`✅ Sesión iniciada: ID ${window.USUARIO_ID} - ${window.ROL_USUARIO}`);
})();