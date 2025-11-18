# APSIC - AI Public Safety Intake Commander

**Codename:** SentinelCredits

A multimodal AI intake and triage system for public safety incidents, powered by Gemini, Opus, Qdrant, and Solana.

---

## 🎯 Overview

APSIC is an AI-powered pipeline that processes public safety incidents across text, images, audio, and video. It intelligently classifies, triages, and routes cases while maintaining a complete audit trail.

**Pipeline:** Intake → Understand → Decide → Review → Deliver

### Key Features

- 🤖 **Multimodal AI Processing** - Gemini analyzes text, images, audio, and video
- 🔄 **Opus Workflow Orchestration** - Structured pipeline with human-in-the-loop
- 🔍 **Vector Search** - Qdrant finds similar historical incidents
- 💎 **Blockchain Credits** - Solana SPL token for access gating
- 📊 **Complete Audit Trail** - Full provenance and transparency
- ⚡ **Real-time Triage** - Automatic severity classification and routing

---

## 📚 Documentation

- **[Product Requirements Document (PRD)](./docs/PRD.md)** - Complete product specification
- **[Technical Architecture](./docs/ARCHITECTURE.md)** - System design and data flow
- **[API Specification](./docs/API_SPEC.md)** - REST API reference
- **[Implementation Roadmap](./docs/ROADMAP.md)** - Hackathon milestones and tasks

---

## 🏗️ Architecture

```
┌─────────────┐
│   Frontend  │ (Next.js + Tailwind)
│  Reporter   │ → Submit incident (text + media)
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  Backend    │ (Node.js + TypeScript)
│   API       │ → Check credits, trigger workflow
└──────┬──────┘
       │
       ▼
┌─────────────┐         ┌─────────────┐         ┌─────────────┐
│    Opus     │ ←────→  │   Gemini    │         │   Qdrant    │
│  Workflow   │         │(Multimodal) │         │  (Vector)   │
└──────┬──────┘         └─────────────┘         └──────┬──────┘
       │                                                │
       └────────────────────────────────────────────────┘
                          │
                          ▼
                ┌─────────────────┐
                │  PostgreSQL     │
                │  + S3 Storage   │
                └─────────────────┘
```

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** 20+
- **PostgreSQL** 15+
- **Docker** (optional, for local services)
- **Solana CLI** (optional, for token testing)

### Environment Setup

1. **Clone the repository**

```bash
git clone https://github.com/yourusername/apsic.git
cd apsic
```

2. **Install dependencies**

```bash
# Backend
cd services/backend
npm install

# Frontend
cd ../../apps/web-frontend
npm install
```

3. **Set up environment variables**

Create `.env` files:

**`services/backend/.env`:**
```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/apsic

# API Keys
OPUS_API_KEY=your_opus_api_key
GEMINI_API_KEY=your_gemini_api_key

# Solana
SOLANA_RPC_URL=https://api.devnet.solana.com
SIC_TOKEN_MINT=your_spl_token_mint_address

# Qdrant
QDRANT_URL=http://localhost:6333
QDRANT_API_KEY=  # Optional for cloud

# Storage
AWS_ACCESS_KEY_ID=your_aws_key
AWS_SECRET_ACCESS_KEY=your_aws_secret
AWS_S3_BUCKET=apsic-uploads
AWS_REGION=us-east-1

# Server
PORT=4000
NODE_ENV=development
```

**`apps/web-frontend/.env.local`:**
```env
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_SOLANA_NETWORK=devnet
```

4. **Start local services (Docker Compose)**

```bash
docker-compose up -d
```

This starts:
- PostgreSQL (port 5432)
- Qdrant (port 6333)

5. **Run database migrations**

```bash
cd services/backend
npx prisma migrate dev
npx prisma generate
```

6. **Seed demo data (optional)**

```bash
npm run seed
```

7. **Start the development servers**

```bash
# Terminal 1: Backend
cd services/backend
npm run dev  # Runs on http://localhost:4000

# Terminal 2: Frontend
cd apps/web-frontend
npm run dev  # Runs on http://localhost:3000
```

8. **Open the app**

