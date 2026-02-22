document.addEventListener('DOMContentLoaded', () => {
    // 1. Validar Permisos Visuales
    const itemsAdmin = document.querySelectorAll('.admin, .item-menu[data-target="vista-reportes"], .item-menu[data-target="vista-roles"], .item-menu[data-target="vista-financiero"], #btn-nav-admin');
    
    if (ROL_USUARIO !== 'ADMINISTRADOR' && !ROL_USUARIO.includes('ADMIN')) {
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
        const res = await fetch(`${BASE_URL}/admin/usuarios?t=${new Date().getTime()}`, { headers: { 'Authorization': `Bearer ${TOKEN}` } });
        if (!res.ok) throw new Error("Error cargando usuarios");
        const usuariosDB = await res.json();
        cuerpoTabla.innerHTML = '';

        if (usuariosDB.length === 0) { cuerpoTabla.innerHTML = '<tr><td colspan="8" style="text-align:center;">Sin usuarios</td></tr>'; return; }

        usuariosDB.forEach(u => {
            const uid = u.UsuarioID || u.usuarioid || u.usuarioId;
            const rolClase = (String(u.Rol||u.rol).toUpperCase().includes('ADMIN')) ? 'admin' : 'cajero';
            const esActivo = (u.Activo||u.activo) == true || String(u.Activo||u.activo) === "true";
            
            const fila = `<tr style="${!esActivo ? 'opacity:0.5' : ''}">
                <td>${uid}</td>
                <td>${u.NombreCompleto||u.nombrecompleto}</td>
                <td><strong>${u.Username||u.username}</strong></td>
                <td>${u.TurnoActual||u.turnoactual||'-'}</td>
                <td><span class="badge-rol ${rolClase}">${u.Rol||u.rol}</span></td>
                <td>${esActivo ? '🟢 Activo' : '🔴 Inactivo'}</td>
                <td>******</td>
<td style="display:flex; gap:8px; justify-content:center; margin-left:-26px;">
    <button class="btn-accion-tabla editar" onclick="editarUsuario(${uid})" title="Editar Usuario">
        ✏️
    </button>
    ${esActivo ? `
    <button class="btn-accion-tabla eliminar" onclick="eliminarUsuario(${uid})" title="Desactivar Usuario">
        🗑️
    </button>` : ''}
</td>
            </tr>`;
            cuerpoTabla.insertAdjacentHTML('beforeend', fila);
        });
    } catch (error) { console.error(error); }
}

window.editarUsuario = async (idUsuario) => {
    try {
        const res = await fetch(`${BASE_URL}/admin/usuarios?t=${new Date().getTime()}`, { headers: { 'Authorization': `Bearer ${TOKEN}` } });
        const usuarios = await res.json();
        const user = usuarios.find(u => (u.UsuarioID || u.usuarioid || u.usuarioId) === idUsuario);
        if (!user) return;

        const uid = user.UsuarioID || user.usuarioid || user.usuarioId;
        const rolData = user.Rol || user.rol;
        const activo = user.Activo || user.activo;

        document.getElementById('idUsuarioEdicion').value = uid;
        document.getElementById('nombreUsuario').value = user.NombreCompleto || user.nombrecompleto;
        document.getElementById('usernameUsuario').value = user.Username || user.username; 
        document.getElementById('turnoUsuario').value = user.TurnoID || user.turnoid || 1;
        document.getElementById('tituloModalUsuario').textContent = "Editar Usuario";
        
        const rolSelect = document.getElementById('rolUsuario');
        // Lógica robusta para seleccionar Rol
        if (rolData && String(rolData).toUpperCase().includes('ADMIN')) {
            rolSelect.value = "1";
        } else {
            rolSelect.value = "2";
        }
        if (!rolSelect.value) rolSelect.value = (rolData && String(rolData).toUpperCase().includes('ADMIN')) ? 'Administrador' : 'Cajero';

        const selEstado = document.getElementById('estadoUsuario');
        if(selEstado) selEstado.value = (activo === true || String(activo) === 'true') ? 'true' : 'false';

        document.getElementById('passUsuario').placeholder = "(Dejar vacío para no cambiar)";
        document.getElementById('passUsuario').value = ""; 
        document.getElementById('passUsuario').required = false;

        abrirModalUsuario();
    } catch (e) { console.error(e); mostrarNotificacion("Error al cargar usuario", 'error'); }
};

window.eliminarUsuario = async (idUsuario) => {
    if(!confirm("¿Estás seguro de DESACTIVAR este usuario?")) return;
    try {
        const res = await fetch(`${BASE_URL}/admin/usuario/${idUsuario}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${TOKEN}` } });
        if(res.ok) { mostrarNotificacion("Usuario desactivado."); cargarUsuarios(); } 
        else { const data = await res.json(); mostrarNotificacion(`Error: ${data.message}`, 'error'); }
    } catch(e) { console.error(e); }
};

