import { QdrantClient as QdrantSDK } from '@qdrant/js-client-rest';
import { QdrantPoint } from '../types';

export class QdrantClient {
  private client: QdrantSDK;
  private collectionName = 'incidents';

  constructor(url: string, apiKey?: string) {
    this.client = new QdrantSDK({
      url,
      apiKey,
    });
  }

  /**
   * Initialize collection if it doesn't exist
   */
  async initialize(): Promise<void> {
    try {
      // Check if collection exists
      const collections = await this.client.getCollections();
      const exists = collections.collections.some(
        (c) => c.name === this.collectionName
      );

      if (!exists) {
        console.log(`Creating Qdrant collection: ${this.collectionName}`);
        await this.client.createCollection(this.collectionName, {
          vectors: {
            size: 768, // Gemini embedding dimension
            distance: 'Cosine',
          },
          optimizers_config: {
            indexing_threshold: 1000,
          },
          hnsw_config: {
            m: 16,
            ef_construct: 100,
          },
        });
        console.log('Collection created successfully');
      } else {
        console.log(`Collection ${this.collectionName} already exists`);
      }
    } catch (error: any) {
      console.error('Qdrant initialization error:', error);
      throw error;
    }
  }

  /**
   * Upsert incident to vector database
   */
  async upsertIncident(
    id: string,
    embedding: number[],
    payload: {
      text: string;
      summary: string;
      severity_score: number;
      severity_label: string;
      incident_type: string;
      timestamp: string;
      route: string;
      tags: string[];
    }
  ): Promise<void> {
    try {
      await this.client.upsert(this.collectionName, {
        points: [
          {
            id,
            vector: embedding,
            payload,
          },
        ],
      });
      console.log(`Upserted incident ${id} to Qdrant`);
    } catch (error: any) {
      console.error('Qdrant upsert error:', error);
      throw error;
    }
  }

  /**
   * Search for similar incidents
   */
  async searchSimilar(
    embedding: number[],
    limit: number = 3,
    filter?: any
  ): Promise<any[]> {
    try {
      const results = await this.client.search(this.collectionName, {
        vector: embedding,
        limit,
        filter,
        with_payload: true,
        score_threshold: 0.7, // Only return if similarity > 70%
      });

      return results.map((result) => ({
        incident_id: result.id,
        similarity_score: result.score,
        ...result.payload,
      }));
    } catch (error: any) {
      console.error('Qdrant search error:', error);
      return [];
    }
  }

  /**
   * Delete incident from vector database
   */
  async deleteIncident(id: string): Promise<void> {
    try {
      await this.client.delete(this.collectionName, {
        points: [id],
      });
      console.log(`Deleted incident ${id} from Qdrant`);
    } catch (error: any) {
      console.error('Qdrant delete error:', error);
    }
  }

  /**
   * Get incident by ID
   */
  async getIncident(id: string): Promise<any | null> {
    try {
      const results = await this.client.retrieve(this.collectionName, {
        ids: [id],
        with_payload: true,
        with_vector: false,
      });

      return results.length > 0 ? results[0] : null;
    } catch (error: any) {
      console.error('Qdrant retrieve error:', error);
      return null;
    }
  }

  /**
   * Get collection info
   */
  async getCollectionInfo(): Promise<any> {
    try {
      return await this.client.getCollection(this.collectionName);
    } catch (error: any) {
      console.error('Qdrant collection info error:', error);
      return null;
    }
  }

  /**
   * Count total incidents
   */
  async countIncidents(): Promise<number> {
    try {
      const info = await this.getCollectionInfo();
      return info?.points_count || 0;
    } catch (error) {
      return 0;
    }
  }
}
