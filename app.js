// Constantes visuales actualizadas
const COLOR_NAMES = { 'R': 'Rojo', 'A': 'Amar', 'Z': 'Azul', 'V': 'Verde' };
const COLOR_ICONS = { 'R': '🔴', 'A': '🟡', 'Z': '🔵', 'V': '🟢' };
const ROLE_NAMES = { 'R': 'Rol Rojo', 'A': 'Rol Amarillo', 'Z': 'Rol Azul', 'V': 'Rol Verde' };

let usuarioActual = null;
let grupoActual = null;
let alumnosDisponibles = [];
let alumnosSeleccionados = [];
let globalTables = [];
let numMesas = 0;

// Generador de Cifrado SHA-256
async function generarHash(texto) {
    const encoder = new TextEncoder();
    const data = encoder.encode(texto);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// 1. SISTEMA DE LOGIN
document.getElementById('btnLogin').addEventListener('click', async () => {
    const userRaw = document.getElementById('loginUser').value.trim(); 
    const pass = document.getElementById('loginPass').value.trim();
    const errorEl = document.getElementById('loginError');

    const user = Object.keys(BASE_DE_DATOS).find(k => k.toLowerCase() === userRaw.toLowerCase());

    if (!user) {
        errorEl.textContent = 'Usuario no encontrado';
        return;
    }

    const hashGenerado = await generarHash(pass);

    if (hashGenerado === BASE_DE_DATOS[user].hash) {
        usuarioActual = user;
        document.getElementById('loginOverlay').style.display = 'none';
        document.getElementById('mainContainer').style.display = 'block';
        document.getElementById('nombreProfeUI').textContent = user;
        
        cargarConfiguracionUsuario();
    } else {
        errorEl.textContent = 'Contraseña incorrecta';
        document.getElementById('loginPass').value = '';
    }
});

document.getElementById('loginPass').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') document.getElementById('btnLogin').click();
});
document.getElementById('loginUser').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') document.getElementById('loginPass').focus();
});

// 2. CARGA DE GRUPOS Y DETECCIÓN DEL MODO ADMIN
const controlsCardGrupo = document.getElementById('controlsCardGrupo');
const panelAlumnos = document.getElementById('panelAlumnos');
const selectGrupo = document.getElementById('grupoSelect');
const controlesProfesor = document.getElementById('controlesProfesor');
const controlesAdmin = document.getElementById('controlesAdmin');

function cargarConfiguracionUsuario() {
    if (usuarioActual.toLowerCase() === 'admin') {
        // MODO COMODÍN ADMIN
        controlsCardGrupo.style.display = 'none';
        panelAlumnos.style.display = 'flex';
        controlesProfesor.style.display = 'none';
        controlesAdmin.style.display = 'flex';
        
        alumnosDisponibles = [];
        alumnosSeleccionados = [];
        actualizarSelectorAlumnos();
        renderizarChips();
    } else {
        // MODO PROFESOR
        controlsCardGrupo.style.display = 'flex';
        panelAlumnos.style.display = 'none';
        controlesProfesor.style.display = 'flex';
        controlesAdmin.style.display = 'none';
        
        selectGrupo.innerHTML = '<option value="">Elige un grupo...</option>';
        const gruposDelProfe = Object.keys(BASE_DE_DATOS[usuarioActual].grupos);
        
        gruposDelProfe.forEach(nombreGrupo => {
            const opt = document.createElement('option');
            opt.value = nombreGrupo;
            opt.textContent = nombreGrupo;
            selectGrupo.appendChild(opt);
        });
    }
}

// Evento cuando un profesor elige su grupo
selectGrupo.addEventListener('change', (e) => {
    const grupoSeleccionado = e.target.value;
    if (grupoSeleccionado) {
        grupoActual = grupoSeleccionado;
        alumnosDisponibles = [...BASE_DE_DATOS[usuarioActual].grupos[grupoActual]];
        alumnosSeleccionados = [];
        panelAlumnos.style.display = 'flex';
        actualizarSelectorAlumnos();
        renderizarChips();
    } else {
        panelAlumnos.style.display = 'none';
    }
});

