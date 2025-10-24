import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { TestRow } from './TestRow';
import type { Test } from './mockTestData';

interface TestSectionProps {
  category: string;
  tests: Test[];
}

export function TestSection({ category, tests }: TestSectionProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  const passedCount = tests.filter(t => t.status === 'passed').length;
  const failedCount = tests.filter(t => t.status === 'failed').length;
  const pendingCount = tests.filter(t => t.status === 'pending').length;

  return (
    <div className="mb-8">
      {/* Section Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-3 w-full mb-4 group"
      >
        <div className="transition-transform duration-150">
          {isExpanded ? (
            <ChevronDown className="w-4 h-4 text-black/40" />
          ) : (
            <ChevronRight className="w-4 h-4 text-black/40" />
          )}
        </div>
        <h2 
          className="uppercase text-black/50 tracking-wider"
          style={{ fontSize: '11px', letterSpacing: '0.5px' }}
        >
          {category}
        </h2>
        <div className="flex gap-1.5 ml-2">
          {passedCount > 0 && (
            <Badge variant="secondary" className="bg-green-50 text-green-700 border-0 h-5 px-2 text-xs hover:bg-green-50">
              {passedCount}
            </Badge>
          )}
          {failedCount > 0 && (
            <Badge variant="secondary" className="bg-red-50 text-red-700 border-0 h-5 px-2 text-xs hover:bg-red-50">
              {failedCount}
            </Badge>
          )}
          {pendingCount > 0 && (
            <Badge variant="secondary" className="bg-yellow-50 text-yellow-700 border-0 h-5 px-2 text-xs hover:bg-yellow-50">
              {pendingCount}
            </Badge>
          )}
        </div>
      </button>

      {/* Test Rows */}
      {isExpanded && (
        <div className="rounded-lg border border-black/6 overflow-hidden bg-white">
          {tests.map((test, index) => (
            <div key={test.id}>
              <TestRow test={test} />
              {index < tests.length - 1 && (
                <Separator className="bg-black/6" style={{ height: '1px' }} />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
