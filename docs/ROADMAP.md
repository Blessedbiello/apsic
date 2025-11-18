# Implementation Roadmap: APSIC Hackathon
**AI Public Safety Intake Commander**

**Version:** 1.0
**Last Updated:** 2025-11-18
**Target:** Hackathon MVP (48-72 hours)

---

## 🎯 Hackathon Goals

**Primary Objective:** Build a working end-to-end demo of APSIC that showcases:
1. Multimodal incident intake (text + image minimum)
2. AI-powered triage and classification
3. Vector similarity search for related incidents
4. Blockchain-based credit gating
5. Complete audit trail

**Success Criteria:**
- ✅ Live demo or high-quality video (3-5 min)
- ✅ Public GitHub repo with documentation
- ✅ Functional frontend + backend + integrations
- ✅ At least 2 different incident types demonstrated

---

## 📅 Timeline (48 Hours)

### Day 1 (Hours 0-24)
**Focus:** Foundation + Core Integrations

- **Hours 0-4:** Project setup, environment, initial architecture
- **Hours 4-12:** Backend API + database + Opus integration
- **Hours 12-20:** Gemini integration + Qdrant setup
- **Hours 20-24:** Basic frontend shell

### Day 2 (Hours 24-48)
**Focus:** Polish + Demo Preparation

- **Hours 24-32:** Complete frontend integration
- **Hours 32-40:** Solana SPL token integration
- **Hours 40-44:** Testing + bug fixes
- **Hours 44-48:** Demo video + presentation prep

---

## 🏗️ Phase 1: Foundation (Hours 0-4)

### Milestone 1.1: Project Setup

**Tasks:**
- [x] Create project repository structure
- [ ] Initialize Git repository
- [ ] Set up monorepo (optional: use Turborepo or npm workspaces)
- [ ] Create `.gitignore` and `.env.example` files
- [ ] Set up ESLint + Prettier
- [ ] Write initial README.md

**Deliverable:** Clean repo structure with all folders created

---

### Milestone 1.2: Local Development Environment

