import { json } from '@sveltejs/kit';
import { prisma } from '$lib/server/db';

/**
 * GET /api/sportsbooks?name=DraftKings
 * lookup sportsbook by name
 */
export async function GET({ url }) {
    const name = url.searchParams.get('name');

    if (!name) {
        return json({
            success: false,
            error: 'Name parameter required'
        }, { status: 400 });
    }

    const sportsbook = await prisma.sportsbook.findUnique({
        where: { name: name }
    });

    if (!sportsbook) {
        return json({
            success: false,
            error: 'Sportsbook not found'
        }, { status: 404 });
    }

    return json(sportsbook);
}
