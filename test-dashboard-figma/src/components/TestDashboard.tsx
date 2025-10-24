import { useState } from 'react';
import { Search } from 'lucide-react';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { TestSection } from './TestSection';
import { generateMockTests } from './mockTestData';

export function TestDashboard() {
  const [searchQuery, setSearchQuery] = useState('');
  const testsByCategory = generateMockTests();

  const filteredTests = Object.entries(testsByCategory).reduce((acc, [category, tests]) => {
    const filtered = tests.filter(test =>
      test.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      test.id.toLowerCase().includes(searchQuery.toLowerCase())
    );
    if (filtered.length > 0) {
      acc[category] = filtered;
    }
    return acc;
  }, {} as typeof testsByCategory);

  const totalTests = Object.values(testsByCategory).reduce((sum, tests) => sum + tests.length, 0);
  const passedTests = Object.values(testsByCategory).flat().filter(t => t.status === 'passed').length;
  const failedTests = Object.values(testsByCategory).flat().filter(t => t.status === 'failed').length;
  const pendingTests = Object.values(testsByCategory).flat().filter(t => t.status === 'pending').length;

  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "San Francisco", "Segoe UI", Roboto, sans-serif' }}>
      {/* Top Bar */}
      <div className="border-b border-black/6 bg-white sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-8 py-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl tracking-tight text-black mb-1">Test Dashboard</h1>
              <p className="text-sm text-black/50">{totalTests} total tests</p>
            </div>
            <div className="flex gap-2">
              <Badge variant="secondary" className="bg-green-50 text-green-700 border-green-200 hover:bg-green-50">
                {passedTests} passed
              </Badge>
              <Badge variant="secondary" className="bg-red-50 text-red-700 border-red-200 hover:bg-red-50">
                {failedTests} failed
              </Badge>
              <Badge variant="secondary" className="bg-yellow-50 text-yellow-700 border-yellow-200 hover:bg-yellow-50">
                {pendingTests} pending
              </Badge>
            </div>
          </div>
          
          {/* Search Bar */}
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-black/40" />
            <Input
              type="text"
              placeholder="Search tests..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-black/3 border-black/10 rounded-lg h-9 text-sm focus-visible:ring-1 focus-visible:ring-black/20 transition-all duration-150"
            />
          </div>
        </div>
      </div>

      {/* Test Sections */}
      <div className="max-w-7xl mx-auto px-8 py-6">
        {Object.entries(filteredTests).map(([category, tests]) => (
          <TestSection key={category} category={category} tests={tests} />
        ))}
        
        {Object.keys(filteredTests).length === 0 && (
          <div className="text-center py-20 text-black/40">
            No tests found matching "{searchQuery}"
          </div>
        )}
      </div>
    </div>
  );
}
