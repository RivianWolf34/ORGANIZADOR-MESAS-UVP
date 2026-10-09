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

// --- LÓGICA DE ASISTENCIA ---
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

selectGrupo.addEventListener('change', (e) => {
    grupoActual = e.target.value;
    if (grupoActual) {
        alumnosDelGrupo = [...BASE_DE_DATOS[usuarioActual].grupos[grupoActual]];
        alumnosPresentes = []; 
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

// --- MOTOR DE LA BOMBA ---
let isTicking = false;
let explosionTimer = null;
let panicTimer = null;
let tickInterval = null; 
let currentVictim = "";

// Variables para Preguntas
let listaDeRetos = [];
let indiceReto = 0;

const btnStartRound = document.getElementById('btnStartRound');
const btnPassBomb = document.getElementById('btnPassBomb');
const bombVisual = document.getElementById('bombVisual');
const victimName = document.getElementById('victimName');
const gameStatus = document.getElementById('gameStatus');
const bombArena = document.getElementById('bombArena');
const challengeText = document.getElementById('challengeText');

document.getElementById('btnComenzarJuego').addEventListener('click', () => {
    
    // Leer y barajar preguntas
    const rawText = document.getElementById('listaRetosRaw').value;
    let retos = rawText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    
    if(retos.length === 0) retos = ["¡Escucha al profesor!"];
    
    listaDeRetos = barajarArray(retos);
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
    bombArena.classList.remove('arena-danger');
    btnStartRound.style.display = 'inline-block';
    btnPassBomb.disabled = true;
    isTicking = false;
}

window.iniciarRonda = function() {
    if (audioCtx.state === 'suspended') audioCtx.resume(); 

    isTicking = true;
    btnStartRound.style.display = 'none';
    btnPassBomb.disabled = false;
    
    // Status visual
    gameStatus.innerText = "¡MECHA ENCENDIDA!";
    gameStatus.className = "status-badge";
    bombArena.classList.remove('arena-danger');
    bombVisual.className = 'bomb-icon ticking-slow';
    bombVisual.innerText = "💣";
    victimName.style.color = "var(--text-main)";
    
    pasarBomba(); // Escoge al primer alumno y pone la primera pregunta

    clearInterval(tickInterval);
    playTickSound(false); 
    tickInterval = setInterval(() => playTickSound(false), 1000);

    // Calcula tiempo de explosión (15 a 35 seg)
    const tiempoHastaExplosion = Math.floor(Math.random() * (35000 - 15000 + 1)) + 15000;
    
    clearTimeout(explosionTimer);
    explosionTimer = setTimeout(explotar, tiempoHastaExplosion);

    clearTimeout(panicTimer);
    panicTimer = setTimeout(activarPanico, tiempoHastaExplosion - 5000);
};

window.pasarBomba = function() {
    if (!isTicking) return;
    
    // Filtrar alumno
    let posiblesVictimas = alumnosPresentes.filter(alumno => alumno !== currentVictim);
    if (posiblesVictimas.length === 0) posiblesVictimas = alumnosPresentes; 
    currentVictim = posiblesVictimas[Math.floor(Math.random() * posiblesVictimas.length)];
    victimName.innerText = currentVictim;

    // Actualizar pregunta
    if (indiceReto >= listaDeRetos.length) {
        // Mezclar si se acabaron (y no es el texto por defecto)
        if (listaDeRetos.length > 1 && listaDeRetos[0] !== "¡Escucha al profesor!") {
            listaDeRetos = barajarArray(listaDeRetos);
        }
        indiceReto = 0;
    }
    challengeText.innerText = listaDeRetos[indiceReto];
    indiceReto++;
};

function activarPanico() {
    if (!isTicking) return;
    bombVisual.className = 'bomb-icon ticking-fast';
    bombArena.classList.add('arena-danger');

    clearInterval(tickInterval);
    tickInterval = setInterval(() => playTickSound(true), 300);
}

function explotar() {
    isTicking = false;
    btnPassBomb.disabled = true;
    btnStartRound.style.display = 'inline-block';
    btnStartRound.innerText = "Jugar Otra Ronda";
    
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

// Oprimir barra espaciadora
document.addEventListener('keydown', (e) => {
    if (e.code === 'Space' && isTicking) {
        e.preventDefault();
        pasarBomba();
    }
});

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
    
    for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
    }
    
    const noise = audioCtx.createBufferSource();
    noise.buffer = buffer;
    
    const filter = audioCtx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(600, audioCtx.currentTime); 
    filter.frequency.exponentialRampToValueAtTime(10, audioCtx.currentTime + duration);
    
    const gainNode = audioCtx.createGain();
    gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime); 
    gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
    
    noise.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    
    noise.start();
}