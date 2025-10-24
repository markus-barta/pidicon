import { RotateCcw, ExternalLink } from 'lucide-react';
import { Button } from './ui/button';
import type { Test } from './mockTestData';

interface TestRowProps {
  test: Test;
}

export function TestRow({ test }: TestRowProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'passed':
        return 'bg-green-500';
      case 'failed':
        return 'bg-red-500';
      case 'pending':
        return 'bg-yellow-500';
      default:
        return 'bg-gray-400';
    }
  };

  const getResultText = (status: string) => {
    switch (status) {
      case 'passed':
        return 'Passed';
      case 'failed':
        return 'Failed';
      case 'pending':
        return 'Pending';
      default:
        return 'Unknown';
    }
  };

  return (
    <div 
      className="flex items-center px-5 transition-colors duration-150 hover:bg-black/4 cursor-pointer"
      style={{ height: '48px' }}
    >
      {/* Status Indicator */}
      <div className="flex items-center justify-center w-12">
        <div 
          className={`rounded-full ${getStatusColor(test.status)}`}
          style={{ width: '8px', height: '8px' }}
        />
      </div>

      {/* ID */}
      <div 
        className="text-black/40 w-24"
        style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace', fontSize: '12px' }}
      >
        {test.id}
      </div>

      {/* Name */}
      <div className="flex-1 text-black text-sm px-4">
        {test.name}
      </div>

      {/* Last Run */}
      <div className="text-black/50 text-sm w-40 px-4">
        {test.lastRun}
      </div>

      {/* Result */}
      <div className="text-black/70 text-sm w-32 px-4">
        {getResultText(test.status)}
      </div>

      {/* Details Button */}
      <Button
        variant="ghost"
        size="sm"
        className="h-7 text-black/60 hover:text-black hover:bg-black/8 transition-all duration-150 rounded-md"
        onClick={() => console.log('View details:', test.id)}
      >
        Details
      </Button>

      {/* Re-run Button */}
      <Button
        variant="ghost"
        size="sm"
        className="ml-2 h-8 w-8 p-0 text-black/60 hover:text-black hover:bg-black/8 transition-all duration-150 rounded-full"
        onClick={() => console.log('Re-run test:', test.id)}
      >
        <RotateCcw className="w-4 h-4" />
      </Button>
    </div>
  );
}
