// Mantendremos esto temporalmente hasta que decidas agregarlo a la Base de Datos
const BANCOS_POR_DEFECTO_USUARIO = {
    3: "BCP", 
    5: "BCP", 
    9: "BCP", 
    10: "BCP",
    6: "BBVA", 
    11: "BBVA",  
    12: "BBVA", 
    13: "BBVA", 
    14: "BBVA"
};

document.addEventListener('DOMContentLoaded', () => {
    cargarCategoriasVenta();
    cargarMetodosPago();

    const fY = document.getElementById('formYape');
    if (fY) fY.addEventListener('submit', (e) => procesarPago(e, fY, 'YAPE', 'inputFamilia', 'selectorFamilia'));
    
    const fT = document.getElementById('formTarjeta');
    if (fT) fT.addEventListener('submit', (e) => procesarPago(e, fT, 'TARJETA', 'inputFamiliaTarjeta', 'selectorFamiliaTarjeta'));
});

let ID_CATEGORIA_POR_DEFECTO = 1;

async function cargarCategoriasVenta() {
    try {
        // 🚀 SEGURIDAD: Uso de window.getAuthHeaders() en lugar de variable expuesta
        const response = await fetch(`${window.BASE_URL}/maestros/categorias`, {
            headers: window.getAuthHeaders()
        });
        if (!response.ok) return;
        const categorias = await response.json();

        // Buscar el ID de "Comestibles"
        const catComestibles = categorias.find(c => c.nombre.toUpperCase().includes('COMESTIBLE'));
        
        if (catComestibles) {
            ID_CATEGORIA_POR_DEFECTO = catComestibles.categoriaID || catComestibles.categoriaId || catComestibles.CategoriaID;
            console.log("✅ Categoría por defecto:", catComestibles.nombre, "(ID:", ID_CATEGORIA_POR_DEFECTO, ")");
        } else {
            ID_CATEGORIA_POR_DEFECTO = 1; 
            console.log("⚠️ No se encontró 'Comestibles', usando ID 1");
        }

        ['selectorFamilia', 'selectorFamiliaTarjeta'].forEach(idContenedor => {
            const contenedor = document.getElementById(idContenedor);
            const idInput = idContenedor === 'selectorFamilia' ? 'inputFamilia' : 'inputFamiliaTarjeta';
            
            if(contenedor) {
                contenedor.innerHTML = ''; 
                categorias.forEach(cat => {
                    if(cat.activo) {
                        const btn = document.createElement('button');
                        btn.type = 'button';
                        btn.className = 'card-familia'; 
                        
                        // Compatibilidad robusta de ID
                        const catId = cat.categoriaID || cat.categoriaId || cat.CategoriaID;
                        btn.dataset.value = catId;
                        
                        const icono = window.MAPA_ICONOS[cat.nombre] || '📦';
                        btn.innerHTML = `<span class="emoji">${icono}</span><span class="label">${cat.nombre}</span>`;
                        
                        btn.addEventListener('click', function() {
                            contenedor.querySelectorAll('.card-familia').forEach(b => b.classList.remove('seleccionado'));
                            this.classList.add('seleccionado');
                            document.getElementById(idInput).value = catId;
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
        // 🚀 SEGURIDAD: Añadiendo el Token JWT
        const response = await fetch(`${window.BASE_URL}/maestros/entidades`, {
            headers: window.getAuthHeaders()
        });
        if (!response.ok) return;
        const entidades = await response.json();

        const contenedorYape = document.getElementById('selectorDestino');
        if(contenedorYape) {
            contenedorYape.innerHTML = '';
            
            // 1. DIBUJAR LOS BOTONES
            entidades.forEach(ent => {
                if(ent.activo && (ent.tipo === 'BILLETERA' || ent.nombre.includes('BCP') || ent.nombre.includes('BBVA'))) {
                    const btn = document.createElement('button');
                    btn.type = 'button';
                    btn.className = 'chip-banco';
                    
                    const entId = ent.entidadID || ent.entidadId || ent.EntidadID;
                    btn.dataset.value = entId;
                    btn.dataset.nombre = ent.nombre.toUpperCase(); 
                    
                    let claseDot = 'generic';
                    if(ent.nombre.includes('BCP')) claseDot = 'bcp';
                    if(ent.nombre.includes('BBVA')) claseDot = 'bbva';
                    if(ent.nombre.includes('Yape')) claseDot = 'personal';
                    if(ent.nombre.includes('Plin')) claseDot = 'interbank';

                    btn.innerHTML = `<span class="dot ${claseDot}"></span> ${ent.nombre}`;
                    
                    btn.addEventListener('click', function() {
                        contenedorYape.querySelectorAll('.chip-banco').forEach(b => b.classList.remove('seleccionado'));
                        this.classList.add('seleccionado');
                        document.getElementById('inputDestino').value = entId;
                    });
                    contenedorYape.appendChild(btn);
                }
            });

            // 2. LÓGICA DE PRESELECCIÓN AUTOMÁTICA
            const nombreBancoPreferido = BANCOS_POR_DEFECTO_USUARIO[window.USUARIO_ID];
            
            if (nombreBancoPreferido) {
                const btnPreferido = Array.from(contenedorYape.querySelectorAll('.chip-banco')).find(b => 
                    b.dataset.nombre.includes(nombreBancoPreferido.toUpperCase())
                );
                
                if (btnPreferido) {
                    btnPreferido.click(); 
                } else {
                    const primerBtn = contenedorYape.querySelector('.chip-banco');
                    if (primerBtn) primerBtn.click();
                }
            } else {
                const primerBtn = contenedorYape.querySelector('.chip-banco');
                if (primerBtn) primerBtn.click();
            }
        }

        const contenedorTarjeta = document.getElementById('selectorBancoTarjeta');
        if(contenedorTarjeta) {
            contenedorTarjeta.innerHTML = '';
            entidades.forEach(ent => {
                if(ent.activo && ent.tipo === 'BANCO') {
                    const btn = document.createElement('button');
                    btn.type = 'button';
                    btn.className = 'chip-banco';
                    
                    const entId = ent.entidadID || ent.entidadId || ent.EntidadID;
                    btn.dataset.value = entId;

                    let claseDot = 'generic';
                    if(ent.nombre.includes('Interbank')) claseDot = 'interbank';
                    if(ent.nombre.includes('Scotiabank')) claseDot = 'scotia';
                    
                    btn.innerHTML = `<span class="dot ${claseDot}"></span> ${ent.nombre}`;
                    btn.addEventListener('click', function() {
                        contenedorTarjeta.querySelectorAll('.chip-banco').forEach(b => b.classList.remove('seleccionado'));
                        this.classList.add('seleccionado');
                        document.getElementById('inputBancoTarjeta').value = entId;
                    });
                    contenedorTarjeta.appendChild(btn);
                }
            });
            
            const primerBtnTarjeta = contenedorTarjeta.querySelector('.chip-banco');
            if(primerBtnTarjeta) primerBtnTarjeta.click();
        }
        
    } catch (e) { console.error("Error cargando bancos:", e); }
}

async function procesarPago(e, form, tipo, idInputFam, idContenedorFam) {
    e.preventDefault();

    if (typeof window.CAJA_ABIERTA !== 'undefined' && window.CAJA_ABIERTA === false) {
        mostrarNotificacion("🔒 CAJA CERRADA\nAbre turno primero para realizar ventas.", 'error'); return;
    }

    const btn = form.querySelector('.btn-registrar-grande');
    const inputFam = document.getElementById(idInputFam);
    const monto = parseFloat(form.querySelector('input[type="number"]').value);

    if (!monto || monto <= 0) { mostrarNotificacion("⚠️ Ingresa un monto válido", 'error'); return; }

    let categoriaFinal = typeof ID_CATEGORIA_POR_DEFECTO !== 'undefined' ? ID_CATEGORIA_POR_DEFECTO : 1; 
    if (inputFam && inputFam.value && inputFam.value.trim() !== "") {
        categoriaFinal = parseInt(inputFam.value);
    }

    let entidadId = 1, numOp = null, compId = 2, comprobanteExt = null; 

    if (tipo === 'YAPE') {
        const valDestino = document.getElementById('inputDestino').value;
        if (valDestino && valDestino.trim() !== "") entidadId = valDestino;
        numOp = document.getElementById('numOperacion').value;
        if (!numOp) { mostrarNotificacion("⚠️ Ingrese el número de operación", 'error'); return; }
        compId = document.getElementById('inputComprobante').value;
        const inputExt = document.getElementById('txtComprobanteYape');
        if(inputExt) comprobanteExt = inputExt.value.trim();
    } else {
        const valBanco = document.getElementById('inputBancoTarjeta').value;
        if (!valBanco || valBanco.trim() === "") { mostrarNotificacion("⚠️ Selecciona el Banco", 'error'); return; }
        entidadId = valBanco;
        numOp = document.getElementById('numOperacionTarjeta').value;
        if (!numOp) { mostrarNotificacion("⚠️ Ingrese el Voucher/Lote", 'error'); return; }
        const inputCompT = document.getElementById('inputComprobanteTarjeta');
        if(inputCompT) compId = inputCompT.value;
        const inputExt = document.getElementById('txtComprobanteTarjeta');
        if(inputExt) comprobanteExt = inputExt.value.trim();
    }

    const originalText = btn.innerHTML;
    btn.innerHTML = 'Procesando...';
    btn.disabled = true;

    // 🚀 Lógica inteligente para documentos. Si algún día agregas inputs en el HTML, los leerá.
    const inputDoc = document.getElementById('clienteDoc');
    const inputNom = document.getElementById('clienteNombre');
    const clienteDocFinal = inputDoc && inputDoc.value ? inputDoc.value.trim() : "00000000";
    const clienteNombreFinal = inputNom && inputNom.value ? inputNom.value.trim() : "Publico General";

    const payload = {
        usuarioID: parseInt(window.USUARIO_ID),
        tipoComprobanteID: parseInt(compId),
        clienteDoc: clienteDocFinal, 
        clienteNombre: clienteNombreFinal,
        comprobanteExterno: comprobanteExt,
        // Los arreglos mantienen PascalCase para encajar perfecto con las anotaciones de Jackson
        detalles: [{ "CategoriaID": categoriaFinal, "Monto": monto }], 
        pagos: [{ "FormaPago": tipo === 'YAPE' ? 'QR' : 'TARJETA', "Monto": monto, "EntidadID": parseInt(entidadId), "NumOperacion": numOp }]
    };

    try {
        // 🚀 SEGURIDAD: Inyectando las cabeceras seguras con el JWT
        const res = await fetch(`${window.BASE_URL}/ventas/registrar`, {
            method: 'POST', 
            headers: window.getAuthHeaders(),
            body: JSON.stringify(payload)
        });

        const data = await res.json();
        
        // Manejo compatible con cualquier nomenclatura de respuesta del Stored Procedure
        if (res.ok && (data.Status === 'OK' || data.status === 'OK')) {
            mostrarNotificacion(` VENTA EXITOSA\nTicket: ${data.Comprobante || data.comprobante}`);
            form.reset();
            const cont = document.getElementById(idContenedorFam);
            if(cont) cont.querySelectorAll('.seleccionado').forEach(el => el.classList.remove('seleccionado'));
            if(inputFam) inputFam.value = "";
            
            // Reset visuals
            if (tipo === 'YAPE') {
                document.getElementById('inputDestino').value = "1";
                document.getElementById('inputComprobante').value = "2";
                document.getElementById('selectorDestino')?.querySelectorAll('.seleccionado').forEach(b => b.classList.remove('seleccionado'));
                // Click automático al favorito tras resetear
                cargarMetodosPago();
            } else {
                document.getElementById('inputBancoTarjeta').value = "";
                document.getElementById('inputComprobanteTarjeta').value = "2";
                document.getElementById('selectorBancoTarjeta')?.querySelectorAll('.seleccionado').forEach(b => b.classList.remove('seleccionado'));
                cargarMetodosPago();
            }
        } else {
            throw new Error(data.Mensaje || data.mensaje || "No se pudo registrar la venta");
        }
    } catch (error) {
        console.error(error);
        mostrarNotificacion(` ERROR: ${error.message}`, 'error');
    } finally {
        btn.innerHTML = originalText; 
        btn.disabled = false;
    }
}