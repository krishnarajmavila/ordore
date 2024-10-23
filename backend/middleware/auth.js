const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
  const authHeader = req.header('Authorization');

  console.log('Received Authorization header:', authHeader);

  if (!authHeader) {
    console.log('No Authorization header provided');
    return res.status(401).json({ message: 'No token, authorization denied' });
  }

  // Check for different token formats
  let token;
  if (authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7, authHeader.length);
  } else {
    token = authHeader;
  }

  if (!token) {
    console.log('No token found in Authorization header');
    return res.status(401).json({ message: 'No token, authorization denied' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('Decoded token:', decoded);
    
    // Add user data to request object
    req.user = {
      userId: decoded.userId,
      username: decoded.username,
      userType: decoded.userType
    };

    next();
  } catch (error) {
    console.error('Token verification failed:', error);
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token has expired' });
    }
    res.status(401).json({ message: 'Token is not valid' });
  }
};