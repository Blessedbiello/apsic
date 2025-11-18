# Product Requirements Document: APSIC
**AI Public Safety Intake Commander**

**Version:** 1.0
**Last Updated:** 2025-11-18
**Status:** Hackathon MVP

---

## 1. Product Overview

### 1.1 Product Name
**AI Public Safety Intake Commander (APSIC)**
**Codename:** SentinelCredits

### 1.2 One-liner
APSIC is a multimodal AI intake and triage commander that processes public safety incidents across text, images, audio, and video, orchestrates decisions and reviews with Opus, augments reasoning with Gemini and Qdrant, and gates access using an SPL "incident credits" token on Solana.

### 1.3 Problem Statement

Across cities, schools, enterprises, and online platforms, incident reporting and safety intake is fundamentally broken:

- **Fragmented Inputs:** Reports arrive in different formats (emails, forms, photos, CCTV clips, voice notes)
- **Human Bottlenecks:** Reviewers are overloaded, leading to inconsistent triage
- **Poor Prioritization:** High-risk cases get buried among low-priority noise
- **No Institutional Memory:** No structured memory of past incidents to learn from
- **Lack of Transparency:** No auditable trail of how decisions were made
- **Resource Allocation:** No fair, transparent way to prioritize limited resources

Organizations need a traceable, auditable, AI-augmented intake system that:
- Understands multimodal inputs (text, image, audio, video)
- Classifies, triages, and routes cases intelligently
- Maintains vectorized memory of past incidents for pattern detection
- Enforces priority access and quotas with programmable credits
- Provides complete audit trails for compliance and review

### 1.4 Solution Summary

APSIC is an AI-powered pipeline implementing:

**Intake → Understand → Decide → Review → Deliver**

**Technology Stack:**
- **Gemini:** Multimodal understanding, reasoning, and classification
- **Opus:** Workflow orchestration (jobs, nodes, tracing, human-in-the-loop)
- **Qdrant:** Vector memory for similar-case retrieval and recommendations
- **Solana SPL Token:** "Incident Credits" for access gating and prioritization
- **Surge:** (Future) Multi-chain launchpad for go-to-market and tokenized SaaS

---

## 2. Goals & Non-Goals

### 2.1 Goals (Hackathon Scope)

#### ✅ Core Functionality
- **End-to-end incident processing pipeline:**
  - User submits text/image/audio/video
  - APSIC analyzes, classifies, and prioritizes severity
  - APSIC emits structured summary with recommended actions

#### ✅ Opus Workflow Implementation
- Clear pipeline: Intake → Understand → Decide → Review → Deliver
- Full logs, tracing, and error handling
- Human-in-the-loop checkpoints for critical cases

#### ✅ Gemini Integration
- Extract structured fields from multimodal inputs
- Severity classification with reasoning
- Summarization and playbook action suggestions
- Entity extraction (location, parties, incident type)

#### ✅ Qdrant Integration
- Store vector embeddings of all incidents
- Find top-K similar historical cases
- Power "Similar Incidents" feature for context

#### ✅ Solana SPL Token Integration
- Check wallet for "Incident Credit" SPL tokens
- Decrement credits per processed incident (off-chain for MVP)
- Priority handling based on token holdings/stake
- Clear rejection if insufficient credits

#### ✅ Audit & Provenance
- Generate comprehensive audit artifact (JSON + optional PDF)
- Include: input, extracted fields, rules triggered, AI reasoning, review steps, final decision, timestamps

#### ✅ Deliverables
- Working demo with minimal but functional frontend
- Public GitHub repository with clear documentation
- Short video walkthrough demonstrating key features

### 2.2 Non-Goals (Deferred to Post-Hackathon)

- Real-world integrations with emergency services (911, police CAD systems)
- Full on-chain billing settlement (simple off-chain accounting is sufficient)
- Production-grade security, PII redaction, or legal compliance
- Complex DAO governance for model policies
- Multi-tenant architecture
- Mobile apps
- Real-time streaming incident processing

---

## 3. Target Users & Personas

### 3.1 Primary Personas

#### Safety Operations Manager (Enterprise / School / Platform)
- **Needs:** Fast, consistent triage of incoming incident reports
- **Cares About:** Risk prioritization, auditable decision-making, throughput
- **Pain Points:** Manual review backlogs, inconsistent handling, liability exposure

