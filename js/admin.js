document.addEventListener('DOMContentLoaded', () => {
    // 1. Validar Permisos Visuales
    const itemsAdmin = document.querySelectorAll('.admin, .item-menu[data-target="vista-reportes"], .item-menu[data-target="vista-roles"], .item-menu[data-target="vista-financiero"], #btn-nav-admin');
    
    // Lógica simplificada usando la variable segura global
    if (window.ROL_USUARIO !== 'ADMINISTRADOR') {
        itemsAdmin.forEach(item => item.style.display = 'none');
    } else {
        const btnAdmin = document.getElementById('btn-nav-admin');
        if(btnAdmin) btnAdmin.style.display = 'block';
    }

    // 2. Configuración Modal Usuario
    const btnNuevoUsuario = document.querySelector('.btn-nuevo-usuario');
    if(btnNuevoUsuario) {
        btnNuevoUsuario.onclick = () => {
            document.getElementById('formUsuario').reset();
            document.getElementById('idUsuarioEdicion').value = "";
            document.getElementById('tituloModalUsuario').textContent = "Nuevo Usuario";
            document.getElementById('passUsuario').required = true;
            document.getElementById('passUsuario').placeholder = "Contraseña";
            document.getElementById('turnoUsuario').value = 1; 
            const selEstado = document.getElementById('estadoUsuario');
            if(selEstado) selEstado.value = 'true';
            abrirModalUsuario();
        };
    }

    const formUsuario = document.getElementById('formUsuario');
    if (formUsuario) {
        const nuevoForm = formUsuario.cloneNode(true);
        formUsuario.parentNode.replaceChild(nuevoForm, formUsuario);
        nuevoForm.addEventListener('submit', guardarUsuario);
    }
    
    // 3. Configuración Admin Maestros
    document.getElementById('form-admin')?.addEventListener('submit', guardarMaestro);
});

// ==========================================
// GESTIÓN DE USUARIOS
// ==========================================
window.cargarUsuarios = async function() {
    const cuerpoTabla = document.getElementById('cuerpoTablaUsuarios');
    if (!cuerpoTabla) return; 

    try {
        // SEGURIDAD: Inyección de JWT
        const res = await fetch(`${window.BASE_URL}/admin/usuarios?t=${new Date().getTime()}`, { 
            headers: window.getAuthHeaders() 
        });
        
        if (!res.ok) throw new Error("Error cargando usuarios");
        const usuariosDB = await res.json();
        cuerpoTabla.innerHTML = '';

        if (usuariosDB.length === 0) { 
            cuerpoTabla.innerHTML = '<tr><td colspan="8" style="text-align:center;">Sin usuarios</td></tr>'; 
            return; 
        }

        usuariosDB.forEach(u => {
            // 🚀 OMNI-FALLBACK: Lectura a prueba de balas (Soporta PostgreSQL puro o Spring Boot)
            const uid = u.usuarioId || u.usuarioID || u.UsuarioID || u.usuarioid || u.id; 
            const rolNombre = u.rol || u.Rol || 'CAJERO';
            const rolClase = (String(rolNombre).toUpperCase().includes('ADMIN')) ? 'admin' : 'cajero';
            const esActivo = (u.activo === true || u.Activo === true || String(u.activo) === "true");
            const nombre = u.nombreCompleto || u.NombreCompleto || u.nombrecompleto;
            const uname = u.username || u.Username;
            const turno = u.turnoActual || u.TurnoActual || u.turnoactual || '-';
            
            if (!uid) return; // Validación de seguridad

            const fila = `<tr style="${!esActivo ? 'opacity:0.5' : ''}">
                <td>${uid}</td>
                <td>${nombre}</td>
                <td><strong>${uname}</strong></td>
                <td>${turno}</td>
                <td><span class="badge-rol ${rolClase}">${rolNombre}</span></td>
                <td>${esActivo ? '🟢 Activo' : '🔴 Inactivo'}</td>
                <td>******</td>
                <td style="display:flex; gap:8px; justify-content:center; margin-left:-26px;">
                    <button class="btn-accion-tabla editar" onclick="editarUsuario(${uid})" title="Editar Usuario">✏️</button>
                    ${esActivo ? `<button class="btn-accion-tabla eliminar" onclick="eliminarUsuario(${uid})" title="Desactivar Usuario">🗑️</button>` : ''}
                </td>
            </tr>`;
            cuerpoTabla.insertAdjacentHTML('beforeend', fila);
        });
    } catch (error) { console.error(error); }
}

