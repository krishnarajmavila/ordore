const client = require('twilio')(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

exports.sendOtp = async (mobileNumber) => {
  try {
    const verification = await client.verify.v2.services(process.env.TWILIO_VERIFY_SERVICE_SID)
      .verifications
      .create({ to: mobileNumber, channel: 'sms' });

    console.log('OTP verification SID:', verification.sid);
    return verification.sid;
  } catch (error) {
    console.error('Twilio Error:', error);
    throw error;
  }
};

exports.verifyOtp = async (mobileNumber, otp) => {
  try {
    const verification_check = await client.verify.v2.services(process.env.TWILIO_VERIFY_SERVICE_SID)
      .verificationChecks
      .create({ to: mobileNumber, code: otp });

    console.log('Verification status:', verification_check.status);
    return { valid: verification_check.status === 'approved' };
  } catch (error) {
    console.error('Twilio Verification Error:', error);
    throw error;
  }
};