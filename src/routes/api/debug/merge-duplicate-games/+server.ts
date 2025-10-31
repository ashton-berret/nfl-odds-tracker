import { json } from '@sveltejs/kit';
import { prisma } from '$lib/server/db';
export async function GET() {
    return new Response(`
        <html>
            <body style="font-family: monospace; padding: 20px;">
                <h2>Merge Duplicate Games</h2>
                <p>This will merge duplicate games in the database.</p>
                <button onclick="merge()" style="padding: 10px 20px; font-size: 16px; cursor: pointer;">
                    Run Merge
                </button>
                <pre id="result" style="margin-top: 20px; padding: 10px; background: #f5f5f5;"></pre>

                <script>
                    async function merge() {
                        document.getElementById('result').textContent = 'Running...';
                        try {
                            const response = await fetch('/api/debug/merge-duplicate-games', {
                                method: 'POST'
                            });
                            const data = await response.json();
                            document.getElementById('result').textContent = JSON.stringify(data, null, 2);
                        } catch (error) {
                            document.getElementById('result').textContent = 'Error: ' + error;
                        }
                    }
                </script>
            </body>
        </html>
    `, {
        headers: { 'Content-Type': 'text/html' }
    });
}
export async function POST() {
    console.log('[MERGE] Starting duplicate game merge...');

    const games = await prisma.game.findMany({
        include: {
            homeTeam: true,
            awayTeam: true,
            playerProps: true
        },
        orderBy: {
            commenceTime: 'asc'
        }
    });

    // Group by matchup
    const gameGroups = new Map<string, typeof games>();

    for (const game of games) {
        const key = `${game.awayTeam.name}|${game.homeTeam.name}|${game.commenceTime.toISOString()}`;

        if (!gameGroups.has(key)) {
            gameGroups.set(key, []);
        }
        gameGroups.get(key)!.push(game);
    }

    let mergedCount = 0;
    let deletedCount = 0;

    // Process duplicates
    for (const [matchup, duplicateGames] of gameGroups.entries()) {
        if (duplicateGames.length <= 1) continue;

        console.log(`[MERGE] Processing: ${matchup} (${duplicateGames.length} duplicates)`);

        // Keep the completed one, or the first one if none are completed
        const keepGame = duplicateGames.find(g => g.completed) || duplicateGames[0];
        const deleteGames = duplicateGames.filter(g => g.id !== keepGame.id);

        console.log(`[MERGE]   Keeping: ${keepGame.id} (completed=${keepGame.completed}, externalId=${keepGame.externalId})`);

        for (const deleteGame of deleteGames) {
            console.log(`[MERGE]   Merging ${deleteGame.id} into ${keepGame.id}...`);

            // Move all props from deleteGame to keepGame
            await prisma.playerProp.updateMany({
                where: { gameId: deleteGame.id },
                data: { gameId: keepGame.id }
            });

            const propsCount = await prisma.playerProp.count({
                where: { gameId: keepGame.id }
            });

            console.log(`[MERGE]     Moved props (total now: ${propsCount})`);

            // Delete the duplicate game
            await prisma.game.delete({
                where: { id: deleteGame.id }
            });

            console.log(`[MERGE]     Deleted game ${deleteGame.id}`);
            deletedCount++;
        }

        mergedCount++;
    }

    console.log(`[MERGE] Complete! Merged ${mergedCount} game groups, deleted ${deletedCount} duplicate games`);

    return json({
        success: true,
        mergedGameGroups: mergedCount,
        deletedGames: deletedCount
    });
}
