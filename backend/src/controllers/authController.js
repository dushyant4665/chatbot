import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../config/database.js';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';

// ==================== GENERATE TOKEN ====================
const generateToken = (user) => {
  return jwt.sign(
    { userId: user.id, email: user.email, name: user.name },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
};

// ==================== SEND RESPONSE ====================
const sendAuthResponse = (res, status, user, token) => {
  res.status(status).json({
    status: 'success',
    data: {
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email
      }
    }
  });
};

// ==================== REGISTER ====================
export const register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(409).json({ status: 'error', message: 'Email already registered' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { name, email, passwordHash }
    });

    const token = generateToken(user);
    sendAuthResponse(res, 201, user, token);

  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to register user' });
  }
};

// ==================== LOGIN ====================
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(401).json({ status: 'error', message: 'Invalid email or password' });
    }

    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    if (!isValidPassword) {
      return res.status(401).json({ status: 'error', message: 'Invalid email or password' });
    }

    const token = generateToken(user);
    sendAuthResponse(res, 200, user, token);

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to login' });
  }
};

// ==================== GET CURRENT USER ====================
export const me = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId }
    });

    if (!user) {
      return res.status(404).json({ status: 'error', message: 'User not found' });
    }

    res.status(200).json({
      status: 'success',
      data: {
        id: user.id,
        name: user.name,
        email: user.email
      }
    });

  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to get user' });
  }
};