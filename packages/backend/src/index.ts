import app from './app';
import { config } from './config';
import { db } from './database/connection';
import { redisService } from './services/RedisService';

async function startServer() {
  try {
    // Test database connection
    console.log('Testing database connection...');
    const dbConnected = await db.testConnection();
    if (!dbConnected) {
      throw new Error('Failed to connect to database');
    }

    // Connect to Redis
    console.log('Connecting to Redis...');
    await redisService.connect();

    if (!redisService.isClientConnected()) {
      console.warn('Redis connection failed - continuing without Redis');
    }

    // Start the server
    const server = app.listen(config.server.port, () => {
      console.log(`🚀 Job Finder API server running on port ${config.server.port}`);
      console.log(`📊 Environment: ${config.server.nodeEnv}`);
      console.log(`🔗 Health check: http://localhost:${config.server.port}/health`);
    });

    // Graceful shutdown
    const gracefulShutdown = async (signal: string) => {
      console.log(`\n${signal} received. Starting graceful shutdown...`);

      server.close(async () => {
        console.log('HTTP server closed');

        try {
          await db.close();
          console.log('Database connection closed');
        } catch (error) {
          console.error('Error closing database connection:', error);
        }

        try {
          await redisService.disconnect();
          console.log('Redis connection closed');
        } catch (error) {
          console.error('Error closing Redis connection:', error);
        }

        console.log('Graceful shutdown completed');
        process.exit(0);
      });

      // Force close after 10 seconds
      setTimeout(() => {
        console.error('Could not close connections in time, forcefully shutting down');
        process.exit(1);
      }, 10000);
    };

    // Handle shutdown signals
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      console.error('Uncaught Exception:', error);
      gracefulShutdown('UNCAUGHT_EXCEPTION');
    });

    process.on('unhandledRejection', (reason, promise) => {
      console.error('Unhandled Rejection at:', promise, 'reason:', reason);
      gracefulShutdown('UNHANDLED_REJECTION');
    });

  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();