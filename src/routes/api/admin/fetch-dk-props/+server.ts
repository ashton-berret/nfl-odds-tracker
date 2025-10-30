import { json } from '@sveltejs/kit';
import { DraftKingsFetcher } from '$lib/server/api/draftkings-fetcher';
import { DraftKingsParser } from '$lib/server/api/draftkings-parser';
import { saveDraftKingsProps } from '$lib/server/repositories/props-repository';

const SUBCATEGORY_IDS = {
    rushing: '16571',
    receiving: '16570',
    passing: '16569',
    touchdown: '12438'
} as const;

export async function POST({ url }) {
    const propType = url.searchParams.get('type') as keyof typeof SUBCATEGORY_IDS || 'rushing';

    console.log(`[API /admin/fetch-dk-props] Fetching DK ${propType} props`);

    try {
        const fetcher = new DraftKingsFetcher();
        const parser = new DraftKingsParser();

        // Fetch data from DraftKings API
        const subcategoryId = SUBCATEGORY_IDS[propType];
        const dkResponse = await fetcher.fetchSubcategory(subcategoryId, propType);

        console.log(`[API /admin/fetch-dk-props] Fetched ${dkResponse.events?.length || 0} events`);

        if (!dkResponse.events || dkResponse.events.length === 0) {
            return json({
                success: true,
                propType,
                eventsProcessed: 0,
                totalPropsSaved: 0,
                message: 'No events found for this prop type'
            });
        }

        // Parse all props from the response
        const propsByEvent = parser.parseResponse(dkResponse);

        console.log(`[API /admin/fetch-dk-props] Parsed props for ${propsByEvent.size} events`);

        let totalPropsSaved = 0;
        let eventsProcessed = 0;

        // Save props for each event
        for (const [eventId, props] of propsByEvent.entries()) {
            const event = dkResponse.events.find(e => e.id === eventId);
            if (!event) {
                console.log(`[API /admin/fetch-dk-props] Skipping event ${eventId} - event data not found`);
                continue;
            }

            // Parse team names
            const teams = fetcher.parseTeamNamesFromEvent(event);
            if (!teams) {
                console.log(`[API /admin/fetch-dk-props] Skipping event ${eventId} - could not parse teams`);
                continue;
            }

            // Merge props that have both over/under
            const mergedProps = parser.mergePropOdds(props);

            console.log(`[API /admin/fetch-dk-props] Event ${eventId} (${event.name}): ${mergedProps.length} props`);

            // Save to database
            await saveDraftKingsProps(
                eventId,
                teams.home,
                teams.away,
                event.startEventDate,
                mergedProps
            );

            totalPropsSaved += mergedProps.length;
            eventsProcessed++;
        }

        return json({
            success: true,
            propType,
            eventsProcessed,
            totalPropsSaved
        });

    } catch (error) {
        console.error('[API /admin/fetch-dk-props] Error:', error);
        return json({
            success: false,
            error: String(error)
        }, { status: 500 });
    }
}
