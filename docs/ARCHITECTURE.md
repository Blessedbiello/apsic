# Technical Architecture: APSIC
**AI Public Safety Intake Commander**

**Version:** 1.0
**Last Updated:** 2025-11-18

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Architecture Principles](#2-architecture-principles)
3. [Component Architecture](#3-component-architecture)
4. [Data Architecture](#4-data-architecture)
5. [Integration Architecture](#5-integration-architecture)
6. [Security Architecture](#6-security-architecture)
7. [Deployment Architecture](#7-deployment-architecture)
8. [Scalability & Performance](#8-scalability--performance)

---

## 1. System Overview

### 1.1 High-Level Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│                           CLIENT LAYER                                │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │         Next.js Frontend (React + Tailwind + TypeScript)       │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐    │  │
│  │  │  Reporter   │  │   Results   │  │  Admin Dashboard    │    │  │
│  │  │   Panel     │  │   Panel     │  │  (Incident List)    │    │  │
│  │  └─────────────┘  └─────────────┘  └─────────────────────┘    │  │
│  │                                                                  │  │
│  │  State: Zustand/React Query | Wallet: @solana/wallet-adapter   │  │
│  └────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────┬───────────────────────────────────┘
                                   │ REST API (HTTPS + JSON)
                                   │ WebSocket (future: real-time updates)
                                   ▼
┌──────────────────────────────────────────────────────────────────────┐
│                         APPLICATION LAYER                             │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │      Backend API Server (Node.js + TypeScript + Express)       │  │
│  │                                                                  │  │
│  │  ┌──────────────────────┐  ┌──────────────────────────────┐   │  │
│  │  │  API Routes          │  │  Middleware                  │   │  │
│  │  │  - POST /incidents   │  │  - Authentication           │   │  │
│  │  │  - GET /incidents    │  │  - Rate Limiting            │   │  │
│  │  │  - GET /credits      │  │  - Error Handling           │   │  │
│  │  │  - POST /webhooks    │  │  - Request Validation       │   │  │
│  │  └──────────────────────┘  └──────────────────────────────┘   │  │
│  │                                                                  │  │
│  │  ┌──────────────────────────────────────────────────────────┐  │  │
│  │  │              Service Layer (Business Logic)              │  │  │
│  │  │  ┌─────────────┐ ┌──────────────┐ ┌─────────────────┐   │  │  │
│  │  │  │  Incident   │ │   Credit     │ │    Workflow     │   │  │  │
│  │  │  │  Service    │ │   Service    │ │    Orchestrator │   │  │  │
│  │  │  └─────────────┘ └──────────────┘ └─────────────────┘   │  │  │
│  │  └──────────────────────────────────────────────────────────┘  │  │
│  │                                                                  │  │
│  │  ┌──────────────────────────────────────────────────────────┐  │  │
│  │  │                   Client Layer                           │  │  │
│  │  │  ┌────────────┐ ┌────────────┐ ┌────────────┐          │  │  │
│  │  │  │Opus Client │ │Qdrant      │ │Solana RPC  │          │  │  │
│  │  │  │            │ │Client      │ │Client      │          │  │  │
│  │  │  └────────────┘ └────────────┘ └────────────┘          │  │  │
│  │  └──────────────────────────────────────────────────────────┘  │  │
│  └────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────┘
                                   │
        ┌──────────────────────────┼──────────────────────────┐
        │                          │                          │
        ▼                          ▼                          ▼
┌────────────────┐      ┌────────────────────┐    ┌─────────────────┐
│  ORCHESTRATION │      │    VECTOR STORE    │    │   BLOCKCHAIN    │
│                │      │                    │    │                 │
│  Opus Platform │      │  Qdrant Cluster    │    │ Solana Devnet   │
│                │      │                    │    │                 │
│  ┌──────────┐  │      │  Collection:       │    │  SPL Token:     │
│  │ Workflow │  │      │  "incidents"       │    │  SIC (Sentinel  │
│  │ Engine   │  │      │                    │    │  Incident       │
│  │          │  │      │  768-dim vectors   │    │  Credit)        │
│  │ 1.Intake │  │      │  Cosine similarity │    │                 │
│  │ 2.Understand│◄─────┤  HNSW index        │    │  Read balances  │
│  │ 3.Decide │  │      │                    │    │  Verify wallets │
│  │ 4.Review │  │      └────────────────────┘    └─────────────────┘
│  │ 5.Audit  │  │
│  │ 6.Deliver│  │
│  └────┬─────┘  │
│       │        │
│       │ Calls  │
│       ▼        │
│  ┌──────────┐  │
│  │ Gemini   │  │
│  │ API      │  │
│  │(Multimodal)│ │
│  └──────────┘  │
└────────────────┘
        │
        ▼
┌────────────────────────────────────────────────────────────────────┐
│                          DATA LAYER                                 │
│                                                                     │
│  ┌───────────────────┐         ┌────────────────────────────┐     │
│  │  PostgreSQL       │         │  Object Storage (S3/R2)    │     │
│  │                   │         │                            │     │
│  │  Tables:          │         │  Buckets:                  │     │
│  │  - incidents      │         │  - incident-uploads/       │     │
│  │  - audit_logs     │         │    - images/               │     │
│  │  - users          │         │    - audio/                │     │
│  │  - credits_ledger │         │    - video/                │     │
│  │  - reviews        │         │    - documents/            │     │
│  └───────────────────┘         └────────────────────────────┘     │
└────────────────────────────────────────────────────────────────────┘
```

### 1.2 Request Flow

**Incident Submission Flow:**

```
1. User (Browser)
   └─> Connect Wallet (Solana Wallet Adapter)
   └─> Fill Form (text + upload files)
   └─> Click "Submit"
       │
       ▼
2. Frontend (Next.js)
   └─> Validate inputs
   └─> Upload files to S3/R2 (get URLs)
   └─> POST /api/incidents/submit
       │
       ▼
3. Backend API
   └─> Authenticate wallet signature
   └─> Check credits (Solana RPC or cache)
   └─> Return 402 if insufficient
   └─> Normalize payload
   └─> Trigger Opus workflow (async)
   └─> Return { incident_id, status: "processing" }
       │
       ▼
4. Opus Workflow
   └─> Stage 1: Intake (normalize, fetch context)
   └─> Stage 2: Understand (Gemini: extract, classify, summarize)
   └─> Stage 3: Decide (rules + AI validation)
   └─> Stage 4: Review (agentic + human if needed)
   └─> Stage 5: Audit (generate comprehensive log)
   └─> Stage 6: Deliver (callback to backend)
       │
       ▼
5. Backend (Post-Processing)
   └─> Receive audit log from Opus
   └─> Generate embedding (Gemini or OpenAI)
   └─> Upsert to Qdrant
   └─> Query similar incidents (top-3)
   └─> Save to PostgreSQL
   └─> Decrement credits (off-chain ledger)
   └─> Notify frontend (webhook or polling)
       │
       ▼
6. Frontend (Results Display)
   └─> Show severity + summary + actions
   └─> Display similar incidents
   └─> Provide audit log download (JSON)
```

---

## 2. Architecture Principles

### 2.1 Design Principles

1. **AI-First, Human-in-the-Loop**
   - AI handles classification and recommendations
   - Humans review high-severity and low-confidence cases
   - Full audit trail for accountability

2. **Modular & Extensible**
   - Each component (Gemini, Opus, Qdrant, Solana) is replaceable
   - Domain-specific playbooks can be added
   - API-first design for third-party integrations

3. **Transparent & Auditable**
   - Every decision is logged with reasoning
   - Provenance tracking from input to output
   - Downloadable audit artifacts

4. **Scalable & Performant**
   - Async workflow processing
   - Vector search for fast similarity matching
   - Horizontal scaling of backend services

5. **Secure by Design**
   - Wallet-based authentication
   - Input validation and sanitization
   - Rate limiting and DDoS protection
   - PII redaction (future)

### 2.2 Technology Choices

| Requirement | Technology | Rationale |
|-------------|-----------|-----------|
| **Frontend Framework** | Next.js 14+ (App Router) | SSR, performance, developer experience |
| **Styling** | Tailwind CSS | Utility-first, rapid prototyping |
| **State Management** | Zustand + React Query | Simple, performant, server-state caching |
| **Backend Runtime** | Node.js 20+ | Ecosystem, TypeScript support, async I/O |
| **API Framework** | Express or Fastify | Mature, flexible, middleware ecosystem |
| **Type Safety** | TypeScript | Catch errors at compile-time, better DX |
| **Workflow Engine** | Opus | Built for AI orchestration, tracing, human-in-the-loop |
| **AI Model** | Google Gemini (multimodal) | Text + image + audio + video support |
| **Vector Database** | Qdrant | Open-source, performant, easy to deploy |
| **Blockchain** | Solana (Devnet) | Fast, low-cost, SPL token support |
| **Database** | PostgreSQL | ACID compliance, JSON support, mature |
| **Object Storage** | AWS S3 or Cloudflare R2 | Scalable, cost-effective |
| **ORM** | Prisma (optional) | Type-safe queries, migrations |

---

## 3. Component Architecture

### 3.1 Frontend Architecture

**Technology Stack:**
- **Framework:** Next.js 14+ (App Router)
- **UI Library:** React 18+
- **Styling:** Tailwind CSS 3+
- **State Management:** Zustand (global state) + React Query (server state)
- **Wallet Integration:** @solana/wallet-adapter-react
- **Form Handling:** React Hook Form + Zod validation
- **File Uploads:** react-dropzone + S3 direct upload

**Directory Structure:**
```
apps/web-frontend/
├── src/
│   ├── app/                      # Next.js App Router
│   │   ├── layout.tsx
│   │   ├── page.tsx              # Home/Reporter panel
│   │   ├── incidents/
│   │   │   ├── [id]/page.tsx    # Incident detail
│   │   │   └── page.tsx          # Incident list (admin)
│   │   └── api/                  # API routes (if needed)
│   ├── components/
│   │   ├── ui/                   # Reusable UI components
│   │   │   ├── Button.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── Input.tsx
│   │   │   └── Badge.tsx
│   │   ├── reporter/
│   │   │   ├── IncidentForm.tsx
│   │   │   ├── FileUploader.tsx
│   │   │   └── WalletConnect.tsx
│   │   ├── results/
│   │   │   ├── SeverityDisplay.tsx
│   │   │   ├── SimilarIncidents.tsx
│   │   │   └── AuditLogViewer.tsx
│   │   └── admin/
│   │       ├── IncidentTable.tsx
│   │       └── IncidentDetail.tsx
│   ├── lib/
│   │   ├── api.ts                # API client (fetch wrapper)
│   │   ├── solana.ts             # Wallet utilities
│   │   └── utils.ts              # Helpers
│   ├── store/
│   │   ├── useWalletStore.ts
│   │   └── useIncidentStore.ts
│   ├── types/
│   │   └── index.ts              # TypeScript types
│   └── styles/
│       └── globals.css
├── public/
├── package.json
├── tsconfig.json
└── tailwind.config.ts
```

**Key Components:**

1. **WalletConnect.tsx**
   ```tsx
   - Uses @solana/wallet-adapter-react
   - Displays connected wallet address
   - Shows credit balance
   - Handles connect/disconnect
   ```

2. **IncidentForm.tsx**
   ```tsx
   - Text input (required)
   - Incident type selector
   - File upload (image/audio/video)
   - Form validation (Zod)
   - Submit handler
   ```

3. **SeverityDisplay.tsx**
   ```tsx
   - Color-coded severity badge (Low/Medium/High/Critical)
   - Numeric score (0-100)
   - Visual gauge or progress bar
   ```

4. **SimilarIncidents.tsx**
   ```tsx
   - List of 3 similar incidents from Qdrant
   - Each card: title, severity, date, snippet
   - Click to view details
   ```

5. **AuditLogViewer.tsx**
   ```tsx
   - Collapsible JSON tree viewer
   - Download JSON button
   - (Future) Generate PDF button
   ```

### 3.2 Backend Architecture

**Technology Stack:**
- **Runtime:** Node.js 20+
- **Language:** TypeScript
- **Framework:** Express (or Fastify for performance)
- **ORM:** Prisma (optional, for type safety)
- **Validation:** Zod
- **Authentication:** Wallet signature verification
- **Rate Limiting:** express-rate-limit

**Directory Structure:**
```
services/backend/
├── src/
│   ├── index.ts                  # Entry point
│   ├── server.ts                 # Express app setup
│   ├── routes/
│   │   ├── incidents.ts          # Incident endpoints
│   │   ├── credits.ts            # Credit endpoints
│   │   └── webhooks.ts           # Opus callbacks
│   ├── services/
│   │   ├── incidentService.ts    # Business logic
│   │   ├── creditService.ts
│   │   └── workflowService.ts
│   ├── lib/
│   │   ├── opusClient.ts         # Opus API wrapper
│   │   ├── qdrantClient.ts       # Qdrant client
│   │   ├── geminiClient.ts       # Gemini API wrapper
│   │   ├── solanaClient.ts       # Solana RPC client
│   │   └── s3Client.ts           # S3/R2 client
│   ├── middleware/
│   │   ├── auth.ts               # Wallet authentication
│   │   ├── rateLimit.ts
│   │   ├── validation.ts
│   │   └── errorHandler.ts
│   ├── models/                   # Prisma models or plain types
│   │   └── schema.prisma
│   ├── types/
│   │   └── index.ts
│   └── utils/
│       ├── logger.ts
│       └── helpers.ts
├── prisma/
│   └── schema.prisma
├── package.json
├── tsconfig.json
└── .env.example
```

**Key Services:**

1. **incidentService.ts**
   ```typescript
   - createIncident(payload): Validate, check credits, trigger workflow
   - getIncident(id): Fetch from DB with audit log
   - listIncidents(filters): Paginated list
   - getSimilarIncidents(embedding): Query Qdrant
   ```

2. **creditService.ts**
   ```typescript
   - getCredits(wallet): Check balance (mock or Solana RPC)
   - decrementCredits(wallet, amount): Update ledger
   - getPriorityTier(wallet): Standard/Premium/Enterprise
   ```

3. **workflowService.ts**
   ```typescript
   - triggerOpusWorkflow(payload): Start Opus job
   - handleOpusCallback(auditLog): Process results
   - retryFailedWorkflow(incidentId): Retry logic
   ```

4. **opusClient.ts**
   ```typescript
   - startJob(workflowName, payload)
   - getJobStatus(jobId)
   - registerCallback(url)
   ```

5. **qdrantClient.ts**
   ```typescript
   - upsertIncident(id, vector, payload)
   - searchSimilar(vector, limit, filter)
   - deleteIncident(id)
   ```

### 3.3 Opus Workflow Architecture

**Workflow Definition:**
- **Name:** `APSIC_Public_Safety_Intake_v1`
- **Trigger:** API call from backend
- **Output:** Audit log JSON sent to webhook

**Stage Details:**

**1. Intake Stage**
```yaml
nodes:
  - name: data_import
    type: external_api
    inputs:
      - incident_id
      - text
      - media_urls
      - reporter_wallet
      - timestamp
    outputs:
      - normalized_payload

  - name: context_fetch (optional)
    type: http_request
    description: Fetch external context (geocoding, weather, etc.)
    inputs:
      - normalized_payload
    outputs:
      - external_context
```

**2. Understand Stage**
```yaml
nodes:
  - name: gemini_extract
    type: ai_model
    model: gemini-1.5-pro
    inputs:
      - text
      - image_urls
      - audio_transcript
    prompt: |
      Extract entities, classify severity, detect emotional tone.
      Return JSON with: incident_type, severity_score, severity_label,
      entities (location, time, parties), emotion, risk_indicators.
    outputs:
      - extracted_fields

  - name: gemini_summarize
    type: ai_model
    model: gemini-1.5-pro
    inputs:
      - extracted_fields
    prompt: |
      Generate 2-3 sentence summary and recommend next actions.
    outputs:
      - summary
      - recommended_actions
      - urgency
```

**3. Decide Stage**
```yaml
nodes:
  - name: rules_engine
    type: code
    language: javascript
    inputs:
      - severity_score
      - risk_indicators
      - incident_type
    code: |
      let route = "LogOnly";
      let triggers = [];

      if (severity_score > 80) {
        route = "Escalate";
        triggers.push("severity>80");
      }
      // ... more rules
      return { route, triggers };
    outputs:
      - route
      - rules_triggered

  - name: ai_validation
    type: ai_model
    model: gemini-1.5-flash
    inputs:
      - summary
      - route
      - rules_triggered
    prompt: |
      Does this routing seem appropriate? Should it be adjusted?
    outputs:
      - ai_validation_result
```

**4. Review Stage**
```yaml
nodes:
  - name: agentic_review
    type: ai_model
    model: gemini-1.5-pro
    inputs:
      - summary
      - route
    prompt: |
      Check for policy compliance, bias, missing info, legal concerns.
    outputs:
      - agentic_review_result

  - name: human_review (conditional)
    type: human_task
    trigger_condition: |
      severity_label in ['High', 'Critical'] OR
      agentic_review.overall_passed === false
    inputs:
      - full_incident_data
      - agentic_review_result
    outputs:
      - human_decision
      - reviewer_notes
```

**5. Audit Stage**
```yaml
nodes:
  - name: generate_audit_log
    type: code
    language: javascript
    inputs:
      - all_previous_outputs
    code: |
      // Construct comprehensive JSON audit log
      return auditLog;
    outputs:
      - audit_log_json
```

**6. Deliver Stage**
```yaml
nodes:
  - name: export_data
    type: multi_output
    outputs:
      - google_sheets_append
      - email_notification
      - webhook_callback (to backend)
```

### 3.4 Database Schema (PostgreSQL)

**Schema (Prisma):**

```prisma
// prisma/schema.prisma

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

model User {
  id              String      @id @default(cuid())
  wallet_address  String      @unique
  credits         Int         @default(0)
  priority_tier   String      @default("standard") // standard, premium, enterprise
  staked          Boolean     @default(false)
  created_at      DateTime    @default(now())
  updated_at      DateTime    @updatedAt

  incidents       Incident[]  @relation("Reporter")
  reviews         Review[]
}

model Incident {
  id                String      @id @default(cuid())
  reporter_id       String
  reporter          User        @relation("Reporter", fields: [reporter_id], references: [id])

  text              String      @db.Text
  incident_type     String?     // harassment, accident, cyber, infrastructure, other
  media_urls        String[]    // Array of S3 URLs

  severity_score    Float?
  severity_label    String?     // Low, Medium, High, Critical

  summary           String?     @db.Text
  recommended_actions String[]
  urgency           String?     // immediate, within_1_hour, within_24_hours, routine

  route             String?     // LogOnly, Review, Escalate, Immediate
  status            String      @default("processing") // processing, completed, failed

  extracted_fields  Json?       // Entities, location, parties, etc.

  embedding         Float[]?    // Vector embedding (if stored in DB)

  opus_job_id       String?
  opus_status       String?

  created_at        DateTime    @default(now())
  updated_at        DateTime    @updatedAt

  audit_log         AuditLog?
  reviews           Review[]
  similar_incidents SimilarIncident[]

  @@index([severity_score])
  @@index([incident_type])
  @@index([created_at])
}

model AuditLog {
  id              String      @id @default(cuid())
  incident_id     String      @unique
  incident        Incident    @relation(fields: [incident_id], references: [id], onDelete: Cascade)

  audit_json      Json        @db.JsonB  // Full audit trail

  created_at      DateTime    @default(now())
}

model Review {
  id              String      @id @default(cuid())
  incident_id     String
  incident        Incident    @relation(fields: [incident_id], references: [id], onDelete: Cascade)

  reviewer_id     String?
  reviewer        User?       @relation(fields: [reviewer_id], references: [id])

  review_type     String      // agentic, human
  decision        String?     // approved, rejected, request_more_info
  notes           String?     @db.Text

  created_at      DateTime    @default(now())
}

model SimilarIncident {
  id                  String      @id @default(cuid())
  incident_id         String
  incident            Incident    @relation(fields: [incident_id], references: [id], onDelete: Cascade)

  similar_incident_id String
  similarity_score    Float

  @@index([incident_id])
}

model CreditLedger {
  id              String      @id @default(cuid())
  wallet_address  String
  amount          Int         // Positive = add, Negative = deduct
  transaction_type String     // purchase, incident_processing, refund
  incident_id     String?

  created_at      DateTime    @default(now())

  @@index([wallet_address])
  @@index([created_at])
}
```

---

## 4. Data Architecture

### 4.1 Data Flow

**Incident Data Lifecycle:**

1. **Submission → Intake**
   - Raw input (text + media URLs)
   - Reporter wallet address
   - Timestamp

2. **Intake → Understand**
   - Normalized payload
   - External context (geocoding, weather, etc.)

3. **Understand → Decide**
   - Extracted fields (entities, severity, type)
   - Summary + recommended actions

4. **Decide → Review**
   - Route decision
   - Rules triggered
   - AI validation

5. **Review → Audit**
   - Agentic review result
   - Human review (if applicable)

6. **Audit → Delivery**
   - Complete audit log (JSON)
   - Similar incidents (from Qdrant)

7. **Storage**
   - PostgreSQL: Incident record + audit log
   - Qdrant: Vector embedding + metadata
   - S3/R2: Media files

### 4.2 Vector Embeddings Strategy

**Embedding Generation:**
- **Source Text:** Combine `text + summary + incident_type + entities`
- **Model:** Gemini Embedding API or OpenAI text-embedding-3-small
- **Dimension:** 768 or 1536 (depending on model)

**Qdrant Collection Configuration:**
```json
{
  "name": "incidents",
  "vectors": {
    "size": 768,
    "distance": "Cosine"
  },
  "optimizers_config": {
    "indexing_threshold": 10000
  },
  "hnsw_config": {
    "m": 16,
    "ef_construct": 100
  }
}
```

**Payload Schema:**
```json
{
  "id": "incident_uuid",
  "text": "Original incident text",
  "summary": "AI-generated summary",
  "severity_score": 0.87,
  "severity_label": "High",
  "incident_type": "harassment",
  "timestamp": "2025-11-18T10:30:00Z",
  "route": "Escalate",
  "tags": ["harassment", "campus", "urgent"]
}
```

**Search Strategy:**
```typescript
// On new incident
const similar = await qdrant.search('incidents', {
  vector: newIncidentEmbedding,
  limit: 3,
  filter: {
    must: [
      {
        key: 'incident_type',
        match: { value: newIncident.incident_type }
      }
    ]
  },
  with_payload: true,
  score_threshold: 0.7  // Only return if similarity > 0.7
});
```

### 4.3 Audit Log Schema

**Comprehensive Audit Log Structure:**

```typescript
interface AuditLog {
  version: string;              // "1.0"
  incident_id: string;
  timestamp: string;            // ISO-8601

  input: {
    text: string;
    media_urls: string[];
    reporter_wallet: string;
    submission_timestamp: string;
  };

  processing_pipeline: {
    intake: {
      timestamp: string;
      normalized_data: Record<string, any>;
      external_context?: Record<string, any>;
    };

    understand: {
      timestamp: string;
      gemini_extraction: {
        incident_type: string;
        severity_score: number;
        severity_label: string;
        entities: {
          location?: string;
          time?: string;
          parties?: string[];
        };
        emotion: string;
        risk_indicators: string[];
      };
      gemini_summary: {
        summary: string;
        recommended_actions: string[];
        urgency: string;
      };
    };

    decide: {
      timestamp: string;
      rules_triggered: string[];
      route: string;
      ai_validation: {
        agrees_with_routing: boolean;
        override_suggested: boolean;
        reasoning: string;
        additional_factors?: string[];
      };
    };

    review: {
      timestamp: string;
      agentic_review: {
        policy_compliance: { passed: boolean; notes: string };
        bias_check: { passed: boolean; concerns: string[] };
        missing_information: string[];
        legal_considerations: string[];
        overall_passed: boolean;
      };
      human_review?: {
        required: boolean;
        completed: boolean;
        reviewer: string;
        decision: string;
        notes: string;
        timestamp: string;
      };
    };
  };

  final_decision: {
    route: string;
    severity: string;
    priority: string;
    assigned_to: string;
    recommended_actions: string[];
  };

  similar_incidents: Array<{
    incident_id: string;
    similarity_score: number;
    summary: string;
    severity_label: string;
    timestamp: string;
  }>;

  external_data_sources: string[];
  credits_used: number;
  processing_time_ms: number;
}
```

---

## 5. Integration Architecture

### 5.1 Opus Integration

**Authentication:**
- API Key-based (stored in env variable)

**Workflow Trigger:**
```typescript
// services/backend/src/lib/opusClient.ts
import axios from 'axios';

export class OpusClient {
  private apiKey: string;
  private baseUrl: string;

  async startWorkflow(workflowName: string, payload: any): Promise<{ jobId: string }> {
    const response = await axios.post(
      `${this.baseUrl}/workflows/${workflowName}/start`,
      payload,
      {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        }
      }
    );

    return { jobId: response.data.job_id };
  }

  async getJobStatus(jobId: string): Promise<any> {
    const response = await axios.get(
      `${this.baseUrl}/jobs/${jobId}`,
      {
        headers: { 'Authorization': `Bearer ${this.apiKey}` }
      }
    );

    return response.data;
  }
}
```

**Callback Handling:**
```typescript
// services/backend/src/routes/webhooks.ts
import { Router } from 'express';

const router = Router();

router.post('/opus-callback', async (req, res) => {
  const { job_id, status, result } = req.body;

  if (status === 'completed') {
    // Extract audit log
    const auditLog = result.audit_log_json;

    // Store in database
    await incidentService.completeIncident(job_id, auditLog);

    // Generate embedding & upsert to Qdrant
    await vectorService.indexIncident(auditLog.incident_id, auditLog);

    // Decrement credits
    await creditService.decrementCredits(auditLog.input.reporter_wallet, 1);
  }

  res.status(200).json({ received: true });
});

export default router;
```

### 5.2 Gemini Integration

**Direct API Calls (within Opus workflow):**
```python
# Opus workflow node (pseudo-code)
import google.generativeai as genai

genai.configure(api_key=os.environ["GEMINI_API_KEY"])

def extract_and_classify(text, image_urls):
    model = genai.GenerativeModel('gemini-1.5-pro')

    # Prepare multimodal input
    prompt = f"""
    Analyze this incident report:
    TEXT: {text}
    IMAGES: {image_urls}

    Extract and return JSON with:
    - incident_type
    - severity_score (0-100)
    - severity_label
    - entities (location, time, parties)
    - emotion
    - risk_indicators
    """

    response = model.generate_content([prompt] + load_images(image_urls))

    return parse_json(response.text)
```

**Alternative: Proxy via Backend (if Opus doesn't support direct Gemini):**
```typescript
// services/backend/src/lib/geminiClient.ts
import { GoogleGenerativeAI } from "@google/generative-ai";

export class GeminiClient {
  private genAI: GoogleGenerativeAI;

  async extractAndClassify(text: string, imageUrls: string[]): Promise<any> {
    const model = this.genAI.getGenerativeModel({ model: "gemini-1.5-pro" });

    const prompt = `
    Analyze this incident:
    TEXT: ${text}

    Return JSON: { incident_type, severity_score, severity_label, entities, emotion, risk_indicators }
    `;

    const result = await model.generateContent([prompt, ...imageUrls.map(url => ({ inlineData: { data: fetchImage(url), mimeType: 'image/jpeg' } }))]);

    return JSON.parse(result.response.text());
  }

  async generateEmbedding(text: string): Promise<number[]> {
    const model = this.genAI.getGenerativeModel({ model: "embedding-001" });
    const result = await model.embedContent(text);
    return result.embedding.values;
  }
}
```

### 5.3 Qdrant Integration

**Setup:**
```typescript
// services/backend/src/lib/qdrantClient.ts
import { QdrantClient } from '@qdrant/js-client-rest';

export class QdrantService {
  private client: QdrantClient;
  private collectionName = 'incidents';

  async initialize() {
    // Create collection if not exists
    const collections = await this.client.getCollections();
    const exists = collections.collections.some(c => c.name === this.collectionName);

    if (!exists) {
      await this.client.createCollection(this.collectionName, {
        vectors: {
          size: 768,
          distance: 'Cosine'
        }
      });
    }
  }

  async upsertIncident(id: string, embedding: number[], payload: any) {
    await this.client.upsert(this.collectionName, {
      points: [{
        id,
        vector: embedding,
        payload
      }]
    });
  }

  async searchSimilar(embedding: number[], limit: number = 3, filter?: any) {
    const results = await this.client.search(this.collectionName, {
      vector: embedding,
      limit,
      filter,
      with_payload: true,
      score_threshold: 0.7
    });

    return results;
  }
}
```

### 5.4 Solana Integration

**Credit Balance Check:**
```typescript
// services/backend/src/lib/solanaClient.ts
import { Connection, PublicKey } from '@solana/web3.js';
import { getAssociatedTokenAddress, getAccount } from '@solana/spl-token';

export class SolanaService {
  private connection: Connection;
  private sicMint: PublicKey;

  async getCredits(walletAddress: string): Promise<number> {
    const walletPubkey = new PublicKey(walletAddress);
    const tokenAccount = await getAssociatedTokenAddress(
      this.sicMint,
      walletPubkey
    );

    try {
      const account = await getAccount(this.connection, tokenAccount);
      return Number(account.amount);  // Convert from lamports if needed
    } catch (error) {
      // Token account doesn't exist
      return 0;
    }
  }

  async verifyWalletOwnership(walletAddress: string, signature: string, message: string): Promise<boolean> {
    // Verify that the signature was created by the wallet owner
    // Use @solana/web3.js's signature verification
    // This is used for authentication
    return true;  // Simplified
  }
}
```

**Off-Chain Ledger (Hackathon):**
```typescript
// services/backend/src/lib/creditLedger.ts
export class CreditLedgerService {
  private ledger = new Map<string, number>();

  async getCredits(wallet: string): Promise<number> {
    return this.ledger.get(wallet) ?? 0;
  }

  async decrementCredits(wallet: string, amount: number): Promise<void> {
    const current = this.ledger.get(wallet) ?? 0;
    if (current < amount) {
      throw new Error('Insufficient credits');
    }
    this.ledger.set(wallet, current - amount);

    // Also log to database
    await prisma.creditLedger.create({
      data: {
        wallet_address: wallet,
        amount: -amount,
        transaction_type: 'incident_processing'
      }
    });
  }

  async addCredits(wallet: string, amount: number): Promise<void> {
    const current = this.ledger.get(wallet) ?? 0;
    this.ledger.set(wallet, current + amount);

    await prisma.creditLedger.create({
      data: {
        wallet_address: wallet,
        amount,
        transaction_type: 'purchase'
      }
    });
  }
}
```

---

## 6. Security Architecture

### 6.1 Authentication & Authorization

**Wallet-Based Authentication:**
```typescript
// Middleware: services/backend/src/middleware/auth.ts
import { PublicKey } from '@solana/web3.js';
import nacl from 'tweetnacl';
import bs58 from 'bs58';

export const authenticateWallet = async (req, res, next) => {
  const { wallet, signature, message } = req.body;

  // Verify signature
  const messageBytes = new TextEncoder().encode(message);
  const signatureBytes = bs58.decode(signature);
  const publicKeyBytes = new PublicKey(wallet).toBytes();

  const verified = nacl.sign.detached.verify(
    messageBytes,
    signatureBytes,
    publicKeyBytes
  );

  if (!verified) {
    return res.status(401).json({ error: 'Invalid signature' });
  }

  req.wallet = wallet;
  next();
};
```

**Rate Limiting:**
```typescript
// services/backend/src/middleware/rateLimit.ts
import rateLimit from 'express-rate-limit';

export const incidentSubmissionLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 10,  // 10 requests per window per IP
  message: 'Too many incident submissions from this IP'
});

export const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 100
});
```

### 6.2 Input Validation & Sanitization

**Request Validation (Zod):**
```typescript
// services/backend/src/middleware/validation.ts
import { z } from 'zod';

const IncidentSubmissionSchema = z.object({
  text: z.string().min(10).max(5000),
  incident_type: z.enum(['harassment', 'accident', 'cyber', 'infrastructure', 'other', 'auto']).optional(),
  image_urls: z.array(z.string().url()).max(5).optional(),
  audio_urls: z.array(z.string().url()).max(2).optional(),
  video_urls: z.array(z.string().url()).max(1).optional(),
  reporter_wallet: z.string().regex(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/)  // Solana address
});

export const validateIncidentSubmission = (req, res, next) => {
  try {
    IncidentSubmissionSchema.parse(req.body);
    next();
  } catch (error) {
    res.status(400).json({ error: 'Invalid input', details: error.errors });
  }
};
```

**Content Security:**
- **Helmet.js:** Security headers
- **CORS:** Restrict to known origins
- **File Upload Validation:** MIME type, size limits

### 6.3 Data Privacy (Future)

**PII Redaction:**
- Use Gemini or regex to detect and redact:
  - Names
  - Addresses
  - Phone numbers
  - Email addresses
  - Social Security Numbers

**Encryption:**
- **At Rest:** Database encryption (PostgreSQL pgcrypto)
- **In Transit:** HTTPS/TLS everywhere

**Access Control:**
- Role-based access to admin panel
- Audit logs are immutable (append-only)

---

## 7. Deployment Architecture

### 7.1 Deployment Environments

| Environment | Purpose | Infrastructure |
|-------------|---------|----------------|
| **Development** | Local development | Docker Compose (all services) |
| **Staging** | Pre-production testing | Vercel (frontend) + Railway (backend) + Qdrant Cloud |
| **Production** | Live system | Vercel + AWS/GCP + Qdrant Cloud + Solana Mainnet |

### 7.2 Docker Compose (Local Dev)

```yaml
# docker-compose.yml
version: '3.8'

services:
  frontend:
    build: ./apps/web-frontend
    ports:
      - "3000:3000"
    environment:
      - NEXT_PUBLIC_API_URL=http://localhost:4000
    depends_on:
      - backend

  backend:
    build: ./services/backend
    ports:
      - "4000:4000"
    environment:
      - DATABASE_URL=postgresql://user:pass@postgres:5432/apsic
      - QDRANT_URL=http://qdrant:6333
      - OPUS_API_KEY=${OPUS_API_KEY}
      - GEMINI_API_KEY=${GEMINI_API_KEY}
      - SOLANA_RPC_URL=https://api.devnet.solana.com
    depends_on:
      - postgres
      - qdrant

  postgres:
    image: postgres:15
    ports:
      - "5432:5432"
    environment:
      - POSTGRES_USER=user
      - POSTGRES_PASSWORD=pass
      - POSTGRES_DB=apsic
    volumes:
      - postgres_data:/var/lib/postgresql/data

  qdrant:
    image: qdrant/qdrant:latest
    ports:
      - "6333:6333"
    volumes:
      - qdrant_data:/qdrant/storage

volumes:
  postgres_data:
  qdrant_data:
```

### 7.3 Production Deployment

**Frontend (Vercel):**
- Auto-deploy from `main` branch
- Environment variables: `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_SOLANA_NETWORK`

**Backend (Railway / AWS ECS):**
- Dockerfile build
- Environment variables injected from secrets
- Auto-scaling based on CPU/memory

**Database (AWS RDS / Supabase):**
- PostgreSQL 15
- Automated backups
- Read replicas for scaling

**Qdrant (Qdrant Cloud or self-hosted):**
- Managed service recommended
- Persistent volumes

**Solana:**
- Use Mainnet RPC (e.g., Helius, QuickNode)

---

## 8. Scalability & Performance

### 8.1 Scalability Strategies

**Horizontal Scaling:**
- **Backend:** Stateless API servers, load-balanced
- **Database:** Read replicas for queries
- **Qdrant:** Distributed cluster (when >1M vectors)

**Async Processing:**
- Incident processing is async (Opus workflows)
- Use job queue (BullMQ or similar) if Opus isn't used

**Caching:**
- **Redis:** Cache credit balances, frequently accessed incidents
- **CDN:** Static assets, media files

### 8.2 Performance Targets

| Metric | Target | Measurement |
|--------|--------|-------------|
| **API Response Time (p95)** | <500ms | Exclude Opus processing |
| **Incident Submission** | <2s to return "processing" | Initial response |
| **Full Processing Time** | <30s | Intake → Audit complete |
| **Similar Incident Search** | <200ms | Qdrant query |
| **Concurrent Incidents** | 100/sec | Load testing |

### 8.3 Monitoring & Observability

**Metrics (Prometheus + Grafana):**
- API request rate, latency, errors
- Opus job completion time
- Qdrant query latency
- Database connection pool usage

**Logging (Structured JSON):**
- All API requests
- Opus workflow stages
- Error stack traces

**Tracing (OpenTelemetry):**
- End-to-end request tracing
- Identify bottlenecks

**Alerting:**
- API error rate >5%
- Opus job failures
- Database connection exhaustion
- Credit balance discrepancies

---

## 9. Disaster Recovery & Backup

### 9.1 Backup Strategy

| Component | Frequency | Retention | Method |
|-----------|-----------|-----------|--------|
| **PostgreSQL** | Daily | 30 days | Automated snapshots (RDS/Supabase) |
| **Qdrant** | Weekly | 4 weeks | Collection snapshots |
| **S3/R2 Media** | N/A | Immutable | Versioning enabled |
| **Config/Secrets** | On change | Indefinite | Git (encrypted) |

### 9.2 Recovery Procedures

**Database Failure:**
1. Promote read replica to primary
2. Update backend DNS/connection string
3. Investigate root cause

**Qdrant Failure:**
1. Re-deploy from snapshot
2. Regenerate embeddings if snapshot is stale

**Complete System Failure:**
1. Restore database from backup
2. Redeploy backend + frontend
3. Restore Qdrant
4. Verify integrity with test incidents

---

## 10. Future Architecture Enhancements

### 10.1 Real-Time Updates (WebSocket)

```
Frontend ←--WebSocket--→ Backend ←--Webhook--→ Opus
- Live status updates for incident processing
- Real-time notifications for admins
```

### 10.2 Multi-Tenancy

- Separate databases per organization
- OR: Single database with `org_id` partitioning
- Tenant-specific models (fine-tuned Gemini)

### 10.3 Advanced Analytics

- Trend detection (clustering of incident types)
- Anomaly detection (unusual spike in reports)
- Predictive analytics (forecast incident volume)

### 10.4 On-Chain Billing

```
Smart Contract (Solana Program)
- Burn SIC token when incident is processed
- Emit event for audit trail
- Staking mechanism for priority tiers
```

---

**END OF ARCHITECTURE DOCUMENT**
