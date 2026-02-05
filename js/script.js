document.addEventListener('DOMContentLoaded', () => {
    
    // ==========================================
    // 0. CONFIGURACIÓN INICIAL Y SESIÓN
    // ==========================================
    const BASE_URL = 'http://localhost:8080/api';
    let CAJA_ABIERTA = false; 

    // Recuperar sesión
    const usuarioData = localStorage.getItem('usuarioSesion');
    if (!usuarioData) { 
        window.location.href = '../html/login.html'; 
        return;
    }
    
    const usuario = JSON.parse(usuarioData);

    // Compatibilidad ID (Postgres puede devolver minúsculas)
    const UID = usuario.UsuarioID || usuario.usuarioid || usuario.id;

    // Mostrar nombre en el header
    const nombreCajeroEl = document.querySelector('.nombre-cajero');
    if (nombreCajeroEl) {
        nombreCajeroEl.textContent = usuario.NombreCompleto || usuario.nombrecompleto || usuario.username || 'Usuario';
    }

    // ==========================================
    // GESTIÓN DE PERMISOS (ROBUSTA)
    // ==========================================
    let rolUsuario = "CAJERO";
    
    // Normalizamos el rol
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
                areaTrabajo.style.pointerEvents = "none"; // Bloqueamos clicks si está cerrada
            }
        }
    }

    async function verificarEstadoCaja() {
        try {
            const res = await fetch(`${BASE_URL}/caja/estado/${UID}`);
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
                        usuarioID: UID, 
                        saldoInicial: 0.00 
                    })
                });

                if(res.ok) {
                    alert("✅ Caja Abierta Correctamente. ¡Buen turno!");
                    actualizarEstadoVisualCaja(true);
                } else {
                    const err = await res.json().catch(() => ({}));
                    throw new Error(err.error || err.mensaje || "Error al abrir caja");
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
            window.location.href = '../html/login.html';
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
            // 1. Obtener los cálculos desde la Base de Datos
            const resReporte = await fetch(`${BASE_URL}/reportes/cierre-actual/${UID}`);
            if(!resReporte.ok) throw new Error("No se pudieron calcular los montos finales.");
            
            const data = await resReporte.json(); 
            
            // CORRECCIÓN POSTGRES: Soportar mayúsculas/minúsculas
            const saldoIni = data.SaldoInicial || data.saldoinicial || 0;
            const vEfec = data.VentasEfectivo || data.ventasefectivo || 0;
            const vDig = data.VentasDigital || data.ventasdigital || 0;
            const vTarj = data.VentasTarjeta || data.ventastarjeta || 0;
            const vTotal = data.TotalVendido || data.totalvendido || 0;
            const vAnulado = data.TotalAnulado || data.totalanulado || 0;
            const saldoFinalEsperado = data.SaldoEsperadoEnCaja || data.saldoesperadoencaja || 0;
            const turnoNombre = data.TurnoNombre || data.turnonombre || "GENERAL";

            const setText = (id, valor) => {
                const el = document.getElementById(id);
                if(el) el.textContent = `S/ ${parseFloat(valor || 0).toFixed(2)}`;
            };

            // 2. Llenar Datos del Ticket
            document.getElementById('ticketFecha').textContent = new Date().toLocaleDateString('es-PE');
            document.getElementById('ticketHora').textContent = new Date().toLocaleTimeString('es-PE');

            const nombreCajero = usuario.NombreCompleto || usuario.nombrecompleto || usuario.username || "Cajero";
            const elNombre = document.getElementById('ticketCajeroNombre');
            if(elNombre) elNombre.textContent = nombreCajero.toUpperCase();

            const elTurno = document.getElementById('ticketTurno');
            if (elTurno) elTurno.textContent = turnoNombre.toUpperCase();

            setText('ticketSaldoInicialPrint', saldoIni);
            setText('ticketEfectivoPrint', vEfec);
            
            const elYapePrint = document.getElementById('ticketYapePrint');
            if(elYapePrint) elYapePrint.textContent = `S/ ${parseFloat(vDig).toFixed(2)}`;
            
            const elTarjetaPrint = document.getElementById('ticketTarjetaPrint');
            if(elTarjetaPrint) elTarjetaPrint.textContent = `S/ ${parseFloat(vTarj).toFixed(2)}`;

            setText('ticketAnuladoPrint', vAnulado); 
            setText('ticketTotalPrint', vTotal); 

            // 3. Cerrar la caja en el Backend
            // IMPORTANTE: Enviamos claves exactas que espera el DTO CierreCajaRequest
            const resCierre = await fetch(`${BASE_URL}/caja/cerrar`, {
                method: 'POST', 
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    usuarioID: UID, 
                    saldoFinalReal: parseFloat(saldoFinalEsperado)
                })
            });

            if(!resCierre.ok) {
                const err = await resCierre.json();
                throw new Error(err.Mensaje || err.mensaje || err.error || "Error al cerrar la caja.");
            }

            // 4. Imprimir y Salir
            setTimeout(() => {
                window.print(); 
                alert("✅ CAJA CERRADA CORRECTAMENTE.\n\nSe cerrará la sesión ahora.");
                localStorage.removeItem('usuarioSesion');
                window.location.href = '../html/login.html'; 
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
    // 4. LÓGICA DE VENTAS (AJUSTADA POSTGRES)
    // ==========================================
    async function procesarPago(e, form, tipo, idInputFam, idContenedorFam) {
        e.preventDefault();

        if (typeof CAJA_ABIERTA !== 'undefined' && CAJA_ABIERTA === false) {
            alert("🔒 CAJA CERRADA\nAbre turno primero."); return;
        }

        const btn = form.querySelector('.btn-registrar-grande');
        const inputFam = document.getElementById(idInputFam);
        const monto = parseFloat(form.querySelector('input[type="number"]').value);

        if (!inputFam || !inputFam.value) { alert("⚠️ Selecciona una Familia (Categoría)"); return; }
        if (!monto || monto <= 0) { alert("⚠️ Ingresa un monto válido"); return; }

        let entidadId = 1, numOp = null, compId = 2; // Default Yape (1) y Boleta (2)
        let comprobanteExt = null; 

        if (tipo === 'YAPE') {
            entidadId = document.getElementById('inputDestino').value || 1; // Default Yape
            numOp = document.getElementById('numOperacion').value;
            compId = document.getElementById('inputComprobante').value;
            
            const inputExt = document.getElementById('txtComprobanteYape');
            if(inputExt) comprobanteExt = inputExt.value.trim();

            if (!numOp) { alert("⚠️ Ingrese el número de operación"); return; }
        } else {
            entidadId = document.getElementById('inputBancoTarjeta').value || 3; // Default BCP
            numOp = document.getElementById('numOperacionTarjeta').value;
            
            const inputCompTarjeta = document.getElementById('inputComprobanteTarjeta');
            if (inputCompTarjeta) compId = inputCompTarjeta.value;

            const inputExt = document.getElementById('txtComprobanteTarjeta');
            if(inputExt) comprobanteExt = inputExt.value.trim();

            if (!numOp) { alert("⚠️ Ingrese el Voucher/Lote"); return; }
        }

        const originalText = btn.innerHTML;
        btn.innerHTML = 'Procesando...';
        btn.disabled = true;

        // CRÍTICO POSTGRES: Nombres de claves EXACTOS (PascalCase)
        // El SP espera: "CategoriaID", "Monto", "FormaPago", "EntidadID"
        const payload = {
            usuarioID: UID, 
            tipoComprobanteID: parseInt(compId),
            clienteDoc: "00000000", 
            clienteNombre: "PUBLICO GENERAL",
            comprobanteExterno: comprobanteExt || null,

            detalles: [{ 
                "CategoriaID": parseInt(inputFam.value), 
                "Monto": monto 
            }], 
            
            pagos: [{ 
                "FormaPago": tipo === 'YAPE' ? 'QR' : 'TARJETA', 
                "Monto": monto, 
                "EntidadID": parseInt(entidadId), 
                "NumOperacion": numOp 
            }]
        };

        try {
            const res = await fetch(`${BASE_URL}/ventas/registrar`, {
                method: 'POST', 
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const data = await res.json();

            // Validar respuesta (puede venir status/Status)
            const status = data.Status || data.status;
            const mensaje = data.Mensaje || data.mensaje;
            const comprobante = data.Comprobante || data.comprobante;

            if (!res.ok || status === 'ERROR') {
                alert(`❌ ERROR: ${data.error || mensaje || "Error al registrar"}`);
                btn.innerHTML = originalText;
                btn.disabled = false;
                return;
            }

            // ÉXITO
            alert(`✅ VENTA EXITOSA\nTicket: ${comprobante}`);
            form.reset();
            const cont = document.getElementById(idContenedorFam);
            if(cont) cont.querySelectorAll('.seleccionado').forEach(el => el.classList.remove('seleccionado'));
            inputFam.value = "";
            
            // Reseteamos selects a defaults
            if(tipo !== 'YAPE') {
                const selectorT = document.getElementById('selectorComprobanteTarjeta');
                if(selectorT) {
                    selectorT.querySelectorAll('.segmento').forEach(s => s.classList.remove('seleccionado'));
                    selectorT.querySelector('[data-value="2"]').classList.add('seleccionado');
                    document.getElementById('inputComprobanteTarjeta').value = "2";
                }
            } else {
                const selectorY = document.getElementById('selectorComprobante');
                if(selectorY) {
                    selectorY.querySelectorAll('.segmento').forEach(s => s.classList.remove('seleccionado'));
                    selectorY.querySelector('[data-value="2"]').classList.add('seleccionado');
                    document.getElementById('inputComprobante').value = "2";
                }
            }

            btn.innerHTML = '¡ÉXITO!';
            setTimeout(() => { btn.innerHTML = originalText; btn.disabled = false; }, 1500);

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
    async function cargarFiltroHistorial() {
        if (rolUsuario !== 'ADMINISTRADOR') return;
        const select = document.getElementById('filtroUsuarioHistorial');
        const wrapper = document.getElementById('wrapperFiltroHistorial');
        if(wrapper) wrapper.style.display = 'block'; 

        try {
            const res = await fetch(`${BASE_URL}/admin/usuarios`);
            if(res.ok) {
                const usuarios = await res.json();
                select.innerHTML = '<option value="">-- Ver Todos --</option>';
                usuarios.forEach(u => {
                    select.innerHTML += `<option value="${u.UsuarioID || u.usuarioid}">${u.NombreCompleto || u.nombrecompleto}</option>`;
                });
            }
        } catch(e) { console.error("Error filtro historial", e); }
    }

    window.cargarHistorial = async function() {
        const cuerpoTabla = document.getElementById('cuerpoTablaTransacciones');
        if(!cuerpoTabla) return;

        const filtroSelect = document.getElementById('filtroUsuarioHistorial');
        const filtroID = filtroSelect ? filtroSelect.value : '';

        cuerpoTabla.innerHTML = '<tr><td colspan="8" style="text-align:center; padding: 2rem; color: #666;">⏳ Cargando...</td></tr>';

        try {
            let url = `${BASE_URL}/ventas/historial/${UID}?_=${new Date().getTime()}`;
            if(filtroID) url += `&filtro=${filtroID}`;

            const res = await fetch(url);
            if(!res.ok) throw new Error("Error cargando historial");

            const ventas = await res.json();
            cuerpoTabla.innerHTML = '';

            if(ventas.length === 0) {
                cuerpoTabla.innerHTML = '<tr><td colspan="8" style="text-align:center; padding: 2rem;">📭 Sin ventas registradas.</td></tr>';
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
                                <button class="btn-anular" onclick="solicitarAnulacion(${ventaId})" ${esAnulado ? 'disabled' : ''}>🚫</button>
                            </td>
                        </tr>`;
                    cuerpoTabla.insertAdjacentHTML('beforeend', fila);
                });
            }

        } catch (error) { 
            cuerpoTabla.innerHTML = '<tr><td colspan="8" style="text-align:center; color:red;">❌ Error conexión.</td></tr>'; 
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
                    usuarioID: UID, 
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
    // 6. GESTIÓN DE USUARIOS
    // ==========================================
    async function cargarFiltroUsuarios() {
        const select = document.getElementById('filtroUsuarioReporte');
        const contenedor = document.getElementById('contenedorFiltroUsuario'); 
        if(!select) return;
        if(contenedor) contenedor.style.display = 'block'; 

        try {
            const res = await fetch(`${BASE_URL}/admin/usuarios`);
            if(res.ok) {
                const usuarios = await res.json();
                select.innerHTML = '<option value="">-- Todos los Cajeros --</option>';
                usuarios.forEach(u => {
                    select.innerHTML += `<option value="${u.UsuarioID || u.usuarioid}">${u.NombreCompleto || u.nombrecompleto}</option>`;
                });
            }
        } catch(e) {}
    }

    async function cargarUsuarios() {
        const cuerpoTabla = document.getElementById('cuerpoTablaUsuarios');
        if (!cuerpoTabla) return; 

        try {
            const res = await fetch(`${BASE_URL}/admin/usuarios?t=${new Date().getTime()}`);
            if (!res.ok) throw new Error("Error usuarios");

            const usuariosDB = await res.json();
            cuerpoTabla.innerHTML = '';

            if (usuariosDB.length === 0) return;

            usuariosDB.forEach(u => {
                const rol = u.Rol || u.rol;
                const uid = u.UsuarioID || u.usuarioid;
                const nombre = u.NombreCompleto || u.nombrecompleto;
                const username = u.Username || u.username;
                const turno = u.TurnoActual || u.turnoactual;
                const activo = u.Activo || u.activo;

                const rolClase = (rol || '').toUpperCase() === 'ADMINISTRADOR' ? 'admin' : 'cajero';
                const esActivo = activo === true || activo === 1 || activo === "true";
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
                        <button class="btn-editar" onclick="editarUsuario(${uid})" style="cursor:pointer; border:none; background:none; font-size:1.2rem;">✏️</button>
                        ${esActivo ? `<button class="btn-eliminar" onclick="eliminarUsuario(${uid})" style="cursor:pointer; border:none; background:none; font-size:1.2rem;">🗑️</button>` : ''}
                    </td>
                </tr>`;
                cuerpoTabla.insertAdjacentHTML('beforeend', fila);
            });
        } catch (error) {}
    }

    window.eliminarUsuario = async (idUsuario) => {
        if(!confirm("¿DESACTIVAR usuario?")) return;
        try {
            const res = await fetch(`${BASE_URL}/admin/eliminar/${idUsuario}`, { method: 'DELETE' });
            if(res.ok) { alert("✅ Usuario desactivado."); cargarUsuarios(); }
            else alert("❌ Error al eliminar");
        } catch(e) { alert("❌ Error conexión"); }
    };

    window.editarUsuario = async (idUsuario) => {
        try {
            const res = await fetch(`${BASE_URL}/admin/usuarios?t=${new Date().getTime()}`);
            const usuarios = await res.json();
            const user = usuarios.find(u => (u.UsuarioID || u.usuarioid) === idUsuario);
            if (!user) return;

            document.getElementById('idUsuarioEdicion').value = user.UsuarioID || user.usuarioid;
            document.getElementById('nombreUsuario').value = user.NombreCompleto || user.nombrecompleto;
            document.getElementById('usernameUsuario').value = user.Username || user.username; 
            document.getElementById('turnoUsuario').value = user.TurnoID || user.turnoid || 1;

            document.getElementById('tituloModalUsuario').textContent = "Editar Usuario";
            
            const rolVal = (user.Rol || user.rol || '').toUpperCase();
            document.getElementById('rolUsuario').value = (rolVal === 'ADMINISTRADOR') ? 'Administrador' : 'Cajero';

            const selEstado = document.getElementById('estadoUsuario');
            if(selEstado) {
                const esActivo = user.Activo || user.activo;
                selEstado.value = (esActivo === true || esActivo === 1) ? 'true' : 'false';
            }

            document.getElementById('passUsuario').placeholder = "(Vacío para no cambiar)";
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
                        method: 'PUT', headers: { 'Content-Type': 'application/json' },
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
                    alert("✅ Usuario actualizado");
                } else {
                    const res = await fetch(`${BASE_URL}/admin/crear-usuario`, {
                        method: 'POST', headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            adminID: UID,
                            nombreCompleto: nombre,
                            username: usernameInput, 
                            password: pass,
                            rolID: rol
                        })
                    });
                    if (!res.ok) throw new Error("Error al crear");
                    const dataRes = await res.json();
                    
                    await fetch(`${BASE_URL}/admin/asignar-turno`, {
                        method: 'POST', headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ 
                            adminID: UID, 
                            usuarioID: dataRes.NuevoUsuarioID || dataRes.nuevoUsuarioID, 
                            turnoID: parseInt(selectedTurno) 
                        })
                    });
                    alert(`✅ Usuario creado: ${usernameInput}`);
                }
                cerrarModalUsuario();
                nuevoForm.reset();
                cargarUsuarios();
            } catch (error) { alert("❌ Error: " + error.message); } 
            finally { btnGuardar.innerHTML = txtOriginal; btnGuardar.disabled = false; }
        });
    }


    // ==========================================
    // 7. REPORTES EXCEL
    // ==========================================
    window.generarReporte = async (tipo) => {
        const inicio = document.getElementById('fechaInicio').value;
        const fin = document.getElementById('fechaFin').value;
        const usuarioFiltro = document.getElementById('filtroUsuarioReporte')?.value;

        const params = new URLSearchParams();
        if (inicio) params.append('inicio', inicio);
        if (fin) params.append('fin', fin);

        if (rolUsuario === 'ADMINISTRADOR') {
            if (usuarioFiltro) params.append('usuarioID', usuarioFiltro);
        } else {
            params.append('usuarioID', UID);
        }

        let endpoint = (tipo === 'CAJAS') ? '/reportes/cajas' : '/reportes/ventas';
        const urlFinal = `${BASE_URL}${endpoint}?${params.toString()}`;

        const btn = event.target.closest('button'); 
        const txtOriginal = btn ? btn.innerHTML : '';
        if (btn) { btn.innerHTML = '⚙️ Generando...'; btn.disabled = true; }

        try {
            const res = await fetch(urlFinal);
            if (!res.ok) throw new Error("Error servidor");
            
            const data = await res.json();
            if (!data || data.length === 0) {
                alert("⚠️ No hay datos.");
                if (btn) { btn.innerHTML = txtOriginal; btn.disabled = false; }
                return;
            }

            const worksheet = XLSX.utils.json_to_sheet(data);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, "Reporte");
            XLSX.writeFile(workbook, `Reporte_${tipo}_${inicio || 'HOY'}.xlsx`);

            if(btn) {
                btn.innerHTML = '✅ ¡Listo!';
                setTimeout(() => { btn.innerHTML = txtOriginal; btn.disabled = false; }, 2000);
            }
        } catch (e) {
            alert("❌ Error Excel: " + e.message);
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
        
        if(userDash && rolUsuario === 'ADMINISTRADOR') params.append('usuarioID', userDash);
        if(rolUsuario !== 'ADMINISTRADOR') params.append('usuarioID', UID);

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
                            label: 'Ventas (S/)', 
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
                            fetch(`${BASE_URL}/reportes/cierre-actual/${UID}`)
                                .then(r => r.json())
                                .then(d => {
                                    document.getElementById('totalYape').textContent = `S/ ${parseFloat(d.VentasDigital || d.ventasdigital || 0).toFixed(2)}`;
                                    document.getElementById('totalTarjeta').textContent = `S/ ${parseFloat(d.VentasTarjeta || d.ventastarjeta || 0).toFixed(2)}`;
                                    document.getElementById('totalGeneral').textContent = `S/ ${parseFloat(d.TotalVendido || d.totalvendido || 0).toFixed(2)}`;
                                    document.getElementById('totalAnulado').textContent = `S/ ${parseFloat(d.TotalAnulado || d.totalanulado || 0).toFixed(2)}`;
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
});