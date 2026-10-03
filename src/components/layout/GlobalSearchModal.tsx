import { QueryState } from '../common/QueryState';
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  X,
  Users,
  AlertTriangle,
  BellRing,
  ArrowRight,
} from 'lucide-react';
import { useGlobalSearch } from '../../hooks';

export interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function GlobalSearchModal({ isOpen, onClose }: GlobalSearchModalProps) {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const {
    data: results = [],
    isLoading,
    error,
    refetch,
  } = useGlobalSearch(query, isOpen);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        // Toggle
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSelectResult = (url: string) => {
    navigate(url);
    onClose();
    setQuery('');
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'consumer':
        return <Users className="w-4 h-4 text-[#0F52BA]" />;
      case 'anomaly':
        return <AlertTriangle className="w-4 h-4 text-amber-600" />;
      case 'case':
      case 'alert':
        return <BellRing className="w-4 h-4 text-purple-600" />;
      default:
        return <Search className="w-4 h-4 text-slate-400" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 p-4 bg-slate-900/50">
      <div className="w-full max-w-xl bg-white rounded-md border border-slate-200 shadow-xl overflow-hidden flex flex-col">
        {/* Search Input Bar */}
        <div className="p-3.5 border-b border-slate-200 flex items-center gap-3 bg-slate-50/70">
          <Search className="w-4 h-4 text-slate-400 shrink-0" />
          <input
            autoFocus
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search Consumer ID..."
            className="w-full bg-transparent text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none font-sans"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="p-1 rounded text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <span className="text-[10px] font-mono bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded shrink-0">
            ESC
          </span>
        </div>

        {/* Results List */}
        <div className="max-h-96 overflow-y-auto divide-y divide-slate-100 p-2">
          {query.trim().length < 2 ? (
            <div className="py-8 text-center text-xs text-slate-500">
              Type at least 2 characters to search stored consumer IDs.
            </div>
          ) : error ? (
            <QueryState error={error} onRetry={() => refetch()} />
          ) : isLoading ? (
            <div className="py-8 text-center text-xs text-slate-500 font-mono">
              Searching grid index...
            </div>
          ) : results.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-500">
              No results found matching "{query}".
            </div>
          ) : (
            results.map((res) => (
              <div
                key={`${res.category}-${res.id}`}
                onClick={() => handleSelectResult(res.url)}
                className="p-2.5 rounded hover:bg-slate-50 cursor-pointer flex items-center justify-between gap-3 group transition-colors"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="p-1.5 rounded bg-slate-100 shrink-0">
                    {getCategoryIcon(res.category)}
                  </span>
                  <div className="truncate">
                    <div className="text-xs font-semibold text-slate-900 group-hover:text-[#0F52BA] truncate">
                      {res.title}
                    </div>
                    <div className="text-[11px] text-slate-500 truncate">
                      {res.subtitle}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-[#0F52BA] group-hover:translate-x-0.5 transition-transform" />
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
