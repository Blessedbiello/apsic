# APSIC Quick Start Guide
**Get up and running in 15 minutes**

---

## Prerequisites Checklist

Before you begin, ensure you have:

- [ ] Node.js 20+ installed (`node --version`)
- [ ] Docker installed and running (`docker --version`)
- [ ] Git installed
- [ ] A code editor (VS Code recommended)
- [ ] API keys ready:
  - [ ] Opus API key
  - [ ] Gemini API key
  - [ ] (Optional) AWS S3 credentials

---

## Step 1: Clone & Setup (2 min)

```bash
# Clone repository
git clone https://github.com/yourusername/apsic.git
cd apsic

# Copy environment template
cp .env.example .env

# Edit .env and add your API keys
nano .env  # or use your preferred editor
```

**Required environment variables:**
```env
OPUS_API_KEY=your_opus_key_here
GEMINI_API_KEY=your_gemini_key_here
DATABASE_URL=postgresql://apsic_user:apsic_password@localhost:5432/apsic
```

---

## Step 2: Start Services (3 min)

```bash
# Start PostgreSQL and Qdrant
docker-compose up -d

# Wait for services to be healthy
docker-compose ps

# You should see:
# apsic-postgres  running (healthy)
# apsic-qdrant    running (healthy)
```

**Verify services:**
- PostgreSQL: `psql postgresql://apsic_user:apsic_password@localhost:5432/apsic -c "SELECT 1;"`
- Qdrant: Open [http://localhost:6333/dashboard](http://localhost:6333/dashboard) in browser

---

## Step 3: Backend Setup (5 min)

```bash
# Navigate to backend
cd services/backend

# Install dependencies
npm install

# Set up database
npx prisma generate
npx prisma migrate dev --name init

# (Optional) Seed demo data
npm run seed

# Start backend
npm run dev
```

**Verify backend:**
- Open [http://localhost:4000/health](http://localhost:4000/health)
- Should return: `{"status":"ok"}`

---

## Step 4: Frontend Setup (3 min)

Open a new terminal:

```bash
# Navigate to frontend
cd apps/web-frontend

# Install dependencies
npm install

# Create .env.local
cat > .env.local << EOF
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_SOLANA_NETWORK=devnet
EOF

# Start frontend
npm run dev
```

**Verify frontend:**
- Open [http://localhost:3000](http://localhost:3000)
- You should see the APSIC homepage

---

## Step 5: Test the Flow (2 min)

### Test Incident Submission

1. **Connect Wallet:**
   - Click "Connect Wallet" (or use "Mock Wallet" for testing)

2. **Submit a Test Incident:**
   ```
   Text: "Student reports threatening messages from another student. Screenshots show escalating violent language."

   Incident Type: Harassment

   (Optional) Upload a screenshot
   ```

3. **Click "Submit Incident"**

4. **Wait ~30 seconds** for processing

5. **View Results:**
   - Severity score
   - AI summary
   - Recommended actions
   - Similar incidents (if any exist)

---

## Troubleshooting

### "Cannot connect to database"
```bash
# Check if PostgreSQL is running
docker-compose ps

# Restart if needed
docker-compose restart postgres

# Wait 10 seconds, then try again
```

### "Opus API error"
- Verify `OPUS_API_KEY` in `.env`
- Check Opus account has credits
- Test API key: `curl -H "Authorization: Bearer YOUR_KEY" https://api.opus.example.com/health`

### "Gemini API error"
- Verify `GEMINI_API_KEY` in `.env`
- Ensure Gemini API is enabled in Google Cloud Console
- Check quota: [Google Cloud Console → Gemini API](https://console.cloud.google.com)

### "Port already in use"
```bash
# Backend (port 4000)
lsof -ti:4000 | xargs kill -9

# Frontend (port 3000)
lsof -ti:3000 | xargs kill -9
```

### "Qdrant not responding"
```bash
# Check Qdrant logs
docker logs apsic-qdrant

# Restart Qdrant
docker-compose restart qdrant
```

---

## Next Steps

### For Development:

1. **Read the docs:**
   - [docs/PRD.md](./docs/PRD.md) - Product overview
   - [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) - System design
   - [docs/API_SPEC.md](./docs/API_SPEC.md) - API reference

2. **Follow the roadmap:**
   - [docs/ROADMAP.md](./docs/ROADMAP.md) - Step-by-step implementation

3. **Make your first change:**
   - Add a new incident type
   - Customize Gemini prompts
   - Add a new API endpoint

### For Demo Preparation:

1. **Seed more data:**
   ```bash
   cd services/backend
   npm run seed -- --count 50  # Generate 50 incidents
   ```

2. **Test different scenarios:**
   - High severity (harassment with threats)
   - Low severity (noise complaint)
   - Critical (accident with injury)

3. **Record demo video:**
   - Follow demo script in [docs/ROADMAP.md#milestone-81-demo-script](./docs/ROADMAP.md#milestone-81-demo-script)

---

## Quick Reference

### Common Commands

```bash
# Start everything
docker-compose up -d
cd services/backend && npm run dev &
cd apps/web-frontend && npm run dev &

# Stop everything
pkill -f "npm run dev"
docker-compose down

# Reset database
cd services/backend
npx prisma migrate reset

# View logs
docker-compose logs -f postgres
docker-compose logs -f qdrant

# Run tests
cd services/backend && npm test
cd apps/web-frontend && npm test
```

### Service URLs

| Service | URL | Notes |
|---------|-----|-------|
| Frontend | http://localhost:3000 | Next.js app |
| Backend | http://localhost:4000 | API server |
| PostgreSQL | localhost:5432 | Database |
| Qdrant | http://localhost:6333 | Vector DB |
| Qdrant Dashboard | http://localhost:6333/dashboard | Web UI |

### Default Credentials

| Service | Username | Password | Database |
|---------|----------|----------|----------|
| PostgreSQL | apsic_user | apsic_password | apsic |

---

## Getting Help

- **Documentation:** [docs/](./docs/)
- **Issues:** [GitHub Issues](https://github.com/yourusername/apsic/issues)
- **Discussions:** [GitHub Discussions](https://github.com/yourusername/apsic/discussions)

---

**You're all set! Happy building! 🚀**
