import { PrismaClient } from '@prisma/client';
import { GeminiClient } from '../lib/geminiClient';
import { OpusClient } from '../lib/opusClient';
import { QdrantClient } from '../lib/qdrantClient';
import { SolanaClient } from '../lib/solanaClient';
import { PDFGenerator } from '../lib/pdfGenerator';
import {
  IncidentSubmission,
  AuditLogData,
  ExtractedFields,
  GeminiSummary,
  RouteDecision,
} from '../types';

const prisma = new PrismaClient();

export class IncidentService {
  constructor(
    private gemini: GeminiClient,
    private opus: OpusClient,
    private qdrant: QdrantClient,
    private solana: SolanaClient,
    private pdfGenerator: PDFGenerator
  ) {}

  /**
   * Create new incident and start processing
   */
  async createIncident(submission: IncidentSubmission): Promise<any> {
    const startTime = Date.now();

    // 1. Validate wallet and check credits
    const credits = await this.solana.getCredits(submission.reporter_wallet);
    if (credits < 1) {
      throw new Error('Insufficient credits. Please acquire more SIC tokens.');
    }

    // 2. Find or create user
    let user = await prisma.user.findUnique({
      where: { wallet_address: submission.reporter_wallet },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          wallet_address: submission.reporter_wallet,
          credits,
          priority_tier: this.solana.getPriorityTier(credits),
        },
      });
    }

    // 3. Create incident record
    const incident = await prisma.incident.create({
      data: {
        reporter_id: user.id,
        reporter_wallet: submission.reporter_wallet,
        text: submission.text,
        incident_type: submission.incident_type === 'auto' ? null : submission.incident_type,
        image_urls: submission.image_urls || [],
        audio_urls: submission.audio_urls || [],
        video_urls: submission.video_urls || [],
        status: 'processing',
      },
    });

    // 4. Process asynchronously - choose Opus or Direct mode
    const useOpus = process.env.USE_OPUS_WORKFLOW === 'true';

    if (useOpus) {
      // OPUS WORKFLOW MODE
      this.processViaOpusWorkflow(incident.id, submission, startTime).catch((error) => {
        console.error(`Error processing incident ${incident.id} via Opus:`, error);
        this.markIncidentFailed(incident.id, error.message);
      });
    } else {
      // DIRECT GEMINI MODE (original implementation)
      this.processIncidentAsync(incident.id, submission, startTime).catch((error) => {
        console.error(`Error processing incident ${incident.id}:`, error);
        this.markIncidentFailed(incident.id, error.message);
      });
    }

    return {
      incident_id: incident.id,
      status: 'processing',
      message: 'Incident submitted successfully. Processing in progress.',
      processing_mode: useOpus ? 'opus_workflow' : 'direct',
    };
  }

  /**
   * Process incident via Opus Workflow
   */
  private async processViaOpusWorkflow(
    incidentId: string,
    submission: IncidentSubmission,
    startTime: number
  ): Promise<void> {
    try {
      console.log(`🔄 Starting Opus workflow for incident ${incidentId}`);

      // Prepare payload for Opus workflow
      const opusPayload = {
        incident_id: incidentId,
        text: submission.text,
        media_urls: [
          ...(submission.image_urls || []),
          ...(submission.audio_urls || []),
          ...(submission.video_urls || []),
        ],
        image_urls: submission.image_urls || [],
        audio_urls: submission.audio_urls || [],
        video_urls: submission.video_urls || [],
        reporter_wallet: submission.reporter_wallet,
        timestamp: new Date().toISOString(),
        incident_type: submission.incident_type,
      };

      // Start Opus workflow
      const workflowResult = await this.opus.startWorkflow(
        'APSIC_Public_Safety_Intake_v1',
        opusPayload
      );

      console.log(`✅ Opus workflow started: Job ID ${workflowResult.job_id}`);

      // Update incident with Opus job ID
      await prisma.incident.update({
        where: { id: incidentId },
        data: {
          opus_job_id: workflowResult.job_id,
          opus_status: workflowResult.status,
        },
      });

      // The workflow will complete asynchronously and call back via webhook
      // See webhooks.ts for the callback handler
    } catch (error: any) {
      console.error(`❌ Opus workflow error for incident ${incidentId}:`, error);

      // Fall back to direct processing if Opus fails
      if (process.env.OPUS_FALLBACK_TO_DIRECT === 'true') {
        console.log(`🔄 Falling back to direct processing for incident ${incidentId}`);
        await this.processIncidentAsync(incidentId, submission, startTime);
      } else {
        throw error;
      }
    }
  }

  /**
   * Process incident through complete pipeline
   */
  private async processIncidentAsync(
    incidentId: string,
    submission: IncidentSubmission,
    startTime: number
  ): Promise<void> {
    const timestamps: any = {};

    try {
      // STAGE 1: Intake
      timestamps.intake = new Date().toISOString();
      const normalizedData = {
        incident_id: incidentId,
        text: submission.text,
        media_urls: [
          ...(submission.image_urls || []),
          ...(submission.audio_urls || []),
          ...(submission.video_urls || []),
        ],
        reporter_wallet: submission.reporter_wallet,
        timestamp: new Date().toISOString(),
      };

      // STAGE 2: Understand (Gemini)
      timestamps.understand = new Date().toISOString();

      const extracted: ExtractedFields = await this.gemini.extractAndClassify(
        submission.text,
        submission.image_urls,
        undefined, // Audio transcript
        undefined // Video description
      );

      const summary: GeminiSummary = await this.gemini.generateSummary(
        extracted,
        submission.text
      );

      // STAGE 3: Decide (Rules + AI validation)
      timestamps.decide = new Date().toISOString();

      const routing = this.applyRoutingRules(extracted);
      const aiValidation = await this.gemini.validateRouting(
        summary.summary,
        routing.route,
        routing.rules_triggered
      );

      // STAGE 4: Review
      timestamps.review = new Date().toISOString();

      const agenticReview = await this.gemini.agenticReview(
        summary.summary,
        routing.route,
        extracted
      );

      const humanReviewRequired = this.needsHumanReview(extracted, agenticReview);

      // STAGE 5: Generate Audit Log
      const auditLog: AuditLogData = {
        version: '1.0',
        incident_id: incidentId,
        timestamp: new Date().toISOString(),
        input: {
          text: submission.text,
          media_urls: normalizedData.media_urls,
          reporter_wallet: submission.reporter_wallet,
          submission_timestamp: timestamps.intake,
        },
        processing_pipeline: {
          intake: {
            timestamp: timestamps.intake,
            normalized_data: normalizedData,
          },
          understand: {
            timestamp: timestamps.understand,
            gemini_extraction: extracted,
            gemini_summary: summary,
          },
          decide: {
            timestamp: timestamps.decide,
            rules_triggered: routing.rules_triggered,
            route: routing.route,
            ai_validation: aiValidation,
          },
          review: {
            timestamp: timestamps.review,
            agentic_review: agenticReview,
            human_review: {
              required: humanReviewRequired,
              completed: false,
            },
          },
        },
        final_decision: {
          route: routing.route,
          severity: extracted.severity_label,
          priority: summary.urgency,
          assigned_to: this.getAssignedTeam(extracted.incident_type, extracted.severity_label),
          recommended_actions: summary.recommended_actions,
        },
        similar_incidents: [],
        external_data_sources: ['Gemini API', 'Qdrant Vector DB'],
        credits_used: 1,
        processing_time_ms: Date.now() - startTime,
      };

      // STAGE 6: Vector Search for Similar Incidents
      const embeddingText = `${submission.text} ${summary.summary} ${extracted.incident_type}`;
      const embedding = await this.gemini.generateEmbedding(embeddingText);

      const similarIncidents = await this.qdrant.searchSimilar(embedding, 3, {
        must: [
          {
            key: 'incident_type',
            match: { value: extracted.incident_type },
          },
        ],
      });

      auditLog.similar_incidents = similarIncidents.map((inc: any) => ({
        incident_id: inc.incident_id,
        similarity_score: inc.similarity_score,
        summary: inc.summary,
        severity_label: inc.severity_label,
        timestamp: inc.timestamp,
      }));

      // STAGE 7: Update Database
      await prisma.incident.update({
        where: { id: incidentId },
        data: {
          severity_score: extracted.severity_score,
          severity_label: extracted.severity_label,
          summary: summary.summary,
          recommended_actions: summary.recommended_actions,
          urgency: summary.urgency,
          route: routing.route,
          extracted_fields: extracted as any,
          status: 'completed',
        },
      });

      // Save audit log
      await prisma.auditLog.create({
        data: {
          incident_id: incidentId,
          audit_json: auditLog as any,
        },
      });

      // Generate PDF
      try {
        const pdfBuffer = await this.pdfGenerator.generateAuditPDF(auditLog);
        // TODO: Upload PDF to S3/R2 and save URL
        console.log(`PDF generated for incident ${incidentId}, size: ${pdfBuffer.length} bytes`);
      } catch (pdfError) {
        console.error('PDF generation error:', pdfError);
      }

      // Save similar incidents
      for (const similar of similarIncidents) {
        await prisma.similarIncident.create({
          data: {
            incident_id: incidentId,
            similar_incident_id: similar.incident_id,
            similarity_score: similar.similarity_score,
          },
        });
      }

      // Upsert to Qdrant for future searches
      await this.qdrant.upsertIncident(incidentId, embedding, {
        text: submission.text,
        summary: summary.summary,
        severity_score: extracted.severity_score,
        severity_label: extracted.severity_label,
        incident_type: extracted.incident_type,
        timestamp: new Date().toISOString(),
        route: routing.route,
        tags: [extracted.incident_type, extracted.severity_label.toLowerCase()],
      });

      // Decrement credits
      this.solana.decrementMockCredits(submission.reporter_wallet, 1);

      await prisma.creditLedger.create({
        data: {
          wallet_address: submission.reporter_wallet,
          amount: -1,
          transaction_type: 'incident_processing',
          incident_id: incidentId,
        },
      });

      console.log(`✅ Incident ${incidentId} processed successfully in ${Date.now() - startTime}ms`);
    } catch (error: any) {
      console.error(`Error in incident processing pipeline:`, error);
      throw error;
    }
  }

  /**
   * Apply routing rules
   */
  private applyRoutingRules(extracted: ExtractedFields): {
    route: RouteDecision;
    rules_triggered: string[];
  } {
    let route: RouteDecision = 'LogOnly';
    const rules_triggered: string[] = [];

    if (extracted.severity_score > 80) {
      route = 'Escalate';
      rules_triggered.push('severity>80');
    }

    if (
      extracted.risk_indicators.includes('weapon') ||
      extracted.risk_indicators.includes('injury')
    ) {
      route = 'Immediate';
      rules_triggered.push('weapon_or_injury');
    }

    if (extracted.severity_score > 50 && extracted.severity_score <= 80) {
      route = 'Review';
      rules_triggered.push('medium_high_severity');
    }

    if (extracted.emotion === 'distressed' && extracted.incident_type === 'harassment') {
      route = 'Escalate';
      rules_triggered.push('distressed_harassment');
    }

    if (extracted.severity_score <= 50 && route === 'LogOnly') {
      rules_triggered.push('low_severity');
    }

    return { route, rules_triggered };
  }

  /**
   * Determine if human review is needed
   */
  private needsHumanReview(extracted: ExtractedFields, agenticReview: any): boolean {
    return (
      ['High', 'Critical'].includes(extracted.severity_label) ||
      !agenticReview.overall_passed ||
      extracted.severity_score < 0.7 ||
      agenticReview.legal_considerations.length > 0
    );
  }

  /**
   * Get assigned team based on type and severity
   */
  private getAssignedTeam(incidentType: string, severity: string): string {
    if (severity === 'Critical') return 'Emergency Response Team';
    if (severity === 'High') return 'Priority Response Team';

    const teamMap: Record<string, string> = {
      harassment: 'Student Affairs',
      accident: 'Safety & Security',
      cyber: 'IT Security Team',
      infrastructure: 'Facilities Management',
      medical: 'Health Services',
    };

    return teamMap[incidentType] || 'General Support';
  }

  /**
   * Handle Opus workflow completion callback
   */
  async handleOpusWorkflowCompletion(jobId: string, result: any): Promise<void> {
    try {
      console.log(`📥 Processing Opus workflow completion for job ${jobId}`);

      // Find incident by Opus job ID
      const incident = await prisma.incident.findFirst({
        where: { opus_job_id: jobId },
      });

      if (!incident) {
        console.error(`❌ No incident found for Opus job ${jobId}`);
        return;
      }

      const auditLog = result.audit_log_json || result;

      // Extract data from Opus workflow result
      const extracted = auditLog.processing_pipeline?.understand?.gemini_extraction;
      const summary = auditLog.processing_pipeline?.understand?.gemini_summary;
      const routing = auditLog.processing_pipeline?.decide;
      const similarIncidents = auditLog.similar_incidents || [];

      // Update incident with Opus results
      await prisma.incident.update({
        where: { id: incident.id },
        data: {
          severity_score: extracted?.severity_score,
          severity_label: extracted?.severity_label,
          summary: summary?.summary,
          recommended_actions: summary?.recommended_actions || [],
          urgency: summary?.urgency,
          route: routing?.route,
          extracted_fields: extracted as any,
          status: 'completed',
          opus_status: 'completed',
        },
      });

      // Save audit log
      await prisma.auditLog.create({
        data: {
          incident_id: incident.id,
          audit_json: auditLog as any,
        },
      });

      // Generate PDF
      try {
        const pdfBuffer = await this.pdfGenerator.generateAuditPDF(auditLog);
        console.log(`📄 PDF generated for incident ${incident.id}, size: ${pdfBuffer.length} bytes`);
      } catch (pdfError) {
        console.error('PDF generation error:', pdfError);
      }

      // Generate embedding and upsert to Qdrant
      try {
        const embeddingText = `${incident.text} ${summary?.summary || ''} ${extracted?.incident_type || ''}`;
        const embedding = await this.gemini.generateEmbedding(embeddingText);

        await this.qdrant.upsertIncident(incident.id, embedding, {
          text: incident.text,
          summary: summary?.summary,
          severity_score: extracted?.severity_score,
          severity_label: extracted?.severity_label,
          incident_type: extracted?.incident_type,
          timestamp: new Date().toISOString(),
          route: routing?.route,
          tags: [extracted?.incident_type, extracted?.severity_label?.toLowerCase()].filter(Boolean),
        });

        console.log(`🔍 Incident ${incident.id} indexed in Qdrant`);
      } catch (qdrantError) {
        console.error('Qdrant indexing error:', qdrantError);
      }

      // Decrement credits
      this.solana.decrementMockCredits(incident.reporter_wallet, 1);

      await prisma.creditLedger.create({
        data: {
          wallet_address: incident.reporter_wallet,
          amount: -1,
          transaction_type: 'incident_processing',
          incident_id: incident.id,
        },
      });

      console.log(`✅ Opus workflow completion processed for incident ${incident.id}`);
    } catch (error: any) {
      console.error('Error handling Opus workflow completion:', error);
      throw error;
    }
  }

  /**
   * Mark incident as failed
   */
  private async markIncidentFailed(incidentId: string, errorMessage: string): Promise<void> {
    await prisma.incident.update({
      where: { id: incidentId },
      data: {
        status: 'failed',
        extracted_fields: { error: errorMessage } as any,
      },
    });
  }

  /**
   * Get incident by ID
   */
  async getIncident(incidentId: string): Promise<any> {
    const incident = await prisma.incident.findUnique({
      where: { id: incidentId },
      include: {
        audit_log: true,
        similar_incidents: true,
        reporter: {
          select: {
            wallet_address: true,
            priority_tier: true,
          },
        },
      },
    });

    return incident;
  }

  /**
   * List incidents with filters
   */
  async listIncidents(filters: {
    page?: number;
    limit?: number;
    severity?: string;
    type?: string;
    status?: string;
    sort?: string;
  }): Promise<any> {
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (filters.severity) {
      where.severity_label = filters.severity;
    }

    if (filters.type) {
      where.incident_type = filters.type;
    }

    if (filters.status) {
      where.status = filters.status;
    }

    const [incidents, total] = await Promise.all([
      prisma.incident.findMany({
        where,
        skip,
        take: limit,
        orderBy: filters.sort === 'severity' ? { severity_score: 'desc' } : { created_at: 'desc' },
        include: {
          reporter: {
            select: {
              wallet_address: true,
            },
          },
        },
      }),
      prisma.incident.count({ where }),
    ]);

    return {
      incidents,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}