window.editarUsuario = async (idUsuario) => {
    try {
        const res = await fetch(`${window.BASE_URL}/admin/usuarios?t=${new Date().getTime()}`, { 
            headers: window.getAuthHeaders() 
        });
        const usuarios = await res.json();
        
        // 🚀 OMNI-FALLBACK: Búsqueda flexible usando == para evitar problemas de String vs Int
        const user = usuarios.find(u => {
            const _id = u.usuarioId || u.usuarioID || u.UsuarioID || u.usuarioid || u.id;
            return _id == idUsuario;
        });

        if (!user) return;

        // 🚀 OMNI-FALLBACK: Asignación segura
        const uid = user.usuarioId || user.usuarioID || user.UsuarioID || user.usuarioid;
        const rolData = user.rol || user.Rol;
        const activo = user.activo !== undefined ? user.activo : user.Activo;
        const turnoId = user.turnoId || user.TurnoID || user.turnoid || 1;

        document.getElementById('idUsuarioEdicion').value = uid;
        document.getElementById('nombreUsuario').value = user.nombreCompleto || user.NombreCompleto || user.nombrecompleto;
        document.getElementById('usernameUsuario').value = user.username || user.Username; 
        document.getElementById('turnoUsuario').value = turnoId;
        document.getElementById('tituloModalUsuario').textContent = "Editar Usuario";
        
        const rolSelect = document.getElementById('rolUsuario');
        if (rolData && String(rolData).toUpperCase().includes('ADMIN')) {
            rolSelect.value = "1";
        } else {
            rolSelect.value = "2";
        }

        const selEstado = document.getElementById('estadoUsuario');
        if(selEstado) selEstado.value = (activo === true || String(activo) === 'true') ? 'true' : 'false';

        document.getElementById('passUsuario').placeholder = "(Dejar vacío para no cambiar)";
        document.getElementById('passUsuario').value = ""; 
        document.getElementById('passUsuario').required = false;

        abrirModalUsuario();
    } catch (e) { 
        console.error(e); 
        mostrarNotificacion("Error al cargar usuario", 'error'); 
    }
};

window.eliminarUsuario = async (idUsuario) => {
    if(!confirm("¿Estás seguro de DESACTIVAR este usuario?")) return;
    try {
        const res = await fetch(`${window.BASE_URL}/admin/usuario/${idUsuario}`, { 
            method: 'DELETE', 
            headers: window.getAuthHeaders() 
        });
        
        if(res.ok) { 
            mostrarNotificacion("Usuario desactivado."); 
            cargarUsuarios(); 
        } else { 
            const data = await res.json(); 
            mostrarNotificacion(`Error: ${data.message || data.error}`, 'error'); 
        }
    } catch(e) { console.error(e); }
};

async function guardarUsuario(e) {
    e.preventDefault();
    const idEdicion = document.getElementById('idUsuarioEdicion').value;
    const btnGuardar = e.target.querySelector('.btn-guardar');
    btnGuardar.innerHTML = 'Guardando...'; btnGuardar.disabled = true;

    // 🚀 OMNI-FALLBACK PAYLOAD: Duplicamos las variables clave para asegurar 
    // que el DTO de Spring Boot las atrape sin importar si usa camelCase o PascalCase.
    const payload = { 
        nombreCompleto: document.getElementById('nombreUsuario').value,
        username: document.getElementById('usernameUsuario').value,
        rolId: parseInt(document.getElementById('rolUsuario').value),
        rolID: parseInt(document.getElementById('rolUsuario').value),
        turnoId: parseInt(document.getElementById('turnoUsuario').value),
        turnoID: parseInt(document.getElementById('turnoUsuario').value)
    };
    
    if (idEdicion) {
        payload.usuarioId = parseInt(idEdicion);
        payload.usuarioID = parseInt(idEdicion);
        payload.activo = (document.getElementById('estadoUsuario').value === 'true');
        const pass = document.getElementById('passUsuario').value;
        if(pass && pass.trim() !== "") payload.password = pass;
    } else {
        payload.password = document.getElementById('passUsuario').value;
        payload.adminId = parseInt(window.USUARIO_ID); 
        payload.adminID = parseInt(window.USUARIO_ID); 
    }

    try {
        const res = await fetch(`${window.BASE_URL}/admin/usuario`, {
            method: idEdicion ? 'PUT' : 'POST',
            headers: window.getAuthHeaders(),
            body: JSON.stringify(payload)
        });
        if (!res.ok) throw new Error("Error al guardar");
        
        mostrarNotificacion(idEdicion ? "Usuario actualizado" : "Usuario creado");
        cerrarModalUsuario();
        cargarUsuarios();
    } catch (error) { 
        mostrarNotificacion("Error: " + error.message, 'error'); 
    } finally { 
        btnGuardar.innerHTML = 'Guardar'; btnGuardar.disabled = false; 
    }
}

