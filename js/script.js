document.addEventListener('DOMContentLoaded', () => {
    
    // ==========================================
    // 0. CONFIGURACIÓN INICIAL Y SESIÓN
    // ==========================================
    const BASE_URL = 'http://localhost:8080/api';
    let CAJA_ABIERTA = false; 

    // Recuperar sesión
    const usuarioData = localStorage.getItem('usuarioSesion');
    if (!usuarioData) { 
        // Redirigir si no hay sesión
        window.location.href = 'login.html'; 
        return;
    }
    
    const usuario = usuarioData ? JSON.parse(usuarioData) : { UsuarioID: 1, NombreCompleto: 'Modo Pruebas', Rol: 'ADMINISTRADOR' };

    // Mostrar nombre en el header
    const nombreCajeroEl = document.querySelector('.nombre-cajero');
    if (nombreCajeroEl) {
        nombreCajeroEl.textContent = usuario.NombreCompleto || usuario.username || 'Usuario';
    }

    // GESTIÓN DE PERMISOS (Ocultar menú Admin a Cajeros)
    const rolUsuario = (usuario.Rol || 'CAJERO').toUpperCase();
    const itemsAdmin = document.querySelectorAll('.admin, .item-menu[data-target="vista-reportes"], .item-menu[data-target="vista-roles"], .item-menu[data-target="vista-financiero"]');

    if (rolUsuario !== 'ADMINISTRADOR') {
        itemsAdmin.forEach(item => item.style.display = 'none');
    }

    // Cargar selector de usuarios si es Admin
    if (rolUsuario === 'ADMINISTRADOR') {
        cargarFiltroUsuarios();
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

    forzarSoloNumeros('numOperacion');        // Campo Yape/Plin
    forzarSoloNumeros('numOperacionTarjeta'); // Campo Lote/Voucher Tarjeta

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
            window.location.href = '../html/login.html';
        });
    }

    // ==========================================
    // FUNCIÓN DEL BOTÓN "CERRAR CAJA E IMPRIMIR"
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
            
            const resReporte = await fetch(`${BASE_URL}/reportes/cierre-actual/${uid}`);
            if(!resReporte.ok) throw new Error("No se pudieron calcular los montos finales.");
            
            const data = await resReporte.json(); 

            const setText = (id, valor) => {
                const el = document.getElementById(id);
                if(el) el.textContent = `S/ ${parseFloat(valor || 0).toFixed(2)}`;
            };

            document.getElementById('ticketFecha').textContent = new Date().toLocaleDateString('es-PE');
            document.getElementById('ticketHora').textContent = new Date().toLocaleTimeString('es-PE');

            const nombreCajero = usuario.NombreCompleto || usuario.username || "Cajero";
            const elNombre = document.getElementById('ticketCajeroNombre');
            if(elNombre) elNombre.textContent = nombreCajero.toUpperCase();

            const elTurno = document.getElementById('ticketTurno');
            if(elTurno) elTurno.textContent = "MAÑANA"; 

            setText('ticketSaldoInicialPrint', data.SaldoInicial);
            setText('ticketEfectivoPrint', data.VentasEfectivo);
            setText('totalYape', data.VentasDigital); 
            setText('ticketYapePrint', data.VentasDigital); 
            setText('totalTarjeta', data.VentasTarjeta); 
            setText('ticketTarjetaPrint', data.VentasTarjeta); 
            setText('totalAnulado', data.TotalAnulado || 0); 
            setText('ticketAnuladoPrint', data.TotalAnulado || 0); 
            setText('totalGeneral', data.TotalVendido); 
            setText('ticketTotalPrint', data.TotalVendido); 

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
    // 4. LÓGICA DE VENTAS
    // ==========================================
    async function procesarPago(e, form, tipo, idInputFam, idContenedorFam) {
        e.preventDefault();

        if (typeof CAJA_ABIERTA !== 'undefined' && CAJA_ABIERTA === false) {
            alert("🔒 CAJA CERRADA\nAbre turno primero."); return;
        }

        let usuarioActivo = usuario || JSON.parse(localStorage.getItem('usuarioSesion'));
        if (!usuarioActivo) { alert("⚠️ Error de sesión"); return; }

        const btn = form.querySelector('.btn-registrar-grande');
        const inputFam = document.getElementById(idInputFam);
        const monto = parseFloat(form.querySelector('input[type="number"]').value);

        if (!inputFam || !inputFam.value) { alert("⚠️ Selecciona una Familia (Categoría)"); return; }
        if (!monto || monto <= 0) { alert("⚠️ Ingresa un monto válido"); return; }

        let entidadId = 1, numOp = null, compId = 2;
        
        if (tipo === 'YAPE') {
            entidadId = document.getElementById('inputDestino').value;
            numOp = document.getElementById('numOperacion').value;
            compId = document.getElementById('inputComprobante').value;
            if (!numOp) { alert("⚠️ Ingrese el número de operación"); return; }
        } else {
            entidadId = document.getElementById('inputBancoTarjeta').value;
            numOp = document.getElementById('numOperacionTarjeta').value;
            
            const inputCompTarjeta = document.getElementById('inputComprobanteTarjeta');
            if (inputCompTarjeta) {
                compId = inputCompTarjeta.value;
            }

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

            if (res.ok) {
                const data = await res.json();
                alert(`✅ VENTA EXITOSA\nTicket: ${data.Comprobante}`);
                form.reset();
                const cont = document.getElementById(idContenedorFam);
                if(cont) cont.querySelectorAll('.seleccionado').forEach(el => el.classList.remove('seleccionado'));
                inputFam.value = "";
                
                if(tipo !== 'YAPE') {
                    const selectorT = document.getElementById('selectorComprobanteTarjeta');
                    if(selectorT) {
                        selectorT.querySelectorAll('.segmento').forEach(s => s.classList.remove('seleccionado'));
                        selectorT.querySelector('[data-value="2"]').classList.add('seleccionado');
                        document.getElementById('inputComprobanteTarjeta').value = "2";
                    }
                }

                btn.innerHTML = '¡ÉXITO!';
                setTimeout(() => { btn.innerHTML = originalText; btn.disabled = false; }, 1500);
            } else {
                const err = await res.json();
                alert(`❌ ERROR: ${err.error || err.Mensaje}`);
                btn.innerHTML = originalText; btn.disabled = false;
            }
        } catch (error) {
            alert("❌ Error de conexión");
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
    window.cargarHistorial = async function() {
        const cuerpoTabla = document.getElementById('cuerpoTablaTransacciones');
        const btnRefresh = document.querySelector('#vista-anulacion .btn-refresh-moderno');
        const icono = btnRefresh ? btnRefresh.querySelector('.icono-refresh') : null;

        if(!cuerpoTabla) return;

        if(icono) icono.classList.add('girando');
        if(btnRefresh) btnRefresh.disabled = true;

        cuerpoTabla.innerHTML = '<tr><td colspan="8" style="text-align:center; padding: 2rem; color: #666;">⏳ Cargando datos recientes...</td></tr>';

        try {
            const uid = usuario.UsuarioID || usuario.usuarioID;
            const res = await fetch(`${BASE_URL}/ventas/historial/${uid}?_=${new Date().getTime()}`);
            
            if(!res.ok) throw new Error("Error cargando historial");

            const ventas = await res.json();
            cuerpoTabla.innerHTML = '';

            if(ventas.length === 0) {
                cuerpoTabla.innerHTML = '<tr><td colspan="8" style="text-align:center; padding: 2rem; color: #888;">📭 No hay ventas registradas hoy.</td></tr>';
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
        } finally {
            setTimeout(() => {
                if(icono) icono.classList.remove('girando');
                if(btnRefresh) btnRefresh.disabled = false;
            }, 500);
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
                    select.innerHTML += `<option value="${u.UsuarioID}">${u.NombreCompleto}</option>`;
                });
            }
        } catch(e) { console.error("Error cargando usuarios filtro", e); }
    }

    async function cargarUsuarios() {
        const cuerpoTabla = document.getElementById('cuerpoTablaUsuarios');
        if (!cuerpoTabla) return; 

        try {
            // FIX: Agregamos ?t=TIMESTAMP para evitar caché del navegador
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
                
                // Manejo robusto del booleano activo
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
            // FIX: También refrescamos aquí
            const res = await fetch(`${BASE_URL}/admin/usuarios?t=${new Date().getTime()}`);
            const usuarios = await res.json();
            const user = usuarios.find(u => u.UsuarioID === idUsuario);
            
            if (!user) return;

            document.getElementById('idUsuarioEdicion').value = user.UsuarioID;
            document.getElementById('nombreUsuario').value = user.NombreCompleto;
            document.getElementById('usernameUsuario').value = user.Username; 
            
            // IMPORTANTE: Si el backend devuelve null en TurnoID, poner 1 (Mañana)
            document.getElementById('turnoUsuario').value = user.TurnoID || 1;

            document.getElementById('tituloModalUsuario').textContent = "Editar Usuario";
            
            // Ajustar el select de rol
            const rolSelect = document.getElementById('rolUsuario');
            const rolValue = (user.Rol === 'ADMINISTRADOR') ? 'Administrador' : 'Cajero';
            // Buscar la opción correcta (puede ser por texto o valor dependiendo tu HTML)
            // Asumimos que los values son "Administrador" y "Cajero" o ids. 
            // Si tu HTML tiene values numéricos 1 y 2, ajusta esto.
            // Según tu HTML anterior: value="Cajero" y value="Administrador"
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
            
            // Asumiendo values "Administrador" / "Cajero" en el HTML
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
                cargarUsuarios(); // Recarga la tabla

            } catch (error) { 
                alert("❌ Error: " + error.message); 
            } finally { 
                btnGuardar.innerHTML = txtOriginal; 
                btnGuardar.disabled = false; 
            }
        });
    }


    // ==========================================
    // 7. REPORTES EXCEL "PREMIUM"
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
            const range = XLSX.utils.decode_range(worksheet['!ref']);
            
            for (let C = range.s.c; C <= range.e.c; ++C) {
                const address = XLSX.utils.encode_col(C) + "1"; 
                if (!worksheet[address]) continue;

                worksheet[address].s = {
                    fill: { fgColor: { rgb: "FF003C" } }, 
                    font: { name: "Arial", sz: 11, bold: true, color: { rgb: "FFFFFF" } }, 
                    alignment: { horizontal: "center", vertical: "center" },
                    border: {
                        top: { style: "thin", color: { auto: 1 } },
                        bottom: { style: "thin", color: { auto: 1 } },
                        left: { style: "thin", color: { auto: 1 } },
                        right: { style: "thin", color: { auto: 1 } }
                    }
                };
            }

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

            const columnWidths = [];
            const keys = Object.keys(data[0]);
            
            keys.forEach((key, index) => {
                let maxLength = key.length;
                data.forEach(row => {
                    const cellValue = row[key] ? String(row[key]) : "";
                    if (cellValue.length > maxLength) {
                        maxLength = cellValue.length;
                    }
                });
                columnWidths.push({ wch: maxLength + 5 });
            });
            worksheet['!cols'] = columnWidths;

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


    // ==========================================
    // 8. GRÁFICOS DASHBOARD (MODO PREMIUM)
    // ==========================================
    let chartPastel = null; 
    let chartBarras = null;
    
    window.inicializarGraficos = async () => {
        const contenedor = document.getElementById('vista-financiero');
        const btnRefresh = document.querySelector('#vista-financiero .btn-refresh-moderno');
        const icono = btnRefresh ? btnRefresh.querySelector('.icono-refresh') : null;

        if (contenedor.style.display === 'none') return;

        if(icono) icono.classList.add('girando');
        if(btnRefresh) btnRefresh.disabled = true;

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

            Chart.defaults.font.family = "'Inconsolata', monospace";
            Chart.defaults.color = '#666';

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
                            borderWidth: 0, 
                            hoverOffset: 15, 
                            borderRadius: 20, 
                            spacing: 5, 
                            backgroundColor: [ '#ff003c', '#2563eb', '#ffb703', '#06d6a0', '#7209b7' ] 
                        }]
                    },
                    options: { 
                        responsive: true, maintainAspectRatio: false, cutout: '75%', 
                        plugins: {
                            legend: { position: 'bottom', labels: { usePointStyle: true, padding: 20 } },
                            tooltip: { backgroundColor: 'rgba(0,0,0,0.8)', padding: 12, cornerRadius: 8 }
                        }
                    }
                });
            }

            // 2. GRÁFICO BARRAS
            if(data.pagos) {
                const ctxB = document.getElementById('graficoBarras').getContext('2d');
                if(chartBarras) chartBarras.destroy();

                let gradientRed = ctxB.createLinearGradient(0, 0, 0, 400);
                gradientRed.addColorStop(0, 'rgba(255, 0, 60, 0.9)');
                gradientRed.addColorStop(1, 'rgba(255, 0, 60, 0.2)');

                chartBarras = new Chart(ctxB, {
                    type: 'bar',
                    data: {
                        labels: data.pagos.map(i => i.label),
                        datasets: [{ 
                            label: 'Total Ventas (S/)', 
                            data: data.pagos.map(i => i.value), 
                            backgroundColor: gradientRed, 
                            borderRadius: { topLeft: 15, topRight: 15 }, 
                            borderSkipped: false,
                            barPercentage: 0.6,
                        }]
                    },
                    options: { 
                        responsive: true, maintainAspectRatio: false,
                        plugins: {
                            legend: { display: false },
                            tooltip: { callbacks: { label: function(context) { return ' S/ ' + context.parsed.y.toFixed(2); } } }
                        },
                        scales: { 
                            y: { beginAtZero: true, grid: { borderDash: [5, 5], color: '#e5e5e5' }, border: { display: false } },
                            x: { grid: { display: false }, border: { display: false } }
                        } 
                    }
                });
            }
        } catch (e) { 
            console.error("Error gráficos", e); 
        } finally {
            setTimeout(() => {
                if(icono) icono.classList.remove('girando');
                if(btnRefresh) btnRefresh.disabled = false;
            }, 500);
        }
    };


    // ==========================================
    // 9. MENÚ LATERAL Y RELOJ
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
                                .catch(err => console.error("Error cargando cierre:", err));
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