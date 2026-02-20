document.addEventListener('DOMContentLoaded', () => {
    
    // ==========================================
    // 0. CONFIGURACIÓN INICIAL Y SESIÓN (CORREGIDO)
    // ==========================================
    //const BASE_URL = 'https://fastcash-backend-production.up.railway.app/api'; 

    const BASE_URL = 'http://localhost:8080/api';
    let CAJA_ABIERTA = false; 

    // 1. Recuperar sesión
    const usuarioData = localStorage.getItem('usuarioSesion');
    let TOKEN = '';
    
    if (!usuarioData) { 
        window.location.href = '../html/login.html'; 
        return;
    }
    
    const usuario = JSON.parse(usuarioData);
    
    // 2. OBTENCIÓN SEGURA DEL ID (CRÍTICO: Aquí estaba el error)
    // Buscamos todas las formas posibles en que pudo guardarse
    const USUARIO_ID = usuario.usuarioID || usuario.UsuarioID || usuario.usuarioid || usuario.id;
    TOKEN = usuario.token || ''; 

    // 3. Validación de Seguridad: Si no hay ID, la sesión no sirve.
    if (!USUARIO_ID) {
        console.error("⛔ Error Crítico: ID de usuario no encontrado en la sesión.");
        mostrarNotificacion("Tu sesión ha caducado o es inválida. Por favor ingresa nuevamente.");
        localStorage.removeItem('usuarioSesion');
        window.location.href = '../html/login.html';
        return; // Detenemos la ejecución
    }

    console.log(`✅ Sesión iniciada: ID ${USUARIO_ID} - ${usuario.NombreCompleto || usuario.nombreCompleto}`);

    // Mostrar nombre en el header
    const nombreCajeroEl = document.querySelector('.nombre-cajero');
    if (nombreCajeroEl) {
        nombreCajeroEl.textContent = usuario.NombreCompleto || usuario.nombreCompleto || usuario.username || 'Usuario';
    }

    // ==========================================
    // 0.1 CARGA DINÁMICA DE MAESTROS
    // ==========================================
const MAPA_ICONOS = {
        'Comestibles': '🛒', 'Bebidas': '🥤', 'Licores': '🍷',
        'Limpieza': '🧹', 'Cuidado Personal': '🧴', 'Frescos': '🥦',
        'Plasticos': '🍽️', 'Libreria': '✏️', 'Bazar': '🛍️',
        'Yape': '🟣', 'Plin': '🔵', 'BCP': '🟠', 'BBVA': '🔵',
        'Interbank': '🟢', 'Scotiabank': '🔴', 'Efectivo': '💵'
    };

    async function cargarCategoriasVenta() {
        try {
            const response = await fetch(`${BASE_URL}/maestros/categorias`, {
                headers: { 'Authorization': `Bearer ${TOKEN}` }
            });
            if (!response.ok) return;
            const categorias = await response.json();

            ['selectorFamilia', 'selectorFamiliaTarjeta'].forEach(idContenedor => {
                const contenedor = document.getElementById(idContenedor);
                const idInput = idContenedor === 'selectorFamilia' ? 'inputFamilia' : 'inputFamiliaTarjeta';
                
                if(contenedor) {
                    contenedor.innerHTML = ''; 
                    categorias.forEach(cat => {
                        if(cat.activo) {
                            const btn = document.createElement('button');
                            btn.type = 'button';
                            btn.className = 'card-familia'; 
                            btn.dataset.value = cat.categoriaID;
                            
                            const icono = MAPA_ICONOS[cat.nombre] || '📦';
                            btn.innerHTML = `<span class="emoji">${icono}</span><span class="label">${cat.nombre}</span>`;
                            
                            btn.addEventListener('click', function() {
                                contenedor.querySelectorAll('.card-familia').forEach(b => b.classList.remove('seleccionado'));
                                this.classList.add('seleccionado');
                                document.getElementById(idInput).value = cat.categoriaID;
                            });
                            contenedor.appendChild(btn);
                        }
                    });
                }
            });
        } catch (e) { console.error("Error cargando categorías:", e); }
    }

    async function cargarMetodosPago() {
        try {
            const response = await fetch(`${BASE_URL}/maestros/entidades`, {
                headers: { 'Authorization': `Bearer ${TOKEN}` }
            });
            if (!response.ok) return;
            const entidades = await response.json();

            const contenedorYape = document.getElementById('selectorDestino');
            if(contenedorYape) {
                contenedorYape.innerHTML = '';
                entidades.forEach(ent => {
                    if(ent.activo && (ent.tipo === 'BILLETERA' || ent.nombre.includes('BCP') || ent.nombre.includes('BBVA'))) {
                        const btn = document.createElement('button');
                        btn.type = 'button';
                        btn.className = 'chip-banco';
                        btn.dataset.value = ent.entidadID;
                        
                        let claseDot = 'generic';
                        if(ent.nombre.includes('BCP')) claseDot = 'bcp';
                        if(ent.nombre.includes('BBVA')) claseDot = 'bbva';
                        if(ent.nombre.includes('Yape')) claseDot = 'personal';
                        if(ent.nombre.includes('Plin')) claseDot = 'interbank';

                        btn.innerHTML = `<span class="dot ${claseDot}"></span> ${ent.nombre}`;
                        btn.addEventListener('click', function() {
                            contenedorYape.querySelectorAll('.chip-banco').forEach(b => b.classList.remove('seleccionado'));
                            this.classList.add('seleccionado');
                            document.getElementById('inputDestino').value = ent.entidadID;
                        });
                        contenedorYape.appendChild(btn);
                    }
                });
            }

            const contenedorTarjeta = document.getElementById('selectorBancoTarjeta');
            if(contenedorTarjeta) {
                contenedorTarjeta.innerHTML = '';
                entidades.forEach(ent => {
                    if(ent.activo && ent.tipo === 'BANCO') {
                        const btn = document.createElement('button');
                        btn.type = 'button';
                        btn.className = 'chip-banco';
                        btn.dataset.value = ent.entidadID;

                        let claseDot = 'generic';
                        if(ent.nombre.includes('Interbank')) claseDot = 'interbank';
                        if(ent.nombre.includes('Scotiabank')) claseDot = 'scotia';
                        
                        btn.innerHTML = `<span class="dot ${claseDot}"></span> ${ent.nombre}`;
                        btn.addEventListener('click', function() {
                            contenedorTarjeta.querySelectorAll('.chip-banco').forEach(b => b.classList.remove('seleccionado'));
                            this.classList.add('seleccionado');
                            document.getElementById('inputBancoTarjeta').value = ent.entidadID;
                        });
                        contenedorTarjeta.appendChild(btn);
                    }
                });
            }
        } catch (e) { console.error("Error cargando bancos:", e); }
    }

    cargarCategoriasVenta();
    cargarMetodosPago();

    // --- FUNCIÓN PARA NOTIFICACIONES BONITAS ---
function mostrarNotificacion(mensaje, tipo = 'exito') {
    const toast = document.createElement('div');
    toast.style.cssText = `
        position: fixed; top: 20px; right: 20px; z-index: 9999;
        padding: 15px 25px; border-radius: 8px; color: white;
        font-family: 'Segoe UI', sans-serif; font-weight: bold;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        animation: deslizar 0.5s ease forwards;
        background: ${tipo === 'error' ? '#ef4444' : '#10b981'}; /* Rojo o Verde */
    `;
    toast.innerHTML = `${tipo === 'error' ? '❌' : '✅'} ${mensaje}`;
    document.body.appendChild(toast);

    // Auto-eliminar a los 3 segundos
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 500);
    }, 3000);
}

