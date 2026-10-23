import React, { useEffect, useState } from 'react';
import { Bell, ChevronLeft, ChevronRight } from 'lucide-react';
import { adminService } from '../services/adminService';
import { Header } from '../components/layout/Header';
import { LoadingState, EmptyState, ErrorState } from '../components/common/UIComponents';
export const Alerts = () => {
    const [alerts, setAlerts] = useState([]);
    const [meta, setMeta] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
    const [page, setPage] = useState(1);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [error, setError] = useState(null);
    const fetchAlerts = async (silent = false) => {
        if (!silent)
            setIsLoading(true);
        else
            setIsRefreshing(true);
        setError(null);
        try {
            const res = await adminService.getAlerts({ page, limit: 10 });
            if (res.success) {
                setAlerts(res.data);
                setMeta(res.meta);
            }
        }
        catch (err) {
            setError(err.message || 'Failed to load alert audit log');
        }
        finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    };
    useEffect(() => {
        fetchAlerts();
    }, [page]);
    return (<div className="min-h-full flex flex-col">
      <Header title="Proximity Alerts Audit" subtitle="Historical audit log of proximity triggers dispatched when vendors approached resident perimeters" onRefresh={() => fetchAlerts(true)} isRefreshing={isRefreshing}/>

      <div className="flex-1 p-6 space-y-4 max-w-7xl">
        {/* Info notice */}
        <div className="p-3.5 bg-purple-50/70 border border-purple-200 rounded-xl flex items-start gap-3 text-xs text-purple-900">
          <Bell className="w-4 h-4 text-purple-600 shrink-0 mt-0.5"/>
          <div>
            <span className="font-semibold">Throttled Push Delivery:</span> Notifications are throttled to a minimum interval (45m by default) to prevent alert fatigue. Alerts recorded here reflect qualified geofence intersections.
          </div>
        </div>

        {/* Alerts Table */}
        {isLoading ? (<LoadingState message="Loading alert audit records..."/>) : error ? (<ErrorState message={error} onRetry={() => fetchAlerts()}/>) : alerts.length === 0 ? (<EmptyState title="No alerts dispatched yet" description="Alert records will appear as vendors report movement near residents."/>) : (<div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                    <th className="py-3 px-4">Approaching Vendor</th>
                    <th className="py-3 px-4">Notified Resident</th>
                    <th className="py-3 px-4">Estimated ETA</th>
                    <th className="py-3 px-4">Geofence Distance</th>
                    <th className="py-3 px-4">Dispatch Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {alerts.map((alert) => (<tr key={alert.Alert_ID} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900 text-sm">
                          {alert.VendorName}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          ID: {alert.Alert_ID.slice(-8)}
                        </div>
                      </td>

                      <td className="py-3 px-4 font-medium text-slate-700">
                        {alert.ResidentName}
                      </td>

                      <td className="py-3 px-4">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          ~{alert.EtaMinutes} min
                        </span>
                      </td>

                      <td className="py-3 px-4 font-medium text-slate-600">
                        {(alert.DistanceAt * 1000).toFixed(0)} meters
                      </td>

                      <td className="py-3 px-4 text-slate-500">
                        {new Date(alert.Timestamp).toLocaleString()}
                      </td>
                    </tr>))}
                </tbody>
              </table>
            </div>

            {/* Pagination Bar */}
            <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <div>
                Showing {(meta.page - 1) * meta.limit + 1} to{' '}
                {Math.min(meta.page * meta.limit, meta.total)} of {meta.total} alerts
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40">
                  <ChevronLeft className="w-4 h-4"/>
                </button>
                <span className="px-2 font-medium text-slate-700">
                  Page {meta.page} of {meta.totalPages || 1}
                </span>
                <button onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))} disabled={page >= meta.totalPages} className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40">
                  <ChevronRight className="w-4 h-4"/>
                </button>
              </div>
            </div>
          </div>)}
      </div>
    </div>);
};
