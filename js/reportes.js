document.addEventListener('DOMContentLoaded', () => {
    // Intentar cargar filtros solo si las funciones existen
    if(typeof cargarFiltroUsuarios === 'function') cargarFiltroUsuarios();
    if(typeof cargarFiltroHistorial === 'function') cargarFiltroHistorial();
});

// ==========================================
// 1. HISTORIAL DE VENTAS Y ANULACIONES
// ==========================================
window.cargarFiltroHistorial = async function() {
    if (!window.ROL_USUARIO || window.ROL_USUARIO !== 'ADMINISTRADOR') return;
    
    try {
        const res = await fetch(`${window.BASE_URL}/admin/usuarios`, { 
            headers: window.getAuthHeaders() 
        });
        
        if(res.ok) {
            const usuarios = await res.json();
            const select = document.getElementById('filtroUsuarioHistorial');
            const wrapper = document.getElementById('wrapperFiltroHistorial');
            if(wrapper) wrapper.style.display = 'block';
            
            if(select) {
                select.innerHTML = '<option value="">-- Ver Todos --</option>';
                usuarios.forEach(u => {
                    // 🚀 OMNI-FALLBACK: Lectura garantizada de IDs y Nombres
                    const uid = u.usuarioId || u.usuarioID || u.UsuarioID || u.usuarioid || u.id;
                    const nombre = u.nombreCompleto || u.NombreCompleto || u.nombrecompleto || u.username || u.Username;
                    if(uid !== undefined && nombre) select.innerHTML += `<option value="${uid}">${nombre}</option>`;
                });
            }
        }
    } catch(e) { console.error("Error filtro historial", e); }
}

