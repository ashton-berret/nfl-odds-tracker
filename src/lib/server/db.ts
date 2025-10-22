import { PrismaClient } from '@prisma/client';

// prisma client singleton
// have to do this bc when you save a file, the server restarts. without a singleton, a new prisma client would be created everytime. this ensures we use the same client across hot reloads


// in ts, you can add prisma property to the global object so it persists across hot reloads in development
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined; };

// if client exists, use it else create new
export const prisma = globalForPrisma.prisma ?? new PrismaClient({
    log: ['error', 'warn'],
});

// in dev, store the client on the global object (this does nothing in prod since prod doesn't hot reload)
if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.prisma = prisma;
}
