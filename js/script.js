document.addEventListener('DOMContentLoaded', () => {
    
    // ==========================================
    // 0. CONFIGURACIÓN INICIAL Y SESIÓN
    // ==========================================
    const BASE_URL = 'https://fastcash-backend-production.up.railway.app/api'; 
    let CAJA_ABIERTA = false; 

    // Recuperar sesión
    const usuarioData = localStorage.getItem('usuarioSesion');
    let TOKEN = '';
    
    if (!usuarioData) { 
        window.location.href = '../html/login.html'; 
        return;
    }
    
    const usuario = JSON.parse(usuarioData);
    TOKEN = usuario.token || ''; // Aseguramos tener el token para las peticiones nuevas

    // Mostrar nombre en el header
    const nombreCajeroEl = document.querySelector('.nombre-cajero');
    if (nombreCajeroEl) {
        nombreCajeroEl.textContent = usuario.NombreCompleto || usuario.nombrecompleto || usuario.username || 'Usuario';
    }

    // ==========================================
    // 0.1 CARGA DINÁMICA DE MAESTROS (¡NUEVO!) 🎨
    // ==========================================
    // Esto reemplaza a los botones fijos. Trae las categorías y bancos de la BD.

    const MAPA_ICONOS = {
        'Comestibles': '🍞', 'Bebidas': '🥤', 'Licores': '🍷',
        'Limpieza': '🧹', 'Cuidado Personal': '🧴', 'Frescos': '🥦',
        'Plasticos': '🥣', 'Libreria': '✏️', 'Bazar': '🛍️',
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

            // Llenar en ambas vistas (Yape y Tarjeta)
            ['selectorFamilia', 'selectorFamiliaTarjeta'].forEach(idContenedor => {
                const contenedor = document.getElementById(idContenedor);
                const idInput = idContenedor === 'selectorFamilia' ? 'inputFamilia' : 'inputFamiliaTarjeta';
                
                if(contenedor) {
                    contenedor.innerHTML = ''; // Limpiar mensaje de carga
                    categorias.forEach(cat => {
                        if(cat.activo) {
                            const btn = document.createElement('button');
                            btn.type = 'button';
                            btn.className = 'card-familia'; // Tu clase CSS existente
                            btn.dataset.value = cat.categoriaID;
                            
                            const icono = MAPA_ICONOS[cat.nombre] || '📦';
                            btn.innerHTML = `<span class="emoji">${icono}</span><span class="label">${cat.nombre}</span>`;
                            
                            // Lógica de selección
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

            // 1. Selector YAPE/PLIN
            const contenedorYape = document.getElementById('selectorDestino');
            if(contenedorYape) {
                contenedorYape.innerHTML = '';
                entidades.forEach(ent => {
                    // Filtramos: Solo Billeteras o Bancos populares
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

            // 2. Selector TARJETA (Solo Bancos)
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

    // INICIALIZAR CARGAS DINÁMICAS
    cargarCategoriasVenta();
    cargarMetodosPago();


    // ==========================================
    // GESTIÓN DE PERMISOS (ROBUSTA)
    // ==========================================
    let rolUsuario = "CAJERO";
    
    // Normalizamos el rol para evitar errores de mayúsculas/minúsculas
    if (usuario.Rol) {
        rolUsuario = usuario.Rol.toUpperCase();
    } else if (usuario.rol) {
        rolUsuario = usuario.rol.toUpperCase();
    } else if (usuario.RolID === 1 || usuario.rolID === 1) {
        rolUsuario = "ADMINISTRADOR";
    }

    console.log("👮 Rol detectado:", rolUsuario);

    // Seleccionamos elementos admin, incluyendo el NUEVO botón de configuración
    const itemsAdmin = document.querySelectorAll('.admin, .item-menu[data-target="vista-reportes"], .item-menu[data-target="vista-roles"], .item-menu[data-target="vista-financiero"], #btn-nav-admin');
    
    if (rolUsuario !== 'ADMINISTRADOR' && !rolUsuario.includes('ADMIN')) {
        itemsAdmin.forEach(item => item.style.display = 'none');
    } else {
        // Solo si es admin cargamos los filtros
        cargarFiltroUsuarios();
        cargarFiltroHistorial();
        // Mostrar botón de admin maestros
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
            // Nota: Para categorías y bancos, esto ahora se maneja dentro de 'cargarCategoriasVenta'
            // Pero lo dejamos para los comprobantes que siguen siendo estáticos
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

    // YA NO LLAMAMOS A activarSelector PARA FAMILIAS/BANCOS PORQUE SON DINÁMICOS
    // activarSelector('selectorFamilia', 'card-familia', 'inputFamilia'); <--- ELIMINADO
    
    // Estos sí se mantienen porque son estáticos (Boleta/Factura)
    activarSelector('selectorComprobante', 'segmento', 'inputComprobante');
    activarSelector('selectorComprobanteTarjeta', 'segmento', 'inputComprobanteTarjeta');


    // =========================================================
    // 2. CONTROL DE CAJA (ABRIR / ESTADO)
    // =========================================================
    const btnAbrirCaja = document.getElementById('btnAbrirCaja');
    const areaTrabajo = document.querySelector('.area-trabajo');

    function actualizarEstadoVisualCaja(estaAbierta) {
        CAJA_ABIERTA = estaAbierta;
        
        // 1. Control del Botón en el Header
        if(btnAbrirCaja) btnAbrirCaja.style.display = estaAbierta ? 'none' : 'flex';

        // 2. Control del Área de Trabajo
        if(areaTrabajo) { 
            if (estaAbierta) {
                // CAJA ABIERTA: Todo habilitado
                areaTrabajo.style.opacity = "1"; 
                areaTrabajo.style.pointerEvents = "all"; 
            } else {
                // CAJA CERRADA
                if (rolUsuario === 'ADMINISTRADOR' || rolUsuario.includes('ADMIN')) {
                    // EXCEPCIÓN ADMIN: Puede ver reportes aunque caja esté cerrada
                    areaTrabajo.style.opacity = "1"; 
                    areaTrabajo.style.pointerEvents = "all"; 
                } else {
                    // CAJERO: Bloqueo total visual hasta abrir caja
                    areaTrabajo.style.opacity = "0.5"; 
                    areaTrabajo.style.pointerEvents = "none"; 
                }
            }
        }
    }

    async function verificarEstadoCaja() {
        try {
            const uid = usuario.UsuarioID || usuario.usuarioid || usuario.usuarioID;
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
                        usuarioID: usuario.UsuarioID || usuario.usuarioid, 
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
            const uid = usuario.UsuarioID || usuario.usuarioid;
            
            // 1. Obtener los cálculos desde la Base de Datos
            const resReporte = await fetch(`${BASE_URL}/reportes/cierre-actual/${uid}`, {
                headers: { 'Authorization': `Bearer ${TOKEN}` }
            });
            if(!resReporte.ok) throw new Error("No se pudieron calcular los montos finales.");
            
            const data = await resReporte.json(); 
            
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

            // const elTurno = document.getElementById('ticketTurno');
            // if (elTurno) elTurno.textContent = turnoNombre.toUpperCase();

            // setText('ticketSaldoInicialPrint', saldoIni); // Si tienes este campo en el ticket
            // setText('ticketEfectivoPrint', vEfec);
            
            const elYapePrint = document.getElementById('ticketYapePrint');
            if(elYapePrint) elYapePrint.textContent = `S/ ${parseFloat(vDig).toFixed(2)}`;
            
            const elTarjetaPrint = document.getElementById('ticketTarjetaPrint');
            if(elTarjetaPrint) elTarjetaPrint.textContent = `S/ ${parseFloat(vTarj).toFixed(2)}`;

            setText('ticketAnuladoPrint', vAnulado); 
            setText('ticketTotalPrint', vTotal); 

            // 3. Cerrar la caja en el Backend
            const resCierre = await fetch(`${BASE_URL}/caja/cerrar`, {
                method: 'POST', 
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${TOKEN}` },
                body: JSON.stringify({ 
                    usuarioID: uid, 
                    saldoFinalReal: saldoFinalEsperado 
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
    // 4. LÓGICA DE VENTAS (CORREGIDA)
    // ==========================================
   async function procesarPago(e, form, tipo, idInputFam, idContenedorFam) {
        e.preventDefault();

        if (typeof CAJA_ABIERTA !== 'undefined' && CAJA_ABIERTA === false) {
            alert("🔒 CAJA CERRADA\nAbre turno primero para realizar ventas."); return;
        }

        let usuarioActivo = usuario || JSON.parse(localStorage.getItem('usuarioSesion'));
        const btn = form.querySelector('.btn-registrar-grande');
        const inputFam = document.getElementById(idInputFam);
        const monto = parseFloat(form.querySelector('input[type="number"]').value);

        if (!inputFam || !inputFam.value) { alert("⚠️ Selecciona una Familia (Categoría)"); return; }
        if (!monto || monto <= 0) { alert("⚠️ Ingresa un monto válido"); return; }

        let entidadId = 1, numOp = null, compId = 2;
        let comprobanteExt = null; 

        if (tipo === 'YAPE') {
            entidadId = document.getElementById('inputDestino').value;
            numOp = document.getElementById('numOperacion').value;
            compId = document.getElementById('inputComprobante').value;
            const inputExt = document.getElementById('txtComprobanteYape');
            if(inputExt) comprobanteExt = inputExt.value.trim();
            if (!numOp) { alert("⚠️ Ingrese el número de operación"); return; }
        } else {
            entidadId = document.getElementById('inputBancoTarjeta').value;
            numOp = document.getElementById('numOperacionTarjeta').value;
            const inputCompT = document.getElementById('inputComprobanteTarjeta');
            if(inputCompT) compId = inputCompT.value;
            const inputExt = document.getElementById('txtComprobanteTarjeta');
            if(inputExt) comprobanteExt = inputExt.value.trim();
            if (!numOp) { alert("⚠️ Ingrese el Voucher/Lote"); return; }
        }

        const originalText = btn.innerHTML;
        btn.innerHTML = 'Procesando...';
        btn.disabled = true;

        // ✅ CORRECCIÓN CRÍTICA: Usamos camelCase para que Java lo entienda
        const payload = {
            usuarioID: usuarioActivo.UsuarioID || usuarioActivo.usuarioid, 
            tipoComprobanteID: parseInt(compId),
            clienteDoc: "00000000", 
            clienteNombre: "Publico General",
            comprobanteExterno: comprobanteExt,
            
            detalles: [{ 
                categoriaID: parseInt(inputFam.value), // Antes CategoriaID
                monto: monto 
            }], 
            pagos: [{ 
                formaPago: tipo === 'YAPE' ? 'QR' : 'TARJETA', 
                monto: monto, 
                entidadID: parseInt(entidadId), 
                numOperacion: numOp 
            }]
        };

        try {
            const res = await fetch(`${BASE_URL}/ventas/registrar`, {
                method: 'POST', 
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${TOKEN}` },
                body: JSON.stringify(payload)
            });

            const data = await res.json();
            
            // Soportamos respuesta mayúscula o minúscula por compatibilidad
            const status = data.Status || data.status; 
            const mensaje = data.Mensaje || data.mensaje;
            const ticket = data.Comprobante || data.comprobante;

            if (res.ok && status === 'OK') {
                alert(`✅ VENTA EXITOSA\nTicket: ${ticket}`);
                form.reset();
                const cont = document.getElementById(idContenedorFam);
                if(cont) cont.querySelectorAll('.seleccionado').forEach(el => el.classList.remove('seleccionado'));
                inputFam.value = "";
                
                // Reset selectores visuales
                if(tipo === 'YAPE') {
                   document.getElementById('inputComprobante').value = "2";
                   // Resetear visualmente los botones de segmento si existen
                } else {
                   document.getElementById('inputComprobanteTarjeta').value = "2";
                }
            } else {
                throw new Error(mensaje || "No se pudo registrar la venta");
            }

        } catch (error) {
            console.error(error);
            alert(`❌ ERROR: ${error.message}`);
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
        if (rolUsuario !== 'ADMINISTRADOR' && !rolUsuario.includes('ADMIN')) return;
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
                    select.innerHTML += `<option value="${u.UsuarioID || u.usuarioid}">${u.NombreCompleto || u.nombrecompleto}</option>`;
                });
            }
        } catch(e) { console.error("Error cargando filtro historial", e); }
    }

    window.cargarHistorial = async function() {
        const cuerpoTabla = document.getElementById('cuerpoTablaTransacciones');
        if(!cuerpoTabla) return;

        const filtroSelect = document.getElementById('filtroUsuarioHistorial');
        const filtroID = filtroSelect ? filtroSelect.value : '';

        cuerpoTabla.innerHTML = '<tr><td colspan="8" style="text-align:center; padding: 2rem; color: #666;">⏳ Cargando datos recientes...</td></tr>';

        try {
            const uid = usuario.UsuarioID || usuario.usuarioid;
            let url = `${BASE_URL}/ventas/historial/${uid}?_=${new Date().getTime()}`;
            if(filtroID) url += `&filtro=${filtroID}`;

            const res = await fetch(url);
            if(!res.ok) throw new Error("Error cargando historial");

            const ventas = await res.json();
            cuerpoTabla.innerHTML = '';

            if(ventas.length === 0) {
                cuerpoTabla.innerHTML = '<tr><td colspan="8" style="text-align:center; padding: 2rem; color: #888;">📭 No hay ventas registradas con este filtro.</td></tr>';
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
                                <button class="btn-anular" onclick="solicitarAnulacion(${ventaId})" ${esAnulado ? 'disabled' : ''}>🚫 Anular</button>
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
                method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${TOKEN}` },
                body: JSON.stringify({ 
                    ventaID: ventaId, 
                    usuarioID: usuario.UsuarioID || usuario.usuarioid, 
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
                    select.innerHTML += `<option value="${u.UsuarioID || u.usuarioid}">${u.NombreCompleto || u.nombrecompleto}</option>`;
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
                const rol = u.Rol || u.rol;
                const uid = u.UsuarioID || u.usuarioid;
                const nombre = u.NombreCompleto || u.nombrecompleto;
                const username = u.Username || u.username;
                const turno = u.TurnoActual || u.turnoactual;
                const activo = u.Activo || u.activo;

                const rolClase = (rol || '').toUpperCase().includes('ADMIN') ? 'admin' : 'cajero';
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
                        <button class="btn-editar" onclick="editarUsuario(${uid})" style="cursor:pointer; border:none; background:none; font-size:1.2rem;" title="Editar">✏️</button>
                        ${esActivo ? `<button class="btn-eliminar" onclick="eliminarUsuario(${uid})" style="cursor:pointer; border:none; background:none; font-size:1.2rem;" title="Desactivar">🗑️</button>` : ''}
                    </td>
                </tr>`;
                cuerpoTabla.insertAdjacentHTML('beforeend', fila);
            });
        } catch (error) { console.error(error); }
    }
window.eliminarUsuario = async (idUsuario) => {
        // Confirmación clara de que es SOLO desactivación
        if(!confirm("¿Estás seguro de DESACTIVAR este usuario?\n(Podrás reactivarlo después editándolo)")) return;
        
        try {
            // ✅ RUTA CORRECTA: DELETE /admin/usuario/{id}
            const res = await fetch(`${BASE_URL}/admin/usuario/${idUsuario}`, { 
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${TOKEN}` }
            });

            if(res.ok) {
                alert("✅ Usuario desactivado correctamente.");
                cargarUsuarios(); // Recargar tabla
            } else {
                const data = await res.json().catch(() => ({}));
                alert(`❌ Error: ${data.message || "No se pudo desactivar"}`);
            }
        } catch(e) { 
            console.error(e);
            alert("❌ Error de conexión"); 
        }
    };

    window.editarUsuario = async (idUsuario) => {
        try {
            const res = await fetch(`${BASE_URL}/admin/usuarios?t=${new Date().getTime()}`, {
                headers: { 'Authorization': `Bearer ${TOKEN}` }
            });
            const usuarios = await res.json();
            
            const user = usuarios.find(u => (u.UsuarioID || u.usuarioid) === idUsuario);
            if (!user) return;

            const uid = user.UsuarioID || user.usuarioid;
            const nombre = user.NombreCompleto || user.nombrecompleto;
            const username = user.Username || user.username;
            const turnoID = user.TurnoID || user.turnoid || 1;
            const rol = user.Rol || user.rol;
            const activo = user.Activo || user.activo;

            document.getElementById('idUsuarioEdicion').value = uid;
            document.getElementById('nombreUsuario').value = nombre;
            document.getElementById('usernameUsuario').value = username; 
            document.getElementById('turnoUsuario').value = turnoID;

            document.getElementById('tituloModalUsuario').textContent = "Editar Usuario";
            
            const rolSelect = document.getElementById('rolUsuario');
            const rolValue = (rol && rol.toUpperCase().includes('ADMIN')) ? 'Administrador' : 'Cajero';
            rolSelect.value = rolValue;

            const selEstado = document.getElementById('estadoUsuario');
            if(selEstado) {
                const esActivo = activo === true || activo === 1;
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
            // Normalizar Rol: Si dice "Administrador" enviamos 1, sino 2
            const rol = (rolVal === 'Administrador' || rolVal == 1) ? 1 : 2;
            const selectedTurno = document.getElementById('turnoUsuario').value;
            const estadoVal = document.getElementById('estadoUsuario')?.value;
            const esActivo = (estadoVal === 'true');

            const btnGuardar = nuevoForm.querySelector('.btn-guardar');
            const txtOriginal = btnGuardar.innerHTML;
            btnGuardar.innerHTML = 'Guardando...'; 
            btnGuardar.disabled = true;

            try {
                if (idEdicion) {
                    // --- MODO EDICIÓN (PUT) ---
                    const payload = { 
                        usuarioID: parseInt(idEdicion),
                        nombreCompleto: nombre,
                        username: usernameInput,
                        rolID: rol,
                        activo: esActivo,
                        turnoID: parseInt(selectedTurno)
                    };
                    // Solo enviamos password si el usuario escribió algo nuevo
                    if(pass && pass.trim() !== "") payload.password = pass;

                    await fetch(`${BASE_URL}/admin/usuario`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${TOKEN}` },
                        body: JSON.stringify(payload)
                    });
                    alert("✅ Usuario actualizado correctamente");

                } else {
                    // --- MODO CREACIÓN (POST) ---
                    const nuevoUsuario = {
                        nombreCompleto: nombre,
                        username: usernameInput, 
                        password: pass, // Backend se encarga de cifrarla
                        rolID: rol
                    };

                    const res = await fetch(`${BASE_URL}/admin/usuario`, {
                        method: 'POST', 
                        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${TOKEN}` },
                        body: JSON.stringify(nuevoUsuario)
                    });

                    if (!res.ok) {
                        const err = await res.json();
                        throw new Error(err.mensaje || err.error || "Error al crear usuario");
                    }

                    // Si necesitas asignar turno al nuevo usuario, hazlo aquí o asegúrate
                    // que tu backend asigne un turno por defecto.
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
    // 7. ADMINISTRACIÓN MAESTROS (¡NUEVO!) 🛠️
    // ==========================================
    let entidadActualAdmin = null; 
    let modoEdicionAdmin = false;

    // Función para mostrar la sección Admin
    window.mostrarSeccionAdmin = function() {
        document.querySelectorAll('.item-menu').forEach(i => i.classList.remove('activo'));
        const btnAdmin = document.getElementById('btn-nav-admin');
        if(btnAdmin) btnAdmin.classList.add('activo');
        
        document.querySelectorAll('.vista-seccion').forEach(v => v.style.display = 'none');
        document.getElementById('vista-admin-maestros').style.display = 'block';
    }

    // Cargar Categorías en Tabla
    window.cargarAdminCategorias = async function() {
        entidadActualAdmin = 'CATEGORIA';
        const workspace = document.getElementById('admin-workspace');
        if(workspace) workspace.innerHTML = 'Cargando categorías...';

        try {
            const res = await fetch(`${BASE_URL}/maestros/categorias`, {
                headers: { 'Authorization': `Bearer ${TOKEN}` }
            });
            const lista = await res.json();

            let html = `
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <h3>📦 Listado de Categorías</h3>
                    <button onclick="abrirModalCrear()" class="btn-nuevo-usuario">+ Nueva Categoría</button>
                </div>
                <table class="tabla-datos">
                    <thead><tr><th>ID</th><th>Nombre</th><th>Estado</th><th>Acciones</th></tr></thead>
                    <tbody>
            `;

            lista.forEach(item => {
                html += `
                    <tr>
                        <td>${item.categoriaID}</td>
                        <td>${item.nombre}</td>
                        <td>${item.activo ? '<span class="badge-ok">Activo</span>' : '<span class="badge-no">Inactivo</span>'}</td>
                        <td>
                            <button onclick="abrirModalEditarCategoria(${item.categoriaID}, '${item.nombre}', ${item.activo})" class="btn-edit">✏️</button>
                        </td>
                    </tr>`;
            });
            html += '</tbody></table>';
            workspace.innerHTML = html;
        } catch (e) {
            if(workspace) workspace.innerHTML = '<p class="error">Error cargando datos.</p>';
        }
    }

    // Cargar Entidades en Tabla
    window.cargarAdminEntidades = async function() {
        entidadActualAdmin = 'ENTIDAD';
        const workspace = document.getElementById('admin-workspace');
        if(workspace) workspace.innerHTML = 'Cargando entidades...';

        try {
            const res = await fetch(`${BASE_URL}/maestros/entidades`, {
                headers: { 'Authorization': `Bearer ${TOKEN}` }
            });
            const lista = await res.json();

            let html = `
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <h3>🏦 Bancos y Billeteras</h3>
                    <button onclick="abrirModalCrear()" class="btn-nuevo-usuario">+ Nueva Entidad</button>
                </div>
                <table class="tabla-datos">
                    <thead><tr><th>ID</th><th>Nombre</th><th>Tipo</th><th>Estado</th><th>Acciones</th></tr></thead>
                    <tbody>
            `;

            lista.forEach(item => {
                html += `
                    <tr>
                        <td>${item.entidadID}</td>
                        <td>${item.nombre}</td>
                        <td>${item.tipo}</td>
                        <td>${item.activo ? '<span class="badge-ok">Activo</span>' : '<span class="badge-no">Inactivo</span>'}</td>
                        <td>
                            <button onclick="abrirModalEditarEntidad(${item.entidadID}, '${item.nombre}', '${item.tipo}', ${item.activo})" class="btn-edit">✏️</button>
                        </td>
                    </tr>`;
            });
            html += '</tbody></table>';
            workspace.innerHTML = html;
        } catch (e) {
            if(workspace) workspace.innerHTML = '<p class="error">Error cargando datos.</p>';
        }
    }

    // --- FUNCIONES DEL MODAL ADMIN ---
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

    window.cerrarModalAdmin = function() {
        document.getElementById('modal-admin').style.display = 'none';
    }

    // GUARDAR ADMIN (POST / PUT)
    document.getElementById('form-admin')?.addEventListener('submit', async function(e) {
        e.preventDefault();

        const id = document.getElementById('admin-id').value;
        const nombre = document.getElementById('admin-nombre').value;
        const activo = document.getElementById('admin-activo').value === 'true';
        
        let url = `${BASE_URL}/maestros`;
        let body = { nombre, activo };

        if (entidadActualAdmin === 'CATEGORIA') {
            url += '/categorias';
        } else {
            url += '/entidades';
            body.tipo = document.getElementById('admin-tipo').value;
        }

        if (modoEdicionAdmin) {
            url += `/${id}`;
        }

        try {
            const response = await fetch(url, {
                method: modoEdicionAdmin ? 'PUT' : 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${TOKEN}`
                },
                body: JSON.stringify(body)
            });

            if (response.ok) {
                alert('Operación guardada correctamente');
                cerrarModalAdmin();
                // Recargar tabla administrativa
                if (entidadActualAdmin === 'CATEGORIA') cargarAdminCategorias();
                else cargarAdminEntidades();
                
                // Recargar selectores principales para que se refleje en ventas
                cargarCategoriasVenta();
                cargarMetodosPago();
            } else {
                alert('No se pudo guardar.');
            }
        } catch (error) {
            console.error(error);
        }
    });


    // ==========================================
    // 8. REPORTES EXCEL PROFESIONALES
    // ==========================================
    window.generarReporte = async (tipo) => {
        const inicio = document.getElementById('fechaInicio').value;
        const fin = document.getElementById('fechaFin').value;
        const usuarioFiltro = document.getElementById('filtroUsuarioReporte')?.value;

        // 1. Preparar parámetros
        const params = new URLSearchParams();
        if (inicio) params.append('inicio', inicio);
        if (fin) params.append('fin', fin);

        // Lógica de permisos para el filtro
        if (rolUsuario === 'ADMINISTRADOR') {
            if (usuarioFiltro) params.append('usuarioID', usuarioFiltro);
        } else {
            params.append('usuarioID', usuario.UsuarioID || usuario.usuarioid);
        }

        let endpoint = (tipo === 'CAJAS') ? '/reportes/cajas' : '/reportes/ventas';
        const urlFinal = `${BASE_URL}${endpoint}?${params.toString()}`;

        // 2. Feedback visual en el botón
        const btn = event.target.closest('button'); 
        const txtOriginal = btn ? btn.innerHTML : '';
        
        if (btn) {
            btn.innerHTML = '<span>⚙️</span> Generando Excel...';
            btn.disabled = true;
        }

        try {
            const res = await fetch(urlFinal, {
                headers: { 'Authorization': `Bearer ${TOKEN}` }
            });
            if (!res.ok) throw new Error("Error al obtener datos del servidor");
            
            const data = await res.json();
            
            if (!data || data.length === 0) {
                alert("⚠️ No se encontraron registros con esos filtros.");
                if (btn) { btn.innerHTML = txtOriginal; btn.disabled = false; }
                return;
            }

            // MAQUETACIÓN Y ESTILOS (TU LÓGICA EXISTENTE)
            const tituloPrincipal = (tipo === 'CAJAS') 
                ? "REPORTE DE CIERRE DE CAJA TIENDA ROJAS" 
                : "REPORTE DE VENTA DETALLADO TIENDA ROJAS";

            const worksheet = XLSX.utils.json_to_sheet(data, { origin: 'A2' });
            XLSX.utils.sheet_add_aoa(worksheet, [[tituloPrincipal]], { origin: 'A1' });

            const headers = Object.keys(data[0]);
            const ultimaColumnaIndex = headers.length - 1;

            if(!worksheet['!merges']) worksheet['!merges'] = [];
            worksheet['!merges'].push({ 
                s: { r: 0, c: 0 }, e: { r: 0, c: ultimaColumnaIndex } 
            });

            // Estilos
            const estiloTitulo = {
                font: { name: "Arial", sz: 14, bold: true, color: { rgb: "FFFFFF" } },
                fill: { fgColor: { rgb: "2C3E50" } },
                alignment: { horizontal: "center", vertical: "center" }
            };

            const estiloEncabezado = {
                font: { name: "Arial", sz: 11, bold: true, color: { rgb: "FFFFFF" } },
                fill: { fgColor: { rgb: "FF003C" } },
                alignment: { horizontal: "center", vertical: "center" }
            };

            const range = XLSX.utils.decode_range(worksheet['!ref']);
            for (let R = range.s.r; R <= range.e.r; ++R) {
                for (let C = range.s.c; C <= range.e.c; ++C) {
                    const cellAddress = XLSX.utils.encode_cell({ c: C, r: R });
                    if (!worksheet[cellAddress]) continue;

                    if (R === 0) worksheet[cellAddress].s = estiloTitulo;
                    else if (R === 1) worksheet[cellAddress].s = estiloEncabezado;
                }
            }

            // Ajuste Ancho
            const anchoColumnas = [];
            headers.forEach(key => {
                let maxLen = key.length;
                data.slice(0, 50).forEach(row => {
                    const val = row[key] ? String(row[key]) : "";
                    if (val.length > maxLen) maxLen = val.length;
                });
                anchoColumnas.push({ wch: maxLen + 5 });
            });
            worksheet['!cols'] = anchoColumnas;

            // Guardar
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, "Reporte");
            
            const fechaStr = inicio || new Date().toISOString().split('T')[0];
            XLSX.writeFile(workbook, `Reporte_${tipo}_${fechaStr}.xlsx`);

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
    // 9. GRÁFICOS DASHBOARD
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
        if(rolUsuario !== 'ADMINISTRADOR') params.append('usuarioID', usuario.UsuarioID || usuario.usuarioid);

        try {
            const res = await fetch(`${BASE_URL}/reportes/graficos-hoy?${params.toString()}`, {
                headers: { 'Authorization': `Bearer ${TOKEN}` }
            });
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
    // 10. NAVEGACIÓN Y MENÚ
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
            // Si es el botón de Admin y existe, dejamos pasar el evento si tiene lógica asociada
            if(this.id === 'btn-nav-admin') {
                // Si el href es #, prevenimos. Si tiene función onclick en HTML, la dejamos.
            }
            
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
                        
                        // CARGAS PEREZOSAS
                        if(targetId === 'vista-cierre') {
                            const uid = usuario.UsuarioID || usuario.usuarioid;
                            fetch(`${BASE_URL}/reportes/cierre-actual/${uid}`, { headers: { 'Authorization': `Bearer ${TOKEN}` } })
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
                        if(targetId === 'vista-admin-maestros') { 
                            // Cargar defecto
                            cargarAdminCategorias(); 
                        }
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