// ==========================================
// 1. CONFIGURACIÓN DE CONEXIÓN (RAILWAY)
// ==========================================
// URL de tu Backend en la nube + el prefijo "/api"
const BASE_URL = 'https://fastcash-backend-production.up.railway.app/api'; 

// Referencias al DOM
const inputPassword = document.getElementById('password');
const formularioLogin = document.getElementById('formularioLogin');
const inputUsuario = document.getElementById('username'); 

// Validación y Envío del formulario
formularioLogin.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    // Limpiamos espacios vacíos
    const username = inputUsuario.value.trim();
    const password = inputPassword.value.trim();
    
    // --- VERIFICACIÓN DE SEGURIDAD (CLIENTE) ---
    if (!username || !password) {
        mostrarNotificacion('Por favor completa todos los campos', 'error');
        sacudirInput(!username ? inputUsuario : inputPassword);
        return;
    }
    
    // --- EFECTO VISUAL DE CARGA ---
    const botonLogin = document.querySelector('.boton-login');
    const textoOriginal = botonLogin.innerHTML;
    
    botonLogin.style.pointerEvents = 'none'; 
    botonLogin.style.opacity = '0.8';
    botonLogin.innerHTML = '<span>Verificando...</span> ⏳';
    
    try {
        // CORRECCIÓN: Usamos BASE_URL (que ya incluye /api) + el endpoint específico
        const response = await fetch(`${BASE_URL}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
                username: username, 
                password: password 
            })
        });

        if (response.ok) {
            // --- ÉXITO ---
            const data = await response.json(); 
            
            // Adaptación a mayúsculas/minúsculas para compatibilidad total
            const sessionData = {
                UsuarioID: data.usuarioid || data.UsuarioID || data.usuarioID, 
                NombreCompleto: data.nombrecompleto || data.NombreCompleto,
                Rol: data.rol || data.Rol || data.RolID,
                Username: username 
            };
            
            // Verificación crítica
            if (!sessionData.UsuarioID) {
                throw new Error("Error: El servidor no devolvió el ID de usuario.");
            }

            // Guardamos sesión
            localStorage.setItem('usuarioSesion', JSON.stringify(sessionData));
            
            // Notificación y redirección
            mostrarNotificacion(`¡Bienvenido, ${sessionData.NombreCompleto || username}!`, 'exito');
            
            const contenedor = document.querySelector('.contenedor-login');
            if(contenedor) {
                contenedor.style.animation = 'alejarZoom 0.5s ease forwards';
                contenedor.style.opacity = '0';
            }
            
            setTimeout(() => {
                window.location.href = 'index.html'; 
            }, 800);

        } else {
            // --- ERROR DE CREDENCIALES ---
            const errorData = await response.json().catch(() => ({}));
            const mensajeError = errorData.error || 'Credenciales incorrectas';
            throw new Error(mensajeError); 
        }

    } catch (error) {
        console.error("Error:", error);
        
        let mensaje = error.message;
        if(error.message.includes('Failed to fetch')) {
            mensaje = 'No se pudo conectar con el servidor (Backend apagado o URL incorrecta)';
        }

        mostrarNotificacion(mensaje, 'error');
        sacudirInput(inputPassword);
        sacudirInput(inputUsuario);
        
        botonLogin.innerHTML = textoOriginal;
        botonLogin.style.pointerEvents = 'auto';
        botonLogin.style.opacity = '1';
    }
});

// --- FUNCIONES AUXILIARES ---

function sacudirInput(input) {
    if (!input) return;
    input.focus();
    input.style.animation = 'sacudir 0.5s ease';
    input.style.borderColor = 'var(--color-primario)';
    
    setTimeout(() => {
        input.style.animation = '';
        input.style.borderColor = '';
    }, 500);
}

function mostrarNotificacion(mensaje, tipo = 'info') {
    const notificacionExistente = document.querySelector('.notificacion');
    if (notificacionExistente) notificacionExistente.remove();

    const notificacion = document.createElement('div');
    notificacion.className = `notificacion notificacion-${tipo}`;
    notificacion.textContent = mensaje;
    
    const colorFondo = tipo === 'exito' ? '#4ade80' : 'var(--color-primario)';
    
    notificacion.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 1rem 1.5rem;
        background: ${colorFondo};
        color: white;
        border-radius: 10px;
        font-weight: 600;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 1000;
        animation: deslizarDerecha 0.3s ease;
        font-family: -apple-system, BlinkMacSystemFont, sans-serif;
    `;
    
    document.body.appendChild(notificacion);
    
    setTimeout(() => {
        notificacion.style.animation = 'deslizarFueraDerecha 0.3s ease forwards';
        setTimeout(() => notificacion.remove(), 300);
    }, 3000);
}

// Estilos dinámicos para animaciones
const estilo = document.createElement('style');
estilo.textContent = `
    @keyframes sacudir {
        0%, 100% { transform: translateX(0); }
        25% { transform: translateX(-5px); }
        75% { transform: translateX(5px); }
    }
    @keyframes deslizarDerecha {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    @keyframes deslizarFueraDerecha {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
    @keyframes alejarZoom {
        to { transform: scale(0.9); opacity: 0; }
    }
`;
document.head.appendChild(estilo);