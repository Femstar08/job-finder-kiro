module.exports = {
    apps: [
        {
            name: 'job-finder-backend',
            script: 'dist/index.js',
            exec_mode: 'fork',
            instances: 1,
            env: {
                NODE_ENV: 'production',
                PORT: 3002
            }
        }
    ]
};
