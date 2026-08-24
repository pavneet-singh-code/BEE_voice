const swars = [
    { name: "Sa", label: "do", frequency: 261.63 },
    { name: "Re", label: "re", frequency: 293.66 },
    { name: "Ga", label: "mi", frequency: 329.63 },
    { name: "Ma", label: "fa", frequency: 349.23 },
    { name: "Pa", label: "sol", frequency: 392.0 },
    { name: "Dha", label: "la", frequency: 440.0 },
    { name: "Ni", label: "ti", frequency: 493.88 },
];

const state = {
    target: 0,
    listening: false,
    startedAt: null,
    notesHit: 0,
    audioContext: null,
    analyser: null,
    stream: null,
    animation: null,
    drone: null,
};

// Initialize Swar List
const swarList = document.getElementById("swarList");
swars.forEach((swar, index) => {
    const button = document.createElement("button");
    button.className = `swar-button ${index === 0 ? "active" : ""}`;
    button.innerHTML = `${swar.name}<small>${swar.label}</small>`;
    button.onclick = () => selectSwar(index);
    swarList.appendChild(button);
});

function selectSwar(index) {
    state.target = index;
    document.querySelectorAll(".swar-button").forEach((btn, i) => {
        btn.classList.toggle("active", i === index);
    });
    document.getElementById("targetNote").textContent = swars[index].name;
    document.getElementById("detectedNote").textContent = state.listening
        ? "Listening..."
        : "Ready";
    document.getElementById("centsBadge").textContent = "-- cents";
    document.getElementById("meterNeedle").style.transform = "rotate(-36deg)";
}

// RESTORED ORIGINAL DRONE LOGIC
function toggleDrone() {
    if (state.drone) {
        state.drone.stop();
        state.drone = null;
        document.getElementById("droneStatus").textContent = "off";
        document.getElementById("droneButton").textContent = "Play drone";
        return;
    }

    // Original Audio Setup
    const context = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = context.createOscillator();
    const gain = context.createGain();

    // Original Frequency & Volume Logic
    oscillator.frequency.value = 261.63;
    gain.gain.value =
        Number(document.getElementById("droneVolume").value) / 1000;

    oscillator.connect(gain).connect(context.destination);
    oscillator.start();

    state.drone = oscillator;
    document.getElementById("droneStatus").textContent = "playing";
    document.getElementById("droneButton").textContent = "Stop drone";
}

// RESTORED ORIGINAL LISTENING LOGIC
function autoCorrelate(buffer, sampleRate) {
    let rms = 0;
    for (let i = 0; i < buffer.length; i++) rms += buffer[i] * buffer[i];
    rms = Math.sqrt(rms / buffer.length);
    if (rms < 0.015) return -1;
    let bestOffset = -1;
    let bestCorrelation = 0;
    for (let offset = 20; offset < buffer.length / 2; offset++) {
        let correlation = 0;
        for (let i = 0; i < buffer.length / 2; i++)
            correlation += Math.abs(buffer[i]) - Math.abs(buffer[i + offset]);
        correlation = 1 - correlation / (buffer.length / 2);
        if (correlation > bestCorrelation) {
            bestCorrelation = correlation;
            bestOffset = offset;
        }
    }
    return bestCorrelation > 0.8 ? sampleRate / bestOffset : -1;
}

function frequencyToNote(frequency) {
    if (!frequency || frequency < 70) return null;
    const midi = Math.round(69 + 12 * Math.log2(frequency / 440));
    const noteFrequency = 440 * Math.pow(2, (midi - 69) / 12);
    const cents = Math.round(1200 * Math.log2(frequency / noteFrequency));
    const noteNames = ["Sa", "Re", "Ga", "Ma", "Pa", "Dha", "Ni"];
    return {
        name: noteNames[((((midi - 60) % 12) + 12) % 12) % 7],
        frequency: noteFrequency,
        cents,
    };
}

