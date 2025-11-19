# Opus Real Integration Setup Guide

**Getting APSIC Connected to Opus Platform**

Congratulations on signing up! Let's get your real Opus integration working.

---

## Step 1: Get Your Opus API Key

### 1.1 Access Your Opus Account
1. Go to [opus.com](https://opus.com) or [developer.opus.com](https://developer.opus.com)
2. Log in with your credentials
3. Navigate to **Settings** or **API Keys** section

### 1.2 Generate API Key
1. Click **"Create API Key"** or **"Generate New Key"**
2. Give it a name: `APSIC-Integration`
3. Copy the API key (it will look like: `opus_live_abc123...` or similar)
4. **Save it immediately** - you won't be able to see it again

---

## Step 2: Create the Workflow in Opus Visual Canvas

### 2.1 Create New Workflow
1. In Opus dashboard, click **"Create Workflow"** or **"New Workflow"**
2. Choose one of these options:
   - **Option A:** Use prompt-to-workflow feature (paste the workflow description below)
   - **Option B:** Build manually on visual canvas (follow node-by-node guide below)

### 2.2 Option A: Prompt-to-Workflow (Fastest)

**Paste this prompt into Opus:**

```
Create a public safety incident processing workflow named "APSIC_Public_Safety_Intake_v1" with these stages:

STAGE 1 - INTAKE:
- Accept input: incident_id, text, image_urls, audio_urls, video_urls, reporter_wallet, timestamp
- Normalize and validate the data

STAGE 2 - UNDERSTAND:
- Use Gemini 1.5 Pro to extract: incident_type, severity_score (0-100), severity_label, entities (location, time, parties), emotion, risk_indicators
- Use Gemini 1.5 Pro to generate: summary (2-3 sentences), recommended_actions (array), urgency level

STAGE 3 - DECIDE:
- Python code node: Apply routing rules based on severity_score and risk_indicators
  - If severity > 80: route = "Escalate"
  - If weapon or injury detected: route = "Immediate"
  - If 50 < severity <= 80: route = "Review"
  - Otherwise: route = "LogOnly"
- Use Gemini Flash to validate the routing decision

STAGE 4 - REVIEW:
- Gemini Pro agentic review: Check policy compliance, bias, missing info, legal concerns
- Human review (conditional): Required if severity is High/Critical OR agentic review failed (1 hour timeout)

STAGE 5 - AUDIT:
- Search for similar incidents using vector similarity (Qdrant integration)
- Generate comprehensive audit log with all stage outputs, timestamps, rules triggered

STAGE 6 - DELIVER:
- Send results via webhook to: ${OPUS_CALLBACK_URL}
- Optional: Export to Google Sheets
- Optional: Send email for High/Critical incidents

Configure workflow with 5-minute timeout and 2 retries on failure.
```

Then review the generated workflow and adjust as needed.

### 2.3 Option B: Manual Canvas Build (Detailed Control)

**Follow this node-by-node guide:**

#### Stage 1: Intake
1. Add **Input Node**
   - Name: `normalize_input`
   - Schema:
     ```json
     {
       "incident_id": "string",
       "text": "string",
       "image_urls": "array",
       "audio_urls": "array",
       "video_urls": "array",
       "reporter_wallet": "string",
       "timestamp": "string"
     }
     ```

#### Stage 2: Understand
1. Add **AI Agent Node** - "Extract & Classify"
   - Name: `gemini_extract`
   - Model: `gemini-1.5-pro`
   - Input variables: `{text}`, `{image_urls}`, `{audio_urls}`, `{video_urls}`
   - Prompt:
     ```
     Analyze this public safety incident and extract structured information.

     TEXT: {text}
     IMAGES: {image_urls}
     AUDIO: {audio_urls}
     VIDEO: {video_urls}

     Return ONLY valid JSON:
     {
       "incident_type": "harassment|accident|cyber|infrastructure|medical|other",
       "severity_score": 0-100,
       "severity_label": "Low|Medium|High|Critical",
       "entities": {
         "location": "string or null",
         "time": "string or null",
         "parties": ["array of strings"]
       },
       "emotion": "calm|concerned|distressed|urgent",
       "risk_indicators": ["weapon", "injury", "threat", etc.]
     }
     ```

2. Add **AI Agent Node** - "Generate Summary"
   - Name: `gemini_summary`
   - Model: `gemini-1.5-pro`
   - Input: Output from previous node + original text
   - Prompt:
     ```
     Based on this incident analysis, generate actionable information.

     ANALYSIS: {gemini_extract}
     ORIGINAL: {text}

     Return ONLY valid JSON:
     {
       "summary": "2-3 sentence concise summary",
       "recommended_actions": ["action 1", "action 2", "action 3"],
       "urgency": "immediate|within_1_hour|within_24_hours|routine"
     }
     ```

#### Stage 3: Decide
1. Add **Code Node** - "Routing Rules"
   - Name: `routing_rules`
   - Language: `Python`
   - Code:
     ```python
     def route_incident(severity_score, risk_indicators):
         route = "LogOnly"
         triggers = []

         if severity_score > 80:
             route = "Escalate"
             triggers.append("severity>80")

         if "weapon" in risk_indicators or "injury" in risk_indicators:
             route = "Immediate"
             triggers.append("weapon_or_injury")

         if 50 < severity_score <= 80 and route == "LogOnly":
             route = "Review"
             triggers.append("medium_high_severity")

         if severity_score <= 50 and route == "LogOnly":
             triggers.append("low_severity")

         return {
             "route": route,
             "rules_triggered": triggers
         }
     ```

2. Add **AI Agent Node** - "Validate Routing"
   - Name: `ai_validation`
   - Model: `gemini-1.5-flash`
   - Prompt:
     ```
     Review this routing decision:

     SUMMARY: {summary}
     ROUTE: {route}
     RULES: {rules_triggered}

     Return JSON:
     {
       "agrees_with_routing": true/false,
       "override_suggested": true/false,
       "reasoning": "explanation"
     }
     ```

#### Stage 4: Review
1. Add **AI Agent Node** - "Agentic Review"
   - Name: `agentic_review`
   - Model: `gemini-1.5-pro`
   - Prompt:
     ```
     Perform comprehensive review for:
     1. Policy compliance
     2. Bias detection
     3. Missing information
     4. Legal considerations

     INCIDENT: {summary}
     ROUTE: {route}
     SEVERITY: {severity_label}

     Return JSON:
     {
       "policy_compliance": {"passed": bool, "notes": ""},
       "bias_check": {"passed": bool, "concerns": []},
       "missing_information": [],
       "legal_considerations": [],
       "overall_passed": bool
     }
     ```

2. Add **Human Review Node** (IMPORTANT!)
   - Name: `human_review`
   - Condition: `{severity_label} in ["High", "Critical"]`
   - Timeout: `3600` seconds (1 hour)
   - Instructions: Display all incident data for human decision
   - Actions: `Approve`, `Reject`, `Request More Info`

#### Stage 5: Audit
1. Add **External Service Node** - "Search Similar"
   - Name: `search_similar`
   - Method: `POST`
   - URL: `{QDRANT_URL}/collections/incidents/points/search`
   - Headers: `{"api-key": "{QDRANT_API_KEY}"}`
   - Body:
     ```json
     {
       "vector": "{embedding}",
       "limit": 3,
       "with_payload": true,
       "score_threshold": 0.7
     }
     ```

2. Add **Code Node** - "Generate Audit"
   - Language: `Python`
   - Code:
     ```python
     import json
     from datetime import datetime

     def generate_audit(all_data):
         return {
             "version": "1.0",
             "incident_id": all_data["incident_id"],
             "timestamp": datetime.utcnow().isoformat(),
             "input": all_data["input"],
             "processing_pipeline": {
                 "understand": all_data["understand"],
                 "decide": all_data["decide"],
                 "review": all_data["review"]
             },
             "similar_incidents": all_data.get("similar_incidents", []),
             "credits_used": 1
         }
     ```

#### Stage 6: Deliver
1. Add **Webhook Node** (REQUIRED!)
   - Name: `callback_to_backend`
   - Method: `POST`
   - URL: `{OPUS_CALLBACK_URL}` (will be configured in settings)
   - Body:
     ```json
     {
       "job_id": "{workflow_job_id}",
       "status": "completed",
       "result": {
         "audit_log_json": "{audit_log}"
       }
     }
     ```

2. Add **Data Export Node** - "Export to Sheets" (Optional)
   - Destination: `Google Sheets`
   - Spreadsheet ID: From environment
   - Condition: `{severity_label} in ["High", "Critical"]`

### 2.4 Configure Workflow Settings
1. Click **Workflow Settings**
2. Set:
   - **Name:** `APSIC_Public_Safety_Intake_v1`
   - **Description:** AI Public Safety Intake Commander
   - **Timeout:** `300` seconds
   - **Retry Policy:** Max 2 retries, 5 second delay
3. Click **Save**

---

## Step 3: Configure Environment Variables

### 3.1 Add Secrets to Opus
1. In Opus workflow settings, go to **Secrets** or **Environment Variables**
2. Add these secrets:
   ```
   GEMINI_API_KEY=your_gemini_api_key
   QDRANT_URL=your_qdrant_url
   QDRANT_API_KEY=your_qdrant_api_key (if using cloud)
   OPUS_CALLBACK_URL=https://your-backend-url.com/api/webhooks/opus-callback
   ```

### 3.2 Update APSIC Backend `.env`

**Edit `services/backend/.env`:**

```bash
# Opus Configuration
USE_OPUS_WORKFLOW=true
OPUS_API_KEY=opus_live_abc123...  # ← Your real API key from Step 1
OPUS_API_URL=https://api.opus.com/v1
OPUS_FALLBACK_TO_DIRECT=true
OPUS_CALLBACK_URL=https://your-ngrok-url.ngrok.io/api/webhooks/opus-callback

# Gemini
GEMINI_API_KEY=your_gemini_api_key

# Qdrant
QDRANT_URL=http://localhost:6333
# Or if using Qdrant Cloud:
# QDRANT_URL=https://xyz.qdrant.io
# QDRANT_API_KEY=your_qdrant_api_key
```

---

## Step 4: Set Up Public Webhook URL

Opus needs to send results back to your backend, which requires a **publicly accessible URL**.

### 4.1 Local Development (Use ngrok)

1. **Install ngrok:**
   ```bash
   # macOS
   brew install ngrok

   # Or download from https://ngrok.com/download
   ```

2. **Start your backend:**
   ```bash
   cd services/backend
   npm run dev
   # Should be running on http://localhost:4000
   ```

3. **In a new terminal, start ngrok:**
   ```bash
   ngrok http 4000
   ```

4. **Copy the HTTPS URL** from ngrok output:
   ```
   Forwarding   https://abc123def456.ngrok.io -> http://localhost:4000
                ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
                Use this URL!
   ```

5. **Update both `.env` files:**
   ```bash
   # services/backend/.env
   OPUS_CALLBACK_URL=https://abc123def456.ngrok.io/api/webhooks/opus-callback
   ```

   **AND update in Opus workflow settings** (Step 3.1)

### 4.2 Production Deployment (Later)

For production, deploy to:
- **Vercel** (frontend only, won't work for webhook)
- **Railway** ✅ (backend with public URL)
- **Heroku** ✅
- **AWS/GCP** ✅
- **Render** ✅

---

## Step 5: Test the Integration

### 5.1 Test in Opus Platform First

1. In Opus workflow editor, click **"Test Run"**
2. Provide sample input:
   ```json
   {
     "incident_id": "test_001",
     "text": "Student reported harassment via threatening text messages",
     "image_urls": [],
     "audio_urls": [],
     "video_urls": [],
     "reporter_wallet": "test_wallet_address",
     "timestamp": "2025-11-19T10:00:00Z"
   }
   ```
3. Watch the workflow execute through all stages
4. Verify webhook is sent to your callback URL
5. Check your backend logs for `[OPUS CALLBACK]`

### 5.2 Test from APSIC API

1. Make sure backend is running:
   ```bash
   cd services/backend
   npm run dev
   ```

2. Submit a test incident:
   ```bash
   curl -X POST http://localhost:4000/api/incidents/submit \
     -H "Content-Type: application/json" \
     -d '{
       "text": "Test incident for Opus integration",
       "reporter_wallet": "test_wallet",
       "incident_type": "harassment"
     }'
   ```

3. Check the response:
   ```json
   {
     "incident_id": "clxxx...",
     "status": "processing",
     "message": "Incident submitted successfully. Processing in progress.",
     "processing_mode": "opus_workflow",  ← Should say "opus_workflow"!
     "opus_job_id": "job_xxx..."
   }
   ```

4. Monitor logs in 3 places:
   - **Backend terminal:** Should see `🔄 Starting Opus workflow...`
   - **Opus dashboard:** Should see job running
   - **ngrok terminal:** Should see webhook callback received

### 5.3 Verify Complete Flow

1. **Backend submits to Opus** → Check: `✅ Opus workflow started: Job ID xxx`
2. **Opus executes workflow** → Check in Opus dashboard
3. **Opus sends webhook** → Check ngrok: `POST /api/webhooks/opus-callback`
4. **Backend processes callback** → Check: `✅ Opus workflow xxx processed successfully`
5. **Data saved to database** → Check: `GET http://localhost:4000/api/incidents/{id}`

---

## Step 6: Troubleshooting

### Issue: "Opus workflow not found"
**Solution:** Make sure workflow name in Opus exactly matches:
```typescript
'APSIC_Public_Safety_Intake_v1'
```

### Issue: "Webhook not received"
**Solution:**
1. Check ngrok is running: `ngrok http 4000`
2. Verify callback URL in Opus workflow settings
3. Check backend is listening on port 4000
4. Test webhook manually:
   ```bash
   curl -X POST http://localhost:4000/api/webhooks/opus-callback \
     -H "Content-Type: application/json" \
     -d '{
       "job_id": "test",
       "status": "completed",
       "result": {"test": true}
     }'
   ```

### Issue: "Gemini API errors in Opus"
**Solution:**
1. Verify `GEMINI_API_KEY` is set in Opus workflow secrets
2. Check API quota at [Google Cloud Console](https://console.cloud.google.com)
3. Enable Gemini API in your Google Cloud project

### Issue: "Opus API authentication failed"
**Solution:**
1. Verify `OPUS_API_KEY` starts with correct prefix
2. Check key hasn't expired
3. Test API key:
   ```bash
   curl https://api.opus.com/v1/workflows \
     -H "Authorization: Bearer YOUR_OPUS_API_KEY"
   ```

---

## Step 7: Verify Human Review Works

1. Submit a **high-severity incident:**
   ```bash
   curl -X POST http://localhost:4000/api/incidents/submit \
     -H "Content-Type: application/json" \
     -d '{
       "text": "URGENT: Student with weapon seen on campus near Building 3",
       "reporter_wallet": "test_wallet",
       "incident_type": "auto"
     }'
   ```

2. This should trigger:
   - High severity score (80+)
   - Route: "Immediate" or "Escalate"
   - Human review checkpoint in Opus

3. **In Opus dashboard:**
   - Navigate to **Jobs** or **Runs**
   - Find your workflow run
   - Should see **Human Review Pending**
   - Click to approve/reject

4. After human decision:
   - Workflow completes
   - Webhook sent to your backend
   - Incident status updated

---

## Step 8: Monitor and Optimize

### 8.1 Check Metrics
```bash
# Prometheus metrics
curl http://localhost:4000/api/metrics

# Health check
curl http://localhost:4000/api/health
```

### 8.2 View Logs
```bash
# Backend logs
tail -f services/backend/logs/combined.log

# Opus logs
# Check in Opus dashboard under workflow execution
```

### 8.3 Performance
- Single incident: ~15-30 seconds (Opus overhead)
- Batch (100): ~2-3 minutes
- Monitor in Opus dashboard

---

## Quick Reference: API Endpoints

```bash
# Submit incident (triggers Opus workflow)
POST /api/incidents/submit

# Check incident status
GET /api/incidents/{id}

# Batch processing
POST /api/batch/process

# Webhook callback (Opus calls this)
POST /api/webhooks/opus-callback

# Health check
GET /api/webhooks/health
```

---

## Next Steps After Integration Works

1. ✅ Test multiple scenarios (low, medium, high, critical severity)
2. ✅ Test human review workflow
3. ✅ Test rejection/correction flow
4. ✅ Create sample dataset (10-20 incidents)
5. ✅ Generate audit artifact examples
6. ✅ Record demo video showing:
   - Opus visual canvas
   - Workflow execution
   - Human review interface
   - Audit trail

---

## Need Help?

**Opus Documentation:**
- Help Center: [help.opus.com](https://help.opus.com)
- API Docs: [developer.opus.com](https://developer.opus.com)

**APSIC Documentation:**
- Full setup: `docs/OPUS_WORKFLOW_SETUP.md`
- Architecture: `docs/ARCHITECTURE.md`
- Quick start: `OPUS_INTEGRATION.md`

**Common Commands:**
```bash
# Start backend
cd services/backend && npm run dev

# Start ngrok
ngrok http 4000

# Test submission
curl -X POST http://localhost:4000/api/incidents/submit \
  -H "Content-Type: application/json" \
  -d '{"text":"test","reporter_wallet":"test"}'

# Check logs
tail -f services/backend/logs/combined.log
```

---

**You're ready to go! 🚀**

Follow these steps and you'll have a fully functional Opus integration. Start with Step 1 (get API key) and work through sequentially.

Good luck with your hackathon submission! 🏆
