document.addEventListener('DOMContentLoaded', () => {
    // CORRECCIÓN 1: Agregar 'window.' para que encuentre las funciones correctamente
    if(typeof window.cargarFiltroUsuarios === 'function') window.cargarFiltroUsuarios();
    if(typeof window.cargarFiltroHistorial === 'function') window.cargarFiltroHistorial();
});

// ==========================================
// 1. HISTORIAL DE VENTAS Y ANULACIONES
// ==========================================
window.cargarFiltroHistorial = async function() {
    if (!window.ROL_USUARIO || !window.ROL_USUARIO.includes('ADMIN')) return;
    
    try {
        const res = await fetch(`${window.BASE_URL}/admin/usuarios`, { headers: { 'Authorization': `Bearer ${window.TOKEN}` } });
        if(res.ok) {
            const usuarios = await res.json();
            const select = document.getElementById('filtroUsuarioHistorial');
            const wrapper = document.getElementById('wrapperFiltroHistorial');
            if(wrapper) wrapper.style.display = 'block';
            
            if(select) {
                select.innerHTML = '<option value="">-- Ver Todos --</option>';
                usuarios.forEach(u => {
                    // 🛡️ Búsqueda robusta de ID y Nombre (Soporta PostgreSQL minúsculas)
                    const uid = u.UsuarioID || u.usuarioid || u.usuarioId || u.id;
                    const nombre = u.NombreCompleto || u.nombrecompleto || u.nombreCompleto || u.Username || u.username || 'Usuario Desconocido';
                    
                    if(uid) select.innerHTML += `<option value="${uid}">${nombre}</option>`;
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
                const fecha = new Date(fechaEmision).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
                const esAnulado = estado === 'ANULADO';
                const refOp = v.RefOperacion || v.refoperacion || v.Comprobante || v.comprobante;
                
                // CORRECCIÓN 2: Capturar FormaPago de manera blindada (Mayúscula o minúscula)
                const formaPago = (v.FormaPago || v.formapago || '').toUpperCase();
                
                const fila = `
                    <tr style="${esAnulado ? 'opacity: 0.6; background: #fff5f5;' : ''}">
                        <td style="font-weight:bold; color:#444;">${v.Cajero || v.cajero}</td>
                        <td class="col-tipo">${(formaPago === 'QR' || formaPago === 'YAPE') ? '📱 YAPE' : (formaPago === 'TARJETA' ? '💳 TARJETA' : '💵 EFECTIVO')}</td>
                        <td>${v.Familia || v.familia || 'Varios'}</td>
                        <td><div style="font-size:0.85rem; font-weight:bold;">${refOp}</div></td>
                        <td class="dato-monto">S/ ${parseFloat(v.ImporteTotal || v.importetotal).toFixed(2)}</td>
                        <td>${fecha}</td>
                        <td><span class="badge-estado ${esAnulado ? 'anulado' : 'completado'}">${estado}</span></td>
                        <td>
                            <button class="btn-tabla-anular" onclick="solicitarAnulacion(${v.VentaID || v.ventaid})" ${esAnulado ? 'disabled' : ''}>🚫 Anular</button>
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
            method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${window.TOKEN}` },
            body: JSON.stringify({ ventaID: ventaId, usuarioID: parseInt(window.USUARIO_ID), motivo: "Anulación Manual" })
        });

        if (res.ok) { 
            mostrarNotificacion(" Venta Anulada"); 
            cargarHistorial(); 
        } else { 
            const err = await res.json(); 
            mostrarNotificacion(" Error: " + (err.error || "Fallo anulación"), 'error'); 
        }
    } catch (e) { mostrarNotificacion(" Error de red", 'error'); }
};

// ==========================================
// 2. REPORTES EXCEL (CORREGIDO EL SELECT) ✅
// ==========================================
window.cargarFiltroUsuarios = async function() {
    const select = document.getElementById('filtroUsuarioReporte');
    const contenedor = document.getElementById('contenedorFiltroUsuario'); 
    if(!select) return;
    if(contenedor) contenedor.style.display = 'block'; 

    try {
        const res = await fetch(`${window.BASE_URL}/admin/usuarios`, { headers: { 'Authorization': `Bearer ${window.TOKEN}` } });
        if(res.ok) {
            const usuarios = await res.json();
            select.innerHTML = '<option value="">-- Todos los Cajeros --</option>';
            
            usuarios.forEach(u => {
                // 🛡️ Búsqueda robusta de ID y Nombre (Soporta PostgreSQL minúsculas)
                const uid = u.UsuarioID || u.usuarioid || u.usuarioId || u.id;
                const nombre = u.NombreCompleto || u.nombrecompleto || u.nombreCompleto || u.Username || u.username || 'Usuario Desconocido';
                
                if (uid !== undefined && uid !== null) {
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

    // LÓGICA DE USUARIOS CORREGIDA Y BLINDADA 🛡️
    const rol = window.ROL_USUARIO || '';
    const myId = window.USUARIO_ID;

    if (rol === 'ADMINISTRADOR' || rol.includes('ADMIN')) {
        // Validamos que NO sea "undefined" (texto) ni vacio
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
        console.log("Generando reporte en:", urlFinal); // Para depurar

        const res = await fetch(urlFinal, { headers: { 'Authorization': `Bearer ${window.TOKEN}` } });
        
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
            const monto = row["Monto Total"] || row["totalvendido"] || row["TotalVendido"] || row["ImporteTotal"] || row["Monto"] || 0;
            totalGeneral += parseFloat(monto);
        });

        const wb = XLSX.utils.book_new();
        
        // Estilos
        const sTitulo = { font: { sz: 16, bold: true, color: { rgb: "FFFFFF" } }, fill: { fgColor: { rgb: "B91C1C" } }, alignment: { horizontal: "center", vertical: "center" } };
        const sSubTitulo = { font: { sz: 11, bold: true, color: { rgb: "333333" } }, alignment: { horizontal: "left" } };
        const sHeaderTabla = { font: { bold: true, color: { rgb: "FFFFFF" } }, fill: { fgColor: { rgb: "1E293B" } }, border: { bottom: { style: "medium", color: { rgb: "000000" } } }, alignment: { horizontal: "center", vertical: "center" } };
        const sCeldaData = { border: { top: { style: "thin" }, bottom: { style: "thin" }, left: { style: "thin" }, right: { style: "thin" } }, alignment: { horizontal: "center", vertical: "center" } };
        const sMoneda = { border: { top: { style: "thin" }, bottom: { style: "thin" }, left: { style: "thin" }, right: { style: "thin" } }, alignment: { horizontal: "right", vertical: "center" }, numFmt: '"S/" #,##0.00' };

        const wsData = [
            ["REPORTE OFICIAL - TIENDA ROJAS"], 
            [`📅 Rango: ${inicio} al ${fin}`],  
            [`👤 Generado por: ${(window.USUARIO_DATA ? window.USUARIO_DATA.NombreCompleto : 'Sistema')}`], 
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
        XLSX.writeFile(wb, `Reporte_Rojas_${tipo}_${inicio}.xlsx`);

        if(btn) { btn.innerHTML = '<span></span> ¡Listo!'; setTimeout(() => { btn.innerHTML = txtOriginal; btn.disabled = false; }, 2000); }

    } catch (e) {
        console.error(e); mostrarNotificacion(" Error: " + e.message, 'error');
        if(btn) { btn.innerHTML = txtOriginal; btn.disabled = false; }
    }
};

// ==========================================
// 3. GRÁFICOS
// ==========================================
let chartPastel = null, chartBarras = null, chartHoras = null;

window.inicializarGraficos = async () => {
    const contenedor = document.getElementById('vista-financiero');
    if (!contenedor || contenedor.style.display === 'none') return;
    
    const fechaDash = document.getElementById('fechaInicio')?.value || ''; 
    const userDash = document.getElementById('filtroUsuarioReporte')?.value || '';
    
    const params = new URLSearchParams();
    if(fechaDash) params.append('fecha', fechaDash);

    // LÓGICA DE USUARIOS BLINDADA EN GRÁFICOS TAMBIÉN 🛡️
    const rol = window.ROL_USUARIO || '';
    const myId = window.USUARIO_ID;

    if (rol.includes('ADMIN')) {
        // Solo enviar si es un valor real (no vacío y no "undefined")
        if(userDash && userDash !== "" && userDash !== "undefined") {
            params.append('usuarioID', userDash);
        }
    } else {
        if(myId) params.append('usuarioID', myId);
    }

    try {
        const res = await fetch(`${window.BASE_URL}/reportes/graficos-hoy?${params.toString()}`, { headers: { 'Authorization': `Bearer ${window.TOKEN}` } });
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
        if(data.horas) {
            const ctxH = document.getElementById('graficoHoras').getContext('2d');
            if(chartHoras) chartHoras.destroy();
            const horasMap = new Array(24).fill(0);
            data.horas.forEach(item => { horasMap[parseInt(item.label)] = parseFloat(item.value); });
            const labelsHoras = Array.from({length: 24}, (_, i) => `${i}:00`);
            chartHoras = new Chart(ctxH, {
                type: 'line',
                data: {
                    labels: labelsHoras,
                    datasets: [{
                        label: 'Ventas por Hora (S/)', data: horasMap, borderColor: '#8b5cf6',
                        backgroundColor: 'rgba(139, 92, 246, 0.1)', borderWidth: 3, fill: true, tension: 0.4, pointRadius: 4, pointBackgroundColor: '#fff'
                    }]
                },
                options: {
                    responsive: true, maintainAspectRatio: false,
                    scales: { y: { beginAtZero: true, grid: { color: '#f3f4f6' } }, x: { grid: { display: false } } },
                    plugins: { legend: { display: false }, tooltip: { callbacks: { label: function(context) { return `S/ ${context.parsed.y.toFixed(2)}`; } } } }
                }
            });
        }
    } catch (e) { console.error("Error gráficos", e); }
};