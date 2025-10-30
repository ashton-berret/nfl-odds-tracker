import { json } from '@sveltejs/kit';
import { DraftKingsFetcher } from '$lib/server/api/draftkings-fetcher';
import { DraftKingsParser } from '$lib/server/api/draftkings-parser';
import { saveDraftKingsProps } from '$lib/server/repositories/props-repository';

export async function GET() {
    console.log('[TEST DK SAVE] Starting Draftkings fetch, parse, and save test');

    try {
        const fetcher = new DraftKingsFetcher();
        const parser = new DraftKingsParser();

        console.log('[TEST DK SAVE] Fetching rushing yards');
        const data = await fetcher.fetchSubcategory('16571', 'Rushing Yards');

        console.log('[TEST-DK-SAVE] Parsing response...');
        const propsByEvent = parser.parseResponse(data);

        // Get first event to test with
        const firstEventId = Array.from(propsByEvent.keys())[0];
        const firstEvent = data.events.find(e => e.id === firstEventId);
        const firstEventProps = propsByEvent.get(firstEventId) || [];

        if (!firstEvent) {
            throw new Error('No event found');
        }

        console.log(`[TEST-DK-SAVE] Testing with event: ${firstEvent.name}`);
        console.log(`[TEST-DK-SAVE] Event has ${firstEventProps.length} props (all alt lines)`);

        // Extract team names
        const homeTeam = firstEvent.participants.find(p => p.venueRole === 'Home');
        const awayTeam = firstEvent.participants.find(p => p.venueRole === 'Away');

        if (!homeTeam || !awayTeam) {
            throw new Error('Could not find home/away teams');
        }

        console.log(`[TEST-DK-SAVE] Home: ${homeTeam.name}, Away: ${awayTeam.name}`);

        // Save to database
        await saveDraftKingsProps(
            firstEventId,
            homeTeam.name,
            awayTeam.name,
            firstEvent.startEventDate,
            firstEventProps
        );

        return json({
            success: true,
            message: 'DraftKings props saved successfully',
            eventId: firstEventId,
            eventName: firstEvent.name,
            propsSaved: firstEventProps.length,
            homeTeam: homeTeam.name,
            awayTeam: awayTeam.name
        });

    } catch (error) {
        console.error('[TEST-DK-SAVE] Test failed:', error);
        return json({
            success: false,
            error: String(error),
            stack: error instanceof Error ? error.stack : undefined
        }, { status: 500 });
    }
}