async function guardarUsuario(e) {
    e.preventDefault();
    const idEdicion = document.getElementById('idUsuarioEdicion').value;
    const btnGuardar = e.target.querySelector('.btn-guardar');
    btnGuardar.innerHTML = 'Guardando...'; btnGuardar.disabled = true;

    const payload = { 
        nombreCompleto: document.getElementById('nombreUsuario').value,
        username: document.getElementById('usernameUsuario').value,
        rolId: parseInt(document.getElementById('rolUsuario').value),
        turnoId: parseInt(document.getElementById('turnoUsuario').value)
    };
    
    if (idEdicion) {
        payload.usuarioId = parseInt(idEdicion);
        payload.activo = (document.getElementById('estadoUsuario').value === 'true');
        const pass = document.getElementById('passUsuario').value;
        if(pass && pass.trim() !== "") payload.password = pass;
    } else {
        payload.password = document.getElementById('passUsuario').value;
    }

    try {
        const res = await fetch(`${BASE_URL}/admin/usuario`, {
            method: idEdicion ? 'PUT' : 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${TOKEN}` },
            body: JSON.stringify(payload)
        });
        if (!res.ok) throw new Error("Error al guardar");
        
        mostrarNotificacion(idEdicion ? "Usuario actualizado" : "Usuario creado");
        cerrarModalUsuario();
        cargarUsuarios();
    } catch (error) { mostrarNotificacion("Error: " + error.message, 'error'); }
    finally { btnGuardar.innerHTML = 'Guardar'; btnGuardar.disabled = false; }
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
        const res = await fetch(`${BASE_URL}/maestros/categorias`, { headers: { 'Authorization': `Bearer ${TOKEN}` } });
        const lista = await res.json();
        let html = `
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <h3>📦 Listado de Categorías</h3>
                <button onclick="abrirModalCrear()" class="btn-nuevo-usuario">+ Nueva Categoría</button>
            </div>
            <table class="tabla-datos"><thead><tr><th>ID</th><th>Nombre</th><th>Estado</th><th>Acciones</th></tr></thead><tbody>`;
        lista.forEach(item => {
            html += `<tr><td>${item.categoriaID}</td><td>${item.nombre}</td>
            <td>${item.activo ? '<span class="badge-ok">Activo</span>' : '<span class="badge-no">Inactivo</span>'}</td>
            <td><button onclick="abrirModalEditarCategoria(${item.categoriaID}, '${item.nombre}', ${item.activo})" class="btn-accion-tabla editar">✏️</button></td></tr>`;
        });
        workspace.innerHTML = html + '</tbody></table>';
    } catch (e) { if(workspace) workspace.innerHTML = '<p class="error">Error cargando datos.</p>'; }
}

window.cargarAdminEntidades = async function() {
    entidadActualAdmin = 'ENTIDAD';
    const workspace = document.getElementById('admin-workspace');
    if(workspace) workspace.innerHTML = 'Cargando entidades...';

    try {
        const res = await fetch(`${BASE_URL}/maestros/entidades`, { headers: { 'Authorization': `Bearer ${TOKEN}` } });
        const lista = await res.json();
        let html = `
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <h3>🏦 Bancos y Billeteras</h3>
                <button onclick="abrirModalCrear()" class="btn-nuevo-usuario">+ Nueva Entidad</button>
            </div>
            <table class="tabla-datos"><thead><tr><th>ID</th><th>Nombre</th><th>Tipo</th><th>Estado</th><th>Acciones</th></tr></thead><tbody>`;
        lista.forEach(item => {
            html += `<tr><td>${item.entidadID}</td><td>${item.nombre}</td><td>${item.tipo}</td>
                    <td>${item.activo ? '<span class="badge-ok">Activo</span>' : '<span class="badge-no">Inactivo</span>'}</td>
                    <td><button onclick="abrirModalEditarEntidad(${item.entidadID}, '${item.nombre}', '${item.tipo}', ${item.activo})" class="btn-accion-tabla editar">✏️</button></td></tr>`;
        });
        html += '</tbody></table>';
        workspace.innerHTML = html;
    } catch (e) { if(workspace) workspace.innerHTML = '<p class="error">Error cargando datos.</p>'; }
}

window.abrirModalCrear = function() {
    modoEdicionAdmin = false;
    document.getElementById('modal-admin-titulo').innerText = `Crear ${entidadActualAdmin === 'CATEGORIA' ? 'Categoría' : 'Entidad'}`;
    document.getElementById('form-admin').reset();
    document.getElementById('admin-id').value = '';
    document.getElementById('group-admin-tipo').style.display = (entidadActualAdmin === 'ENTIDAD') ? 'block' : 'none';
    document.getElementById('modal-admin').style.display = 'block';
}

window.abrirModalEditarCategoria = function(id, nombre, activo) {
    modoEdicionAdmin = true;
    entidadActualAdmin = 'CATEGORIA';
    document.getElementById('modal-admin-titulo').innerText = 'Editar Categoría';
    document.getElementById('admin-id').value = id;
    document.getElementById('admin-nombre').value = nombre;
    document.getElementById('admin-activo').value = activo;
    document.getElementById('group-admin-tipo').style.display = 'none';
    document.getElementById('modal-admin').style.display = 'block';
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
    document.getElementById('modal-admin').style.display = 'block';
}

window.cerrarModalAdmin = function() { document.getElementById('modal-admin').style.display = 'none'; }

async function guardarMaestro(e) {
    e.preventDefault();
    const id = document.getElementById('admin-id').value;
    const body = { 
        nombre: document.getElementById('admin-nombre').value, 
        activo: document.getElementById('admin-activo').value === 'true' 
    };
    
    let url = `${BASE_URL}/maestros`;
    if (entidadActualAdmin === 'CATEGORIA') url += '/categorias';
    else { url += '/entidades'; body.tipo = document.getElementById('admin-tipo').value; }
    
    if(modoEdicionAdmin) url += `/${id}`;

    try {
        const res = await fetch(url, {
            method: modoEdicionAdmin ? 'PUT' : 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${TOKEN}` },
            body: JSON.stringify(body)
        });
        if(res.ok) { mostrarNotificacion('Operación guardada correctamente'); cerrarModalAdmin(); if (entidadActualAdmin === 'CATEGORIA') cargarAdminCategorias(); else cargarAdminEntidades(); cargarCategoriasVenta(); cargarMetodosPago(); }
        else { mostrarNotificacion('No se pudo guardar.', 'error'); }
    } catch (error) { console.error(error); }
}