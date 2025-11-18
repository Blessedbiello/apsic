import { Router } from 'express';
import { IncidentService } from '../services/incidentService';

export function createWebhookRoutes(incidentService?: IncidentService): Router {
  const router = Router();

  /**
   * POST /api/webhooks/opus-callback - Opus workflow callback
   */
  router.post('/opus-callback', async (req, res, next) => {
    try {
      const { job_id, status, result } = req.body;

      console.log('[OPUS CALLBACK]', { job_id, status, timestamp: new Date().toISOString() });

      if (status === 'completed') {
        if (incidentService) {
          // Process the completed Opus workflow
          await incidentService.handleOpusWorkflowCompletion(job_id, result);
          console.log(`✅ Opus workflow ${job_id} processed successfully`);
        } else {
          console.warn('⚠️ IncidentService not provided to webhook handler');
        }
      } else if (status === 'failed') {
        console.error(`❌ Opus workflow ${job_id} failed:`, result);

        // Mark incident as failed
        if (incidentService) {
          // TODO: Add method to mark incident as failed by job_id
          console.log('Attempting to mark incident as failed...');
        }
      } else if (status === 'running' || status === 'pending') {
        console.log(`⏳ Opus workflow ${job_id} status: ${status}`);
      }

      res.status(200).json({
        received: true,
        job_id,
        status,
        processed_at: new Date().toISOString()
      });
    } catch (error: any) {
      console.error('[OPUS CALLBACK ERROR]', error);
      next(error);
    }
  });

  /**
   * GET /api/webhooks/health - Health check endpoint
   */
  router.get('/health', (req, res) => {
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'APSIC Backend API',
    });
  });

  return router;
}
