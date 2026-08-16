import { PrismaPg } from '@prisma/adapter-pg';
import prismaModule from '../generated/prisma/index.js';

const { PrismaClient } = prismaModule;

if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL must be configured');
}

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
export const prisma = new PrismaClient({ adapter });