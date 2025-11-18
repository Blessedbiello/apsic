'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { apsicAPI } from '@/lib/api';
import { Incident, SeverityLabel } from '@/types';
import Link from 'next/link';

export default function IncidentsPage() {
  const [page, setPage] = useState(1);
  const [severityFilter, setSeverityFilter] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');

  const { data, isLoading } = useQuery({
    queryKey: ['incidents', page, severityFilter, typeFilter, statusFilter],
    queryFn: () =>
      apsicAPI.listIncidents({
        page,
        limit: 20,
        severity: severityFilter || undefined,
        type: typeFilter || undefined,
        status: statusFilter || undefined,
      }),
  });

  const getSeverityColor = (label?: string) => {
    switch (label) {
      case 'Critical':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'High':
        return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'Medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'Low':
        return 'bg-green-100 text-green-800 border-green-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'processing':
        return 'bg-blue-100 text-blue-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-secondary-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <Link href="/" className="flex items-center space-x-3 hover:opacity-80 transition-opacity">
                <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-secondary-500 rounded-lg flex items-center justify-center">
                  <span className="text-white text-xl font-bold">🛡️</span>
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">APSIC</h1>
                  <p className="text-xs text-gray-500">All Incidents</p>
                </div>
              </Link>
            </div>

            <div className="flex items-center space-x-4">
              <Link
                href="/"
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-primary-600 transition-colors"
              >
                ← Back to Home
              </Link>
              <WalletMultiButton />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Filters */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Filters</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Severity</label>
              <select
                value={severityFilter}
                onChange={(e) => setSeverityFilter(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              >
                <option value="">All</option>
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
                <option value="Critical">Critical</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              >
                <option value="">All</option>
                <option value="harassment">Harassment</option>
                <option value="accident">Accident</option>
                <option value="cyber">Cyber</option>
                <option value="infrastructure">Infrastructure</option>
                <option value="medical">Medical</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              >
                <option value="">All</option>
                <option value="processing">Processing</option>
                <option value="completed">Completed</option>
                <option value="failed">Failed</option>
              </select>
            </div>
          </div>
        </div>

        {/* Incidents List */}
        {isLoading ? (
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading incidents...</p>
          </div>
        ) : data && data.incidents.length > 0 ? (
          <>
            <div className="space-y-4">
              {data.incidents.map((incident: Incident) => (
                <Link
                  key={incident.id}
                  href={`/incidents/${incident.id}`}
                  className="block bg-white rounded-2xl shadow-md border border-gray-100 p-6 hover:shadow-lg transition-shadow"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <span
                          className={`px-3 py-1 rounded-full text-sm font-semibold border ${getSeverityColor(
                            incident.severity_label
                          )}`}
                        >
                          {incident.severity_label || 'Unknown'}
                        </span>
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(
                            incident.status
                          )}`}
                        >
                          {incident.status}
                        </span>
                        {incident.incident_type && (
                          <span className="text-sm text-gray-500 capitalize">
                            {incident.incident_type}
                          </span>
                        )}
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        Incident #{incident.id.slice(0, 8)}...
                      </h3>
                      <p className="text-gray-600 line-clamp-2">
                        {incident.summary || incident.text}
                      </p>
                    </div>
                    <div className="text-right text-sm text-gray-500 ml-4">
                      <div>{new Date(incident.created_at).toLocaleDateString()}</div>
                      <div>{new Date(incident.created_at).toLocaleTimeString()}</div>
                    </div>
                  </div>
                  {incident.severity_score !== undefined && (
                    <div className="flex items-center space-x-3">
                      <span className="text-sm text-gray-500 min-w-[100px]">Severity Score:</span>
                      <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all ${
                            incident.severity_score > 75
                              ? 'bg-red-500'
                              : incident.severity_score > 50
                              ? 'bg-orange-500'
                              : incident.severity_score > 25
                              ? 'bg-yellow-500'
                              : 'bg-green-500'
                          }`}
                          style={{ width: `${incident.severity_score}%` }}
                        ></div>
                      </div>
                      <span className="text-sm font-semibold text-gray-900 min-w-[50px]">
                        {incident.severity_score}/100
                      </span>
                    </div>
                  )}
                </Link>
              ))}
            </div>

            {/* Pagination */}
            <div className="mt-8 flex justify-center space-x-4">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-4 py-2 bg-white border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                ← Previous
              </button>
              <span className="px-4 py-2 bg-white border border-gray-300 rounded-lg font-medium text-gray-700">
                Page {page} of {data.totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
                disabled={page === data.totalPages}
                className="px-4 py-2 bg-white border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Next →
              </button>
            </div>
          </>
        ) : (
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-12 text-center">
            <div className="text-6xl mb-4">📭</div>
            <h3 className="text-xl font-semibold text-gray-700 mb-2">No Incidents Found</h3>
            <p className="text-gray-500 mb-6">Try adjusting your filters or submit a new incident.</p>
            <Link
              href="/"
              className="inline-block px-6 py-3 bg-gradient-to-r from-primary-600 to-secondary-600 text-white font-semibold rounded-lg hover:from-primary-700 hover:to-secondary-700 transition-all"
            >
              Submit New Incident
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}
