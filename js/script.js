document.addEventListener('DOMContentLoaded', () => {
    
    // ==========================================
    // 1. RELOJ EN TIEMPO REAL
    // ==========================================
    const spansFechaHora = document.querySelectorAll('.fecha-hora-reloj');
    const spanFechaCierre = document.getElementById('fechaCierre');

    function actualizarReloj() {
        const ahora = new Date();
        
        // Formato largo: 08/01/2026, 10:30 a. m.
        const opcionesCompleta = { 
            day: '2-digit', month: '2-digit', year: 'numeric', 
            hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true 
        };
        
        // Formato corto: 08/01/2026
        const opcionesFecha = { day: '2-digit', month: '2-digit', year: 'numeric' };

        try {
            const fechaTextoCompleta = ahora.toLocaleString('es-PE', opcionesCompleta);
            const fechaTextoSimple = ahora.toLocaleDateString('es-PE', opcionesFecha);

            if(spansFechaHora.length > 0) {
                spansFechaHora.forEach(span => span.textContent = fechaTextoCompleta);
            }
            if(spanFechaCierre) {
                spanFechaCierre.textContent = fechaTextoSimple;
            }
        } catch (e) {
            console.error("Error en reloj:", e);
        }
    }
    
    // Iniciar reloj
    setInterval(actualizarReloj, 1000);
    actualizarReloj();

    // ==========================================
    // 2. NAVEGACIÓN (SIDEBAR Y VISTAS)
    // ==========================================
    const btnToggle = document.getElementById('btnToggleMenu');
    const sidebar = document.getElementById('sidebar');
    const menuItems = document.querySelectorAll('.item-menu');
    const vistas = document.querySelectorAll('.vista-seccion');

    menuItems.forEach(item => {
        item.addEventListener('click', function(e) {
            // Validar si es un enlace de navegación
            const href = this.getAttribute('href');
            if(href === '#' || href === null) e.preventDefault();
            
            // Ignorar si es el botón de salir
            if(this.classList.contains('cierre-sesion')) return;

            // 1. Actualizar Sidebar (Visual)
            menuItems.forEach(i => i.classList.remove('activo'));
            this.classList.add('activo');

            // 2. Cambiar Vista
            const targetId = this.getAttribute('data-target');
            if(targetId) {
                vistas.forEach(vista => {
                    // Ocultar todas primero
                    vista.classList.remove('activa');
                    vista.style.display = 'none'; 
                    
                    // Mostrar la seleccionada
                    if(vista.id === targetId) {
                        vista.style.display = 'block';
                        // Pequeño timeout para permitir transición CSS
                        setTimeout(() => vista.classList.add('activa'), 10);

                        // Si es financiero, cargar gráficos
                        if(targetId === 'vista-financiero') {
                            setTimeout(inicializarGraficos, 100);
                        }
                        // Si es cierre, recalcular
                        if(targetId === 'vista-cierre') {
                            calcularTotalesCierre();
                        }
                    }
                });
            }

            // 3. Cerrar menú en móvil
            if (window.innerWidth <= 768 && sidebar && btnToggle) {
                sidebar.classList.remove('mobile-open');
                btnToggle.classList.remove('activo');
            }
        });
    });

    // Toggle Sidebar (Botón Hamburguesa)
    if (btnToggle && sidebar) {
        btnToggle.addEventListener('click', (e) => {
            e.stopPropagation(); // Evita que el clic cierre el menú inmediatamente
            btnToggle.classList.toggle('activo');
            if (window.innerWidth > 768) {
                sidebar.classList.toggle('colapsado');
            } else {
                sidebar.classList.toggle('mobile-open'); 
            }
        });
    }

    // ==========================================
    // 3. LÓGICA DE BOTONES DE SELECCIÓN (CORE FIX)
    // ==========================================
    function configurarSelectores(idContenedor, idInputOculto, claseBoton) {
        const contenedor = document.getElementById(idContenedor);
        const input = document.getElementById(idInputOculto);
        
        if(!contenedor || !input) return; // Protección contra errores

        // Usamos Delegación de Eventos (Más seguro)
        contenedor.addEventListener('click', (e) => {
            // Buscar el botón más cercano al clic (por si hace clic en el icono o texto)
            const btn = e.target.closest(claseBoton);
            
            if (btn && contenedor.contains(btn)) {
                // 1. Quitar seleccionado a todos los hermanos
                const todosBotones = contenedor.querySelectorAll(claseBoton);
                todosBotones.forEach(b => b.classList.remove('seleccionado'));
                
                // 2. Activar el clickeado
                btn.classList.add('seleccionado');
                
                // 3. Efecto visual
                btn.style.transform = "scale(0.95)";
                setTimeout(() => btn.style.transform = "", 150);

                // 4. Actualizar el input hidden
                const valor = btn.getAttribute('data-value');
                input.value = valor;
                console.log(`Seleccionado en ${idContenedor}: ${valor}`);
            }
        });
    }

    // Inicializar Selectores (Asegúrate que los IDs en HTML coincidan)
    configurarSelectores('selectorFamilia', 'inputFamilia', '.card-familia');
    configurarSelectores('selectorDestino', 'inputDestino', '.chip-banco');
    configurarSelectores('selectorComprobante', 'inputComprobante', '.segmento');
    
    // Para la vista de Tarjeta
    configurarSelectores('selectorFamiliaTarjeta', 'inputFamiliaTarjeta', '.card-familia');
    configurarSelectores('selectorBancoTarjeta', 'inputBancoTarjeta', '.chip-banco');


    // ==========================================
    // 4. PROCESAR PAGOS (SIMULACIÓN)
    // ==========================================
    function procesarPago(e, form, tipo, idInputFamilia, idContenedorFam) {
        e.preventDefault();
        
        const btn = form.querySelector('.btn-registrar-grande');
        if(!btn) return;

        // Validar Familia
        const inputFam = document.getElementById(idInputFamilia);
        if(!inputFam || !inputFam.value) {
            alert("⚠️ Por favor selecciona qué vendiste (Familia)");
            return;
        }

        const originalText = btn.innerHTML;
        btn.innerHTML = 'Procesando...';
        btn.style.opacity = '0.7';
        btn.disabled = true;

        // Simular Delay de Red
        setTimeout(() => {
            btn.innerHTML = '¡REGISTRADO! 🎉';
            btn.style.background = '#4ade80';
            btn.style.opacity = '1';
            
            setTimeout(() => {
                btn.innerHTML = originalText;
                btn.style.background = '';
                btn.disabled = false;
                form.reset();
                
                // Resetear visualmente la familia seleccionada
                const contenedor = document.getElementById(idContenedorFam);
                if(contenedor) {
                    contenedor.querySelectorAll('.seleccionado').forEach(el => el.classList.remove('seleccionado'));
                }
                // Limpiar el input hidden manualmente
                if(inputFam) inputFam.value = "";
                
            }, 1500);
        }, 1000);
    }

    const formYape = document.getElementById('formYape');
    if(formYape) {
        formYape.addEventListener('submit', (e) => 
            procesarPago(e, formYape, 'YAPE', 'inputFamilia', 'selectorFamilia')
        );
    }

    const formTarjeta = document.getElementById('formTarjeta');
    if(formTarjeta) {
        formTarjeta.addEventListener('submit', (e) => 
            procesarPago(e, formTarjeta, 'TARJETA', 'inputFamiliaTarjeta', 'selectorFamiliaTarjeta')
        );
    }

    // ==========================================
    // 5. GESTIÓN DE USUARIOS (DATOS VACÍOS)
    // ==========================================
    let usuarios = []; // Array vacío por defecto

    function renderizarUsuarios() {
        const tbody = document.getElementById('cuerpoTablaUsuarios');
        const msg = document.getElementById('mensajeSinUsuarios');
        if(!tbody) return;
        
        tbody.innerHTML = '';
        
        if(usuarios.length === 0) {
            if(msg) msg.style.display = 'block';
        } else {
            if(msg) msg.style.display = 'none';
            usuarios.forEach(u => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${u.id}</td>
                    <td>${u.nombre}</td>
                    <td><span class="badge-estado ${u.rol === 'Administrador' ? 'completado' : 'anulado'}">${u.rol}</span></td>
                    <td>${u.estado}</td>
                    <td>••••••</td>
                    <td>
                        <button class="btn-accion btn-editar" onclick="editarUsuario(${u.id})">✏️</button>
                        <button class="btn-accion btn-eliminar" onclick="eliminarUsuario(${u.id})">🗑️</button>
                    </td>
                `;
                tbody.appendChild(tr);
            });
        }
    }
    renderizarUsuarios();

    // Lógica del Modal
    window.abrirModalUsuario = () => {
        const modal = document.getElementById('modalUsuario');
        if(modal) {
            document.getElementById('formUsuario').reset();
            document.getElementById('idUsuarioEdicion').value = '';
            document.getElementById('tituloModalUsuario').textContent = 'Nuevo Usuario';
            modal.style.display = 'block';
        }
    };
    
    window.cerrarModalUsuario = () => {
        const modal = document.getElementById('modalUsuario');
        if(modal) modal.style.display = 'none';
    };

    // Funciones globales para botones dinámicos
    window.editarUsuario = (id) => {
        const user = usuarios.find(u => u.id === id);
        if(user) {
            document.getElementById('idUsuarioEdicion').value = user.id;
            document.getElementById('nombreUsuario').value = user.nombre;
            document.getElementById('rolUsuario').value = user.rol;
            document.getElementById('estadoUsuario').value = user.estado;
            document.getElementById('passUsuario').value = user.password;
            
            document.getElementById('tituloModalUsuario').textContent = 'Editar Usuario';
            document.getElementById('modalUsuario').style.display = 'block';
        }
    };

    window.eliminarUsuario = (id) => {
        if(confirm('¿Eliminar usuario permanentemente?')) {
            usuarios = usuarios.filter(u => u.id !== id);
            renderizarUsuarios();
        }
    };

    const formUsuario = document.getElementById('formUsuario');
    if(formUsuario) {
        formUsuario.addEventListener('submit', (e) => {
            e.preventDefault();
            
            const idEdicion = document.getElementById('idUsuarioEdicion').value;
            const nombre = document.getElementById('nombreUsuario').value;
            const rol = document.getElementById('rolUsuario').value;
            const estado = document.getElementById('estadoUsuario').value;
            const pass = document.getElementById('passUsuario').value;

            if(idEdicion) {
                // Actualizar
                const index = usuarios.findIndex(u => u.id == idEdicion);
                if(index !== -1) {
                    usuarios[index] = { ...usuarios[index], nombre, rol, estado, password: pass };
                }
            } else {
                // Crear
                const nuevo = {
                    id: Date.now(),
                    nombre,
                    rol,
                    estado,
                    password: pass
                };
                usuarios.push(nuevo);
            }
            renderizarUsuarios();
            window.cerrarModalUsuario();
        });
    }

    // ==========================================
    // 6. ESTADO FINANCIERO (GRÁFICOS VACÍOS)
    // ==========================================
    let chartPastel = null;
    let chartBarras = null;

    window.inicializarGraficos = function() {
        const ctxP = document.getElementById('graficoPastel');
        const ctxB = document.getElementById('graficoBarras');

        if(ctxP && !chartPastel) {
            chartPastel = new Chart(ctxP.getContext('2d'), {
                type: 'doughnut',
                data: {
                    labels: ['Yape', 'Tarjeta', 'Efectivo'],
                    datasets: [{ 
                        data: [0, 0, 0], // Datos vacíos
                        backgroundColor: ['#ff003c', '#3b82f6', '#4ade80'], 
                        borderWidth: 0 
                    }]
                },
                options: { responsive: true, maintainAspectRatio: false }
            });
        }

        if(ctxB && !chartBarras) {
            chartBarras = new Chart(ctxB.getContext('2d'), {
                type: 'bar',
                data: {
                    labels: ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'],
                    datasets: [{ 
                        label: 'Ventas (S/)', 
                        data: [0, 0, 0, 0, 0, 0, 0], // Datos vacíos
                        backgroundColor: '#ff4d6d', 
                        borderRadius: 5 
                    }]
                },
                options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true } } }
            });
        }
    };

    // ==========================================
    // 7. REPORTES & CIERRE
    // ==========================================
    window.generarReporte = function(tipo) {
        if(tipo === 'RANGO') {
            const inicio = document.getElementById('fechaInicio').value;
            const fin = document.getElementById('fechaFin').value;
            if(!inicio || !fin) {
                alert("⚠️ Por favor selecciona ambas fechas.");
                return;
            }
            // Mostrar resultado simulado
            const res = document.getElementById('resultadoReporte');
            if(res) res.style.display = 'block';
        } else {
            alert(`Generando reporte ${tipo}... (Conectando a Base de Datos)`);
        }
    };

    window.calcularTotalesCierre = function() {
        // Datos en CERO
        if(document.getElementById('totalYape')) {
            document.getElementById('totalYape').textContent = 'S/ 0.00';
            document.getElementById('totalTarjeta').textContent = 'S/ 0.00';
            document.getElementById('totalAnulado').textContent = 'S/ 0.00';
            document.getElementById('totalGeneral').textContent = 'S/ 0.00';
        }
        return { yape: 0, tarjeta: 0, anulado: 0, totalGeneral: 0, operaciones: 0 };
    };

    window.imprimirCierre = function() {
        const ahora = new Date();
        // Llenar ticket con ceros
        document.getElementById('ticketFecha').textContent = ahora.toLocaleDateString();
        document.getElementById('ticketHora').textContent = ahora.toLocaleTimeString();
        document.getElementById('ticketYape').textContent = 'S/ 0.00';
        document.getElementById('ticketTarjeta').textContent = 'S/ 0.00';
        document.getElementById('ticketAnulado').textContent = 'S/ 0.00';
        document.getElementById('ticketTotal').textContent = 'S/ 0.00';
        document.getElementById('ticketOps').textContent = '0';
        
        window.print();
    };

    // ==========================================
    // 8. MANEJO DE CIERRE DE MODALES Y CLICS
    // ==========================================
    window.addEventListener('click', function(event) {
        const modal = document.getElementById('modalUsuario');
        
        // Cerrar modal si se hace clic fuera del contenido
        if (modal && event.target === modal) {
            modal.style.display = "none";
        }
        
        // Cerrar sidebar en móvil al hacer clic fuera
        if (window.innerWidth <= 768 && sidebar && sidebar.classList.contains('mobile-open')) {
            if (!sidebar.contains(event.target) && !btnToggle.contains(event.target)) {
                sidebar.classList.remove('mobile-open');
                if(btnToggle) btnToggle.classList.remove('activo');
            }
        }
    });

    // Cerrar Sesión
    const btnLogout = document.getElementById('btnCerrarSesion');
    if (btnLogout) {
        btnLogout.addEventListener('click', () => {
            btnLogout.innerHTML = '👋 Saliendo...';
            setTimeout(() => { window.location.href = '/login.html'; }, 500);
        });
    }
});