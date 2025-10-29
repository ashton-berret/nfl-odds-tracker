import { json } from '@sveltejs/kit';
import { validateSession } from '$lib/server/auth/session';

/**
 * GET /api/auth/me
 * Get currently logged in user
 */
export async function GET({ cookies }) {
    const sessionId = cookies.get('session');
    if (!sessionId) {
        return json({ user: null });
    }

    const user = await validateSession(sessionId);
    if (!user) {
        return json({ user: null });
    }

    return json({
        user: {
            id: user.id,
            email: user.email,
            username: user.username,
            balance: user.balance,
            startingBalance: user.startingBalance
        }
    });
}
