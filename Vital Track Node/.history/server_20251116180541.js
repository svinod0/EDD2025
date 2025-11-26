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

const PORT = 3000; // Node.js server port
const SERIAL_PORT = '/dev/cu.usbmodem1101'; // <-- Replace with your Arduino port
const BAUD_RATE = 9600;

// Serve static files
app.use(express.static('public'));

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/public/index.html');
});

// ===============================
// SERIAL PORT SETUP
// ===============================
const port = new SerialPort({ path: SERIAL_PORT, baudRate: BAUD_RATE });
const parser = port.pipe(new ReadlineParser({ delimiter: '\n' }));

let sensorBatch = [];
const MAX_BATCH_SIZE = 100;
let latestValue = 0;

// Read values from Arduino
parser.on('data', (line) => {
  const value = parseFloat(line.trim());
  if (!isNaN(value)) {
    latestValue = value;
    sensorBatch.push(value);
    if (sensorBatch.length > MAX_BATCH_SIZE) {
      sensorBatch = sensorBatch.slice(-MAX_BATCH_SIZE);
    }
    // Optional: console.log("Parsed:", value);
  }
});

// Handle serial errors
port.on('error', (err) => {
  console.error("Serial port error:", err.message);
});

// ===============================
// SOCKET.IO UPDATES
// ===============================
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  // Send sensor batch every 10ms
  const interval = setInterval(() => {
    if (sensorBatch.length > 0) {
      socket.emit('sensor_update_batch', { values: sensorBatch });
      sensorBatch = [];
    }
  }, 10);

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
    clearInterval(interval);
  });
});

// ===============================
// START SERVER
// ===============================
server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
