import pkg from '@prisma/client';
const { PrismaClient } = pkg;

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is missing in .env file');
}

const prisma = new PrismaClient({
  log: ['error', 'warn'],
});

export default prisma;

