// --- LÓGICA DE MODO NOCTURNO ---
const themeToggle = document.getElementById('themeToggle');
const body = document.body;

if (localStorage.getItem('theme') === 'dark') {
    body.setAttribute('data-theme', 'dark');
    themeToggle.textContent = '☀️';
}
themeToggle.addEventListener('click', () => {
    if (body.getAttribute('data-theme') === 'dark') {
        body.removeAttribute('data-theme');
        localStorage.setItem('theme', 'light');
        themeToggle.textContent = '🌙';
    } else {
        body.setAttribute('data-theme', 'dark');
        localStorage.setItem('theme', 'dark');
        themeToggle.textContent = '☀️';
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

    if (!userKey) {
        errorEl.textContent = 'Usuario no encontrado';
        return;
    }

    const hashGenerado = await generarHash(pass);

    if (hashGenerado === BASE_DE_DATOS[userKey].hash) {
        iniciarSesionExitosa(userKey);
    } else {
        errorEl.textContent = 'Contraseña incorrecta';
        document.getElementById('loginPass').value = '';
    }
});

function iniciarSesionExitosa(userKey) {
    usuarioActual = userKey;
    document.getElementById('loginOverlay').style.display = 'none';
    document.getElementById('mainContainer').style.display = 'block';
    document.getElementById('nombreProfeUI').textContent = userKey.toUpperCase();
    document.getElementById('btnLogout').style.display = 'flex';
    cargarGruposProfesor();
}

document.getElementById('btnLogout').addEventListener('click', () => {
    if (confirm("¿Estás seguro de que deseas cerrar sesión y volver al menú principal?")) {
        sessionStorage.clear();
        window.location.href = 'index.html';
    }
});
document.getElementById('loginPass').addEventListener('keypress', (e) => { if (e.key === 'Enter') document.getElementById('btnLogin').click(); });
document.getElementById('loginUser').addEventListener('keypress', (e) => { if (e.key === 'Enter') document.getElementById('loginPass').focus(); });

// --- LÓGICA DE GRUPOS Y ASISTENCIA ---
const selectGrupo = document.getElementById('grupoSelect');
const panelAsistencia = document.getElementById('panelAsistencia');
const selectAlumno = document.getElementById('alumnoSelect');
const buzzerContainer = document.getElementById('buzzerContainer');

let alumnosDelGrupo = [];   
let alumnosPresentes = [];  

function cargarGruposProfesor() {
    selectGrupo.innerHTML = '<option value="">Elige un grupo...</option>';
    const gruposDelProfe = Object.keys(BASE_DE_DATOS[usuarioActual].grupos);
    
    gruposDelProfe.forEach(nombreGrupo => {
        const opt = document.createElement('option');
        opt.value = nombreGrupo;
        opt.textContent = nombreGrupo;
        selectGrupo.appendChild(opt);
    });
}

selectGrupo.addEventListener('change', (e) => {
    grupoActual = e.target.value;
    if (grupoActual) {
        alumnosDelGrupo = [...BASE_DE_DATOS[usuarioActual].grupos[grupoActual]];
        alumnosPresentes = []; 
        panelAsistencia.style.display = 'flex';
        buzzerContainer.style.display = 'none';
        document.getElementById('leaderboardSection').style.display = 'none';
        actualizarSelectorAlumnos();
        renderizarFichas();
    } else {
        panelAsistencia.style.display = 'none';
        buzzerContainer.style.display = 'none';
    }
});

document.getElementById('btnAgregarTodos').addEventListener('click', () => {
    const faltantes = alumnosDelGrupo.filter(a => !alumnosPresentes.includes(a));
    alumnosPresentes = [...alumnosPresentes, ...faltantes];
    actualizarSelectorAlumnos();
    renderizarFichas();
});

document.getElementById('btnAgregarAlumno').addEventListener('click', () => {
    const nombre = selectAlumno.value;
    if (nombre && !alumnosPresentes.includes(nombre)) {
        alumnosPresentes.push(nombre);
        actualizarSelectorAlumnos();
        renderizarFichas();
    }
});

function quitarAlumno(nombre) {
    alumnosPresentes = alumnosPresentes.filter(a => a !== nombre);
    actualizarSelectorAlumnos();
    renderizarFichas();
}

function actualizarSelectorAlumnos() {
    selectAlumno.innerHTML = '<option value="">Selecciona un alumno...</option>';
    alumnosDelGrupo.forEach(nombre => {
        if (!alumnosPresentes.includes(nombre)) {
            const opt = document.createElement('option');
            opt.value = nombre;
            opt.textContent = nombre;
            selectAlumno.appendChild(opt);
        }
    });
    document.getElementById('contadorPresentes').textContent = alumnosPresentes.length;
    document.getElementById('btnComenzarJuego').disabled = alumnosPresentes.length < 2; 
}

function renderizarFichas() {
    const contenedor = document.getElementById('alumnosPresentesContenedor');
    contenedor.innerHTML = '';
    
    if (alumnosPresentes.length === 0) {
        contenedor.innerHTML = '<span style="color: var(--text-muted); font-size: 0.9rem;">Aún no hay alumnos añadidos. Pulsa "Añadir Todos" si vinieron la mayoría.</span>';
        return;
    }
    
    alumnosPresentes.forEach(nombre => {
        const chip = document.createElement('div');
        chip.className = 'chip';
        const spanTexto = document.createElement('span');
        spanTexto.textContent = nombre;
        
        const btnQuitar = document.createElement('button');
        btnQuitar.className = 'chip-remove';
        btnQuitar.textContent = '×';
        btnQuitar.addEventListener('click', () => quitarAlumno(nombre));
        
        chip.appendChild(spanTexto);
        chip.appendChild(btnQuitar);
        contenedor.appendChild(chip);
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

// --- MOTOR DEL JUEGO ---
let alumnosDisponibles = []; 
let puntuacionGeneral = {};  
let p1Actual = null;
let p2Actual = null;

// Estados de la Ronda
let isLocked = false; 
let juegoTerminado = false;
let roundOver = false;
let intentos = { 1: false, 2: false }; 
let autoAdvanceTimeout = null;

// Mazo de Preguntas
let listaDeRetos = [];
let indiceRetoActual = 0;

const zone1 = document.getElementById('zone1');
const zone2 = document.getElementById('zone2');
const status1El = document.getElementById('status1');
const status2El = document.getElementById('status2');
const score1El = document.getElementById('score1');
const score2El = document.getElementById('score2');
const judge1 = document.getElementById('judge1');
const judge2 = document.getElementById('judge2');

document.getElementById('btnComenzarJuego').addEventListener('click', () => {
    const txtPreguntas = document.getElementById('listaRetosRaw').value;
    const txtRespuestas = document.getElementById('listaRespuestasRaw').value;
    
    let arrayPreguntas = txtPreguntas.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    let arrayRespuestas = txtRespuestas.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    
    if (arrayPreguntas.length === 0 && arrayRespuestas.length > 0) {
        alert("⚠️ ¡Cuidado! No puedes utilizar únicamente el bloque de respuestas. Por favor añade las preguntas o borra las respuestas para continuar.");
        return; 
    }

    let pares = [];
    if (arrayPreguntas.length === 0) {
        pares.push({ q: "¡Escucha al profesor!", a: null });
    } else {
        for (let i = 0; i < arrayPreguntas.length; i++) {
            pares.push({
                q: arrayPreguntas[i],
                a: arrayRespuestas[i] || null 
            });
        }
        pares = barajarArray(pares);
    }
    listaDeRetos = pares;
    indiceRetoActual = 0;

    panelAsistencia.style.display = 'none';
    document.getElementById('controlsCardGrupo').style.display = 'none'; 
    buzzerContainer.style.display = 'flex';
    
    alumnosDisponibles = [...alumnosPresentes];
    puntuacionGeneral = {};
    alumnosPresentes.forEach(alumno => { puntuacionGeneral[alumno] = 0; });
    
    document.getElementById('name1').innerText = "Presiona el botón";
    document.getElementById('name2').innerText = "Llamar Nueva Pareja";
    document.getElementById('name1').classList.add('empty-state');
    document.getElementById('name2').classList.add('empty-state');
    score1El.innerText = "-";
    score2El.innerText = "-";
    
    p1Actual = null; p2Actual = null;
    juegoTerminado = false;
    resetRound();
});

function actualizarPantallaReto() {
    document.getElementById('challengeText').innerHTML = listaDeRetos[indiceRetoActual].q;
}

document.getElementById('btnSiguientePareja').addEventListener('click', seleccionarNuevaPareja);
document.getElementById('btnSaltarReto').addEventListener('click', () => { avanzarAlSiguienteReto(); resetRound(); });
document.getElementById('btnTerminar').addEventListener('click', mostrarLeaderboard);

function avanzarAlSiguienteReto() {
    indiceRetoActual++;
    
    if (indiceRetoActual >= listaDeRetos.length) {
        indiceRetoActual = 0;
        if (listaDeRetos.length > 1 && listaDeRetos[0].q !== "¡Escucha al profesor!") {
            listaDeRetos = barajarArray(listaDeRetos);
        }
    }
    actualizarPantallaReto();
}

// EVENTOS DEL TECLADO
document.addEventListener('keydown', (e) => {
    if (!grupoActual || juegoTerminado || panelAsistencia.style.display === 'flex' || roundOver) return; 
    
    if (p1Actual && p2Actual && !isLocked) {
        const key = e.key.toLowerCase();
        if (key === 'a' && !intentos[1]) lockIn(1);
        if (key === 'l' && !intentos[2]) lockIn(2);
    }
});

function seleccionarNuevaPareja() {
    if (alumnosDisponibles.length < 2) {
        alert("¡Ya pasaron todos los alumnos presentes! Presiona 'Terminar' para ver la Tabla.");
        return;
    }

    const index1 = Math.floor(Math.random() * alumnosDisponibles.length);
    p1Actual = alumnosDisponibles.splice(index1, 1)[0];
    
    const index2 = Math.floor(Math.random() * alumnosDisponibles.length);
    p2Actual = alumnosDisponibles.splice(index2, 1)[0];

    document.getElementById('name1').innerText = p1Actual;
    document.getElementById('name1').classList.remove('empty-state');
    
    document.getElementById('name2').innerText = p2Actual;
    document.getElementById('name2').classList.remove('empty-state');

    score1El.innerText = puntuacionGeneral[p1Actual];
    score2El.innerText = puntuacionGeneral[p2Actual];

    resetRound();
}

function lockIn(playerNum) {
    isLocked = true;
    if (playerNum === 1) {
        zone1.classList.remove('loser');
        zone1.classList.add('winner'); 
        if (!intentos[2]) zone2.classList.add('loser'); 
        status1El.innerText = "¡RESPONDE!";
        judge1.style.display = 'flex'; 
    } else {
        zone2.classList.remove('loser');
        zone2.classList.add('winner'); 
        if (!intentos[1]) zone1.classList.add('loser'); 
        status2El.innerText = "¡RESPONDE!";
        judge2.style.display = 'flex'; 
    }
}

// FUNCIONES DEL JUEZ
window.juezCorrecto = function(playerNum) {
    if (playerNum === 1) {
        puntuacionGeneral[p1Actual]++;
        score1El.innerText = puntuacionGeneral[p1Actual];
    } else if (playerNum === 2) {
        puntuacionGeneral[p2Actual]++;
        score2El.innerText = puntuacionGeneral[p2Actual];
    }
    
    mostrarRespuestaYAvanzar("¡CORRECTO!");
};

window.juezIncorrecto = function(playerNum) {
    intentos[playerNum] = true;
    
    // Ocultamos los botones del que se acaba de equivocar
    judge1.style.display = 'none';
    judge2.style.display = 'none';

    // Castigo visual
    if (playerNum === 1) {
        zone1.classList.remove('winner');
        zone1.classList.add('loser');
        status1El.innerText = "❌";
    } else {
        zone2.classList.remove('winner');
        zone2.classList.add('loser');
        status2El.innerText = "❌";
    }

    if (intentos[1] && intentos[2]) {
        mostrarRespuestaYAvanzar("¡AMBOS FALLARON!");
    } else {
        // REBOTE AUTOMÁTICO: Le damos el turno directo al otro sin desbloquear el teclado
        if (!intentos[1]) {
            zone1.classList.remove('loser');
            zone1.classList.add('winner');
            status1El.innerText = "¡REBOTE! RESPONDE";
            judge1.style.display = 'flex';
        } else if (!intentos[2]) {
            zone2.classList.remove('loser');
            zone2.classList.add('winner');
            status2El.innerText = "¡REBOTE! RESPONDE";
            judge2.style.display = 'flex';
        }
    }
};

function mostrarRespuestaYAvanzar(mensajeEstado) {
    roundOver = true; 
    isLocked = true;
    judge1.style.display = 'none';
    judge2.style.display = 'none';

    let retoActual = listaDeRetos[indiceRetoActual];
    let html = `<div>${retoActual.q}</div>`;
    
    if (retoActual.a) {
        html += `<div style="color: #4CAF50; font-size: 2.2rem; margin-top: 15px;">✅ R: ${retoActual.a}</div>`;
    } else {
        let colorAviso = mensajeEstado === "¡CORRECTO!" ? "#4CAF50" : "#F44336";
        html += `<div style="color: ${colorAviso}; font-size: 1.5rem; margin-top: 15px;">${mensajeEstado}</div>`;
    }
    
    document.getElementById('challengeText').innerHTML = html;

    clearTimeout(autoAdvanceTimeout);
    autoAdvanceTimeout = setTimeout(() => {
        avanzarAlSiguienteReto();
        resetRound();
    }, 3500);
}

function resetRound() {
    clearTimeout(autoAdvanceTimeout); 
    isLocked = false;
    roundOver = false;
    intentos = { 1: false, 2: false }; 
    
    zone1.classList.remove('winner', 'loser');
    zone2.classList.remove('winner', 'loser');
    status1El.innerText = "";
    status2El.innerText = "";
    judge1.style.display = 'none';
    judge2.style.display = 'none';

    actualizarPantallaReto();
}

function mostrarLeaderboard() {
    juegoTerminado = true;
    buzzerContainer.style.display = 'none';
    const leaderSection = document.getElementById('leaderboardSection');
    const leaderBody = document.getElementById('leaderboardBody');
    leaderSection.style.display = 'block';
    leaderBody.innerHTML = '';

    const ranking = Object.entries(puntuacionGeneral)
        .sort((a, b) => b[1] - a[1]) 
        .filter(entry => entry[1] > 0); 

    if (ranking.length === 0) {
        leaderBody.innerHTML = '<tr><td colspan="3" style="text-align: center; color: var(--text-muted);">Nadie anotó puntos esta sesión.</td></tr>';
        return;
    }

    ranking.forEach((alumnoData, index) => {
        const nombre = alumnoData[0];
        const puntos = alumnoData[1];
        const tr = document.createElement('tr');
        
        if (index === 0) tr.classList.add('podium-1');
        else if (index === 1) tr.classList.add('podium-2');
        else if (index === 2) tr.classList.add('podium-3');

        tr.innerHTML = `<td>#${index + 1}</td><td>${nombre}</td><td style="text-align: right; font-weight: bold;">${puntos} pts</td>`;
        leaderBody.appendChild(tr);
    });
}

// --- FUNCIÓN PARA REINICIAR LA HERRAMIENTA SIN SALIR ---
window.volverAConfiguracion = function() {
    document.getElementById('leaderboardSection').style.display = 'none';
    document.getElementById('controlsCardGrupo').style.display = 'flex';
    document.getElementById('grupoSelect').value = '';
    grupoActual = null;
    document.getElementById('panelAsistencia').style.display = 'none';
    
    alumnosPresentes = [];
    document.getElementById('alumnosPresentesContenedor').innerHTML = '<span style="color: var(--text-muted); font-size: 0.9rem;">Aún no hay alumnos añadidos. Pulsa "Añadir Todos" si vinieron la mayoría.</span>';
    document.getElementById('contadorPresentes').textContent = '0';
    document.getElementById('btnComenzarJuego').disabled = true;
};