<script lang="ts">
    let email = '';
    let username = '';
    let password = '';
    let result = '';

    async function register() {
        const response = await fetch('/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, username, password })
        });
        result = JSON.stringify(await response.json(), null, 2);
    }

    async function login() {
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'appliation/json' },
            body: JSON.stringify( {emailOrUsername: email, password })
        });
        result = JSON.stringify(await response.json(), null, 2);
    }

    async function checkUser() {
        const response = await fetch('/api/auth/me');
        result = JSON.stringify(await response.json(), null, 2);
    }
</script>

<div class="p-8">
    <h1 class="text-2xl font-bold mb-4">Test Auth System</h1>

    <input bind:value={email} placeholder="Email" class="border p-2 mr-2" />
    <input bind:value={username} placeholder="Username" class="border p-2 mr-2" />
    <input bind:value={password} type="password" placeholder="Password" class="border p-2 mr-2" />

    <button on:click={register} class="bg-blue-500 text-white px-4 py-2 mr-2">Register</button>
    <button on:click={login} class="bg-green-500 text-white px-4 py-2 mr-2">Login</button>
    <button on:click={checkUser} class="bg-gray-500 text-white px-4 py-2">Check User</button>

    <pre class="mt-4 p-4 bg-gray-100">{result}</pre>
</div>
