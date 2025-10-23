import { prisma } from '$lib/server/db';
import { randomBytes } from 'crypto';

/**
 * create a new session for user default to last 30 days
 */
export async function createSession(userId: string): Promise<string> {
    const sessionId = randomBytes(32).toString('hex');

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    await prisma.session.create({
        data: {
            id: sessionId,
            userId: userId,
            expiresAt: expiresAt
        }
    });

    console.log(`[AUTH] Created session for user: ${userId}`);
    return sessionId;
}

/**
 * validate a session and return the user or null if session is invalid or expired
 */
export async function validateSession(sessionId: string) {
    const session = await prisma.session.findUnique({
        where: { id: sessionId },
        include: { user: true }
    });

    if (!session) {
        return null;
    }

    if (session.expiresAt < new Date()) {
        // clean up expired session
        await prisma.session.delete({ where: { id: sessionId } });
        return null;
    }

    return session.user;
}

/**
 * delete a session and logout
 */
export async function deleteSession(sessionId: string): Promise<void> {
    await prisma.session.delete({ where: { id: sessionId } }).catch(() => {});
}
