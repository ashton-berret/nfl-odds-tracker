import { json } from '@sveltejs/kit';
import { deleteSession } from '$lib/server/auth/session';

/**
 * POST /api/auth/logout
 */
export async function POST({ cookies }) {
    const sessionId = cookies.get('session');

    if (sessionId) {
        await deleteSession(sessionId);
    }

    // clear cookies
    cookies.delete('session', { path: '/' });

    return json({ success: true });
}