**Tasks:**
- [ ] Create `docker-compose.yml` for PostgreSQL + Qdrant
- [ ] Start local services: `docker-compose up -d`
- [ ] Verify PostgreSQL connection
- [ ] Verify Qdrant is accessible (http://localhost:6333/dashboard)
- [ ] Create `.env` files for backend and frontend

**Deliverable:** All local services running

---

### Milestone 1.3: Database Schema

**Tasks:**
- [ ] Install Prisma: `npm install prisma @prisma/client`
- [ ] Initialize Prisma: `npx prisma init`
- [ ] Define Prisma schema (`schema.prisma`) with models:
  - User
  - Incident
  - AuditLog
  - Review
  - SimilarIncident
  - CreditLedger
- [ ] Run migration: `npx prisma migrate dev --name init`
- [ ] Generate Prisma client: `npx prisma generate`

**Deliverable:** Database schema created and migrated

---

## 🔧 Phase 2: Backend API (Hours 4-12)

### Milestone 2.1: Express Server Setup

**Tasks:**
- [ ] Initialize backend project: `npm init -y`
- [ ] Install dependencies:
  ```bash
  npm install express typescript @types/express @types/node
  npm install dotenv zod cors helmet express-rate-limit
  npm install -D ts-node nodemon
  ```
- [ ] Create `tsconfig.json`
- [ ] Create `src/index.ts` with basic Express server
- [ ] Add scripts to `package.json`:
  ```json
  {
    "scripts": {
      "dev": "nodemon src/index.ts",
      "build": "tsc",
      "start": "node dist/index.js"
    }
  }
  ```
- [ ] Test server: `npm run dev` → should run on port 4000

**Deliverable:** Express server running

---

### Milestone 2.2: Core API Routes

**Tasks:**
- [ ] Create route files:
  - `src/routes/incidents.ts`
  - `src/routes/credits.ts`
  - `src/routes/webhooks.ts`
- [ ] Implement endpoints:
  - `POST /api/incidents` (submit incident)
  - `GET /api/incidents/:id` (get incident)
  - `GET /api/incidents` (list incidents)
  - `GET /api/credits/:wallet` (get credits)
- [ ] Add middleware:
  - Request validation (Zod)
  - Error handling
  - Rate limiting
- [ ] Test with Postman/cURL

**Deliverable:** API routes responding (mock data OK for now)

---

### Milestone 2.3: Opus Client Integration

**Tasks:**
- [ ] Install Opus SDK or use `axios` for API calls
- [ ] Create `src/lib/opusClient.ts`:
  ```typescript
  class OpusClient {
    async startWorkflow(payload): Promise<{ jobId: string }>
    async getJobStatus(jobId): Promise<any>
  }
  ```
- [ ] Test Opus connection with dummy workflow
- [ ] Implement webhook endpoint: `POST /api/webhooks/opus-callback`
- [ ] Handle Opus callback and extract audit log

**Deliverable:** Opus workflow can be triggered and results received

---

### Milestone 2.4: Incident Service (Business Logic)

**Tasks:**
- [ ] Create `src/services/incidentService.ts`
- [ ] Implement:
  - `createIncident(payload)`: Validate → Check credits → Trigger Opus → Return incident_id
  - `getIncident(id)`: Fetch from DB
  - `listIncidents(filters)`: Paginated query with filters
  - `completeIncident(jobId, auditLog)`: Save results to DB
- [ ] Integrate with Prisma for database operations

**Deliverable:** Full incident lifecycle working (except AI and vector search)

---

## 🤖 Phase 3: AI Integration (Hours 12-20)

### Milestone 3.1: Gemini Client Setup

**Tasks:**
- [ ] Install Gemini SDK: `npm install @google/generative-ai`
- [ ] Create `src/lib/geminiClient.ts`
- [ ] Implement methods:
  - `extractAndClassify(text, imageUrls)`: Extract fields + severity
  - `generateSummary(extractedFields)`: Summary + actions
  - `generateEmbedding(text)`: Vector embedding
- [ ] Test with sample incident data

**Deliverable:** Gemini API calls working

---

### Milestone 3.2: Opus Workflow Definition

**Tasks:**
- [ ] Log in to Opus dashboard
- [ ] Create new workflow: `APSIC_Public_Safety_Intake_v1`
- [ ] Define stages (using Opus UI or API):
  1. **Intake:** Data import node
  2. **Understand:** AI node (call Gemini via HTTP or direct integration)
  3. **Decide:** Code node (rules engine)
  4. **Review:** AI node (agentic review) + Human task (conditional)
  5. **Audit:** Code node (generate JSON log)
  6. **Deliver:** Webhook callback node
- [ ] Test workflow with sample payload
- [ ] Verify callback is received by backend

**Deliverable:** Opus workflow executes all 6 stages

---

### Milestone 3.3: Gemini Prompts (Fine-Tuning)

**Tasks:**
- [ ] Write extraction prompt with clear instructions and JSON schema
- [ ] Write summary prompt with examples
- [ ] Test prompts with 5+ sample incidents of varying severity
- [ ] Iterate to improve accuracy

**Example Extraction Prompt:**
```
You are an expert public safety analyst. Analyze the following incident:

TEXT: {text}
IMAGES: {image_urls}

Extract and return ONLY valid JSON (no markdown):
{
  "incident_type": "harassment | accident | cyber | infrastructure | other",
  "severity_score": 0-100,
  "severity_label": "Low | Medium | High | Critical",
  "entities": {
    "location": "string or null",
    "time": "string or null",
    "parties": ["array of strings"]
  },
  "emotion": "calm | concerned | distressed | angry | fearful",
  "risk_indicators": ["array of strings"]
}
```

**Deliverable:** Prompts consistently return valid, accurate JSON

---

## 🔍 Phase 4: Vector Search (Hours 16-20)

### Milestone 4.1: Qdrant Client Setup

**Tasks:**
- [ ] Install Qdrant SDK: `npm install @qdrant/js-client-rest`
- [ ] Create `src/lib/qdrantClient.ts`
- [ ] Initialize collection:
  ```typescript
  await qdrant.createCollection('incidents', {
    vectors: { size: 768, distance: 'Cosine' }
  });
  ```
- [ ] Test upsert and search

**Deliverable:** Qdrant client working

---

### Milestone 4.2: Embedding Generation

**Tasks:**
- [ ] Create `src/services/embeddingService.ts`
- [ ] Implement:
  - `generateEmbedding(incident)`: Combine text + summary → call Gemini embedding API
  - `upsertIncident(incident)`: Generate embedding → upsert to Qdrant
- [ ] Test with sample incident

**Deliverable:** Incidents can be indexed in Qdrant

---

### Milestone 4.3: Similarity Search

**Tasks:**
- [ ] Implement `searchSimilarIncidents(embedding, limit=3)`
- [ ] Integrate into `completeIncident()` flow:
  - After Opus completes → generate embedding → upsert
  - Query for similar incidents
  - Attach to result
- [ ] Test: Submit 5 incidents → verify similar incidents are returned for new submissions

**Deliverable:** Similar incidents feature working

---

## 💎 Phase 5: Solana Integration (Hours 20-24)

### Milestone 5.1: Solana Client (Off-Chain for Hackathon)

**Tasks:**
- [ ] Install Solana SDK: `npm install @solana/web3.js @solana/spl-token`
- [ ] Create `src/lib/solanaClient.ts`
- [ ] Implement:
  - `getCredits(wallet)`: Read SPL token balance (OR mock in-memory map)
  - `verifyWallet(wallet, signature, message)`: Verify signature
- [ ] For hackathon: Use in-memory map for credits
  ```typescript
  const mockCredits = new Map<string, number>();
  mockCredits.set('DemoWallet1...', 10);
  ```

**Deliverable:** Credit check working (mock or real)

---

### Milestone 5.2: Credit Service

**Tasks:**
- [ ] Create `src/services/creditService.ts`
- [ ] Implement:
  - `getCredits(wallet)`: Check balance
  - `decrementCredits(wallet, amount)`: Decrement + log to DB
  - `addCredits(wallet, amount)`: Admin function
  - `getPriorityTier(wallet)`: Standard/Premium/Enterprise
- [ ] Integrate into `createIncident()`:
  - Check credits before processing
  - Return 402 if insufficient
  - Decrement after successful processing

**Deliverable:** Credit gating working

---

## 🎨 Phase 6: Frontend (Hours 20-32)

### Milestone 6.1: Next.js Setup

**Tasks:**
- [ ] Initialize Next.js: `npx create-next-app@latest web-frontend --typescript --tailwind --app`
- [ ] Install dependencies:
  ```bash
  npm install @solana/wallet-adapter-react @solana/wallet-adapter-react-ui
  npm install @solana/wallet-adapter-wallets @solana/web3.js
  npm install zustand @tanstack/react-query axios
  npm install react-hook-form zod @hookform/resolvers
  ```
- [ ] Set up Tailwind config
- [ ] Create basic layout (`app/layout.tsx`)

**Deliverable:** Next.js app running on port 3000

---

### Milestone 6.2: Wallet Integration

**Tasks:**
- [ ] Create `src/components/WalletConnect.tsx`
- [ ] Wrap app with Solana wallet providers
- [ ] Test wallet connection (Phantom, Solflare, or mock)
- [ ] Display connected wallet address and credit balance

**Deliverable:** Wallet connection working

---

### Milestone 6.3: Reporter Panel (Incident Submission)

**Tasks:**
- [ ] Create `src/components/reporter/IncidentForm.tsx`
- [ ] Components:
  - Text input (textarea, required)
  - Incident type selector (dropdown)
  - File uploader (react-dropzone)
  - Submit button
- [ ] Form validation (React Hook Form + Zod)
- [ ] File upload flow:
  - Option 1: Direct upload to S3, then send URLs to API
  - Option 2: Send files to backend, backend uploads to S3
- [ ] Submit incident via API: `POST /api/incidents`
- [ ] Display loading state while processing

**Deliverable:** Incident submission form working

---

### Milestone 6.4: Results Panel

**Tasks:**
- [ ] Create `src/components/results/` components:
  - `SeverityDisplay.tsx`: Badge with color-coded severity
  - `SummaryCard.tsx`: AI summary + recommended actions
  - `SimilarIncidents.tsx`: List of 3 similar cases
  - `AuditLogViewer.tsx`: JSON viewer + download button
- [ ] Poll for incident completion:
  - Every 5 seconds: `GET /api/incidents/:id`
  - Display results when `status === 'completed'`
- [ ] Show error if `status === 'failed'`

**Deliverable:** Results display working

---

### Milestone 6.5: Admin Panel (Read-Only)

**Tasks:**
- [ ] Create `app/incidents/page.tsx`
- [ ] Components:
  - `IncidentTable.tsx`: Paginated table
  - Filters: severity, type, status
  - Sort: date, severity
- [ ] Click row → navigate to `app/incidents/[id]/page.tsx`
- [ ] Detail view: Full incident + audit log

**Deliverable:** Admin panel working

---

## 🧪 Phase 7: Testing & Polish (Hours 32-44)

### Milestone 7.1: End-to-End Testing

**Tasks:**
- [ ] Test complete flow:
  1. Connect wallet
  2. Submit harassment report (text + image)
  3. Wait for processing
  4. View results (severity, summary, similar incidents)
  5. Download audit log
- [ ] Test edge cases:
  - Insufficient credits → show error
  - Invalid input → show validation errors
  - Processing failure → show error message
- [ ] Test different incident types:
  - Harassment
  - Accident
  - Cyber incident

**Deliverable:** All major flows working

---

### Milestone 7.2: Seed Demo Data

**Tasks:**
- [ ] Create `services/scripts/seedDemoData.ts`
- [ ] Seed database with:
  - 5 demo wallets with varying credit balances
  - 20 sample incidents (mix of types and severities)
  - Generate embeddings and index in Qdrant
- [ ] Run: `npm run seed`

**Deliverable:** Demo data available for presentation

---

### Milestone 7.3: UI Polish

**Tasks:**
- [ ] Add loading spinners
- [ ] Add success/error toasts (e.g., react-hot-toast)
- [ ] Improve responsive design (mobile-friendly)
- [ ] Add helpful tooltips and help text
- [ ] Add empty states ("No incidents yet")
- [ ] Fix any UI bugs

**Deliverable:** Clean, polished UI

---

### Milestone 7.4: Documentation

**Tasks:**
- [ ] Write comprehensive README.md
- [ ] Add setup instructions
- [ ] Add usage guide
- [ ] Add architecture diagram (ASCII or image)
- [ ] Add API examples
- [ ] Add screenshots to README

**Deliverable:** Documentation complete

---

## 🎥 Phase 8: Demo Preparation (Hours 44-48)

### Milestone 8.1: Demo Script

**Tasks:**
- [ ] Write demo script (3-5 minutes):
  1. **Intro (30s):** Problem statement
  2. **Architecture (1 min):** High-level overview
  3. **Live Demo (2-3 min):**
     - Submit high-severity harassment report
     - Show AI processing
     - Highlight severity classification
     - Show similar incidents
     - Show audit log
  4. **Tech Stack (30s):** Gemini, Opus, Qdrant, Solana
  5. **Roadmap (30s):** Future plans
- [ ] Practice demo 3+ times

**Deliverable:** Demo script ready

---

### Milestone 8.2: Record Demo Video

**Tasks:**
- [ ] Set up screen recording (OBS, Loom, or QuickTime)
- [ ] Record demo following script
- [ ] Add voiceover or captions
- [ ] Edit video (cut mistakes, add transitions)
- [ ] Upload to YouTube (unlisted or public)
- [ ] Add video link to README

**Deliverable:** Demo video uploaded

---

### Milestone 8.3: Final Deployment (Optional)

**Tasks:**
- [ ] Deploy frontend to Vercel:
  ```bash
  cd apps/web-frontend
  vercel --prod
  ```
- [ ] Deploy backend to Railway or Render:
  ```bash
  cd services/backend
  railway up
  ```
- [ ] Update `.env` with production URLs
- [ ] Test live deployment
- [ ] Add live demo link to README

**Deliverable:** Live demo URL (optional but impressive)

---

## 📋 Checklist: Hackathon Submission

### Required Deliverables

- [ ] **GitHub Repository** (public)
  - [ ] Clean commit history
  - [ ] All code pushed
  - [ ] README.md with setup instructions
  - [ ] Documentation in `/docs`

- [ ] **Demo Video** (3-5 minutes)
  - [ ] Problem statement
  - [ ] Live demo
  - [ ] Tech stack overview
  - [ ] Uploaded to YouTube

- [ ] **Working Demo** (live OR video)
  - [ ] Incident submission works
  - [ ] AI processing visible
  - [ ] Results displayed correctly
  - [ ] Audit log downloadable

- [ ] **Integrations**
  - [ ] Gemini for multimodal AI
  - [ ] Opus for workflow orchestration
  - [ ] Qdrant for vector search
  - [ ] Solana for credit gating

### Optional (Bonus Points)

- [ ] Live deployment (not just localhost)
- [ ] Multiple incident types demonstrated
- [ ] PDF audit report generation
- [ ] Real SPL token integration (not just mock)
- [ ] Comprehensive test suite

---

## 🎯 Day-by-Day Breakdown

### Day 1: Build

| Time | Focus | Milestone |
|------|-------|-----------|
| 0-4h | Setup + Database | Phase 1 complete |
| 4-8h | Backend API | Phase 2.1-2.2 |
| 8-12h | Opus + Gemini | Phase 2.3-3.2 |
| 12-16h | AI Integration | Phase 3.3 |
| 16-20h | Vector Search | Phase 4 complete |
| 20-24h | Solana + Frontend Start | Phase 5 + 6.1-6.2 |

**End of Day 1 Goal:** Backend fully functional, frontend shell up

---

### Day 2: Polish + Demo

| Time | Focus | Milestone |
|------|-------|-----------|
| 24-28h | Frontend Forms | Phase 6.3 |
| 28-32h | Results + Admin | Phase 6.4-6.5 |
| 32-36h | Testing | Phase 7.1-7.2 |
| 36-40h | UI Polish | Phase 7.3 |
| 40-44h | Documentation | Phase 7.4 |
| 44-48h | Demo Video | Phase 8 complete |

**End of Day 2 Goal:** Fully polished demo ready for submission

---

## 🚨 Risk Mitigation

### High-Risk Items

| Risk | Mitigation |
|------|------------|
| **Opus API issues** | Have fallback: simple Express workflow with direct Gemini calls |
| **Gemini rate limits** | Cache responses during testing, use mock data if needed |
| **Qdrant setup problems** | Use local Docker, not cloud (faster for hackathon) |
| **File upload complexity** | Skip audio/video if time-constrained; focus on text + image |
| **Wallet integration bugs** | Use mock wallet option for demo |

### Scope Reduction Plan (if behind schedule)

**Priority 1 (Must Have):**
- Text-only incident submission
- Gemini classification + summary
- Basic frontend (no polish)
- Mock credits (no Solana)

**Priority 2 (Should Have):**
- Image upload
- Qdrant similar incidents
- Solana credit check
- Polished UI

**Priority 3 (Nice to Have):**
- Audio/video upload
- PDF audit reports
- Real SPL token burn
- Live deployment

---

## 📞 Support Contacts

- **Opus Support:** [opus.example.com/support]
- **Gemini API Docs:** [ai.google.dev/docs]
- **Qdrant Discord:** [qdrant.tech/discord]
- **Solana Devnet Faucet:** [solfaucet.com]

---

## 🎉 Post-Hackathon Roadmap

### Week 1-2: Refinements
- User feedback integration
- Bug fixes
- Performance optimization

### Month 1: Production Prep
- Security audit
- PII redaction
- SOC 2 compliance prep

### Month 2-3: Launch
- Beta testing with pilot organization
- Marketing and go-to-market
- Surge launchpad integration for token

---

**Good luck! Build something amazing! 🚀**
