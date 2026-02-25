// ==========================================
// 1. CONFIGURACIÓN
// ==========================================
const esLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.2';

const BASE_URL = esLocal 
    ? 'http://localhost:8080/api' 
    : 'https://fastcash-backend-production.up.railway.app/api';
// Función para prevenir inyección XSS básica
function sanitizarEntrada(texto) {
    const elemento = document.createElement('div');
    elemento.innerText = texto;
    return elemento.innerHTML;
}

document.addEventListener('DOMContentLoaded', () => {
    
    // --- REFERENCIAS DOM ---
    const btnToggle = document.getElementById('btnTogglePass');
    const inputPass = document.getElementById('password');
    const formulario = document.getElementById('formularioLogin');
    const inputUser = document.getElementById('username');
    const btnLogin = document.querySelector('.btn-login');
    const chkRemember = document.getElementById('chkRemember');

    // --- 1. LÓGICA RECORDAR SESIÓN (AL CARGAR) ---
    const savedUser = localStorage.getItem('fastcash_saved_user');
    if (savedUser) {
        inputUser.value = savedUser;
        if (chkRemember) chkRemember.checked = true;
        if (inputPass) inputPass.focus(); 
    }

    // --- LÓGICA VER/OCULTAR CONTRASEÑA ---
    if (btnToggle && inputPass) {
        btnToggle.addEventListener('click', () => {
            const tipo = inputPass.getAttribute('type') === 'password' ? 'text' : 'password';
            inputPass.setAttribute('type', tipo);
            
            btnToggle.classList.toggle('fa-eye');
            btnToggle.classList.toggle('fa-eye-slash');
        });
    }

    // --- LÓGICA LOGIN ---
    if (formulario) {
        formulario.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const username = sanitizarEntrada(inputUser.value.trim());
            const password = inputPass.value.trim(); 

            if (!username || !password) {
                mostrarToast('Por favor complete todos los campos', 'error');
                return;
            }

            // Estado de carga
            const textoOriginal = btnLogin.innerHTML;
            btnLogin.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Verificando...';
            btnLogin.disabled = true;
            btnLogin.style.opacity = '0.7';

            try {
                const response = await fetch(`${BASE_URL}/auth/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, password })
                });

                // Si la respuesta no es OK (ej. 401, 403, 500), capturamos el error real
                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    throw new Error(errorData.error || errorData.message || 'Credenciales incorrectas o servidor no disponible');
                }

                const data = await response.json();

                // 🚀 LECTURA ROBUSTA: Soportamos tanto camelCase como PascalCase
                // por si Jackson en Spring Boot decide cambiar el formato en el futuro.
                const idLeido = data.usuarioID || data.UsuarioID;
                const nombreLeido = data.nombreCompleto || data.NombreCompleto;
                const rolLeido = data.rol || data.Rol;
                const userLeido = data.username || data.Username;
                const tokenLeido = data.token || data.Token || 'token-temporal-hasta-implementar-jwt';

                if (!idLeido) {
                    throw new Error("El servidor no devolvió un ID de usuario válido.");
                }

                // Armamos el objeto de sesión perfecto para config.js
                const sessionData = {
                    usuarioID: idLeido,
                    nombreCompleto: nombreLeido,
                    rol: rolLeido,
                    username: userLeido,
                    token: tokenLeido 
                };

                // --- 2. LÓGICA RECORDAR SESIÓN (AL GUARDAR) ---
                if (chkRemember && chkRemember.checked) {
                    localStorage.setItem('fastcash_saved_user', username);
                } else {
                    localStorage.removeItem('fastcash_saved_user');
                }

                localStorage.setItem('usuarioSesion', JSON.stringify(sessionData));
                
                mostrarToast(`¡Bienvenido, ${sessionData.nombreCompleto}!`, 'success');
                
                const contenedor = document.querySelector('.contenedor-login');
                if (contenedor) {
                    contenedor.style.transform = 'scale(0.95)';
                    contenedor.style.opacity = '0';
                }
                
                setTimeout(() => window.location.href = 'index.html', 1000);

            } catch (error) {
                console.error("Error en Login:", error);
                mostrarToast(error.message, 'error');
                
                if (inputUser) inputUser.style.borderColor = 'var(--color-primario)';
                if (inputPass) inputPass.style.borderColor = 'var(--color-primario)';
                
                setTimeout(() => {
                    if (inputUser) inputUser.style.borderColor = '';
                    if (inputPass) inputPass.style.borderColor = '';
                }, 2000);
            } finally {
                if (btnLogin) {
                    btnLogin.innerHTML = textoOriginal;
                    btnLogin.disabled = false;
                    btnLogin.style.opacity = '1';
                }
            }
        });
    }
});

// --- SISTEMA DE NOTIFICACIONES (TOAST) ---
function mostrarToast(mensaje, tipo = 'info') {
    const toast = document.createElement('div');
    toast.className = 'toast-notificacion';
    toast.textContent = mensaje;
    
    toast.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${tipo === 'error' ? '#ef4444' : '#10b981'};
        color: white;
        padding: 12px 24px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        font-weight: 600;
        z-index: 1000;
        animation: slideIn 0.3s ease forwards;
        display: flex;
        align-items: center;
        gap: 10px;
    `;

    document.body.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = 'slideOut 0.3s ease forwards';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

const styleSheet = document.createElement("style");
styleSheet.innerText = `
    @keyframes slideIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
    @keyframes slideOut { from { transform: translateX(0); opacity: 1; } to { transform: translateX(100%); opacity: 0; } }
`;
document.head.appendChild(styleSheet);