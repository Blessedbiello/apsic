# 🚀 APSIC Complete Setup Guide

**AI Public Safety Intake Commander - Full Build**

This guide will help you get APSIC running locally with all features enabled.

---

## 📋 Prerequisites

Before starting, ensure you have:

- ✅ **Node.js 20+** ([Download](https://nodejs.org/))
- ✅ **Git** ([Download](https://git-scm.com/))
- ✅ **Docker Desktop** ([Download](https://www.docker.com/products/docker-desktop/))
- ✅ **Solana Wallet** (Phantom or Solflare browser extension)

---

## 🔑 Step 1: Get API Keys

### 1.1 Gemini API Key (REQUIRED)

1. Visit [Google AI Studio](https://ai.google.dev/)
2. Click "Get API Key"
3. Create or select a project
4. Copy your API key
5. Save it - you'll need it in Step 3

### 1.2 Opus API Key (REQUIRED)

1. Visit [Opus.com](https://www.opus.com/)
2. Sign up for an account
3. During signup, enter promo code: **LABLABX50** (ALL CAPS)
4. This gives you 50 man-hour credits (worth $75)
5. Go to Settings → API Keys
6. Generate new API key
7. Save it securely

### 1.3 Qdrant (Optional - Can use Docker)

For local development, we'll use Docker (included in docker-compose.yml).

For production, you can use Qdrant Cloud:
1. Visit [cloud.qdrant.io](https://cloud.qdrant.io/)
2. Create free cluster
3. Copy API URL and API key

### 1.4 Solana (Optional for testing)

For testing, we use Devnet (no keys needed).
For production, you can get premium RPC from:
- [Helius](https://helius.dev/)
- [QuickNode](https://www.quicknode.com/)

---

## 📦 Step 2: Install Dependencies

### 2.1 Clone and Navigate

```bash
cd ~/apsic
```

### 2.2 Install Backend Dependencies

```bash
cd services/backend
npm install
```

This installs:
- Express server
- Prisma ORM
- Gemini SDK
- Opus client
- Qdrant client
- Solana Web3.js
- Puppeteer (for PDFs)
- All other dependencies

**Note:** Puppeteer may take a few minutes to download Chromium.

### 2.3 Install Frontend Dependencies

```bash
cd ../../apps/web-frontend
npm install
```

This installs:
- Next.js 14
- React 18
- Solana Wallet Adapter
- React Query
- Tailwind CSS
- All UI dependencies

---

## 🔧 Step 3: Configure Environment Variables

### 3.1 Backend Environment

```bash
cd ~/apsic/services/backend
cp .env.example .env
```

Now edit `.env` with your favorite editor:

```bash
nano .env
# or
code .env
# or
vim .env
```

**Replace the following values:**

```env
# CRITICAL: Add your API keys here
GEMINI_API_KEY=your_gemini_api_key_here
OPUS_API_KEY=your_opus_api_key_here

# Optional: If using Qdrant Cloud
QDRANT_URL=http://localhost:6333
QDRANT_API_KEY=

# Optional: If using custom Solana RPC
SOLANA_RPC_URL=https://api.devnet.solana.com

# Leave these as-is for local development
DATABASE_URL=postgresql://apsic:apsic_password@localhost:5432/apsic
PORT=4000
CORS_ORIGIN=http://localhost:3000
```

### 3.2 Frontend Environment

```bash
cd ~/apsic/apps/web-frontend
cp .env.local.example .env.local
```

Edit `.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_SOLANA_NETWORK=devnet
```

---

## 🐳 Step 4: Start Docker Services

From the project root:

```bash
cd ~/apsic
docker-compose up -d
```

This starts:
- **PostgreSQL** (port 5432)
- **Qdrant** (port 6333)
- **Redis** (port 6379)

Verify services are running:

```bash
docker-compose ps
```

All services should show "Up" status.

**Access Qdrant Dashboard:** http://localhost:6333/dashboard

---

## 🗄️ Step 5: Setup Database

### 5.1 Run Prisma Migrations

```bash
cd ~/apsic/services/backend
npx prisma migrate dev --name init
```

This creates all database tables.

### 5.2 Generate Prisma Client

```bash
npx prisma generate
```

### 5.3 (Optional) Seed Demo Data

```bash
npm run db:seed
```

This creates:
- 5 demo wallets with credits
- 20 sample incidents
- Vector embeddings in Qdrant

---

## 🚀 Step 6: Start the Application

### 6.1 Start Backend (Terminal 1)

```bash
cd ~/apsic/services/backend
npm run dev
```

You should see:

```
🚀 APSIC Backend API is running!
📍 Server listening on port: 4000
🌐 API URL: http://localhost:4000
🤖 Gemini API: ✅ Configured
🔄 Opus API: ✅ Configured
🔍 Qdrant: http://localhost:6333
💎 Solana: Devnet
```

### 6.2 Start Frontend (Terminal 2)

```bash
cd ~/apsic/apps/web-frontend
npm run dev
```

You should see:

```
▲ Next.js 14.2.15
- Local:        http://localhost:3000
```

---

## 🎉 Step 7: Test the Application

### 7.1 Open the App

Visit [http://localhost:3000](http://localhost:3000)

### 7.2 Connect Wallet

1. Click "Connect Wallet"
2. Select Phantom or Solflare
3. Approve connection
4. You should see your credit balance (10 free credits for demo wallets)

### 7.3 Submit Test Incident

**Example Incident #1 (Harassment)**

```
Type: Harassment
Description:
Student is receiving threatening messages via social media. Messages include violent language and threats. This has been ongoing for 3 days. Student is afraid to come to campus.
```

Click "Submit Incident" → Wait ~10-30 seconds → See results!

**Example Incident #2 (Accident)**

```
Type: Accident
Description:
Student fell down stairs in Building 4, 2nd floor. Conscious but unable to move right leg. Bleeding from head wound. Emergency services have been called.
```

**Example Incident #3 (Cyber)**

```
Type: Cyber
Description:
Multiple students reporting phishing emails claiming to be from IT department asking for password reset. Email includes suspicious link to external site.
```

### 7.4 Verify Results

You should see:
- ✅ Severity classification (Low/Medium/High/Critical)
- ✅ AI-generated summary
- ✅ Recommended actions
- ✅ Similar incidents (if database has data)
- ✅ Downloadable audit log (JSON)

### 7.5 View All Incidents

Click "View All Incidents" to see the list page with filters and pagination.

---

## 🔍 Step 8: Verify All Features

### 8.1 Multimodal Input

**NOTE:** File upload is mocked in the current implementation for the hackathon.
In production, you would:
1. Set up AWS S3 or Cloudflare R2
2. Add upload credentials to `.env`
3. Implement actual file upload in `IncidentForm.tsx`

For now, files are simulated with mock URLs, but the backend processes them correctly.

### 8.2 Vector Search

Submit multiple incidents of the same type to see similar incidents appear.

### 8.3 PDF Generation

Backend generates PDFs automatically. Check console logs to see PDF generation messages.

### 8.4 Credit System

- New wallets get 10 free credits (mock)
- Each incident costs 1 credit
- After 10 submissions, you'll get "Insufficient credits" error
- Use `/api/credits/add` to add more (see API docs)

---

## 🎨 Step 9: Opus Workflow Integration

### 9.1 Create Workflow in Opus UI

1. Log in to [Opus.com](https://www.opus.com/)
2. Go to "Workflows" → "Create New"
3. Name it: `APSIC_Public_Safety_Intake_v1`
4. Use the visual builder to create stages:
   - **Intake** → Data Import node
   - **Understand** → AI Agent (Gemini)
   - **Decide** → Code node (rules) + AI validation
   - **Review** → AI Agent (agentic) + Human Review (conditional)
   - **Audit** → Code node (generate JSON)
   - **Deliver** → Webhook to your backend

5. Set webhook URL: `http://your-domain.com/api/webhooks/opus-callback`

### 9.2 Alternative: Use Simplified Workflow

For the hackathon, the backend has a **built-in workflow** that mimics Opus stages.
This means it works WITHOUT Opus API access.

To use real Opus:
1. Create workflow in Opus UI
2. Get workflow name
3. Backend will call it via API

**The simplified workflow provides:**
- All 6 stages (Intake → Understand → Decide → Review → Audit → Deliver)
- Gemini AI integration
- Rules engine
- Full audit logs
- Qdrant vector search

---

## 🐛 Troubleshooting

### Backend won't start

**Error:** `DATABASE_URL not found`
**Solution:** Make sure `.env` file exists in `services/backend/` with DATABASE_URL set

**Error:** `GEMINI_API_KEY not found`
**Solution:** Add your Gemini API key to `.env`

**Error:** `Port 4000 already in use`
**Solution:** Change PORT in `.env` or kill existing process:

```bash
lsof -ti:4000 | xargs kill -9
```

### Frontend won't start

**Error:** `Module not found`
**Solution:** Run `npm install` again

**Error:** `NEXT_PUBLIC_API_URL not defined`
**Solution:** Create `.env.local` in `apps/web-frontend/`

### Docker services won't start

**Error:** `Port 5432 already in use`
**Solution:** Stop existing PostgreSQL or change port in `docker-compose.yml`

```bash
# Stop existing postgres
brew services stop postgresql
# or
sudo systemctl stop postgresql
```

### Wallet won't connect

**Problem:** Connect button does nothing
**Solution:** Make sure you have Phantom or Solflare extension installed

**Problem:** "Wallet not detected"
**Solution:** Refresh page and make sure extension is enabled

### Gemini API errors

**Error:** `403 Forbidden`
**Solution:** Check your API key is valid and has quota

**Error:** `429 Too Many Requests`
**Solution:** You've hit rate limits. Wait a few minutes.

### Incidents stay in "Processing" forever

**Problem:** Status never changes from "processing"
**Solution:** Check backend console logs for errors. Likely Gemini API issue.

---

## 📊 API Testing (Optional)

### Health Check

```bash
curl http://localhost:4000/api/webhooks/health
```

### Get Credits

```bash
curl http://localhost:4000/api/credits/YOUR_WALLET_ADDRESS
```

### List Incidents

```bash
curl http://localhost:4000/api/incidents
```

### Submit Incident (via cURL)

```bash
curl -X POST http://localhost:4000/api/incidents \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Test incident from cURL",
    "incident_type": "other",
    "reporter_wallet": "YOUR_WALLET_ADDRESS"
  }'
```

---

## 🎬 Next Steps

1. ✅ Test all features locally
2. ✅ Create Opus workflow (or use built-in)
3. ✅ Record demo video
4. ✅ Prepare presentation
5. ✅ Push code to GitHub
6. ✅ Submit to hackathon

---

## 📞 Need Help?

- **Backend logs:** Check terminal where backend is running
- **Frontend logs:** Check browser console (F12)
- **Docker logs:** `docker-compose logs -f`
- **Database inspection:** `npx prisma studio` (opens GUI at http://localhost:5555)

---

**Congratulations! 🎉 APSIC is now running locally with all features!**
