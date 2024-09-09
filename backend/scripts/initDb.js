const mongoose = require('mongoose');
const User = require('../models/User');
require('dotenv').config();

mongoose.set('strictQuery', false);

const users = [
  { username: 'customer1', password: 'password123', userType: 'customer' },
  { username: 'cook1', password: 'password123', userType: 'cook' },
  { username: 'billing1', password: 'password123', userType: 'billing' },
  { username: 'admin1', password: 'password123', userType: 'admin' },
];

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ordore', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const db = mongoose.connection;

db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', async function() {
  console.log('Connected to MongoDB');

  try {
    // Clear existing users
    await User.deleteMany({});
    console.log('Cleared existing users');

    // Create new users
    for (let userData of users) {
      const user = new User(userData);
      await user.save();
      console.log(`Created user: ${user.username}, type: ${user.userType}, hashed password: ${user.password}`);
    }

    console.log('Database initialization completed');

    // Log all users
    const allUsers = await User.find({}, 'username userType');
    console.log('All users:', allUsers);

  } catch (error) {
    console.error('Error initializing database:', error);
  } finally {
    mongoose.connection.close();
  }
});