// ==========================================
// GESTIÓN DE MAESTROS (CATEGORÍAS Y ENTIDADES)
// ==========================================
let entidadActualAdmin = null, modoEdicionAdmin = false;

window.cargarAdminCategorias = async function() {
    entidadActualAdmin = 'CATEGORIA';
    const workspace = document.getElementById('admin-workspace');
    if(workspace) workspace.innerHTML = 'Cargando categorías...';

    try {
        const res = await fetch(`${window.BASE_URL}/maestros/categorias`, { 
            headers: window.getAuthHeaders() 
        });
        const lista = await res.json();
        
        let html = `
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 1rem;">
                <h3 style="font-size: 1.2rem; color: var(--texto-principal);">📦 Listado de Categorías</h3>
                <button onclick="abrirModalCrear()" class="btn-nuevo-registro">+ Nueva Categoría</button>
            </div>
            <div class="tabla-responsive">
                <table class="tabla-transacciones">
                    <thead><tr><th>ID</th><th>Nombre</th><th>Estado</th><th>Acciones</th></tr></thead>
                    <tbody>`;
        
        lista.forEach(item => {
            // 🚀 OMNI-FALLBACK ID CATEGORIA
            const catId = item.categoriaID || item.categoriaId || item.categoriaid;
            html += `<tr>
                    <td>${catId}</td>
                    <td style="font-weight:600;">${item.nombre}</td>
                    <td>${item.activo ? '<span class="badge-estado completado">Activo</span>' : '<span class="badge-estado anulado">Inactivo</span>'}</td>
                    <td><button onclick="abrirModalEditarCategoria(${catId}, '${item.nombre}', ${item.activo})" class="btn-accion-tabla editar">✏️</button></td>
                </tr>`;
        });
        html += '</tbody></table></div>';
        workspace.innerHTML = html;
    } catch (e) { 
        if(workspace) workspace.innerHTML = '<p class="error" style="color:red;">Error cargando datos.</p>'; 
    }
}

window.cargarAdminEntidades = async function() {
    entidadActualAdmin = 'ENTIDAD';
    const workspace = document.getElementById('admin-workspace');
    if(workspace) workspace.innerHTML = 'Cargando entidades...';

    try {
        const res = await fetch(`${window.BASE_URL}/maestros/entidades`, { 
            headers: window.getAuthHeaders() 
        });
        const lista = await res.json();
        
        let html = `
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 1rem;">
                <h3 style="font-size: 1.2rem; color: var(--texto-principal);">🏦 Bancos y Billeteras</h3>
                <button onclick="abrirModalCrear()" class="btn-nuevo-registro">+ Nueva Entidad</button>
            </div>
            <div class="tabla-responsive">
                <table class="tabla-transacciones">
                    <thead><tr><th>ID</th><th>Nombre</th><th>Tipo</th><th>Estado</th><th>Acciones</th></tr></thead>
                    <tbody>`;
        
        lista.forEach(item => {
            // 🚀 OMNI-FALLBACK ID ENTIDAD
            const entId = item.entidadID || item.entidadId || item.entidadid;
            html += `<tr>
                    <td>${entId}</td>
                    <td style="font-weight:600;">${item.nombre}</td>
                    <td style="color: var(--texto-secundario);">${item.tipo}</td>
                    <td>${item.activo ? '<span class="badge-estado completado">Activo</span>' : '<span class="badge-estado anulado">Inactivo</span>'}</td>
                    <td><button onclick="abrirModalEditarEntidad(${entId}, '${item.nombre}', '${item.tipo}', ${item.activo})" class="btn-accion-tabla editar">✏️</button></td>
                </tr>`;
        });
        html += '</tbody></table></div>';
        workspace.innerHTML = html;
    } catch (e) { 
        if(workspace) workspace.innerHTML = '<p class="error" style="color:red;">Error cargando datos.</p>'; 
    }
}

