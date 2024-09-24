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

const app = express();
const server = http.createServer(app);

const io = require('socket.io')(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST", "PATCH"]
  }
});

const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

connectDB();

app.use(cors());
app.use(express.json());

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

const orderRoutes = require('./routes/orderRoutes')(io);
app.use('/api/orders', orderRoutes);

app.get('/uploads/:filename', (req, res) => {
    res.sendFile(path.join(__dirname, 'uploads', req.params.filename));
});

io.on('connection', (socket) => {
  console.log('New client connected');

  socket.on('stockUpdate', (updatedItem) => {
    console.log('Stock update received:', updatedItem);
    io.emit('menuUpdate', updatedItem);
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


// const express = require('express');
// const path = require('path');
// const http = require('http');
// const fs = require('fs');
// const cors = require('cors');
// const connectDB = require('./config/database');
// const authRoutes = require('./routes/auth');
// const foodRoutes = require('./routes/food');
// const otpRoutes = require('./routes/otpRoutes');
// const tableRoutes = require('./routes/tableRoutes');
// const tableOtpRoutes = require('./routes/tableOtpRoutes');
// const otpUserRoutes = require('./routes/otpUserRoutes');

// const app = express();
// const server = http.createServer(app);

// // Connect to the database
// connectDB();

// app.use(cors());
// app.use(express.json());

// // Serve static files from the Angular build
// const angularAppPath = path.join(__dirname, '../frontend/dist/frontend/browser');
// app.use(express.static(angularAppPath));

// // API routes
// app.use('/api/auth', authRoutes);
// app.use('/api/food', foodRoutes);
// app.use('/api/auth', otpRoutes);
// app.use('/api/tables', tableRoutes);
// app.use('/api/table-otp', tableOtpRoutes);
// app.use('/api/otp-users', otpUserRoutes);

// // Serve the Angular app for all other routes
// app.get('*', (req, res) => {
//   res.sendFile(path.join(angularAppPath, 'index.html'));
// });

// const PORT = process.env.PORT || 5001;
// server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
