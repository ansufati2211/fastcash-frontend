// Referencias al DOM
const inputPassword = document.getElementById('password');
const formularioLogin = document.getElementById('formularioLogin');
const inputEmail = document.getElementById('email');

// Validación y Envío del formulario
formularioLogin.addEventListener('submit', function(e) {
    e.preventDefault();
    
    // Limpiamos espacios vacíos
    const email = inputEmail.value.trim();
    const password = inputPassword.value.trim();
    
    // --- VERIFICACIÓN DE SEGURIDAD (CLIENTE) ---
    
    // 1. Validación de campos vacíos
    if (!email || !password) {
        mostrarNotificacion('Por favor completa todos los campos', 'error');
        sacudirInput(!email ? inputEmail : inputPassword);
        return;
    }
    
    // 2. Validación de formato de email
    if (!esEmailValido(email)) {
        mostrarNotificacion('Por favor ingresa un email válido', 'error');
        sacudirInput(inputEmail);
        return;
    }
    
    // 3. Validación de longitud de contraseña
    if (password.length < 6) {
        mostrarNotificacion('La contraseña debe tener al menos 6 caracteres', 'error');
        sacudirInput(inputPassword);
        return;
    }
    
    // --- PROCESO DE LOGIN Y REDIRECCIÓN ---
    
    // Feedback visual en el botón
    const botonLogin = document.querySelector('.boton-login');
    botonLogin.style.pointerEvents = 'none'; // Evitar múltiples clics
    botonLogin.style.opacity = '0.8';
    botonLogin.innerHTML = '<span>Verificando...</span> ⏳';
    
    // Simular conexión al servidor (1.5 segundos)
    setTimeout(() => {
        mostrarNotificacion('¡Credenciales correctas! Entrando...', 'exito');
        
        // Animación de salida
        const contenedor = document.querySelector('.contenedor-login');
        if(contenedor) {
            contenedor.style.animation = 'alejarZoom 0.5s ease forwards';
            contenedor.style.opacity = '0';
        }
        
        // REDIRECCIÓN A INDEX.HTML
        setTimeout(() => {
            window.location.href = '/index.html';
        }, 800); 
        
    }, 1500);
});

// --- FUNCIONES AUXILIARES ---

function esEmailValido(email) {
    const regexEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regexEmail.test(email);
}

function sacudirInput(input) {
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

// Animaciones de entrada
document.addEventListener('DOMContentLoaded', () => {
    const inputs = document.querySelectorAll('input');
    const botones = document.querySelectorAll('button');
    
    [...inputs, ...botones].forEach((el, indice) => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(10px)';
        el.style.transition = 'all 0.5s ease';
        
        setTimeout(() => {
            el.style.opacity = '1';
            el.style.transform = 'translateY(0)';
        }, 300 + (indice * 100));
    });
});

// Inyectar estilos de animación
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