const { ipcRenderer } = require('electron');

// =======================
// DOM ELEMENTS
// =======================
const sensorStatusEl = document.getElementById('sensor-status');
const sensorValueEl = document.getElementById('sensor-value');
const gaugeCanvas = document.getElementById('sensor-gauge');
const ctx = gaugeCanvas.getContext('2d');

const systolicSlider = document.getElementById('systolic-slider');
const diastolicSlider = document.getElementById('diastolic-slider');
const hrSlider = document.getElementById('heart-rate-slider');

const systolicInput = document.getElementById('systolic-input');
const diastolicInput = document.getElementById('diastolic-input');
const hrInput = document.getElementById('hr-input');

const systolicDisplay = document.getElementById('systolic-display');
const diastolicDisplay = document.getElementById('diastolic-display');
const hrDisplay = document.getElementById('hr-display');

// =======================
// STATE
// =======================
let lastUpdate = Date.now();
let latestValue = null;
let pendingUpdate = false;

let zeroValue = -1;
let calibrateValue = -1;

let displayedValue = 0;
let showSensorValue = true;

const bpBox = document.querySelector('.bp-box');
const hrBox = document.querySelector('.hr-box');
const toggleBtn = document.getElementById('toggle-value-btn');

// =======================
// GAUGE SETTINGS
// =======================
const gauge = {
    min: 0,
    max: 300,
    radius: 100,
    centerX: gaugeCanvas.width / 2,
    centerY: gaugeCanvas.height / 2
};

// =======================
// OFFSCREEN STATIC CANVAS
// =======================
const staticCanvas = document.createElement('canvas');
staticCanvas.width = gaugeCanvas.width;
staticCanvas.height = gaugeCanvas.height;
const staticCtx = staticCanvas.getContext('2d');

// =======================
// IPC LISTENER
// =======================
ipcRenderer.on('sensor_update', (event, value) => {
    const raw = parseFloat(value);
    if (!isNaN(raw)) {
        latestValue = raw;
        lastUpdate = Date.now();
        pendingUpdate = true;
    }
});

// =======================
// STATIC GAUGE DRAW
// =======================
function drawStaticGauge() {
    const { centerX, centerY, radius } = gauge;
    const min = 0;
    const max = 300;
    const startAngle = Math.PI / 2 + 0.05;
    const totalAngle = 2 * Math.PI;

    staticCtx.clearRect(0, 0, staticCanvas.width, staticCanvas.height);

    // Outer circle
    staticCtx.beginPath();
    staticCtx.lineWidth = 10;
    staticCtx.strokeStyle = '#ddd';
    staticCtx.arc(centerX, centerY, radius, 0, totalAngle);
    staticCtx.stroke();

    // Ticks + numbers
    for (let i = min; i <= max; i += 2) {
        const angle = startAngle + (i / max) * totalAngle;
        const tickLength = (i % 10 === 0) ? 15 : 8;

        staticCtx.beginPath();
        staticCtx.moveTo(
            centerX + (radius - tickLength) * Math.cos(angle),
            centerY + (radius - tickLength) * Math.sin(angle)
        );
        staticCtx.lineTo(
            centerX + radius * Math.cos(angle),
            centerY + radius * Math.sin(angle)
        );
        staticCtx.lineWidth = (i % 10 === 0) ? 2 : 1;
        staticCtx.strokeStyle = '#000';
        staticCtx.stroke();

        if (i % 20 === 0) {
            staticCtx.font = '14px Poppins';
            staticCtx.textAlign = 'center';
            staticCtx.textBaseline = 'middle';
            staticCtx.fillText(
                i.toString(),
                centerX + (radius - 30) * Math.cos(angle),
                centerY + (radius - 30) * Math.sin(angle)
            );
        }
    }
}

// =======================
// NEEDLE DRAW
// =======================
function drawNeedle(value) {
    ctx.clearRect(0, 0, gaugeCanvas.width, gaugeCanvas.height);
    ctx.drawImage(staticCanvas, 0, 0);

    const startAngle = Math.PI / 2 + 0.05;
    const angle = startAngle + (value / gauge.max) * (2 * Math.PI);
    const needleLength = gauge.radius * 0.9;

    ctx.beginPath();
    ctx.lineWidth = 4;
    ctx.strokeStyle = 'red';
    ctx.moveTo(gauge.centerX, gauge.centerY);
    ctx.lineTo(
        gauge.centerX + needleLength * Math.cos(angle),
        gauge.centerY + needleLength * Math.sin(angle)
    );
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(gauge.centerX, gauge.centerY, 6, 0, Math.PI * 2);
    ctx.fillStyle = 'black';
    ctx.fill();
}

