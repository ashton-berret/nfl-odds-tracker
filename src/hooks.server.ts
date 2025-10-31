import type { Handle } from '@sveltejs/kit';
import { validateSession } from '$lib/server/auth/session';

export const handle: Handle = async ({ event, resolve }) => {
    const sessionId = event.cookies.get('session');

    if (sessionId) {
        const user = await validateSession(sessionId);
        if (user) {
            event.locals.user = {
                id: user.id,
                email: user.email,
                username: user.username,
                balance: user.balance,
                startingBalance: user.startingBalance
            };
        } else {
            event.locals.user = null;
        }
    } else {
        event.locals.user = null;
    }

    return resolve(event);
};


