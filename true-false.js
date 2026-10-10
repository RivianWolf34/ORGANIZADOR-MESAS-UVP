// --- LÓGICA DE MODO NOCTURNO ---
const themeToggle = document.getElementById('themeToggle');
const body = document.body;

if (localStorage.getItem('theme') === 'dark') { body.setAttribute('data-theme', 'dark'); themeToggle.textContent = '☀️'; }
themeToggle.addEventListener('click', () => {
    if (body.getAttribute('data-theme') === 'dark') {
        body.removeAttribute('data-theme'); localStorage.setItem('theme', 'light'); themeToggle.textContent = '🌙';
    } else {
        body.setAttribute('data-theme', 'dark'); localStorage.setItem('theme', 'dark'); themeToggle.textContent = '☀️';
    }
});

// --- SISTEMA DE LOGIN Y SESIÓN ---
let usuarioActual = null;
let grupoActual = null;
let nivelAplicado = null;

async function generarHash(texto) {
    const encoder = new TextEncoder();
    const data = encoder.encode(texto);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

document.getElementById('btnLogin').addEventListener('click', async () => {
    const userRaw = document.getElementById('loginUser').value.trim(); 
    const pass = document.getElementById('loginPass').value.trim();
    const errorEl = document.getElementById('loginError');

    const userKey = Object.keys(BASE_DE_DATOS).find(k => k.toLowerCase() === userRaw.toLowerCase());

    if (!userKey) { errorEl.textContent = 'Usuario no encontrado'; return; }

    const hashGenerado = await generarHash(pass);

    if (hashGenerado === BASE_DE_DATOS[userKey].hash) {
        usuarioActual = userKey;
        document.getElementById('loginOverlay').style.display = 'none';
        document.getElementById('mainContainer').style.display = 'block';
        document.getElementById('nombreProfeUI').textContent = userKey.toUpperCase();
        document.getElementById('btnLogout').style.display = 'flex';
        cargarGruposProfesor();
    } else {
        errorEl.textContent = 'Contraseña incorrecta';
        document.getElementById('loginPass').value = '';
    }
});

document.getElementById('btnLogout').addEventListener('click', () => {
    if (confirm("¿Estás seguro de que deseas cerrar sesión y volver al menú principal?")) {
        sessionStorage.clear();
        window.location.href = 'index.html';
    }
});
document.getElementById('loginPass').addEventListener('keypress', (e) => { if (e.key === 'Enter') document.getElementById('btnLogin').click(); });
document.getElementById('loginUser').addEventListener('keypress', (e) => { if (e.key === 'Enter') document.getElementById('loginPass').focus(); });

// --- LÓGICA DE ASISTENCIA Y NIVEL ---
const selectGrupo = document.getElementById('grupoSelect');
const panelAsistencia = document.getElementById('panelAsistencia');
const selectAlumno = document.getElementById('alumnoSelect');
const tfContainer = document.getElementById('tfContainer');

let alumnosDelGrupo = [];   
let alumnosPresentes = [];  

function cargarGruposProfesor() {
    selectGrupo.innerHTML = '<option value="">Elige un grupo...</option>';
    Object.keys(BASE_DE_DATOS[usuarioActual].grupos).forEach(nombreGrupo => {
        const opt = document.createElement('option'); opt.value = nombreGrupo; opt.textContent = nombreGrupo; selectGrupo.appendChild(opt);
    });
}

function detectarNivel(nombre) {
    const match = nombre.match(/(A1|A2|B1|B2|C1|C2)/i);
    return match ? match[0].toUpperCase() : null;
}

selectGrupo.addEventListener('change', (e) => {
    grupoActual = e.target.value;
    if (grupoActual) {
        alumnosDelGrupo = [...BASE_DE_DATOS[usuarioActual].grupos[grupoActual]];
        alumnosPresentes = []; 
        
        nivelAplicado = detectarNivel(grupoActual);
        if (nivelAplicado) {
            document.getElementById('autoLevelDiv').style.display = 'block';
            document.getElementById('manualLevelDiv').style.display = 'none';
            document.getElementById('detectedLevelTxt').textContent = nivelAplicado;
        } else {
            document.getElementById('autoLevelDiv').style.display = 'none';
            document.getElementById('manualLevelDiv').style.display = 'flex';
        }

        panelAsistencia.style.display = 'flex';
        tfContainer.style.display = 'none';
        document.getElementById('leaderboardSection').style.display = 'none';
        actualizarSelectorAlumnos();
        renderizarFichas();
    } else {
        panelAsistencia.style.display = 'none';
        tfContainer.style.display = 'none';
    }
});

document.getElementById('btnAgregarTodos').addEventListener('click', () => {
    const faltantes = alumnosDelGrupo.filter(a => !alumnosPresentes.includes(a));
    alumnosPresentes = [...alumnosPresentes, ...faltantes];
    actualizarSelectorAlumnos(); renderizarFichas();
});

document.getElementById('btnAgregarAlumno').addEventListener('click', () => {
    const nombre = selectAlumno.value;
    if (nombre && !alumnosPresentes.includes(nombre)) {
        alumnosPresentes.push(nombre);
        actualizarSelectorAlumnos(); renderizarFichas();
    }
});

function quitarAlumno(nombre) {
    alumnosPresentes = alumnosPresentes.filter(a => a !== nombre);
    actualizarSelectorAlumnos(); renderizarFichas();
}

function actualizarSelectorAlumnos() {
    selectAlumno.innerHTML = '<option value="">Selecciona un alumno...</option>';
    alumnosDelGrupo.forEach(nombre => {
        if (!alumnosPresentes.includes(nombre)) {
            const opt = document.createElement('option'); opt.value = nombre; opt.textContent = nombre; selectAlumno.appendChild(opt);
        }
    });
    document.getElementById('contadorPresentes').textContent = alumnosPresentes.length;
    document.getElementById('btnComenzarJuego').disabled = alumnosPresentes.length < 2; 
}

function renderizarFichas() {
    const contenedor = document.getElementById('alumnosPresentesContenedor');
    contenedor.innerHTML = '';
    if (alumnosPresentes.length === 0) {
        contenedor.innerHTML = '<span style="color: var(--text-muted); font-size: 0.9rem;">Aún no hay alumnos añadidos.</span>'; return;
    }
    alumnosPresentes.forEach(nombre => {
        const chip = document.createElement('div'); chip.className = 'chip';
        const spanTexto = document.createElement('span'); spanTexto.textContent = nombre;
        const btnQuitar = document.createElement('button'); btnQuitar.className = 'chip-remove'; btnQuitar.textContent = '×';
        btnQuitar.addEventListener('click', () => quitarAlumno(nombre));
        chip.appendChild(spanTexto); chip.appendChild(btnQuitar); contenedor.appendChild(chip);
    });
}

window.volverAAsistencia = function() {
    tfContainer.style.display = 'none';
    document.getElementById('leaderboardSection').style.display = 'none';
    document.getElementById('controlsCardGrupo').style.display = 'flex';
    panelAsistencia.style.display = 'flex';
};

function barajarArray(array) {
    let arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

// --- MOTOR DEL JUEGO: CENTRAL PANEL Y COLUMNAS ---
let listaDeRetos = [];
let indiceReto = 0;

let alumnosActivos = [];
let alumnosEliminados = [];
let turnoActual = []; 
let alumnoEnPantalla = null;

document.getElementById('btnComenzarJuego').addEventListener('click', () => {
    
    if (!nivelAplicado) nivelAplicado = document.getElementById('manualLevelSelect').value;

    const db = DB_TF[nivelAplicado];
    if(!db || db.preguntas.length === 0) {
        alert(`⚠️ No hay preguntas cargadas en la Base de Datos para el Nivel ${nivelAplicado}. Por favor, agrégalas en db_tf.js`);
        return;
    }

    let pares = [];
    for(let i=0; i < db.preguntas.length; i++) {
        if(db.preguntas[i]) {
            // Convierte 'V' a 'T' si llegaras a teclear V por accidente
            let ans = (db.respuestas[i] || 'F').toUpperCase();
            if(ans === 'V') ans = 'T';
            if(ans !== 'T' && ans !== 'F') ans = 'F'; 
            
            pares.push({ q: db.preguntas[i], a: ans });
        }
    }
    listaDeRetos = barajarArray(pares);
    indiceReto = 0;

    alumnosActivos = [...alumnosPresentes];
    alumnosEliminados = [];
    turnoActual = barajarArray([...alumnosActivos]);

    panelAsistencia.style.display = 'none';
    document.getElementById('controlsCardGrupo').style.display = 'none'; 
    tfContainer.style.display = 'flex';

    siguienteTurno();
});

function actualizarColumnas() {
    document.getElementById('countActivos').innerText = alumnosActivos.length;
    document.getElementById('countEliminados').innerText = alumnosEliminados.length;

    let activosOrdenados = [...alumnosActivos].sort();
    let eliminadosOrdenados = [...alumnosEliminados].sort();

    document.getElementById('listaActivos').innerHTML = activosOrdenados.map(a => `<div class="chip-list chip-active">${a}</div>`).join('');
    document.getElementById('listaEliminados').innerHTML = eliminadosOrdenados.map(a => `<div class="chip-list chip-eliminated">${a}</div>`).join('');
}

function siguienteTurno() {
    actualizarColumnas();

    if (alumnosActivos.length <= 1) {
        finalizarJuego();
        return;
    }

    if (turnoActual.length === 0) {
        turnoActual = barajarArray([...alumnosActivos]);
    }
    alumnoEnPantalla = turnoActual.shift();

    if (indiceReto >= listaDeRetos.length) {
        if(listaDeRetos.length > 1) {
            listaDeRetos = barajarArray(listaDeRetos);
        }
        indiceReto = 0;
    }

    document.getElementById('challengeText').innerText = listaDeRetos[indiceReto].q;
    document.getElementById('currentPlayer').innerText = alumnoEnPantalla;
}

// EVALUACIÓN AUTOMÁTICA
window.responder = function(letraElegida) {
    let letraCorrecta = listaDeRetos[indiceReto].a;
    const panel = document.getElementById('challengePanel');
    
    if (letraElegida === letraCorrecta) {
        playSafeSound();
        panel.style.borderColor = '#4CAF50';
        setTimeout(() => { panel.style.borderColor = 'var(--primary)'; }, 500);
    } else {
        playErrorSound();
        panel.style.borderColor = '#F44336';
        setTimeout(() => { panel.style.borderColor = 'var(--primary)'; }, 500);
        
        alumnosActivos = alumnosActivos.filter(a => a !== alumnoEnPantalla);
        turnoActual = turnoActual.filter(a => a !== alumnoEnPantalla);
        alumnosEliminados.push(alumnoEnPantalla);
    }
    
    indiceReto++;
    siguienteTurno();
};

window.finalizarJuego = function() {
    actualizarColumnas();
    tfContainer.style.display = 'none';
    const leaderSection = document.getElementById('leaderboardSection');
    leaderSection.style.display = 'block';

    const crownDiv = document.getElementById('winnerCrown');
    const tituloRes = document.getElementById('tituloResultados');
    const colActivosFinal = document.getElementById('colActivosFinal');
    
    if (alumnosActivos.length === 1) {
        crownDiv.style.display = 'flex';
        document.getElementById('soleWinnerName').innerText = alumnosActivos[0];
        tituloRes.style.display = 'none';
        colActivosFinal.style.display = 'none'; 
    } 
    else {
        crownDiv.style.display = 'none';
        tituloRes.style.display = 'block';
        colActivosFinal.style.display = 'block';
        
        if (alumnosActivos.length > 0) {
            document.getElementById('listaFinalActivos').innerHTML = alumnosActivos.sort().map(a => `<li>✅ ${a}</li>`).join('');
        } else {
            document.getElementById('listaFinalActivos').innerHTML = '<li style="color:var(--text-muted);">Nadie sobrevivió.</li>';
        }
    }

    if (alumnosEliminados.length > 0) {
        document.getElementById('listaFinalEliminados').innerHTML = alumnosEliminados.sort().map(a => `<li>❌ <span style="text-decoration:line-through; color:var(--text-muted);">${a}</span></li>`).join('');
    } else {
        document.getElementById('listaFinalEliminados').innerHTML = '<li style="color:var(--text-muted);">Ninguno. ¡Juego perfecto!</li>';
    }
};

// --- SISTEMA DE SONIDOS (Web Audio API) ---
const AudioContext = window.AudioContext || window.webkitAudioContext;
const audioCtx = new AudioContext();

function playSafeSound() {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    
    osc.type = 'sine'; 
    osc.frequency.setValueAtTime(800, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1200, audioCtx.currentTime + 0.1);
    
    gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime); 
    gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.3);
    
    osc.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    
    osc.start(audioCtx.currentTime);
    osc.stop(audioCtx.currentTime + 0.3);
}

function playErrorSound() {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    
    osc.type = 'sawtooth'; 
    osc.frequency.setValueAtTime(300, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(40, audioCtx.currentTime + 0.5);
    
    gainNode.gain.setValueAtTime(0.2, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.5);
    
    osc.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    
    osc.start(audioCtx.currentTime);
    osc.stop(audioCtx.currentTime + 0.5);
}