#### Public Safety Officer / Compliance Analyst
- **Needs:** Handle sensitive reports (harassment, accidents, fraud, outages)
- **Cares About:** AI assistance with human oversight, audit trails
- **Pain Points:** Information overload, missing context, regulatory requirements

#### City / Infrastructure Operator (Future)
- **Needs:** Manage physical incidents (fires, outages, accidents)
- **Cares About:** Cross-channel intake with multimodal media, rapid response
- **Pain Points:** Fragmented systems, delayed notifications

#### System Administrator / Buyer
- **Needs:** Procure and deploy safety systems
- **Cares About:** ROI, throughput, safety, legal defensibility, cost control
- **Pain Points:** Budget constraints, vendor lock-in, compliance requirements

### 3.2 Secondary Personas

- **AI/Data Team:** Interested in vector search and incident similarity analytics
- **Crypto-native Organizations:** Appreciative of SPL token gating and Surge launchpad story
- **Compliance Officers:** Need detailed audit trails and provenance
- **End Users/Reporters:** Want simple submission and confirmation of receipt

---

## 4. Use Cases & User Stories

### 4.1 Core Use Case: School Harassment Report

**Scenario:**
A school receives harassment reports via text descriptions and screenshots of threatening messages. APSIC centralizes intake, classifies severity, retrieves similar cases from the past, and outputs a clear summary with recommended next actions, while logging every step for audit.

**User Story:**
```
As a Safety Operations Manager,
I want to upload a complaint (text + image of chat screenshots)
so that the system can classify its severity, suggest actions, and show similar past cases
to ensure consistent, fair, and rapid response.
```

**Acceptance Criteria:**
- System accepts text + image upload
- Extracts entities (parties, location, time)
- Assigns severity score and label
- Retrieves 3 similar past incidents
- Suggests specific next actions
- Generates downloadable audit log

### 4.2 Additional Use Cases (Demo Scenarios)

#### Accident Reporting
- **Input:** Image of damage + text description
- **Output:** Severity, location extraction, similar incidents, recommended response team

#### Cyber Incident Intake
- **Input:** Text description + log screenshot
- **Output:** Incident type (phishing, breach, etc.), severity, playbook actions

#### Infrastructure Failure
- **Input:** Image of damage + short text
- **Output:** Asset identification, severity, maintenance history lookup

#### Anonymous Harassment Report
- **Input:** Text only (no image)
- **Output:** Content analysis, severity, pattern detection with past reports

**Note:** All use cases share the same pipeline; only payloads differ.

---

## 5. Product Scope (MVP for Hackathon)

### 5.1 Frontend (Next.js + Tailwind)

#### Reporter Panel
- **Wallet Connection:**
  - Connect Solana wallet (Phantom/Solflare via wallet adapter)
  - Display credit balance
  - Mock wallet option for demo without wallet

- **Incident Submission Form:**
  - **Incident Type Selector:** Auto-detect, Harassment, Accident, Cyber, Infrastructure, Other
  - **Text Input:** Textarea for incident description (required)
  - **File Uploads:**
    - Image (PNG, JPG, JPEG)
    - Audio (MP3, WAV) - optional
    - Video (MP4, MOV) - optional if time permits
  - **Submit Button:** Disabled if no credits or no text input

#### Results Panel
- **Severity Display:**
  - Visual severity indicator (color-coded badge)
  - Numeric score (0-100)
  - Label (Low / Medium / High / Critical)

- **Extracted Fields:**
  - Incident Type
  - Location (if detected)
  - Timestamp
  - Involved Parties (if mentioned)
  - Emotional Tone

- **AI Summary:**
  - 2-3 sentence human-readable summary
  - Recommended next actions (bulleted list)

- **Similar Incidents (Qdrant):**
  - Card list showing 3 most similar past cases
  - Each card: title, severity, date, snippet

- **Audit Trail:**
  - Collapsible JSON viewer
  - "Download Audit Log" button (JSON file)
  - "Generate PDF Report" button (stretch goal)

