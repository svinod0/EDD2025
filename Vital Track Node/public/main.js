// ===============================
// DOM ELEMENTS
// ===============================
const sensorStatusEl = document.getElementById('sensor-status');
const sensorValueEl = document.getElementById('sensor-value');
const connectBtn = document.getElementById('connect-serial-btn');

const systolicSlider = document.getElementById('systolic-slider');
const diastolicSlider = document.getElementById('diastolic-slider');
const hrSlider = document.getElementById('heart-rate-slider');

const systolicInput = document.getElementById('systolic-input');
const diastolicInput = document.getElementById('diastolic-input');
const hrInput = document.getElementById('hr-input');

const systolicDisplay = document.getElementById('systolic-display');
const diastolicDisplay = document.getElementById('diastolic-display');
const hrDisplay = document.getElementById('hr-display');

// Global Variables for Serial
let port;
let writer;
let keepReading = false;

// App State
let zeroValue = 0;
let calibrateValue = -1; // -1 means not set
let lastUpdate = Date.now();

// ===============================
// WEB SERIAL CONNECTION
// ===============================
connectBtn.addEventListener('click', async () => {
    if ("serial" in navigator) {
        try {
            // 1. Request the port (User picks from list)
            port = await navigator.serial.requestPort();
            
            // 2. Open the port (Match Arduino Baud Rate 9600)
            await port.open({ baudRate: 9600 });
            
            // 3. Update UI
            sensorStatusEl.textContent = "Connected";
            sensorStatusEl.classList.remove("disconnected");
            sensorStatusEl.classList.add("connected");
            connectBtn.disabled = true;
            connectBtn.textContent = "✅ Device Linked";

            // 4. Set up the writer (to send data TO Arduino)
            const textEncoder = new TextEncoderStream();
            const writableStreamClosed = textEncoder.readable.pipeTo(port.writable);
            writer = textEncoder.writable.getWriter();

            // 5. Start the read loop (to get data FROM Arduino)
            readLoop();

        } catch (err) {
            console.error("Serial connection error:", err);
            alert("Could not connect. Make sure the Arduino is plugged in and no other apps (like Arduino IDE) are using it.");
        }
    } else {
        alert("Your browser doesn't support Web Serial. Please use Chrome, Edge, or Opera.");
    }
});

// ===============================
// READ LOOP (FROM ARDUINO)
// ===============================
async function readLoop() {
    const textDecoder = new TextDecoderStream();
    const readableStreamClosed = port.readable.pipeTo(textDecoder.writable);
    const reader = textDecoder.readable.getReader();
    keepReading = true;
    let buffer = "";

    try {
        while (keepReading) {
            const { value, done } = await reader.read();
            if (done) break;
            
            if (value) {
                buffer += value;
                // Process full lines
                const lines = buffer.split('\n');
                // Keep the incomplete last line in the buffer
                buffer = lines.pop(); 

                for (const line of lines) {
                    handleSerialData(line.trim());
                }
            }
        }
    } catch (error) {
        console.error("Read error:", error);
    } finally {
        reader.releaseLock();
    }
}

function handleSerialData(data) {
    // Arduino sends a single float number (pressure)
    const pressure = parseFloat(data);
    if (!isNaN(pressure)) {
        sensorValueEl.textContent = pressure.toFixed(2);
        lastUpdate = Date.now();
    }
}

// Check for disconnection (timeout)
setInterval(() => {
    if (Date.now() - lastUpdate > 3000 && sensorStatusEl.textContent === "Connected") {
        // Note: With Web Serial, disconnection usually throws an error in readLoop,
        // but this visual safety net helps.
        sensorValueEl.textContent = "--";
    }
}, 1000);

// ===============================
// SEND DATA (TO ARDUINO)
// ===============================
async function sendValuesToArduino() {
    if (!writer) return;

    const sys = parseInt(systolicSlider.value);
    const dia = parseInt(diastolicSlider.value);
    const hr = parseInt(hrSlider.value);
    const zero = parseFloat(zeroValue).toFixed(2);
    const calib = parseFloat(calibrateValue).toFixed(2);

    // Format: "sys,dia,hr,zero,calib\n"
    const dataString = `${sys},${dia},${hr},${zero},${calib}\n`;

    try {
        await writer.write(dataString);
        console.log("Sent:", dataString.trim());
    } catch (err) {
        console.error("Write error:", err);
    }
}

// ===============================
// UI HANDLERS (Same logic as before)
// ===============================

// Zero Button
document.getElementById('zero-btn').addEventListener('click', () => {
    const val = parseFloat(sensorValueEl.textContent);
    if (!isNaN(val)) {
        zeroValue = val;
        alert("Sensor Zeroed at " + zeroValue);
        sendValuesToArduino();
    }
});

// Calibrate Button
document.getElementById('calibrate-btn').addEventListener('click', () => {
    const val = parseFloat(sensorValueEl.textContent);
    if (!isNaN(val)) {
        calibrateValue = val;
        alert("Calibration value set: " + calibrateValue);
        sendValuesToArduino();
    }
});

// Sync Functions
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

// Event Listeners
systolicSlider.addEventListener('input', e => syncSystolic(e.target.value));
systolicInput.addEventListener('input', e => syncSystolic(e.target.value));
diastolicSlider.addEventListener('input', e => syncDiastolic(e.target.value));
diastolicInput.addEventListener('input', e => syncDiastolic(e.target.value));
hrSlider.addEventListener('input', e => syncHR(e.target.value));
hrInput.addEventListener('input', e => syncHR(e.target.value));