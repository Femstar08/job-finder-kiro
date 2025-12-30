const axios = require('axios');

const API_URL = 'http://localhost:3002/api';

async function runTest() {
    try {
        console.log('1. Registering/Logging in test user...');
        const email = `test.debug.${Date.now()}@example.com`;
        const password = 'Password123!';

        let token;
        try {
            const regRes = await axios.post(`${API_URL}/auth/register`, {
                email,
                password,
                firstName: 'Debug',
                lastName: 'User'
            });
            token = regRes.data.data.token;
            console.log('   Registered new user');
        } catch (e) {
            console.log('   Registration failed, trying login...');
            // In case registration fails (e.g. exists), try login (though using timestamp email prevents this)
        }

        if (!token) {
            console.error('Failed to get token');
            return;
        }

        console.log('2. Attempting to create profile with likely frontend payload...');

        const payload = {
            profileName: "Debug Profile",
            jobTitle: "", // Frontend sends empty string for optional fields
            keywords: ["React", "Node"], // Array of strings
            location: {
                city: "", // Empty string
                state: "", // Empty string
                country: "", // Empty string
                remote: true
            },
            contractTypes: ["permanent"],
            salaryRange: {
                min: 50000,
                max: 100000,
                currency: "USD"
            },
            dayRateRange: {
                min: null, // Frontend might send null/undefined or empty string. Let's try what likely causes issues.
                max: null,
                currency: "USD"
            },
            experienceLevel: ["mid"],
            companySize: ["startup"]
        };

        console.log('Payload:', JSON.stringify(payload, null, 2));

        try {
            const res = await axios.post(`${API_URL}/preferences`, payload, {
                headers: { Authorization: `Bearer ${token}` }
            });
            console.log('✅ Success! Status:', res.status);
            console.log('Data:', res.data);
        } catch (error) {
            console.error('❌ Failed! Status:', error.response?.status);
            console.error('Error Data:', JSON.stringify(error.response?.data, null, 2));
        }

    } catch (err) {
        console.error('Test execution failed:', err.message);
        if (err.response) {
            console.error('Response data:', err.response.data);
        }
    }
}

runTest();
