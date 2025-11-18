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

// Import routes
import { createIncidentRoutes } from './routes/incidents';
import { createCreditRoutes } from './routes/credits';
import { createWebhookRoutes } from './routes/webhooks';

// Import middleware
import { errorHandler, notFoundHandler } from './middleware/errorHandler';

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

// Initialize Qdrant collection
qdrantClient.initialize().catch((error) => {
  console.error('❌ Failed to initialize Qdrant:', error);
});

// Routes
app.get('/', (req, res) => {
  res.json({
    name: 'APSIC Backend API',
    version: '1.0.0',
    description: 'AI Public Safety Intake Commander',
    status: 'operational',
    endpoints: {
      incidents: '/api/incidents',
      credits: '/api/credits',
      webhooks: '/api/webhooks',
      health: '/api/webhooks/health',
    },
  });
});

app.use('/api/incidents', createIncidentRoutes(incidentService));
app.use('/api/credits', createCreditRoutes(creditService));
app.use('/api/webhooks', createWebhookRoutes());

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  console.log('');
  console.log('🚀 APSIC Backend API is running!');
  console.log('📍 Server listening on port:', PORT);
  console.log('🌐 API URL:', `http://localhost:${PORT}`);
  console.log('📊 Health check:', `http://localhost:${PORT}/api/webhooks/health`);
  console.log('');
  console.log('🤖 Gemini API:', process.env.GEMINI_API_KEY ? '✅ Configured' : '❌ Missing');
  console.log('🔄 Opus API:', process.env.OPUS_API_KEY ? '✅ Configured' : '⚠️ Optional');
  console.log('🔍 Qdrant:', process.env.QDRANT_URL || 'http://localhost:6333');
  console.log('💎 Solana:', process.env.SOLANA_RPC_URL || 'Devnet');
  console.log('');
  console.log('Ready to process incidents! 🛡️');
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
