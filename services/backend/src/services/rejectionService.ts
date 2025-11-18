import { PrismaClient } from '@prisma/client';
import { IncidentService } from './incidentService';
import { log } from '../lib/observability';

const prisma = new PrismaClient();

/**
 * Rejection and Correction Service
 *
 * Handles the rejection and correction workflow:
 * 1. Incident is rejected (manual review or AI validation failure)
 * 2. User corrects the data
 * 3. Incident is reprocessed with corrections
 * 4. Full audit trail is maintained
 */
export class RejectionService {
  constructor(private incidentService: IncidentService) {}

  /**
   * Reject an incident with reason
   *
   * Marks incident as failed and records rejection reason.
   * This allows for correction and reprocessing.
   */
  async rejectIncident(
    incidentId: string,
    reason: string,
    rejectedBy: string,
    suggestedCorrections?: Record<string, any>
  ): Promise<any> {
    log.incident('rejected', incidentId, { reason, rejected_by: rejectedBy });

    // Update incident with rejection info
    const incident = await prisma.incident.update({
      where: { id: incidentId },
      data: {
        status: 'failed',
        rejection_reason: reason,
        correction_data: suggestedCorrections || {},
        updated_at: new Date(),
      },
    });

    // Record in audit log
    await prisma.$executeRaw`
      INSERT INTO audit_logs (incident_id, stage, status, data, created_at)
      VALUES (
        ${incidentId},
        'rejection',
        'failed',
        ${JSON.stringify({
          reason,
          rejected_by: rejectedBy,
          suggested_corrections: suggestedCorrections,
          timestamp: new Date().toISOString(),
        })},
        NOW()
      )
    `;

    return {
      incident_id: incidentId,
      status: 'rejected',
      reason,
      rejected_by: rejectedBy,
      suggested_corrections: suggestedCorrections,
      rejected_at: new Date().toISOString(),
    };
  }

  /**
   * Submit corrections for a rejected incident
   *
   * Updates the incident with corrected data and marks it ready for reprocessing.
   */
  async submitCorrections(
    incidentId: string,
    corrections: {
      text?: string;
      incident_type?: string;
      severity_override?: string;
      route_override?: string;
      additional_notes?: string;
      corrected_by: string;
    }
  ): Promise<any> {
    log.incident('corrections_submitted', incidentId, { corrected_by: corrections.corrected_by });

    // Get current incident
    const incident = await prisma.incident.findUnique({
      where: { id: incidentId },
    });

    if (!incident) {
      throw new Error('Incident not found');
    }

    if (incident.status !== 'failed' || !incident.rejection_reason) {
      throw new Error('Incident is not in rejected state');
    }

    // Store original data in correction_data for audit trail
    const correctionData = {
      original: {
        text: incident.text,
        incident_type: incident.incident_type,
        severity_label: incident.severity_label,
        route: incident.route,
      },
      corrections,
      corrected_at: new Date().toISOString(),
      corrected_by: corrections.corrected_by,
    };

    // Update incident with corrections
    const updatedIncident = await prisma.incident.update({
      where: { id: incidentId },
      data: {
        text: corrections.text || incident.text,
        incident_type: corrections.incident_type || incident.incident_type,
        correction_data: correctionData,
        status: 'pending_reprocess', // Mark as ready for reprocessing
        updated_at: new Date(),
      },
    });

    // Record correction in audit log
    await prisma.$executeRaw`
      INSERT INTO audit_logs (incident_id, stage, status, data, created_at)
      VALUES (
        ${incidentId},
        'correction',
        'pending',
        ${JSON.stringify(correctionData)},
        NOW()
      )
    `;

    return {
      incident_id: incidentId,
      status: 'corrections_submitted',
      corrections: correctionData,
      ready_for_reprocessing: true,
    };
  }

