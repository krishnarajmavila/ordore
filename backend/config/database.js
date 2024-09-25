const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    await mongoose.connect('MONGODB_URI=mongodb+srv://krishnarajmavila:oTxhfAchO2rErhS3@ordorecone.equ25.mongodb.net/?retryWrites=true&w=majority', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('MongoDB connected');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

module.exports = connectDB;