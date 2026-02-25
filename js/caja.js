document.addEventListener('DOMContentLoaded', () => {
    const btnAbrirCaja = document.getElementById('btnAbrirCaja');
    const areaTrabajo = document.querySelector('.area-trabajo');

    window.actualizarEstadoVisualCaja = function(estaAbierta) {
        window.CAJA_ABIERTA = estaAbierta;
        if(btnAbrirCaja) btnAbrirCaja.style.display = estaAbierta ? 'none' : 'flex';
        if(areaTrabajo) { 
            if (estaAbierta) {
                areaTrabajo.style.opacity = "1"; 
                areaTrabajo.style.pointerEvents = "all"; 
            } else {
                if (window.ROL_USUARIO === 'ADMINISTRADOR') {
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
            const res = await fetch(`${window.BASE_URL}/caja/estado/${window.USUARIO_ID}`, {
                headers: window.getAuthHeaders()
            });
            
            if (res.ok) {
                const data = await res.json();
                // 🚀 OMNI-FALLBACK: estado o Estado
                const estadoActual = data.estado || data.Estado;
                actualizarEstadoVisualCaja(estadoActual === 'ABIERTO');
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
                const res = await fetch(`${window.BASE_URL}/caja/abrir`, {
                    method: 'POST', 
                    headers: window.getAuthHeaders(),
                    // 🚀 OMNI-FALLBACK PAYLOAD: Doble ID para asegurar
                    body: JSON.stringify({ 
                        usuarioID: parseInt(window.USUARIO_ID), 
                        usuarioId: parseInt(window.USUARIO_ID), 
                        saldoInicial: 0.00 
                    })
                });

                if(res.ok) {
                    mostrarNotificacion(" Caja Abierta Correctamente. ¡Buen turno!");
                    actualizarEstadoVisualCaja(true);
                } else {
                    const err = await res.json().catch(() => ({}));
                    throw new Error(err.mensaje || err.Mensaje || err.error || "Error al abrir caja");
                }
            } catch (error) {
                mostrarNotificacion(" Error: " + error.message, 'error');
            } finally {
                btnAbrirCaja.innerHTML = originalText;
                btnAbrirCaja.disabled = false;
            }
        });
    }
});

// Lógica de Cierre e Impresión (Exportada para que UI la llame)
window.cargarDatosCierre = function() {
    fetch(`${window.BASE_URL}/reportes/cierre-actual/${window.USUARIO_ID}`, { 
        headers: window.getAuthHeaders() 
    })
    .then(r => r.json())
    .then(d => {
        const setTxt = (id, v) => { 
            const el = document.getElementById(id); 
            if(el) el.textContent = `S/ ${parseFloat(v||0).toFixed(2)}`; 
        };
        
        // 🚀 OMNI-FALLBACK: Lectura segura a prueba de base de datos
        const vYape = d.ventasDigital || d.VentasDigital || d.ventasdigital || 0;
        const vTar = d.ventasTarjeta || d.VentasTarjeta || d.ventastarjeta || 0;
        const vTot = d.totalVendido || d.TotalVendido || d.totalvendido || 0;
        const vAnu = d.totalAnulado || d.TotalAnulado || d.totalanulado || 0;

        // 1. Llenar tarjetas grandes de resumen (Dashboard)
        setTxt('totalYape', vYape);
        setTxt('totalTarjeta', vTar);
        setTxt('totalGeneral', vTot);
        setTxt('totalAnulado', vAnu);

        // 2. Llenar PREVISUALIZACIÓN DEL TICKET al instante
        setTxt('ticketYapePrint', vYape);
        setTxt('ticketTarjetaPrint', vTar);
        setTxt('ticketAnuladoPrint', vAnu); 
        setTxt('ticketTotalPrint', vTot); 

        // 3. Llenar Fecha, Hora y Cajero en el ticket
        const elFecha = document.getElementById('ticketFecha');
        if(elFecha) elFecha.textContent = new Date().toLocaleDateString('es-PE');
        
        const elHora = document.getElementById('ticketHora');
        if(elHora) elHora.textContent = new Date().toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });
        
        const elNombre = document.getElementById('ticketCajeroNombre');
        if(elNombre && window.USUARIO_DATA) {
            const nomCajero = window.USUARIO_DATA.nombreCompleto || window.USUARIO_DATA.NombreCompleto || window.USUARIO_DATA.username || "CAJERO";
            elNombre.textContent = nomCajero.toUpperCase();
        }
    }).catch(err => console.error("Error al cargar la previsualización del cierre:", err));
}

