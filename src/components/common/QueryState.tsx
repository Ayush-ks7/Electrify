import { Button } from '../ui/button';

export function QueryState({
  loading,
  error,
  empty,
  onRetry,
}: {
  loading?: boolean;
  error?: Error | null;
  empty?: string;
  onRetry?: () => void;
}) {
  if (!loading && !error && !empty) return null;
  return (
    <div
      role={error ? 'alert' : 'status'}
      className="p-4 text-xs text-slate-600 bg-white border border-slate-200 rounded-md"
    >
      {loading ? 'Loading backend data...' : error ? error.message : empty}
      {error && onRetry && (
        <Button className="ml-3" size="sm" variant="outline" onClick={onRetry}>
          Retry
        </Button>
      )}
    </div>
  );
}
