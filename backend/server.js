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
const otpUserRoutes = require('./routes/otpUserRoutes'); 
const reportRoutes = require('./routes/reportRoutes');
const billRoutes = require('./routes/billRoutes'); 
const waiterCallRoutes = require('./routes/waiterCallRoutes');
const foodTypeRoutes = require('./routes/foodTypeRoutes');

const app = express();
const server = http.createServer(app);

// Initialize Socket.IO
const io = require('socket.io')(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST", "PATCH"]
  }
});

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
app.use('/api/otp-users', otpUserRoutes); 
app.use('/api/reports', reportRoutes);
app.use('/api/bills', billRoutes);
app.use('/api/waiter-calls', waiterCallRoutes);
app.use('/api/food-types', foodTypeRoutes);

// Pass io to orderRoutes
const orderRoutes = require('./routes/orderRoutes')(io);
app.use('/api/orders', orderRoutes);

// Add this route to serve uploaded images
app.get('/uploads/:filename', (req, res) => {
    res.sendFile(path.join(__dirname, 'uploads', req.params.filename));
});

// Serve static files from the Angular app
app.use(express.static(path.join(__dirname, '../frontend/dist/frontend/browser')));

// For all GET requests, send back index.html
// so that PathLocationStrategy can be used
app.get('/*', function(req, res) {
  res.sendFile(path.join(__dirname, '../frontend/dist/frontend/browser/index.html'));
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('New client connected');

  socket.on('stockUpdate', (updatedItem) => {
    console.log('Stock update received:', updatedItem);
    io.emit('menuUpdate', updatedItem);
  });

  socket.on('callWaiter', (data) => {
    console.log('Waiter call received:', data);
    io.emit('waiterCalled', data);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });
});

const PORT = process.env.PORT || 5001;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));

console.log('Environment variables:');
console.log('TWILIO_ACCOUNT_SID:', process.env.TWILIO_ACCOUNT_SID ? 'Is set' : 'Is not set');
console.log('TWILIO_AUTH_TOKEN:', process.env.TWILIO_AUTH_TOKEN ? 'Is set' : 'Is not set');
console.log('TWILIO_PHONE_NUMBER:', process.env.TWILIO_PHONE_NUMBER);