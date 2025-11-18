import { Router } from 'express';
import { ImportService } from '../services/importService';
import { BatchService } from '../services/batchService';
import { z } from 'zod';

// Validation schemas
const multiSourceImportSchema = z.object({
  csv_url: z.string().url().optional(),
  json_url: z.string().url().optional(),
  api_endpoints: z.array(z.string().url()).optional(),
  wallet_address: z.string().min(1),
  auto_process: z.boolean().optional(), // Whether to immediately process imported incidents
  process_options: z.object({
    parallel: z.boolean().optional(),
    maxConcurrency: z.number().min(1).max(20).optional(),
  }).optional(),
}).refine(
  (data) => data.csv_url || data.json_url || (data.api_endpoints && data.api_endpoints.length > 0),
  { message: 'At least one data source (csv_url, json_url, or api_endpoints) is required' }
);

const csvImportSchema = z.object({
  csv_url: z.string().url(),
  wallet_address: z.string().min(1),
  auto_process: z.boolean().optional(),
});

const jsonImportSchema = z.object({
  json_url: z.string().url(),
  wallet_address: z.string().min(1),
  auto_process: z.boolean().optional(),
});

const apiImportSchema = z.object({
  api_endpoint: z.string().url(),
  wallet_address: z.string().min(1),
  auto_process: z.boolean().optional(),
});

const sheetsImportSchema = z.object({
  spreadsheet_id: z.string().min(1),
  range: z.string().optional(),
  wallet_address: z.string().min(1),
  auto_process: z.boolean().optional(),
});