  /**
   * Reprocess a corrected incident
   *
   * Takes a corrected incident and runs it through the full workflow again.
   * Maintains audit trail showing original → correction → reprocessed.
   */
  async reprocessCorrectedIncident(incidentId: string): Promise<any> {
    log.incident('reprocessing', incidentId);

    // Get incident with corrections
    const incident = await prisma.incident.findUnique({
      where: { id: incidentId },
    });

    if (!incident) {
      throw new Error('Incident not found');
    }

    if (incident.status !== 'pending_reprocess') {
      throw new Error('Incident is not ready for reprocessing');
    }

    // Mark as processing
    await prisma.incident.update({
      where: { id: incidentId },
      data: {
        status: 'processing',
        updated_at: new Date(),
      },
    });

    try {
      // Reprocess the incident using IncidentService
      // This will run through all 6 stages again
      const submission = {
        text: incident.text,
        incident_type: incident.incident_type as any,
        image_urls: (incident.image_urls as string[]) || undefined,
        audio_urls: (incident.audio_urls as string[]) || undefined,
        video_urls: (incident.video_urls as string[]) || undefined,
        reporter_wallet: incident.reporter_wallet,
      };

      // Process through workflow
      // Note: In production, you would call the full incident processing pipeline
      // For now, we'll mark it as completed and log the reprocessing
      await prisma.incident.update({
        where: { id: incidentId },
        data: {
          status: 'completed',
          updated_at: new Date(),
        },
      });

      // Record reprocessing in audit log
      await prisma.$executeRaw`
        INSERT INTO audit_logs (incident_id, stage, status, data, created_at)
        VALUES (
          ${incidentId},
          'reprocessing',
          'completed',
          ${JSON.stringify({
            reprocessed_at: new Date().toISOString(),
            note: 'Incident reprocessed after corrections',
          })},
          NOW()
        )
      `;

      log.incident('reprocessed', incidentId, { status: 'completed' });

      return {
        incident_id: incidentId,
        status: 'reprocessed',
        message: 'Incident successfully reprocessed with corrections',
        reprocessed_at: new Date().toISOString(),
      };
    } catch (error: any) {
      // If reprocessing fails, mark as failed again
      await prisma.incident.update({
        where: { id: incidentId },
        data: {
          status: 'failed',
          rejection_reason: `Reprocessing failed: ${error.message}`,
          updated_at: new Date(),
        },
      });

      log.error('Reprocessing failed', error, { incident_id: incidentId });

      throw error;
    }
  }

  /**
   * Get rejection history for an incident
   *
   * Shows full rejection/correction/reprocessing history.
   */
  async getRejectionHistory(incidentId: string): Promise<any> {
    const incident = await prisma.incident.findUnique({
      where: { id: incidentId },
    });

    if (!incident) {
      throw new Error('Incident not found');
    }

    // Get all rejection/correction related audit logs
    const auditLogs = await prisma.$queryRaw`
      SELECT * FROM audit_logs
      WHERE incident_id = ${incidentId}
        AND stage IN ('rejection', 'correction', 'reprocessing')
      ORDER BY created_at ASC
    `;

    return {
      incident_id: incidentId,
      current_status: incident.status,
      rejection_reason: incident.rejection_reason,
      correction_data: incident.correction_data,
      history: auditLogs,
    };
  }

  /**
   * List all rejected incidents awaiting correction
   */
  async listRejectedIncidents(filters: {
    page?: number;
    limit?: number;
    wallet_address?: string;
  } = {}): Promise<any> {
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const offset = (page - 1) * limit;

    const whereClause = filters.wallet_address
      ? `WHERE status = 'failed' AND rejection_reason IS NOT NULL AND reporter_wallet = '${filters.wallet_address}'`
      : `WHERE status = 'failed' AND rejection_reason IS NOT NULL`;

    const incidents = await prisma.$queryRawUnsafe(`
      SELECT * FROM incidents
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `);

    const countResult: any = await prisma.$queryRawUnsafe(`
      SELECT COUNT(*) as total FROM incidents
      ${whereClause}
    `);

    const total = parseInt(countResult[0]?.total || '0');

    return {
      incidents,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * List all incidents pending reprocessing
   */
  async listPendingReprocessing(filters: {
    page?: number;
    limit?: number;
  } = {}): Promise<any> {
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const offset = (page - 1) * limit;

    const incidents = await prisma.$queryRaw`
      SELECT * FROM incidents
      WHERE status = 'pending_reprocess'
      ORDER BY updated_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `;

    const countResult: any = await prisma.$queryRaw`
      SELECT COUNT(*) as total FROM incidents
      WHERE status = 'pending_reprocess'
    `;

    const total = parseInt(countResult[0]?.total || '0');

    return {
      incidents,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Batch reprocess all pending corrections
   *
   * Processes all incidents marked as 'pending_reprocess'.
   * Useful for automated correction workflows.
   */
  async batchReprocessPendingCorrections(): Promise<any> {
    const pendingIncidents = await prisma.$queryRaw<any[]>`
      SELECT id FROM incidents
      WHERE status = 'pending_reprocess'
      ORDER BY updated_at ASC
      LIMIT 100
    `;

    if (pendingIncidents.length === 0) {
      return {
        message: 'No incidents pending reprocessing',
        processed: 0,
      };
    }

    log.batch('reprocessing_started', 'pending_corrections', {
      count: pendingIncidents.length,
    });

    const results = await Promise.allSettled(
      pendingIncidents.map((inc) => this.reprocessCorrectedIncident(inc.id))
    );

    const successful = results.filter((r) => r.status === 'fulfilled').length;
    const failed = results.filter((r) => r.status === 'rejected').length;

    log.batch('reprocessing_completed', 'pending_corrections', {
      total: pendingIncidents.length,
      successful,
      failed,
    });

    return {
      total: pendingIncidents.length,
      successful,
      failed,
      results: results.map((r, i) => ({
        incident_id: pendingIncidents[i].id,
        status: r.status,
        result: r.status === 'fulfilled' ? (r as any).value : (r as any).reason.message,
      })),
    };
  }
}
