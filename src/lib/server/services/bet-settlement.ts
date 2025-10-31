// src/lib/server/services/bet-settlement.ts
import { prisma } from '$lib/server/db';
import { ESPNStatsFetcher, type PlayerStats } from '$lib/server/api/espn-stats-fetcher';

interface SettlementResult {
    betId: string;
    userId: string;
    status: 'won' | 'lost' | 'push';
    profit: number;
    payout: number;
    playerName: string;
    actualValue: number;
    line: number;
}

export class BetSettlementService {
    private statsFetcher = new ESPNStatsFetcher();

    /**
     * settle all pending bets for completed games
     */
    async settleCompletedGames(): Promise<{
    gamesSettled: number;
    betsSettled: number;
    results: SettlementResult[];
}> {
    console.log('[BetSettlement] Starting settlement process...');

    // find games that should be completed (commenced > 4 hours ago, not marked completed)
    const fourHoursAgo = new Date(Date.now() - 4 * 60 * 60 * 1000);

    const completedGames = await prisma.game.findMany({
        where: {
            commenceTime: { lt: fourHoursAgo },
            completed: false
        },
        include: {
            homeTeam: true,
            awayTeam: true
        }
    });

    console.log('[BetSettlement] Found', completedGames.length, 'potentially completed games');

    let gamesSettled = 0;
    const allResults: SettlementResult[] = [];

    for (const game of completedGames) {
        console.log('[BetSettlement] Processing game:', game.awayTeam.name, '@', game.homeTeam.name);

        // find ESPN game ID by matching team names and date
        const espnGameId = await this.statsFetcher.findESPNGameId(
            game.homeTeam.name,
            game.awayTeam.name,
            game.commenceTime
        );

        if (!espnGameId) {
            console.log('[BetSettlement] Could not find ESPN game ID, skipping');
            continue;
        }

        console.log('[BetSettlement] Found ESPN game ID:', espnGameId);

        // fetch stats from ESPN
        const gameResult = await this.statsFetcher.fetchGameStats(espnGameId);

        if (!gameResult || !gameResult.completed) {
            console.log('[BetSettlement] Game not completed yet, skipping');
            continue;
        }

        // settle bets for this game
        const results = await this.settleGameBets(game.id, gameResult.playerStats);
        allResults.push(...results);

        // mark game as completed and store ESPN game ID
        await prisma.game.update({
            where: { id: game.id },
            data: {
                completed: true,
                homeScore: gameResult.homeScore,
                awayScore: gameResult.awayScore,
                externalId: espnGameId // store ESPN ID for future reference
            }
        });

        gamesSettled++;
        console.log('[BetSettlement] Settled', results.length, 'bets for game');
    }

    console.log('[BetSettlement] Settlement complete!', {
        gamesSettled,
        betsSettled: allResults.length
    });

    return {
        gamesSettled,
        betsSettled: allResults.length,
        results: allResults
    };
}
    /**
     * settle all pending bets for a sepcific game
     */
    private async settleGameBets(gameId: string, playerStats: PlayerStats[]): Promise<SettlementResult[]> {
        // get all pending bets for the game
        const pendingBets = await prisma.bet.findMany({
            where: {
                prop: { gameId },
                status: 'pending'
            },
            include: {
                prop: {
                    include: {
                        player: true
                    }
                },
                user: true
            }
        });

        console.log('[BET SETTLEMENT] Found: ', pendingBets.length, 'pending bets for the game');

        const settlements: SettlementResult[] = [];
        for (const bet of pendingBets) {
            const playerName = bet.prop.player.name;
            const stats = this.statsFetcher.findPlayerStatsByName(playerStats, playerName);

            if (!stats) {
                console.log('[BET SETTLEMENT] No stats found for player: ', playerName);
                continue;
            }

            const actualValue = this.getActualValue(bet.prop.propType, stats);

            if (actualValue === null) {
                console.log('[BET SETTLEMENT] Could not determine actual value for prop', bet.prop.propType);
                continue;
            }

            // determine outcomes
            const outcome = this.determineOutcome(
                actualValue,
                bet.prop.line,
                bet.side as 'over' | 'under'
            );

            // calculate profit
            const profit = this.calculateProfit(bet.amount, bet.odds, outcome);
            const payout = outcome === 'won' ? bet.amount + profit : (outcome === 'push' ? bet.amount : 0);

            console.log('[BetSettlement] Bet result:', {
                player: playerName,
                propType: bet.prop.propType,
                line: bet.prop.line,
                actual: actualValue,
                side: bet.side,
                outcome,
                profit
            });

            settlements.push({
                betId: bet.id,
                userId: bet.userId,
                status: outcome,
                profit,
                payout,
                playerName,
                actualValue,
                line: bet.prop.line
            });
        }

        if (settlements.length > 0) {
            await this.executeSettlements(settlements);
        }

        return settlements;
    }

    /**
     * get actual stat value based on prop type
     */
    private getActualValue(propType: string, stats: PlayerStats): number | null {
        switch (propType) {
            case 'player_pass_yds':
                return stats.passingYards;
            case 'player_pass_tds':
                return stats.passingTouchdowns;
            case 'player_rush_yds':
                return stats.rushingYards;
            case 'player_rush_tds':
                return stats.rushingTouchdowns;
            case 'player_receiving_yds':
                return stats.receivingYards;
            case 'player_receptions':
                return stats.receptions;
            case 'player_receiving_tds':
                return stats.receivingTouchdowns;
            case 'player_anytime_td':
                return stats.rushingTouchdowns + stats.receivingTouchdowns;
            default:
                console.log('[BET SETTLEMENT] Unknown prop type', propType);
                return null;
        }
    }

    /**
     * determine if bet won, lost, or push
     */
    private determineOutcome(actualValue: number, line:  number, side: 'over' | 'under'): 'won' | 'lost' | 'push' {
        if (actualValue === line) {
            return 'push';
        }

        if (side === 'over') {
            return actualValue > line ? 'won' : 'lost';
        } else {
            return actualValue < line ? 'won' : 'lost';
        }
    }

    /**
     * calculate profit
     */
    private calculateProfit(amount: number, odds: number, outcome: 'won' | 'lost' | 'push'): number {
        if (outcome === 'push') {
            return 0;
        }

        if (outcome === 'lost') {
            return -amount;
        }

        if (odds > 0) {
            // pos odds: +150 means win 150 on 100 bet
            return amount * (odds / 100);
        } else {
            return amount * (100 / Math.abs(odds));
        }
    }

    /**
     * execute all settlements atomically
     */
    private async executeSettlements(settlements: SettlementResult[]): Promise<void> {
        await prisma.$transaction(async (tx) => {
            for (const settlement of settlements) {
                await tx.bet.update({
                    where: { id: settlement.betId },
                    data: {
                        status: settlement.status,
                        profit: settlement.profit,
                        settledAt: new Date()
                    }
                });

                await tx.user.update({
                    where: { id: settlement.userId},
                    data: {
                        balance: {
                            increment: settlement.payout
                        }
                    }
                });

                console.log('[BET SETTLEMENT] Settled bet:', settlement.betId, 'Payout:', settlement.payout);
            }
        });
    }
}