window.cargarHistorial = async function() {
    const cuerpoTabla = document.getElementById('cuerpoTablaTransacciones');
    if(!cuerpoTabla) return;

    const filtroSelect = document.getElementById('filtroUsuarioHistorial');
    const filtroID = filtroSelect ? filtroSelect.value : '';
    cuerpoTabla.innerHTML = '<tr><td colspan="8" style="text-align:center; padding: 2rem; color: #666;">⏳ Cargando datos...</td></tr>';

    try {
        let url = `${window.BASE_URL}/ventas/historial/${window.USUARIO_ID}?_=${new Date().getTime()}`;
        if(filtroID && filtroID !== "undefined") url += `&filtro=${filtroID}`;

        const res = await fetch(url, { headers: window.getAuthHeaders() });
        if(!res.ok) throw new Error("Error cargando historial");

        const ventas = await res.json();
        cuerpoTabla.innerHTML = '';

        if(ventas.length === 0) {
            cuerpoTabla.innerHTML = '<tr><td colspan="8" style="text-align:center;">📭 No hay ventas hoy.</td></tr>';
        } else {
            ventas.forEach(v => {
                // 🚀 OMNI-FALLBACK EXTREMO PARA LAS TABLAS SQL
                const fechaEmision = v.fechaemision || v.FechaEmision || v.fechaEmision;
                const estado = v.estado || v.Estado;
                const fecha = new Date(fechaEmision).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
                const esAnulado = estado === 'ANULADO';
                const refOp = v.refoperacion || v.RefOperacion || v.comprobante || v.Comprobante || '-';
                
                const cajero = v.cajero || v.Cajero || 'Sistema';
                const familia = v.familia || v.Familia || 'Varios';
                const monto = parseFloat(v.importetotal || v.ImporteTotal || v.importeTotal || v.monto || v.Monto || 0).toFixed(2);
                const vID = v.ventaid || v.VentaID || v.ventaID || v.ventaId || v.id;
                
                let formaPagoStr = String(v.formapago || v.FormaPago || v.formaPago || v.metodopago || v.MetodoPago || '').toUpperCase().trim();

                let badgeTipo = '💵 EFECTIVO';
                if (formaPagoStr === 'QR' || formaPagoStr === 'YAPE' || formaPagoStr === 'PLIN') {
                    badgeTipo = '📱 YAPE';
                } else if (formaPagoStr === 'TARJETA') {
                    badgeTipo = '💳 TARJETA';
                } else if (formaPagoStr !== '') {
                    badgeTipo = `💳 ${formaPagoStr}`;
                }
                
                const fila = `
                    <tr style="${esAnulado ? 'opacity: 0.6; background: #fff5f5;' : ''}">
                        <td style="font-weight:bold; color:#444;">${cajero}</td>
                        <td class="col-tipo">${badgeTipo}</td>
                        <td>${familia}</td>
                        <td><div style="font-size:0.85rem; font-weight:bold;">${refOp}</div></td>
                        <td class="dato-monto">S/ ${monto}</td>
                        <td>${fecha}</td>
                        <td><span class="badge-estado ${esAnulado ? 'anulado' : 'completado'}">${estado}</span></td>
                        <td>
                            <button class="btn-tabla-anular" onclick="solicitarAnulacion(${vID})" ${esAnulado ? 'disabled' : ''}>🚫 Anular</button>
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
    if (!window.CAJA_ABIERTA) { mostrarNotificacion("🔒 Caja cerrada. No se puede anular.", 'error'); return; }
    if (!confirm("¿Estás seguro de ANULAR esta venta?")) return;

    try {
        const res = await fetch(`${window.BASE_URL}/ventas/anular`, {
            method: 'POST', 
            headers: window.getAuthHeaders(), 
            // 🚀 OMNI-FALLBACK PAYLOAD: Duplicamos IDs para asegurar la lectura en Java
            body: JSON.stringify({ 
                ventaID: parseInt(ventaId), 
                ventaId: parseInt(ventaId), 
                usuarioID: parseInt(window.USUARIO_ID), 
                usuarioId: parseInt(window.USUARIO_ID), 
                motivo: "Anulación Manual" 
            })
        });

        if (res.ok) { 
            mostrarNotificacion(" Venta Anulada"); 
            cargarHistorial(); 
        } else { 
            const err = await res.json(); 
            mostrarNotificacion(" Error: " + (err.error || err.Mensaje || err.mensaje || "Fallo anulación"), 'error'); 
        }
    } catch (e) { mostrarNotificacion(" Error de red", 'error'); }
};

// ==========================================
// 2. REPORTES EXCEL
// ==========================================
window.cargarFiltroUsuarios = async function() {
    const select = document.getElementById('filtroUsuarioReporte');
    const contenedor = document.getElementById('contenedorFiltroUsuario'); 
    if(!select) return;
    if(contenedor) contenedor.style.display = 'block'; 

    try {
        const res = await fetch(`${window.BASE_URL}/admin/usuarios`, { headers: window.getAuthHeaders() });
        if(res.ok) {
            const usuarios = await res.json();
            select.innerHTML = '<option value="">-- Todos los Cajeros --</option>';
            
            usuarios.forEach(u => {
                // 🚀 OMNI-FALLBACK
                const uid = u.usuarioId || u.usuarioID || u.UsuarioID || u.usuarioid || u.id;
                const nombre = u.nombreCompleto || u.NombreCompleto || u.nombrecompleto || u.username || u.Username;
                
                if (uid !== undefined && nombre) {
                    select.innerHTML += `<option value="${uid}">${nombre}</option>`;
                }
            });
        }
    } catch(e) { console.error("Error cargando usuarios reporte", e); }
}

window.generarReporte = async (tipo) => {
    const inicio = document.getElementById('fechaInicio').value || 'Hoy';
    const fin = document.getElementById('fechaFin').value || inicio;
    const usuarioFiltro = document.getElementById('filtroUsuarioReporte')?.value;

    const params = new URLSearchParams();
    if (inicio !== 'Hoy') params.append('inicio', inicio);
    if (fin !== 'Hoy') params.append('fin', fin);

    const rol = window.ROL_USUARIO || '';
    const myId = window.USUARIO_ID;

    if (rol === 'ADMINISTRADOR') {
        if (usuarioFiltro && usuarioFiltro !== "" && usuarioFiltro !== "undefined") {
            params.append('usuarioID', usuarioFiltro);
        }
    } else {
        if (myId) params.append('usuarioID', myId);
    }

    let endpoint = (tipo === 'CAJAS') ? '/reportes/cajas' : '/reportes/ventas';
    const btn = document.querySelector(`button[onclick="generarReporte('${tipo}')"]`) || (event ? event.target.closest('button') : null);
    const txtOriginal = btn ? btn.innerHTML : '';
    if (btn) { btn.innerHTML = '<span>⚙️</span> Procesando...'; btn.disabled = true; }

    try {
        const urlFinal = `${window.BASE_URL}${endpoint}?${params.toString()}`;
        const res = await fetch(urlFinal, { headers: window.getAuthHeaders() });
        
        if (!res.ok) {
            const errorText = await res.text();
            throw new Error(`Error del servidor (${res.status}): ${errorText}`);
        }
        
        const data = await res.json();

        if (!data || data.length === 0) {
            mostrarNotificacion("⚠️ Sin datos para exportar.", 'error');
            if (btn) { btn.innerHTML = txtOriginal; btn.disabled = false; }
            return;
        }

        let totalGeneral = 0;
        data.forEach(row => {
            // 🚀 OMNI-FALLBACK SUMATORIA: Atrapa cualquier nombre que SQL le asigne a la columna de dinero
            const monto = row["Monto Total"] || row["TotalVendido"] || row["totalvendido"] || row["ImporteTotal"] || row["importetotal"] || row["Monto"] || row["monto"] || 0;
            totalGeneral += parseFloat(monto);
        });

        const wb = XLSX.utils.book_new();
        
        // Estilos
        const sTitulo = { font: { sz: 16, bold: true, color: { rgb: "FFFFFF" } }, fill: { fgColor: { rgb: "B91C1C" } }, alignment: { horizontal: "center", vertical: "center" } };
        const sSubTitulo = { font: { sz: 11, bold: true, color: { rgb: "333333" } }, alignment: { horizontal: "left" } };
        const sHeaderTabla = { font: { bold: true, color: { rgb: "FFFFFF" } }, fill: { fgColor: { rgb: "1E293B" } }, border: { bottom: { style: "medium", color: { rgb: "000000" } } }, alignment: { horizontal: "center", vertical: "center" } };
        const sCeldaData = { border: { top: { style: "thin" }, bottom: { style: "thin" }, left: { style: "thin" }, right: { style: "thin" } }, alignment: { horizontal: "center", vertical: "center" } };
        const sMoneda = { border: { top: { style: "thin" }, bottom: { style: "thin" }, left: { style: "thin" }, right: { style: "thin" } }, alignment: { horizontal: "right", vertical: "center" }, numFmt: '"S/" #,##0.00' };

        const nombreGenerador = window.USUARIO_DATA ? (window.USUARIO_DATA.nombreCompleto || window.USUARIO_DATA.NombreCompleto || 'Sistema') : 'Sistema';

        const wsData = [
            ["REPORTE OFICIAL - TIENDA ROJAS"], 
            [`📅 Rango: ${inicio} al ${fin}`],  
            [`👤 Generado por: ${nombreGenerador}`], 
            [`💰 MONTO TOTAL DEL REPORTE: S/ ${totalGeneral.toFixed(2)}`], 
            [""], 
            Object.keys(data[0]) 
        ];

        data.forEach(row => { wsData.push(Object.values(row)); });

        const ws = XLSX.utils.aoa_to_sheet(wsData);
        const range = XLSX.utils.decode_range(ws['!ref']);
        const lastCol = range.e.c;

        ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: lastCol } }, { s: { r: 3, c: 0 }, e: { r: 3, c: 2 } }];
        ws['!autofilter'] = { ref: XLSX.utils.encode_range({ s: { r: 5, c: 0 }, e: { r: range.e.r, c: lastCol } }) };

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
                        ws[cellAddress].s = sMoneda; ws[cellAddress].t = 'n';
                    } else {
                        ws[cellAddress].s = sCeldaData;
                    }
                }
            }
        }

        const colWidths = [];
        const headers = Object.keys(data[0]);
        for (let C = range.s.c; C <= range.e.c; ++C) {
            const headerName = (headers[C] || "").toUpperCase();
            let maxWidth = 15;
            if (headerName.includes("TICKET") || headerName.includes("SISTEMA")) maxWidth = 25; 
            else if (headerName.includes("METODO") || headerName.includes("PAGO")) maxWidth = 25;
            else if (headerName.includes("MONTO") || headerName.includes("TOTAL")) maxWidth = 20;
            else if (headerName.includes("FECHA") || headerName.includes("HORA")) maxWidth = 20;
            else if (headerName.includes("CAJERO") || headerName.includes("CLIENTE")) maxWidth = 30;
            
            for (let R = 5; R <= range.e.r; ++R) { 
                const cell = ws[XLSX.utils.encode_cell({ c: C, r: R })];
                if (cell) {
                    const len = (cell.v ? cell.v.toString().length : 0);
                    if (len > maxWidth) maxWidth = len;
                }
            }
            if (maxWidth > 50) maxWidth = 50;
            colWidths.push({ wch: maxWidth + 2 });
        }
        ws['!cols'] = colWidths;

        XLSX.utils.book_append_sheet(wb, ws, "Reporte");
            
        const hoy = new Date();
        const year = hoy.getFullYear();
        const month = String(hoy.getMonth() + 1).padStart(2, '0'); 
        const day = String(hoy.getDate()).padStart(2, '0');
        let fechaHoyFormato = `${year}-${month}-${day}`; 
        
        let nombreExportacion = `Reporte_${tipo}_${fechaHoyFormato}.xlsx`;

        if (inicio !== 'Hoy' && fin !== 'Hoy') {
            if (inicio === fin) {
                nombreExportacion = `Reporte_${tipo}_${inicio}.xlsx`;
            } else {
                nombreExportacion = `Reporte_${tipo}_${inicio}_al_${fin}.xlsx`;
            }
        }

        XLSX.writeFile(wb, nombreExportacion);

        if(btn) { btn.innerHTML = '<span></span> ¡Listo!'; setTimeout(() => { btn.innerHTML = txtOriginal; btn.disabled = false; }, 2000); }

    } catch (e) {
        console.error(e); mostrarNotificacion(" Error: " + e.message, 'error');
        if(btn) { btn.innerHTML = txtOriginal; btn.disabled = false; }
    }
};

// ==========================================
// 3. GRÁFICOS
// ==========================================
let chartPastel = null, chartBarras = null;
window.inicializarGraficos = async () => {
    const contenedor = document.getElementById('vista-financiero');
    if (!contenedor || contenedor.style.display === 'none') return;
    
    const fechaDash = document.getElementById('fechaInicio')?.value || ''; 
    const userDash = document.getElementById('filtroUsuarioReporte')?.value || '';
    
    const params = new URLSearchParams();
    if(fechaDash) params.append('fecha', fechaDash);

    const rol = window.ROL_USUARIO || '';
    const myId = window.USUARIO_ID;

    if (rol === 'ADMINISTRADOR') {
        if(userDash && userDash !== "" && userDash !== "undefined") {
            params.append('usuarioID', userDash);
        }
    } else {
        if(myId) params.append('usuarioID', myId);
    }

    try {
        const res = await fetch(`${window.BASE_URL}/reportes/graficos-hoy?${params.toString()}`, { 
            headers: window.getAuthHeaders() 
        });
        
        if(!res.ok) return;
        const data = await res.json(); 

        const palette = ['#E60023', '#2563eb', '#10b981', '#f59e0b', '#8b5cf6', '#64748b'];

        if(data.categorias) {
            const ctxP = document.getElementById('graficoPastel').getContext('2d');
            if(chartPastel) chartPastel.destroy();
            chartPastel = new Chart(ctxP, {
                type: 'doughnut',
                data: { 
                    labels: data.categorias.map(i => i.label || i.Label || i.categoria), 
                    datasets: [{ 
                        data: data.categorias.map(i => i.value || i.Value || i.monto || i.total), 
                        backgroundColor: palette,
                        borderWidth: 0, 
                        hoverOffset: 15 
                    }] 
                },
                options: { 
                    responsive: true, 
                    maintainAspectRatio: false, 
                    cutout: '80%',
                    plugins: {
                        legend: { position: 'bottom', labels: { usePointStyle: true, padding: 20, font: { family: "'Inter', sans-serif", size: 12 } } },
                        tooltip: { backgroundColor: 'rgba(17, 24, 39, 0.9)', titleFont: { size: 13 }, bodyFont: { size: 14, weight: 'bold' }, padding: 12, cornerRadius: 8, callbacks: { label: function(context) { return ` S/ ${context.parsed.toFixed(2)}`; } } }
                    }
                }
            });
        }

        if(data.pagos) {
            const ctxB = document.getElementById('graficoBarras').getContext('2d');
            if(chartBarras) chartBarras.destroy();
            
            const gradientBlue = ctxB.createLinearGradient(0, 0, 0, 400);
            gradientBlue.addColorStop(0, 'rgba(37, 99, 235, 1)');
            gradientBlue.addColorStop(1, 'rgba(59, 130, 246, 0.4)');

            chartBarras = new Chart(ctxB, {
                type: 'bar',
                data: { 
                    labels: data.pagos.map(i => i.label || i.Label || i.formaPago || i.formapago), 
                    datasets: [{ 
                        label: 'Ingresos (S/)', 
                        data: data.pagos.map(i => i.value || i.Value || i.monto || i.total), 
                        backgroundColor: gradientBlue, 
                        borderRadius: 8,
                        borderSkipped: false,
                        barPercentage: 0.6 
                    }] 
                },
                options: { 
                    responsive: true, 
                    maintainAspectRatio: false,
                    scales: {
                        y: { beginAtZero: true, grid: { color: '#f3f4f6', drawBorder: false }, ticks: { color: '#6b7280' } },
                        x: { grid: { display: false }, ticks: { font: { weight: 'bold' }, color: '#4b5563' } }
                    },
                    plugins: {
                        legend: { display: false },
                        tooltip: { backgroundColor: 'rgba(17, 24, 39, 0.9)', titleFont: { size: 13 }, bodyFont: { size: 14, weight: 'bold' }, padding: 12, cornerRadius: 8, callbacks: { label: function(context) { return ` S/ ${context.parsed.y.toFixed(2)}`; } } }
                    }
                }
            });
        }
    } catch (e) { console.error("Error gráficos", e); }
};