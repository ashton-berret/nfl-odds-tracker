// src/routes/api/bets/place-parlay/+server.ts
// FOR FUTURE REFERENCE -> idea: see if sportsbooks promoted parlays or specials are more likely to hit
import { json } from '@sveltejs/kit';
import { prisma } from '$lib/server/db';
import { validateSession } from '$lib/server/auth/session';

interface ParlayLeg {
    propId: string;
    sportsbookId: string;
    side: 'over' | 'under';
    odds: number;
}

/**
 * calculate combined odds for parlay
 */
function calculateCombinedOdds(legs: ParlayLeg): number {
    console.log('[PARLAY API] Calculating combined odds for', legs.length, 'legs');

    // convert each leg's american odds to decimal
    const decimalOdds = legs.map(leg => {
        const americanOdds = leg.odds;
        let decimal = number;

        if (americanOdds > 0) {
            decimal = (americanOdds / 100) + 1;
        } else {
            decimal = (100 / Math.abs(americanOdds)) + 1;
        }
        console.log('[PARLAY API] Leg odds:', americanOdds, '→ decimal:', decimal.toFixed(4));

        return decimal;
    });

    // multiply decimal odds together
    const combinedDecimal = decimalOdds.reduce((acc, odds) => acc * odds, 1);
    console.log('[PARLAY API] Combined decimal odds:', combinedDecimal.toFixed(4));

    // convert back to american
    let americanOdds = number;
    if (combinedDecimal >= 2.0) {
        americanOdds = Math.round((combinedDecimal - 1) * 100);
    } else {
        americanOdds = Math.round(-100 / (combinedDecimal - 1));
    }

    console.log('[PARLAY API] Combined american odds:', americanOdds);
    return americanOdds;
}

/**
 * calculate potential payout
 */
function calculateParlayPayout(amount: number, combinedOdds: number): number {
    if (combinedOdds > 0) {
        return amount + (amount * combinedOdds / 100);
    } else {
        return amount + (amount * 100 / Math.abs(combinedOdds));
    }
}

/**
 * POST /api/bets/place-parlay
 */
export async function POST({ request, cookies }) {
    console.log('[PARLAY API] Received parlay bet request');

    const sessionId = cookies.get('session');
    if (!sessionId) {
        console.log('[PARLAY API] No session found');
        return json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    const user = await validateSession(sessionId);
    if (!user) {
        console.log('[PARLAY API] Invalid session');
        return json({ success: false, error: 'Invalid session' }, { status: 401 });
    }

    console.log('[PARLAY API] User authenticated:', user.username);

    const { legs, amount } = await request.json();

    console.log('[PARLAY API] Parlay details:', {
        userId: user.id,
        legs: legs.length,
        amount
    });

    // validation
    if (!legs || !Array.isArray(legs) || legs.length < 2) {
        console.log('[PARLAY API] Invalid legs - need at least 2');
        return json({ success: false, error: 'Parlay must have at least two legs' }, { status: 400 });
    }

    if (legs.length > 10) {
        console.log('[PARLAY API] Too many legs: ', legs.length);
        return json({ success: false, error: 'Maximum 10 legs per parlay' }, { status: 400 });
    }

    if (!amount || amount <= 0) {
        console.log('[PARLAY API] Invalid amount: ', amount);
        return json({ success: false, error: 'Invalid bet amount' }, { status: 400 });
    }

    if (amount > user.balance) {
        console.log('[PARLAY API] Insufficient balance. Needs:', amount, 'Has:', user.balance);
        return json({ success: false, error: 'Insufficient balance' }, { status: 400 });
    }

    // validate all props exist and are from different games
    const gameIds = new Set(props.map(p => p.gameId));
    if (gameIds.size !== props.length) {
        console.log('[PARLAY API] Multiple legs from same game detected');
        return json({ success: false, error: 'All parlay legs must be from different games' }, { status: 400 });
    }

    console.log('[PARLAY API] All validations passed. Creating parlay...');

    // Calculate combined odds
    const combinedOdds = calculateCombinedOdds(legs);
    const potentialPayout = calculateParlayPayout(amount, combinedOdds);

    console.log('[PARLAY API] Parlay math:', {
        amount,
        combinedOdds,
        potentialPayout: potentialPayout.toFixed(2),
        potentialProfit: (potentialPayout - amount).toFixed(2)
    });

    try {
        // Create parlay and legs in a transaction
        const parlay = await prisma.$transaction(async (tx) => {
            // Deduct balance
            await tx.user.update({
                where: { id: user.id },
                data: { balance: { decrement: amount } }
            });

            console.log('[PARLAY API] Balance deducted:', amount);

            // Create parlay
            const newParlay = await tx.parlay.create({
                data: {
                    userId: user.id,
                    totalAmount: amount,
                    combinedOdds: combinedOdds,
                    status: 'pending'
                }
            });

            console.log('[PARLAY API] Parlay created with ID:', newParlay.id);

            // Create legs
            for (const leg of legs) {
                await tx.parlayLeg.create({
                    data: {
                        parlayId: newParlay.id,
                        propId: leg.propId,
                        sportsbookId: leg.sportsbookId,
                        side: leg.side,
                        odds: leg.odds
                    }
                });
                console.log('[PARLAY API] Created leg:', leg.propId, leg.side, leg.odds);
            }

            return newParlay;
        });

        // Fetch updated user balance
        const updatedUser = await prisma.user.findUnique({
            where: { id: user.id },
            select: { balance: true }
        });

        console.log('[PARLAY API] Parlay placed successfully!', {
            parlayId: parlay.id,
            newBalance: updatedUser?.balance
        });

        return json({
            success: true,
            parlayId: parlay.id,
            newBalance: updatedUser?.balance,
            combinedOdds,
            potentialPayout
        });

    } catch (error) {
        console.error('[PARLAY API] Error creating parlay:', error);
        return json({ success: false, error: 'Failed to place parlay bet' }, { status: 500 });
    }
}
