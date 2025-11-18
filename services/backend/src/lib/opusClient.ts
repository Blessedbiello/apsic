import axios, { AxiosInstance } from 'axios';
import { OpusJobPayload, OpusJobResponse } from '../types';

export class OpusClient {
  private client: AxiosInstance;
  private baseUrl: string;
  private apiKey: string;

  constructor(apiKey: string, baseUrl: string = 'https://api.opus.com/v1') {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
    this.client = axios.create({
      baseURL: this.baseUrl,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      timeout: 60000, // 60 seconds
    });
  }

  /**
   * Start APSIC workflow in Opus
   */
  async startWorkflow(
    workflowName: string,
    payload: OpusJobPayload
  ): Promise<OpusJobResponse> {
    try {
      const response = await this.client.post(`/workflows/${workflowName}/execute`, {
        input: payload,
        callback_url: process.env.OPUS_CALLBACK_URL,
      });

      return {
        job_id: response.data.job_id || response.data.id,
        status: response.data.status || 'running',
        result: response.data.result,
      };
    } catch (error: any) {
      console.error('Opus workflow start error:', error.response?.data || error.message);
      throw new Error(`Failed to start Opus workflow: ${error.message}`);
    }
  }

  /**
   * Get job status
   */
  async getJobStatus(jobId: string): Promise<OpusJobResponse> {
    try {
      const response = await this.client.get(`/jobs/${jobId}`);

      return {
        job_id: jobId,
        status: response.data.status,
        result: response.data.result,
      };
    } catch (error: any) {
      console.error('Opus job status error:', error.response?.data || error.message);
      throw new Error(`Failed to get job status: ${error.message}`);
    }
  }

  /**
   * Cancel a running job
   */
  async cancelJob(jobId: string): Promise<boolean> {
    try {
      await this.client.post(`/jobs/${jobId}/cancel`);
      return true;
    } catch (error: any) {
      console.error('Opus job cancel error:', error.response?.data || error.message);
      return false;
    }
  }

  /**
   * List all workflows
   */
  async listWorkflows(): Promise<any[]> {
    try {
      const response = await this.client.get('/workflows');
      return response.data.workflows || [];
    } catch (error: any) {
      console.error('Opus list workflows error:', error.response?.data || error.message);
      return [];
    }
  }

  /**
   * Get workflow details
   */
  async getWorkflow(workflowName: string): Promise<any> {
    try {
      const response = await this.client.get(`/workflows/${workflowName}`);
      return response.data;
    } catch (error: any) {
      console.error('Opus get workflow error:', error.response?.data || error.message);
      return null;
    }
  }

  /**
   * Create or update workflow (for programmatic workflow creation)
   */
  async createWorkflow(workflowDefinition: any): Promise<any> {
    try {
      const response = await this.client.post('/workflows', workflowDefinition);
      return response.data;
    } catch (error: any) {
      console.error('Opus create workflow error:', error.response?.data || error.message);
      throw new Error(`Failed to create workflow: ${error.message}`);
    }
  }
}

/**
 * Opus Workflow Definition for APSIC
 * This represents the structure we'll create in the Opus UI
 */
export const APSIC_WORKFLOW_DEFINITION = {
  name: 'APSIC_Public_Safety_Intake_v1',
  description: 'AI Public Safety Intake Commander - Complete incident processing pipeline',
  version: '1.0',
  stages: [
    {
      name: 'Intake',
      description: 'Normalize incident data and fetch external context',
      nodes: [
        {
          type: 'data_import',
          name: 'normalize_input',
          config: {
            schema: {
              incident_id: 'string',
              text: 'string',
              media_urls: 'array',
              reporter_wallet: 'string',
              timestamp: 'string',
              incident_type: 'string?',
            },
          },
        },
      ],
    },
    {
      name: 'Understand',
      description: 'Gemini multimodal analysis and classification',
      nodes: [
        {
          type: 'ai_agent',
          name: 'extract_and_classify',
          model: 'gemini-1.5-pro',
          prompt: 'Extract incident details and classify severity...',
        },
        {
          type: 'ai_agent',
          name: 'generate_summary',
          model: 'gemini-1.5-pro',
          prompt: 'Generate summary and recommended actions...',
        },
      ],
    },
    {
      name: 'Decide',
      description: 'Rule-based routing with AI validation',
      nodes: [
        {
          type: 'code',
          name: 'rules_engine',
          language: 'python',
          code: `
def route_incident(severity_score, risk_indicators, incident_type):
    route = "LogOnly"
    triggers = []

    if severity_score > 80:
        route = "Escalate"
        triggers.append("severity>80")

    if "weapon" in risk_indicators or "injury" in risk_indicators:
        route = "Immediate"
        triggers.append("weapon_or_injury")

    if 50 < severity_score <= 80:
        route = "Review"
        triggers.append("medium_high_severity")

    return {"route": route, "triggers": triggers}
          `,
        },
        {
          type: 'ai_agent',
          name: 'validate_routing',
          model: 'gemini-1.5-flash',
          prompt: 'Validate routing decision...',
        },
      ],
    },
    {
      name: 'Review',
      description: 'Agentic and human review for quality assurance',
      nodes: [
        {
          type: 'ai_agent',
          name: 'agentic_review',
          model: 'gemini-1.5-pro',
          prompt: 'Policy compliance and bias check...',
        },
        {
          type: 'human_review',
          name: 'human_review',
          condition: 'severity_label in ["High", "Critical"]',
          timeout: 3600, // 1 hour
        },
      ],
    },
    {
      name: 'Audit',
      description: 'Generate comprehensive audit log',
      nodes: [
        {
          type: 'code',
          name: 'generate_audit_log',
          language: 'python',
          code: `
def generate_audit(all_data):
    return {
        "version": "1.0",
        "incident_id": all_data["incident_id"],
        "timestamp": all_data["timestamp"],
        "processing_pipeline": all_data,
        "credits_used": 1
    }
          `,
        },
      ],
    },
    {
      name: 'Deliver',
      description: 'Send results via webhook and export data',
      nodes: [
        {
          type: 'webhook',
          name: 'callback',
          url: '${CALLBACK_URL}',
          method: 'POST',
        },
        {
          type: 'data_export',
          name: 'export_to_sheets',
          destination: 'google_sheets',
          optional: true,
        },
      ],
    },
  ],
};
