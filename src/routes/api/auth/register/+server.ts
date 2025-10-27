import { json } from '@sveltejs/kit'
import { prisma } from '$lib/server/db';
import { hashPassword } from '$lib/server/auth/password';
import { createSession } from '$lib/server/auth/session';


/**
 * POST /api/auth/register
 * create new user account
 */
export async function POST({ request, cookies }) {
    console.log('[API /auth/register] Registration attempt');

    try {
        const { email, username, password } = await request.json();

        const validatedStartingBalance = startingBalance && startingBalance >= 100 && startingBalance <= 1000000 ? startingBalance : 1000;
        console.log('[API /auth/register] Starting balance:', validatedStartingBalance);

        if (!email || !username || !password) {
            return json({
                success: false,
                error: 'Email, username, and password are required'
            }, { status: 400 });
        }

        if (password.length < 6) {
            return json({
                success: false,
                error: 'Password must be at least 6 characters'
            }, { status: 400 });
        }

        const existingUser = await prisma.user.findFirst({
            where: {
                OR: [
                    { email: email },
                    { username: username }
                ]
            }
        });

        if (existingUser) {
            return json({
                success: false,
                error: 'Email or username already taken'
            }, { status: 400 });
        }

        const passwordHash = await hashPassword(password);

        const user = await prisma.user.create({
            data: {
                email,
                username,
                passwordHash,
                balance: validatedStartingBalance,
                startingBalance: validatedStartingBalance
            }
        });

        console.log(`[API /auth/register] Created user: ${user.username}`);

        const sessionId = await createSession(user.id); // create session and auto login after registration

        // set session cookies
        cookies.set('session', sessionId, {
            path: '/',
            httpOnly: true, // can't be accessed by JS for security
            sameSite: 'strict',
            maxAge: 60 * 60 * 24 * 30 // days
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
        console.error('[API /auth/registration] Error:', error);
        return json({
            success: false,
            error: 'Registration failed.'
        }, { status: 500 });
    }
}
