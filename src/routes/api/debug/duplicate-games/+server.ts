import { json } from '@sveltejs/kit';
import { prisma } from '$lib/server/db';

export async function GET() {
    console.log('[DEBUG] Checking for duplicate games...');

    // Get all games with their teams
    const games = await prisma.game.findMany({
        include: {
            homeTeam: true,
            awayTeam: true
        },
        orderBy: {
            commenceTime: 'asc'
        }
    });

    console.log(`[DEBUG] Total games in database: ${games.length}`);

    // Group by home team + away team + date
    const gameGroups = new Map<string, typeof games>();

    for (const game of games) {
        const key = `${game.awayTeam.name}|${game.homeTeam.name}|${game.commenceTime.toISOString()}`;

        if (!gameGroups.has(key)) {
            gameGroups.set(key, []);
        }
        gameGroups.get(key)!.push(game);
    }

    // Find duplicates
    const duplicates = Array.from(gameGroups.entries())
        .filter(([key, games]) => games.length > 1)
        .map(([key, games]) => ({
            matchup: key,
            count: games.length,
            games: games.map(g => ({
                id: g.id,
                externalGameId: g.externalGameId,
                externalId: g.externalId,
                completed: g.completed,
                homeScore: g.homeScore,
                awayScore: g.awayScore
            }))
        }));

    console.log(`[DEBUG] Found ${duplicates.length} duplicate game matchups`);

    duplicates.forEach(dup => {
        console.log(`[DEBUG] Duplicate: ${dup.matchup}`);
        console.log(`[DEBUG]   Count: ${dup.count}`);
        dup.games.forEach((g, i) => {
            console.log(`[DEBUG]   Game ${i + 1}: ID=${g.id}, externalGameId=${g.externalGameId}, externalId=${g.externalId}, completed=${g.completed}`);
        });
    });

    // Also check for games with same externalId
    const gamesWithExternalId = await prisma.game.findMany({
        where: {
            externalId: { not: null }
        },
        select: {
            id: true,
            externalId: true,
            homeTeam: { select: { name: true } },
            awayTeam: { select: { name: true } }
        }
    });

    const externalIdGroups = new Map<string, typeof gamesWithExternalId>();

    for (const game of gamesWithExternalId) {
        if (!externalIdGroups.has(game.externalId!)) {
            externalIdGroups.set(game.externalId!, []);
        }
        externalIdGroups.get(game.externalId!)!.push(game);
    }

    const duplicateExternalIds = Array.from(externalIdGroups.entries())
        .filter(([id, games]) => games.length > 1);

    console.log(`[DEBUG] Found ${duplicateExternalIds.length} games with duplicate externalIds`);

    return json({
        totalGames: games.length,
        duplicateMatchups: duplicates,
        duplicateExternalIds: duplicateExternalIds.map(([id, games]) => ({
            externalId: id,
            count: games.length,
            games: games.map(g => ({
                id: g.id,
                matchup: `${g.awayTeam.name} @ ${g.homeTeam.name}`
            }))
        }))
    });
}
