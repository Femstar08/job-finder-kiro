const url = 'http://localhost:3002/api/auth';

async function verifyFailures() {
    // 1. Register a user to ensure we have a valid one
    const email = `test_fail_${Date.now()}@example.com`;
    console.log(`Using email: ${email}`);

    try {
        await fetch(`${url}/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password: 'password123', firstName: 'Test', lastName: 'User' })
        });
        console.log('Registered user.');

        // 2. Try non-existent user
        console.log('Testing non-existent user...');
        await fetch(`${url}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'nonexistent_' + Date.now() + '@example.com', password: 'password123' })
        });

        // 3. Try wrong password
        console.log('Testing wrong password...');
        await fetch(`${url}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password: 'WRONGPASSWORD' })
        });

        console.log('Done testing failures.');

    } catch (e) {
        console.error('Error:', e);
    }
}

verifyFailures();
