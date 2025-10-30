// src/routes/api/test-dk/+server.ts

import { json } from '@sveltejs/kit';
import { DraftKingsFetcher } from '$lib/server/api/draftkings-fetcher';
import { DraftKingsParser } from '$lib/server/api/draftkings-parser';

export async function GET() {
    console.log('[TEST-DK] Starting DraftKings fetch and parse test');

    try {
        const fetcher = new DraftKingsFetcher();
        const parser = new DraftKingsParser();

        // Fetch rushing yards only for now
        console.log('[TEST-DK] Fetching rushing yards...');
        const data = await fetcher.fetchSubcategory('16571', 'Rushing Yards');

        console.log('[TEST-DK] Parsing response...');
        const propsByEvent = parser.parseResponse(data);

        // Get first event's props as sample
        const firstEventId = Array.from(propsByEvent.keys())[0];
        const firstEventProps = propsByEvent.get(firstEventId) || [];

        console.log('[TEST-DK] Sample props:', firstEventProps.slice(0, 3));

        return json({
            success: true,
            totalEvents: propsByEvent.size,
            totalPropsAcrossAllEvents: Array.from(propsByEvent.values())
                .reduce((sum, props) => sum + props.length, 0),
            sampleEvent: {
                eventId: firstEventId,
                propCount: firstEventProps.length,
                sampleProps: firstEventProps.slice(0, 3)
            }
        });

    } catch (error) {
        console.error('[TEST-DK] Test failed:', error);
        return json({ success: false, error: String(error) }, { status: 500 });
    }
}
