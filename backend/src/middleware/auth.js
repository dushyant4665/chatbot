import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';

// Middleware to protect routes - verifies JWT token
export const protect = (req, res, next) => {
  const authHeader = req.headers.authorization || '';

  // Check if authorization header exists and starts with "Bearer "
  if (!authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      status: 'error',
      message: 'Authorization token is missing'
    });
  }

  // Extract token (remove "Bearer " prefix)
  const token = authHeader.slice(7);

  try {
    // Verify and decode token
    const decoded = jwt.verify(token, JWT_SECRET);

    // Attach user info to request object
    req.user = {
      userId: decoded.userId,
      email: decoded.email,
      name: decoded.name
    };

    next();

  } catch (error) {
    return res.status(401).json({
      status: 'error',
      message: 'Invalid or expired token'
    });
  }
};

export default protect;
