/**
 * Function runs on the server before page loads, fetching data and passing it to the svelte component
 */
export async function load({ fetch }) {
    console.log('[PAGE LOAD] Fetching props and user...');

    try {
        const propsResponse = await fetch('/api/props');
        const propsData = await propsResponse.json();

        const userResponse = await fetch('/api/auth/me');
        const userData = await userResponse.json();

        return {
            props: propsData.props || [],
            count: propsData.count || 0,
            user: userData.user || null
        };

    } catch (error) {
        console.error('[PAGE LOAD] Error:', error);
        return {
            props: [],
            count: 0,
            user: null,
            error: 'Failed to load data'
        };
    }
}
