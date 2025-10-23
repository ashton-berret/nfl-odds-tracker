/**
 * Dashboard page load function
 * Loads summary data for the user's dashboard
 */
export async function load({ fetch, parent }) {
    console.log('[DASHBOARD LOAD] Fetching dashboard data...');

    // get user from parent layout
    const { user } = await parent();

    // if not logged in, return minimal data
    if (!user) {
        console.log('[DASHBOARD LOAD] No user logged in, showing public view');
        return {
            recentBets: [],
            stats: null,
            topProps: []
        };
    }

    try {
        const betsResponse = await fetch('/api/bets/my-bets');
        const betsData = await betsResponse.json();

        console.log('[DASHBOARD LOAD] Raw bets data:', JSON.stringify(betsData.bets?.[0], null, 2));

        // take only the 5 most recent bets
        const recentBets = (betsData.bets || []).slice(0, 5);

        console.log('[DASHBOARD LOAD] First bet structure:', recentBets[0]);
        console.log('[DASHBOARD LOAD] Does bet.player exist?', !!recentBets[0]?.player);
        console.log('[DASHBOARD LOAD] Does bet.prop exist?', !!recentBets[0]?.prop);

        // calculate quick stats
        const allBets = betsData.bets || [];
        const settledBets = allBets.filter((b: any) => b.status === 'won' || b.status === 'lost');
        const wonBets = allBets.filter((b: any) => b.status === 'won');
        const pendingBets = allBets.filter((b: any) => b.status === 'pending');

        const stats = {
            totalBets: allBets.length,
            wonBets: wonBets.length,
            lostBets: settledBets.length - wonBets.length,
            pendingBets: pendingBets.length,
            winRate: settledBets.length > 0 ? (wonBets.length / settledBets.length * 100).toFixed(1) : '0.0',
            totalProfit: betsData.totalProfit || 0
        };

        console.log('[DASHBOARD LOAD] Stats calculated:', stats);

        // fetch top 5 props for "hot props" section
        const propsResponse = await fetch('/api/props');
        const propsData = await propsResponse.json();
        const topProps = (propsData.props || []).slice(0, 5);

        console.log('[DASHBOARD LOAD] Loaded', topProps.length, 'hot props');

        return {
            recentBets,
            stats,
            topProps
        };

    } catch (error) {
        console.error('[DASHBOARD LOAD] Error fetching dashboard data:', error);
        return {
            recentBets: [],
            stats: null,
            topProps: [],
            error: 'Failed to load dashboard data'
        };
    }
}
