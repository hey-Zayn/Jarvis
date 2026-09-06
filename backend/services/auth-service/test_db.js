import dotenv from 'dotenv';
dotenv.config({ path: './.env' });
import { prisma } from './src/lib/prisma.js';

async function test() {
  try {
    console.log('Connecting to database...');
    const user = await prisma.user.findFirst();
    console.log('User found:', user);
  } catch (err) {
    console.error('EXACT PRISMA ERROR:', err);
  } finally {
    await prisma.$disconnect();
  }
}

test();
