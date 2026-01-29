document.addEventListener('DOMContentLoaded', () => {
    
    // ==========================================
    // 0. CONFIGURACIÓN INICIAL Y SESIÓN
    // ==========================================
    const BASE_URL = 'http://localhost:8080/api';
    let CAJA_ABIERTA = false; 

    // Recuperar sesión
    const usuarioData = localStorage.getItem('usuarioSesion');
    if (!usuarioData) { 
        window.location.href = 'login.html'; 
        return;
    }
    
    const usuario = JSON.parse(usuarioData);

    // Mostrar nombre en el header
    const nombreCajeroEl = document.querySelector('.nombre-cajero');
    if (nombreCajeroEl) {
        nombreCajeroEl.textContent = usuario.NombreCompleto || usuario.username || 'Usuario';
    }

    // ==========================================
    // GESTIÓN DE PERMISOS (ROBUSTA)
    // ==========================================
    let rolUsuario = "CAJERO";
    
    // Normalizamos el rol para evitar errores
    if (usuario.Rol) {
        rolUsuario = usuario.Rol.toUpperCase();
    } else if (usuario.rol) {
        rolUsuario = usuario.rol.toUpperCase();
    } else if (usuario.RolID === 1 || usuario.rolID === 1) {
        rolUsuario = "ADMINISTRADOR";
    }

    console.log("👮 Rol detectado:", rolUsuario);

    const itemsAdmin = document.querySelectorAll('.admin, .item-menu[data-target="vista-reportes"], .item-menu[data-target="vista-roles"], .item-menu[data-target="vista-financiero"]');
    
    if (rolUsuario !== 'ADMINISTRADOR') {
        itemsAdmin.forEach(item => item.style.display = 'none');
    } else {
        // Solo si es admin cargamos el filtro
        cargarFiltroUsuarios();
        cargarFiltroHistorial();
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

    function forzarSoloNumeros(idInput) {
        const input = document.getElementById(idInput);
        if (input) {
            input.addEventListener('input', function() {
                this.value = this.value.replace(/[^0-9]/g, '');
            });
        }
    }

    forzarSoloNumeros('numOperacion');        
    forzarSoloNumeros('numOperacionTarjeta'); 

    activarSelector('selectorFamilia', 'card-familia', 'inputFamilia');
    activarSelector('selectorFamiliaTarjeta', 'card-familia', 'inputFamiliaTarjeta');
    activarSelector('selectorDestino', 'chip-banco', 'inputDestino');
    activarSelector('selectorBancoTarjeta', 'chip-banco', 'inputBancoTarjeta');
    activarSelector('selectorComprobante', 'segmento', 'inputComprobante');
    activarSelector('selectorComprobanteTarjeta', 'segmento', 'inputComprobanteTarjeta');


    // =========================================================
    // 2. CONTROL DE CAJA (ABRIR / ESTADO)
    // =========================================================
    const btnAbrirCaja = document.getElementById('btnAbrirCaja');
    const areaTrabajo = document.querySelector('.area-trabajo');

    function actualizarEstadoVisualCaja(estaAbierta) {
        CAJA_ABIERTA = estaAbierta;
        if (estaAbierta) {
            if(btnAbrirCaja) btnAbrirCaja.style.display = 'none';
            if(areaTrabajo) { 
                areaTrabajo.style.opacity = "1"; 
                areaTrabajo.style.pointerEvents = "all"; 
            }
        } else {
            if(btnAbrirCaja) btnAbrirCaja.style.display = 'flex'; 
            if(areaTrabajo) { 
                areaTrabajo.style.opacity = "0.8"; 
            }
        }
    }

    async function verificarEstadoCaja() {
        try {
            const uid = usuario.UsuarioID || usuario.usuarioID;
            const res = await fetch(`${BASE_URL}/caja/estado/${uid}`);
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
                const res = await fetch(`${BASE_URL}/caja/abrir`, {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        usuarioID: usuario.UsuarioID || usuario.usuarioID, 
                        saldoInicial: 0.00 
                    })
                });

                if(res.ok) {
                    alert("✅ Caja Abierta Correctamente. ¡Buen turno!");
                    actualizarEstadoVisualCaja(true);
                } else {
                    const err = await res.json().catch(() => ({}));
                    throw new Error(err.error || "Error al abrir caja");
                }
            } catch (error) {
                alert("❌ Error: " + error.message);
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
            window.location.href = 'login.html';
        });
    }

    // ==========================================
    // LOGICA CIERRE DE CAJA E IMPRESIÓN
    // ==========================================
    window.imprimirCierre = async () => {
        if(!confirm("⚠️ ¿Estás seguro de realizar el CIERRE DE CAJA?\n\nEsta acción finalizará tu turno, imprimirá el ticket y cerrará tu sesión.")) {
            return;
        }

        const btn = document.querySelector('.btn-imprimir-cierre');
        if(btn) { 
            btn.disabled = true; 
            btn.innerHTML = '<span>⚙️</span> Cerrando...'; 
        }

        try {
            const uid = usuario.UsuarioID || usuario.usuarioID;
            
            // 1. Obtener los cálculos desde la Base de Datos (incluyendo el Turno actualizado)
            const resReporte = await fetch(`${BASE_URL}/reportes/cierre-actual/${uid}`);
            if(!resReporte.ok) throw new Error("No se pudieron calcular los montos finales.");
            
            const data = await resReporte.json(); 

            const setText = (id, valor) => {
                const el = document.getElementById(id);
                if(el) el.textContent = `S/ ${parseFloat(valor || 0).toFixed(2)}`;
            };

            // 2. Llenar Datos del Ticket
            document.getElementById('ticketFecha').textContent = new Date().toLocaleDateString('es-PE');
            document.getElementById('ticketHora').textContent = new Date().toLocaleTimeString('es-PE');

            const nombreCajero = usuario.NombreCompleto || usuario.username || "Cajero";
            const elNombre = document.getElementById('ticketCajeroNombre');
            if(elNombre) elNombre.textContent = nombreCajero.toUpperCase();

            // --- CORRECCIÓN: USAR EL TURNO QUE VIENE DE LA BD ---
            const turnoReal = data.TurnoNombre || "GENERAL"; 
            const elTurno = document.getElementById('ticketTurno');
            if (elTurno) elTurno.textContent = turnoReal.toUpperCase();
            // ----------------------------------------------------

            setText('ticketSaldoInicialPrint', data.SaldoInicial);
            setText('ticketEfectivoPrint', data.VentasEfectivo);
            
            // Si tienes un elemento para total Yape en el ticket impreso, úsalo, si no, usa el genérico
            const elYapePrint = document.getElementById('ticketYapePrint');
            if(elYapePrint) elYapePrint.textContent = `S/ ${parseFloat(data.VentasDigital || 0).toFixed(2)}`;
            
            const elTarjetaPrint = document.getElementById('ticketTarjetaPrint');
            if(elTarjetaPrint) elTarjetaPrint.textContent = `S/ ${parseFloat(data.VentasTarjeta || 0).toFixed(2)}`;

            setText('ticketAnuladoPrint', data.TotalAnulado || 0); 
            setText('ticketTotalPrint', data.TotalVendido); 

            // 3. Cerrar la caja en el Backend
            const resCierre = await fetch(`${BASE_URL}/caja/cerrar`, {
                method: 'POST', 
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    usuarioID: uid, 
                    saldoFinalReal: data.SaldoEsperadoEnCaja 
                })
            });

            if(!resCierre.ok) {
                const err = await resCierre.json();
                throw new Error(err.Mensaje || "Error al cerrar la caja en el sistema.");
            }

            // 4. Imprimir y Salir
            setTimeout(() => {
                window.print(); 
                alert("✅ CAJA CERRADA CORRECTAMENTE.\n\nSe cerrará la sesión ahora.");
                localStorage.removeItem('usuarioSesion');
                window.location.href = 'login.html'; 
            }, 800);

        } catch (error) {
            console.error(error);
            alert("❌ ERROR CRÍTICO: " + error.message);
            if(btn) { 
                btn.disabled = false; 
                btn.innerHTML = '🖨️ CERRAR CAJA E IMPRIMIR'; 
            }
        }
    };

    // ==========================================
    // 4. LÓGICA DE VENTAS (ACTUALIZADA)
    // ==========================================
    async function procesarPago(e, form, tipo, idInputFam, idContenedorFam) {
        e.preventDefault();

        // 1. Validaciones básicas
        if (typeof CAJA_ABIERTA !== 'undefined' && CAJA_ABIERTA === false) {
            alert("🔒 CAJA CERRADA\nAbre turno primero."); return;
        }

        let usuarioActivo = usuario || JSON.parse(localStorage.getItem('usuarioSesion'));
        const btn = form.querySelector('.btn-registrar-grande');
        const inputFam = document.getElementById(idInputFam);
        const monto = parseFloat(form.querySelector('input[type="number"]').value);

        if (!inputFam || !inputFam.value) { alert("⚠️ Selecciona una Familia (Categoría)"); return; }
        if (!monto || monto <= 0) { alert("⚠️ Ingresa un monto válido"); return; }

        let entidadId = 1, numOp = null, compId = 2;
        
        // --- NUEVO: Variable para el comprobante externo ---
        let comprobanteExt = null; 
        // --------------------------------------------------

        if (tipo === 'YAPE') {
            entidadId = document.getElementById('inputDestino').value;
            numOp = document.getElementById('numOperacion').value;
            compId = document.getElementById('inputComprobante').value;
            
            // Capturamos el valor del input Yape (si existe)
            const inputExt = document.getElementById('txtComprobanteYape');
            if(inputExt) comprobanteExt = inputExt.value.trim();

            if (!numOp) { alert("⚠️ Ingrese el número de operación"); return; }
        } else {
            entidadId = document.getElementById('inputBancoTarjeta').value;
            numOp = document.getElementById('numOperacionTarjeta').value;
            
            const inputCompTarjeta = document.getElementById('inputComprobanteTarjeta');
            if (inputCompTarjeta) compId = inputCompTarjeta.value;

            // Capturamos el valor del input Tarjeta (si existe)
            const inputExt = document.getElementById('txtComprobanteTarjeta');
            if(inputExt) comprobanteExt = inputExt.value.trim();

            if (!numOp) { alert("⚠️ Ingrese el Voucher/Lote"); return; }
        }

        const originalText = btn.innerHTML;
        btn.innerHTML = 'Procesando...';
        btn.disabled = true;

        const payload = {
            usuarioID: usuarioActivo.UsuarioID || usuarioActivo.usuarioID, 
            tipoComprobanteID: parseInt(compId),
            clienteDoc: "00000000", 
            clienteNombre: "Publico General",
            
            // --- AQUÍ ENVIAMOS EL DATO AL BACKEND ---
            comprobanteExterno: comprobanteExt, 
            // ----------------------------------------

            detalles: [{ CategoriaID: parseInt(inputFam.value), Monto: monto }],
            pagos: [{ 
                FormaPago: tipo === 'YAPE' ? 'QR' : 'TARJETA', 
                Monto: monto, 
                EntidadID: parseInt(entidadId), 
                NumOperacion: numOp 
            }]
        };

        try {
            const res = await fetch(`${BASE_URL}/ventas/registrar`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const data = await res.json();

            if (data.Status === 'ERROR') {
                alert(`❌ ERROR: ${data.Mensaje}`);
                btn.innerHTML = originalText;
                btn.disabled = false;
                return;
            }

            if (res.ok && data.Status === 'OK') {
                alert(`✅ VENTA EXITOSA\nTicket: ${data.Comprobante}`);
                form.reset();
                const cont = document.getElementById(idContenedorFam);
                if(cont) cont.querySelectorAll('.seleccionado').forEach(el => el.classList.remove('seleccionado'));
                inputFam.value = "";
                
                // Reseteamos selects visuales
                if(tipo !== 'YAPE') {
                    const selectorT = document.getElementById('selectorComprobanteTarjeta');
                    if(selectorT) {
                        selectorT.querySelectorAll('.segmento').forEach(s => s.classList.remove('seleccionado'));
                        selectorT.querySelector('[data-value="2"]').classList.add('seleccionado');
                        document.getElementById('inputComprobanteTarjeta').value = "2";
                    }
                } else {
                    // Reset visual para Yape también por si acaso
                    const selectorY = document.getElementById('selectorComprobante');
                    if(selectorY) {
                        selectorY.querySelectorAll('.segmento').forEach(s => s.classList.remove('seleccionado'));
                        selectorY.querySelector('[data-value="2"]').classList.add('seleccionado');
                        document.getElementById('inputComprobante').value = "2";
                    }
                }

                btn.innerHTML = '¡ÉXITO!';
                setTimeout(() => { btn.innerHTML = originalText; btn.disabled = false; }, 1500);
            
            } else {
                alert(`❌ ERROR: ${data.error || data.Mensaje || "Error desconocido"}`);
                btn.innerHTML = originalText; 
                btn.disabled = false;
            }

        } catch (error) {
            console.error(error);
            alert("❌ Error de conexión o servidor");
            btn.innerHTML = originalText; btn.disabled = false;
        }
    }

    const fY = document.getElementById('formYape');
    if (fY) fY.addEventListener('submit', (e) => procesarPago(e, fY, 'YAPE', 'inputFamilia', 'selectorFamilia'));
    const fT = document.getElementById('formTarjeta');
    if (fT) fT.addEventListener('submit', (e) => procesarPago(e, fT, 'TARJETA', 'inputFamiliaTarjeta', 'selectorFamiliaTarjeta'));


    // ==========================================
    // 5. HISTORIAL DE VENTAS
    // ==========================================
// ==========================================
    // NUEVA FUNCIÓN: Llenar el combo de filtro (Solo para Admins)
    // ==========================================
    async function cargarFiltroHistorial() {
        // Si no es admin, no hacemos nada
        if (rolUsuario !== 'ADMINISTRADOR') return;

        const select = document.getElementById('filtroUsuarioHistorial');
        const wrapper = document.getElementById('wrapperFiltroHistorial');
        
        // Hacemos visible el selector en el HTML
        if(wrapper) wrapper.style.display = 'block'; 

        try {
            const res = await fetch(`${BASE_URL}/admin/usuarios`);
            if(res.ok) {
                const usuarios = await res.json();
                // Opción por defecto para ver todo
                select.innerHTML = '<option value="">-- Ver Todos --</option>';
                
                // Llenamos con los cajeros
                usuarios.forEach(u => {
                    select.innerHTML += `<option value="${u.UsuarioID}">${u.NombreCompleto}</option>`;
                });
            }
        } catch(e) { 
            console.error("Error cargando filtro historial", e); 
        }
    }

    // ==========================================
    // 5. HISTORIAL DE VENTAS (MODIFICADO CON FILTRO)
    // ==========================================
    window.cargarHistorial = async function() {
        const cuerpoTabla = document.getElementById('cuerpoTablaTransacciones');
        if(!cuerpoTabla) return;

        // 1. NUEVO: Obtener el valor del filtro seleccionado
        const filtroSelect = document.getElementById('filtroUsuarioHistorial');
        const filtroID = filtroSelect ? filtroSelect.value : '';

        cuerpoTabla.innerHTML = '<tr><td colspan="8" style="text-align:center; padding: 2rem; color: #666;">⏳ Cargando datos recientes...</td></tr>';

        try {
            const uid = usuario.UsuarioID || usuario.usuarioID;
            
            // 2. NUEVO: Construir URL agregando el parámetro ?filtro=... si existe
            let url = `${BASE_URL}/ventas/historial/${uid}?_=${new Date().getTime()}`;
            
            if(filtroID) {
                url += `&filtro=${filtroID}`;
            }

            const res = await fetch(url);
            
            if(!res.ok) throw new Error("Error cargando historial");

            const ventas = await res.json();
            cuerpoTabla.innerHTML = '';

            if(ventas.length === 0) {
                cuerpoTabla.innerHTML = '<tr><td colspan="8" style="text-align:center; padding: 2rem; color: #888;">📭 No hay ventas registradas con este filtro.</td></tr>';
            } else {
                ventas.forEach(v => {
                    const fecha = new Date(v.FechaEmision).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
                    const esAnulado = v.Estado === 'ANULADO';
                    
                    const fila = `
                        <tr style="${esAnulado ? 'opacity: 0.6; background: #fff5f5;' : ''}">
                            <td style="font-weight:bold; color:#444;">${v.Cajero || 'Cajero'}</td>
                            <td class="col-tipo">${v.FormaPago === 'QR' || v.FormaPago === 'YAPE' ? '📱 YAPE' : (v.FormaPago === 'TARJETA' ? '💳 TARJETA' : '💵 EFECTIVO')}</td>
                            <td>${v.Familia || 'Varios'}</td>
                            <td><div style="font-size:0.85rem; font-weight:bold;">${v.RefOperacion || v.Comprobante}</div></td>
                            <td class="dato-monto">S/ ${parseFloat(v.ImporteTotal).toFixed(2)}</td>
                            <td>${fecha}</td>
                            <td><span class="badge-estado ${esAnulado ? 'anulado' : 'completado'}">${v.Estado}</span></td>
                            <td>
                                <button class="btn-anular" onclick="solicitarAnulacion(${v.VentaID})" ${esAnulado ? 'disabled' : ''}>🚫 Anular</button>
                            </td>
                        </tr>`;
                    cuerpoTabla.insertAdjacentHTML('beforeend', fila);
                });
            }

        } catch (error) { 
            cuerpoTabla.innerHTML = '<tr><td colspan="8" style="text-align:center; color:red;">❌ Error de conexión. Intente nuevamente.</td></tr>'; 
        }
    };

    window.solicitarAnulacion = async (ventaId) => {
        if (!CAJA_ABIERTA) { alert("🔒 Caja cerrada. No se puede anular."); return; }
        if (!confirm("¿Estás seguro de ANULAR esta venta?")) return;

        try {
            const res = await fetch(`${BASE_URL}/ventas/anular`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    ventaID: ventaId, 
                    usuarioID: usuario.UsuarioID || usuario.usuarioID, 
                    motivo: "Anulación Manual" 
                })
            });

            if (res.ok) { 
                alert("✅ Venta Anulada"); 
                cargarHistorial(); 
            } else { 
                const err = await res.json(); 
                alert("❌ Error: " + (err.error || "Fallo anulación")); 
            }
        } catch (e) { alert("❌ Error de red"); }
    };


    // ==========================================
    // 6. GESTIÓN DE USUARIOS (FILTRO Y CRUD)
    // ==========================================
    
    // --------------------------------------------------------
    // 👇👇👇 AQUÍ ESTÁ LA CORRECCIÓN QUE NECESITABAS 👇👇👇
    // --------------------------------------------------------
    async function cargarFiltroUsuarios() {
        const select = document.getElementById('filtroUsuarioReporte');
        const contenedor = document.getElementById('contenedorFiltroUsuario'); // 1. Obtenemos el div
        
        if(!select) return;

        // 2. ¡IMPORTANTE! Lo hacemos visible
        if(contenedor) contenedor.style.display = 'block'; 

        try {
            const res = await fetch(`${BASE_URL}/admin/usuarios`);
            if(res.ok) {
                const usuarios = await res.json();
                select.innerHTML = '<option value="">-- Todos los Cajeros --</option>';
                usuarios.forEach(u => {
                    select.innerHTML += `<option value="${u.UsuarioID}">${u.NombreCompleto}</option>`;
                });
            }
        } catch(e) { console.error("Error cargando usuarios filtro", e); }
    }
    // --------------------------------------------------------

    async function cargarUsuarios() {
        const cuerpoTabla = document.getElementById('cuerpoTablaUsuarios');
        if (!cuerpoTabla) return; 

        try {
            const res = await fetch(`${BASE_URL}/admin/usuarios?t=${new Date().getTime()}`);
            if (!res.ok) throw new Error("Error cargando usuarios");

            const usuariosDB = await res.json();
            cuerpoTabla.innerHTML = '';

            if (usuariosDB.length === 0) { 
                cuerpoTabla.innerHTML = '<tr><td colspan="8" style="text-align:center;">Sin usuarios</td></tr>'; 
                return; 
            }

            usuariosDB.forEach(u => {
                const rolClase = (u.Rol || '').toUpperCase() === 'ADMINISTRADOR' ? 'admin' : 'cajero';
                const esActivo = u.Activo === true || u.Activo === 1 || u.Activo === "true";
                const estadoTexto = esActivo ? '🟢 Activo' : '🔴 Inactivo';
                const estiloFila = !esActivo ? 'opacity: 0.5;' : '';

                const fila = `<tr style="${estiloFila}">
                    <td>${u.UsuarioID}</td>
                    <td>${u.NombreCompleto}</td>
                    <td><strong>${u.Username}</strong></td>
                    <td>${u.TurnoActual || '-'}</td>
                    <td><span class="badge-rol ${rolClase}">${u.Rol}</span></td>
                    <td>${estadoTexto}</td>
                    <td>******</td>
                    <td style="display:flex; gap:10px; align-items:center;">
                        <button class="btn-editar" onclick="editarUsuario(${u.UsuarioID})" style="cursor:pointer; border:none; background:none; font-size:1.2rem;" title="Editar">✏️</button>
                        ${esActivo ? `<button class="btn-eliminar" onclick="eliminarUsuario(${u.UsuarioID})" style="cursor:pointer; border:none; background:none; font-size:1.2rem;" title="Desactivar">🗑️</button>` : ''}
                    </td>
                </tr>`;
                cuerpoTabla.insertAdjacentHTML('beforeend', fila);
            });
        } catch (error) { console.error(error); }
    }

    window.eliminarUsuario = async (idUsuario) => {
        if(!confirm("¿Estás seguro de DESACTIVAR este usuario?")) return;
        try {
            const res = await fetch(`${BASE_URL}/admin/eliminar/${idUsuario}`, { method: 'DELETE' });
            if(res.ok) {
                alert("✅ Usuario desactivado.");
                cargarUsuarios();
            } else {
                alert("❌ Error al eliminar");
            }
        } catch(e) { alert("❌ Error de conexión"); }
    };

    window.editarUsuario = async (idUsuario) => {
        try {
            const res = await fetch(`${BASE_URL}/admin/usuarios?t=${new Date().getTime()}`);
            const usuarios = await res.json();
            const user = usuarios.find(u => u.UsuarioID === idUsuario);
            
            if (!user) return;

            document.getElementById('idUsuarioEdicion').value = user.UsuarioID;
            document.getElementById('nombreUsuario').value = user.NombreCompleto;
            document.getElementById('usernameUsuario').value = user.Username; 
            
            document.getElementById('turnoUsuario').value = user.TurnoID || 1;

            document.getElementById('tituloModalUsuario').textContent = "Editar Usuario";
            
            const rolSelect = document.getElementById('rolUsuario');
            const rolValue = (user.Rol === 'ADMINISTRADOR') ? 'Administrador' : 'Cajero';
            rolSelect.value = rolValue;

            const selEstado = document.getElementById('estadoUsuario');
            if(selEstado) {
                const esActivo = user.Activo === true || user.Activo === 1;
                selEstado.value = esActivo ? 'true' : 'false';
            }

            document.getElementById('passUsuario').placeholder = "(Dejar vacío para no cambiar)";
            document.getElementById('passUsuario').value = ""; 
            document.getElementById('passUsuario').required = false;

            abrirModalUsuario();
        } catch (e) { alert("Error cargando usuario: " + e.message); }
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
        const nuevoForm = formUsuario.cloneNode(true);
        formUsuario.parentNode.replaceChild(nuevoForm, formUsuario);

        nuevoForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const idEdicion = document.getElementById('idUsuarioEdicion').value;
            const nombre = document.getElementById('nombreUsuario').value;
            const usernameInput = document.getElementById('usernameUsuario').value; 
            const pass = document.getElementById('passUsuario').value;
            
            const rolVal = document.getElementById('rolUsuario').value;
            const rol = (rolVal === 'Administrador') ? 1 : 2;

            const selectedTurno = document.getElementById('turnoUsuario').value;
            const estadoVal = document.getElementById('estadoUsuario')?.value;
            const esActivo = (estadoVal === 'true');

            const btnGuardar = nuevoForm.querySelector('.btn-guardar');
            const txtOriginal = btnGuardar.innerHTML;
            btnGuardar.innerHTML = 'Guardando...'; btnGuardar.disabled = true;

            try {
                if (idEdicion) {
                    await fetch(`${BASE_URL}/admin/actualizar`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ 
                            usuarioID: parseInt(idEdicion),
                            nombreCompleto: nombre,
                            username: usernameInput,
                            rolID: rol,
                            password: pass,
                            activo: esActivo,
                            turnoID: parseInt(selectedTurno)
                        })
                    });
                    
                    alert("✅ Usuario actualizado correctamente");

                } else {
                    const nuevoUsuario = {
                        adminID: usuario.UsuarioID || usuario.usuarioID,
                        nombreCompleto: nombre,
                        username: usernameInput, 
                        password: pass,
                        rolID: rol
                    };

                    const res = await fetch(`${BASE_URL}/admin/crear-usuario`, {
                        method: 'POST', headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(nuevoUsuario)
                    });

                    if (!res.ok) {
                        const err = await res.json();
                        throw new Error(err.error || "Error al crear usuario");
                    }
                    const dataRes = await res.json();
                    
                    await fetch(`${BASE_URL}/admin/asignar-turno`, {
                        method: 'POST', headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ 
                            adminID: usuario.UsuarioID, 
                            usuarioID: dataRes.NuevoUsuarioID || dataRes.nuevoUsuarioID, 
                            turnoID: parseInt(selectedTurno) 
                        })
                    });
                    alert(`✅ Usuario creado: ${nuevoUsuario.username}`);
                }
                
                cerrarModalUsuario();
                nuevoForm.reset();
                cargarUsuarios();

            } catch (error) { 
                alert("❌ Error: " + error.message); 
            } finally { 
                btnGuardar.innerHTML = txtOriginal; 
                btnGuardar.disabled = false; 
            }
        });
    }


    // ==========================================
    // 7. REPORTES EXCEL (Generar y Descargar)
    // ==========================================
    window.generarReporte = async (tipo) => {
        const inicio = document.getElementById('fechaInicio').value;
        const fin = document.getElementById('fechaFin').value;
        const usuarioFiltro = document.getElementById('filtroUsuarioReporte')?.value;

        const params = new URLSearchParams();
        if (inicio) params.append('inicio', inicio);
        if (fin) params.append('fin', fin);

        if (usuario.Rol === 'ADMINISTRADOR') {
            if (usuarioFiltro) params.append('usuarioID', usuarioFiltro);
        } else {
            params.append('usuarioID', usuario.UsuarioID);
        }

        let endpoint = (tipo === 'CAJAS') ? '/reportes/cajas' : '/reportes/ventas';
        const urlFinal = `${BASE_URL}${endpoint}?${params.toString()}`;

        const btn = event.target.closest('button'); 
        const txtOriginal = btn ? btn.innerHTML : '';
        
        if (btn) {
            btn.innerHTML = '<span>⚙️</span> Generando Excel...';
            btn.disabled = true;
        }

        try {
            const res = await fetch(urlFinal);
            if (!res.ok) throw new Error("Error en el servidor");
            
            const data = await res.json();
            if (!data || data.length === 0) {
                alert("⚠️ No hay datos con esos filtros.");
                if (btn) { btn.innerHTML = txtOriginal; btn.disabled = false; }
                return;
            }

            const worksheet = XLSX.utils.json_to_sheet(data);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, "Reporte");
            XLSX.writeFile(workbook, `Reporte_${tipo}_${inicio || 'HOY'}.xlsx`);

            if(btn) {
                btn.innerHTML = '<span>✅</span> ¡Descargado!';
                setTimeout(() => { btn.innerHTML = txtOriginal; btn.disabled = false; }, 2000);
            }

        } catch (e) {
            console.error(e);
            alert("❌ Error generando Excel: " + e.message);
            if(btn) { btn.innerHTML = txtOriginal; btn.disabled = false; }
        }
    };


    // ==========================================
    // 8. GRÁFICOS DASHBOARD
    // ==========================================
    let chartPastel = null; 
    let chartBarras = null;
    
    window.inicializarGraficos = async () => {
        const contenedor = document.getElementById('vista-financiero');
        if (contenedor.style.display === 'none') return;

        const fechaDash = document.getElementById('fechaInicio')?.value || ''; 
        const userDash = document.getElementById('filtroUsuarioReporte')?.value || '';

        const params = new URLSearchParams();
        if(fechaDash) params.append('fecha', fechaDash);
        if(userDash && usuario.Rol === 'ADMINISTRADOR') params.append('usuarioID', userDash);
        if(usuario.Rol !== 'ADMINISTRADOR') params.append('usuarioID', usuario.UsuarioID);

        try {
            const res = await fetch(`${BASE_URL}/reportes/graficos-hoy?${params.toString()}`);
            if(!res.ok) return;

            const data = await res.json(); 

            // 1. GRÁFICO PASTEL
            if(data.categorias) {
                const ctxP = document.getElementById('graficoPastel').getContext('2d');
                if(chartPastel) chartPastel.destroy();

                chartPastel = new Chart(ctxP, {
                    type: 'doughnut',
                    data: {
                        labels: data.categorias.map(i => i.label),
                        datasets: [{ 
                            data: data.categorias.map(i => i.value), 
                            backgroundColor: [ '#ff003c', '#2563eb', '#ffb703', '#06d6a0', '#7209b7' ] 
                        }]
                    },
                    options: { responsive: true, maintainAspectRatio: false, cutout: '75%' }
                });
            }

            // 2. GRÁFICO BARRAS
            if(data.pagos) {
                const ctxB = document.getElementById('graficoBarras').getContext('2d');
                if(chartBarras) chartBarras.destroy();

                chartBarras = new Chart(ctxB, {
                    type: 'bar',
                    data: {
                        labels: data.pagos.map(i => i.label),
                        datasets: [{ 
                            label: 'Total Ventas (S/)', 
                            data: data.pagos.map(i => i.value), 
                            backgroundColor: '#2563eb',
                            borderRadius: 10
                        }]
                    },
                    options: { responsive: true, maintainAspectRatio: false }
                });
            }
        } catch (e) { console.error("Error gráficos", e); }
    };


    // ==========================================
    // 9. NAVEGACIÓN Y MENÚ
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
                        
                        if(targetId === 'vista-cierre') {
                            fetch(`${BASE_URL}/reportes/cierre-actual/${usuario.UsuarioID || usuario.usuarioID}`)
                                .then(r => r.json())
                                .then(d => {
                                    document.getElementById('totalYape').textContent = `S/ ${parseFloat(d.VentasDigital || 0).toFixed(2)}`;
                                    document.getElementById('totalTarjeta').textContent = `S/ ${parseFloat(d.VentasTarjeta || 0).toFixed(2)}`;
                                    document.getElementById('totalGeneral').textContent = `S/ ${parseFloat(d.TotalVendido || 0).toFixed(2)}`;
                                    document.getElementById('totalAnulado').textContent = `S/ ${parseFloat(d.TotalAnulado || 0).toFixed(2)}`;
                                })
                                .catch(err => console.error(err));
                        }
                        if(targetId === 'vista-anulacion') cargarHistorial();
                        if(targetId === 'vista-roles') cargarUsuarios();
                        if(targetId === 'vista-financiero') inicializarGraficos();
                    }
                });
            }
            if(window.innerWidth <= 768 && sidebar) { sidebar.classList.remove('mobile-open'); if(btnToggle) btnToggle.classList.remove('activo'); }
        });
    });

    if(btnToggle) btnToggle.addEventListener('click', (e) => { e.stopPropagation(); btnToggle.classList.toggle('activo'); sidebar.classList.toggle(window.innerWidth > 768 ? 'colapsado' : 'mobile-open'); });
    
    window.abrirModalUsuario = () => document.getElementById('modalUsuario').classList.add('mostrar');
    window.cerrarModalUsuario = () => document.getElementById('modalUsuario').classList.remove('mostrar');


    // ==========================================
    // 7. REPORTES EXCEL "PREMIUM" (CON ESTILOS)
    // ==========================================
    window.generarReporte = async (tipo) => {
        const inicio = document.getElementById('fechaInicio').value;
        const fin = document.getElementById('fechaFin').value;
        const usuarioFiltro = document.getElementById('filtroUsuarioReporte')?.value;

        const params = new URLSearchParams();
        if (inicio) params.append('inicio', inicio);
        if (fin) params.append('fin', fin);

        if (usuario.Rol === 'ADMINISTRADOR') {
            if (usuarioFiltro) params.append('usuarioID', usuarioFiltro);
        } else {
            params.append('usuarioID', usuario.UsuarioID);
        }

        let endpoint = (tipo === 'CAJAS') ? '/reportes/cajas' : '/reportes/ventas';
        const urlFinal = `${BASE_URL}${endpoint}?${params.toString()}`;

        const btn = event.target.closest('button'); 
        const txtOriginal = btn ? btn.innerHTML : '';
        
        if (btn) {
            btn.innerHTML = '<span>⚙️</span> Generando Excel...';
            btn.disabled = true;
        }

        try {
            const res = await fetch(urlFinal);
            if (!res.ok) throw new Error("Error en el servidor");
            
            const data = await res.json();
            if (!data || data.length === 0) {
                alert("⚠️ No hay datos con esos filtros.");
                if (btn) { btn.innerHTML = txtOriginal; btn.disabled = false; }
                return;
            }

            // 1. CREAR HOJA DE CÁLCULO
            const worksheet = XLSX.utils.json_to_sheet(data);

            // 2. ESTILOS PERSONALIZADOS
            const range = XLSX.utils.decode_range(worksheet['!ref']);
            
            // A) Estilo para ENCABEZADOS (Fila 1)
            for (let C = range.s.c; C <= range.e.c; ++C) {
                const address = XLSX.utils.encode_col(C) + "1"; // A1, B1, C1...
                if (!worksheet[address]) continue;

                worksheet[address].s = {
                    fill: { fgColor: { rgb: "FF003C" } }, // Rojo corporativo
                    font: { name: "Arial", sz: 11, bold: true, color: { rgb: "FFFFFF" } }, // Letra blanca negrita
                    alignment: { horizontal: "center", vertical: "center" },
                    border: {
                        top: { style: "thin", color: { auto: 1 } },
                        bottom: { style: "thin", color: { auto: 1 } },
                        left: { style: "thin", color: { auto: 1 } },
                        right: { style: "thin", color: { auto: 1 } }
                    }
                };
            }

            // B) Estilo para DATOS (Filas 2 en adelante)
            for (let R = range.s.r + 1; R <= range.e.r; ++R) {
                for (let C = range.s.c; C <= range.e.c; ++C) {
                    const cellRef = XLSX.utils.encode_cell({c: C, r: R});
                    if (!worksheet[cellRef]) continue;

                    worksheet[cellRef].s = {
                        font: { name: "Arial", sz: 10 },
                        alignment: { vertical: "center", horizontal: "left" }, 
                        border: {
                            top: { style: "thin", color: { rgb: "CCCCCC" } },
                            bottom: { style: "thin", color: { rgb: "CCCCCC" } },
                            left: { style: "thin", color: { rgb: "CCCCCC" } },
                            right: { style: "thin", color: { rgb: "CCCCCC" } }
                        }
                    };
                }
            }

            // C) Auto-ajustar Ancho de Columnas
            const columnWidths = [];
            const keys = Object.keys(data[0]);
            
            keys.forEach((key, index) => {
                let maxLength = key.length; // Empieza con el largo del título
                data.forEach(row => {
                    const cellValue = row[key] ? String(row[key]) : "";
                    if (cellValue.length > maxLength) {
                        maxLength = cellValue.length;
                    }
                });
                columnWidths.push({ wch: maxLength + 5 }); // +5 de margen
            });
            worksheet['!cols'] = columnWidths;

            // 3. DESCARGAR ARCHIVO
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, "Reporte");

            const nombreArchivo = `Reporte_${tipo}_${inicio || 'HOY'}.xlsx`;
            
            XLSX.writeFile(workbook, nombreArchivo);

            if(btn) {
                btn.innerHTML = '<span>✅</span> ¡Descargado!';
                setTimeout(() => { 
                    btn.innerHTML = txtOriginal; 
                    btn.disabled = false; 
                }, 2000);
            }

        } catch (e) {
            console.error(e);
            alert("❌ Error generando Excel: " + e.message);
            if(btn) { btn.innerHTML = txtOriginal; btn.disabled = false; }
        }
    };
});