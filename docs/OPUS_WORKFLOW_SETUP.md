# Opus Workflow Setup Guide

**APSIC - AI Public Safety Intake Commander**

This guide explains how to set up the APSIC workflow in the Opus platform to enable true workflow orchestration.

---

## Overview

APSIC supports **two processing modes**:

1. **Direct Mode** (Default) - Uses direct Gemini API calls in the backend
2. **Opus Workflow Mode** - Uses Opus platform for visual workflow orchestration

This document covers setting up **Opus Workflow Mode**.

---

## Prerequisites

### Required Accounts
- ✅ Opus account at [opus.com](https://opus.com)
- ✅ Google Cloud account with Gemini API access
- ✅ Publicly accessible backend URL for webhook callbacks

### Required API Keys
- `OPUS_API_KEY` - Opus platform API key
- `GEMINI_API_KEY` - Google Gemini API key
- `QDRANT_URL` - Qdrant vector database endpoint

---

## Step 1: Create the Workflow in Opus

### 1.1 Login to Opus Platform

1. Go to [opus.com](https://opus.com) or [developer.opus.com](https://developer.opus.com)
2. Log in to your account
3. Navigate to **Workflows** section

### 1.2 Create New Workflow

1. Click **"Create Workflow"** or use prompt-to-workflow feature
2. Name: `APSIC_Public_Safety_Intake_v1`
3. Description: "AI Public Safety Intake Commander - Complete incident processing pipeline"

### 1.3 Configure Workflow Settings

**General Settings:**
- **Timeout:** 300 seconds (5 minutes)
- **Retry Policy:** Max 2 retries, 5 second delay
- **Callback URL:** `https://your-domain.com/api/webhooks/opus-callback`

---

## Step 2: Build the Workflow Stages

The APSIC workflow consists of 6 stages: **Intake → Understand → Decide → Review → Audit → Deliver**

### Stage 1: Intake

**Purpose:** Normalize input data and prepare for processing

**Nodes:**

#### Node 1.1: Data Import
- **Type:** Input Node
- **Name:** `normalize_input`
- **Configuration:**
  ```json
  {
    "schema": {
      "incident_id": "string",
      "text": "string",
      "media_urls": "array",
      "image_urls": "array",
      "audio_urls": "array",
      "video_urls": "array",
      "reporter_wallet": "string",
      "timestamp": "string",
      "incident_type": "string?"
    },
    "required": ["incident_id", "text", "reporter_wallet"]
  }
  ```

---

### Stage 2: Understand

**Purpose:** Use Gemini AI to extract entities, classify severity, and generate summaries

**Nodes:**

#### Node 2.1: Gemini Extraction
- **Type:** AI Agent Node
- **Name:** `extract_and_classify`
- **Model:** `gemini-1.5-pro`
- **Inputs:** `text`, `image_urls`, `audio_urls`, `video_urls`
- **Prompt:**
  ```
  You are analyzing a public safety incident report. Extract the following information:

  INPUT:
  Text: {text}
  Images: {image_urls}
  Audio: {audio_urls}
  Video: {video_urls}

  TASK:
  Analyze all inputs and return a JSON object with:
  {
    "incident_type": "harassment" | "accident" | "cyber" | "infrastructure" | "medical" | "other",
    "severity_score": 0-100,
    "severity_label": "Low" | "Medium" | "High" | "Critical",
    "entities": {
      "location": "string or null",
      "time": "string or null",
      "parties": ["string array"]
    },
    "emotion": "calm" | "concerned" | "distressed" | "urgent",
    "risk_indicators": ["weapon", "injury", "threat", "emergency", etc.]
  }

  Return ONLY the JSON, no other text.
  ```
- **Output:** `extracted_fields`

#### Node 2.2: Gemini Summary
- **Type:** AI Agent Node
- **Name:** `generate_summary`
- **Model:** `gemini-1.5-pro`
- **Inputs:** `extracted_fields`, `text`
- **Prompt:**
  ```
  Based on this incident analysis, generate:

  EXTRACTED DATA:
  {extracted_fields}

  ORIGINAL TEXT:
  {text}

  TASK:
  Return a JSON object with:
  {
    "summary": "2-3 sentence concise summary",
    "recommended_actions": ["action 1", "action 2", "action 3"],
    "urgency": "immediate" | "within_1_hour" | "within_24_hours" | "routine"
  }

  Return ONLY the JSON, no other text.
  ```
- **Output:** `summary_result`

---

### Stage 3: Decide

**Purpose:** Apply routing rules and validate with AI

**Nodes:**

#### Node 3.1: Rules Engine (Decision Node)
- **Type:** Code Node (Python)
- **Name:** `routing_rules`
- **Inputs:** `severity_score`, `risk_indicators`, `incident_type`, `emotion`
- **Code:**
  ```python
  def route_incident(severity_score, risk_indicators, incident_type, emotion):
      route = "LogOnly"
      triggers = []

      # Critical severity
      if severity_score > 80:
          route = "Escalate"
          triggers.append("severity>80")

      # Weapon or injury detected
      if "weapon" in risk_indicators or "injury" in risk_indicators:
          route = "Immediate"
          triggers.append("weapon_or_injury")

      # Medium-high severity
      if 50 < severity_score <= 80 and route == "LogOnly":
          route = "Review"
          triggers.append("medium_high_severity")

      # Distressed harassment cases
      if emotion == "distressed" and incident_type == "harassment":
          route = "Escalate"
          triggers.append("distressed_harassment")

      # Low severity default
      if severity_score <= 50 and route == "LogOnly":
          triggers.append("low_severity")

      return {
          "route": route,
          "rules_triggered": triggers,
          "confidence": 1.0
      }
  ```
- **Output:** `routing_decision`

#### Node 3.2: AI Routing Validation
- **Type:** AI Agent Node
- **Name:** `validate_routing`
- **Model:** `gemini-1.5-flash`
- **Inputs:** `summary`, `route`, `rules_triggered`
- **Prompt:**
  ```
  Review this incident routing decision:

  SUMMARY: {summary}
  ROUTE: {route}
  RULES TRIGGERED: {rules_triggered}

  Question: Does this routing seem appropriate? Should it be adjusted?

  Return JSON:
  {
    "agrees_with_routing": true/false,
    "override_suggested": true/false,
    "reasoning": "explanation",
    "additional_factors": ["factor1", "factor2"]
  }
  ```
- **Output:** `ai_validation`

---

### Stage 4: Review

**Purpose:** Quality and safety checks via agentic and human review

**Nodes:**

#### Node 4.1: Agentic Review
- **Type:** AI Agent Node (Advanced)
- **Name:** `agentic_review`
- **Model:** `gemini-1.5-pro`
- **Inputs:** `summary`, `route`, `extracted_fields`
- **Prompt:**
  ```
  Perform a comprehensive review of this incident for:
  1. Policy compliance
  2. Bias detection
  3. Missing information
  4. Legal considerations

  INCIDENT DATA:
  Summary: {summary}
  Route: {route}
  Extracted: {extracted_fields}

  Return JSON:
  {
    "policy_compliance": {
      "passed": true/false,
      "notes": "explanation"
    },
    "bias_check": {
      "passed": true/false,
      "concerns": ["concern1", "concern2"]
    },
    "missing_information": ["field1", "field2"],
    "legal_considerations": ["consideration1", "consideration2"],
    "overall_passed": true/false
  }
  ```
- **Output:** `agentic_review_result`

#### Node 4.2: Human Review (Conditional)
- **Type:** Human Review Node
- **Name:** `human_review`
- **Trigger Condition:**
  ```python
  severity_label in ['High', 'Critical'] or
  agentic_review.overall_passed == False or
  len(agentic_review.legal_considerations) > 0
  ```
- **Timeout:** 3600 seconds (1 hour)
- **Inputs:** Display all workflow data
- **Actions:** `Approve`, `Reject`, `Request More Info`
- **Output:** `human_review_result`

---

### Stage 5: Audit

**Purpose:** Generate comprehensive audit trail

**Nodes:**

#### Node 5.1: Similar Incidents Search
- **Type:** External Service Node
- **Name:** `search_similar_incidents`
- **Service:** Qdrant Vector Database
- **Method:** POST
- **Endpoint:** `${QDRANT_URL}/collections/incidents/points/search`
- **Inputs:** `embedding` (from Gemini embedding API)
- **Configuration:**
  ```json
  {
    "vector": "{embedding}",
    "limit": 3,
    "with_payload": true,
    "score_threshold": 0.7
  }
  ```
- **Output:** `similar_incidents`

#### Node 5.2: Generate Audit Log
- **Type:** Code Node (Python)
- **Name:** `generate_audit_log`
- **Inputs:** All previous stage outputs
- **Code:**
  ```python
  import json
  from datetime import datetime

  def generate_audit(all_data):
      audit_log = {
          "version": "1.0",
          "incident_id": all_data["incident_id"],
          "timestamp": datetime.utcnow().isoformat(),
          "input": {
              "text": all_data["text"],
              "media_urls": all_data["media_urls"],
              "reporter_wallet": all_data["reporter_wallet"],
              "submission_timestamp": all_data["timestamp"]
          },
          "processing_pipeline": {
              "intake": {
                  "timestamp": all_data["intake_timestamp"],
                  "normalized_data": all_data["normalized_input"]
              },
              "understand": {
                  "timestamp": all_data["understand_timestamp"],
                  "gemini_extraction": all_data["extracted_fields"],
                  "gemini_summary": all_data["summary_result"]
              },
              "decide": {
                  "timestamp": all_data["decide_timestamp"],
                  "rules_triggered": all_data["routing_decision"]["rules_triggered"],
                  "route": all_data["routing_decision"]["route"],
                  "ai_validation": all_data["ai_validation"]
              },
              "review": {
                  "timestamp": all_data["review_timestamp"],
                  "agentic_review": all_data["agentic_review_result"],
                  "human_review": all_data.get("human_review_result", {"required": False})
              }
          },
          "final_decision": {
              "route": all_data["routing_decision"]["route"],
              "severity": all_data["extracted_fields"]["severity_label"],
              "priority": all_data["summary_result"]["urgency"],
              "assigned_to": determine_team(all_data),
              "recommended_actions": all_data["summary_result"]["recommended_actions"]
          },
          "similar_incidents": all_data.get("similar_incidents", []),
          "external_data_sources": ["Gemini API", "Qdrant Vector DB"],
          "credits_used": 1,
          "processing_time_ms": calculate_processing_time(all_data)
      }

      return audit_log

  def determine_team(data):
      severity = data["extracted_fields"]["severity_label"]
      incident_type = data["extracted_fields"]["incident_type"]

      if severity == "Critical":
          return "Emergency Response Team"
      elif severity == "High":
          return "Priority Response Team"

      team_map = {
          "harassment": "Student Affairs",
          "accident": "Safety & Security",
          "cyber": "IT Security Team",
          "infrastructure": "Facilities Management",
          "medical": "Health Services"
      }

      return team_map.get(incident_type, "General Support")

  def calculate_processing_time(data):
      # Calculate from start to current time
      start = datetime.fromisoformat(data["timestamp"])
      end = datetime.utcnow()
      return int((end - start).total_seconds() * 1000)
  ```
- **Output:** `audit_log_json`

---

### Stage 6: Deliver

**Purpose:** Export results to multiple channels

**Nodes:**

#### Node 6.1: Export to Google Sheets (Optional)
- **Type:** Data Export Node
- **Name:** `export_to_sheets`
- **Destination:** Google Sheets
- **Configuration:**
  - Spreadsheet ID: From environment variable
  - Sheet Name: "Incidents"
  - Append Row: `[incident_id, severity_label, severity_score, route, summary, incident_type, timestamp, status]`
- **Optional:** true (skips if not configured)

#### Node 6.2: Send Email Notification (Conditional)
- **Type:** External Service Node
- **Name:** `send_email`
- **Condition:** `severity_label in ['High', 'Critical']`
- **Service:** SMTP/Email API
- **Configuration:**
  - Recipients: Based on assigned team
  - Subject: `🚨 {severity_label} Severity Incident - {incident_id}`
  - Body: HTML template with incident details

#### Node 6.3: Webhook Callback (Required)
- **Type:** Webhook Node
- **Name:** `callback_to_backend`
- **Method:** POST
- **URL:** `${OPUS_CALLBACK_URL}`
- **Payload:**
  ```json
  {
    "job_id": "{workflow_job_id}",
    "status": "completed",
    "result": {
      "audit_log_json": "{audit_log_json}",
      "incident_id": "{incident_id}"
    }
  }
  ```
- **Required:** true

---

## Step 3: Configure Backend for Opus Mode

### 3.1 Update Environment Variables

Edit `services/backend/.env`:

```bash
# Enable Opus workflow mode
USE_OPUS_WORKFLOW=true

# Opus API configuration
OPUS_API_KEY=your_opus_api_key_here
OPUS_API_URL=https://api.opus.com/v1

# Fallback to direct mode if Opus fails
OPUS_FALLBACK_TO_DIRECT=true

# Public webhook URL (must be HTTPS in production)
OPUS_CALLBACK_URL=https://your-domain.com/api/webhooks/opus-callback
```

### 3.2 Ensure Public Webhook Access

Your backend must be publicly accessible for Opus callbacks:

**Local Development:**
- Use ngrok: `ngrok http 4000`
- Update `OPUS_CALLBACK_URL` with ngrok URL

**Production:**
- Deploy backend to cloud platform (Railway, AWS, GCP, etc.)
- Use HTTPS (required for Opus webhooks)
- Update `OPUS_CALLBACK_URL` with production domain

---

## Step 4: Test the Workflow

### 4.1 Test in Opus Platform

1. In Opus workflow editor, click **"Test Run"**
2. Provide sample input:
   ```json
   {
     "incident_id": "test_001",
     "text": "Student reported threatening messages from another student",
     "image_urls": [],
     "audio_urls": [],
     "video_urls": [],
     "reporter_wallet": "test_wallet_address",
     "timestamp": "2025-11-18T10:00:00Z",
     "incident_type": "harassment"
   }
   ```
3. Verify all stages complete successfully
4. Check that webhook callback is received

### 4.2 Test from APSIC Backend

1. Start your backend: `npm run dev`
2. Submit a test incident via API:
   ```bash
   curl -X POST http://localhost:4000/api/incidents/submit \
     -H "Content-Type: application/json" \
     -d '{
       "text": "Test incident for Opus workflow",
       "reporter_wallet": "test_wallet",
       "incident_type": "auto"
     }'
   ```
3. Check backend logs for:
   - `🔄 Starting Opus workflow for incident...`
   - `✅ Opus workflow started: Job ID...`
4. Monitor Opus platform for workflow execution
5. Verify webhook callback is received and processed

---

## Step 5: Monitor and Debug

### 5.1 Monitoring Endpoints

**Backend Health:**
```bash
curl http://localhost:4000/api/health
```

**Opus Job Status:**
```bash
curl https://api.opus.com/v1/jobs/{job_id} \
  -H "Authorization: Bearer YOUR_OPUS_API_KEY"
```

### 5.2 Common Issues

**Problem:** Opus workflow not found
- **Solution:** Ensure workflow is created in Opus platform with exact name `APSIC_Public_Safety_Intake_v1`

**Problem:** Webhook not received
- **Solution:**
  - Check `OPUS_CALLBACK_URL` is publicly accessible
  - Verify HTTPS in production
  - Check backend logs for webhook handler errors

**Problem:** Gemini API errors in Opus workflow
- **Solution:**
  - Verify `GEMINI_API_KEY` is configured in Opus workflow secrets
  - Check Gemini API quota and billing

**Problem:** Workflow falls back to direct mode
- **Solution:**
  - Check Opus API connectivity
  - Verify `OPUS_FALLBACK_TO_DIRECT=true` is set
  - Review backend logs for specific Opus errors

---

## Step 6: Performance Optimization

### 6.1 Parallel Execution

The workflow supports parallel execution at multiple stages:

- **Stage 2:** Extraction and embedding generation run in parallel
- **Stage 3:** Routing and AI validation run in parallel
- **Stage 5:** Similar incidents search and audit generation run in parallel

### 6.2 Batch Processing

For batch processing (100-500+ incidents):

1. Use the batch API endpoint: `/api/batch/process`
2. Opus will handle parallel workflow execution automatically
3. Monitor progress via `/api/batch/{batch_id}/status`

---

## Comparison: Opus vs Direct Mode

| Feature | Opus Workflow Mode | Direct Mode |
|---------|-------------------|-------------|
| **Processing** | Opus platform orchestration | Backend service orchestration |
| **Visual Workflow** | ✅ Yes (Opus canvas) | ❌ No (code only) |
| **Auditability** | ✅✅ Opus logs + backend logs | ✅ Backend logs only |
| **Human Review** | ✅ Opus UI review interface | ❌ Manual (no UI) |
| **Scalability** | ✅✅ Opus managed | ✅ Backend scales horizontally |
| **Cost** | Opus fees + API costs | API costs only |
| **Setup Complexity** | Higher (Opus + backend) | Lower (backend only) |
| **Latency** | ~15-30s (includes Opus overhead) | ~10-15s (direct API) |

---

## Next Steps

1. ✅ Create workflow in Opus platform
2. ✅ Configure all workflow nodes as documented above
3. ✅ Set environment variables in backend
4. ✅ Deploy backend with public webhook URL
5. ✅ Test workflow end-to-end
6. ✅ Monitor and optimize performance
7. ✅ Record demo video for hackathon submission

---

## Resources

- **Opus Documentation:** [help.opus.com](https://help.opus.com)
- **Opus API Reference:** [developer.opus.com](https://developer.opus.com)
- **APSIC Architecture:** [docs/ARCHITECTURE.md](./ARCHITECTURE.md)
- **API Specification:** [docs/API_SPEC.md](./API_SPEC.md)

---

## Support

For issues with:
- **Opus platform:** Contact Opus support
- **APSIC backend:** Check GitHub issues or backend logs
- **Workflow configuration:** Refer to this documentation

---

**Last Updated:** 2025-11-18