// ==========================================
// 1. FUNCIÓN: CIERRE RESUMIDO
// ==========================================
window.imprimirCierre = async () => {
    if(!confirm("⚠️ ¿Estás seguro de realizar el CIERRE DE CAJA (RESUMEN)?\n\nEsta acción finalizará tu turno, imprimirá el ticket y cerrará tu sesión.")) return;

    const btn = document.querySelector('.btn-imprimir-cierre');
    if(btn) { btn.disabled = true; btn.innerHTML = '<span>⚙️</span> Cerrando...'; }

    try {
        const resReporte = await fetch(`${window.BASE_URL}/reportes/cierre-actual/${window.USUARIO_ID}`, {
            headers: window.getAuthHeaders()
        });
        if(!resReporte.ok) throw new Error("No se pudieron calcular los montos finales.");
        
        const data = await resReporte.json(); 
        
        // 🚀 OMNI-FALLBACK: Lectura de Saldo
        const saldoFinalEsperado = data.saldoEsperadoEnCaja || data.SaldoEsperadoEnCaja || data.saldoesperadoencaja || 0;

        const setText = (id, valor) => {
            const el = document.getElementById(id);
            if(el) el.textContent = `S/ ${parseFloat(valor || 0).toFixed(2)}`;
        };

        // Llenar Datos del Ticket Visual
        document.getElementById('ticketFecha').textContent = new Date().toLocaleDateString('es-PE');
        document.getElementById('ticketHora').textContent = new Date().toLocaleTimeString('es-PE');
        
        const elNombre = document.getElementById('ticketCajeroNombre');
        const nomCajero = window.USUARIO_DATA.nombreCompleto || window.USUARIO_DATA.NombreCompleto || window.USUARIO_DATA.username || "CAJERO";
        if(elNombre) elNombre.textContent = nomCajero.toUpperCase();

        setText('ticketYapePrint', data.ventasDigital || data.VentasDigital || data.ventasdigital);
        setText('ticketTarjetaPrint', data.ventasTarjeta || data.VentasTarjeta || data.ventastarjeta);
        setText('ticketAnuladoPrint', data.totalAnulado || data.TotalAnulado || data.totalanulado); 
        setText('ticketTotalPrint', data.totalVendido || data.TotalVendido || data.totalvendido); 

        // OCULTAR LA ZONA DE DETALLES PARA EL REPORTE RESUMIDO
        const zonaDetalles = document.getElementById('ticketZonaDetalles');
        if (zonaDetalles) zonaDetalles.style.display = 'none';

        // 🚀 OMNI-FALLBACK PAYLOAD CIERRE
        const resCierre = await fetch(`${window.BASE_URL}/caja/cerrar`, {
            method: 'POST', 
            headers: window.getAuthHeaders(),
            body: JSON.stringify({ 
                usuarioID: parseInt(window.USUARIO_ID), 
                usuarioId: parseInt(window.USUARIO_ID), 
                saldoFinalReal: saldoFinalEsperado,
                saldofinalreal: saldoFinalEsperado
            })
        });

        if(!resCierre.ok) {
            const err = await resCierre.json();
            throw new Error(err.Mensaje || err.mensaje || err.error || "Error al cerrar la caja en el sistema.");
        }

        setTimeout(() => {
            window.print(); 
            mostrarNotificacion(" CAJA CERRADA CORRECTAMENTE.\n\nSe cerrará la sesión ahora.");
            localStorage.removeItem('usuarioSesion');
            window.location.href = '../html/login.html'; 
        }, 800);

    } catch (error) {
        console.error(error);
        mostrarNotificacion(" ERROR CRÍTICO: " + error.message, 'error');
        if(btn) { btn.disabled = false; btn.innerHTML = '🖨️ CERRAR CAJA (RESUMEN)'; }
    }
};

