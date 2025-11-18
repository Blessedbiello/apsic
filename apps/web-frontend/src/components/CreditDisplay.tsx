'use client';

import { useQuery } from '@tanstack/react-query';
import { apsicAPI } from '@/lib/api';

interface CreditDisplayProps {
  wallet: string;
}

export function CreditDisplay({ wallet }: CreditDisplayProps) {
  const { data: creditInfo, isLoading } = useQuery({
    queryKey: ['credits', wallet],
    queryFn: () => apsicAPI.getCredits(wallet),
    enabled: !!wallet,
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  if (isLoading) {
    return (
      <div className="flex items-center space-x-2 px-4 py-2 bg-gray-100 rounded-lg">
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600"></div>
        <span className="text-sm text-gray-600">Loading...</span>
      </div>
    );
  }

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'enterprise':
        return 'bg-purple-100 text-purple-800 border-purple-300';
      case 'premium':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  return (
    <div className="flex items-center space-x-3">
      <div className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-primary-50 to-secondary-50 rounded-lg border border-primary-200">
        <span className="text-xl">💎</span>
        <div>
          <div className="text-xs text-gray-600 font-medium">Credits</div>
          <div className="text-lg font-bold text-gray-900">{creditInfo?.credits || 0}</div>
        </div>
      </div>
      <span
        className={`px-3 py-1 text-xs font-semibold rounded-full border ${getTierColor(
          creditInfo?.priority_tier || 'standard'
        )}`}
      >
        {creditInfo?.priority_tier?.toUpperCase() || 'STANDARD'}
      </span>
    </div>
  );
}
