import jwt from 'jsonwebtoken';

export const protect = (req, res, next) => {
  const header = req.headers.authorization || '';

  if (!header.startsWith('Bearer ')) {
    return res.status(401).json({
      status: 'error',
      message: 'missing authorization token',
    });
  }

  const token = header.slice(7);

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret');

    req.user = {
      userId: payload.userId,
      email: payload.email,
      name: payload.name,
    };

    next();
  } catch (error) {
    return res.status(401).json({
      status: 'error',
      message: 'invalid or expired token',
    });
  }
};

export default protect;