#### Admin Panel (Read-Only for Demo)
- **Incidents Table:**
  - Columns: ID, Type, Severity, Date, Status
  - Sortable and filterable
  - Click row → navigate to detail view

- **Detail View:**
  - Full incident data
  - Complete audit trace
  - Timeline visualization (stretch goal)

### 5.2 Backend API (Node.js/TypeScript)

#### Technology Stack
- **Runtime:** Node.js 20+
- **Framework:** Express or Fastify
- **Language:** TypeScript
- **ORM:** Prisma (optional, can use plain SQL)
- **Database:** PostgreSQL or SQLite for hackathon

#### Core Endpoints

**POST `/api/incidents/submit`**
```typescript
// Request
{
  text: string;              // Required
  image_urls?: string[];     // Optional
  audio_urls?: string[];     // Optional
  video_urls?: string[];     // Optional
  reporter_wallet: string;   // Solana address
  incident_type?: string;    // Optional, or "auto"
}

// Response
{
  incident_id: string;
  status: "processing" | "completed" | "error";
  result?: {
    severity_score: number;
    severity_label: string;
    summary: string;
    recommended_actions: string[];
    similar_incidents: SimilarIncident[];
    extracted_fields: Record<string, any>;
  };
  audit_log?: AuditLog;
  credits_remaining: number;
  error?: string;
}
```

**Processing Steps:**
1. Validate request payload
2. Check SPL "Incident Credit" balance (mock or RPC read)
3. Return 402 if insufficient credits
4. Trigger Opus workflow with packaged payload
5. Poll or wait for Opus completion
6. Store incident + metadata in database
7. Generate and store audit log
8. Decrement credit balance (off-chain map)
9. Return structured result

**GET `/api/incidents/:id`**
```typescript
// Response
{
  incident_id: string;
  text: string;
  media_urls: string[];
  reporter_wallet: string;
  timestamp: string;
  result: IncidentResult;
  audit_log: AuditLog;
  status: string;
}
```

**GET `/api/incidents`**
```typescript
// Query params
?page=1&limit=20&severity=high&type=harassment&sort=timestamp

// Response
{
  incidents: Incident[];
  total: number;
  page: number;
  limit: number;
}
```

**GET `/api/credits/:wallet`**
```typescript
// Response
{
  wallet: string;
  credits: number;
  staked: boolean;
  priority_tier: "standard" | "premium" | "enterprise";
}
```

### 5.3 Opus Workflow (Core Processing Engine)

#### Workflow Name
`APSIC_Public_Safety_Intake_v1`

#### Stage 1: Intake

**Data Import Node**
- Accepts payload from backend API
- Normalizes into canonical format:

```json
{
  "incident_id": "uuid-v4",
  "text": "Incident description...",
  "media_urls": ["https://..."],
  "reporter_wallet": "SolanaAddress...",
  "timestamp": "ISO-8601",
  "incident_type": "harassment" | "auto"
}
```

**External Data Fetch Node (Optional)**
- Reverse geocoding based on text mentions or metadata
- Weather data (for outdoor incidents)
- Public records lookup

#### Stage 2: Understand (Gemini Multimodal)

**AI Node 1: Extraction & Classification**

**Prompt:**
```
You are an expert public safety incident analyst. Analyze the following incident report:

TEXT: {text}
IMAGES: {image_urls}
AUDIO: {audio_transcript if available}

Extract and classify:
1. Incident Type (harassment, accident, cyber, infrastructure, medical, other)
2. Severity Score (0-100, where 100 is most critical)
3. Severity Label (Low 0-25, Medium 26-50, High 51-75, Critical 76-100)
4. Entities:
   - Location (city, building, room, etc.)
   - Time/Date (if different from submission time)
   - Involved Parties (names, roles, descriptions)
5. Emotional Tone (calm, concerned, distressed, angry, fearful)
6. Risk Indicators (weapons, injuries, threats, ongoing danger)

Return JSON format.
```

**AI Node 2: Summary & Recommendations**

**Prompt:**
```
Based on the classified incident:
Type: {incident_type}
Severity: {severity_label} ({severity_score})
Entities: {entities_json}

Generate:
1. A concise 2-3 sentence summary for human reviewers
2. Recommended next actions (3-5 specific steps) based on severity and type
3. Urgency level (immediate, within 1 hour, within 24 hours, routine)

Use established public safety best practices.
```

