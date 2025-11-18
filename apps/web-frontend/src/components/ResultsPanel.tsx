'use client';

import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apsicAPI } from '@/lib/api';
import { Incident } from '@/types';

interface ResultsPanelProps {
  incidentId: string;
}

export function ResultsPanel({ incidentId }: ResultsPanelProps) {
  const { data: incident, isLoading, error, refetch } = useQuery({
    queryKey: ['incident', incidentId],
    queryFn: () => apsicAPI.getIncident(incidentId),
    refetchInterval: (data) => {
      // Poll every 3 seconds if still processing
      return data?.status === 'processing' ? 3000 : false;
    },
  });

  if (isLoading) {
    return <LoadingState />;
  }

  if (error) {
    return <ErrorState error={error as Error} />;
  }

  if (!incident) {
    return null;
  }

  if (incident.status === 'processing') {
    return <ProcessingState />;
  }

  if (incident.status === 'failed') {
    return <FailedState />;
  }

  return <CompletedState incident={incident} />;
}

function LoadingState() {
  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8">
      <div className="flex items-center justify-center space-x-3">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        <span className="text-gray-600">Loading...</span>
      </div>
    </div>
  );
}

function ProcessingState() {
  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-100 rounded-full mb-4">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600"></div>
        </div>
        <h3 className="text-xl font-semibold text-gray-900 mb-2">Processing Incident</h3>
        <p className="text-gray-600 mb-6">
          Our AI is analyzing your incident through the complete pipeline...
        </p>
        <div className="space-y-3">
          {['Intake', 'Understanding', 'Decision', 'Review', 'Audit'].map((stage, index) => (
            <div key={stage} className="flex items-center space-x-3">
              <div className="w-6 h-6 rounded-full bg-primary-100 flex items-center justify-center">
                <div className="w-3 h-3 rounded-full bg-primary-600 animate-pulse"></div>
              </div>
              <span className="text-sm text-gray-600">{stage} Stage</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function FailedState() {
  return (
    <div className="bg-red-50 rounded-2xl border-2 border-red-200 p-8">
      <div className="text-center">
        <div className="text-6xl mb-4">❌</div>
        <h3 className="text-xl font-semibold text-red-900 mb-2">Processing Failed</h3>
        <p className="text-red-700">
          There was an error processing your incident. Please try again.
        </p>
      </div>
    </div>
  );
}

function ErrorState({ error }: { error: Error }) {
  return (
    <div className="bg-red-50 rounded-2xl border-2 border-red-200 p-8">
      <div className="text-center">
        <div className="text-6xl mb-4">⚠️</div>
        <h3 className="text-xl font-semibold text-red-900 mb-2">Error Loading Results</h3>
        <p className="text-red-700">{error.message}</p>
      </div>
    </div>
  );
}

function CompletedState({ incident }: { incident: Incident }) {
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

  const downloadAuditLog = () => {
    if (!incident.audit_log) return;

    const dataStr = JSON.stringify(incident.audit_log.audit_json, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);

    const exportFileDefaultName = `audit-${incident.id}.json`;

    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  return (
    <div className="space-y-6">
      {/* Severity Card */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-2xl font-bold text-gray-900">Analysis Results</h3>
          <span
            className={`px-4 py-2 rounded-full text-sm font-semibold border-2 ${getSeverityColor(
              incident.severity_label
            )}`}
          >
            {incident.severity_label || 'Unknown'} Severity
          </span>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-500">Severity Score</label>
            <div className="flex items-center space-x-3 mt-1">
              <div className="flex-1 h-4 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all ${
                    (incident.severity_score || 0) > 75
                      ? 'bg-red-500'
                      : (incident.severity_score || 0) > 50
                      ? 'bg-orange-500'
                      : (incident.severity_score || 0) > 25
                      ? 'bg-yellow-500'
                      : 'bg-green-500'
                  }`}
                  style={{ width: `${incident.severity_score || 0}%` }}
                ></div>
              </div>
              <span className="text-lg font-bold text-gray-900">{incident.severity_score}/100</span>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-500">Route Decision</label>
            <p className="text-lg font-semibold text-gray-900 mt-1">{incident.route}</p>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-500">Urgency</label>
            <p className="text-lg text-gray-900 mt-1">{incident.urgency || 'Not specified'}</p>
          </div>
        </div>
      </div>

      {/* Summary Card */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8">
        <h4 className="text-lg font-semibold text-gray-900 mb-4">AI Summary</h4>
        <p className="text-gray-700 leading-relaxed mb-6">{incident.summary}</p>

        <h4 className="text-lg font-semibold text-gray-900 mb-3">Recommended Actions</h4>
        <ul className="space-y-2">
          {incident.recommended_actions.map((action, index) => (
            <li key={index} className="flex items-start space-x-3">
              <span className="flex-shrink-0 w-6 h-6 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center text-sm font-semibold">
                {index + 1}
              </span>
              <span className="text-gray-700">{action}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Similar Incidents */}
      {incident.similar_incidents && incident.similar_incidents.length > 0 && (
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8">
          <h4 className="text-lg font-semibold text-gray-900 mb-4">Similar Historical Incidents</h4>
          <div className="space-y-4">
            {incident.similar_incidents.map((similar, index) => (
              <div
                key={index}
                className="p-4 bg-gradient-to-r from-primary-50 to-secondary-50 rounded-lg border border-primary-100"
              >
                <div className="flex justify-between items-start mb-2">
                  <span className="text-sm font-medium text-gray-600">
                    Incident {similar.incident_id}
                  </span>
                  <span className="text-sm font-semibold text-primary-600">
                    {(similar.similarity_score * 100).toFixed(0)}% match
                  </span>
                </div>
                <p className="text-sm text-gray-700 mb-2">{similar.summary}</p>
                <div className="flex items-center space-x-3 text-xs text-gray-500">
                  <span
                    className={`px-2 py-1 rounded ${getSeverityColor(similar.severity_label)}`}
                  >
                    {similar.severity_label}
                  </span>
                  <span>{new Date(similar.timestamp).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Audit Log */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-lg font-semibold text-gray-900">Audit Trail</h4>
          <button
            onClick={downloadAuditLog}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg transition-colors"
          >
            📥 Download JSON
          </button>
        </div>
        <p className="text-sm text-gray-600">
          Complete processing audit log available for download. All decisions are traceable and verifiable.
        </p>
      </div>
    </div>
  );
}
