document.addEventListener('DOMContentLoaded', () => {
    
    // ==========================================
    // 0. CONFIGURACIÓN INICIAL Y SESIÓN
    // ==========================================
    const BASE_URL = 'http://localhost:8080/api';
    let CAJA_ABIERTA = false; 

    // Recuperar sesión
    const usuarioData = localStorage.getItem('usuarioSesion');
    // Validación básica de seguridad (Descomentar en producción)
    // if (!usuarioData) { window.location.href = '../html/login.html'; return; }
    
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

    // =========================================================
    // 1. INTERACTIVIDAD VISUAL (BOTONES Y SELECTORES)
    // =========================================================
    // Esta función hace que los botones se pongan azules al hacer clic
    function activarSelector(idContenedor, claseItems, idInputHidden) {
        const contenedor = document.getElementById(idContenedor);
        const input = document.getElementById(idInputHidden);
        
        if (contenedor && input) {
            const items = contenedor.querySelectorAll(`.${claseItems}`);
            items.forEach(btn => {
                btn.addEventListener('click', () => {
                    // Quitar selección a los demás
                    items.forEach(i => i.classList.remove('seleccionado'));
                    // Marcar el actual
                    btn.classList.add('seleccionado');
                    // Guardar valor en el input oculto
                    input.value = btn.getAttribute('data-value');
                });
            });
        }
    }

    // Activamos todos los grupos de botones
    activarSelector('selectorFamilia', 'card-familia', 'inputFamilia');
    activarSelector('selectorFamiliaTarjeta', 'card-familia', 'inputFamiliaTarjeta');
    activarSelector('selectorDestino', 'chip-banco', 'inputDestino');
    activarSelector('selectorBancoTarjeta', 'chip-banco', 'inputBancoTarjeta');
    activarSelector('selectorComprobante', 'segmento', 'inputComprobante');


    // =========================================================
    // 2. CONTROL DE CAJA (ABRIR / ESTADO)
    // =========================================================
    const btnAbrirCaja = document.getElementById('btnAbrirCaja');
    const areaTrabajo = document.querySelector('.area-trabajo');

    // Función visual para bloquear/desbloquear la pantalla
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
                // areaTrabajo.style.pointerEvents = "none"; // Descomentar si deseas bloqueo total
            }
        }
    }

    // Consultar al Backend si ya hay caja abierta
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
    verificarEstadoCaja(); // Ejecutar al inicio

    // Botón Abrir Caja
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
    // 3. CIERRE DE SESIÓN Y TICKET DE CIERRE
    // ==========================================
    const btnLogout = document.getElementById('btnCerrarSesion');
    if(btnLogout) {
        btnLogout.addEventListener('click', async () => {
            if(!confirm("¿Seguro que deseas Cerrar Sesión? \nSi la caja está abierta, se cerrará automáticamente.")) return;

            // Si hay caja abierta, la cerramos antes de salir
            if (CAJA_ABIERTA) {
                try {
                    const uid = usuario.UsuarioID || usuario.usuarioID;
                    // 1. Obtener montos finales
                    const resReporte = await fetch(`${BASE_URL}/reportes/cierre-actual/${uid}`);
                    if (!resReporte.ok) throw new Error("Error obteniendo datos de cierre");
                    const dataReporte = await resReporte.json();
                    
                    // 2. Cerrar en BD
                    await fetch(`${BASE_URL}/caja/cerrar`, {
                        method: 'POST', headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ 
                            usuarioID: uid, 
                            saldoFinalReal: dataReporte.SaldoEsperadoEnCaja || 0.00 
                        })
                    });
                    alert("🔒 Caja cerrada y turno finalizado.");
                } catch (e) { 
                    console.error("Error cierre automático:", e);
                }
            }
            localStorage.removeItem('usuarioSesion');
            window.location.href = '../html/login.html';
        });
    }

    // Función global para el botón "Imprimir Cierre"
    window.imprimirCierre = async () => {
        try {
            const uid = usuario.UsuarioID || usuario.usuarioID;
            
            // 1. Obtener datos
            const resReporte = await fetch(`${BASE_URL}/reportes/cierre-actual/${uid}`);
            if(!resReporte.ok) throw new Error("Error obteniendo datos");
            const data = await resReporte.json();

            // 2. Llenar Ticket Oculto (HTML)
            document.getElementById('ticketFecha').textContent = new Date().toLocaleDateString();
            document.getElementById('ticketHora').textContent = new Date().toLocaleTimeString();
            document.getElementById('ticketYape').textContent = `S/ ${parseFloat(data.VentasDigital || 0).toFixed(2)}`;
            document.getElementById('ticketTarjeta').textContent = `S/ ${parseFloat(data.VentasTarjeta || 0).toFixed(2)}`;
            document.getElementById('ticketTotal').textContent = `S/ ${parseFloat(data.TotalVendido || 0).toFixed(2)}`;

            // 3. Cerrar Caja en BD
            const resCierre = await fetch(`${BASE_URL}/caja/cerrar`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ usuarioID: uid, saldoFinalReal: data.SaldoEsperadoEnCaja })
            });

            if(!resCierre.ok) throw new Error("Error al cerrar caja en BD");

            // 4. Imprimir
            window.print();
            actualizarEstadoVisualCaja(false); 

        } catch (error) {
            alert("❌ Error en el cierre: " + error.message);
        }
    };

    // ==========================================
    // 4. LÓGICA DE VENTAS (PROCESAR PAGO)
    // ==========================================
    async function procesarPago(e, form, tipo, idInputFam, idContenedorFam) {
        e.preventDefault();

        // Validaciones previas
        if (typeof CAJA_ABIERTA !== 'undefined' && CAJA_ABIERTA === false) {
            alert("🔒 CAJA CERRADA\nAbre turno primero."); return;
        }

        let usuarioActivo = usuario || JSON.parse(localStorage.getItem('usuarioSesion'));
        if (!usuarioActivo) { alert("⚠️ Error de sesión"); return; }

        // Captura de datos básicos
        const btn = form.querySelector('.btn-registrar-grande');
        const inputFam = document.getElementById(idInputFam);
        const monto = parseFloat(form.querySelector('input[type="number"]').value);

        if (!inputFam || !inputFam.value) { alert("⚠️ Selecciona una Familia (Categoría)"); return; }
        if (!monto || monto <= 0) { alert("⚠️ Ingresa un monto válido"); return; }

        // Datos específicos de pago
        let entidadId = 1, numOp = null, compId = 2;
        
        if (tipo === 'YAPE') {
            entidadId = document.getElementById('inputDestino').value;
            numOp = document.getElementById('numOperacion').value;
            compId = document.getElementById('inputComprobante').value;
            if (!numOp) { alert("⚠️ Ingrese el número de operación"); return; }
        } else {
            entidadId = document.getElementById('inputBancoTarjeta').value;
            numOp = document.getElementById('numOperacionTarjeta').value;
            if (!numOp) { alert("⚠️ Ingrese el Voucher/Lote"); return; }
        }

        // Feedback Visual
        const originalText = btn.innerHTML;
        btn.innerHTML = 'Procesando...';
        btn.disabled = true;

        // Construcción del objeto para el Backend
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
                
                // Limpiar formulario
                form.reset();
                const cont = document.getElementById(idContenedorFam);
                if(cont) cont.querySelectorAll('.seleccionado').forEach(el => el.classList.remove('seleccionado'));
                inputFam.value = "";
                
                // Efecto de éxito en botón
                btn.innerHTML = '¡ÉXITO!';
                setTimeout(() => { btn.innerHTML = originalText; btn.disabled = false; }, 1500);

            } else {
                const err = await res.json();
                alert(`❌ ERROR: ${err.error || err.Mensaje}`);
                btn.innerHTML = originalText; btn.disabled = false;
            }
        } catch (error) {
            alert("❌ Error de conexión con el servidor");
            btn.innerHTML = originalText; btn.disabled = false;
        }
    }

    // Listeners para los formularios de venta
    const fY = document.getElementById('formYape');
    if (fY) fY.addEventListener('submit', (e) => procesarPago(e, fY, 'YAPE', 'inputFamilia', 'selectorFamilia'));
    
    const fT = document.getElementById('formTarjeta');
    if (fT) fT.addEventListener('submit', (e) => procesarPago(e, fT, 'TARJETA', 'inputFamiliaTarjeta', 'selectorFamiliaTarjeta'));


    // ==========================================
    // 5. HISTORIAL DE VENTAS Y ANULACIONES
    // ==========================================
    async function cargarHistorial() {
        const cuerpoTabla = document.getElementById('cuerpoTablaTransacciones');
        if(!cuerpoTabla) return;

        cuerpoTabla.innerHTML = '<tr><td colspan="7" style="text-align:center;">Cargando...</td></tr>';

        try {
            const uid = usuario.UsuarioID || usuario.usuarioID;
            const res = await fetch(`${BASE_URL}/ventas/historial/${uid}`);
            
            if(!res.ok) throw new Error("Error cargando historial");

            const ventas = await res.json();
            cuerpoTabla.innerHTML = '';

            if(ventas.length === 0) {
                cuerpoTabla.innerHTML = '<tr><td colspan="7" style="text-align:center; padding: 2rem;">No hay ventas hoy.</td></tr>';
                return;
            }

            ventas.forEach(v => {
                const fecha = new Date(v.FechaEmision).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
                const esAnulado = v.Estado === 'ANULADO';
                
                const fila = `
                    <tr style="${esAnulado ? 'opacity: 0.6; background: #fff5f5;' : ''}">
                        <td class="col-tipo">${v.FormaPago === 'QR' || v.FormaPago === 'YAPE' ? '📱 YAPE' : (v.FormaPago === 'TARJETA' ? '💳 TARJETA' : '💵 EFECTIVO')}</td>
                        <td>${v.Familia || 'Varios'}</td>
                        <td>
                            <div style="font-size:0.85rem; font-weight:bold;">${v.RefOperacion || v.Comprobante}</div>
                        </td>
                        <td class="dato-monto">S/ ${parseFloat(v.ImporteTotal).toFixed(2)}</td>
                        <td>${fecha}</td>
                        <td><span class="badge-estado ${esAnulado ? 'anulado' : 'completado'}">${v.Estado}</span></td>
                        <td>
                            <button class="btn-anular" onclick="solicitarAnulacion(${v.VentaID})" ${esAnulado ? 'disabled' : ''}>🚫 Anular</button>
                        </td>
                    </tr>`;
                cuerpoTabla.insertAdjacentHTML('beforeend', fila);
            });

        } catch (error) { 
            cuerpoTabla.innerHTML = '<tr><td colspan="7" style="text-align:center; color:red;">Error de conexión</td></tr>'; 
        }
    }

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
        } catch (e) { 
            alert("❌ Error de red"); 
        }
    };


    // ==========================================
    // 6. MÓDULO ADMIN: GESTIÓN DE USUARIOS
    // ==========================================
    async function cargarUsuarios() {
        const cuerpoTabla = document.getElementById('cuerpoTablaUsuarios');
        if (!cuerpoTabla) return; 

        try {
            const res = await fetch(`${BASE_URL}/admin/usuarios`);
            if (!res.ok) throw new Error("Error cargando usuarios");

            const usuariosDB = await res.json();
            cuerpoTabla.innerHTML = '';

            if (usuariosDB.length === 0) { 
                cuerpoTabla.innerHTML = '<tr><td colspan="6" style="text-align:center;">Sin usuarios</td></tr>'; 
                return; 
            }

            usuariosDB.forEach(u => {
                const fila = `<tr>
                    <td>${u.UsuarioID}</td>
                    <td>${u.NombreCompleto}</td>
                    <td><span class="badge-rol ${u.Rol === 'ADMINISTRADOR' ? 'admin' : 'cajero'}">${u.Rol}</span></td>
                    <td>${u.Activo ? '🟢 Activo' : '🔴 Inactivo'}</td>
                    <td>******</td>
                    <td><button class="btn-editar" onclick="editarUsuario(${u.UsuarioID})" style="cursor:pointer; border:none;">✏️ Editar</button></td>
                </tr>`;
                cuerpoTabla.insertAdjacentHTML('beforeend', fila);
            });
        } catch (error) { 
            console.error(error);
        }
    }

    // Función: Abrir modal y cargar datos para editar
    window.editarUsuario = async (idUsuario) => {
        try {
            // Traemos todos para buscar al seleccionado (o podrías hacer fetch by ID)
            const res = await fetch(`${BASE_URL}/admin/usuarios`);
            const usuarios = await res.json();
            const user = usuarios.find(u => u.UsuarioID === idUsuario);
            
            if (!user) return;

            // Rellenar Modal
            document.getElementById('idUsuarioEdicion').value = user.UsuarioID;
            document.getElementById('nombreUsuario').value = user.NombreCompleto;
            document.getElementById('tituloModalUsuario').textContent = "Editar: " + user.Username;
            document.getElementById('rolUsuario').value = user.Rol === 'ADMINISTRADOR' ? 'Administrador' : 'Cajero';
            
            const selEstado = document.getElementById('estadoUsuario');
            if(selEstado) selEstado.value = user.Activo ? 'Activo' : 'Inactivo';

            document.getElementById('passUsuario').placeholder = "(Vacío para no cambiar)";
            document.getElementById('passUsuario').value = ""; 

            abrirModalUsuario();
        } catch (e) { 
            alert("Error cargando datos del usuario"); 
        }
    };

    // Manejo del Formulario (Crear o Editar)
    const formUsuario = document.getElementById('formUsuario');
    if (formUsuario) {
        // Clonamos para limpiar listeners previos
        const nuevoForm = formUsuario.cloneNode(true);
        formUsuario.parentNode.replaceChild(nuevoForm, formUsuario);

        nuevoForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const idEdicion = document.getElementById('idUsuarioEdicion').value;
            const nombre = document.getElementById('nombreUsuario').value;
            const pass = document.getElementById('passUsuario').value;
            const rol = document.getElementById('rolUsuario').value === 'Administrador' ? 1 : 2;
            
            const btnGuardar = nuevoForm.querySelector('.btn-guardar');
            const txtOriginal = btnGuardar.innerHTML;
            btnGuardar.innerHTML = 'Guardando...'; btnGuardar.disabled = true;

            try {
                if (idEdicion) {
                    // --- MODO EDICIÓN ---
                    // Simulamos edición de turno y datos básicos
                    const nuevoTurno = confirm(`¿Deseas asignar a ${nombre} al turno NOCHE? \n[Aceptar]=NOCHE, [Cancelar]=MAÑANA`) ? 2 : 1;
                    
                    await fetch(`${BASE_URL}/admin/asignar-turno`, {
                        method: 'POST', headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ 
                            adminID: usuario.UsuarioID, 
                            usuarioID: parseInt(idEdicion), 
                            turnoID: nuevoTurno 
                        })
                    });
                    alert("✅ Usuario actualizado (Turno asignado)");

                } else {
                    // --- MODO CREACIÓN ---
                    const nuevoUsuario = {
                        adminID: usuario.UsuarioID || usuario.usuarioID,
                        nombreCompleto: nombre,
                        username: nombre.split(' ')[0].toLowerCase() + Math.floor(Math.random() * 100),
                        password: pass || '123456',
                        rolID: rol
                    };

                    const res = await fetch(`${BASE_URL}/admin/crear-usuario`, {
                        method: 'POST', headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(nuevoUsuario)
                    });

                    if (!res.ok) throw new Error("Error al crear usuario");
                    const dataRes = await res.json();
                    
                    // Asignar turno por defecto (Mañana)
                    await fetch(`${BASE_URL}/admin/asignar-turno`, {
                        method: 'POST', headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ 
                            adminID: usuario.UsuarioID, 
                            usuarioID: dataRes.usuarioID || dataRes.UsuarioID, 
                            turnoID: 1 
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
    // 7. MÓDULO REPORTES (EXCEL)
    // ==========================================
    window.generarReporte = async (tipo) => {
        const uid = usuario.UsuarioID || usuario.usuarioID;
        let endpoint = '';
        const nombreArchivo = `Reporte_${tipo}_${new Date().toISOString().slice(0,10)}.csv`;

        if (tipo === 'GENERAL') endpoint = `${BASE_URL}/ventas/historial/${uid}`; 
        else if (tipo === 'RANGO') {
            const inicio = document.getElementById('fechaInicio').value;
            const fin = document.getElementById('fechaFin').value;
            if (!inicio || !fin) { alert("⚠️ Selecciona las fechas de inicio y fin"); return; }
            endpoint = `${BASE_URL}/reportes/ventas-rango?inicio=${inicio}&fin=${fin}`; 
        }

        const btn = document.querySelector(`.btn-generar-reporte[onclick*="${tipo}"]`);
        if(btn) btn.textContent = "⏳ Descargando...";

        try {
            const res = await fetch(endpoint);
            if (!res.ok) throw new Error("No se encontraron datos");
            
            const data = await res.json();
            if (!data || data.length === 0) { 
                alert("⚠️ No hay datos para generar el reporte."); 
                if(btn) btn.textContent = "📥 Descargar Reporte"; 
                return; 
            }

            // Conversión JSON -> CSV
            const cabeceras = Object.keys(data[0]);
            const filas = data.map(row => cabeceras.map(key => `"${String(row[key] || '').replace(/"/g, '""')}"`).join(','));
            const csvContent = "\uFEFF" + [cabeceras.join(','), ...filas].join('\n');
            
            // Descarga
            const link = document.createElement("a");
            link.href = URL.createObjectURL(new Blob([csvContent], { type: 'text/csv;charset=utf-8;' }));
            link.download = nombreArchivo;
            document.body.appendChild(link); link.click(); document.body.removeChild(link);

            if(btn) btn.textContent = "✅ ¡Listo!";
            setTimeout(() => { if(btn) btn.textContent = "📥 Descargar Reporte"; }, 2000);

        } catch (e) { 
            alert("❌ Error: " + e.message); 
            if(btn) btn.textContent = "❌ Error"; 
        }
    };


    // ==========================================
    // 8. DASHBOARD (GRÁFICOS)
    // ==========================================
    let chartPastel = null;
    let chartBarras = null;

    window.inicializarGraficos = async () => {
        const contenedor = document.getElementById('vista-financiero');
        if (contenedor.style.display === 'none') return;

        try {
            const hoy = new Date().toISOString().slice(0,10);
            // Reusamos el endpoint de reportes para obtener datos del día
            const res = await fetch(`${BASE_URL}/reportes/ventas-rango?inicio=${hoy}&fin=${hoy}`);
            const ventas = res.ok ? await res.json() : [];

            const datosFam = {};
            const datosHora = {};
            
            ventas.forEach(v => { 
                // Agrupar por Familia
                const f = v.Familia || 'Otros'; 
                datosFam[f] = (datosFam[f]||0) + parseFloat(v.ImporteTotal);
                
                // Agrupar por Hora
                const h = new Date(v.FechaEmision).getHours();
                datosHora[h] = (datosHora[h]||0) + parseFloat(v.ImporteTotal);
            });

            // Gráfico Pastel
            const ctxP = document.getElementById('graficoPastel').getContext('2d');
            if(chartPastel) chartPastel.destroy();
            chartPastel = new Chart(ctxP, {
                type: 'doughnut',
                data: {
                    labels: Object.keys(datosFam),
                    datasets: [{ 
                        data: Object.values(datosFam), 
                        borderWidth: 0, 
                        backgroundColor: ['#ff6384','#36a2eb','#ffce56','#4bc0c0','#9966ff'] 
                    }]
                }, 
                options: { responsive: true, plugins: { legend: { position: 'right' } } }
            });

            // Gráfico Barras
            const ctxB = document.getElementById('graficoBarras').getContext('2d');
            if(chartBarras) chartBarras.destroy();
            const horas = Object.keys(datosHora).sort((a,b)=>a-b);
            chartBarras = new Chart(ctxB, {
                type: 'bar',
                data: {
                    labels: horas.map(h => `${h}:00`),
                    datasets: [{ 
                        label: 'Ventas S/', 
                        data: horas.map(h=>datosHora[h]), 
                        backgroundColor: '#22c55e', 
                        borderRadius: 4 
                    }]
                }, 
                options: { scales: { y: { beginAtZero: true } } }
            });

        } catch (e) { console.error("Error cargando gráficos", e); }
    };


    // ==========================================
    // 9. UTILIDADES Y MENÚ LATERAL
    // ==========================================
    const btnToggle = document.getElementById('btnToggleMenu');
    const sidebar = document.getElementById('sidebar');
    const menuItems = document.querySelectorAll('.item-menu');
    const vistas = document.querySelectorAll('.vista-seccion');

    // Reloj digital
    function actualizarReloj() {
        const ahora = new Date();
        const texto = ahora.toLocaleString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true });
        document.querySelectorAll('.fecha-hora-reloj').forEach(s => s.textContent = texto);
        const fechaCierre = document.getElementById('fechaCierre');
        if(fechaCierre) fechaCierre.textContent = ahora.toLocaleDateString('es-PE');
    }
    setInterval(actualizarReloj, 1000);
    actualizarReloj();

    // Navegación del Menú
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
                        
                        // Carga perezosa de datos según la vista
                        if(targetId === 'vista-cierre') {
                             fetch(`${BASE_URL}/reportes/cierre-actual/${usuario.UsuarioID || usuario.usuarioID}`).then(r => r.json()).then(d => {
                                document.getElementById('totalYape').textContent = `S/ ${parseFloat(d.VentasDigital || 0).toFixed(2)}`;
                                document.getElementById('totalTarjeta').textContent = `S/ ${parseFloat(d.VentasTarjeta || 0).toFixed(2)}`;
                                document.getElementById('totalGeneral').textContent = `S/ ${parseFloat(d.TotalVendido || 0).toFixed(2)}`;
                            }).catch(()=>{});
                        }
                        if(targetId === 'vista-anulacion') cargarHistorial();
                        if(targetId === 'vista-roles') cargarUsuarios();
                        if(targetId === 'vista-financiero') inicializarGraficos();
                    }
                });
            }
            // Cerrar menú en móvil
            if(window.innerWidth <= 768 && sidebar) {
                sidebar.classList.remove('mobile-open');
                if(btnToggle) btnToggle.classList.remove('activo');
            }
        });
    });

    // Toggle menú móvil
    if(btnToggle) btnToggle.addEventListener('click', (e) => {
        e.stopPropagation();
        btnToggle.classList.toggle('activo');
        sidebar.classList.toggle(window.innerWidth > 768 ? 'colapsado' : 'mobile-open');
    });

    // Modales
    window.abrirModalUsuario = () => document.getElementById('modalUsuario').classList.add('mostrar');
    window.cerrarModalUsuario = () => document.getElementById('modalUsuario').classList.remove('mostrar');

});