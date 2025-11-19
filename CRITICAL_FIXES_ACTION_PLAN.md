# APSIC Critical Fixes - Action Plan

**Priority:** URGENT
**Target Timeline:** 2 weeks for critical items
**Generated:** 2025-11-19

---

## 🚨 CRITICAL FIXES (Do First - Week 1)

### 1. Database Migrations (BLOCKER)
**Priority:** P0 - CRITICAL
**Estimated Time:** 30 minutes
**Assignee:** Backend Developer

**Issue:**
No Prisma migrations exist. Database cannot be deployed.

**Steps to Fix:**
```bash
# Navigate to backend
cd services/backend

# Create initial migration
npx prisma migrate dev --name initial_schema

# Generate Prisma client
npx prisma generate

# Test migration
npx prisma migrate reset  # (in dev only)
npx prisma db push

# Verify
npx prisma studio  # Should show all tables
```

**Verification:**
- [ ] Migration file created in `prisma/migrations/`
- [ ] Can run `npx prisma migrate deploy` successfully
- [ ] All tables visible in Prisma Studio
- [ ] Foreign keys working correctly

---

### 2. Remove Authentication Bypass (SECURITY)
**Priority:** P0 - CRITICAL SECURITY ISSUE
**Estimated Time:** 15 minutes
**Assignee:** Backend Developer

**Issue:**
File: `services/backend/src/middleware/auth.ts:24-28`
Authentication bypass allows anyone to impersonate wallets.

**Current Code (VULNERABLE):**
```typescript
// For demo purposes, skip signature verification if no signature provided
if (!signature || !message) {
  console.log('[AUTH] Skipping signature verification for demo');
  (req as any).wallet = wallet;
  return next();
}
```

**Fixed Code:**
```typescript
// REMOVE THIS ENTIRE IF BLOCK IN PRODUCTION

// Always require signature in production
if (process.env.NODE_ENV === 'production' && (!signature || !message)) {
  return res.status(401).json({
    error: 'Signature verification required in production'
  });
}

// For development only
if (process.env.NODE_ENV === 'development' && (!signature || !message)) {
  console.warn('[AUTH] ⚠️ DEVELOPMENT MODE: Skipping signature verification');
  (req as any).wallet = wallet;
  return next();
}
```

**Verification:**
- [ ] Production mode requires signature
- [ ] Dev mode has clear warning
- [ ] All API tests still pass

---

### 3. Fix CORS Wildcard (SECURITY)
**Priority:** P0 - CRITICAL SECURITY ISSUE
**Estimated Time:** 10 minutes
**Assignee:** Backend Developer

**Issue:**
File: `services/backend/src/index.ts:41-44`
CORS origin set to '*' by default.

**Current Code (VULNERABLE):**
```typescript
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',  // ⚠️ DANGEROUS
  credentials: true,
}));
```

**Fixed Code:**
```typescript
app.use(cors({
  origin: process.env.CORS_ORIGIN || (
    process.env.NODE_ENV === 'production'
      ? false  // Block all origins if not configured
      : 'http://localhost:3000'  // Dev default
  ),
  credentials: true,
}));

// Add validation
if (process.env.NODE_ENV === 'production' && !process.env.CORS_ORIGIN) {
  console.error('❌ CORS_ORIGIN must be set in production');
  process.exit(1);
}
```

**Verification:**
- [ ] Production requires explicit CORS_ORIGIN
- [ ] Application exits if CORS_ORIGIN missing in production
- [ ] Dev defaults to localhost:3000

---

### 4. Setup API Keys & Test Integrations
**Priority:** P0 - BLOCKER
**Estimated Time:** 4 hours
**Assignee:** Tech Lead

**Tasks:**

**A) Obtain Gemini API Key**
```bash
# 1. Go to https://ai.google.dev/
# 2. Get API key
# 3. Test with curl:
curl -H 'Content-Type: application/json' \
     -d '{"contents":[{"parts":[{"text":"Hello"}]}]}' \
     "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=YOUR_API_KEY"
# 4. Add to .env:
echo "GEMINI_API_KEY=your_key_here" >> services/backend/.env
```

**B) Setup Opus (if using)**
```bash
# 1. Create account at [Opus Platform URL]
# 2. Get API key
# 3. Create APSIC workflow using the definition in opusClient.ts
# 4. Test workflow execution
# 5. Add to .env:
echo "OPUS_API_KEY=your_key_here" >> services/backend/.env
echo "OPUS_API_URL=https://api.opus.com/v1" >> services/backend/.env
```

**C) Alternative: Remove Opus Dependency (Faster)**
```typescript
// If Opus is not available, process incidents directly
// in incidentService.ts without workflow orchestration

// Comment out Opus workflow trigger
// Process with Gemini directly
```

