import { Router } from 'express';
import { BatchService } from '../services/batchService';
import { z } from 'zod';

// Validation schemas
const batchSubmissionSchema = z.object({
  incidents: z.array(
    z.object({
      text: z.string().min(10),
      incident_type: z.enum(['harassment', 'accident', 'cyber', 'infrastructure', 'medical', 'other', 'auto']).optional(),
      image_urls: z.array(z.string().url()).optional(),
      audio_urls: z.array(z.string().url()).optional(),
      video_urls: z.array(z.string().url()).optional(),
      reporter_wallet: z.string(),
    })
  ).min(1).max(500),
  options: z.object({
    parallel: z.boolean().optional(),
    maxConcurrency: z.number().min(1).max(20).optional(),
  }).optional(),
});

const batchQuerySchema = z.object({
  wallet_address: z.string().optional(),
  status: z.enum(['processing', 'completed', 'failed']).optional(),
  page: z.number().min(1).optional(),
  limit: z.number().min(1).max(100).optional(),
});

export function createBatchRoutes(batchService: BatchService): Router {
  const router = Router();

  /**
   * POST /api/batch - Process batch of incidents
   *
   * Processes 1-500 incidents in parallel with performance metrics.
   * Returns batch ID, processing time, and performance comparison.
   */
  router.post('/', async (req, res, next) => {
    try {
      // Validate request
      const validation = batchSubmissionSchema.safeParse(req.body);

      if (!validation.success) {
        return res.status(400).json({
          error: 'Invalid batch submission',
          details: validation.error.errors,
        });
      }

      const { incidents, options } = validation.data;

      console.log(`📦 Batch processing started: ${incidents.length} incidents`);

      // Process batch
      const result = await batchService.processBatch(incidents, options);

      console.log(`✅ Batch processing completed: ${result.batch_id}`);
      console.log(`⏱️ Processing time: ${result.processing_time_ms}ms`);
      console.log(`📊 Performance improvement: ${result.performance_improvement}`);

      res.status(202).json(result);
    } catch (error) {
      next(error);
    }
  });

  /**
   * GET /api/batch/:id - Get batch status and results
   *
   * Retrieves complete batch information including all incidents.
   */
  router.get('/:id', async (req, res, next) => {
    try {
      const batch = await batchService.getBatch(req.params.id);

      if (!batch) {
        return res.status(404).json({ error: 'Batch not found' });
      }

      res.json(batch);
    } catch (error) {
      next(error);
    }
  });

  /**
   * GET /api/batch - List batches with filters
   *
   * Query params:
   * - wallet_address: Filter by wallet
   * - status: Filter by status (processing, completed, failed)
   * - page: Page number (default 1)
   * - limit: Results per page (default 20, max 100)
   */
  router.get('/', async (req, res, next) => {
    try {
      const filters = {
        wallet_address: req.query.wallet_address as string | undefined,
        status: req.query.status as string | undefined,
        page: req.query.page ? parseInt(req.query.page as string) : 1,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 20,
      };

      const result = await batchService.listBatches(filters);
      res.json(result);
    } catch (error) {
      next(error);
    }
  });

  /**
   * GET /api/batch/:id/stats - Get batch statistics
   *
   * Returns detailed statistics about batch processing:
   * - Severity distribution
   * - Route distribution
   * - Average processing time per incident
   * - Success/failure rates
   */
  router.get('/:id/stats', async (req, res, next) => {
    try {
      const stats = await batchService.getBatchStatistics(req.params.id);

      if (!stats) {
        return res.status(404).json({ error: 'Batch not found' });
      }

      res.json(stats);
    } catch (error) {
      next(error);
    }
  });

  /**
   * POST /api/batch/:id/retry-failed - Retry failed incidents in batch
   *
   * Reprocesses all failed incidents in a batch.
   */
  router.post('/:id/retry-failed', async (req, res, next) => {
    try {
      const result = await batchService.retryFailedIncidents(req.params.id);

      if (!result) {
        return res.status(404).json({ error: 'Batch not found or no failed incidents' });
      }

      res.json(result);
    } catch (error) {
      next(error);
    }
  });

  return router;
}
