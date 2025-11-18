'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { ResultsPanel } from '@/components/ResultsPanel';

export default function IncidentDetailPage() {
  const params = useParams();
  const incidentId = params.id as string;

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
                  <p className="text-xs text-gray-500">Incident Details</p>
                </div>
              </Link>
            </div>

            <div className="flex items-center space-x-4">
              <Link
                href="/incidents"
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-primary-600 transition-colors"
              >
                ← Back to List
              </Link>
              <WalletMultiButton />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-6">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            Incident #{incidentId.slice(0, 8)}...
          </h2>
          <p className="text-gray-600">Complete incident details and analysis results</p>
        </div>

        <ResultsPanel incidentId={incidentId} />
      </main>
    </div>
  );
}
