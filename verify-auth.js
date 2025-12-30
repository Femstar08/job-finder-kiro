const url = 'http://localhost:3000/api/auth';

async function verify() {
    const email = `test_${Date.now()}@example.com`;
    console.log(`Using email: ${email}`);

    try {
        console.log('\n1. Registering...');
        const regRes = await fetch(`${url}/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password: 'password123', firstName: 'Test', lastName: 'User' })
        });
        const regData = await regRes.json();
        console.log('Register Status:', regRes.status);
        if (!regRes.ok) console.log('Register Error:', regData);

        console.log('\n2. Logging in...');
        const loginRes = await fetch(`${url}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password: 'password123' })
        });
        const loginData = await loginRes.json();
        console.log('Login Status:', loginRes.status);

        if (loginData.token) {
            console.log('Token received');
            console.log('\n3. Accessing Protected Route (with token)...');
            const protectedRes = await fetch('http://localhost:3002/api/jobs/matches', {
                headers: { 'Authorization': `Bearer ${loginData.token}` }
            });
            console.log('Protected Route Status:', protectedRes.status);

            console.log('\n4. Accessing Protected Route (NO token)...');
            const noTokenRes = await fetch('http://localhost:3002/api/jobs/matches');
            console.log('No Token Route Status:', noTokenRes.status); // Should be 401
        } else {
            console.log('Login Failed:', loginData);
        }

    } catch (e) {
        console.error('Error:', e);
    }
}

verify();
