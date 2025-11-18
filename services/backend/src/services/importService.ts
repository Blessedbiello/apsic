import { PrismaClient } from '@prisma/client';
import axios from 'axios';
import { parse } from 'csv-parse/sync';
import { IncidentSubmission } from '../types';

const prisma = new PrismaClient();

export class ImportService {
  /**
   * Import from multiple sources simultaneously (parallel)
   */
  async importMultiSource(sources: {
    csv_url?: string;
    json_url?: string;
    api_endpoints?: string[];
    wallet_address: string;
  }): Promise<{
    import_id: string;
    total_records: number;
    sources_processed: number;
    incidents: IncidentSubmission[];
  }> {
    const importId = `import_${Date.now()}`;
    const startTime = Date.now();

    console.log(`📥 Starting multi-source import ${importId}`);

    const importPromises: Promise<IncidentSubmission[]>[] = [];

    // CSV Import
    if (sources.csv_url) {
      importPromises.push(this.importFromCSV(sources.csv_url));
    }

    // JSON Import
    if (sources.json_url) {
      importPromises.push(this.importFromJSON(sources.json_url));
    }

    // Multiple API Endpoints (parallel)
    if (sources.api_endpoints && sources.api_endpoints.length > 0) {
      sources.api_endpoints.forEach((endpoint) => {
        importPromises.push(this.importFromAPI(endpoint));
      });
    }

    // Execute all imports in parallel
    const results = await Promise.allSettled(importPromises);

    const allIncidents: IncidentSubmission[] = [];
    let successCount = 0;

    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        allIncidents.push(...result.value);
        successCount++;
      } else {
        console.error(`Import source ${index} failed:`, result.reason);
      }
    });

    // Normalize all incidents (add wallet address)
    const normalizedIncidents = allIncidents.map((inc) => ({
      ...inc,
      reporter_wallet: sources.wallet_address,
    }));

    // Record import in database
    await prisma.$executeRaw`
      INSERT INTO data_imports (id, source_type, total_records, imported_count, status, created_at)
      VALUES (${importId}, 'multi_source', ${normalizedIncidents.length}, ${normalizedIncidents.length}, 'completed', NOW())
    `;

    console.log(`✅ Multi-source import complete: ${normalizedIncidents.length} records from ${successCount} sources`);

    return {
      import_id: importId,
      total_records: normalizedIncidents.length,
      sources_processed: successCount,
      incidents: normalizedIncidents,
    };
  }

  /**
   * Import from CSV file/URL
   */
  async importFromCSV(csvUrl: string): Promise<IncidentSubmission[]> {
    console.log(`📄 Importing from CSV: ${csvUrl}`);

    try {
      const response = await axios.get(csvUrl);
      const records = parse(response.data, {
        columns: true,
        skip_empty_lines: true,
      });

      return records.map((record: any) => this.normalizeCSVRecord(record));
    } catch (error: any) {
      console.error('CSV import error:', error.message);
      throw new Error(`Failed to import CSV: ${error.message}`);
    }
  }

  /**
   * Import from JSON file/URL
   */
  async importFromJSON(jsonUrl: string): Promise<IncidentSubmission[]> {
    console.log(`📄 Importing from JSON: ${jsonUrl}`);

    try {
      const response = await axios.get(jsonUrl);
      const data = response.data;

      // Handle both single object and array
      const records = Array.isArray(data) ? data : [data];

      return records.map((record: any) => this.normalizeJSONRecord(record));
    } catch (error: any) {
      console.error('JSON import error:', error.message);
      throw new Error(`Failed to import JSON: ${error.message}`);
    }
  }

  /**
   * Import from external API
   */
  async importFromAPI(apiEndpoint: string): Promise<IncidentSubmission[]> {
    console.log(`🌐 Importing from API: ${apiEndpoint}`);

    try {
      const response = await axios.get(apiEndpoint, {
        headers: {
          'User-Agent': 'APSIC-Import-Service/1.0',
        },
      });

      const data = response.data;

      // Handle pagination if API returns paginated data
      let records = Array.isArray(data) ? data : data.results || data.items || [data];

      return records.map((record: any) => this.normalizeAPIRecord(record));
    } catch (error: any) {
      console.error('API import error:', error.message);
      throw new Error(`Failed to import from API: ${error.message}`);
    }
  }

  /**
   * Normalize CSV record to IncidentSubmission
   */
  private normalizeCSVRecord(record: any): IncidentSubmission {
    return {
      text: record.description || record.text || record.incident_description || '',
      incident_type: this.normalizeIncidentType(record.type || record.incident_type),
      image_urls: record.image_url ? [record.image_url] : undefined,
      audio_urls: record.audio_url ? [record.audio_url] : undefined,
      video_urls: record.video_url ? [record.video_url] : undefined,
      reporter_wallet: '', // Will be set by caller
    };
  }

  /**
   * Normalize JSON record to IncidentSubmission
   */
  private normalizeJSONRecord(record: any): IncidentSubmission {
    return {
      text: record.text || record.description || record.content || '',
      incident_type: this.normalizeIncidentType(record.type || record.category),
      image_urls: record.images || record.image_urls,
      audio_urls: record.audio || record.audio_urls,
      video_urls: record.videos || record.video_urls,
      reporter_wallet: '', // Will be set by caller
    };
  }

  /**
   * Normalize API record to IncidentSubmission
   */
  private normalizeAPIRecord(record: any): IncidentSubmission {
    return {
      text: record.description || record.message || record.text || '',
      incident_type: this.normalizeIncidentType(record.type || record.category || record.incident_type),
      image_urls: record.attachments?.filter((a: any) => a.type === 'image').map((a: any) => a.url),
      audio_urls: record.attachments?.filter((a: any) => a.type === 'audio').map((a: any) => a.url),
      video_urls: record.attachments?.filter((a: any) => a.type === 'video').map((a: any) => a.url),
      reporter_wallet: '', // Will be set by caller
    };
  }

  /**
   * Normalize incident type to APSIC types
   */
  private normalizeIncidentType(type: string | undefined): any {
    if (!type) return 'auto';

    const typeMap: Record<string, string> = {
      bullying: 'harassment',
      harassment: 'harassment',
      injury: 'accident',
      accident: 'accident',
      fall: 'accident',
      cyber: 'cyber',
      hacking: 'cyber',
      phishing: 'cyber',
      infrastructure: 'infrastructure',
      facility: 'infrastructure',
      building: 'infrastructure',
      medical: 'medical',
      health: 'medical',
    };

    const normalized = type.toLowerCase().trim();
    return typeMap[normalized] || 'other';
  }

  /**
   * Import from Google Sheets (requires credentials)
   */
  async importFromSheets(spreadsheetId: string, range: string = 'A:Z'): Promise<IncidentSubmission[]> {
    // This would require google-auth-library and googleapis
    // For hackathon, returning mock implementation
    console.log(`📊 Sheet import would happen here: ${spreadsheetId}`);
    return [];
  }
}
