import { Router } from 'express';
import { IncidentService } from '../services/incidentService';
import { validateIncidentSubmission } from '../middleware/validation';

export function createIncidentRoutes(incidentService: IncidentService): Router {
  const router = Router();

  /**
   * POST /api/incidents - Submit new incident
   */
  router.post('/', validateIncidentSubmission, async (req, res, next) => {
    try {
      const result = await incidentService.createIncident(req.body);
      res.status(202).json(result);
    } catch (error) {
      next(error);
    }
  });

  /**
   * GET /api/incidents/:id - Get incident by ID
   */
  router.get('/:id', async (req, res, next) => {
    try {
      const incident = await incidentService.getIncident(req.params.id);

      if (!incident) {
        return res.status(404).json({ error: 'Incident not found' });
      }

      res.json(incident);
    } catch (error) {
      next(error);
    }
  });

  /**
   * GET /api/incidents - List incidents with filters
   */
  router.get('/', async (req, res, next) => {
    try {
      const filters = {
        page: req.query.page ? parseInt(req.query.page as string) : 1,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 20,
        severity: req.query.severity as string,
        type: req.query.type as string,
        status: req.query.status as string,
        sort: req.query.sort as string,
      };

      const result = await incidentService.listIncidents(filters);
      res.json(result);
    } catch (error) {
      next(error);
    }
  });

  return router;
}
