const express = require('express');
const http = require('http');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const connectDB = require('./config/database');
const authRoutes = require('./routes/auth');
const foodRoutes = require('./routes/food');
const otpRoutes = require('./routes/otpRoutes');
const tableRoutes = require('./routes/tableRoutes'); 
const tableOtpRoutes = require('./routes/tableOtpRoutes');

const app = express();
const server = http.createServer(app);

// Initialize Socket.IO if needed
let io;
if (process.env.USE_SOCKET_IO === 'true') {
  const socketIo = require('socket.io');
  io = socketIo(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST", "PATCH"]
    }
  });
}

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

connectDB();

app.use(cors());
app.use(express.json());

// Serve static files from the 'uploads' directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/food', foodRoutes);
app.use('/api/auth', otpRoutes);
app.use('/api/tables', tableRoutes);
app.use('/api/table-otp', tableOtpRoutes);

// Pass io to orderRoutes, even if it's undefined
const orderRoutes = require('./routes/orderRoutes')(io);
app.use('/api/orders', orderRoutes);

// Add this route to serve uploaded images
app.get('/uploads/:filename', (req, res) => {
    res.sendFile(path.join(__dirname, 'uploads', req.params.filename));
});

const PORT = process.env.PORT || 5001;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));

// Socket.IO connection handling (if enabled)
if (io) {
  io.on('connection', (socket) => {
    console.log('New client connected');
    socket.on('disconnect', () => {
      console.log('Client disconnected');
    });
  });
}

console.log('Environment variables:');
console.log('TWILIO_ACCOUNT_SID:', process.env.TWILIO_ACCOUNT_SID ? 'Is set' : 'Is not set');
console.log('TWILIO_AUTH_TOKEN:', process.env.TWILIO_AUTH_TOKEN ? 'Is set' : 'Is not set');
console.log('TWILIO_PHONE_NUMBER:', process.env.TWILIO_PHONE_NUMBER);