export function createImportRoutes(importService: ImportService, batchService: BatchService): Router {
  const router = Router();

  /**
   * POST /api/import/multi-source - Import from multiple sources simultaneously
   *
   * Imports data from CSV, JSON, and/or multiple API endpoints in parallel.
   * Automatically normalizes schemas across different formats.
   *
   * Body:
   * {
   *   "csv_url": "https://example.com/incidents.csv",
   *   "json_url": "https://example.com/incidents.json",
   *   "api_endpoints": ["https://api1.com/data", "https://api2.com/data"],
   *   "wallet_address": "...",
   *   "auto_process": true,  // Optional: immediately process imported incidents
   *   "process_options": {
   *     "parallel": true,
   *     "maxConcurrency": 10
   *   }
   * }
   */
  router.post('/multi-source', async (req, res, next) => {
    try {
      // Validate request
      const validation = multiSourceImportSchema.safeParse(req.body);

      if (!validation.success) {
        return res.status(400).json({
          error: 'Invalid multi-source import request',
          details: validation.error.errors,
        });
      }

      const { csv_url, json_url, api_endpoints, wallet_address, auto_process, process_options } = validation.data;

      console.log(`📥 Multi-source import started`);
      console.log(`   CSV: ${csv_url ? '✅' : '❌'}`);
      console.log(`   JSON: ${json_url ? '✅' : '❌'}`);
      console.log(`   APIs: ${api_endpoints?.length || 0} endpoints`);

      // Import from all sources
      const importResult = await importService.importMultiSource({
        csv_url,
        json_url,
        api_endpoints,
        wallet_address,
      });

      console.log(`✅ Import completed: ${importResult.total_records} records from ${importResult.sources_processed} sources`);

      // If auto_process is enabled, immediately process the imported incidents
      let batchResult = null;
      if (auto_process && importResult.incidents.length > 0) {
        console.log(`⚡ Auto-processing ${importResult.incidents.length} incidents...`);
        batchResult = await batchService.processBatch(importResult.incidents, process_options);
        console.log(`✅ Auto-processing completed: ${batchResult.batch_id}`);
      }

      res.status(200).json({
        import: importResult,
        batch: batchResult,
      });
    } catch (error) {
      next(error);
    }
  });

  /**
   * POST /api/import/csv - Import from CSV file/URL
   */
  router.post('/csv', async (req, res, next) => {
    try {
      const validation = csvImportSchema.safeParse(req.body);

      if (!validation.success) {
        return res.status(400).json({
          error: 'Invalid CSV import request',
          details: validation.error.errors,
        });
      }

      const { csv_url, wallet_address, auto_process } = validation.data;

      console.log(`📄 CSV import started: ${csv_url}`);

      const incidents = await importService.importFromCSV(csv_url);

      // Add wallet address to all incidents
      const normalizedIncidents = incidents.map((inc) => ({
        ...inc,
        reporter_wallet: wallet_address,
      }));

      console.log(`✅ CSV import completed: ${normalizedIncidents.length} records`);

      // Auto-process if enabled
      let batchResult = null;
      if (auto_process && normalizedIncidents.length > 0) {
        batchResult = await batchService.processBatch(normalizedIncidents);
      }

      res.json({
        total_records: normalizedIncidents.length,
        incidents: normalizedIncidents,
        batch: batchResult,
      });
    } catch (error) {
      next(error);
    }
  });

  /**
   * POST /api/import/json - Import from JSON file/URL
   */
  router.post('/json', async (req, res, next) => {
    try {
      const validation = jsonImportSchema.safeParse(req.body);

      if (!validation.success) {
        return res.status(400).json({
          error: 'Invalid JSON import request',
          details: validation.error.errors,
        });
      }

      const { json_url, wallet_address, auto_process } = validation.data;

      console.log(`📄 JSON import started: ${json_url}`);

      const incidents = await importService.importFromJSON(json_url);

      // Add wallet address to all incidents
      const normalizedIncidents = incidents.map((inc) => ({
        ...inc,
        reporter_wallet: wallet_address,
      }));

      console.log(`✅ JSON import completed: ${normalizedIncidents.length} records`);

      // Auto-process if enabled
      let batchResult = null;
      if (auto_process && normalizedIncidents.length > 0) {
        batchResult = await batchService.processBatch(normalizedIncidents);
      }

      res.json({
        total_records: normalizedIncidents.length,
        incidents: normalizedIncidents,
        batch: batchResult,
      });
    } catch (error) {
      next(error);
    }
  });

  /**
   * POST /api/import/api - Import from external API
   */
  router.post('/api', async (req, res, next) => {
    try {
      const validation = apiImportSchema.safeParse(req.body);

      if (!validation.success) {
        return res.status(400).json({
          error: 'Invalid API import request',
          details: validation.error.errors,
        });
      }

      const { api_endpoint, wallet_address, auto_process } = validation.data;

      console.log(`🌐 API import started: ${api_endpoint}`);

      const incidents = await importService.importFromAPI(api_endpoint);

      // Add wallet address to all incidents
      const normalizedIncidents = incidents.map((inc) => ({
        ...inc,
        reporter_wallet: wallet_address,
      }));

      console.log(`✅ API import completed: ${normalizedIncidents.length} records`);

      // Auto-process if enabled
      let batchResult = null;
      if (auto_process && normalizedIncidents.length > 0) {
        batchResult = await batchService.processBatch(normalizedIncidents);
      }

      res.json({
        total_records: normalizedIncidents.length,
        incidents: normalizedIncidents,
        batch: batchResult,
      });
    } catch (error) {
      next(error);
    }
  });

  /**
   * POST /api/import/sheets - Import from Google Sheets
   *
   * Requires GOOGLE_SHEETS_CREDENTIALS environment variable.
   */
  router.post('/sheets', async (req, res, next) => {
    try {
      const validation = sheetsImportSchema.safeParse(req.body);

      if (!validation.success) {
        return res.status(400).json({
          error: 'Invalid Sheets import request',
          details: validation.error.errors,
        });
      }

      const { spreadsheet_id, range, wallet_address, auto_process } = validation.data;

      console.log(`📊 Sheets import started: ${spreadsheet_id}`);

      const incidents = await importService.importFromSheets(spreadsheet_id, range);

      // Add wallet address to all incidents
      const normalizedIncidents = incidents.map((inc) => ({
        ...inc,
        reporter_wallet: wallet_address,
      }));

      console.log(`✅ Sheets import completed: ${normalizedIncidents.length} records`);

      // Auto-process if enabled
      let batchResult = null;
      if (auto_process && normalizedIncidents.length > 0) {
        batchResult = await batchService.processBatch(normalizedIncidents);
      }

      res.json({
        total_records: normalizedIncidents.length,
        incidents: normalizedIncidents,
        batch: batchResult,
      });
    } catch (error) {
      next(error);
    }
  });

  /**
   * GET /api/import - List all imports with status
   */
  router.get('/', async (req, res, next) => {
    try {
      const filters = {
        page: req.query.page ? parseInt(req.query.page as string) : 1,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 20,
      };

      // This would query the data_imports table
      // For now, return empty list (implementation can be added)
      res.json({
        imports: [],
        total: 0,
        page: filters.page,
        totalPages: 0,
      });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
