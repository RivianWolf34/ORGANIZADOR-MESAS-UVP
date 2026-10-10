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
        sessionStorage.clear(); window.location.href = 'index.html';
    }
});
document.getElementById('loginPass').addEventListener('keypress', (e) => { if (e.key === 'Enter') document.getElementById('btnLogin').click(); });
document.getElementById('loginUser').addEventListener('keypress', (e) => { if (e.key === 'Enter') document.getElementById('loginPass').focus(); });

// --- LÓGICA DE ASISTENCIA Y NIVEL ---
const selectGrupo = document.getElementById('grupoSelect');
const panelAsistencia = document.getElementById('panelAsistencia');
const selectAlumno = document.getElementById('alumnoSelect');
const bombContainer = document.getElementById('bombContainer');

let alumnosDelGrupo = [];   
let alumnosPresentes = [];  

function cargarGruposProfesor() {
    selectGrupo.innerHTML = '<option value="">Elige un grupo...</option>';
    Object.keys(BASE_DE_DATOS[usuarioActual].grupos).forEach(nombreGrupo => {
        const opt = document.createElement('option'); opt.value = nombreGrupo; opt.textContent = nombreGrupo; selectGrupo.appendChild(opt);
    });
}

// Extractor Regex de Nivel
function detectarNivel(nombre) {
    const match = nombre.match(/(A1|A2|B1|B2|C1|C2)/i);
    return match ? match[0].toUpperCase() : null;
}

