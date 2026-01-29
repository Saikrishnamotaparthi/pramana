module.exports = {
    apps: [
        {
            name: 'payment-web',
            script: 'node_modules/next/dist/bin/next',
            args: 'start',
            instances: 'max', // Use all available CPUs (2 vCPUs)
            exec_mode: 'cluster', // Cluster mode for better performance
            autorestart: true,
            watch: false,
            max_memory_restart: '1G', // Restart if memory exceeds 1GB (Safe for 8GB server)
            env: {
                NODE_ENV: 'production',
                PORT: 3000,
            },
        },
    ],
};
