import React, { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, ShieldAlert } from 'lucide-react';
import { adminService } from '../services/adminService';
import { Header } from '../components/layout/Header';
import { LoadingState, EmptyState, ErrorState } from '../components/common/UIComponents';
export const Ratings = () => {
    const [ratings, setRatings] = useState([]);
    const [meta, setMeta] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
    const [page, setPage] = useState(1);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [error, setError] = useState(null);
    const fetchRatings = async (silent = false) => {
        if (!silent)
            setIsLoading(true);
        else
            setIsRefreshing(true);
        setError(null);
        try {
            const res = await adminService.getRatings({ page, limit: 10 });
            if (res.success) {
                setRatings(res.data);
                setMeta(res.meta);
            }
        }
        catch (err) {
            setError(err.message || 'Failed to load ratings');
        }
        finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    };
    useEffect(() => {
        fetchRatings();
    }, [page]);
    return (<div className="min-h-full flex flex-col">
      <Header title="Ratings & Community Feedback" subtitle="Audited resident feedback and star ratings submitted following vendor proximity alerts" onRefresh={() => fetchRatings(true)} isRefreshing={isRefreshing}/>

      <div className="flex-1 p-6 space-y-4 max-w-7xl">
        {/* Anti-fraud note */}
        <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-xl flex items-start gap-3 text-xs text-amber-900">
          <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5"/>
          <div>
            <span className="font-semibold">Anti-Abuse Proximity Verification:</span> By architectural policy, residents can only submit feedback for a vendor who has triggered a proximity alert within the previous 2 hours. This prevents fake reviews and protects local vendors.
          </div>
        </div>

        {/* Ratings Table */}
        {isLoading ? (<LoadingState message="Loading community ratings..."/>) : error ? (<ErrorState message={error} onRetry={() => fetchRatings()}/>) : ratings.length === 0 ? (<EmptyState title="No ratings submitted yet" description="Ratings will appear as residents review vendors after alerts."/>) : (<div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                    <th className="py-3 px-4">Vendor</th>
                    <th className="py-3 px-4">Score</th>
                    <th className="py-3 px-4">Resident Review</th>
                    <th className="py-3 px-4">Date Submitted</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {ratings.map((r) => (<tr key={r.Rating_ID} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900 text-sm">
                          {r.VendorName}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          ID: {r.Vendor_ID.slice(-8)}
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5">
                          <div className="flex text-amber-500 font-bold">
                            {'★'.repeat(r.Rating)}
                            <span className="text-slate-200">{'★'.repeat(5 - r.Rating)}</span>
                          </div>
                          <span className="font-bold text-slate-700">({r.Rating}/5)</span>
                        </div>
                      </td>

                      <td className="py-3 px-4 text-slate-700 max-w-md">
                        {r.Review ? (<div className="italic text-slate-700">"{r.Review}"</div>) : (<span className="text-slate-400 italic">No written comment provided</span>)}
                      </td>

                      <td className="py-3 px-4 text-slate-500">
                        {new Date(r.RatingDate).toLocaleString()}
                      </td>
                    </tr>))}
                </tbody>
              </table>
            </div>

            {/* Pagination Bar */}
            <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <div>
                Showing {(meta.page - 1) * meta.limit + 1} to{' '}
                {Math.min(meta.page * meta.limit, meta.total)} of {meta.total} reviews
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
