import { prisma } from '$lib/server/db';
import { ESPNFetcher } from './espn-fetcher';

/**
 * Sync all NFL rosters from ESPN to the db
 *
 * 1. Fetch all 32 NFL teams from ESPN
 * 2. For each team, fetch their roster
 * 3. For each player, upsert into PlayerTeamMapping table
 * 4. Mark existing players as active, set missing as inactive
 */
export async function syncAllNFLRosters(): Promise<{teamsProcessed: number; playersAdded: number; playersUpdated: number; error: string[];}> {
    console.log('[PLAYER SYNC] ===================');
    console.log('[PLAYER SYNC] Starting NFL Roster sync from ESPN');
    console.log('[PLAYER SYNC] ===================');

    const espn = new ESPNFetcher();
    const stats = {
        teamsProcessed: 0,
        playersAdded: 0,
        playersUpdated: 0,
        errors: [] as string[]
    };

    try {
        // fetch all nfl teams
        const teamsData = await espn.fetchAllTeams();
        console.log(`[PLAYER SYNC] Will sync rosters for ${teamsData.length} teams`);

        // loop through each team and sync their roster
        for (const teamWrapper of teamsData) {
            const team = teamWrapper.team;

            try {
                console.log(`\n[PLAYER SYNC] Processing: ${team.displayName} (${team.abbreviation})`);

                const roster = await espn.fetchTeamRoster(team.id);
                console.log(`[PLAYER SYNC] Found ${roster.length} players on roster`);

                for (const athlete of roster) {
                    try {
                        const existing = await prisma.playerTeamMapping.findUnique({
                            where: {
                                playerName_teamName: {
                                    playerName: athlete.fullName,
                                    teamName: team.displayName
                                }
                            }
                        });

                        console.log(`[PlayerSync]   Processing: ${athlete.fullName}`);
                        console.log(`[PlayerSync]     Position object:`, athlete.position);
                        console.log(`[PlayerSync]     Position abbrev:`, athlete.position?.abbreviation);

                        // upsert
                        await prisma.playerTeamMapping.upsert({
                            where: {
                                playerName_teamName: {
                                    playerName: athlete.fullName,
                                    teamName: team.displayName
                                }
                            },
                            update: {
                                position: athlete.position?.abbreviation || 'UNKNOWN',
                                jerseyNumber: athlete.jersey || null,
                                active: true,
                                lastUpdated: new Date()
                            },
                            create: {
                                playerName: athlete.fullName,
                                teamName: team.displayName,
                                position: athlete.position?.abbreviation || 'UNKNOWN',
                                jerseyNumber: athlete.jersey || null,
                                active: true
                            }
                        });

                        // track stats
                        if (existing) {
                            stats.playersUpdated++;
                        } else {
                            stats.playersAdded++;
                            console.log(`[PLAYER SYNC] ✓ Added: ${athlete.fullName} (${athlete.position?.abbreviation})`);
                        }
                    } catch (playerError) {
                        const errorMsg = `Failed to save ${athlete.fullName}: ${playerError}`;
                        console.error(`[PLAYER SYNC] ✗ ${errorMsg}`);
                        stats.errors.push(errorMsg);
                    }
                }

                stats.teamsProcessed++;

                await new Promise(resolve => setTimeout(resolve, 1000)); // 1 sec delay between teams
            } catch (teamError) {
                const errorMsg = `Failed to process ${team.displayName}: ${teamError}`;
                console.error(`[PlayerSync] ✗ ${errorMsg}`);
                stats.errors.push(errorMsg);
            }
        }

        console.log('\n[PLAYER SYNC] ========================================');
        console.log('[PLAYER SYNC] Roster sync complete!');
        console.log(`[PLAYER SYNC] Teams processed: ${stats.teamsProcessed}`);
        console.log(`[PLAYER SYNC] Players added: ${stats.playersAdded}`);
        console.log(`[PLAYER SYNC] Players updated: ${stats.playersUpdated}`);
        console.log(`[PLAYER SYNC] Errors: ${stats.errors.length}`);
        console.log('[PLAYER SYNC] ========================================');

        return stats;
    } catch (error) {
        console.error('[PLAYER SYNC] Fatal Error during roster sync: ', error);
        throw error;
    }
}

/**
 * helper function to find which team a player is on, for when saving props to make sure the team assignment is correct
 */
export async function findPlayerTeam(playerName: string): Promise<string | null> {
    const mapping = await prisma.playerTeamMapping.findFirst({
        where: {
            playerName: playerName,
            active: true
        }
    });

    return mapping?.teamName || null;
}