// Estilo de animación (Agrégalo dinámicamente)
const style = document.createElement('style');
style.innerHTML = `@keyframes deslizar { from { transform: translateX(100%); } to { transform: translateX(0); } }`;
document.head.appendChild(style);

    // ==========================================
    // GESTIÓN DE PERMISOS
    // ==========================================
    let rolUsuario = "CAJERO";
    if (usuario.Rol) rolUsuario = usuario.Rol.toUpperCase();
    else if (usuario.rol) rolUsuario = usuario.rol.toUpperCase();
    else if (usuario.RolID === 1 || usuario.rolID === 1) rolUsuario = "ADMINISTRADOR";

    console.log("👮 Rol detectado:", rolUsuario);

    const itemsAdmin = document.querySelectorAll('.admin, .item-menu[data-target="vista-reportes"], .item-menu[data-target="vista-roles"], .item-menu[data-target="vista-financiero"], #btn-nav-admin');
    
    if (rolUsuario !== 'ADMINISTRADOR' && !rolUsuario.includes('ADMIN')) {
        itemsAdmin.forEach(item => item.style.display = 'none');
    } else {
        cargarFiltroUsuarios();
        cargarFiltroHistorial();
        const btnAdmin = document.getElementById('btn-nav-admin');
        if(btnAdmin) btnAdmin.style.display = 'block';
    }

    // =========================================================
    // 1. UTILIDADES UI
    // =========================================================
    function activarSelector(idContenedor, claseItems, idInputHidden) {
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
function configurarInputAlfanumerico(idInput, longitudMaxima) {
        const input = document.getElementById(idInput);
        if (input) {
            // Establecer el límite máximo de caracteres
            input.setAttribute('maxlength', longitudMaxima);
            
            input.addEventListener('input', function() {
                let valor = this.value.toUpperCase();
                
                this.value = valor.replace(/[^A-Z0-9]/g, '');
            });
        }
    }

    configurarInputAlfanumerico('numOperacion', 15); 
    configurarInputAlfanumerico('numOperacionTarjeta', 6);
    activarSelector('selectorComprobante', 'segmento', 'inputComprobante');
    activarSelector('selectorComprobanteTarjeta', 'segmento', 'inputComprobanteTarjeta');
    // =========================================================
    // 2. CONTROL DE CAJA (ABRIR / ESTADO)
    // =========================================================
    const btnAbrirCaja = document.getElementById('btnAbrirCaja');
    const areaTrabajo = document.querySelector('.area-trabajo');

    function actualizarEstadoVisualCaja(estaAbierta) {
        CAJA_ABIERTA = estaAbierta;
        if(btnAbrirCaja) btnAbrirCaja.style.display = estaAbierta ? 'none' : 'flex';
        if(areaTrabajo) { 
            if (estaAbierta) {
                areaTrabajo.style.opacity = "1"; 
                areaTrabajo.style.pointerEvents = "all"; 
            } else {
                if (rolUsuario.includes('ADMIN')) {
                    areaTrabajo.style.opacity = "1"; 
                    areaTrabajo.style.pointerEvents = "all"; 
                } else {
                    areaTrabajo.style.opacity = "0.5"; 
                    areaTrabajo.style.pointerEvents = "none"; 
                }
            }
        }
    }

    async function verificarEstadoCaja() {
        try {
            // USAMOS EL ID SEGURO
            const res = await fetch(`${BASE_URL}/caja/estado/${USUARIO_ID}`);
            if (res.ok) {
                const data = await res.json();
                actualizarEstadoVisualCaja(data.estado === 'ABIERTO');
            } else {
                actualizarEstadoVisualCaja(false);
            }
        } catch (e) {
            console.error("Error verificando caja:", e);
            actualizarEstadoVisualCaja(false);
        }
    }
    verificarEstadoCaja();

    if(btnAbrirCaja) {
        btnAbrirCaja.addEventListener('click', async () => {
            if(!confirm("¿Deseas abrir la caja para iniciar tu turno?")) return;
            
            const originalText = btnAbrirCaja.innerHTML;
            btnAbrirCaja.innerHTML = "Abriendo...";
            btnAbrirCaja.disabled = true;

            try {
                // USAMOS EL ID SEGURO
                const res = await fetch(`${BASE_URL}/caja/abrir`, {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        usuarioID: parseInt(USUARIO_ID), 
                        saldoInicial: 0.00 
                    })
                });

                if(res.ok) {
                    mostrarNotificacion(" Caja Abierta Correctamente. ¡Buen turno!");
                    actualizarEstadoVisualCaja(true);
                } else {
                    const err = await res.json().catch(() => ({}));
                    throw new Error(err.mensaje || err.error || "Error al abrir caja");
                }
            } catch (error) {
                mostrarNotificacion(" Error: " + error.message);
            } finally {
                btnAbrirCaja.innerHTML = originalText;
                btnAbrirCaja.disabled = false;
            }
        });
    }

    // ==========================================
    // 3. CIERRE DE SESIÓN
    // ==========================================
    const btnLogout = document.getElementById('btnCerrarSesion');
    if(btnLogout) {
        btnLogout.addEventListener('click', async () => {
            if(!confirm("¿Deseas cerrar sesión del sistema?")) return;
            localStorage.removeItem('usuarioSesion');
            window.location.href = '../html/login.html';
        });
    }

    // ==========================================
    // LOGICA CIERRE DE CAJA E IMPRESIÓN
    // ==========================================
    window.imprimirCierre = async () => {
        if(!confirm("⚠️ ¿Estás seguro de realizar el CIERRE DE CAJA?\n\nEsta acción finalizará tu turno, imprimirá el ticket y cerrará tu sesión.")) return;

        const btn = document.querySelector('.btn-imprimir-cierre');
        if(btn) { btn.disabled = true; btn.innerHTML = '<span>⚙️</span> Cerrando...'; }

        try {
            // USAMOS EL ID SEGURO
            const resReporte = await fetch(`${BASE_URL}/reportes/cierre-actual/${USUARIO_ID}`, {
                headers: { 'Authorization': `Bearer ${TOKEN}` }
            });
            if(!resReporte.ok) throw new Error("No se pudieron calcular los montos finales.");
            
            const data = await resReporte.json(); 
            const saldoFinalEsperado = data.SaldoEsperadoEnCaja || data.saldoesperadoencaja || 0;

            const setText = (id, valor) => {
                const el = document.getElementById(id);
                if(el) el.textContent = `S/ ${parseFloat(valor || 0).toFixed(2)}`;
            };

            // Llenar Datos del Ticket Visual
            document.getElementById('ticketFecha').textContent = new Date().toLocaleDateString('es-PE');
            document.getElementById('ticketHora').textContent = new Date().toLocaleTimeString('es-PE');
            const elNombre = document.getElementById('ticketCajeroNombre');
            if(elNombre) elNombre.textContent = (usuario.NombreCompleto || usuario.nombreCompleto || "Cajero").toUpperCase();

            // Datos financieros
            const vDig = data.VentasDigital || data.ventasdigital || 0;
            const vTarj = data.VentasTarjeta || data.ventastarjeta || 0;
            const vAnulado = data.TotalAnulado || data.totalanulado || 0;
            const vTotal = data.TotalVendido || data.totalvendido || 0;

            const elYapePrint = document.getElementById('ticketYapePrint');
            if(elYapePrint) elYapePrint.textContent = `S/ ${parseFloat(vDig).toFixed(2)}`;
            const elTarjetaPrint = document.getElementById('ticketTarjetaPrint');
            if(elTarjetaPrint) elTarjetaPrint.textContent = `S/ ${parseFloat(vTarj).toFixed(2)}`;
            setText('ticketAnuladoPrint', vAnulado); 
            setText('ticketTotalPrint', vTotal); 

            // Cerrar en Backend
            const resCierre = await fetch(`${BASE_URL}/caja/cerrar`, {
                method: 'POST', 
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${TOKEN}` },
                body: JSON.stringify({ 
                    usuarioID: parseInt(USUARIO_ID), 
                    saldoFinalReal: saldoFinalEsperado 
                })
            });

            if(!resCierre.ok) {
                const err = await resCierre.json();
                throw new Error(err.Mensaje || "Error al cerrar la caja en el sistema.");
            }

            setTimeout(() => {
                window.print(); 
                mostrarNotificacion(" CAJA CERRADA CORRECTAMENTE.\n\nSe cerrará la sesión ahora.");
                localStorage.removeItem('usuarioSesion');
                window.location.href = '../html/login.html'; 
            }, 800);

        } catch (error) {
            console.error(error);
            mostrarNotificacion(" ERROR CRÍTICO: " + error.message);
            if(btn) { btn.disabled = false; btn.innerHTML = '🖨️ CERRAR CAJA E IMPRIMIR'; }
        }
    };

   // ==========================================
   // 4. LÓGICA DE VENTAS (CORREGIDO FINAL)
   // ==========================================
   async function procesarPago(e, form, tipo, idInputFam, idContenedorFam) {
        e.preventDefault();

        if (typeof CAJA_ABIERTA !== 'undefined' && CAJA_ABIERTA === false) {
            mostrarNotificacion("🔒 CAJA CERRADA\nAbre turno primero para realizar ventas."); return;
        }

        const btn = form.querySelector('.btn-registrar-grande');
        const inputFam = document.getElementById(idInputFam);
        const monto = parseFloat(form.querySelector('input[type="number"]').value);

        // 1. Validaciones Básicas
        if (!inputFam || !inputFam.value) { mostrarNotificacion("⚠️ Selecciona una Familia (Categoría)"); return; }
        if (!monto || monto <= 0) { mostrarNotificacion("⚠️ Ingresa un monto válido"); return; }

        // Inicializamos con valores seguros
        let entidadId = 1; 
        let numOp = null;
        let compId = 2;
        let comprobanteExt = null; 

        // 2. Validación de Método de Pago y Entidad
        if (tipo === 'YAPE') {
            const valDestino = document.getElementById('inputDestino').value;
            // Si tiene valor, lo usamos. Si está vacío, se queda con el 1 (Yape) por defecto.
            if (valDestino && valDestino.trim() !== "") {
                entidadId = valDestino;
            }

            numOp = document.getElementById('numOperacion').value;
            if (!numOp) { mostrarNotificacion("⚠️ Ingrese el número de operación"); return; }

            compId = document.getElementById('inputComprobante').value;
            const inputExt = document.getElementById('txtComprobanteYape');
            if(inputExt) comprobanteExt = inputExt.value.trim();

        } else {
            // Lógica Tarjeta
            const valBanco = document.getElementById('inputBancoTarjeta').value;
            
            if (!valBanco || valBanco.trim() === "") {
                mostrarNotificacion("⚠️ Selecciona el Banco de la Tarjeta (Interbank, Scotiabank...)");
                return;
            }
            entidadId = valBanco;

            numOp = document.getElementById('numOperacionTarjeta').value;
            if (!numOp) { mostrarNotificacion("⚠️ Ingrese el Voucher/Lote"); return; }

            const inputCompT = document.getElementById('inputComprobanteTarjeta');
            if(inputCompT) compId = inputCompT.value;
            const inputExt = document.getElementById('txtComprobanteTarjeta');
            if(inputExt) comprobanteExt = inputExt.value.trim();
        }

        const originalText = btn.innerHTML;
        btn.innerHTML = 'Procesando...';
        btn.disabled = true;

        // ⚠️ CORRECCIÓN CRÍTICA: Usamos PascalCase (Mayúsculas) para los DTOs internos
        // porque Java tiene @JsonProperty("FormaPago"), etc.
        const payload = {
            usuarioID: parseInt(USUARIO_ID),
            tipoComprobanteID: parseInt(compId),
            clienteDoc: "00000000", 
            clienteNombre: "Publico General",
            comprobanteExterno: comprobanteExt,
            
            detalles: [{ 
                "CategoriaID": parseInt(inputFam.value), // PascalCase
                "Monto": monto                           // PascalCase
            }], 
            
            pagos: [{ 
                "FormaPago": tipo === 'YAPE' ? 'QR' : 'TARJETA', // PascalCase
                "Monto": monto,                                  // PascalCase
                "EntidadID": parseInt(entidadId),                // PascalCase
                "NumOperacion": numOp                            // PascalCase
            }]
        };

        try {
            const res = await fetch(`${BASE_URL}/ventas/registrar`, {
                method: 'POST', 
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${TOKEN}` },
                body: JSON.stringify(payload)
            });

            const data = await res.json();
            
            // Soportamos respuesta mayúscula o minúscula
            const status = data.Status || data.status; 
            const mensaje = data.Mensaje || data.mensaje;
            const ticket = data.Comprobante || data.comprobante;

            if (res.ok && status === 'OK') {
                mostrarNotificacion(` VENTA EXITOSA\nTicket: ${ticket}`);
                
                // Limpieza del formulario
                form.reset();
                const cont = document.getElementById(idContenedorFam);
                if(cont) cont.querySelectorAll('.seleccionado').forEach(el => el.classList.remove('seleccionado'));
                inputFam.value = "";
                
                // Reset inputs visuales
                if (tipo === 'YAPE') {
                    document.getElementById('inputDestino').value = "1"; // Reset a Yape
                    document.getElementById('inputComprobante').value = "2";
                    // Limpiar selección visual de bancos
                    const contBancos = document.getElementById('selectorDestino');
                    if(contBancos) contBancos.querySelectorAll('.seleccionado').forEach(b => b.classList.remove('seleccionado'));
                } else {
                    document.getElementById('inputBancoTarjeta').value = "";
                    document.getElementById('inputComprobanteTarjeta').value = "2";
                    const contBancos = document.getElementById('selectorBancoTarjeta');
                    if(contBancos) contBancos.querySelectorAll('.seleccionado').forEach(b => b.classList.remove('seleccionado'));
                }

            } else {
                throw new Error(mensaje || "No se pudo registrar la venta");
            }

        } catch (error) {
            console.error(error);
            mostrarNotificacion(` ERROR: ${error.message}`);
        } finally {
            btn.innerHTML = originalText; 
            btn.disabled = false;
        }
    }

    const fY = document.getElementById('formYape');
    if (fY) fY.addEventListener('submit', (e) => procesarPago(e, fY, 'YAPE', 'inputFamilia', 'selectorFamilia'));
    const fT = document.getElementById('formTarjeta');
    if (fT) fT.addEventListener('submit', (e) => procesarPago(e, fT, 'TARJETA', 'inputFamiliaTarjeta', 'selectorFamiliaTarjeta'));


    // ==========================================
    // 5. HISTORIAL DE VENTAS
    // ==========================================
    async function cargarFiltroHistorial() {
        if (!rolUsuario.includes('ADMIN')) return;
        const select = document.getElementById('filtroUsuarioHistorial');
        const wrapper = document.getElementById('wrapperFiltroHistorial');
        if(wrapper) wrapper.style.display = 'block'; 

        try {
            const res = await fetch(`${BASE_URL}/admin/usuarios`, {
                headers: { 'Authorization': `Bearer ${TOKEN}` }
            });
            if(res.ok) {
                const usuarios = await res.json();
                select.innerHTML = '<option value="">-- Ver Todos --</option>';
                usuarios.forEach(u => {
                    const uid = u.UsuarioID || u.usuarioid;
                    select.innerHTML += `<option value="${uid}">${u.NombreCompleto || u.nombrecompleto}</option>`;
                });
            }
        } catch(e) { console.error("Error cargando filtro historial", e); }
    }

    window.cargarHistorial = async function() {
        const cuerpoTabla = document.getElementById('cuerpoTablaTransacciones');
        if(!cuerpoTabla) return;

        const filtroSelect = document.getElementById('filtroUsuarioHistorial');
        const filtroID = filtroSelect ? filtroSelect.value : '';

        cuerpoTabla.innerHTML = '<tr><td colspan="8" style="text-align:center; padding: 2rem; color: #666;">⏳ Cargando datos...</td></tr>';

        try {
            // USAMOS EL ID SEGURO
            let url = `${BASE_URL}/ventas/historial/${USUARIO_ID}?_=${new Date().getTime()}`;
            if(filtroID) url += `&filtro=${filtroID}`;

            const res = await fetch(url);
            if(!res.ok) throw new Error("Error cargando historial");

            const ventas = await res.json();
            cuerpoTabla.innerHTML = '';

            if(ventas.length === 0) {
                cuerpoTabla.innerHTML = '<tr><td colspan="8" style="text-align:center;">📭 No hay ventas hoy.</td></tr>';
            } else {
                ventas.forEach(v => {
                    const fechaEmision = v.FechaEmision || v.fechaemision;
                    const estado = v.Estado || v.estado;
                    const cajero = v.Cajero || v.cajero;
                    const formaPago = v.FormaPago || v.formapago;
                    const familia = v.Familia || v.familia;
                    const refOp = v.RefOperacion || v.refoperacion || v.Comprobante || v.comprobante;
                    const importe = v.ImporteTotal || v.importetotal;
                    const ventaId = v.VentaID || v.ventaid;

                    const fecha = new Date(fechaEmision).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
                    const esAnulado = estado === 'ANULADO';
                    
                   const fila = `
                        <tr style="${esAnulado ? 'opacity: 0.6; background: #fff5f5;' : ''}">
                            <td style="font-weight:bold; color:#444;">${cajero || 'Cajero'}</td>
                            <td class="col-tipo">${formaPago === 'QR' || formaPago === 'YAPE' ? '📱 YAPE' : (formaPago === 'TARJETA' ? '💳 TARJETA' : '💵 EFECTIVO')}</td>
                            <td>${familia || 'Varios'}</td>
                            <td><div style="font-size:0.85rem; font-weight:bold;">${refOp}</div></td>
                            <td class="dato-monto">S/ ${parseFloat(importe).toFixed(2)}</td>
                            <td>${fecha}</td>
                            <td><span class="badge-estado ${esAnulado ? 'anulado' : 'completado'}">${estado}</span></td>
                            <td>
                                <button class="btn-tabla-anular" onclick="solicitarAnulacion(${ventaId})" ${esAnulado ? 'disabled' : ''}>🚫 Anular</button>
                            </td>
                        </tr>`;
                    cuerpoTabla.insertAdjacentHTML('beforeend', fila);
                });
            }
        } catch (error) { 
            cuerpoTabla.innerHTML = '<tr><td colspan="8" style="text-align:center; color:red;"> Error de conexión.</td></tr>'; 
        }
    };

    window.solicitarAnulacion = async (ventaId) => {
        if (!CAJA_ABIERTA) { mostrarNotificacion("🔒 Caja cerrada. No se puede anular."); return; }
        if (!confirm("¿Estás seguro de ANULAR esta venta?")) return;

        try {
            const res = await fetch(`${BASE_URL}/ventas/anular`, {
                method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${TOKEN}` },
                body: JSON.stringify({ 
                    ventaID: ventaId, 
                    usuarioID: parseInt(USUARIO_ID), 
                    motivo: "Anulación Manual" 
                })
            });

            if (res.ok) { 
                mostrarNotificacion(" Venta Anulada"); 
                cargarHistorial(); 
            } else { 
                const err = await res.json(); 
                mostrarNotificacion(" Error: " + (err.error || "Fallo anulación")); 
            }
        } catch (e) { mostrarNotificacion(" Error de red"); }
    };

// ==========================================
    // 6. GESTIÓN DE USUARIOS (ACTUALIZADO)
    // ==========================================
    async function cargarFiltroUsuarios() {
        const select = document.getElementById('filtroUsuarioReporte');
        const contenedor = document.getElementById('contenedorFiltroUsuario'); 
        if(!select) return;
        if(contenedor) contenedor.style.display = 'block'; 

        try {
            const res = await fetch(`${BASE_URL}/admin/usuarios`, {
                headers: { 'Authorization': `Bearer ${TOKEN}` }
            });
            if(res.ok) {
                const usuarios = await res.json();
                select.innerHTML = '<option value="">-- Todos los Cajeros --</option>';
                usuarios.forEach(u => {
                    // Soporte para mayúsculas/minúsculas según la BD
                    const uid = u.UsuarioID || u.usuarioid || u.usuarioId;
                    const nombre = u.NombreCompleto || u.nombrecompleto;
                    select.innerHTML += `<option value="${uid}">${nombre}</option>`;
                });
            }
        } catch(e) { console.error("Error cargando usuarios filtro", e); }
    }

    async function cargarUsuarios() {
        const cuerpoTabla = document.getElementById('cuerpoTablaUsuarios');
        if (!cuerpoTabla) return; 

        try {
            const res = await fetch(`${BASE_URL}/admin/usuarios?t=${new Date().getTime()}`, {
                headers: { 'Authorization': `Bearer ${TOKEN}` }
            });
            if (!res.ok) throw new Error("Error cargando usuarios");

            const usuariosDB = await res.json();
            cuerpoTabla.innerHTML = '';

            if (usuariosDB.length === 0) { 
                cuerpoTabla.innerHTML = '<tr><td colspan="8" style="text-align:center;">Sin usuarios</td></tr>'; 
                return; 
            }

            usuariosDB.forEach(u => {
                // Lectura robusta de propiedades (Soporta lo que devuelva el SQL)
                const uid = u.UsuarioID || u.usuarioid || u.usuarioId;
                const nombre = u.NombreCompleto || u.nombrecompleto;
                const username = u.Username || u.username;
                const turno = u.TurnoActual || u.turnoactual;
                const activo = u.Activo || u.activo;
                const rol = u.Rol || u.rol; // Puede venir como texto 'Administrador' o ID

                const rolClase = (String(rol).toUpperCase().includes('ADMIN')) ? 'admin' : 'cajero';
                const esActivo = activo === true || activo === 1 || String(activo) === "true";
                const estadoTexto = esActivo ? '🟢 Activo' : '🔴 Inactivo';
                const estiloFila = !esActivo ? 'opacity: 0.5;' : '';

                const fila = `<tr style="${estiloFila}">
                    <td>${uid}</td>
                    <td>${nombre}</td>
                    <td><strong>${username}</strong></td>
                    <td>${turno || '-'}</td>
                    <td><span class="badge-rol ${rolClase}">${rol}</span></td>
                    <td>${estadoTexto}</td>
                    <td>******</td>
                    <td style="display:flex; gap:10px; align-items:center;">
                        <button class="btn-editar" onclick="editarUsuario(${uid})" style="cursor:pointer; border:none; background:none; font-size:1.2rem;" title="Editar">✏️</button>
                        ${esActivo ? `<button class="btn-eliminar" onclick="eliminarUsuario(${uid})" style="cursor:pointer; border:none; background:none; font-size:1.2rem;" title="Desactivar">🗑️</button>` : ''}
                    </td>
                </tr>`;
                cuerpoTabla.insertAdjacentHTML('beforeend', fila);
            });
        } catch (error) { console.error(error); }
    }

    window.eliminarUsuario = async (idUsuario) => {
        if(!confirm("¿Estás seguro de DESACTIVAR este usuario?\n(Podrás reactivarlo después editándolo)")) return;
        try {
            const res = await fetch(`${BASE_URL}/admin/usuario/${idUsuario}`, { 
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${TOKEN}` }
            });
            if(res.ok) { 
                if(typeof mostrarNotificacion === 'function') mostrarNotificacion("Usuario desactivado."); 
                else alert("Usuario desactivado.");
                cargarUsuarios(); 
            } 
            else { 
                const data = await res.json().catch(() => ({})); 
                if(typeof mostrarNotificacion === 'function') mostrarNotificacion(`Error: ${data.message || "No se pudo desactivar"}`);
                else alert(`Error: ${data.message}`);
            }
        } catch(e) { console.error(e); alert("Error de conexión"); }
    };

    window.editarUsuario = async (idUsuario) => {
        try {
            const res = await fetch(`${BASE_URL}/admin/usuarios?t=${new Date().getTime()}`, {
                headers: { 'Authorization': `Bearer ${TOKEN}` }
            });
            const usuarios = await res.json();
            // Buscar usuario
            const user = usuarios.find(u => (u.UsuarioID || u.usuarioid || u.usuarioId) === idUsuario);
            if (!user) return;

            const uid = user.UsuarioID || user.usuarioid || user.usuarioId;
            const rolData = user.Rol || user.rol;
            const activo = user.Activo || user.activo;

            document.getElementById('idUsuarioEdicion').value = uid;
            document.getElementById('nombreUsuario').value = user.NombreCompleto || user.nombrecompleto;
            document.getElementById('usernameUsuario').value = user.Username || user.username; 
            
            // Selección de turno (con fallback a 1)
            document.getElementById('turnoUsuario').value = user.TurnoID || user.turnoid || 1;

            document.getElementById('tituloModalUsuario').textContent = "Editar Usuario";
            
            // Lógica para seleccionar el Rol en el combo
            const rolSelect = document.getElementById('rolUsuario');
            if (rolData && String(rolData).toUpperCase().includes('ADMIN')) {
                rolSelect.value = "1"; // Valor para Admin
            } else {
                rolSelect.value = "2"; // Valor para Cajero
            }
            // Fallback si los values del HTML son texto
            if (!rolSelect.value) {
                rolSelect.value = (rolData && String(rolData).toUpperCase().includes('ADMIN')) ? 'Administrador' : 'Cajero';
            }

            const selEstado = document.getElementById('estadoUsuario');
            if(selEstado) selEstado.value = (activo === true || activo === 1 || String(activo) === 'true') ? 'true' : 'false';

            document.getElementById('passUsuario').placeholder = "(Dejar vacío para no cambiar)";
            document.getElementById('passUsuario').value = ""; 
            document.getElementById('passUsuario').required = false;

            abrirModalUsuario();
        } catch (e) { console.error(e); alert("Error cargando usuario: " + e.message); }
    };

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
        // Clonar para limpiar eventos previos
        const nuevoForm = formUsuario.cloneNode(true);
        formUsuario.parentNode.replaceChild(nuevoForm, formUsuario);

        nuevoForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const idEdicion = document.getElementById('idUsuarioEdicion').value;
            const nombre = document.getElementById('nombreUsuario').value;
            const usernameInput = document.getElementById('usernameUsuario').value; 
            const pass = document.getElementById('passUsuario').value;
            
            // Obtener Rol y convertir a Entero
            const rolVal = document.getElementById('rolUsuario').value;
            let rol = 2; // Default Cajero
            if (rolVal == 1 || rolVal === 'Administrador' || rolVal === '1') rol = 1;

            const selectedTurno = document.getElementById('turnoUsuario').value;
            const estadoVal = document.getElementById('estadoUsuario')?.value;
            const esActivo = (estadoVal === 'true');

            const btnGuardar = nuevoForm.querySelector('.btn-guardar');
            const txtOriginal = btnGuardar.innerHTML;
            btnGuardar.innerHTML = 'Guardando...'; 
            btnGuardar.disabled = true;

            try {
                if (idEdicion) {
                    // --- ACTUALIZAR (PUT) ---
                    // IMPORTANTE: Nombres de propiedades en camelCase para el Backend DTO
                    const payload = { 
                        usuarioId: parseInt(idEdicion), // Antes usuarioID
                        nombreCompleto: nombre,
                        username: usernameInput,
                        rolId: parseInt(rol),           // Antes rolID
                        activo: esActivo,
                        turnoId: parseInt(selectedTurno) // Antes turnoID
                    };
                    if(pass && pass.trim() !== "") payload.password = pass;

                    await fetch(`${BASE_URL}/admin/usuario`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${TOKEN}` },
                        body: JSON.stringify(payload)
                    });
                    
                    if(typeof mostrarNotificacion === 'function') mostrarNotificacion("Usuario actualizado correctamente");
                    else alert("Usuario actualizado");

                } else {
                    // --- CREAR (POST) ---
                    const nuevoUsuario = {
                        nombreCompleto: nombre,
                        username: usernameInput, 
                        password: pass, 
                        rolId: parseInt(rol),           // Antes rolID
                        turnoId: parseInt(selectedTurno) // ✅ AHORA ENVIAMOS EL TURNO AL CREAR
                    };
                    
                    const res = await fetch(`${BASE_URL}/admin/usuario`, {
                        method: 'POST', 
                        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${TOKEN}` },
                        body: JSON.stringify(nuevoUsuario)
                    });
                    
                    if (!res.ok) { 
                        const err = await res.json(); 
                        throw new Error(err.mensaje || err.error || "Error al crear"); 
                    }
                    
                    if(typeof mostrarNotificacion === 'function') mostrarNotificacion(`Usuario creado: ${nuevoUsuario.username}`);
                    else alert("Usuario creado");
                }
                
                cerrarModalUsuario();
                nuevoForm.reset();
                cargarUsuarios();

            } catch (error) { 
                console.error(error);
                if(typeof mostrarNotificacion === 'function') mostrarNotificacion("Error: " + error.message, 'error');
                else alert("Error: " + error.message);
            } 
            finally { 
                btnGuardar.innerHTML = txtOriginal; 
                btnGuardar.disabled = false; 
            }
        });
    }
    // ==========================================
    // 7. ADMINISTRACIÓN MAESTROS
    // ==========================================
    let entidadActualAdmin = null; 
    let modoEdicionAdmin = false;

    window.mostrarSeccionAdmin = function() {
        document.querySelectorAll('.item-menu').forEach(i => i.classList.remove('activo'));
        const btnAdmin = document.getElementById('btn-nav-admin');
        if(btnAdmin) btnAdmin.classList.add('activo');
        document.querySelectorAll('.vista-seccion').forEach(v => v.style.display = 'none');
        document.getElementById('vista-admin-maestros').style.display = 'block';
    }

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
                        <td><button onclick="abrirModalEditarCategoria(${item.categoriaID}, '${item.nombre}', ${item.activo})" class="btn-edit">✏️</button></td></tr>`;
            });
            html += '</tbody></table>';
            workspace.innerHTML = html;
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
                        <td><button onclick="abrirModalEditarEntidad(${item.entidadID}, '${item.nombre}', '${item.tipo}', ${item.activo})" class="btn-edit">✏️</button></td></tr>`;
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

    document.getElementById('form-admin')?.addEventListener('submit', async function(e) {
        e.preventDefault();
        const id = document.getElementById('admin-id').value;
        const nombre = document.getElementById('admin-nombre').value;
        const activo = document.getElementById('admin-activo').value === 'true';
        
        let url = `${BASE_URL}/maestros`;
        let body = { nombre, activo };
        if (entidadActualAdmin === 'CATEGORIA') url += '/categorias';
        else { url += '/entidades'; body.tipo = document.getElementById('admin-tipo').value; }
        if (modoEdicionAdmin) url += `/${id}`;

        try {
            const response = await fetch(url, {
                method: modoEdicionAdmin ? 'PUT' : 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${TOKEN}` },
                body: JSON.stringify(body)
            });
            if (response.ok) {
                mostrarNotificacion('Operación guardada correctamente');
                cerrarModalAdmin();
                if (entidadActualAdmin === 'CATEGORIA') cargarAdminCategorias(); else cargarAdminEntidades();
                cargarCategoriasVenta(); cargarMetodosPago();
            } else { mostrarNotificacion('No se pudo guardar.'); }
        } catch (error) { console.error(error); }
    });

   // ==========================================
    // 8. REPORTES EXCEL "CORPORATIVO" 👔 (CORREGIDO)
    // ==========================================
 window.generarReporte = async (tipo) => {
        const inicio = document.getElementById('fechaInicio').value || 'Hoy';
        const fin = document.getElementById('fechaFin').value || inicio;
        const usuarioFiltro = document.getElementById('filtroUsuarioReporte')?.value;

        // 1. Preparar parámetros y Botón
        const params = new URLSearchParams();
        if (inicio !== 'Hoy') params.append('inicio', inicio);
        if (fin !== 'Hoy') params.append('fin', fin);

        if (typeof rolUsuario !== 'undefined' && (rolUsuario === 'ADMINISTRADOR' || rolUsuario.includes('ADMIN'))) {
            if (usuarioFiltro) params.append('usuarioID', usuarioFiltro);
        } else {
            params.append('usuarioID', USUARIO_ID);
        }

        let endpoint = (tipo === 'CAJAS') ? '/reportes/cajas' : '/reportes/ventas';
        const btn = document.querySelector(`button[onclick="generarReporte('${tipo}')"]`) || event.target.closest('button');
        const txtOriginal = btn ? btn.innerHTML : '';
        if (btn) { btn.innerHTML = '<span>⚙️</span> Procesando...'; btn.disabled = true; }

        try {
            // 2. Obtener Datos
            const res = await fetch(`${BASE_URL}${endpoint}?${params.toString()}`, {
                headers: { 'Authorization': `Bearer ${TOKEN}` }
            });
            if (!res.ok) throw new Error("Error obteniendo datos.");
            const data = await res.json();

            if (!data || data.length === 0) {
                mostrarNotificacion("⚠️ Sin datos para exportar.");
                if (btn) { btn.innerHTML = txtOriginal; btn.disabled = false; }
                return;
            }

            // 3. CALCULAR TOTALES 💰
            let totalGeneral = 0;
            data.forEach(row => {
                const monto = row["Monto Total"] || row["totalvendido"] || row["TotalVendido"] || row["ImporteTotal"] || row["Monto"] || 0;
                totalGeneral += parseFloat(monto);
            });

            // 4. CREAR ESTRUCTURA DEL EXCEL
            const wb = XLSX.utils.book_new();
            
            // --- Definición de Estilos ---
            const sTitulo = { 
                font: { sz: 16, bold: true, color: { rgb: "FFFFFF" } }, 
                fill: { fgColor: { rgb: "B91C1C" } }, // Rojo Corporativo
                alignment: { horizontal: "center", vertical: "center" } 
            };
            const sSubTitulo = { 
                font: { sz: 11, bold: true, color: { rgb: "333333" } }, 
                alignment: { horizontal: "left" } 
            };
            const sHeaderTabla = { 
                font: { bold: true, color: { rgb: "FFFFFF" } }, 
                fill: { fgColor: { rgb: "1E293B" } }, // Gris Oscuro/Azul
                border: { bottom: { style: "medium", color: { rgb: "000000" } } },
                alignment: { horizontal: "center", vertical: "center" } // Encabezados Centrados
            };
            
            // CAMBIO: Alineación CENTRADA para texto normal
            const sCeldaData = { 
                border: { top: { style: "thin" }, bottom: { style: "thin" }, left: { style: "thin" }, right: { style: "thin" } },
                alignment: { horizontal: "center", vertical: "center" } 
            };
            
            // Estilo Moneda (A la derecha por estándar financiero)
            const sMoneda = { 
                border: { top: { style: "thin" }, bottom: { style: "thin" }, left: { style: "thin" }, right: { style: "thin" } },
                alignment: { horizontal: "right", vertical: "center" },
                numFmt: '"S/" #,##0.00' 
            };

            // --- MAQUETACIÓN ---
            const wsData = [
                ["REPORTE OFICIAL - TIENDA ROJAS"], 
                [`📅 Rango: ${inicio} al ${fin}`],  
                [`👤 Generado por: ${usuario.NombreCompleto || 'Sistema'}`], 
                [`💰 MONTO TOTAL DEL REPORTE: S/ ${totalGeneral.toFixed(2)}`], 
                [""], 
                Object.keys(data[0]) 
            ];

            data.forEach(row => { wsData.push(Object.values(row)); });

            const ws = XLSX.utils.aoa_to_sheet(wsData);
            const range = XLSX.utils.decode_range(ws['!ref']);
            const lastCol = range.e.c;

            // Fusiones
            ws['!merges'] = [
                { s: { r: 0, c: 0 }, e: { r: 0, c: lastCol } }, 
                { s: { r: 3, c: 0 }, e: { r: 3, c: 2 } }        
            ];

            // ACTIVAR FILTROS (Flechas)
            ws['!autofilter'] = { ref: XLSX.utils.encode_range({ s: { r: 5, c: 0 }, e: { r: range.e.r, c: lastCol } }) };

            // PINTAR CELDAS
            for (let R = range.s.r; R <= range.e.r; ++R) {
                for (let C = range.s.c; C <= range.e.c; ++C) {
                    const cellAddress = XLSX.utils.encode_cell({ c: C, r: R });
                    if (!ws[cellAddress]) continue;

                    if (R === 0) ws[cellAddress].s = sTitulo; 
                    else if (R >= 1 && R <= 3) {
                        ws[cellAddress].s = sSubTitulo;
                        if(R === 3) ws[cellAddress].s = { ...sSubTitulo, font: { bold: true, color: { rgb: "B91C1C" }, sz: 12 } };
                    }
                    else if (R === 5) ws[cellAddress].s = sHeaderTabla;
                    else if (R > 5) {
                        const valor = ws[cellAddress].v;
                        if (typeof valor === 'number' || (typeof valor === 'string' && valor.includes('.'))) {
                            ws[cellAddress].s = sMoneda;
                            ws[cellAddress].t = 'n';
                        } else {
                            ws[cellAddress].s = sCeldaData;
                        }
                    }
                }
            }

            // --- AJUSTE DE ANCHO DE COLUMNAS (MEJORADO) ---
            const colWidths = [];
            const headers = Object.keys(data[0]);

            for (let C = range.s.c; C <= range.e.c; ++C) {
                const headerName = (headers[C] || "").toUpperCase();
                let maxWidth = 15; // Ancho base

                // 1. ANCHO ESPECIAL PARA COLUMNAS SOLICITADAS
                if (headerName.includes("TICKET") || headerName.includes("SISTEMA")) maxWidth = 25; 
                else if (headerName.includes("METODO") || headerName.includes("PAGO") || headerName.includes("FORMA")) maxWidth = 25;
                else if (headerName.includes("MONTO") || headerName.includes("TOTAL")) maxWidth = 20;
                else if (headerName.includes("FECHA") || headerName.includes("HORA")) maxWidth = 20;
                else if (headerName.includes("CAJERO") || headerName.includes("CLIENTE")) maxWidth = 30; // Nombres largos

                // 2. Ajuste automático según contenido (si es más largo que el base)
                for (let R = 5; R <= range.e.r; ++R) { 
                    const cellAddress = XLSX.utils.encode_cell({ c: C, r: R });
                    if (ws[cellAddress]) {
                        const textLength = (ws[cellAddress].v ? ws[cellAddress].v.toString().length : 0);
                        if (textLength > maxWidth) maxWidth = textLength;
                    }
                }
                // Tope máximo para que no sea gigante
                if (maxWidth > 50) maxWidth = 50;
                
                colWidths.push({ wch: maxWidth + 2 });
            }
            ws['!cols'] = colWidths;

            XLSX.utils.book_append_sheet(wb, ws, "Reporte");
            XLSX.writeFile(wb, `Reporte_Rojas_${tipo}_${inicio}.xlsx`);

            if(btn) {
                btn.innerHTML = '<span></span> ¡Listo!';
                setTimeout(() => { btn.innerHTML = txtOriginal; btn.disabled = false; }, 2000);
            }

        } catch (e) {
            console.error(e);
            mostrarNotificacion(" Error: " + e.message);
            if(btn) { btn.innerHTML = txtOriginal; btn.disabled = false; }
        }
    };
    // ==========================================
    // 9. GRÁFICOS
    // ==========================================
    let chartPastel = null, chartBarras = null;
    window.inicializarGraficos = async () => {
        const contenedor = document.getElementById('vista-financiero');
        if (contenedor.style.display === 'none') return;
        const fechaDash = document.getElementById('fechaInicio')?.value || ''; 
        const userDash = document.getElementById('filtroUsuarioReporte')?.value || '';
        const params = new URLSearchParams();
        if(fechaDash) params.append('fecha', fechaDash);
        if(userDash && rolUsuario === 'ADMINISTRADOR') params.append('usuarioID', userDash);
        if(rolUsuario !== 'ADMINISTRADOR') params.append('usuarioID', USUARIO_ID);

        try {
            const res = await fetch(`${BASE_URL}/reportes/graficos-hoy?${params.toString()}`, { headers: { 'Authorization': `Bearer ${TOKEN}` } });
            if(!res.ok) return;
            const data = await res.json(); 

            if(data.categorias) {
                const ctxP = document.getElementById('graficoPastel').getContext('2d');
                if(chartPastel) chartPastel.destroy();
                chartPastel = new Chart(ctxP, {
                    type: 'doughnut',
                    data: { labels: data.categorias.map(i => i.label), datasets: [{ data: data.categorias.map(i => i.value), backgroundColor: [ '#ff003c', '#2563eb', '#ffb703', '#06d6a0', '#7209b7' ] }] },
                    options: { responsive: true, maintainAspectRatio: false, cutout: '75%' }
                });
            }
            if(data.pagos) {
                const ctxB = document.getElementById('graficoBarras').getContext('2d');
                if(chartBarras) chartBarras.destroy();
                chartBarras = new Chart(ctxB, {
                    type: 'bar',
                    data: { labels: data.pagos.map(i => i.label), datasets: [{ label: 'Total Ventas (S/)', data: data.pagos.map(i => i.value), backgroundColor: '#2563eb', borderRadius: 10 }] },
                    options: { responsive: true, maintainAspectRatio: false }
                });
            }
        } catch (e) { console.error("Error gráficos", e); }
    };

    // ==========================================
    // 10. NAVEGACIÓN
    // ==========================================
    const btnToggle = document.getElementById('btnToggleMenu');
    const sidebar = document.getElementById('sidebar');
    const menuItems = document.querySelectorAll('.item-menu');
    const vistas = document.querySelectorAll('.vista-seccion');

    function actualizarReloj() {
        const ahora = new Date();
        const texto = ahora.toLocaleString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true });
        document.querySelectorAll('.fecha-hora-reloj').forEach(s => s.textContent = texto);
        const fc = document.getElementById('fechaCierre'); if(fc) fc.textContent = ahora.toLocaleDateString('es-PE');
    }
    setInterval(actualizarReloj, 1000); actualizarReloj();

    menuItems.forEach(item => {
        item.addEventListener('click', function(e) {
            if(this.id === 'btn-nav-admin') {} 
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
                        if(targetId === 'vista-cierre') {
                            fetch(`${BASE_URL}/reportes/cierre-actual/${USUARIO_ID}`, { headers: { 'Authorization': `Bearer ${TOKEN}` } })
                                .then(r => r.json())
                                .then(d => {
                                    document.getElementById('totalYape').textContent = `S/ ${parseFloat(d.VentasDigital || d.ventasdigital || 0).toFixed(2)}`;
                                    document.getElementById('totalTarjeta').textContent = `S/ ${parseFloat(d.VentasTarjeta || d.ventastarjeta || 0).toFixed(2)}`;
                                    document.getElementById('totalGeneral').textContent = `S/ ${parseFloat(d.TotalVendido || d.totalvendido || 0).toFixed(2)}`;
                                    document.getElementById('totalAnulado').textContent = `S/ ${parseFloat(d.TotalAnulado || d.totalanulado || 0).toFixed(2)}`;
                                }).catch(err => console.error(err));
                        }
                        if(targetId === 'vista-anulacion') cargarHistorial();
                        if(targetId === 'vista-roles') cargarUsuarios();
                        if(targetId === 'vista-financiero') inicializarGraficos();
                        if(targetId === 'vista-admin-maestros') cargarAdminCategorias(); 
                    }
                });
            }
            if(window.innerWidth <= 768 && sidebar) { sidebar.classList.remove('mobile-open'); if(btnToggle) btnToggle.classList.remove('activo'); }
        });
    });

    if(btnToggle) btnToggle.addEventListener('click', (e) => { e.stopPropagation(); btnToggle.classList.toggle('activo'); sidebar.classList.toggle(window.innerWidth > 768 ? 'colapsado' : 'mobile-open'); });
    
    window.abrirModalUsuario = () => document.getElementById('modalUsuario').classList.add('mostrar');
    window.cerrarModalUsuario = () => document.getElementById('modalUsuario').classList.remove('mostrar');
});