document.addEventListener('DOMContentLoaded', () => {
    cargarCategoriasVenta();
    cargarMetodosPago();

    const fY = document.getElementById('formYape');
    if (fY) fY.addEventListener('submit', (e) => procesarPago(e, fY, 'YAPE', 'inputFamilia', 'selectorFamilia'));
    const fT = document.getElementById('formTarjeta');
    if (fT) fT.addEventListener('submit', (e) => procesarPago(e, fT, 'TARJETA', 'inputFamiliaTarjeta', 'selectorFamiliaTarjeta'));
});

async function cargarCategoriasVenta() {
    try {
        const response = await fetch(`${BASE_URL}/maestros/categorias`, { headers: { 'Authorization': `Bearer ${TOKEN}` } });
        if (!response.ok) return;
        const categorias = await response.json();

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
                        btn.dataset.value = cat.categoriaID;
                        const icono = MAPA_ICONOS[cat.nombre] || '📦';
                        btn.innerHTML = `<span class="emoji">${icono}</span><span class="label">${cat.nombre}</span>`;
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
        const response = await fetch(`${BASE_URL}/maestros/entidades`, { headers: { 'Authorization': `Bearer ${TOKEN}` } });
        if (!response.ok) return;
        const entidades = await response.json();

        // Yape/Plin
        const contenedorYape = document.getElementById('selectorDestino');
        if(contenedorYape) {
            contenedorYape.innerHTML = '';
            entidades.forEach(ent => {
                if(ent.activo && (ent.tipo === 'BILLETERA' || ent.nombre.includes('BCP') || ent.nombre.includes('BBVA'))) {
                    crearBotonBanco(ent, contenedorYape, 'inputDestino', 'YAPE');
                }
            });
        }
        // Tarjetas
        const contenedorTarjeta = document.getElementById('selectorBancoTarjeta');
        if(contenedorTarjeta) {
            contenedorTarjeta.innerHTML = '';
            entidades.forEach(ent => {
                if(ent.activo && ent.tipo === 'BANCO') {
                    crearBotonBanco(ent, contenedorTarjeta, 'inputBancoTarjeta', 'TARJETA');
                }
            });
        }
    } catch (e) { console.error("Error cargando bancos:", e); }
}

function crearBotonBanco(ent, contenedor, inputId, tipo) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'chip-banco';
    btn.dataset.value = ent.entidadID;
    
    let claseDot = 'generic';
    if(ent.nombre.includes('BCP')) claseDot = 'bcp';
    if(ent.nombre.includes('BBVA')) claseDot = 'bbva';
    if(ent.nombre.includes('Yape')) claseDot = 'personal';
    if(ent.nombre.includes('Plin') || ent.nombre.includes('Interbank')) claseDot = 'interbank';
    if(ent.nombre.includes('Scotiabank')) claseDot = 'scotia';

    btn.innerHTML = `<span class="dot ${claseDot}"></span> ${ent.nombre}`;
    btn.addEventListener('click', function() {
        contenedor.querySelectorAll('.chip-banco').forEach(b => b.classList.remove('seleccionado'));
        this.classList.add('seleccionado');
        document.getElementById(inputId).value = ent.entidadID;
    });
    contenedor.appendChild(btn);
}

async function procesarPago(e, form, tipo, idInputFam, idContenedorFam) {
    e.preventDefault();

    if (typeof CAJA_ABIERTA !== 'undefined' && CAJA_ABIERTA === false) {
        mostrarNotificacion("🔒 CAJA CERRADA\nAbre turno primero para realizar ventas.", 'error'); return;
    }

    const btn = form.querySelector('.btn-registrar-grande');
    const inputFam = document.getElementById(idInputFam);
    const monto = parseFloat(form.querySelector('input[type="number"]').value);

    // Validaciones
    if (!inputFam || !inputFam.value) { mostrarNotificacion("⚠️ Selecciona una Familia (Categoría)", 'error'); return; }
    if (!monto || monto <= 0) { mostrarNotificacion("⚠️ Ingresa un monto válido", 'error'); return; }

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

    const payload = {
        usuarioID: parseInt(USUARIO_ID),
        tipoComprobanteID: parseInt(compId),
        clienteDoc: "00000000", clienteNombre: "Publico General",
        comprobanteExterno: comprobanteExt,
        detalles: [{ "CategoriaID": parseInt(inputFam.value), "Monto": monto }], 
        pagos: [{ "FormaPago": tipo === 'YAPE' ? 'QR' : 'TARJETA', "Monto": monto, "EntidadID": parseInt(entidadId), "NumOperacion": numOp }]
    };

    try {
        const res = await fetch(`${BASE_URL}/ventas/registrar`, {
            method: 'POST', 
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${TOKEN}` },
            body: JSON.stringify(payload)
        });

        const data = await res.json();
        
        if (res.ok && (data.Status === 'OK' || data.status === 'OK')) {
            mostrarNotificacion(` VENTA EXITOSA\nTicket: ${data.Comprobante || data.comprobante}`);
            form.reset();
            const cont = document.getElementById(idContenedorFam);
            if(cont) cont.querySelectorAll('.seleccionado').forEach(el => el.classList.remove('seleccionado'));
            inputFam.value = "";
            
            // Reset visuals
            if (tipo === 'YAPE') {
                document.getElementById('inputDestino').value = "1";
                document.getElementById('inputComprobante').value = "2";
                document.getElementById('selectorDestino')?.querySelectorAll('.seleccionado').forEach(b => b.classList.remove('seleccionado'));
            } else {
                document.getElementById('inputBancoTarjeta').value = "";
                document.getElementById('inputComprobanteTarjeta').value = "2";
                document.getElementById('selectorBancoTarjeta')?.querySelectorAll('.seleccionado').forEach(b => b.classList.remove('seleccionado'));
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