selectGrupo.addEventListener('change', (e) => {
    grupoActual = e.target.value;
    if (grupoActual) {
        // Carga alumnos
        alumnosDelGrupo = [...BASE_DE_DATOS[usuarioActual].grupos[grupoActual]];
        alumnosPresentes = []; 
        
        // Carga Nivel
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
        bombContainer.style.display = 'none';
        actualizarSelectorAlumnos();
        renderizarFichas();
    } else {
        panelAsistencia.style.display = 'none';
        bombContainer.style.display = 'none';
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

function barajarArray(array) {
    let arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

window.volverAAsistencia = function() {
    pararBomba();
    bombContainer.style.display = 'none';
    document.getElementById('controlsCardGrupo').style.display = 'flex';
    panelAsistencia.style.display = 'flex';
};

// --- MOTOR DE LA BOMBA (MODO AUTO EVALUACIÓN) ---
let isTicking = false;
let explosionTimer = null;
let panicTimer = null;
let tickInterval = null; 
let currentVictim = "";

let listaDeRetos = [];
let indiceReto = 0;

const btnStartRound = document.getElementById('btnStartRound');
const bombVisual = document.getElementById('bombVisual');
const victimName = document.getElementById('victimName');
const gameStatus = document.getElementById('gameStatus');
const bombArena = document.getElementById('bombArena');
const challengeText = document.getElementById('challengeText');
const optionsContainer = document.getElementById('optionsContainer');
const btnOp1 = document.getElementById('btnOp1');
const btnOp2 = document.getElementById('btnOp2');

document.getElementById('btnComenzarJuego').addEventListener('click', () => {
    
    // Si no se detectó automático, forzar el del selector manual
    if (!nivelAplicado) nivelAplicado = document.getElementById('manualLevelSelect').value;

    // Cargar la base de datos
    const db = DB_BOMBA[nivelAplicado];
    if(!db || db.preguntas.length === 0) {
        alert(`⚠️ No hay preguntas cargadas en la Base de Datos para el Nivel ${nivelAplicado}. Por favor, agrégalas en db_bomba.js`);
        return;
    }

    // Emparejar y Barajar
    let pares = [];
    for(let i=0; i < db.preguntas.length; i++) {
        if(db.preguntas[i]) {
            pares.push({ q: db.preguntas[i], c: db.correctas[i], i: db.incorrectas[i] });
        }
    }
    listaDeRetos = barajarArray(pares);
    indiceReto = 0;

    panelAsistencia.style.display = 'none';
    document.getElementById('controlsCardGrupo').style.display = 'none'; 
    bombContainer.style.display = 'flex';
    resetUI();
});

function resetUI() {
    clearInterval(tickInterval); 
    bombVisual.className = 'bomb-icon';
    bombVisual.innerText = "💣";
    victimName.innerText = "¿QUIÉN EMPIEZA?";
    victimName.style.color = "var(--text-main)";
    gameStatus.innerText = "BOMBA DESACTIVADA";
    gameStatus.className = "status-badge";
    challengeText.innerText = "¿Pregunta?";
    optionsContainer.style.display = 'none';
    bombArena.classList.remove('arena-danger');
    btnStartRound.style.display = 'inline-block';
    isTicking = false;
}

window.iniciarRonda = function() {
    if (audioCtx.state === 'suspended') audioCtx.resume(); 

    isTicking = true;
    btnStartRound.style.display = 'none';
    optionsContainer.style.display = 'flex';
    
    gameStatus.innerText = "¡MECHA ENCENDIDA!";
    gameStatus.className = "status-badge";
    bombArena.classList.remove('arena-danger');
    bombVisual.className = 'bomb-icon ticking-slow';
    bombVisual.innerText = "💣";
    victimName.style.color = "var(--text-main)";
    
    // Pasa la bomba al primero
    pasarTurnoOpcional(false);

    clearInterval(tickInterval);
    playTickSound(false); 
    tickInterval = setInterval(() => playTickSound(false), 1000);

    const tiempoHastaExplosion = Math.floor(Math.random() * (35000 - 15000 + 1)) + 15000;
    
    clearTimeout(explosionTimer);
    explosionTimer = setTimeout(explotar, tiempoHastaExplosion);

    clearTimeout(panicTimer);
    panicTimer = setTimeout(activarPanico, tiempoHastaExplosion - 5000);
};

// Función maestra de fluidez: esError = true (Castigo), false (Avanza al sig. alumno)
function pasarTurnoOpcional(esError) {
    if (!isTicking) return;
    
    if (!esError) {
        let posiblesVictimas = alumnosPresentes.filter(a => a !== currentVictim);
        if (posiblesVictimas.length === 0) posiblesVictimas = alumnosPresentes; 
        currentVictim = posiblesVictimas[Math.floor(Math.random() * posiblesVictimas.length)];
        victimName.innerText = currentVictim;
    }

    // Actualiza pregunta
    if (indiceReto >= listaDeRetos.length) {
        listaDeRetos = barajarArray(listaDeRetos);
        indiceReto = 0;
    }
    
    let reto = listaDeRetos[indiceReto];
    challengeText.innerText = reto.q;

    // Baraja las dos opciones (Correcta / Incorrecta)
    let ops = barajarArray([reto.c, reto.i]);
    
    btnOp1.innerText = ops[0];
    btnOp1.dataset.correct = (ops[0] === reto.c) ? 'true' : 'false';
    
    btnOp2.innerText = ops[1];
    btnOp2.dataset.correct = (ops[1] === reto.c) ? 'true' : 'false';

    indiceReto++;
}

// Interacción del profesor
window.evaluar = function(btn) {
    if(!isTicking) return;

    if (btn.dataset.correct === 'true') {
        // ACIERTO
        bombArena.classList.remove('flash-green', 'flash-red');
        void bombArena.offsetWidth; // Trigger reflow
        bombArena.classList.add('flash-green');
        
        playSafeSound();
        pasarTurnoOpcional(false); // Pasa la bomba a alguien más
    } else {
        // ERROR (Castigo)
        bombArena.classList.remove('flash-green', 'flash-red');
        void bombArena.offsetWidth; 
        bombArena.classList.add('flash-red');
        
        playErrorSound();
        pasarTurnoOpcional(true); // Se queda el mismo alumno, pero cambia la pregunta
    }
}

function activarPanico() {
    if (!isTicking) return;
    bombVisual.className = 'bomb-icon ticking-fast';
    bombArena.classList.add('arena-danger');

    clearInterval(tickInterval);
    tickInterval = setInterval(() => playTickSound(true), 300);
}

function explotar() {
    isTicking = false;
    btnStartRound.style.display = 'inline-block';
    btnStartRound.innerText = "Jugar Otra Ronda";
    optionsContainer.style.display = 'none';
    challengeText.innerText = "¡SE ACABÓ EL TIEMPO!";
    
    clearInterval(tickInterval);
    clearTimeout(explosionTimer);
    clearTimeout(panicTimer);

    bombVisual.className = 'bomb-icon exploded';
    bombVisual.innerText = "💥";
    
    gameStatus.innerText = "¡BOOM!";
    gameStatus.className = "status-badge status-boom";
    
    victimName.style.color = "var(--rojo-text)";
    
    playExplosionSound();
}

function pararBomba() {
    clearTimeout(explosionTimer);
    clearTimeout(panicTimer);
    resetUI();
}

// --- SISTEMA DE SONIDOS SINTETIZADOS (Web Audio API) ---
const AudioContext = window.AudioContext || window.webkitAudioContext;
const audioCtx = new AudioContext();

function playTickSound(isPanic) {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(isPanic ? 1200 : 800, audioCtx.currentTime);
    gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.15, audioCtx.currentTime + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.1);
    osc.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    osc.start(audioCtx.currentTime);
    osc.stop(audioCtx.currentTime + 0.1);
}

function playExplosionSound() {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const duration = 1.5; 
    const bufferSize = audioCtx.sampleRate * duration;
    const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
    
    const noise = audioCtx.createBufferSource();
    noise.buffer = buffer;
    const filter = audioCtx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(600, audioCtx.currentTime); 
    filter.frequency.exponentialRampToValueAtTime(10, audioCtx.currentTime + duration);
    
    const gainNode = audioCtx.createGain();
    gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime); 
    gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
    
    noise.connect(filter); filter.connect(gainNode); gainNode.connect(audioCtx.destination);
    noise.start();
}

function playSafeSound() {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    osc.type = 'sine'; 
    osc.frequency.setValueAtTime(800, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1200, audioCtx.currentTime + 0.1);
    gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime); 
    gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.2);
    osc.connect(gainNode); gainNode.connect(audioCtx.destination);
    osc.start(audioCtx.currentTime); osc.stop(audioCtx.currentTime + 0.2);
}

function playErrorSound() {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    osc.type = 'sawtooth'; 
    osc.frequency.setValueAtTime(300, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(40, audioCtx.currentTime + 0.3);
    gainNode.gain.setValueAtTime(0.2, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.3);
    osc.connect(gainNode); gainNode.connect(audioCtx.destination);
    osc.start(audioCtx.currentTime); osc.stop(audioCtx.currentTime + 0.3);
}