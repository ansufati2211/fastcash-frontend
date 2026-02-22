document.addEventListener('DOMContentLoaded', () => {
    const btnAbrirCaja = document.getElementById('btnAbrirCaja');
    const areaTrabajo = document.querySelector('.area-trabajo');

    window.actualizarEstadoVisualCaja = function(estaAbierta) {
        CAJA_ABIERTA = estaAbierta;
        if(btnAbrirCaja) btnAbrirCaja.style.display = estaAbierta ? 'none' : 'flex';
        if(areaTrabajo) { 
            if (estaAbierta) {
                areaTrabajo.style.opacity = "1"; 
                areaTrabajo.style.pointerEvents = "all"; 
            } else {
                if (ROL_USUARIO.includes('ADMIN')) {
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
                const res = await fetch(`${BASE_URL}/caja/abrir`, {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ usuarioID: parseInt(USUARIO_ID), saldoInicial: 0.00 })
                });

                if(res.ok) {
                    mostrarNotificacion(" Caja Abierta Correctamente. ¡Buen turno!");
                    actualizarEstadoVisualCaja(true);
                } else {
                    const err = await res.json().catch(() => ({}));
                    throw new Error(err.mensaje || err.error || "Error al abrir caja");
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
    fetch(`${window.BASE_URL}/reportes/cierre-actual/${window.USUARIO_ID}`, { headers: { 'Authorization': `Bearer ${window.TOKEN}` } })
        .then(r => r.json())
        .then(d => {
            const setTxt = (id, v) => { 
                const el = document.getElementById(id); 
                if(el) el.textContent = `S/ ${parseFloat(v||0).toFixed(2)}`; 
            };
            
            // 1. Llenar tarjetas grandes de resumen (Dashboard)
            setTxt('totalYape', d.VentasDigital || d.ventasdigital);
            setTxt('totalTarjeta', d.VentasTarjeta || d.ventastarjeta);
            setTxt('totalGeneral', d.TotalVendido || d.totalvendido);
            setTxt('totalAnulado', d.TotalAnulado || d.totalanulado);

            // 2. Llenar PREVISUALIZACIÓN DEL TICKET al instante
            setTxt('ticketYapePrint', d.VentasDigital || d.ventasdigital);
            setTxt('ticketTarjetaPrint', d.VentasTarjeta || d.ventastarjeta);
            setTxt('ticketAnuladoPrint', d.TotalAnulado || d.totalanulado); 
            setTxt('ticketTotalPrint', d.TotalVendido || d.totalvendido); 

            // 3. Llenar Fecha, Hora y Cajero en el ticket
            const elFecha = document.getElementById('ticketFecha');
            if(elFecha) elFecha.textContent = new Date().toLocaleDateString('es-PE');
            
            const elHora = document.getElementById('ticketHora');
            if(elHora) elHora.textContent = new Date().toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });
            
            const elNombre = document.getElementById('ticketCajeroNombre');
            if(elNombre && window.USUARIO_DATA) elNombre.textContent = (window.USUARIO_DATA.NombreCompleto || window.USUARIO_DATA.nombreCompleto || window.USUARIO_DATA.username || "Cajero").toUpperCase();

        }).catch(err => console.error("Error al cargar la previsualización del cierre:", err));
}

window.imprimirCierre = async () => {
    if(!confirm("⚠️ ¿Estás seguro de realizar el CIERRE DE CAJA?\n\nEsta acción finalizará tu turno, imprimirá el ticket y cerrará tu sesión.")) return;

    const btn = document.querySelector('.btn-imprimir-cierre');
    if(btn) { btn.disabled = true; btn.innerHTML = '<span>⚙️</span> Cerrando...'; }

    try {
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

        // ==========================================
        // Llenar Datos del Ticket Visual (CORREGIDO)
        // ==========================================
        document.getElementById('ticketFecha').textContent = new Date().toLocaleDateString('es-PE');
        document.getElementById('ticketHora').textContent = new Date().toLocaleTimeString('es-PE');
        
        // 1. Recuperamos el nombre directamente del localStorage de forma segura
        let nombreImpresion = "CAJERO";
        try {
            const sessionData = JSON.parse(localStorage.getItem('usuarioSesion') || '{}');
            // Intentamos todas las posibles capitalizaciones
            nombreImpresion = sessionData.NombreCompleto || sessionData.nombreCompleto || sessionData.nombrecompleto || sessionData.username || "CAJERO";
        } catch(e) { 
            console.error("Error leyendo nombre de sesión"); 
        }

        // 2. Asignamos el nombre al ticket
        const elNombre = document.getElementById('ticketCajeroNombre');
        if(elNombre) elNombre.textContent = nombreImpresion.toUpperCase();

        // 3. Asignamos los datos financieros
        setText('ticketYapePrint', data.VentasDigital || data.ventasdigital);
        setText('ticketTarjetaPrint', data.VentasTarjeta || data.ventastarjeta);
        setText('ticketAnuladoPrint', data.TotalAnulado || data.totalanulado); 
        setText('ticketTotalPrint', data.TotalVendido || data.totalvendido); 

        // Cerrar en Backend
        const resCierre = await fetch(`${BASE_URL}/caja/cerrar`, {
            method: 'POST', 
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${TOKEN}` },
            body: JSON.stringify({ usuarioID: parseInt(USUARIO_ID), saldoFinalReal: saldoFinalEsperado })
        });

        if(!resCierre.ok) {
            const err = await resCierre.json();
            throw new Error(err.Mensaje || "Error al cerrar la caja en el sistema.");
        }

        // Imprimir y salir
        setTimeout(() => {
            window.print(); 
            mostrarNotificacion(" CAJA CERRADA CORRECTAMENTE.\n\nSe cerrará la sesión ahora.");
            localStorage.removeItem('usuarioSesion');
            window.location.href = '../html/login.html'; 
        }, 800);

    } catch (error) {
        console.error(error);
        mostrarNotificacion(" ERROR CRÍTICO: " + error.message, 'error');
        if(btn) { btn.disabled = false; btn.innerHTML = '🖨️ CERRAR CAJA E IMPRIMIR'; }
    }
};