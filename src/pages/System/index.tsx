import { useHealth, useModelInfo, useRefreshLive } from '../../hooks/live';
import { PageHeader } from '../../components/common/PageHeader';
import { QueryState } from '../../components/common/QueryState';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { RotateCw } from 'lucide-react';
import { probabilityLabel } from '../../utils/liveData';

export function System() {
  const health = useHealth();
  const model = useModelInfo();
  const refresh = useRefreshLive();
  return (
    <div className="space-y-6">
      <PageHeader
        title="System & Model Diagnostics"
        description="Backend readiness and locked model metadata"
        breadcrumbs={[
          { label: 'Overview', href: '/dashboard' },
          { label: 'System' },
        ]}
        actions={
          <Button
            variant="outline"
            size="sm"
            icon={<RotateCw className="w-3.5 h-3.5" />}
            onClick={refresh}
            disabled={health.isFetching || model.isFetching}
          >
            Refresh Status
          </Button>
        }
      />
      <QueryState
        loading={health.isLoading}
        error={health.error}
        onRetry={() => health.refetch()}
      />
      <QueryState
        loading={model.isLoading}
        error={model.error}
        onRetry={() => model.refetch()}
      />
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          [
            'Backend',
            health.isError
              ? 'Unavailable'
              : (health.data?.status ?? 'Checking...'),
          ],
          [
            'Database',
            health.isError
              ? 'Unknown'
              : (health.data?.database ?? 'Checking...'),
          ],
          [
            'Model',
            health.isError ? 'Unknown' : (health.data?.model ?? 'Checking...'),
          ],
          ['Features', model.data?.feature_count ?? '—'],
          [
            'Default Threshold',
            probabilityLabel(model.data?.default_threshold),
          ],
        ].map(([label, value]) => (
          <div
            key={label}
            className="p-4 bg-white border border-slate-200 rounded text-xs shadow-xs"
          >
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
              {label}
            </span>
            <div className="text-lg font-bold font-mono text-slate-900 break-all">
              {value}
            </div>
          </div>
        ))}
      </div>
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Pipeline Module Status</CardTitle>
            <CardDescription>
              Readiness reported by the running backend
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="p-3">Module Name</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {[
                  [
                    'Database',
                    health.data?.database,
                    'Consumer, history and prediction persistence',
                  ],
                  [
                    'Locked AI/ML',
                    health.data?.model,
                    model.data?.model_family ?? 'Metadata unavailable',
                  ],
                ].map(([name, status, description]) => (
                  <tr key={name}>
                    <td className="p-3 font-medium">{name}</td>
                    <td className="p-3">
                      {health.isError ? 'Unknown' : (status ?? 'Checking...')}
                    </td>
                    <td className="p-3">{description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
      <div className="p-4 bg-white border border-slate-200 rounded-md text-xs space-y-3 text-slate-600">
        <h4 className="font-semibold text-slate-900">Model Metadata</h4>
        {model.data && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <p>
                Version:{' '}
                <span className="font-mono">{model.data.model_version}</span>
              </p>
              <p>Calibration: {model.data.probability_calibration}</p>
              <p>Scope: {model.data.scope}</p>
            </div>
            <p>{model.data.warning}</p>
            <details>
              <summary className="cursor-pointer font-semibold">
                Required features ({model.data.feature_count})
              </summary>
              <p className="font-mono mt-2 break-words">
                {model.data.required_features.join(', ')}
              </p>
            </details>
          </>
        )}
        <p>
          Performance metrics, runtime latency, throughput, and training dates
          are not supplied by this API.
        </p>
      </div>
    </div>
  );
}
