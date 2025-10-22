/**
 * Function runson the server before page loads, fetching data and passing it to the svelte component
 */
export async function load({ fetch }) {
    console.log('[PAGE LOAD] Fetching props...');

    try {
        const response = await fetch('/api/props');
        const data = await response.json();

        return {
            props: data.props || [],
            count: data.count || 0
        };
    } catch (error) {
        console.error('[PAGE LOAD] Error:', error);
        return {
            props: [],
            count: 0,
            error: 'Failed to load page'
        };
    }
}
