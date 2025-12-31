
import jwt from 'jsonwebtoken';
import { UserRepository } from '../src/database/repositories/UserRepository';
import { config } from '../src/config';

async function generateToken() {
    try {
        const userRepository = new UserRepository();
        const email = 'n8n@jobfinder.local';

        // 1. Try to find the admin user
        console.log('Checking for n8n admin user...');
        let user = await userRepository.findByEmail(email);

        if (user) {
            console.log(`Found existing user: ${user.email}`);
        } else {
            // 2. Create a default admin user if none exists
            console.log('User not found. Creating default n8n admin user...');
            const password = 'n8n_secure_password_CHANGE_ME';

            // UserRepository.create handles password hashing automatically
            try {
                user = await userRepository.create({
                    email,
                    password,
                    firstName: 'N8N',
                    lastName: 'Bot'
                });
                console.log(`Created user: ${email} with password: ${password}`);
            } catch (createError) {
                // Fallback: check if any user exists to use instead
                console.warn('Failed to create specific n8n user, checking for any existing user...');
                // We can't easily "get any user" with UserRepository purely, but let's assume valid DB
                throw createError;
            }
        }

        if (!user) {
            throw new Error('Could not find or create a user for token generation.');
        }

        // 3. Generate a long-lived token (1 year)
        const payload = {
            userId: user.id,
            email: user.email
        };

        const token = jwt.sign(payload, config.jwt.secret as string, {
            expiresIn: '365d', // 1 year
            issuer: 'job-finder-api',
            audience: 'job-finder-app'
        });

        console.log('\n=============================================');
        console.log('GENERATED TOKEN (Valid for 1 year):');
        console.log('=============================================');
        console.log(token);
        console.log('=============================================\n');
        console.log('Use this token in your n8n "Job Finder API Auth" credential.');

    } catch (error) {
        console.error('Failed to generate token:', error);
    } finally {
        process.exit(0);
    }
}

generateToken();
