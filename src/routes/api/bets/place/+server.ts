import { json } from '@sveltejs/kit';
import { prisma } from '$lib/server/db';
import { validateSession } from '$lib/server/auth/session';

/**
 * POST /api/bets/place
 */
export async function POST({ request, cookies }) {
    console.log('[API /bets/place] Bet placement attempt');

    try {
        const sessionId = cookies.get('session');
        if (!sessionId) {
            return json({
                success: false,
                error: 'Must be logged in to place a bet'
            }, { status: 401 });
        }

        const user = await validateSession(sessionId);
        if (!user) {
            return json({
                success: false,
                error: 'Invalid session'
            }, { status: 401 });
        }

        // bet details
        const { propId, sportsbookId, side, amount, odds } = await request.json();
        if (!propId || !sportsbookId || !side || !amount || !odds) {
            return json({
                success: false,
                error: 'Missing required fields'
            }, { status: 400 });
        }

        if (side !== 'over' && side !== 'under') {
            return json({
                success: false,
                error: 'Side must be "over" or "under"'
            }, { status: 400 });
        }

        if (amount <= 0) {
            return json({
                success: false,
                error: 'Bet amount must be positive'
            }, { status: 400 });
        }

        if (user.balance < amount) {
            return json({
                success: false,
                error: `Insufficient balance. You have $${user.balance.toFixed(2)}`
            }, { status: 400 });
        }

        // verify prop exists
        const prop = await prisma.playerProp.findUnique({
            where: { id: propId },
            include: {
                player: true,
                game: {
                    include: {
                        homeTeam: true,
                        awayTeam: true
                    }
                }
            }
        });

        if (!prop) {
            return json({
                success: false,
                error: 'Prop not found'
            }, { status: 404 });
        }

        // ensure game hasn't started yet
        if (prop.game.commenceTime < new Date()) {
            return json({
                success: false,
                error: 'Cannot bet on games that have already started'
            }, { status: 400 });
        }

        const bet = await prisma.$transaction(async (tx) => {
            // deduct amt from users balance
            await tx.user.update({
                where: { id: user.id },
                data: {
                    balance: {
                        decrement: amount
                    }
                }
            });

            // create the bet
            return await tx.bet.create({
                data: {
                    userId: user.id,
                    propId: propId,
                    sportsbookId: sportsbookId,
                    side: side,
                    amount: amount,
                    odds: odds,
                    status: 'pending'
                }
            });
        });

        console.log(`[API /bets/place] Bet placed: User ${user.username} bet $${amount} on ${side}`);

        const updatedUser = await prisma.user.findUnique({
            where: { id: user.id }
        });

        return json({
            success: true,
            bet: {
                id: bet.id,
                amount: bet.amount,
                odds: bet.odds,
                side: bet.side
            },
            newBalance: updatedUser?.balance || 0
        });
    } catch (error) {
        console.error('[API /bets/place] Error:', error);
        return json({
            success: false,
            error: 'Failed to place bet'
        }, { status:  500 });
    }
}