**Outputs:**
```json
{
  "severity_score": 87,
  "severity_label": "High",
  "incident_type": "Harassment",
  "entities": {
    "location": "North Campus, Building 4",
    "time": "2025-11-17 14:30",
    "parties": ["Student A (reporter)", "Student B (subject)"]
  },
  "emotion": "distressed",
  "risk_indicators": ["ongoing threats", "pattern of behavior"],
  "summary": "Student reports ongoing harassment via text messages with threatening content. Pattern suggests escalation. Requires immediate review.",
  "recommended_actions": [
    "Notify campus security immediately",
    "Contact student counseling services",
    "Document all evidence",
    "Schedule interview with reporter",
    "Initiate investigation protocol"
  ],
  "urgency": "within 1 hour"
}
```

#### Stage 3: Decide (Rules Engine + AI Validation)

**Rules Node**
```typescript
// Rule-based routing logic
if (severity_score > 80) {
  route = "Escalate";
  triggers.push("severity>80");
}

if (risk_indicators.includes("weapon") || risk_indicators.includes("injury")) {
  route = "Immediate";
  triggers.push("weapon_or_injury");
}

if (severity_score > 50 && severity_score <= 80) {
  route = "Review";
  triggers.push("medium_high_severity");
}

if (emotion === "distressed" && incident_type === "Harassment") {
  route = "Escalate";
  triggers.push("distressed_harassment");
}

if (severity_score <= 50) {
  route = "LogOnly";
}
```

**AI Validation Node (Gemini)**

**Prompt:**
```
Review this routing decision:
Incident: {summary}
Severity: {severity_label} ({severity_score})
Rule-based Route: {route}
Rules Triggered: {rules_triggered}

Questions:
1. Does this routing seem appropriate? (Yes/No)
2. Are there any factors the rules might have missed?
3. Should this be escalated or de-escalated?
4. Provide brief reasoning.

Return JSON.
```

**Outputs:**
```json
{
  "route": "Escalate",
  "rules_triggered": ["severity>80", "distressed_harassment"],
  "ai_validation": {
    "agrees_with_routing": true,
    "override_suggested": false,
    "reasoning": "High severity harassment with ongoing threats warrants escalation. Reporter's distress level supports urgency.",
    "additional_factors": ["Pattern of behavior suggests repeat offender"]
  }
}
```

#### Stage 4: Review

**Agentic Review Node (Gemini)**

**Prompt:**
```
Conduct a policy compliance and bias check:
Incident: {summary}
Proposed Route: {route}
Reasoning: {ai_reasoning}

Check for:
1. Policy Compliance: Does this follow organizational incident response policies?
2. Bias Detection: Are there any potential biases in the classification or routing?
3. Missing Information: Is any critical information missing?
4. Legal Considerations: Are there any legal or regulatory concerns?

Return JSON with pass/fail and notes.
```

**Output:**
```json
{
  "policy_compliance": {
    "passed": true,
    "notes": "Follows standard harassment response protocol"
  },
  "bias_check": {
    "passed": true,
    "concerns": []
  },
  "missing_information": ["Witness statements", "Prior incidents with subject"],
  "legal_considerations": ["Title IX reporting requirements", "Mandatory notification to parents if minors"],
  "overall_passed": true
}
```

**Human Review Node**

**Trigger Conditions:**
- `severity_label in ["High", "Critical"]` OR
- `agentic_review.overall_passed === false` OR
- `confidence_score < 0.7` OR
- `legal_considerations.length > 0`

**For Hackathon:**
- Present as "Human Review" task in Opus dashboard
- Demo with pre-approved "Reviewed & Approved" sample
- Show UI for review queue in admin panel

**Human Reviewer Interface:**
- View full incident details
- See AI reasoning and recommendations
- Approve / Request More Info / Reject
- Add reviewer notes
- Assign to specific team/person

#### Stage 5: Provenance & Audit

**Audit Log Generation Node**