// ==========================================
// 2. FUNCIÓN: CIERRE DETALLADO (3 COLUMNAS TICKET)
// ==========================================
window.imprimirCierreDetallado = async () => {
    if(!confirm("⚠️ ¿Estás seguro de realizar el CIERRE DE CAJA (DETALLADO)?\n\nEsta acción finalizará tu turno, imprimirá el ticket con el detalle de las ventas y cerrará tu sesión.")) return;

    const btn = document.querySelector('.btn-imprimir-cierre-detallado');
    if(btn) { btn.disabled = true; btn.innerHTML = '<span>⚙️</span> Procesando...'; }

    try {
        const resReporte = await fetch(`${window.BASE_URL}/reportes/cierre-actual/${window.USUARIO_ID}`, {
            headers: window.getAuthHeaders()
        });
        
        const resDetalle = await fetch(`${window.BASE_URL}/reportes/cierre-detalle/${window.USUARIO_ID}`, {
            headers: window.getAuthHeaders()
        });

        if(!resReporte.ok) throw new Error("No se pudieron calcular los montos finales.");
        
        const data = await resReporte.json(); 
        const detalles = resDetalle.ok ? await resDetalle.json() : []; 
        const saldoFinalEsperado = data.saldoEsperadoEnCaja || data.SaldoEsperadoEnCaja || data.saldoesperadoencaja || 0;

        const setText = (id, valor) => {
            const el = document.getElementById(id);
            if(el) el.textContent = `S/ ${parseFloat(valor || 0).toFixed(2)}`;
        };

        // Llenar Datos Generales del Ticket
        document.getElementById('ticketFecha').textContent = new Date().toLocaleDateString('es-PE');
        document.getElementById('ticketHora').textContent = new Date().toLocaleTimeString('es-PE');
        
        const elNombre = document.getElementById('ticketCajeroNombre');
        const nomCajero = window.USUARIO_DATA.nombreCompleto || window.USUARIO_DATA.NombreCompleto || window.USUARIO_DATA.username || "CAJERO";
        if(elNombre) elNombre.textContent = nomCajero.toUpperCase();

        setText('ticketYapePrint', data.ventasDigital || data.VentasDigital || data.ventasdigital);
        setText('ticketTarjetaPrint', data.ventasTarjeta || data.VentasTarjeta || data.ventastarjeta);
        setText('ticketAnuladoPrint', data.totalAnulado || data.TotalAnulado || data.totalanulado); 
        setText('ticketTotalPrint', data.totalVendido || data.TotalVendido || data.totalvendido); 

        // 3. Llenar la Tabla de 3 Columnas
        const zonaDetalles = document.getElementById('ticketZonaDetalles');
        const tbodyDetalles = document.getElementById('ticketTablaDetalles');
        
        if (zonaDetalles && tbodyDetalles) {
            zonaDetalles.style.display = 'block'; 
            tbodyDetalles.innerHTML = '';
            
            if (detalles.length === 0) {
                tbodyDetalles.innerHTML = '<tr><td colspan="3" style="text-align:center; padding: 5px 0;">Sin transacciones</td></tr>';
            } else {
                detalles.forEach(d => {
                    // 🚀 OMNI-FALLBACK: Tabla de detalles
                    const fechaStr = d.fechaemision || d.fechaEmision || d.FechaEmision;
                    const formaPago = (d.formapago || d.formaPago || d.FormaPago || '').toUpperCase();
                    const entidad = (d.entidadbancaria || d.entidadBancaria || d.EntidadBancaria || '-').toUpperCase();
                    const numOp = d.numerooperacion || d.numeroOperacion || d.NumeroOperacion || '-';
                    const monto = parseFloat(d.montopagado || d.montoPagado || d.MontoPagado || 0).toFixed(2);
                    
                    const horaFormateada = new Date(fechaStr).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });

                    let infoOperacion = '';
                    if (formaPago === 'EFECTIVO') {
                        infoOperacion = 'EFECTIVO';
                    } else {
                        let prefijo = (formaPago === 'TARJETA' && entidad !== '-') ? entidad : formaPago;
                        infoOperacion = `${prefijo}: ${numOp}`;
                    }

                    tbodyDetalles.innerHTML += `
                        <tr>
                            <td style="padding: 2px 0; vertical-align: top;">${horaFormateada}</td>
                            <td style="padding: 2px 2px; word-break: break-all; vertical-align: top;">${infoOperacion}</td>
                            <td style="padding: 2px 0; text-align: right; vertical-align: top;">S/ ${monto}</td>
                        </tr>
                    `;
                });
            }
        }

        // 🚀 OMNI-FALLBACK PAYLOAD CIERRE
        const resCierre = await fetch(`${window.BASE_URL}/caja/cerrar`, {
            method: 'POST', 
            headers: window.getAuthHeaders(),
            body: JSON.stringify({ 
                usuarioID: parseInt(window.USUARIO_ID), 
                usuarioId: parseInt(window.USUARIO_ID), 
                saldoFinalReal: saldoFinalEsperado,
                saldofinalreal: saldoFinalEsperado
            })
        });

        if(!resCierre.ok) {
            const err = await resCierre.json();
            throw new Error(err.Mensaje || err.mensaje || err.error || "Error al cerrar la caja en el sistema.");
        }

        setTimeout(() => {
            window.print(); 
            mostrarNotificacion(" CAJA CERRADA CORRECTAMENTE.\n\nSe cerrará la sesión ahora.");
            localStorage.removeItem('usuarioSesion');
            window.location.href = '../html/login.html'; 
        }, 800);

    } catch (error) {
        console.error(error);
        mostrarNotificacion(" ERROR CRÍTICO: " + error.message, 'error');
        if(btn) { btn.disabled = false; btn.innerHTML = '<span class="icon-btn">🧾</span> <span>CERRAR CAJA (DETALLADO)</span>'; }
    }
};