**Verification:**
- [ ] Gemini API responds successfully
- [ ] Can generate embeddings
- [ ] Either Opus works OR code modified to skip it
- [ ] Can submit test incident end-to-end

---

### 5. Add Input Validation & Sanitization
**Priority:** P0 - SECURITY
**Estimated Time:** 4 hours
**Assignee:** Backend Developer

**A) Add XSS Protection**
```typescript
// Install: npm install xss
import xss from 'xss';

// In validation.ts, add sanitization:
const IncidentSubmissionSchema = z.object({
  text: z.string()
    .min(10)
    .max(5000)
    .transform((val) => xss(val)), // Sanitize HTML/XSS
  // ... rest of schema
});
```

**B) Add File Size Enforcement**
```typescript
// In incident routes
import multer from 'multer';

const upload = multer({
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB
    files: 8, // Max 8 files
  },
  fileFilter: (req, file, cb) => {
    // Only allow specific MIME types
    const allowedMimes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'audio/mpeg',
      'audio/wav',
      'video/mp4',
    ];

    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  },
});
```

**C) Add Rate Limiting Per Wallet**
```typescript
// Create new middleware: walletRateLimit.ts
const walletLimiters = new Map<string, any>();

export const walletRateLimit = (maxRequests: number, windowMs: number) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const wallet = req.body.reporter_wallet || (req as any).wallet;

    if (!wallet) return next();

    if (!walletLimiters.has(wallet)) {
      walletLimiters.set(wallet, {
        count: 0,
        resetAt: Date.now() + windowMs,
      });
    }

    const limiter = walletLimiters.get(wallet);

    if (Date.now() > limiter.resetAt) {
      limiter.count = 0;
      limiter.resetAt = Date.now() + windowMs;
    }

    if (limiter.count >= maxRequests) {
      return res.status(429).json({
        error: 'Too many requests from this wallet',
      });
    }

    limiter.count++;
    next();
  };
};

// Use in routes:
app.use('/api/incidents', walletRateLimit(10, 15 * 60 * 1000)); // 10 per 15 min
```

**Verification:**
- [ ] XSS attempts are sanitized
- [ ] Large files rejected
- [ ] Invalid MIME types rejected
- [ ] Rate limit per wallet enforced
- [ ] All tests pass

---

### 6. Replace In-Memory Credits with Database
**Priority:** P0 - SECURITY/STABILITY
**Estimated Time:** 3 hours
**Assignee:** Backend Developer

**Issue:**
Credits stored in Map() - resets on server restart, can be manipulated.

**Steps:**

**A) Update CreditService**
```typescript
// services/backend/src/services/creditService.ts

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export class CreditService {
  async getCredits(walletAddress: string): Promise<number> {
    // Try database first
    const user = await prisma.user.findUnique({
      where: { wallet_address: walletAddress },
      select: { credits: true },
    });

    if (user) {
      return user.credits;
    }

    // Create new user with starting credits
    const newUser = await prisma.user.create({
      data: {
        wallet_address: walletAddress,
        credits: 10, // Starting balance
      },
    });

    return newUser.credits;
  }

  async decrementCredits(
    walletAddress: string,
    amount: number,
    incidentId?: string
  ): Promise<boolean> {
    try {
      await prisma.$transaction(async (tx) => {
        // Get current credits with lock
        const user = await tx.user.findUnique({
          where: { wallet_address: walletAddress },
        });

        if (!user || user.credits < amount) {
          throw new Error('Insufficient credits');
        }

        // Decrement credits
        await tx.user.update({
          where: { wallet_address: walletAddress },
          data: { credits: user.credits - amount },
        });

        // Log transaction
        await tx.creditLedger.create({
          data: {
            wallet_address: walletAddress,
            amount: -amount,
            transaction_type: 'incident_processing',
            incident_id: incidentId,
          },
        });
      });

      return true;
    } catch (error) {
      console.error('Credit decrement error:', error);
      return false;
    }
  }

  async addCredits(
    walletAddress: string,
    amount: number
  ): Promise<void> {
    await prisma.$transaction(async (tx) => {
      await tx.user.upsert({
        where: { wallet_address: walletAddress },
        create: {
          wallet_address: walletAddress,
          credits: amount,
        },
        update: {
          credits: { increment: amount },
        },
      });

      await tx.creditLedger.create({
        data: {
          wallet_address: walletAddress,
          amount,
          transaction_type: 'purchase',
        },
      });
    });
  }
}
```

**B) Remove Mock Credit System**
```typescript
// In solanaClient.ts, remove:
// - private mockCreditsMap
// - getMockCredits()
// - setMockCredits()
// - decrementMockCredits()

// Only keep real Solana token balance reading
```

**Verification:**
- [ ] Credits persist across server restarts
- [ ] Credit transactions logged in database
- [ ] Concurrent credit checks handled correctly
- [ ] Credit history queryable

