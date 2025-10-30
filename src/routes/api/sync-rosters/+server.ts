import { json } from '@sveltejs/kit';
import { prisma } from '$lib/server/db';
import { ESPNFetcher } from '$lib/server/api/espn-fetcher';

export async function POST() {
    console.log('[API /sync-rosters] Starting roster sync');

    try {
        const fetcher = new ESPNFetcher();

        // Fetch all teams
        const teams = await fetcher.fetchAllTeams();
        console.log(`[API /sync-rosters] Found ${teams.length} teams`);

        let teamsCreated = 0;
        let teamsUpdated = 0;
        let totalPlayers = 0;

        for (const espnTeam of teams) {
            const teamName = espnTeam.team.displayName;
            const teamAbbr = espnTeam.team.abbreviation;

            console.log(`[API /sync-rosters] Processing: ${teamName} (${teamAbbr})`);

            // Create/update team in Team table
            const existingTeam = await prisma.team.findUnique({
                where: { name: teamName }
            });

            let team;
            if (existingTeam) {
                team = await prisma.team.update({
                    where: { name: teamName },
                    data: { abbreviation: teamAbbr }
                });
                teamsUpdated++;
                console.log(`[API /sync-rosters] ✓ Updated team: ${teamName}`);
            } else {
                team = await prisma.team.create({
                    data: {
                        name: teamName,
                        abbreviation: teamAbbr
                    }
                });
                teamsCreated++;
                console.log(`[API /sync-rosters] ✓ Created team: ${teamName}`);
            }

            // Fetch roster for this team
            const roster = await fetcher.fetchTeamRoster(espnTeam.team.id);
            console.log(`[API /sync-rosters] Fetched ${roster.length} players for ${teamName}`);

            // Mark all existing mappings for this team as inactive
            await prisma.playerTeamMapping.updateMany({
                where: { teamName: teamName },
                data: { active: false }
            });

            // Upsert each player
            for (const athlete of roster) {
                const playerName = athlete.displayName;
                const position = athlete.position?.abbreviation || 'UNKNOWN';

                await prisma.playerTeamMapping.upsert({
                    where: {
                        playerName_teamName: {
                            playerName: playerName,
                            teamName: teamName
                        }
                    },
                    update: {
                        position: position,
                        active: true
                    },
                    create: {
                        playerName: playerName,
                        teamName: teamName,
                        position: position,
                        active: true
                    }
                });
            }

            totalPlayers += roster.length;

            // Rate limiting - wait 200ms between team requests
            await new Promise(resolve => setTimeout(resolve, 200));
        }

        console.log('[API /sync-rosters] Sync complete!');

        return json({
            success: true,
            teamsCreated,
            teamsUpdated,
            totalPlayers,
            message: `Synced ${teams.length} teams with ${totalPlayers} players`
        });

    } catch (error) {
        console.error('[API /sync-rosters] Error:', error);
        return json({
            success: false,
            error: String(error)
        }, { status: 500 });
    }
}
