# API Specification: APSIC
**AI Public Safety Intake Commander**

**Version:** 1.0
**Last Updated:** 2025-11-18
**Base URL:** `https://api.apsic.example.com/v1`

---

## Table of Contents

1. [Authentication](#1-authentication)
2. [Error Handling](#2-error-handling)
3. [Rate Limiting](#3-rate-limiting)
4. [Endpoints](#4-endpoints)
   - [Incidents](#41-incidents)
   - [Credits](#42-credits)
   - [Admin](#43-admin)
   - [Webhooks](#44-webhooks)
5. [Data Models](#5-data-models)
6. [Examples](#6-examples)

---

## 1. Authentication

### Wallet Signature Authentication

All API requests require wallet signature verification.

**Authentication Flow:**

1. Client generates a message to sign:
   ```
   Sign this message to authenticate with APSIC:
   Timestamp: {ISO-8601 timestamp}
   Nonce: {random UUID}
   ```

2. Client signs message with Solana wallet (using `signMessage`)

3. Client includes in request headers:
   ```
   X-Wallet-Address: <Solana public key>
   X-Signature: <Base58 encoded signature>
   X-Message: <Original message that was signed>
   ```

**Example Headers:**
```http
X-Wallet-Address: 7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU
X-Signature: 3Bv7wZ... (base58)
X-Message: Sign this message to authenticate with APSIC:\nTimestamp: 2025-11-18T10:30:00Z\nNonce: abc-123
```

**Error Responses:**
- `401 Unauthorized`: Invalid signature or expired message
- `403 Forbidden`: Wallet doesn't have required credits

---

## 2. Error Handling

### Error Response Format

```json
{
  "error": {
    "code": "INSUFFICIENT_CREDITS",
    "message": "Wallet has 0 credits. At least 1 credit is required.",
    "details": {
      "wallet": "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU",
      "current_credits": 0,
      "required_credits": 1
    }
  }
}
```

### Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `INVALID_REQUEST` | 400 | Malformed request or invalid parameters |
| `UNAUTHORIZED` | 401 | Invalid authentication |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `CONFLICT` | 409 | Resource already exists |
| `INSUFFICIENT_CREDITS` | 402 | Wallet has insufficient credits |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |
| `INTERNAL_ERROR` | 500 | Server error |
| `OPUS_WORKFLOW_FAILED` | 503 | Workflow processing failed |
| `EXTERNAL_SERVICE_ERROR` | 503 | Third-party service unavailable |

---

## 3. Rate Limiting

### Limits

| Endpoint | Limit | Window |
|----------|-------|--------|
| `POST /incidents` | 10 requests | 15 minutes per IP |
| All other endpoints | 100 requests | 1 minute per IP |

### Rate Limit Headers

```http
X-RateLimit-Limit: 10
X-RateLimit-Remaining: 7
X-RateLimit-Reset: 1700308800  (Unix timestamp)
```

### Rate Limit Exceeded Response

```json
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests. Please try again later.",
    "details": {
      "retry_after": 180  // seconds
    }
  }
}
```

---

## 4. Endpoints

## 4.1 Incidents

### POST /incidents

Submit a new incident report.

**Authentication:** Required

**Request Body:**

```json
{
  "text": "string (required, 10-5000 chars)",
  "incident_type": "harassment | accident | cyber | infrastructure | other | auto (optional)",
  "image_urls": ["string (URL)"],  // optional, max 5
  "audio_urls": ["string (URL)"],  // optional, max 2
  "video_urls": ["string (URL)"],  // optional, max 1
  "reporter_wallet": "string (Solana address, required)"
}
```

**Example Request:**

```bash
curl -X POST https://api.apsic.example.com/v1/incidents \
  -H "Content-Type: application/json" \
  -H "X-Wallet-Address: 7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU" \
  -H "X-Signature: 3Bv7wZ..." \
  -H "X-Message: Sign this message..." \
  -d '{
    "text": "A student is being harassed via threatening text messages...",
    "incident_type": "harassment",
    "image_urls": ["https://s3.amazonaws.com/apsic-uploads/screenshot1.jpg"],
    "reporter_wallet": "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU"
  }'
```

**Response (202 Accepted):**

```json
{
  "incident_id": "cm3x5y7z9-1234-5678-90ab-cdef12345678",
  "status": "processing",
  "credits_used": 1,
  "credits_remaining": 9,
  "estimated_completion_time": "2025-11-18T10:32:00Z",  // ~30s from submission
  "message": "Incident submitted successfully. Processing in progress."
}
```

**Error Responses:**

```json
// 402 Payment Required (Insufficient Credits)
{
  "error": {
    "code": "INSUFFICIENT_CREDITS",
    "message": "Wallet has 0 credits. At least 1 credit is required.",
    "details": {
      "wallet": "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU",
      "current_credits": 0,
      "required_credits": 1
    }
  }
}

// 400 Bad Request (Invalid Input)
{
  "error": {
    "code": "INVALID_REQUEST",
    "message": "Validation failed",
    "details": {
      "text": "Text must be between 10 and 5000 characters",
      "image_urls": "Maximum 5 image URLs allowed"
    }
  }
}
```

---

### GET /incidents/:id

Retrieve a specific incident by ID.

**Authentication:** Required

**URL Parameters:**
- `id` (string, required): Incident ID

**Query Parameters:**
- `include_audit_log` (boolean, optional, default: false): Include full audit log

**Example Request:**

```bash
curl https://api.apsic.example.com/v1/incidents/cm3x5y7z9-1234?include_audit_log=true \
  -H "X-Wallet-Address: 7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU" \
  -H "X-Signature: 3Bv7wZ..." \
  -H "X-Message: Sign this message..."
```

**Response (200 OK):**

```json
{
  "incident_id": "cm3x5y7z9-1234-5678-90ab-cdef12345678",
  "status": "completed",  // processing | completed | failed
  "created_at": "2025-11-18T10:30:00Z",
  "updated_at": "2025-11-18T10:30:28Z",

  "input": {
    "text": "A student is being harassed via threatening text messages...",
    "incident_type": "harassment",
    "media_urls": ["https://s3.amazonaws.com/apsic-uploads/screenshot1.jpg"],
    "reporter_wallet": "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU"
  },

  "result": {
    "severity_score": 87,
    "severity_label": "High",
    "incident_type": "Harassment",

    "extracted_fields": {
      "location": "North Campus, Building 4",
      "time": "2025-11-17 14:30",
      "parties": ["Student A (reporter)", "Student B (subject)"],
      "emotion": "distressed",
      "risk_indicators": ["ongoing threats", "pattern of behavior"]
    },

    "summary": "Student reports ongoing harassment via text messages with threatening content. Pattern suggests escalation. Requires immediate review.",

    "recommended_actions": [
      "Notify campus security immediately",
      "Contact student counseling services",
      "Document all evidence",
      "Schedule interview with reporter",
      "Initiate investigation protocol"
    ],

    "urgency": "within_1_hour",
    "route": "Escalate",
    "assigned_to": "Campus Security & Dean's Office"
  },

  "similar_incidents": [
    {
      "incident_id": "cm3x5y7z9-0987",
      "similarity_score": 0.92,
      "severity_label": "High",
      "incident_type": "Harassment",
      "timestamp": "2025-10-15T10:30:00Z",
      "summary": "Student reported threatening messages via social media..."
    },
    {
      "incident_id": "cm3x5y7z9-0654",
      "similarity_score": 0.85,
      "severity_label": "Medium",
      "incident_type": "Harassment",
      "timestamp": "2025-09-20T14:00:00Z",
      "summary": "Ongoing harassment case involving text messages..."
    }
  ],

  "audit_log": {
    // Full audit log (only if include_audit_log=true)
    "version": "1.0",
    "incident_id": "cm3x5y7z9-1234-5678-90ab-cdef12345678",
    "timestamp": "2025-11-18T10:30:28Z",
    "processing_pipeline": { /* ... */ },
    "credits_used": 1,
    "processing_time_ms": 28412
  }
}
```

**Error Responses:**

```json
// 404 Not Found
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Incident not found",
    "details": {
      "incident_id": "invalid-id"
    }
  }
}

// 403 Forbidden (not your incident)
{
  "error": {
    "code": "FORBIDDEN",
    "message": "You do not have permission to view this incident"
  }
}
```

---

### GET /incidents

List all incidents (paginated, filterable).

**Authentication:** Required (Admin role for viewing all; regular users see only their incidents)

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page` | integer | 1 | Page number (1-indexed) |
| `limit` | integer | 20 | Items per page (max 100) |
| `severity` | string | all | Filter by severity: `low`, `medium`, `high`, `critical`, `all` |
| `incident_type` | string | all | Filter by type: `harassment`, `accident`, `cyber`, `infrastructure`, `other`, `all` |
| `status` | string | all | Filter by status: `processing`, `completed`, `failed`, `all` |
| `sort` | string | created_at | Sort by: `created_at`, `severity_score`, `updated_at` |
| `order` | string | desc | Order: `asc`, `desc` |
| `search` | string | - | Full-text search in incident text/summary |

**Example Request:**

```bash
curl "https://api.apsic.example.com/v1/incidents?page=1&limit=20&severity=high&sort=created_at&order=desc" \
  -H "X-Wallet-Address: 7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU" \
  -H "X-Signature: 3Bv7wZ..." \
  -H "X-Message: Sign this message..."
```

**Response (200 OK):**

```json
{
  "incidents": [
    {
      "incident_id": "cm3x5y7z9-1234",
      "status": "completed",
      "severity_score": 87,
      "severity_label": "High",
      "incident_type": "Harassment",
      "summary": "Student reports ongoing harassment...",
      "created_at": "2025-11-18T10:30:00Z",
      "urgency": "within_1_hour"
    },
    {
      "incident_id": "cm3x5y7z9-1233",
      "status": "completed",
      "severity_score": 76,
      "severity_label": "Critical",
      "incident_type": "Accident",
      "summary": "Slip and fall accident in cafeteria...",
      "created_at": "2025-11-18T09:15:00Z",
      "urgency": "immediate"
    }
  ],

  "pagination": {
    "total": 142,
    "page": 1,
    "limit": 20,
    "total_pages": 8
  },

  "filters_applied": {
    "severity": "high",
    "incident_type": "all",
    "status": "all"
  }
}
```

---

### GET /incidents/:id/audit-log

Download the full audit log for an incident.

**Authentication:** Required

**URL Parameters:**
- `id` (string, required): Incident ID

**Query Parameters:**
- `format` (string, optional, default: `json`): Response format (`json` or `pdf`)

**Example Request:**

```bash
curl https://api.apsic.example.com/v1/incidents/cm3x5y7z9-1234/audit-log?format=json \
  -H "X-Wallet-Address: 7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU" \
  -H "X-Signature: 3Bv7wZ..." \
  -H "X-Message: Sign this message..."
```

**Response (200 OK - JSON):**

```json
{
  "version": "1.0",
  "incident_id": "cm3x5y7z9-1234-5678-90ab-cdef12345678",
  "timestamp": "2025-11-18T10:30:28Z",

  "input": {
    "text": "...",
    "media_urls": ["..."],
    "reporter_wallet": "...",
    "submission_timestamp": "2025-11-18T10:30:00Z"
  },

  "processing_pipeline": {
    "intake": {
      "timestamp": "2025-11-18T10:30:01Z",
      "normalized_data": {},
      "external_context": {}
    },
    "understand": {
      "timestamp": "2025-11-18T10:30:05Z",
      "gemini_extraction": {},
      "gemini_summary": {}
    },
    "decide": {
      "timestamp": "2025-11-18T10:30:10Z",
      "rules_triggered": ["severity>80", "distressed_harassment"],
      "route": "Escalate",
      "ai_validation": {}
    },
    "review": {
      "timestamp": "2025-11-18T10:30:15Z",
      "agentic_review": {},
      "human_review": null  // or { ... } if human review occurred
    }
  },

  "final_decision": {
    "route": "Escalate",
    "severity": "High",
    "priority": "within_1_hour",
    "assigned_to": "Campus Security & Dean's Office",
    "recommended_actions": []
  },

  "similar_incidents": [],
  "external_data_sources": ["Geocoding API", "Historical Incident Database"],
  "credits_used": 1,
  "processing_time_ms": 28412
}
```

**Response (200 OK - PDF):**

Binary PDF file with formatted audit report.

---

## 4.2 Credits

### GET /credits/:wallet

Get credit balance for a wallet.

**Authentication:** Required (wallet must match authenticated user OR admin)

**URL Parameters:**
- `wallet` (string, required): Solana wallet address

**Example Request:**

```bash
curl https://api.apsic.example.com/v1/credits/7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU \
  -H "X-Wallet-Address: 7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU" \
  -H "X-Signature: 3Bv7wZ..." \
  -H "X-Message: Sign this message..."
```

**Response (200 OK):**

```json
{
  "wallet": "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU",
  "credits": 47,
  "staked": false,
  "priority_tier": "standard",  // standard | premium | enterprise
  "tier_benefits": {
    "processing_speed": "standard",
    "support_level": "community",
    "custom_playbooks": false
  },
  "last_updated": "2025-11-18T10:30:28Z"
}
```

**Priority Tiers:**

| Tier | Credit Threshold | Benefits |
|------|------------------|----------|
| **Standard** | 0-99 | Standard processing speed, community support |
| **Premium** | 100-999 | Priority processing, email support |
| **Enterprise** | 1000+ | Fastest processing, dedicated support, custom playbooks |

---

### GET /credits/:wallet/transactions

Get credit transaction history for a wallet.

**Authentication:** Required

**URL Parameters:**
- `wallet` (string, required): Solana wallet address

**Query Parameters:**
- `page` (integer, optional, default: 1)
- `limit` (integer, optional, default: 20, max: 100)

**Example Request:**

```bash
curl "https://api.apsic.example.com/v1/credits/7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU/transactions?page=1&limit=10" \
  -H "X-Wallet-Address: 7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU" \
  -H "X-Signature: 3Bv7wZ..." \
  -H "X-Message: Sign this message..."
```

**Response (200 OK):**

```json
{
  "transactions": [
    {
      "id": "txn_abc123",
      "wallet": "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU",
      "amount": -1,
      "transaction_type": "incident_processing",
      "incident_id": "cm3x5y7z9-1234",
      "timestamp": "2025-11-18T10:30:28Z"
    },
    {
      "id": "txn_abc122",
      "wallet": "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU",
      "amount": 50,
      "transaction_type": "purchase",
      "incident_id": null,
      "timestamp": "2025-11-17T08:00:00Z"
    }
  ],

  "pagination": {
    "total": 35,
    "page": 1,
    "limit": 10,
    "total_pages": 4
  }
}
```

---

## 4.3 Admin

### GET /admin/stats

Get system-wide statistics (Admin only).

**Authentication:** Required (Admin role)

**Example Request:**

```bash
curl https://api.apsic.example.com/v1/admin/stats \
  -H "X-Wallet-Address: <admin_wallet>" \
  -H "X-Signature: 3Bv7wZ..." \
  -H "X-Message: Sign this message..."
```

**Response (200 OK):**

```json
{
  "time_period": "last_30_days",
  "incidents": {
    "total": 1247,
    "by_severity": {
      "low": 412,
      "medium": 563,
      "high": 217,
      "critical": 55
    },
    "by_type": {
      "harassment": 387,
      "accident": 215,
      "cyber": 142,
      "infrastructure": 98,
      "other": 405
    },
    "by_status": {
      "processing": 12,
      "completed": 1220,
      "failed": 15
    }
  },

  "credits": {
    "total_used": 1247,
    "total_purchased": 3500,
    "active_wallets": 342
  },

  "performance": {
    "avg_processing_time_ms": 27834,
    "p95_processing_time_ms": 35120,
    "opus_success_rate": 0.988
  },

  "human_reviews": {
    "total": 272,
    "pending": 8,
    "approved": 251,
    "rejected": 13
  }
}
```

---

### POST /admin/credits/add

Add credits to a wallet (Admin only).

**Authentication:** Required (Admin role)

**Request Body:**

```json
{
  "wallet": "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU",
  "amount": 100,
  "reason": "Promotional credits for early adopter"
}
```

**Response (200 OK):**

```json
{
  "wallet": "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU",
  "credits_before": 50,
  "credits_added": 100,
  "credits_after": 150,
  "transaction_id": "txn_xyz789"
}
```

---

## 4.4 Webhooks

### POST /webhooks/opus-callback

Receive Opus workflow completion callback.

**Authentication:** Opus API key in header (`X-Opus-API-Key`)

**Request Body (from Opus):**

```json
{
  "job_id": "opus_job_12345",
  "workflow_name": "APSIC_Public_Safety_Intake_v1",
  "status": "completed",  // or "failed"
  "result": {
    "incident_id": "cm3x5y7z9-1234",
    "audit_log_json": {
      // Full audit log
    }
  },
  "error": null  // or error message if failed
}
```

**Response (200 OK):**

```json
{
  "received": true,
  "incident_id": "cm3x5y7z9-1234",
  "status": "processed"
}
```

---

## 5. Data Models

### Incident

```typescript
interface Incident {
  incident_id: string;
  status: "processing" | "completed" | "failed";
  created_at: string;  // ISO-8601
  updated_at: string;

  input: {
    text: string;
    incident_type?: string;
    media_urls: string[];
    reporter_wallet: string;
  };

  result?: {
    severity_score: number;  // 0-100
    severity_label: "Low" | "Medium" | "High" | "Critical";
    incident_type: string;

    extracted_fields: {
      location?: string;
      time?: string;
      parties?: string[];
      emotion?: string;
      risk_indicators?: string[];
    };

    summary: string;
    recommended_actions: string[];
    urgency: "immediate" | "within_1_hour" | "within_24_hours" | "routine";
    route: "LogOnly" | "Review" | "Escalate" | "Immediate";
    assigned_to?: string;
  };

  similar_incidents?: SimilarIncident[];
  audit_log?: AuditLog;
}
```

### Similar Incident

```typescript
interface SimilarIncident {
  incident_id: string;
  similarity_score: number;  // 0-1
  severity_label: string;
  incident_type: string;
  timestamp: string;
  summary: string;
}
```

### Audit Log

```typescript
interface AuditLog {
  version: string;
  incident_id: string;
  timestamp: string;

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
        entities: Record<string, any>;
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

  similar_incidents: SimilarIncident[];
  external_data_sources: string[];
  credits_used: number;
  processing_time_ms: number;
}
```

### Credit Info

```typescript
interface CreditInfo {
  wallet: string;
  credits: number;
  staked: boolean;
  priority_tier: "standard" | "premium" | "enterprise";
  tier_benefits: {
    processing_speed: string;
    support_level: string;
    custom_playbooks: boolean;
  };
  last_updated: string;
}
```

### Credit Transaction

```typescript
interface CreditTransaction {
  id: string;
  wallet: string;
  amount: number;  // Positive = add, Negative = deduct
  transaction_type: "purchase" | "incident_processing" | "refund" | "promotional";
  incident_id?: string;
  timestamp: string;
}
```

---

## 6. Examples

### 6.1 Complete Flow: Submit Incident → Poll → Get Results

**Step 1: Submit Incident**

```bash
curl -X POST https://api.apsic.example.com/v1/incidents \
  -H "Content-Type: application/json" \
  -H "X-Wallet-Address: 7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU" \
  -H "X-Signature: <signature>" \
  -H "X-Message: <message>" \
  -d '{
    "text": "Student reports ongoing harassment via threatening text messages. Screenshots attached.",
    "incident_type": "harassment",
    "image_urls": ["https://s3.amazonaws.com/apsic-uploads/screenshot1.jpg"],
    "reporter_wallet": "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU"
  }'
```

**Response:**

```json
{
  "incident_id": "cm3x5y7z9-1234",
  "status": "processing",
  "credits_used": 1,
  "credits_remaining": 46,
  "estimated_completion_time": "2025-11-18T10:32:00Z"
}
```

**Step 2: Poll for Completion (every 5 seconds)**

```bash
curl https://api.apsic.example.com/v1/incidents/cm3x5y7z9-1234 \
  -H "X-Wallet-Address: 7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU" \
  -H "X-Signature: <signature>" \
  -H "X-Message: <message>"
```

**Response (while processing):**

```json
{
  "incident_id": "cm3x5y7z9-1234",
  "status": "processing",
  "created_at": "2025-11-18T10:30:00Z",
  "updated_at": "2025-11-18T10:30:15Z"
}
```

**Response (completed):**

```json
{
  "incident_id": "cm3x5y7z9-1234",
  "status": "completed",
  "created_at": "2025-11-18T10:30:00Z",
  "updated_at": "2025-11-18T10:30:28Z",

  "result": {
    "severity_score": 87,
    "severity_label": "High",
    "summary": "Student reports ongoing harassment...",
    "recommended_actions": [
      "Notify campus security immediately",
      "Contact student counseling services"
    ]
  },

  "similar_incidents": [
    {
      "incident_id": "cm3x5y7z9-0987",
      "similarity_score": 0.92,
      "summary": "Similar harassment case..."
    }
  ]
}
```

**Step 3: Download Audit Log**

```bash
curl https://api.apsic.example.com/v1/incidents/cm3x5y7z9-1234/audit-log?format=json \
  -H "X-Wallet-Address: 7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU" \
  -H "X-Signature: <signature>" \
  -H "X-Message: <message>" \
  -o audit_log.json
```

---

### 6.2 Admin: Add Credits to User

```bash
curl -X POST https://api.apsic.example.com/v1/admin/credits/add \
  -H "Content-Type: application/json" \
  -H "X-Wallet-Address: <admin_wallet>" \
  -H "X-Signature: <signature>" \
  -H "X-Message: <message>" \
  -d '{
    "wallet": "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU",
    "amount": 100,
    "reason": "Hackathon demo credits"
  }'
```

**Response:**

```json
{
  "wallet": "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU",
  "credits_before": 47,
  "credits_added": 100,
  "credits_after": 147,
  "transaction_id": "txn_xyz789"
}
```

---

### 6.3 List High-Severity Incidents

```bash
curl "https://api.apsic.example.com/v1/incidents?severity=high&limit=5&sort=created_at&order=desc" \
  -H "X-Wallet-Address: <admin_wallet>" \
  -H "X-Signature: <signature>" \
  -H "X-Message: <message>"
```

**Response:**

```json
{
  "incidents": [
    {
      "incident_id": "cm3x5y7z9-1234",
      "severity_score": 87,
      "severity_label": "High",
      "summary": "Student reports ongoing harassment...",
      "created_at": "2025-11-18T10:30:00Z"
    }
  ],
  "pagination": {
    "total": 217,
    "page": 1,
    "limit": 5,
    "total_pages": 44
  }
}
```

---

## 7. Versioning

API versioning is handled via URL path: `/v1/`, `/v2/`, etc.

**Current Version:** v1

**Deprecation Policy:**
- 6 months notice before deprecating any endpoint
- New versions introduced as needed for breaking changes
- Non-breaking changes added to existing version

---

## 8. Changelog

### v1.0.0 (2025-11-18)
- Initial API release
- Endpoints: incidents, credits, admin, webhooks
- Wallet-based authentication
- Rate limiting
- Comprehensive error handling

---

**END OF API SPECIFICATION**
