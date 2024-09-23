// const mongoose = require('mongoose');

// const OtpUserSchema = new mongoose.Schema({
//   name: {
//     type: String,
//     required: true
//   },
//   phoneNumber: {
//     type: String,
//     required: true,
//     unique: true
//   },
//   tableOtp: {
//     type: String,
//     required: true
//   },
//   createdAt: {
//     type: Date,
//     default: Date.now
//   }
// });

// module.exports = mongoose.model('OtpUser', OtpUserSchema);

const mongoose = require('mongoose');

const OtpUserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  phoneNumber: {
    type: String,
    required: true
  },
  tableOtp: {
    type: String,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('OtpUser', OtpUserSchema);
