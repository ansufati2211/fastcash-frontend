// ==========================================
// 1. CONFIGURACIÓN
// ==========================================
// URL solicitada por el usuario (Producción)
const BASE_URL = 'https://fastcash-backend-production.up.railway.app/api'; 

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
        // Opcional: Poner el foco en la contraseña automáticamente
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
            
            const username = inputUser.value.trim();
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

                const data = await response.json();

                if (response.ok) {
                    // ✅ LOGIN EXITOSO
                    
                    // Normalizar datos: Backend envía PascalCase (UsuarioID), Frontend usa camelCase (usuarioID)
                    // Esto es vital para que script.js pueda leer los datos correctamente.
                    const sessionData = {
                        usuarioID: data.UsuarioID,
                        nombreCompleto: data.NombreCompleto,
                        rol: data.Rol,
                        username: data.Username
                    };

                    if (!sessionData.usuarioID) throw new Error("ID de usuario no recibido del servidor");

                    // --- 2. LÓGICA RECORDAR SESIÓN (AL GUARDAR) ---
                    if (chkRemember && chkRemember.checked) {
                        localStorage.setItem('fastcash_saved_user', username);
                    } else {
                        localStorage.removeItem('fastcash_saved_user');
                    }

                    // Guardar Sesión Actual
                    localStorage.setItem('usuarioSesion', JSON.stringify(sessionData));
                    
                    mostrarToast(`¡Bienvenido, ${sessionData.nombreCompleto}!`, 'success');
                    
                    // Animación de salida
                    const contenedor = document.querySelector('.contenedor-login');
                    if (contenedor) {
                        contenedor.style.transform = 'scale(0.95)';
                        contenedor.style.opacity = '0';
                    }
                    
                    setTimeout(() => window.location.href = 'index.html', 1000);

                } else {
                    // Manejo de errores del backend
                    throw new Error(data.message || data.error || 'Credenciales incorrectas');
                }

            } catch (error) {
                console.error(error);
                mostrarToast(error.message, 'error');
                
                if (inputUser) inputUser.style.borderColor = 'var(--color-primario)';
                if (inputPass) inputPass.style.borderColor = 'var(--color-primario)';
                
                setTimeout(() => {
                    if (inputUser) inputUser.style.borderColor = '';
                    if (inputPass) inputPass.style.borderColor = '';
                }, 2000);
            } finally {
                // Restaurar botón
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

// Estilos dinámicos para las animaciones
const styleSheet = document.createElement("style");
styleSheet.innerText = `
    @keyframes slideIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
    @keyframes slideOut { from { transform: translateX(0); opacity: 1; } to { transform: translateX(100%); opacity: 0; } }
`;
document.head.appendChild(styleSheet);