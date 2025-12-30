import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from './config';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { apiLimiter } from './middleware/rateLimiter';

// Import routes
import preferencesRoutes from './routes/preferences';
import jobsRoutes from './routes/jobs';
import duplicatesRoutes from './routes/duplicates';
import notificationsRoutes from './routes/notifications';
import n8nRoutes from './routes/n8n';
import dataRetentionRoutes from './routes/dataRetention';
import authRoutes from './routes/auth';

const app = express();

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

// CORS configuration
app.use(cors({
  origin: config.server.nodeEnv === 'production'
    ? ['https://your-production-domain.com'] // Update with your production domain
    : ['http://localhost:3000', 'http://127.0.0.1:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting
app.use('/api', apiLimiter);

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  console.log(`Incoming Request: ${req.method} ${req.originalUrl}`); // Added explicit log

  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`${req.method} ${req.path} - ${res.statusCode} - ${duration}ms`);
  });

  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: config.server.nodeEnv,
  });
});

// Root endpoint for connectivity checks (resolves n8n default check)
app.get('/', (req, res) => {
  res.json({
    message: 'Job Finder API is running',
    status: 'online',
    timestamp: new Date().toISOString()
  });
});

// API routes
app.use('/api/preferences', preferencesRoutes);
app.use('/api/jobs', jobsRoutes);
app.use('/api/duplicates', duplicatesRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/n8n', n8nRoutes);
app.use('/api/data-retention', dataRetentionRoutes);
app.use('/api/auth', authRoutes);



// 404 handler
app.use(notFoundHandler);

// Error handling middleware (must be last)
app.use(errorHandler);

export default app;