window.abrirModalCrear = function() {
    modoEdicionAdmin = false;
    document.getElementById('modal-admin-titulo').innerText = `Crear ${entidadActualAdmin === 'CATEGORIA' ? 'Categoría' : 'Entidad'}`;
    document.getElementById('form-admin').reset();
    document.getElementById('admin-id').value = '';
    document.getElementById('group-admin-tipo').style.display = (entidadActualAdmin === 'ENTIDAD') ? 'block' : 'none';
    
    const modal = document.getElementById('modal-admin');
    modal.classList.remove('saliendo');
    modal.classList.add('mostrar');
}

window.abrirModalEditarCategoria = function(id, nombre, activo) {
    modoEdicionAdmin = true;
    entidadActualAdmin = 'CATEGORIA';
    document.getElementById('modal-admin-titulo').innerText = 'Editar Categoría';
    document.getElementById('admin-id').value = id;
    document.getElementById('admin-nombre').value = nombre;
    document.getElementById('admin-activo').value = activo;
    document.getElementById('group-admin-tipo').style.display = 'none';
    
    const modal = document.getElementById('modal-admin');
    modal.classList.remove('saliendo');
    modal.classList.add('mostrar');
}

window.abrirModalEditarEntidad = function(id, nombre, tipo, activo) {
    modoEdicionAdmin = true;
    entidadActualAdmin = 'ENTIDAD';
    document.getElementById('modal-admin-titulo').innerText = 'Editar Entidad';
    document.getElementById('admin-id').value = id;
    document.getElementById('admin-nombre').value = nombre;
    document.getElementById('admin-tipo').value = tipo;
    document.getElementById('admin-activo').value = activo;
    document.getElementById('group-admin-tipo').style.display = 'block';
    
    const modal = document.getElementById('modal-admin');
    modal.classList.remove('saliendo');
    modal.classList.add('mostrar');
}

window.cerrarModalAdmin = function() { 
    const modal = document.getElementById('modal-admin');
    modal.classList.remove('mostrar');
    modal.classList.add('saliendo');
    
    setTimeout(() => {
        modal.classList.remove('saliendo');
    }, 300); 
}
    
async function guardarMaestro(e) {
    e.preventDefault();
    const id = document.getElementById('admin-id').value;
    const body = { 
        nombre: document.getElementById('admin-nombre').value, 
        activo: document.getElementById('admin-activo').value === 'true' 
    };
    
    let url = `${window.BASE_URL}/maestros`;
    if (entidadActualAdmin === 'CATEGORIA') {
        url += '/categorias';
    } else { 
        url += '/entidades'; 
        body.tipo = document.getElementById('admin-tipo').value; 
    }
    
    if(modoEdicionAdmin) url += `/${id}`;

    try {
        const res = await fetch(url, {
            method: modoEdicionAdmin ? 'PUT' : 'POST',
            headers: window.getAuthHeaders(),
            body: JSON.stringify(body)
        });
        
        if(res.ok) { 
            mostrarNotificacion('Operación guardada correctamente'); 
            cerrarModalAdmin(); 
            if (entidadActualAdmin === 'CATEGORIA') cargarAdminCategorias(); 
            else cargarAdminEntidades(); 
            
            if (typeof cargarCategoriasVenta === 'function') cargarCategoriasVenta(); 
            if (typeof cargarMetodosPago === 'function') cargarMetodosPago(); 
        } else { 
            mostrarNotificacion('No se pudo guardar.', 'error'); 
        }
    } catch (error) { console.error(error); }
}

window.mostrarSeccionAdmin = function() {
    document.querySelectorAll('.item-menu').forEach(i => i.classList.remove('activo'));
    
    const btnAdmin = document.getElementById('btn-nav-admin');
    if(btnAdmin) btnAdmin.classList.add('activo');
    
    document.querySelectorAll('.vista-seccion').forEach(v => {
        v.style.display = 'none';
        v.classList.remove('activa');
    });
    
    const vistaAdmin = document.getElementById('vista-admin-maestros');
    if (vistaAdmin) {
        vistaAdmin.style.display = 'block';
        setTimeout(() => vistaAdmin.classList.add('activa'), 10);
    }
    
    if (typeof window.cargarAdminCategorias === 'function') {
        window.cargarAdminCategorias();
    }
};