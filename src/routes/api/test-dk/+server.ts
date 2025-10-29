// src/routes/api/test-dk/+server.ts
import { json } from '@sveltejs/kit';
import { DraftKingsFetcher } from '$lib/server/api/draftkings-fetcher';

export async function GET() {
    console.log('[TEST-DK] Starting test');

    try {
        const fetcher = new DraftKingsFetcher();
        const data = await fetcher.fetchSubcategory('16571', 'Rushing Yards');

        return json({
            success: true,
            eventCount: data.events.length,
            marketCount: data.markets.length,
            selectionCount: data.selections.length,
            sampleEvent: data.events[0],
            sampleMarket: data.markets[0],
            sampleSelection: data.selections[0]
        });

    } catch (error) {
        console.error('[TEST-DK] Failed:', error);
        return json({ success: false, error: String(error) }, { status: 500 });
    }
}
