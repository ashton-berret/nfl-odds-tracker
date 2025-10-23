import { json } from '@sveltejs/kit';
import { prisma } from '$lib/server/db';
import { verifyPassword } from '$lib/server/auth/password';
import { createSession } from '$lib/server/auth/session';


/**
 * POST /api/auth/login
 * login with email, username and password
 */
export async function POST({ request, cookies }) {
    console.log('[API /auth/login] Login Attempt');

    try {
        const { emailOrUsername, password } = await request.json();

        if (!emailOrUsername || !password) {
            return json({
                success: false,
                error: 'Email/username and password are required'
            }, { status: 400 });
        }

        const user = await prisma.user.findFirst({
            where: {
                OR: [
                    { email: emailOrUsername },
                    { username: emailOrUsername }
                ]
            }
        });

        if (!user) {
            return json({
                success: false,
                error: 'Invalid credentials'
            }, { status: 401 });
        }

        const isValidPassword = await verifyPassword(password, user.passwordHash);

        if (!isValidPassword) {
            return json({
                success: false,
                error: 'Invalid credentials'
            }, { status: 401 });
        }

        console.log(`[API /auth/login] User logged in: ${user.username}`);

        // create session
        const sessionId = await createSession(user.id);
        cookies.set('session', sessionId, {
            path: '/',
            httpOnly: true,
            sameSite: 'strict',
            maxAge: 60 * 60 * 24 * 30
        });

        return json({
            success: true,
            user: {
                id: user.id,
                email: user.email,
                username: user.username,
                balance: user.balance
            }
        });
    } catch (error) {
        console.error('[API /auth/login] Error:', error);
        return json({
            success: false,
            error: 'Login failed'
        }, { status: 500 });
    }
}