**Output Schema:**
```json
{
  "incident_id": "uuid",
  "version": "1.0",
  "timestamp": "ISO-8601",
  "input": {
    "text": "...",
    "media_urls": [],
    "reporter_wallet": "...",
    "submission_timestamp": "..."
  },
  "processing_pipeline": {
    "intake": {
      "timestamp": "...",
      "normalized_data": {}
    },
    "understand": {
      "timestamp": "...",
      "gemini_extraction": {},
      "gemini_summary": {}
    },
    "decide": {
      "timestamp": "...",
      "rules_triggered": [],
      "ai_validation": {}
    },
    "review": {
      "timestamp": "...",
      "agentic_review": {},
      "human_review": {
        "required": true,
        "completed": true,
        "reviewer": "john.doe@org.com",
        "decision": "approved",
        "notes": "..."
      }
    }
  },
  "final_decision": {
    "route": "Escalate",
    "severity": "High",
    "priority": "within 1 hour",
    "assigned_to": "Security Team",
    "recommended_actions": []
  },
  "similar_incidents": [
    {
      "incident_id": "...",
      "similarity_score": 0.89,
      "summary": "..."
    }
  ],
  "external_data_sources": [
    "Geocoding API",
    "Historical Incident Database"
  ],
  "credits_used": 1,
  "processing_time_ms": 3421
}
```

**PDF Generation (Stretch Goal)**
- Use Puppeteer or similar to generate PDF from audit JSON
- Include charts and visualizations

#### Stage 6: Delivery

**Data Export Node**
- Write to Google Sheets (for tracking)
- Send email notification to assigned team
- Webhook callback to external systems (optional)

**API Response Node**
- Return audit JSON to backend API
- Backend stores in database
- Backend returns to frontend

### 5.4 Qdrant Integration

#### Collection Schema
**Collection Name:** `incidents`

**Vector Configuration:**
- **Dimension:** 768 (or 1536 depending on embedding model)
- **Distance Metric:** Cosine similarity

**Payload Fields:**
```json
{
  "id": "uuid",
  "text": "incident description",
  "summary": "AI-generated summary",
  "severity_score": 0.87,
  "severity_label": "High",
  "incident_type": "harassment",
  "timestamp": "ISO-8601",
  "route": "Escalate",
  "reporter_wallet": "SolanaAddress",
  "entities": {},
  "tags": ["harassment", "campus", "urgent"]
}
```

#### Workflow

**After Opus Completion:**
1. Backend receives audit log from Opus
2. Generate text embedding:
   - Combine: `text + summary + incident_type + entities`
   - Call embedding API (Gemini or OpenAI)
3. Upsert to Qdrant:
   ```typescript
   await qdrantClient.upsert('incidents', {
     points: [{
       id: incident_id,
       vector: embedding,
       payload: { /* fields above */ }
     }]
   });
   ```

**On New Incident Submission:**
1. After triage, generate embedding for new incident
2. Query Qdrant:
   ```typescript
   const results = await qdrantClient.search('incidents', {
     vector: new_incident_embedding,
     limit: 3,
     filter: {
       // Optional: same incident_type or severity range
     }
   });
   ```
3. Return top-3 similar incidents to frontend
4. Display in "Similar Cases" section

#### Example Similar Incident Card
```json
{
  "incident_id": "abc-123",
  "similarity_score": 0.92,
  "severity_label": "High",
  "incident_type": "Harassment",
  "timestamp": "2025-10-15T10:30:00Z",
  "summary": "Student reported threatening messages via social media...",
  "route": "Escalated to Dean's Office"
}
```

### 5.5 Solana SPL Token Integration

#### Token Details
**Token Name:** Sentinel Incident Credit (SIC)
**Token Type:** SPL Token on Solana
**Network:** Devnet (for hackathon), Mainnet (for production)

#### Hackathon Implementation (Off-Chain with Blockchain Read)

**Credit Management:**
1. **Initialize Mock Ledger:**
   ```typescript
   // In-memory map for demo
   const walletCredits = new Map<string, number>();

   // Seed demo wallets
   walletCredits.set('DemoWallet1...', 10);
   walletCredits.set('DemoWallet2...', 100);
   walletCredits.set('StakedWallet...', 1000); // Premium tier
   ```