---

## 🔴 HIGH PRIORITY (Week 1-2)

### 7. Add Structured Logging
**Priority:** P1 - HIGH
**Estimated Time:** 4 hours
**Assignee:** Backend Developer

**Install:**
```bash
npm install winston
```

**Create logger.ts:**
```typescript
// services/backend/src/lib/logger.ts
import winston from 'winston';

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'apsic-backend' },
  transports: [
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error'
    }),
    new winston.transports.File({
      filename: 'logs/combined.log'
    }),
    new winston.transports.Console({
      format: winston.format.simple(),
    }),
  ],
});

// Usage:
// logger.info('Incident created', { incidentId, wallet });
// logger.error('Gemini API error', { error: error.message });
```

**Replace all console.log:**
```bash
# Find and replace
console.log → logger.info
console.error → logger.error
console.warn → logger.warn
```

**Verification:**
- [ ] Logs written to files
- [ ] JSON format for parsing
- [ ] Error logs separate
- [ ] Includes context (incidentId, wallet, etc.)

---

### 8. Implement Error Tracking (Sentry)
**Priority:** P1 - HIGH
**Estimated Time:** 2 hours
**Assignee:** Backend/Frontend Developer

**Install:**
```bash
# Backend
cd services/backend
npm install @sentry/node

# Frontend
cd apps/web-frontend
npm install @sentry/nextjs
npx @sentry/wizard@latest -i nextjs
```

**Backend Setup:**
```typescript
// services/backend/src/index.ts (top of file)
import * as Sentry from '@sentry/node';

if (process.env.NODE_ENV === 'production') {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV,
    tracesSampleRate: 1.0,
  });
}

// Error handler (before other error handlers)
app.use(Sentry.Handlers.requestHandler());
app.use(Sentry.Handlers.errorHandler());
```

**Frontend Setup:**
```typescript
// Auto-configured by wizard
// Just need to set SENTRY_DSN in .env.local
```

**Verification:**
- [ ] Test error captured in Sentry dashboard
- [ ] Source maps uploaded
- [ ] User context attached
- [ ] Release tracking works

---

### 9. Create Production Dockerfile
**Priority:** P1 - HIGH
**Estimated Time:** 3 hours
**Assignee:** DevOps/Backend Developer

**Create: `services/backend/Dockerfile.prod`**
```dockerfile
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies
RUN npm ci --only=production

# Copy source
COPY . .

# Build TypeScript
RUN npm run build

# Generate Prisma client
RUN npx prisma generate

# ---

FROM node:20-alpine

WORKDIR /app

# Copy built app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/package*.json ./

# Run migrations and start
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/index.js"]

EXPOSE 4000
```

**Create: `apps/web-frontend/Dockerfile.prod`**
```dockerfile
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# ---

FROM node:20-alpine

WORKDIR /app

COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/public ./public

CMD ["npm", "start"]

EXPOSE 3000
```

**Verification:**
- [ ] Docker build succeeds
- [ ] Image size reasonable (<500MB)
- [ ] Container starts successfully
- [ ] Health check passes

---

### 10. Implement Basic Tests
**Priority:** P1 - HIGH
**Estimated Time:** 20 hours
**Assignee:** Full Team

**Create test structure:**
```bash
mkdir -p services/backend/tests/{unit,integration}
```

**Install:**
```bash
cd services/backend
npm install --save-dev jest ts-jest @types/jest supertest @types/supertest
```

**Configure jest.config.js:**
```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: ['**/*.test.ts'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
  ],
};
```

**Priority Test Files:**

**A) Credit Service Tests (2 hours)**
```typescript
// tests/unit/creditService.test.ts
describe('CreditService', () => {
  it('should get credits for new wallet', async () => {
    // Test
  });

  it('should decrement credits atomically', async () => {
    // Test
  });

  it('should fail with insufficient credits', async () => {
    // Test
  });
});
```

**B) Incident API Tests (4 hours)**
```typescript
// tests/integration/incidents.test.ts
import request from 'supertest';
import app from '../../src/index';

describe('POST /api/incidents/submit', () => {
  it('should submit incident with valid data', async () => {
    const res = await request(app)
      .post('/api/incidents/submit')
      .send({
        text: 'Test incident',
        reporter_wallet: 'valid_wallet_address',
      });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('incident_id');
  });

  it('should reject without wallet', async () => {
    // Test
  });

  it('should reject with insufficient credits', async () => {
    // Test
  });
});
```

**C) Validation Tests (2 hours)**
```typescript
// tests/unit/validation.test.ts
// Test XSS sanitization
// Test file size limits
// Test MIME type validation
```

**D) Gemini Client Tests (with mocks) (4 hours)**
```typescript
// tests/unit/geminiClient.test.ts
// Mock Gemini API
// Test extraction
// Test error handling
```

