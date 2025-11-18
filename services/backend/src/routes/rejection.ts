import { Router } from 'express';
import { RejectionService } from '../services/rejectionService';
import { z } from 'zod';

// Validation schemas
const rejectIncidentSchema = z.object({
  reason: z.string().min(10),
  rejected_by: z.string().min(1),
  suggested_corrections: z.record(z.any()).optional(),
});

const submitCorrectionsSchema = z.object({
  text: z.string().min(10).optional(),
  incident_type: z.enum(['harassment', 'accident', 'cyber', 'infrastructure', 'medical', 'other']).optional(),
  severity_override: z.enum(['Low', 'Medium', 'High', 'Critical']).optional(),
  route_override: z.enum(['Escalate', 'Monitor', 'LogOnly']).optional(),
  additional_notes: z.string().optional(),
  corrected_by: z.string().min(1),
});

export function createRejectionRoutes(rejectionService: RejectionService): Router {
  const router = Router();

  /**
   * POST /api/rejection/:id/reject - Reject an incident
   *
   * Marks incident as rejected with reason.
   * Allows for correction and reprocessing.
   *
   * Body:
   * {
   *   "reason": "Insufficient information provided",
   *   "rejected_by": "reviewer_wallet_address",
   *   "suggested_corrections": {
   *     "text": "Please provide more details about the location",
   *     "incident_type": "harassment"
   *   }
   * }
   */
  router.post('/:id/reject', async (req, res, next) => {
    try {
      const validation = rejectIncidentSchema.safeParse(req.body);

      if (!validation.success) {
        return res.status(400).json({
          error: 'Invalid rejection request',
          details: validation.error.errors,
        });
      }

      const { reason, rejected_by, suggested_corrections } = validation.data;

      const result = await rejectionService.rejectIncident(
        req.params.id,
        reason,
        rejected_by,
        suggested_corrections
      );

      res.json(result);
    } catch (error) {
      next(error);
    }
  });

  /**
   * POST /api/rejection/:id/correct - Submit corrections for rejected incident
   *
   * Updates incident with corrected data and marks ready for reprocessing.
   *
   * Body:
   * {
   *   "text": "Corrected incident description with more details",
   *   "incident_type": "harassment",
   *   "additional_notes": "Added specific location and time",
   *   "corrected_by": "reporter_wallet_address"
   * }
   */
  router.post('/:id/correct', async (req, res, next) => {
    try {
      const validation = submitCorrectionsSchema.safeParse(req.body);

      if (!validation.success) {
        return res.status(400).json({
          error: 'Invalid correction request',
          details: validation.error.errors,
        });
      }

      const result = await rejectionService.submitCorrections(req.params.id, validation.data);

      res.json(result);
    } catch (error) {
      next(error);
    }
  });

  /**
   * POST /api/rejection/:id/reprocess - Reprocess corrected incident
   *
   * Runs corrected incident through full workflow again.
   * Maintains complete audit trail.
   */
  router.post('/:id/reprocess', async (req, res, next) => {
    try {
      const result = await rejectionService.reprocessCorrectedIncident(req.params.id);
      res.json(result);
    } catch (error) {
      next(error);
    }
  });

  /**
   * GET /api/rejection/:id/history - Get rejection/correction history
   *
   * Shows complete history of rejections, corrections, and reprocessing.
   */
  router.get('/:id/history', async (req, res, next) => {
    try {
      const history = await rejectionService.getRejectionHistory(req.params.id);
      res.json(history);
    } catch (error) {
      next(error);
    }
  });

  /**
   * GET /api/rejection/rejected - List all rejected incidents
   *
   * Query params:
   * - page: Page number (default 1)
   * - limit: Results per page (default 20, max 100)
   * - wallet_address: Filter by reporter wallet
   */
  router.get('/rejected', async (req, res, next) => {
    try {
      const filters = {
        page: req.query.page ? parseInt(req.query.page as string) : 1,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 20,
        wallet_address: req.query.wallet_address as string | undefined,
      };

      const result = await rejectionService.listRejectedIncidents(filters);
      res.json(result);
    } catch (error) {
      next(error);
    }
  });

  /**
   * GET /api/rejection/pending - List incidents pending reprocessing
   *
   * Shows all incidents with corrections submitted, ready for reprocessing.
   */
  router.get('/pending', async (req, res, next) => {
    try {
      const filters = {
        page: req.query.page ? parseInt(req.query.page as string) : 1,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 20,
      };

      const result = await rejectionService.listPendingReprocessing(filters);
      res.json(result);
    } catch (error) {
      next(error);
    }
  });

  /**
   * POST /api/rejection/reprocess-all - Batch reprocess all pending corrections
   *
   * Automatically reprocesses all incidents marked as pending_reprocess.
   * Useful for automated workflows.
   */
  router.post('/reprocess-all', async (req, res, next) => {
    try {
      const result = await rejectionService.batchReprocessPendingCorrections();
      res.json(result);
    } catch (error) {
      next(error);
    }
  });

  return router;
}
