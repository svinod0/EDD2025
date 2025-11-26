// ===============================
// DOM ELEMENTS
// ===============================
const sensorStatusEl = document.getElementById('sensor-status');
const sensorValueEl = document.getElementById('sensor-value');

const systolicSlider = document.getElementById('systolic-slider');
const diastolicSlider = document.getElementById('diastolic-slider');
const hrSlider = document.getElementById('heart-rate-slider');

const systolicInput = document.getElementById('systolic-input');
const diastolicInput = document.getElementById('diastolic-input');
const hrInput = document.getElementById('hr-input');

const systolicDisplay = document.getElementById('systolic-display');
const diastolicDisplay = document.getElementById('diastolic-display');
const hrDisplay = document.getElementById('hr-display');

let lastUpdate = Date.now();
let latestValue = null;
let pendingUpdate = false;

// ===============================
// SOCKET.IO CONNECTION
// ===============================
const socket = io();

socket.on('sensor_update_batch', data => {
    if (data.values.length > 0) {
        latestValue = parseFloat(data.values[data.values.length - 1]);
        pendingUpdate = true;
        lastUpdate = Date.now();
    }
});

// ===============================
// DOM UPDATE LOOP
// ===============================
function updateDOM() {
    if (pendingUpdate && latestValue !== null) {
        sensorValueEl.textContent = latestValue.toFixed(2);
        sensorStatusEl.textContent = "Connected";
        sensorStatusEl.classList.remove("disconnected");
        sensorStatusEl.classList.add("connected");
        pendingUpdate = false;
    }

    if (Date.now() - lastUpdate > 3000) {
        sensorStatusEl.textContent = "Disconnected";
        sensorStatusEl.classList.remove("connected");
        sensorStatusEl.classList.add("disconnected");
        sensorValueEl.textContent = "--";
    }

    requestAnimationFrame(updateDOM);
}
updateDOM();

// ===============================
// ZERO SENSOR BUTTON
// ===============================
const zeroBtn = document.getElementById('zero-ban');

zeroBtn.addEventListener('click', () => {
    if (sensorStatusEl.textContent === "Connected") {
        // Capture the current sensor value displayed on the website
        const currentValue = parseFloat(sensorValueEl.textContent);

        // Send it to the server
        fetch("/zero-sensor", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ zero: currentValue })
        });

        alert("Sensor zeroed!");
    } else {
        alert("Sensor not connected!");
    }
});


// ===============================
// SLIDER SYNC + SEND TO SERVER
// ===============================
function sendValuesToServer() {
    fetch("/update-values", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            sys: parseInt(systolicSlider.value),
            dia: parseInt(diastolicSlider.value),
            hr: parseInt(hrSlider.value)
        })
    });
}

function syncSystolic(value) {
    value = parseInt(value);
    if (value <= parseInt(diastolicSlider.value)) value = parseInt(diastolicSlider.value) + 1;
    systolicSlider.value = value;
    systolicInput.value = value;
    systolicDisplay.textContent = value;
    sendValuesToServer();
}

function syncDiastolic(value) {
    value = parseInt(value);
    if (value >= parseInt(systolicSlider.value)) value = parseInt(systolicSlider.value) - 1;
    diastolicSlider.value = value;
    diastolicInput.value = value;
    diastolicDisplay.textContent = value;
    sendValuesToServer();
}

function syncHR(value) {
    value = parseInt(value)
    hrSlider.value = value;
    hrInput.value = value;
    hrDisplay.textContent = value;
    sendValuesToServer();
}

systolicSlider.addEventListener('input', e => syncSystolic(e.target.value));
systolicInput.addEventListener('input', e => syncSystolic(e.target.value));
diastolicSlider.addEventListener('input', e => syncDiastolic(e.target.value));
diastolicInput.addEventListener('input', e => syncDiastolic(e.target.value));
hrSlider.addEventListener('input', e => syncHR(e.target.value));
hrInput.addEventListener('input', e => syncHR(e.target.value));
