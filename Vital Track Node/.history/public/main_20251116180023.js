// public/main.js

// ===============================
// SOCKETIO + REAL SENSOR STATUS
// ===============================

const sensorStatusEl = document.getElementById('sensor-status');
const sensorValueEl = document.getElementById('sensor-value');

let lastUpdate = Date.now();

// Connect to SocketIO (auto to same host)
const socket = io();

// Listen for batch updates from server
socket.on('sensor_update_batch', data => {
    if (data && Array.isArray(data.values) && data.values.length > 0) {
        // Use the latest value in the batch
        const value = data.values[data.values.length - 1];
        const numericValue = parseFloat(value);

        if (!isNaN(numericValue)) {
            sensorValueEl.textContent = numericValue.toFixed(2);
            sensorStatusEl.textContent = "Connected";
            sensorStatusEl.classList.remove("disconnected");
            sensorStatusEl.classList.add("connected");
            lastUpdate = Date.now();
        }
    }
});

// Disconnect if no updates for 3 seconds
setInterval(() => {
    if (Date.now() - lastUpdate > 3000) {
        sensorStatusEl.textContent = "Disconnected";
        sensorStatusEl.classList.remove("connected");
        sensorStatusEl.classList.add("disconnected");
        sensorValueEl.textContent = "--";
    }
}, 500);

// ===============================
// ZERO + CALIBRATE BUTTONS
// ===============================

document.getElementById('zero-btn').addEventListener('click', () => {
    if (sensorStatusEl.textContent === "Connected") {
        alert("Sensor zeroed!");
        sensorValueEl.textContent = "0.00";
    } else {
        alert("Sensor not connected!");
    }
});

document.getElementById('calibrate-btn').addEventListener('click', () => {
    if (sensorStatusEl.textContent === "Connected") {
        alert("Sensor calibrated!");
    } else {
        alert("Sensor not connected!");
    }
});

// ===============================
// BLOOD PRESSURE LOGIC
// ===============================

const systolicSlider = document.getElementById('systolic-slider');
const diastolicSlider = document.getElementById('diastolic-slider');
const systolicInput = document.getElementById('systolic-input');
const diastolicInput = document.getElementById('diastolic-input');
const systolicDisplay = document.getElementById('systolic-display');
const diastolicDisplay = document.getElementById('diastolic-display');

function syncSystolic(value) {
    value = parseInt(value);
    if (value <= parseInt(diastolicSlider.value)) {
        value = parseInt(diastolicSlider.value) + 1;
    }
    systolicSlider.value = value;
    systolicInput.value = value;
    systolicDisplay.textContent = value;
}

function syncDiastolic(value) {
    value = parseInt(value);
    if (value >= parseInt(systolicSlider.value)) {
        value = parseInt(systolicSlider.value) - 1;
    }
    diastolicSlider.value = value;
    diastolicInput.value = value;
    diastolicDisplay.textContent = value;
}

systolicSlider.addEventListener('input', e => syncSystolic(e.target.value));
systolicInput.addEventListener('input', e => syncSystolic(e.target.value));
diastolicSlider.addEventListener('input', e => syncDiastolic(e.target.value));
diastolicInput.addEventListener('input', e => syncDiastolic(e.target.value));

// ===============================
// HEART RATE LOGIC
// ===============================

const hrSlider = document.getElementById('heart-rate-slider');
const hrInput = document.getElementById('heart-rate-input');
const hrDisplay = document.getElementById('hr-display');

function syncHR(value) {
    hrSlider.value = value;
    hrInput.value = value;
    hrDisplay.textContent = value;
}

hrSlider.addEventListener('input', e => syncHR(e.target.value));
hrInput.addEventListener('input', e => syncHR(e.target.value));