2. **Check Balance (Optional Blockchain Read):**
   ```typescript
   async function getCredits(wallet: string): Promise<number> {
     // Option 1: Mock
     return walletCredits.get(wallet) ?? 0;

     // Option 2: Read real SPL token balance from Devnet
     const balance = await connection.getTokenAccountBalance(
       await getAssociatedTokenAddress(SIC_MINT, walletPublicKey)
     );
     return balance.value.uiAmount ?? 0;
   }
   ```

3. **Decrement Credits:**
   ```typescript
   async function processIncident(wallet: string, incidentData: any) {
     const credits = await getCredits(wallet);

     if (credits < 1) {
       throw new Error('Insufficient credits. Please purchase more SIC tokens.');
     }

     // Process incident...

     // Decrement (off-chain for hackathon)
     walletCredits.set(wallet, credits - 1);

     // TODO: Future - write transaction to Solana for on-chain accounting
   }
   ```

4. **Priority Tiers:**
   ```typescript
   function getPriorityTier(credits: number): string {
     if (credits >= 1000) return 'enterprise'; // Fast-track processing
     if (credits >= 100) return 'premium';     // Standard + priority support
     return 'standard';                         // Standard processing
   }
   ```

#### Frontend Integration
- Use `@solana/wallet-adapter-react` for wallet connection
- Display credit balance in header
- Disable submit button if credits < 1
- Show upgrade prompt for low balances

#### Future On-Chain Features (Post-Hackathon)
- **On-Chain Credit Burn:** Actual SPL token burn transaction per incident
- **Staking Mechanism:** Stake SIC for priority access and discounts
- **Subscription Model:** Monthly credit packages via smart contract
- **DAO Governance:** Token holders vote on policy changes
- **Surge Integration:** Multi-chain launchpad for fundraising and distribution

---

## 6. Technical Architecture

### 6.1 System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         User (Reporter)                          │
│                  [Web Browser + Solana Wallet]                   │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             │ HTTPS
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                  Frontend (Next.js + Tailwind)                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │   Reporter   │  │   Results    │  │   Admin Dashboard    │  │
│  │    Panel     │  │    Panel     │  │   (Read-Only Demo)   │  │
│  └──────────────┘  └──────────────┘  └──────────────────────┘  │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             │ REST API / tRPC
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│            Backend API (Node.js + TypeScript + Express)          │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Routes: /incidents, /credits, /admin                     │  │
│  └──────────────────────────────────────────────────────────┘  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐ │
│  │ Opus Client  │  │Qdrant Client │  │  Solana RPC Client   │ │
│  └──────┬───────┘  └──────┬───────┘  └──────────┬───────────┘ │
└─────────┼──────────────────┼──────────────────────┼─────────────┘
          │                  │                      │
          │                  │                      │
          ▼                  ▼                      ▼
┌──────────────────┐ ┌──────────────┐  ┌──────────────────────┐
│  Opus Workflows  │ │   Qdrant     │  │   Solana Devnet      │
│                  │ │  Vector DB   │  │  (SPL Token Reads)   │
│ ┌──────────────┐ │ │              │  │                      │
│ │ 1. Intake    │ │ │  Collection: │  │  SIC Token Balance   │
│ │ 2. Understand│◄┼─┤  "incidents" │  │  Wallet Verification │
│ │ 3. Decide    │ │ │              │  │                      │
│ │ 4. Review    │ │ │  Similarity  │  └──────────────────────┘
│ │ 5. Audit     │ │ │   Search     │
│ │ 6. Deliver   │ │ │              │
│ └──────┬───────┘ │ └──────────────┘
│        │         │
│        │ Uses    │
│        ▼         │
│  ┌──────────────┐│
│  │ Gemini API   ││
│  │ (Multimodal) ││
│  └──────────────┘│
└──────────────────┘

