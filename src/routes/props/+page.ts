/**
 * Props page load function
 * Loads all available props for browsing and filtering
 */
export async function load({ fetch }) {
    console.log('[PROPS PAGE LOAD] Fetching props...');

    try {
        const response = await fetch('/api/props');
        const data = await response.json();

        console.log('[PROPS PAGE LOAD] Loaded', data.count, 'props');

        return {
            props: data.props || [],
            count: data.count || 0
        };
    } catch (error) {
        console.error('[PROPS PAGE LOAD] Error:', error);
        return {
            props: [],
            count: 0,
            error: 'Failed to load props'
        };
    }
}