Navigate to [http://localhost:3000](http://localhost:3000)

---

## 🎮 Usage

### Submitting an Incident

1. **Connect Wallet**
   - Click "Connect Wallet" and select your Solana wallet (Phantom, Solflare, etc.)
   - For demo purposes, you can use the "Mock Wallet" option

2. **Fill the Form**
   - Enter incident description (text)
   - Optionally select incident type (or use "Auto-detect")
   - Upload image/audio/video files (optional)

3. **Submit**
   - Click "Submit Incident"
   - System checks your credit balance (requires ≥1 credit)
   - Incident is sent to Opus for processing

4. **View Results**
   - After ~30 seconds, results appear:
     - Severity score and label
     - AI-generated summary
     - Recommended actions
     - Similar past incidents
   - Download audit log (JSON)

### Admin Panel

Navigate to [http://localhost:3000/incidents](http://localhost:3000/incidents) to view all incidents.

**Features:**
- Filter by severity, type, status
- Sort by date, severity
- Click incident to view details
- Download audit logs

---

## 🧪 Testing

### Run Tests

```bash
# Backend tests
cd services/backend
npm test

# Frontend tests
cd apps/web-frontend
npm test
```

### Manual Testing Scenarios

**Scenario 1: High-Severity Harassment Report**
- Text: "Student is receiving threatening messages with violent language. Attached screenshots show escalating threats."
- Image: Upload screenshot of threatening messages
- Expected: Severity = High, Route = Escalate

**Scenario 2: Low-Severity Noise Complaint**
- Text: "Loud music from neighboring dorm room at 10pm."
- Expected: Severity = Low, Route = LogOnly

**Scenario 3: Critical Accident**
- Text: "Student fell down stairs in Building 4. Unconscious and bleeding."
- Expected: Severity = Critical, Route = Immediate

**Scenario 4: Insufficient Credits**
- Set wallet credits to 0
- Try to submit incident
- Expected: Error "Insufficient credits"

---

## 📦 Project Structure

```
apsic/
├── apps/
│   └── web-frontend/              # Next.js frontend
│       ├── src/
│       │   ├── app/               # App Router pages
│       │   ├── components/        # React components
│       │   ├── lib/               # Utilities
│       │   └── store/             # State management
│       └── package.json
│
├── services/
│   ├── backend/                   # Node.js API server
│   │   ├── src/
│   │   │   ├── routes/            # API routes
│   │   │   ├── services/          # Business logic
│   │   │   ├── lib/               # Client libraries
│   │   │   └── middleware/        # Express middleware
│   │   └── package.json
│   │
│   └── scripts/                   # Utility scripts
│       └── seedDemoData.ts        # Seed database
│
├── docs/                          # Documentation
│   ├── PRD.md
│   ├── ARCHITECTURE.md
│   ├── API_SPEC.md
│   └── ROADMAP.md
│
├── docker-compose.yml             # Local services
├── README.md
└── package.json
```

---

## 🛠️ Development

### Adding a New Incident Type

1. **Update TypeScript Types**

```typescript
// services/backend/src/types/index.ts
export type IncidentType =
  | 'harassment'
  | 'accident'
  | 'cyber'
  | 'infrastructure'
  | 'your_new_type'  // Add here
  | 'other';
```

2. **Update Gemini Prompts**

```typescript
// services/backend/src/lib/geminiClient.ts
const INCIDENT_TYPES = [
  'harassment',
  'accident',
  'cyber',
  'infrastructure',
  'your_new_type',  // Add here
  'other'
];
```

3. **Update Frontend Selector**

```tsx
// apps/web-frontend/src/components/reporter/IncidentForm.tsx
const INCIDENT_TYPES = [
  { value: 'auto', label: 'Auto-detect' },
  // ...
  { value: 'your_new_type', label: 'Your New Type' },
];
```

### Customizing Opus Workflow

Edit the workflow definition in the Opus dashboard or via API:

1. Navigate to Opus Workflows
2. Select `APSIC_Public_Safety_Intake_v1`
3. Modify nodes (e.g., add new rules in "Decide" stage)
4. Save and test

### Deploying New Embeddings Model

To switch from Gemini embeddings to OpenAI or custom model:

1. Update `services/backend/src/lib/embeddingService.ts`
2. Change `generateEmbedding()` implementation
3. Update Qdrant collection dimension if needed
4. Re-index existing incidents

---

## 🚢 Deployment

### Deploying to Production

**Frontend (Vercel):**

```bash
cd apps/web-frontend
vercel --prod
```

**Backend (Railway / AWS):**

```bash
cd services/backend
railway up
# OR
docker build -t apsic-backend .
docker push your-registry/apsic-backend
```

**Database (AWS RDS / Supabase):**

1. Create PostgreSQL instance
2. Update `DATABASE_URL` in environment variables
3. Run migrations: `npx prisma migrate deploy`

**Qdrant (Cloud or Self-Hosted):**

1. Sign up at [Qdrant Cloud](https://cloud.qdrant.io)
2. Create cluster
3. Update `QDRANT_URL` and `QDRANT_API_KEY`

### Environment Variables for Production

Ensure all secrets are set in your deployment platform:

- `OPUS_API_KEY`
- `GEMINI_API_KEY`
- `DATABASE_URL`
- `QDRANT_URL`
- `QDRANT_API_KEY`
- `SOLANA_RPC_URL` (use Mainnet or premium RPC)
- `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_S3_BUCKET`

---

## 🧑‍💻 Contributing

We welcome contributions! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Code Style

- **TypeScript** for all code
- **ESLint + Prettier** for linting and formatting
- **Conventional Commits** for commit messages

---

## 📄 License

This project is licensed under the MIT License. See [LICENSE](./LICENSE) for details.

---

## 🙏 Acknowledgments

- **Gemini** - Multimodal AI processing
- **Opus** - Workflow orchestration
- **Qdrant** - Vector similarity search
- **Solana** - Blockchain infrastructure
- **Next.js** - Frontend framework

---

## 📞 Support

- **Documentation:** [docs/](./docs/)
- **Issues:** [GitHub Issues](https://github.com/yourusername/apsic/issues)
- **Discussions:** [GitHub Discussions](https://github.com/yourusername/apsic/discussions)

---

## 🎥 Demo

**Video Walkthrough:** [YouTube Link](#)

**Live Demo:** [https://apsic-demo.vercel.app](#)

---

**Built with ❤️ for safer communities**