Database (PostgreSQL)
┌──────────────────┐
│  - incidents     │
│  - audit_logs    │
│  - users         │
│  - credits_ledger│
└──────────────────┘
```

### 6.2 Data Flow

**Happy Path: Incident Submission to Resolution**

1. **User Action:**
   - Connect Solana wallet
   - Fill incident form (text + optional media)
   - Click "Submit"

2. **Frontend:**
   - Validate inputs
   - Check credit balance (call `/api/credits/:wallet`)
   - Upload media files (if any) to storage (S3 or similar)
   - POST to `/api/incidents/submit`

3. **Backend:**
   - Authenticate wallet
   - Verify credits >= 1
   - Normalize payload
   - Trigger Opus workflow (async)
   - Return `{ incident_id, status: "processing" }`

4. **Opus Workflow:**
   - **Intake:** Normalize data, fetch external context
   - **Understand:** Call Gemini to extract fields, classify, summarize
   - **Decide:** Apply rules, validate with AI
   - **Review:** Agentic check, queue for human review if needed
   - **Audit:** Generate comprehensive log
   - **Deliver:** Return to backend, export to external systems

5. **Backend (Post-Opus):**
   - Receive audit log from Opus
   - Generate embedding
   - Upsert to Qdrant
   - Query Qdrant for similar incidents
   - Store in database
   - Decrement credits
   - Return results to frontend (or via webhook/polling)

6. **Frontend (Results):**
   - Display severity, summary, actions
   - Show similar incidents
   - Provide audit log download

### 6.3 Technology Stack Summary

| Component | Technology | Purpose |
|-----------|-----------|---------|
| **Frontend** | Next.js 14+, React, Tailwind CSS | User interface |
| **Backend** | Node.js 20+, TypeScript, Express/Fastify | API server |
| **Workflow Engine** | Opus | Orchestration and tracing |
| **AI/ML** | Google Gemini (multimodal) | Understanding, classification, reasoning |
| **Vector DB** | Qdrant | Similarity search |
| **Blockchain** | Solana (Devnet), SPL Token | Credit gating |
| **Database** | PostgreSQL or SQLite | Incident storage |
| **File Storage** | AWS S3 or Cloudflare R2 | Media uploads |
| **Authentication** | Solana Wallet Adapter | Wallet-based auth |

---

## 7. Metrics & Success Criteria

### 7.1 Hackathon Success Criteria

#### ✅ Functional Completeness
- [ ] End-to-end incident submission works (text + image minimum)
- [ ] Opus workflow executes all 6 stages
- [ ] Gemini successfully extracts fields and classifies severity
- [ ] Qdrant returns similar incidents
- [ ] SPL credit check blocks/permits processing
- [ ] Audit JSON is downloadable
- [ ] Admin panel displays incident list

#### ✅ Demo Quality
- [ ] Live demo OR high-quality recorded video (3-5 min)
- [ ] Clear narrative: problem → solution → tech stack → demo
- [ ] At least 2 different incident types demonstrated
- [ ] Similar incidents feature showcased
- [ ] Credit gating demonstrated (show rejection when out of credits)

#### ✅ Documentation
- [ ] README with setup instructions
- [ ] Architecture diagram
- [ ] API documentation
- [ ] Video walkthrough link

### 7.2 Future Production Metrics

**Operational Metrics:**
- **Time to Triage:** Median time from submission to initial classification
- **Accuracy:** % of incidents correctly classified (validated by human review)
- **Throughput:** Incidents processed per hour
- **Availability:** System uptime (target 99.9%)

**Quality Metrics:**
- **Escalation Precision:** % of escalated cases that truly needed escalation
- **Human Review Rate:** % of incidents requiring human review
- **Similarity Relevance:** User rating of similar incident suggestions

**Business Metrics:**
- **Credit Usage:** Average credits consumed per organization
- **Token Velocity:** SIC token transactions per day
- **User Satisfaction:** NPS score from safety ops managers

---

## 8. Roadmap

### Phase 1: Hackathon MVP (Current)
- ✅ Core pipeline: Intake → Understand → Decide → Review → Deliver
- ✅ Gemini multimodal integration
- ✅ Qdrant similarity search
- ✅ Solana SPL token credit check (off-chain)
- ✅ Basic frontend and admin panel
- ✅ Audit log generation

### Phase 2: Post-Hackathon (v1.1)
- Enhanced frontend UX
- Incident timeline visualization
- Multi-organization support (tenant isolation)
- Role-based access control (RBAC)
- Advanced filtering and search
- Email/SMS notifications
- Webhook integrations

### Phase 3: Production Ready (v1.5)
- On-chain credit settlement (burn SPL tokens)
- Production security hardening
- PII redaction and GDPR compliance
- Real-time incident streaming
- Mobile apps (iOS/Android)
- SOC 2 Type II compliance

### Phase 4: Platform Expansion (v2.0)
- Domain-specific models:
  - School safety
  - Cyber operations
  - Infrastructure monitoring
  - Healthcare incidents
- DAO governance for policy decisions
- Staking mechanism for priority access
- Surge integration for multi-chain launchpad
- API marketplace for third-party integrations

### Phase 5: Enterprise Features (v2.5+)
- Custom playbooks and workflows
- Integration with CAD systems (Computer-Aided Dispatch)
- Advanced analytics and reporting dashboards
- Machine learning model fine-tuning per organization
- White-label deployments

---

## 9. Risks & Mitigations

### 9.1 Technical Risks

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| **Gemini API rate limits** | High | Medium | Implement request queuing, caching, and fallback to simpler models |
| **Opus workflow failures** | High | Low | Add retry logic, error handling, and fallback to manual processing |
| **Qdrant performance with large datasets** | Medium | Medium | Use collection optimization, sharding, and pagination |
| **Solana RPC downtime** | Medium | Low | Cache credit balances, use multiple RPC providers |
| **Media file upload failures** | Low | Medium | Implement chunked uploads, retry logic, and CDN |

### 9.2 Product Risks

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| **Content sensitivity, PII, legal** | High | High | Use synthetic/demo data for hackathon; build PII redaction for production |
| **AI hallucinations or bias** | High | Medium | Human-in-the-loop for high-severity cases; agentic review layer |
| **Over-engineering tokenomics** | Medium | High | Keep SPL to simple credit counter for hackathon; explain vision verbally |
| **Too many integrations** | Medium | High | Focus on ONE strong scenario (school harassment); polish that flow |
| **User trust in AI decisions** | High | Medium | Transparent audit logs; human review checkpoints; clear explanations |

### 9.3 Go-to-Market Risks

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| **Regulatory hurdles** | High | Medium | Partner with legal/compliance experts; build for specific use cases first |
| **Competition from incumbents** | Medium | High | Focus on AI-native, multimodal, and blockchain differentiators |
| **Token adoption** | Medium | Medium | Offer fiat payment option; make token optional for early adopters |

---

## 10. Open Questions & Decisions Needed

### 10.1 For Immediate Resolution (Hackathon)

- [ ] **Gemini API Access:** Do we have API keys and quota?
- [ ] **Opus Access:** Do we have account and sufficient credits?
- [ ] **Qdrant Hosting:** Local Docker or cloud instance?
- [ ] **Solana Network:** Devnet only, or also test on Mainnet?
- [ ] **Demo Data:** How many synthetic incidents to seed?
- [ ] **Video or Live Demo:** Which format for final presentation?

### 10.2 For Future Consideration

- [ ] **Pricing Model:** Per-incident, subscription, or hybrid?
- [ ] **Token Economics:** Fixed supply or inflationary SIC token?
- [ ] **DAO Structure:** How to govern policy changes?
- [ ] **Multi-Chain:** Expand beyond Solana (use Surge)?
- [ ] **White-Label:** Allow organizations to self-host?

---

## 11. Appendix

### 11.1 Glossary

- **APSIC:** AI Public Safety Intake Commander
- **Opus:** Workflow orchestration platform by [Vendor Name]
- **Gemini:** Google's multimodal AI model
- **Qdrant:** Open-source vector database
- **SPL Token:** Solana Program Library token standard
- **SIC:** Sentinel Incident Credit (the SPL token)
- **Surge:** Multi-chain launchpad platform
- **CAD:** Computer-Aided Dispatch (used by emergency services)

### 11.2 References

- [Opus Documentation](https://opus.example.com/docs)
- [Gemini API Reference](https://ai.google.dev/docs)
- [Qdrant Documentation](https://qdrant.tech/documentation/)
- [Solana SPL Token Guide](https://spl.solana.com/token)
- [Surge Platform](https://surge.example.com)

### 11.3 Contact & Support

- **Project Lead:** [Name]
- **GitHub Repo:** https://github.com/[org]/apsic
- **Demo Video:** [YouTube/Loom Link]
- **Slack Channel:** #apsic-hackathon

---

**END OF PRD**