// =======================
// MAIN UPDATE LOOP
// =======================
let lastFrame = 0;
function updateDOM(timestamp) {
    if (timestamp - lastFrame > 33) {
        lastFrame = timestamp;

        if (pendingUpdate && latestValue !== null) {
            sensorValueEl.textContent = showSensorValue ? latestValue.toFixed(2) + " mm Hg" : '';
            sensorStatusEl.textContent = "Connected";
            sensorStatusEl.classList.add("connected");
            sensorStatusEl.classList.remove("disconnected");

            displayedValue += (latestValue - displayedValue) * 0.15;
            drawNeedle(displayedValue);

            pendingUpdate = false;
        }

        if (Date.now() - lastUpdate > 3000) {
            sensorStatusEl.textContent = "Disconnected";
            sensorStatusEl.classList.add("disconnected");
            sensorStatusEl.classList.remove("connected");
            sensorValueEl.textContent = showSensorValue ? '--' : '';
            drawNeedle(0);
        }
    }
    requestAnimationFrame(updateDOM);
}

// =======================
// ZERO / CALIBRATE
// =======================
document.getElementById('zero-btn').addEventListener('click', () => {
    if (sensorStatusEl.textContent === "Connected" && latestValue !== null) {
        zeroValue = latestValue;
        sendValuesToArduino();
        alert("Zero captured at raw value: " + zeroValue.toFixed(2));
    } else {
        alert("Sensor not connected or no data received!");
    }
});

document.getElementById('calibrate-btn').addEventListener('click', () => {
    if (sensorStatusEl.textContent === "Connected" && latestValue !== null) {
        if (zeroValue === -1) {
            alert("Please capture Zero first!");
            return;
        }
        calibrateValue = latestValue;
        sendValuesToArduino();
        alert(
            "Calibration captured at raw value: " + calibrateValue.toFixed(2) +
            "\nCalibration active! Sensor will now display mmHg."
        );
    } else {
        alert("Sensor not connected or no data received!");
    }
});

// =======================
// TOGGLE SENSOR VALUE
// =======================
document.getElementById('toggle-value-btn').addEventListener('click', () => {
    showSensorValue = !showSensorValue;
    sensorValueEl.textContent = showSensorValue && latestValue !== null ? latestValue.toFixed(2) + " mm Hg" : '';

    if(showSensorValue) {
        bpBox.classList.remove('hidden');
        hrBox.classList.remove('hidden');
    } else {
        bpBox.classList.add('hidden');
        hrBox.classList.add('hidden');
    }
});

// =======================
// SEND VALUES
// =======================
function sendValuesToArduino() {
    ipcRenderer.send('send-values', {
        sys: parseInt(systolicSlider.value),
        dia: parseInt(diastolicSlider.value),
        hr: parseInt(hrSlider.value),
        zero: zeroValue,
        calib: calibrateValue
    });
}

// =======================
// SLIDER SYNC
// =======================
function syncSystolic(value) {
    value = parseInt(value);
    if (value <= parseInt(diastolicSlider.value)) value = parseInt(diastolicSlider.value) + 1;
    systolicSlider.value = value;
    systolicInput.value = value;
    systolicDisplay.textContent = value;
    sendValuesToArduino();
}

function syncDiastolic(value) {
    value = parseInt(value);
    if (value >= parseInt(systolicSlider.value)) value = parseInt(systolicSlider.value) - 1;
    diastolicSlider.value = value;
    diastolicInput.value = value;
    diastolicDisplay.textContent = value;
    sendValuesToArduino();
}

function syncHR(value) {
    value = parseInt(value);
    hrSlider.value = value;
    hrInput.value = value;
    hrDisplay.textContent = value;
    sendValuesToArduino();
}

// =======================
// EVENT LISTENERS
// =======================
systolicSlider.addEventListener('input', e => syncSystolic(e.target.value));
systolicInput.addEventListener('input', e => syncSystolic(e.target.value));
diastolicSlider.addEventListener('input', e => syncDiastolic(e.target.value));
diastolicInput.addEventListener('input', e => syncDiastolic(e.target.value));
hrSlider.addEventListener('input', e => syncHR(e.target.value));
hrInput.addEventListener('input', e => syncHR(e.target.value));

// =======================
// INIT
// =======================
drawStaticGauge();
sendValuesToArduino();
requestAnimationFrame(updateDOM);

