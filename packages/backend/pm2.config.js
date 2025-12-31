module.exports = {
    apps: [
        {
            name: 'job-finder-backend',
            script: 'src/index.ts',
            interpreter: '/usr/bin/ts-node', // path to global ts-node on VPS
            env: {
                NODE_ENV: 'production',
                PORT: 3002
            }
        }
    ]
};
