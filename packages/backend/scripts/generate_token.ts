
import jwt from 'jsonwebtoken';
import { UserRepository } from '../src/database/repositories/UserRepository';
import { config } from '../src/config';
import { db } from '../src/database';
import bcrypt from 'bcryptjs';

async function generateToken() {
    try {
        const userRepository = new UserRepository();

        // 1. Try to find an existing user
        console.log('Checking for existing users...');
        const users = await db.manyOrNone('SELECT * FROM users LIMIT 1');

        let user;

        if (users.length > 0) {
            user = users[0];
            console.log(`Found existing user: ${user.email}`);
        } else {
            // 2. Create a default admin user if none exists
            console.log('No users found. Creating default n8n admin user...');
            const email = 'n8n@jobfinder.local';
            const password = 'n8n_secure_password_CHANGE_ME';
            const passwordHash = await bcrypt.hash(password, 10);

            user = await db.one(
                `INSERT INTO users (
          email, 
          password_hash, 
          first_name, 
          last_name
        ) VALUES ($1, $2, $3, $4) 
        RETURNING *`,
                [email, passwordHash, 'N8N', 'Bot']
            );

            console.log(`Created user: ${email} with password: ${password}`);
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
        // Close DB connection
        process.exit(0);
    }
}

generateToken();
