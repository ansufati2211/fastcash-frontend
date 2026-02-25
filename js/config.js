// ==========================================
// 1. CONFIGURACIÓN GLOBAL Y SESIÓN
// ==========================================
// Definimos las variables base en el objeto WINDOW
const esLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.2';

window.BASE_URL = esLocal 
    ? 'http://localhost:8080/api' 
    : 'https://fastcash-backend-production.up.railway.app/api';
window.CAJA_ABIERTA = false; 
window.USUARIO_ID = null;
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

// ==========================================
// 2. INICIALIZACIÓN SEGURA DE SESIÓN (IIFE)
// ==========================================
(function initSession() {
    const usuarioDataStr = localStorage.getItem('usuarioSesion');
    
    if (!usuarioDataStr) { 
        window.location.href = '../html/login.html'; 
        return;
    }
    
    try {
        const sessionData = JSON.parse(usuarioDataStr);
        
        // 1. Lectura Limpia (Gracias a la estandarización del Backend con @JsonProperty)
        window.USUARIO_ID = sessionData.usuarioID;
        window.ROL_USUARIO = sessionData.rol ? sessionData.rol.toUpperCase() : 'CAJERO';
        window.USUARIO_DATA = sessionData;

        // Validación Crítica
        if (!window.USUARIO_ID) {
            throw new Error("ID de usuario no encontrado en los datos de la sesión.");
        }

        // 2. ENCAPSULACIÓN DEL TOKEN (Evita robo por consola)
        const _token = sessionData.token || ''; 
        
        // 3. GENERADOR DE CABECERAS SEGURO
        // Esta función será la única forma de acceder al token en toda tu aplicación
        window.getAuthHeaders = function() {
            return {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + _token
            };
        };

        console.log(`✅ Sesión iniciada: ID ${window.USUARIO_ID} - ${window.ROL_USUARIO}`);
        
    } catch (error) {
        console.error("⛔ Error Crítico de Sesión:", error.message);
        localStorage.removeItem('usuarioSesion');
        window.location.href = '../html/login.html';
    }
})();