'use client';

import { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { IncidentForm } from '@/components/IncidentForm';
import { ResultsPanel } from '@/components/ResultsPanel';
import { CreditDisplay } from '@/components/CreditDisplay';
import Link from 'next/link';

export default function Home() {
  const { connected, publicKey } = useWallet();
  const [submittedIncidentId, setSubmittedIncidentId] = useState<string | null>(null);

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-secondary-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-secondary-500 rounded-lg flex items-center justify-center">
                  <span className="text-white text-xl font-bold">🛡️</span>
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">APSIC</h1>
                  <p className="text-xs text-gray-500">AI Public Safety Intake Commander</p>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              {connected && publicKey && <CreditDisplay wallet={publicKey.toBase58()} />}
              <Link
                href="/incidents"
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-primary-600 transition-colors"
              >
                View All Incidents
              </Link>
              <WalletMultiButton />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {!connected ? (
          <div className="text-center py-20">
            <div className="inline-block p-8 bg-white rounded-2xl shadow-lg border border-gray-100">
              <div className="w-20 h-20 bg-gradient-to-br from-primary-500 to-secondary-500 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-4xl">🔐</span>
              </div>
              <h2 className="text-3xl font-bold text-gray-900 mb-4">Welcome to APSIC</h2>
              <p className="text-gray-600 mb-8 max-w-md mx-auto">
                Connect your Solana wallet to submit and process public safety incidents with AI-powered triage and analysis.
              </p>
              <WalletMultiButton />
              <div className="mt-8 grid grid-cols-3 gap-6 pt-8 border-t border-gray-200">
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary-600">🤖</div>
                  <p className="text-sm text-gray-600 mt-2">Gemini AI Analysis</p>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary-600">🔄</div>
                  <p className="text-sm text-gray-600 mt-2">Opus Workflows</p>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary-600">🔍</div>
                  <p className="text-sm text-gray-600 mt-2">Vector Search</p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left Column: Incident Form */}
            <div className="space-y-6">
              <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8">
                <div className="mb-6">
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">Submit Incident</h2>
                  <p className="text-gray-600">
                    Describe the incident and upload any relevant media. Our AI will analyze and triage automatically.
                  </p>
                </div>
                <IncidentForm
                  walletAddress={publicKey?.toBase58() || ''}
                  onSuccess={(incidentId) => setSubmittedIncidentId(incidentId)}
                />
              </div>
            </div>

            {/* Right Column: Results */}
            <div className="space-y-6">
              {submittedIncidentId ? (
                <ResultsPanel incidentId={submittedIncidentId} />
              ) : (
                <div className="bg-gradient-to-br from-primary-50 to-secondary-50 rounded-2xl border-2 border-dashed border-primary-200 p-12 text-center">
                  <div className="text-6xl mb-4">📊</div>
                  <h3 className="text-xl font-semibold text-gray-700 mb-2">Awaiting Submission</h3>
                  <p className="text-gray-500">
                    Submit an incident to see AI-powered analysis, severity classification, and similar cases.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-20 border-t border-gray-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <h3 className="font-semibold text-gray-900 mb-3">Powered By</h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>🤖 Gemini - Multimodal AI</li>
                <li>🔄 Opus - Workflow Orchestration</li>
                <li>🔍 Qdrant - Vector Search</li>
                <li>💎 Solana - Blockchain Credits</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-3">Features</h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>✅ Multimodal Input (Text, Image, Audio, Video)</li>
                <li>✅ AI-Powered Triage & Classification</li>
                <li>✅ Vector Similarity Search</li>
                <li>✅ Complete Audit Trail</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-3">About</h3>
              <p className="text-sm text-gray-600">
                APSIC is an AI-powered public safety incident processing system built for the AI Genesis Hackathon.
              </p>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t border-gray-200 text-center text-sm text-gray-500">
            © 2025 APSIC. Built for AI Genesis Hackathon. Open Source (MIT License).
          </div>
        </div>
      </footer>
    </div>
  );
}