function showPitch(frequency) {
    const note = frequencyToNote(frequency);
    if (!note) return;
    const target = swars[state.target];
    const centsFromTarget = Math.round(
        1200 * Math.log2(frequency / target.frequency),
    );
    const clamped = Math.max(-50, Math.min(50, centsFromTarget));

    document.getElementById("pitchValue").textContent = Math.round(frequency);
    const noteDisplay = document.getElementById("detectedNote");
    const badge = document.getElementById("centsBadge");
    const dot = document.getElementById("visualizer-dot");

    const inTune = note.name === target.name && Math.abs(centsFromTarget) < 30;

    noteDisplay.textContent = inTune ? "In tune" : note.name;
    badge.textContent = `${centsFromTarget > 0 ? "+" : ""}${centsFromTarget} cents`;
    document.getElementById("meterNeedle").style.transform =
        `rotate(${clamped * 1.5}deg)`;

    if (inTune) {
        badge.style.color = "#4ade80";
        dot.style.background = "#4ade80";
        dot.style.boxShadow = "0 0 30px #4ade80";
    } else {
        badge.style.color = "#6366f1";
        dot.style.background = "#6366f1";
        dot.style.boxShadow = "0 0 20px #6366f1";
    }
}

async function toggleListening() {
    const btn = document.getElementById("listenButton");
    const label = document.getElementById("listenLabel");
    const dot = document.getElementById("visualizer-dot");

    if (state.listening) {
        state.listening = false;
        cancelAnimationFrame(state.animation);
        if (state.stream)
            state.stream.getTracks().forEach((track) => track.stop());
        if (state.audioContext) state.audioContext.close();
        label.textContent = "START LISTENING";
        btn.classList.remove("bg-red-500");
        dot.classList.remove("active");
        addRecentNote();
        return;
    }

    state.listening = true;
    state.startedAt = Date.now();
    label.textContent = "STOP STUDIO";
    btn.classList.add("bg-red-500");
    dot.classList.add("active");

    try {
        state.stream = await navigator.mediaDevices.getUserMedia({
            audio: true,
        });
        state.audioContext = new (
            window.AudioContext || window.webkitAudioContext
        )();
        state.analyser = state.audioContext.createAnalyser();
        state.analyser.fftSize = 2048;
        state.audioContext
            .createMediaStreamSource(state.stream)
            .connect(state.analyser);
        const buffer = new Float32Array(state.analyser.fftSize);
        const readMicrophone = () => {
            if (!state.listening) return;
            state.analyser.getFloatTimeDomainData(buffer);
            showPitch(autoCorrelate(buffer, state.audioContext.sampleRate));
            state.animation = requestAnimationFrame(readMicrophone);
        };
        readMicrophone();
    } catch (error) {
        console.error(error);
    }
    updateTimer();
}

function updateTimer() {
    if (!state.listening) return;
    const seconds = Math.floor((Date.now() - state.startedAt) / 1000);
    document.getElementById("sessionTime").textContent =
        `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
    setTimeout(updateTimer, 1000);
}

function addRecentNote() {
    if (!state.startedAt) return;
    state.notesHit += 1;
    document.getElementById("notesHit").textContent = state.notesHit;
    document.getElementById("progressBar").style.width =
        `${Math.min((state.notesHit / 7) * 100, 100)}%`;
    const row = document.createElement("div");
    row.className =
        "flex justify-between items-center p-4 bg-white/5 border border-white/5 rounded-xl text-xs";
    row.innerHTML = `<strong class="text-indigo-400 text-lg">${swars[state.target].name}</strong><em class="text-slate-500">Saved</em><time>${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</time>`;
    const list = document.getElementById("recentList");
    if (list.innerHTML.includes("History will appear here"))
        list.innerHTML = "";
    list.prepend(row);
}

document
    .getElementById("listenButton")
    .addEventListener("click", toggleListening);
document.getElementById("droneButton").addEventListener("click", toggleDrone);
document.getElementById("droneVolume").addEventListener("input", () => {
    // Volume logic remains manual click-to-play based on browser security
});