**Verification:**
- [ ] `npm test` runs successfully
- [ ] At least 30 tests passing
- [ ] Coverage >50% for critical paths
- [ ] CI can run tests

---

## 🟡 MEDIUM PRIORITY (Week 2-3)

### 11. Implement Proper Error Propagation
**Priority:** P2 - MEDIUM
**Estimated Time:** 6 hours

**Current issues:**
- Gemini errors return fallback silently
- Qdrant errors return empty arrays

**Fix geminiClient.ts:**
```typescript
// Remove silent fallbacks
// Instead, throw errors and handle at service layer

async extractAndClassify(...): Promise<ExtractedFields> {
  try {
    // ... existing code
  } catch (error: any) {
    logger.error('Gemini extraction failed', { error: error.message });

    // Don't return fallback - throw!
    throw new Error(`AI extraction failed: ${error.message}`);
  }
}
```

**Add retry logic:**
```typescript
// Install: npm install async-retry
import retry from 'async-retry';

async extractAndClassify(...): Promise<ExtractedFields> {
  return await retry(
    async () => {
      // API call here
    },
    {
      retries: 3,
      minTimeout: 1000,
      maxTimeout: 5000,
      onRetry: (error, attempt) => {
        logger.warn('Retrying Gemini API', { attempt, error: error.message });
      },
    }
  );
}
```

---

### 12. Setup CI/CD Pipeline
**Priority:** P2 - MEDIUM
**Estimated Time:** 8 hours

**Create `.github/workflows/ci.yml`:**
```yaml
name: CI

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: apsic_test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'

      - name: Install backend deps
        run: |
          cd services/backend
          npm ci

      - name: Run migrations
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/apsic_test
        run: |
          cd services/backend
          npx prisma migrate deploy

      - name: Run tests
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/apsic_test
          GEMINI_API_KEY: ${{ secrets.GEMINI_API_KEY }}
        run: |
          cd services/backend
          npm test

      - name: Build
        run: |
          cd services/backend
          npm run build

  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: cd services/backend && npm ci
      - run: cd services/backend && npm run lint
```

---

### 13. Add Health Checks
**Priority:** P2 - MEDIUM
**Estimated Time:** 2 hours

```typescript
// Update /api/health endpoint
app.get('/api/health', async (req, res) => {
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    checks: {
      database: 'unknown',
      qdrant: 'unknown',
      gemini: 'unknown',
    },
  };

  // Check database
  try {
    await prisma.$queryRaw`SELECT 1`;
    health.checks.database = 'ok';
  } catch (error) {
    health.checks.database = 'error';
    health.status = 'degraded';
  }

  // Check Qdrant
  try {
    await qdrantClient.getCollectionInfo();
    health.checks.qdrant = 'ok';
  } catch (error) {
    health.checks.qdrant = 'error';
    health.status = 'degraded';
  }

  // Check Gemini
  try {
    await geminiClient.generateEmbedding('test');
    health.checks.gemini = 'ok';
  } catch (error) {
    health.checks.gemini = 'error';
    health.status = 'degraded';
  }

  const statusCode = health.status === 'ok' ? 200 : 503;
  res.status(statusCode).json(health);
});
```

---

## 📋 CHECKLIST SUMMARY

### Before First Deploy
- [ ] Database migrations created and tested
- [ ] API keys configured and tested
- [ ] Authentication bypass removed
- [ ] CORS configured properly
- [ ] Input sanitization added
- [ ] Credits moved to database
- [ ] Structured logging implemented
- [ ] Error tracking (Sentry) setup
- [ ] Production Dockerfiles created
- [ ] Critical tests written (30+ tests)
- [ ] Health checks implemented
- [ ] Environment variables documented

### Before Production Launch
- [ ] All above items complete
- [ ] Comprehensive test coverage (80%+)
- [ ] Load testing performed
- [ ] Security audit completed
- [ ] Backup/restore tested
- [ ] Monitoring dashboards created
- [ ] Incident response plan documented
- [ ] On-call rotation established

---

## 🚀 Quick Start (For Developers)

```bash
# 1. Fix migrations
cd services/backend
npx prisma migrate dev --name init

# 2. Get API keys
# - Gemini: https://ai.google.dev/
# Add to .env

# 3. Remove auth bypass
# Edit src/middleware/auth.ts per instructions above

# 4. Fix CORS
# Edit src/index.ts per instructions above

# 5. Run tests (after writing them)
npm test

# 6. Start development
docker-compose up -d  # Start postgres, qdrant
npm run dev

# 7. Test incident submission
curl -X POST http://localhost:4000/api/incidents/submit \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Test incident",
    "reporter_wallet": "test_wallet_123"
  }'
```

---

**Document Owner:** DevOps/Tech Lead
**Last Updated:** 2025-11-19
**Next Review:** After Week 1 completion
