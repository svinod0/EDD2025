// server.js
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const SerialPort = require('serialport');
const Readline = require('@serialport/parser-readline');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' }
});

const PORT = 3000;
const SERIAL_PORT = '/dev/cu.usbmodem1101'; // <-- change to your Arduino port
const BAUD_RATE = 9600;

// Serve static files
app.use(express.static('public'));

// Root route
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/public/index.html');
});

// Serial setup
const port = new SerialPort(SERIAL_PORT, { baudRate: BAUD_RATE });
const parser = port.pipe(new Readline({ delimiter: '\n' }));

parser.on('data', (line) => {
  const value = parseFloat(line.trim());
  if (!isNaN(value)) {
    // Emit immediately for real-time updates
    io.emit('sensor_update_batch', { values: [value] });
  }
});

port.on('open', () => console.log(`Serial port ${SERIAL_PORT} open at ${BAUD_RATE} baud`));
port.on('error', (err) => console.error('Serial port error:', err));

// Socket.io connection
io.on('connection', (socket) => {
  console.log('Client connected');
  socket.on('disconnect', () => console.log('Client disconnected'));
});

// Start server
server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
