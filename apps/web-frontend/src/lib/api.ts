import axios from 'axios';
import { IncidentSubmission, Incident, CreditInfo } from '../types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const apsicAPI = {
  // Incidents
  async createIncident(submission: IncidentSubmission): Promise<{ incident_id: string; status: string }> {
    const response = await api.post('/api/incidents', submission);
    return response.data;
  },

  async getIncident(id: string): Promise<Incident> {
    const response = await api.get(`/api/incidents/${id}`);
    return response.data;
  },

  async listIncidents(params?: {
    page?: number;
    limit?: number;
    severity?: string;
    type?: string;
    status?: string;
    sort?: string;
  }): Promise<{ incidents: Incident[]; total: number; page: number; limit: number; totalPages: number }> {
    const response = await api.get('/api/incidents', { params });
    return response.data;
  },

  // Credits
  async getCredits(wallet: string): Promise<CreditInfo> {
    const response = await api.get(`/api/credits/${wallet}`);
    return response.data;
  },

  async addCredits(wallet: string, amount: number): Promise<{ success: boolean; message: string }> {
    const response = await api.post('/api/credits/add', { wallet, amount });
    return response.data;
  },

  // Health
  async healthCheck(): Promise<any> {
    const response = await api.get('/api/webhooks/health');
    return response.data;
  },
};