// 3. SELECCIÓN DE ALUMNOS
function barajarArray(array) {
    let arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

function actualizarSelectorAlumnos() {
    const selectEl = document.getElementById('alumnoSelect');
    selectEl.innerHTML = '<option value="">Selecciona un alumno...</option>';
    
    alumnosDisponibles.sort().forEach(nombre => {
        const opt = document.createElement('option');
        opt.value = nombre;
        opt.textContent = nombre;
        selectEl.appendChild(opt);
    });
    
    document.getElementById('contadorAlumnos').textContent = alumnosSeleccionados.length;
    document.getElementById('btnCalcular').disabled = alumnosSeleccionados.length < 4;
    
    document.getElementById('sectionPreTask').style.display = 'none';
    document.getElementById('sectionSimulation').style.display = 'none';
    document.getElementById('blockInteraccion3').style.display = 'none';
    document.getElementById('sectionPostTask').style.display = 'none';
    document.getElementById('btnInteraccion3').style.display = 'none';
}

function renderizarChips() {
    const contenedorChips = document.getElementById('alumnosSeleccionadosContenedor');
    contenedorChips.innerHTML = '';
    if (alumnosSeleccionados.length === 0) {
        contenedorChips.innerHTML = '<span style="color: var(--text-muted); font-size: 0.9rem;">Aún no hay alumnos añadidos.</span>';
        return;
    }
    
    alumnosSeleccionados.forEach(nombre => {
        const chip = document.createElement('div');
        chip.className = 'chip';
        chip.innerHTML = `${nombre} <button class="chip-remove" onclick="quitarAlumno('${nombre}')">×</button>`;
        contenedorChips.appendChild(chip);
    });
}

// Botones Modo Profesor
function agregarAlumno() {
    const nombre = document.getElementById('alumnoSelect').value;
    if (!nombre) return;
    alumnosDisponibles = alumnosDisponibles.filter(n => n !== nombre);
    alumnosSeleccionados.push(nombre);
    actualizarSelectorAlumnos();
    renderizarChips();
}

window.quitarAlumno = function(nombre) {
    alumnosSeleccionados = alumnosSeleccionados.filter(n => n !== nombre);
    if (usuarioActual.toLowerCase() !== 'admin') {
        alumnosDisponibles.push(nombre);
    }
    actualizarSelectorAlumnos();
    renderizarChips();
}

document.getElementById('btnAgregarAlumno').addEventListener('click', agregarAlumno);
document.getElementById('btnAgregarTodos').addEventListener('click', () => {
    const todosJuntos = [...alumnosSeleccionados, ...alumnosDisponibles];
    alumnosSeleccionados = barajarArray(todosJuntos);
    alumnosDisponibles = [];
    actualizarSelectorAlumnos();
    renderizarChips();
});

// Botón Especial Modo Admin
document.getElementById('btnGenerarAdmin').addEventListener('click', () => {
    const cantidadStr = document.getElementById('adminInputNum').value;
    const num = parseInt(cantidadStr);

    if (isNaN(num) || num < 4) {
        alert("Por favor ingresa un número válido (mínimo 4).");
        return;
    }

    let generados = Array.from({length: num}, (_, i) => (i + 1).toString());
    alumnosSeleccionados = barajarArray(generados);
    alumnosDisponibles = [];
    
    actualizarSelectorAlumnos();
    renderizarChips();
});

// 4. EL MOTOR DE CÁLCULO DE MESAS
document.getElementById('btnCalcular').addEventListener('click', () => {
    if (alumnosSeleccionados.length < 4) return;
    document.getElementById('sectionPreTask').style.display = 'block';
    document.getElementById('sectionSimulation').style.display = 'block';
    document.getElementById('blockInteraccion3').style.display = 'none';
    document.getElementById('sectionPostTask').style.display = 'block';
    document.getElementById('btnInteraccion3').style.display = 'block';
    calcularDistribucion();
});

document.getElementById('btnInteraccion3').addEventListener('click', () => {
    document.getElementById('blockInteraccion3').style.display = 'block';
    document.getElementById('btnInteraccion3').style.display = 'none';
    renderInteraccion3();
    setTimeout(() => { document.getElementById('blockInteraccion3').scrollIntoView({ behavior: 'smooth' }); }, 100);
});

function calcularDistribucion() {
    const total = alumnosSeleccionados.length;
    numMesas = Math.floor(total / 4);
    const sobrantes = total % 4;

    const countR = numMesas + (sobrantes >= 1 ? 1 : 0);
    const countA = numMesas + (sobrantes >= 2 ? 1 : 0);
    const countZ = numMesas + (sobrantes === 3 ? 1 : 0);
    const countV = numMesas;

    document.getElementById('countR').innerText = countR;
    document.getElementById('countA').innerText = countA;
    document.getElementById('countZ').innerText = countZ;
    document.getElementById('countV').innerText = countV;
    document.getElementById('postCountR').innerText = countR;
    document.getElementById('postCountA').innerText = countA;
    document.getElementById('postCountZ').innerText = countZ;
    document.getElementById('postCountV').innerText = countV;

    let idx = 0;
    const namesR = alumnosSeleccionados.slice(idx, idx += countR);
    const namesA = alumnosSeleccionados.slice(idx, idx += countA);
    const namesZ = alumnosSeleccionados.slice(idx, idx += countZ);
    const namesV = alumnosSeleccionados.slice(idx, idx += countV);

    const mapNames = names => names.map(n => `<span>• ${n}</span>`).join('');
    document.getElementById('namesListR').innerHTML = mapNames(namesR);
    document.getElementById('namesListA').innerHTML = mapNames(namesA);
    document.getElementById('namesListZ').innerHTML = mapNames(namesZ);
    document.getElementById('namesListV').innerHTML = mapNames(namesV);
    
    document.getElementById('postNamesListR').innerHTML = mapNames(namesR);
    document.getElementById('postNamesListA').innerHTML = mapNames(namesA);
    document.getElementById('postNamesListZ').innerHTML = mapNames(namesZ);
    document.getElementById('postNamesListV').innerHTML = mapNames(namesV);

    globalTables = [];
    for (let i = 0; i < numMesas; i++) {
        globalTables.push({
            id: i + 1,
            base: {
                'R': { id: `${ROLE_NAMES['R']} - ${namesR[i]}`, color: 'R', isExtra: false },
                'A': { id: `${ROLE_NAMES['A']} - ${namesA[i]}`, color: 'A', isExtra: false },
                'Z': { id: `${ROLE_NAMES['Z']} - ${namesZ[i]}`, color: 'Z', isExtra: false },
                'V': { id: `${ROLE_NAMES['V']} - ${namesV[i]}`, color: 'V', isExtra: false }
            },
            extras: [] 
        });
    }

    if (sobrantes >= 1) globalTables[0 % numMesas].extras.push({ id: `${ROLE_NAMES['R']} Extra - ${namesR[numMesas]}`, color: 'R', isExtra: true });
    if (sobrantes >= 2) globalTables[1 % numMesas].extras.push({ id: `${ROLE_NAMES['A']} Extra - ${namesA[numMesas]}`, color: 'A', isExtra: true });
    if (sobrantes === 3) globalTables[2 % numMesas].extras.push({ id: `${ROLE_NAMES['Z']} Extra - ${namesZ[numMesas]}`, color: 'Z', isExtra: true });

    renderInteraccion2();
}

function createBadgeHTML(student) {
    const cls = `badge color-${student.color} ${student.isExtra ? 'extra' : ''}`;
    return `<div class="${cls}"><span>${COLOR_ICONS[student.color]}</span> <span>${student.id}</span></div>`;
}

function renderInteraccion2() {
    const container = document.getElementById('mesasInteraccion2');
    container.innerHTML = '';
    globalTables.forEach(table => {
        let grupos = [];
        let ex = [...table.extras];
        let hasR = ex.find(e => e.color === 'R'), hasA = ex.find(e => e.color === 'A'), hasZ = ex.find(e => e.color === 'Z');
        let b = table.base;

        if (hasR && hasZ && !hasA) { grupos.push([b['R'], b['Z']]); grupos.push([b['A'], hasR]); grupos.push([b['V'], hasZ]); } 
        else if (hasR && hasA && !hasZ) { grupos.push([b['R'], hasA]); grupos.push([b['A'], hasR]); grupos.push([b['Z'], b['V']]); } 
        else if (hasR && hasA && hasZ) { grupos.push([b['R'], hasA, b['V']]); grupos.push([b['A'], hasZ]); grupos.push([b['Z'], hasR]); } 
        else if (hasR && !hasA && !hasZ) { grupos.push([b['R'], b['Z']]); grupos.push([b['A'], b['V'], hasR]); } 
        else if (hasA && !hasR && !hasZ) { grupos.push([b['R'], b['Z'], hasA]); grupos.push([b['A'], b['V']]); } 
        else if (hasZ && !hasR && !hasA) { grupos.push([b['R'], b['Z']]); grupos.push([b['A'], b['V'], hasZ]); } 
        else { grupos.push([b['R'], b['Z']]); grupos.push([b['A'], b['V']]); }

        container.appendChild(crearTarjetaMesa(table.id, grupos, table.extras));
    });
}

function renderInteraccion3() {
    const container = document.getElementById('mesasInteraccion3');
    container.innerHTML = '';
    globalTables.forEach((table, index) => {
        let grupos = [];
        const iAnt = (index - 1 + numMesas) % numMesas;
        const exIn = globalTables[iAnt].extras;
        let hasR = exIn.find(e => e.color === 'R'), hasA = exIn.find(e => e.color === 'A'), hasZ = exIn.find(e => e.color === 'Z');
        let b = table.base;

        if (hasR && hasZ && !hasA) { grupos.push([b['R'], b['A'], hasZ]); grupos.push([b['Z'], b['V'], hasR]); } 
        else if (hasR && hasA && !hasZ) { grupos.push([b['R'], b['A']]); grupos.push([b['Z'], hasR]); grupos.push([b['V'], hasA]); } 
        else if (hasR && hasA && hasZ) { grupos.push([b['R'], hasZ]); grupos.push([b['A'], hasR, b['V']]); grupos.push([b['Z'], hasA]); } 
        else if (hasR && !hasA && !hasZ) { grupos.push([b['R'], b['A']]); grupos.push([b['Z'], b['V'], hasR]); } 
        else if (hasA && !hasR && !hasZ) { grupos.push([b['R'], b['A']]); grupos.push([b['Z'], b['V'], hasA]); } 
        else if (hasZ && !hasR && !hasA) { grupos.push([b['R'], b['A'], hasZ]); grupos.push([b['Z'], b['V']]); } 
        else { grupos.push([b['R'], b['A']]); grupos.push([b['Z'], b['V']]); }

        let subtextos = [];
        exIn.forEach(ex => {
            let corto = ex.id.split(' - ')[1]; 
            if (ex.color === 'R') subtextos.push(`Rol Rojo (${corto})`);
            else if (ex.color === 'A') subtextos.push(`Rol Amarillo (${corto})`);
            else if (ex.color === 'Z') subtextos.push(`Rol Azul (${corto})`);
        });

        let subF = subtextos.length > 0 ? `(Recibe a ${subtextos.join(', ')} de Mesa ${globalTables[iAnt].id})` : "";
        container.appendChild(crearTarjetaMesa(table.id, grupos, [], subF));
    });
}

function crearTarjetaMesa(mesaId, grupos, extrasRonda1 = [], subtitulo = "") {
    const div = document.createElement('div');
    div.className = 'table-card';
    if (extrasRonda1 && extrasRonda1.length > 0) div.style.borderTopColor = `var(--${COLOR_NAMES[extrasRonda1[0].color].toLowerCase()}-border)`;
    let tituloHtml = `<h3>Mesa ${mesaId} ${subtitulo ? `<div style="font-size:0.8rem; color:var(--text-muted); font-weight:normal; margin-top:0.2rem;">${subtitulo}</div>` : ''}</h3>`;
    let gruposHtml = grupos.map((grupo, i) => `<div class="group-box"><div class="group-title">Grupo ${['A', 'B', 'C', 'D'][i]} (${grupo.length} integr.)</div><div class="badge-container">${grupo.map(createBadgeHTML).join('')}</div></div>`).join('');
    div.innerHTML = tituloHtml + gruposHtml;
    return div;
}