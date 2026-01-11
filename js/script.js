document.addEventListener('DOMContentLoaded', () => {
    
    // CONFIGURACIÓN
    const BASE_URL = 'http://localhost:8080/api';
    
    // VARIABLE GLOBAL DE ESTADO
    let CAJA_ABIERTA = false; 
    let fechaEmision = null; 
        let ticketManual = null;

    // 0. VERIFICACIÓN DE SESIÓN
    const usuarioData = localStorage.getItem('usuarioSesion');
    if (!usuarioData) {
        // En producción descomenta la siguiente línea:
        // window.location.href = '../html/login.html'; 
        return;
    }
    
    const usuario = JSON.parse(usuarioData);

    // Header Info
    const nombreCajeroEl = document.querySelector('.nombre-cajero');
    if (nombreCajeroEl) {
        nombreCajeroEl.textContent = usuario.NombreCompleto || usuario.username || 'Usuario';
    }

    // PERMISOS
    const rolUsuario = (usuario.Rol || 'CAJERO').toUpperCase();
    const itemsAdmin = document.querySelectorAll('.admin, .item-menu[data-target="vista-reportes"], .item-menu[data-target="vista-roles"], .item-menu[data-target="vista-financiero"]');

    if (rolUsuario !== 'ADMINISTRADOR') {
        itemsAdmin.forEach(item => item.style.display = 'none');
    }

    // =========================================================
    // 1. CONTROL DE ESTADO DE CAJA (Sincronización con BD)
    // =========================================================
    const btnAbrirCaja = document.getElementById('btnAbrirCaja');
    const areaTrabajo = document.querySelector('.area-trabajo');

    function actualizarEstadoVisualCaja(estaAbierta) {
        CAJA_ABIERTA = estaAbierta;
        
        if (estaAbierta) {
            if(btnAbrirCaja) btnAbrirCaja.style.display = 'none';
            areaTrabajo.style.opacity = "1";
            areaTrabajo.style.pointerEvents = "all"; 
        } else {
            if(btnAbrirCaja) btnAbrirCaja.style.display = 'flex'; 
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
            console.error("Error conexión API:", e);
            actualizarEstadoVisualCaja(false);
        }
    }

    verificarEstadoCaja();

    // LÓGICA ABRIR CAJA
    if(btnAbrirCaja) {
        btnAbrirCaja.addEventListener('click', async () => {
            if(!confirm("¿Deseas abrir la caja para iniciar tu turno?")) return;

            const originalText = btnAbrirCaja.innerHTML;
            btnAbrirCaja.innerHTML = "Abriendo...";
            btnAbrirCaja.disabled = true;

            try {
                const payload = {
                    usuarioID: usuario.UsuarioID || usuario.usuarioID,
                    saldoInicial: 0.00
                };

                const res = await fetch(`${BASE_URL}/caja/abrir`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
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
    // 2. LÓGICA DE CIERRE DE SESIÓN
    // ==========================================
    const btnLogout = document.getElementById('btnCerrarSesion');
    
    if(btnLogout) {
        btnLogout.addEventListener('click', async () => {
            if(!confirm("¿Seguro que deseas Cerrar Sesión? Si tienes caja abierta, se cerrará automáticamente.")) return;

            if (CAJA_ABIERTA) {
                try {
                    const uid = usuario.UsuarioID || usuario.usuarioID;
                    
                    const resReporte = await fetch(`${BASE_URL}/reportes/cierre-actual/${uid}`);
                    if (!resReporte.ok) throw new Error("No se pudo calcular el cierre");
                    
                    const dataReporte = await resReporte.json();
                    const saldoCierre = dataReporte.SaldoEsperadoEnCaja || 0.00;

                    const payload = {
                        usuarioID: uid,
                        saldoFinalReal: saldoCierre
                    };

                    const resCierre = await fetch(`${BASE_URL}/caja/cerrar`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload)
                    });

                    if (!resCierre.ok) throw new Error("Error cerrando caja en BD");
                    
                    alert("🔒 Caja cerrada y turno finalizado correctamente.");

                } catch (e) {
                    console.error("Error al auto-cerrar caja:", e);
                    alert("⚠️ Advertencia: Hubo un error de conexión al cerrar la caja, pero se cerrará la sesión local.");
                }
            }

            localStorage.removeItem('usuarioSesion');
            window.location.href = '../html/login.html';
        });
    }

    // ==========================================
    // 3. VISTA DE CIERRE DE TURNO (IMPRIMIR SIN CONFIRMACIÓN)
    // ==========================================
    window.imprimirCierre = async () => {
        // SE ELIMINÓ LA CONFIRMACIÓN (prompt/confirm)
        try {
            const uid = usuario.UsuarioID || usuario.usuarioID;
            
            // 1. Obtener datos
            const resReporte = await fetch(`${BASE_URL}/reportes/cierre-actual/${uid}`);
            if(!resReporte.ok) throw new Error("Error obteniendo datos del cierre");
            const data = await resReporte.json();

            // 2. Llenar el ticket oculto con los datos del Backend
            document.getElementById('ticketFecha').textContent = new Date().toLocaleDateString();
            document.getElementById('ticketHora').textContent = new Date().toLocaleTimeString();
            
            // Usamos .toFixed(2) para asegurar dos decimales
            document.getElementById('ticketYape').textContent = `S/ ${parseFloat(data.VentasDigital || 0).toFixed(2)}`;
            document.getElementById('ticketTarjeta').textContent = `S/ ${parseFloat(data.VentasTarjeta || 0).toFixed(2)}`;
            document.getElementById('ticketTotal').textContent = `S/ ${parseFloat(data.TotalVendido || 0).toFixed(2)}`;

            // 3. Cerrar Caja en BD
            const payload = {
                usuarioID: uid,
                saldoFinalReal: data.SaldoEsperadoEnCaja
            };

            const resCierre = await fetch(`${BASE_URL}/caja/cerrar`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if(!resCierre.ok) {
                const err = await resCierre.json();
                throw new Error(err.error || "Error al cerrar caja");
            }

            // 4. Imprimir de inmediato
            window.print();
            
            // 5. Bloquear sistema
            actualizarEstadoVisualCaja(false); 
            // alert("✅ Turno Cerrado"); // Opcional, si quieres quitar este alert también, bórralo.

        } catch (error) {
            console.error(error);
            alert("❌ Error en el cierre: " + error.message);
        }
    };

 // ==========================================
// 4. LÓGICA DE PAGOS (VENTAS) - DEFINITIVA
// ==========================================
async function procesarPago(e, form, tipo, idInputFam, idContenedorFam) {
    e.preventDefault();

    // 1. Validar que la caja esté abierta
    if (typeof CAJA_ABIERTA !== 'undefined' && CAJA_ABIERTA === false) {
        alert("🔒 CAJA CERRADA\n\nNo puedes realizar ventas hasta que inicies turno.\nPresiona el botón verde 'Abrir Caja'.");
        return;
    }

    // 2. Obtener Usuario (Aseguramos que exista)
    let usuarioActivo = null;
    if (typeof usuario !== 'undefined' && usuario) {
        usuarioActivo = usuario;
    } else {
        const stored = localStorage.getItem('usuario'); // O el nombre de key que uses
        if (stored) usuarioActivo = JSON.parse(stored);
    }

    if (!usuarioActivo) {
        alert("⚠️ Error de sesión: No se detectó el usuario. Por favor inicia sesión nuevamente.");
        return;
    }

    const btn = form.querySelector('.btn-registrar-grande');
    const inputFam = document.getElementById(idInputFam);
    const montoVal = form.querySelector('input[type="number"]').value;
    const monto = parseFloat(montoVal);

    if (!inputFam || !inputFam.value) { alert("⚠️ Selecciona una Familia (Categoría)"); return; }
    if (!monto || monto <= 0) { alert("⚠️ Ingresa un monto válido"); return; }

    // --- CAPTURA DE DATOS ---
    let entidadId = 1, numOp = null, compId = 2; // Default: Yape(1), Boleta(2)
    
    // Variables para los datos opcionales
    let fechaEmision = null; 
    let ticketManual = null;

    if (tipo === 'YAPE') {
        entidadId = document.getElementById('inputDestino').value;
        numOp = document.getElementById('numOperacion').value;
        const inputComp = document.getElementById('inputComprobante');
        if(inputComp) compId = inputComp.value;
        
        // [NUEVO] Capturar Fecha y Boleta Manual de YAPE
        const inputFechaYape = document.getElementById('fechaManualYape');
        const inputTicketYape = document.getElementById('ticketManualYape');
        
        if (inputFechaYape && inputFechaYape.value) fechaEmision = inputFechaYape.value;
        if (inputTicketYape && inputTicketYape.value) ticketManual = inputTicketYape.value;

        if (!numOp) { alert("⚠️ Ingresa el número de operación"); return; }

    } else {
        // TARJETA
        entidadId = document.getElementById('inputBancoTarjeta').value;
        const inputOpTarjeta = document.getElementById('numOperacionTarjeta');
        if (inputOpTarjeta) numOp = inputOpTarjeta.value;
        
        // [NUEVO] Capturar Fecha y Boleta Manual de TARJETA
        const inputFechaTarjeta = document.getElementById('fechaManualTarjeta');
        const inputTicketTarjeta = document.getElementById('ticketManualTarjeta');

        if (inputFechaTarjeta && inputFechaTarjeta.value) fechaEmision = inputFechaTarjeta.value;
        if (inputTicketTarjeta && inputTicketTarjeta.value) ticketManual = inputTicketTarjeta.value;

        if (!numOp) { alert("⚠️ Ingresa el N° de Lote o Voucher del POS"); return; }
    }

    // --- PREPARAR ENVÍO ---
    const originalText = btn.innerHTML;
    btn.innerHTML = 'Procesando... ⏳';
    btn.disabled = true;

    const payload = {
        usuarioID: usuarioActivo.UsuarioID || usuarioActivo.usuarioID, 
        tipoComprobanteID: parseInt(compId),
        clienteDoc: "00000000", 
        clienteNombre: "Publico General",
        
        // Enviamos los campos nuevos (si están vacíos, van como null)
        fechaEmision: fechaEmision, 
        numeroComprobanteManual: ticketManual, 
        
        detalles: [{ 
            CategoriaID: parseInt(inputFam.value), 
            Monto: monto 
        }],
        pagos: [{
            FormaPago: tipo === 'YAPE' ? 'QR' : 'TARJETA', 
            Monto: monto,
            EntidadID: parseInt(entidadId),
            NumOperacion: numOp
        }]
    };

    try {
        // Asegúrate que BASE_URL esté definido al inicio de tu script
        const res = await fetch(`${BASE_URL}/ventas/registrar`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (res.ok) {
            const data = await res.json();
            
            // ÉXITO: Mostrar ticket
            alert(`✅ ¡VENTA REGISTRADA CORRECTAMENTE!\n\n📄 Ticket Generado: ${data.Comprobante || 'Automático'}`);
            
            // Feedback visual en botón
            btn.innerHTML = '¡ÉXITO! 🎉';
            btn.style.background = '#28a745'; // Verde éxito
            
            setTimeout(() => {
                // Restaurar formulario completo
                btn.innerHTML = originalText;
                btn.style.background = '';
                btn.disabled = false;
                form.reset();
                
                // Limpiar inputs manuales (importante para que no se quede la fecha pegada)
                const idsLimpiar = ['fechaManualYape', 'ticketManualYape', 'fechaManualTarjeta', 'ticketManualTarjeta'];
                idsLimpiar.forEach(id => {
                    const el = document.getElementById(id);
                    if(el) el.value = '';
                });

                // Resetear selección visual de familias
                const cont = document.getElementById(idContenedorFam);
                if(cont) cont.querySelectorAll('.seleccionado').forEach(el => el.classList.remove('seleccionado'));
                inputFam.value = "";
                
            }, 2000);

        } else {
            // ERROR DEL BACKEND
            const err = await res.json().catch(() => ({}));
            const msgError = err.error || err.Mensaje || "Error desconocido";

            if (msgError.toUpperCase().includes('CAJA CERRADA')) {
                 if(typeof actualizarEstadoVisualCaja === 'function') actualizarEstadoVisualCaja(false);
                 alert("⛔ CAJA CERRADA: El sistema detectó que tu turno no está activo.");
            } else {
                 throw new Error(msgError);
            }
            
            // Restaurar botón inmediatamente en caso de error
            btn.innerHTML = originalText;
            btn.disabled = false;
        }

    } catch (error) {
        console.error(error);
        alert("❌ Error al procesar: " + error.message);
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
}

// --- LISTENERS (Asegúrate de que esto corra después de que el DOM cargue) ---
document.addEventListener("DOMContentLoaded", () => {
    const fY = document.getElementById('formYape');
    if (fY) {
        // Remover listeners anteriores para evitar duplicados (opcional pero recomendado)
        const newFY = fY.cloneNode(true);
        fY.parentNode.replaceChild(newFY, fY);
        newFY.addEventListener('submit', (e) => procesarPago(e, newFY, 'YAPE', 'inputFamilia', 'selectorFamilia'));
    }

    const fT = document.getElementById('formTarjeta');
    if (fT) {
        const newFT = fT.cloneNode(true);
        fT.parentNode.replaceChild(newFT, fT);
        newFT.addEventListener('submit', (e) => procesarPago(e, newFT, 'TARJETA', 'inputFamiliaTarjeta', 'selectorFamiliaTarjeta'));
    }
});
    // ==========================================
    // 5. HISTORIAL Y ANULACIONES
    // ==========================================
    
    async function cargarHistorial() {
        const cuerpoTabla = document.getElementById('cuerpoTablaTransacciones');
        if(!cuerpoTabla) return;

        cuerpoTabla.innerHTML = '<tr><td colspan="7" style="text-align:center;">Cargando...</td></tr>';

        try {
            const uid = usuario.UsuarioID || usuario.usuarioID;
            const res = await fetch(`${BASE_URL}/ventas/historial/${uid}`);
            
            if(!res.ok) throw new Error("Error al cargar datos");

            const ventas = await res.json();
            cuerpoTabla.innerHTML = '';

            if(ventas.length === 0) {
                cuerpoTabla.innerHTML = '<tr><td colspan="7" style="text-align:center; padding: 2rem;">No hay ventas registradas hoy.</td></tr>';
                return;
            }

            ventas.forEach(v => {
                const fecha = new Date(v.FechaEmision).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
                const esAnulado = v.Estado === 'ANULADO';
                const claseEstado = esAnulado ? 'badge-estado anulado' : 'badge-estado completado';
                const btnDisabled = esAnulado ? 'disabled' : '';
                const estiloFila = esAnulado ? 'opacity: 0.6; background: #fff5f5;' : '';

                const fila = `
                    <tr style="${estiloFila}">
                        <td class="col-tipo">${v.FormaPago === 'QR' ? '📱 YAPE' : (v.FormaPago === 'TARJETA' ? '💳 TARJETA' : '💵 EFECTIVO')}</td>
                        <td>${v.Familia || 'Varios'}</td>
                        <td>
                            <div style="font-size:0.85rem; font-weight:bold;">${v.RefOperacion}</div>
                            <div style="font-size:0.75rem; color:#666;">Op: ${v.CodigoPago || '---'}</div>
                        </td>
                        <td class="dato-monto">S/ ${parseFloat(v.ImporteTotal).toFixed(2)}</td>
                        <td>${fecha}</td>
                        <td><span class="${claseEstado}">${v.Estado}</span></td>
                        <td>
                            <button class="btn-anular" 
                                onclick="solicitarAnulacion(${v.VentaID})" 
                                ${btnDisabled}>
                                🚫 Anular
                            </button>
                        </td>
                    </tr>
                `;
                cuerpoTabla.insertAdjacentHTML('beforeend', fila);
            });

        } catch (error) {
            console.error(error);
            cuerpoTabla.innerHTML = '<tr><td colspan="7" style="text-align:center; color:red;">Error de conexión</td></tr>';
        }
    }

    window.solicitarAnulacion = async (ventaId) => {
        if (!CAJA_ABIERTA) {
            alert("🔒 Debes tener la caja abierta para realizar anulaciones.");
            return;
        }
        
        if (!confirm("¿Estás seguro de que deseas ANULAR esta venta?")) return;

        try {
            const payload = {
                ventaID: ventaId,
                usuarioID: usuario.UsuarioID || usuario.usuarioID,
                motivo: "Anulación Manual"
            };
            const res = await fetch(`${BASE_URL}/ventas/anular`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                alert("✅ Venta Anulada Correctamente");
                cargarHistorial();
            } else {
                const err = await res.json();
                alert("❌ Error: " + (err.error || "No se pudo anular"));
            }
        } catch (e) {
            alert("❌ Error de red al anular");
        }
    };

    // UTILS
    const btnToggle = document.getElementById('btnToggleMenu');
    const sidebar = document.getElementById('sidebar');
    const menuItems = document.querySelectorAll('.item-menu');
    const vistas = document.querySelectorAll('.vista-seccion');

    function actualizarReloj() {
        const ahora = new Date();
        const texto = ahora.toLocaleString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true });
        document.querySelectorAll('.fecha-hora-reloj').forEach(s => s.textContent = texto);
        const fechaCierre = document.getElementById('fechaCierre');
        if(fechaCierre) fechaCierre.textContent = ahora.toLocaleDateString('es-PE');
    }
    setInterval(actualizarReloj, 1000);
    actualizarReloj();

    menuItems.forEach(item => {
        item.addEventListener('click', function(e) {
            const href = this.getAttribute('href');
            if(href === '#' || !href) e.preventDefault();
            
            menuItems.forEach(i => i.classList.remove('activo'));
            this.classList.add('activo');

            const targetId = this.getAttribute('data-target');
            if(targetId) {
                vistas.forEach(v => {
                    v.style.display = 'none';
                    v.classList.remove('activa');
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
                                })
                                .catch(() => {});
                        }
                        if(targetId === 'vista-anulacion') {
                            cargarHistorial();
                        }
                    }
                });
            }
            if(window.innerWidth <= 768 && sidebar) {
                sidebar.classList.remove('mobile-open');
                if(btnToggle) btnToggle.classList.remove('activo');
            }
        });
    });

    if(btnToggle) btnToggle.addEventListener('click', (e) => {
        e.stopPropagation();
        btnToggle.classList.toggle('activo');
        sidebar.classList.toggle(window.innerWidth > 768 ? 'colapsado' : 'mobile-open');
    });

    window.abrirModalUsuario = () => document.getElementById('modalUsuario').classList.add('mostrar');
    window.cerrarModalUsuario = () => document.getElementById('modalUsuario').classList.remove('mostrar');
    window.generarReporte = (tipo) => alert("Reporte " + tipo + " en construcción.");
    window.inicializarGraficos = () => console.log("Init gráficos...");
});