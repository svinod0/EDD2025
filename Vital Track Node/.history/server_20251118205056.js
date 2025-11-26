// ===============================
// SERVER SETUP
// ===============================
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { SerialPort } = require('serialport');
const { ReadlineParser } = require('@serialport/parser-readline');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

const PORT = 3000;
const SERIAL_PORT = '/dev/cu.usbmodem2101'; // Replace with your Arduino port
const BAUD_RATE = 9600;

// Serve static files
app.use(express.static('public'));
app.use(express.json());

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/public/index.html');
});

// ===============================
// SERIAL PORT SETUP
// ===============================
const port = new SerialPort({ path: SERIAL_PORT, baudRate: BAUD_RATE });
const parser = port.pipe(new ReadlineParser({ delimiter: '\n' }));

let latestValue = 0;

// Read values from Arduino (sensor updates)
parser.on('data', line => {
    const value = parseFloat(line.trim());
    if (!isNaN(value)) {
        latestValue = value;
        io.emit('sensor_update_batch', { values: [latestValue] });
    }
});

port.on('error', err => console.error("Serial port error:", err.message));

// ===============================
// RECEIVE SLIDER VALUES FROM FRONTEND
// ===============================
app.post('/update-values', (req, res) => {
    const { sys, dia, hr } = req.body;
    if (port && port.isOpen) {
        // Send CSV string to Arduino: systolic,diastolic,heartRate\n
        port.write(`${sys},${dia},${hr}\n`);
    }
    res.json({ success: true });
});

// ===============================
// SOCKET.IO CONNECTION
// ===============================
io.on('connection', socket => {
    console.log('Client connected:', socket.id);
    if (latestValue !== null) socket.emit('sensor_update_batch', { values: [latestValue] });

    socket.on('disconnect', () => console.log('Client disconnected:', socket.id));
});

// ===============================
// START SERVER
// ===============================
server.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));
