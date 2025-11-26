// server.js
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { SerialPort } = require('serialport');
const ReadlineParser = require('@serialport/parser-readline');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Serve static files from public/
app.use(express.static('public'));

// ==== Serial configuration - CHANGE THIS to your port ====
const SERIAL_PORT = '/dev/cu.usbmodem1101'; // <-- change to your port
const BAUD_RATE = 9600;
// =======================================================

let port;
try {
  port = new SerialPort({ path: SERIAL_PORT, baudRate: BAUD_RATE, autoOpen: false });
} catch (err) {
  console.error('Cannot construct SerialPort:', err);
  process.exit(1);
}

const parser = port.pipe(new ReadlineParser({ delimiter: '\n' }));

// sensor batching
let sensorBatch = [];
const MAX_BATCH_SIZE = 200;

// open port with retries
function openPortWithRetry(retries = 0) {
  port.open((err) => {
    if (err) {
      console.error(`Serial open error (attempt ${retries}):`, err.message || err);
      setTimeout(() => openPortWithRetry(retries + 1), 2000);
      return;
    }
    console.log(`Serial port ${SERIAL_PORT} opened at ${BAUD_RATE} baud`);
  });
}
openPortWithRetry();

// parse lines from Arduino
parser.on('data', line => {
  if (!line) return;
  const trimmed = line.trim();
  // sometimes Arduino prints other info; ignore non-number lines
  const value = parseFloat(trimmed);
  if (Number.isFinite(value)) {
    sensorBatch.push(value);
    // keep last MAX
    if (sensorBatch.length > MAX_BATCH_SIZE) {
      sensorBatch = sensorBatch.slice(-MAX_BATCH_SIZE);
    }
    // optional debug:
    // console.log('PARSED:', value);
  } else {
    // console.log('IGNORED:', trimmed);
  }
});

// Emit batches to all clients at ~10ms intervals (100Hz)
setInterval(() => {
  if (sensorBatch.length > 0) {
    // copy and clear
    const batchToSend = sensorBatch.slice();
    sensorBatch = [];
    io.emit('sensor_update_batch', { values: batchToSend });
  }
}, 10);

// Handle port errors and auto-reopen
port.on('error', err => {
  console.error('Serial port error:', err.message || err);
});
port.on('close', () => {
  console.warn('Serial port closed. Will attempt to reopen in 2s...');
  setTimeout(() => {
    openPortWithRetry();
  }, 2000);
});

// Socket.IO connection
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Start HTTP server
const HTTP_PORT = 3000;
server.listen(HTTP_PORT, () => {
  console.log(`Server started at http://localhost:${HTTP_PORT}`);
});
