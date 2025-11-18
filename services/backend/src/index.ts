import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Import clients and services
import { GeminiClient } from './lib/geminiClient';
import { OpusClient } from './lib/opusClient';
import { QdrantClient } from './lib/qdrantClient';
import { SolanaClient } from './lib/solanaClient';
import { PDFGenerator } from './lib/pdfGenerator';
import { IncidentService } from './services/incidentService';
import { CreditService } from './services/creditService';
import { BatchService } from './services/batchService';
import { ImportService } from './services/importService';
import { DeliveryService } from './services/deliveryService';
import { RejectionService } from './services/rejectionService';

// Import routes
import { createIncidentRoutes } from './routes/incidents';
import { createCreditRoutes } from './routes/credits';
import { createWebhookRoutes } from './routes/webhooks';
import { createBatchRoutes } from './routes/batch';
import { createImportRoutes } from './routes/import';
import { createRejectionRoutes } from './routes/rejection';

// Import middleware
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { requestTimingMiddleware, logger, log } from './lib/observability';

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 4000;

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true,
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Request timing and observability
app.use(requestTimingMiddleware);

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
});

app.use('/api/', limiter);

// Initialize clients
console.log('🔧 Initializing APSIC services...');

const geminiClient = new GeminiClient(
  process.env.GEMINI_API_KEY || ''
);

const opusClient = new OpusClient(
  process.env.OPUS_API_KEY || '',
  process.env.OPUS_API_URL
);

const qdrantClient = new QdrantClient(
  process.env.QDRANT_URL || 'http://localhost:6333',
  process.env.QDRANT_API_KEY
);

const solanaClient = new SolanaClient(
  process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com',
  process.env.SIC_TOKEN_MINT
);

const pdfGenerator = new PDFGenerator();

// Initialize services
const incidentService = new IncidentService(
  geminiClient,
  opusClient,
  qdrantClient,
  solanaClient,
  pdfGenerator
);

const creditService = new CreditService(solanaClient);

const batchService = new BatchService(
  geminiClient,
  qdrantClient,
  solanaClient
);

const importService = new ImportService();

const deliveryService = new DeliveryService();

const rejectionService = new RejectionService(incidentService);

log.incident('services_initialized', 'system', {
  gemini: !!process.env.GEMINI_API_KEY,
  opus: !!process.env.OPUS_API_KEY,
  qdrant: !!process.env.QDRANT_URL,
  solana: !!process.env.SOLANA_RPC_URL,
});

// Initialize Qdrant collection
qdrantClient.initialize().catch((error) => {
  console.error('❌ Failed to initialize Qdrant:', error);
});

// Routes
app.get('/', (req, res) => {
  res.json({
    name: 'APSIC Backend API',
    version: '2.0.0',
    description: 'AI Public Safety Intake Commander - Enhanced Edition',
    status: 'operational',
    features: [
      'Batch Processing (100-500+ incidents)',
      'Multi-Source Data Import (CSV, JSON, API)',
      'Parallel Execution with Performance Metrics',
      'Google Sheets Export',
      'Email Notifications',
      'Rejection/Correction Workflow',
      'Complete Observability',
    ],
    endpoints: {
      incidents: '/api/incidents',
      batch: '/api/batch',
      import: '/api/import',
      rejection: '/api/rejection',
      credits: '/api/credits',
      webhooks: '/api/webhooks',
      health: '/api/webhooks/health',
      metrics: '/api/metrics',
    },
  });
});

// API Routes
app.use('/api/incidents', createIncidentRoutes(incidentService));
app.use('/api/batch', createBatchRoutes(batchService));
app.use('/api/import', createImportRoutes(importService, batchService));
app.use('/api/rejection', createRejectionRoutes(rejectionService));
app.use('/api/credits', createCreditRoutes(creditService));
app.use('/api/webhooks', createWebhookRoutes());

// Metrics endpoint for observability
app.get('/api/metrics', (req, res) => {
  const { metrics, getHealthMetrics } = require('./lib/observability');
  res.set('Content-Type', 'text/plain');
  res.send(metrics.exportPrometheus());
});

// Health check with detailed metrics
app.get('/api/health', (req, res) => {
  const { getHealthMetrics } = require('./lib/observability');
  res.json(getHealthMetrics());
});

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  console.log('');
  console.log('🚀 APSIC Backend API v2.0 - Enhanced Edition');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📍 Server:', `http://localhost:${PORT}`);
  console.log('📊 Health:', `http://localhost:${PORT}/api/health`);
  console.log('📈 Metrics:', `http://localhost:${PORT}/api/metrics`);
  console.log('');
  console.log('🔌 Integrations:');
  console.log('  🤖 Gemini AI:', process.env.GEMINI_API_KEY ? '✅ Configured' : '❌ Missing');
  console.log('  🔄 Opus:', process.env.OPUS_API_KEY ? '✅ Configured' : '⚠️ Optional');
  console.log('  🔍 Qdrant:', process.env.QDRANT_URL || 'http://localhost:6333');
  console.log('  💎 Solana:', process.env.SOLANA_RPC_URL || 'Devnet');
  console.log('  📊 Sheets:', process.env.GOOGLE_SHEETS_CREDENTIALS ? '✅ Configured' : '⚠️ Optional');
  console.log('  📧 Email:', process.env.SMTP_HOST ? '✅ Configured' : '⚠️ Optional');
  console.log('');
  console.log('🎯 Enhanced Features:');
  console.log('  ⚡ Batch Processing (100-500+ incidents)');
  console.log('  🔀 Parallel Execution with Metrics');
  console.log('  📥 Multi-Source Import (CSV/JSON/API)');
  console.log('  📤 Google Sheets Export');
  console.log('  📬 Email Notifications');
  console.log('  🔄 Rejection/Correction Workflow');
  console.log('  👁️ Complete Observability');
  console.log('');
  console.log('🛡️ Ready to process incidents at scale!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');

  log.incident('server_started', 'system', { port: PORT });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT signal received: closing HTTP server');
  process.exit(0);
});

export default app;
