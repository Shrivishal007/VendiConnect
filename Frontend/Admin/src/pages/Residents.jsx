import React, { useEffect, useState } from 'react';
import { Users, MapPin, Bell, Tags, ChevronLeft, ChevronRight, X, Shield } from 'lucide-react';
import { adminService } from '../services/adminService';
import { Header } from '../components/layout/Header';
import { LoadingState, EmptyState, ErrorState } from '../components/common/UIComponents';
export const Residents = () => {
    const [residents, setResidents] = useState([]);
    const [meta, setMeta] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
    const [page, setPage] = useState(1);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [error, setError] = useState(null);
    // Selected Resident Detail
    const [selectedResidentId, setSelectedResidentId] = useState(null);
    const [residentDetail, setResidentDetail] = useState(null);
    const [isLoadingDetail, setIsLoadingDetail] = useState(false);
    const fetchResidents = async (silent = false) => {
        if (!silent)
            setIsLoading(true);
        else
            setIsRefreshing(true);
        setError(null);
        try {
            const res = await adminService.getResidents({ page, limit: 10 });
            if (res.success) {
                setResidents(res.data);
                setMeta(res.meta);
            }
        }
        catch (err) {
            setError(err.message || 'Failed to load residents');
        }
        finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    };
    useEffect(() => {
        fetchResidents();
    }, [page]);
    const handleInspectResident = async (residentId) => {
        setSelectedResidentId(residentId);
        setIsLoadingDetail(true);
        try {
            const res = await adminService.getResidentDetail(residentId);
            if (res.success) {
                setResidentDetail(res.data);
            }
        }
        catch (err) {
            alert(err.message || 'Failed to load resident details');
            setSelectedResidentId(null);
        }
        finally {
            setIsLoadingDetail(false);
        }
    };
    return (<div className="min-h-full flex flex-col">
      <Header title="Resident Community" subtitle="Opted-in community members, notification thresholds, and subscribed categories" onRefresh={() => fetchResidents(true)} isRefreshing={isRefreshing}/>

      <div className="flex-1 p-6 space-y-4 max-w-7xl">
        {/* Privacy Note Banner */}
        <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-xl flex items-start gap-3 text-xs text-blue-900">
          <Shield className="w-4 h-4 text-blue-600 shrink-0 mt-0.5"/>
          <div>
            <span className="font-semibold">Privacy-Preserving Geofencing:</span> Resident coordinates are never broadcast to vendors or public clients. Proximity matching occurs server-side, dispatching alerts only when active vendors enter the resident's configured notification perimeter.
          </div>
        </div>

        {/* Residents Table */}
        {isLoading ? (<LoadingState message="Loading resident directory..."/>) : error ? (<ErrorState message={error} onRetry={() => fetchResidents()}/>) : residents.length === 0 ? (<EmptyState title="No residents registered" description="Residents will appear as they authenticate via the mobile app."/>) : (<div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                    <th className="py-3 px-4">Resident</th>
                    <th className="py-3 px-4">Address / Neighborhood</th>
                    <th className="py-3 px-4">Alert Perimeter</th>
                    <th className="py-3 px-4">Home Coordinates</th>
                    <th className="py-3 px-4">Registered Date</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {residents.map((r) => (<tr key={r._id} className="hover:bg-slate-50/80 transition-colors cursor-pointer" onClick={() => handleInspectResident(r._id)}>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900 text-sm">{r.Name}</div>
                        {r.Email && <div className="text-slate-400 text-[11px]">{r.Email}</div>}
                      </td>

                      <td className="py-3 px-4 text-slate-600 max-w-xs truncate">
                        {r.Address || 'Location set via map'}
                      </td>

                      <td className="py-3 px-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          {r.NotificationRadius || 300}m
                        </span>
                      </td>

                      <td className="py-3 px-4 font-mono text-[11px] text-slate-500">
                        {r.Latitude !== null && r.Longitude !== null ? (`${r.Latitude.toFixed(4)}, ${r.Longitude.toFixed(4)}`) : (<span className="text-slate-400 italic">Not set</span>)}
                      </td>

                      <td className="py-3 px-4 text-slate-500">
                        {r.createdAt ? new Date(r.createdAt).toLocaleDateString() : 'N/A'}
                      </td>

                      <td className="py-3 px-4 text-right">
                        <button onClick={(e) => {
                    e.stopPropagation();
                    handleInspectResident(r._id);
                }} className="text-xs font-semibold text-emerald-600 hover:text-emerald-800 px-2.5 py-1 rounded-md hover:bg-emerald-50 transition-colors">
                          View Details
                        </button>
                      </td>
                    </tr>))}
                </tbody>
              </table>
            </div>

            {/* Pagination Bar */}
            <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <div>
                Showing {(meta.page - 1) * meta.limit + 1} to{' '}
                {Math.min(meta.page * meta.limit, meta.total)} of {meta.total} residents
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

        {/* Resident Detail Modal */}
        {selectedResidentId && (<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
            <div className="bg-white w-full max-w-lg rounded-2xl shadow-xl border border-slate-200 overflow-hidden flex flex-col max-h-[85vh]">
              <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
                    <Users className="w-5 h-5"/>
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">
                      {residentDetail?.resident?.Name || 'Resident Profile'}
                    </h3>
                    <p className="text-xs text-slate-500">ID: {selectedResidentId}</p>
                  </div>
                </div>
                <button onClick={() => {
                setSelectedResidentId(null);
                setResidentDetail(null);
            }} className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition-colors">
                  <X className="w-5 h-5"/>
                </button>
              </div>

              <div className="p-6 overflow-y-auto space-y-5 text-xs">
                {isLoadingDetail ? (<LoadingState message="Loading resident profile & preferences..."/>) : residentDetail ? (<>
                    {/* Location Summary */}
                    <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
                      <div className="font-semibold text-slate-900 text-sm">
                        {residentDetail.resident.Address || 'No street address specified'}
                      </div>
                      <div className="text-slate-500 flex items-center gap-2">
                        <MapPin className="w-3.5 h-3.5 text-emerald-600"/>
                        <span>Perimeter Threshold: {residentDetail.resident.NotificationRadius || 300} meters</span>
                      </div>
                    </div>

                    {/* Subscribed Categories */}
                    <div>
                      <h4 className="font-bold text-slate-900 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                        <Tags className="w-3.5 h-3.5 text-emerald-600"/>
                        <span>Subscribed Vendor Categories</span>
                      </h4>
                      {residentDetail.preferences && residentDetail.preferences.length > 0 ? (<div className="flex flex-wrap gap-1.5">
                          {residentDetail.preferences.map((p) => (<span key={p._id} className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 font-medium">
                              {p.Name}
                            </span>))}
                        </div>) : (<p className="text-slate-400 italic">No category preferences selected yet</p>)}
                    </div>

                    {/* Recent Alerts */}
                    <div>
                      <h4 className="font-bold text-slate-900 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                        <Bell className="w-3.5 h-3.5 text-purple-600"/>
                        <span>Recent Proximity Notices</span>
                      </h4>
                      {residentDetail.recentAlerts && residentDetail.recentAlerts.length > 0 ? (<div className="border border-slate-200 rounded-xl divide-y divide-slate-100 overflow-hidden">
                          {residentDetail.recentAlerts.map((a) => (<div key={a.Alert_ID} className="p-3 flex items-center justify-between bg-white">
                              <div>
                                <span className="font-semibold text-slate-900">{a.VendorName}</span>
                                <div className="text-[11px] text-slate-400">
                                  ETA: ~{a.EtaMinutes} min • {(a.DistanceAt * 1000).toFixed(0)}m away
                                </div>
                              </div>
                              <span className="text-[11px] text-slate-400">
                                {new Date(a.Timestamp).toLocaleDateString()}
                              </span>
                            </div>))}
                        </div>) : (<p className="text-slate-400 italic">No alerts dispatched to this resident yet</p>)}
                    </div>
                  </>) : null}
              </div>

              <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex justify-end">
                <button onClick={() => {
                setSelectedResidentId(null);
                setResidentDetail(null);
            }} className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-semibold rounded-lg transition-colors">
                  Close
                </button>
              </div>
            </div>
          </div>)}
      </div>
    </div>);
};
