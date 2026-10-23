import React, { useEffect, useState } from 'react';
import { X, Store, MapPin, Star, Activity, History, } from 'lucide-react';
import { adminService } from '../../services/adminService';
import { StatusBadge, LoadingState, ErrorState } from '../common/UIComponents';
export const VendorDetailModal = ({ vendorId, onClose, onStatusChanged, }) => {
    const [detail, setDetail] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
    useEffect(() => {
        if (!vendorId)
            return;
        let mounted = true;
        setIsLoading(true);
        setError(null);
        adminService
            .getVendorDetail(vendorId)
            .then((res) => {
            if (mounted && res.success) {
                setDetail(res.data);
            }
        })
            .catch((err) => {
            if (mounted)
                setError(err.message || 'Failed to load vendor details');
        })
            .finally(() => {
            if (mounted)
                setIsLoading(false);
        });
        return () => {
            mounted = false;
        };
    }, [vendorId]);
    if (!vendorId)
        return null;
    const handleStatusChange = async (newStatus) => {
        if (!detail)
            return;
        setIsUpdatingStatus(true);
        try {
            await adminService.updateVendorStatus(vendorId, newStatus);
            setDetail({
                ...detail,
                vendor: {
                    ...detail.vendor,
                    Status: newStatus,
                },
            });
            if (onStatusChanged)
                onStatusChanged();
        }
        catch (err) {
            alert(err.message || 'Failed to update vendor status');
        }
        finally {
            setIsUpdatingStatus(false);
        }
    };
    return (<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <Store className="w-5 h-5"/>
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                {detail?.vendor?.Name || 'Vendor Details'}
              </h3>
              <p className="text-xs text-slate-500">ID: {vendorId}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition-colors">
            <X className="w-5 h-5"/>
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {isLoading && <LoadingState message="Fetching live vendor records..."/>}
          {error && <ErrorState message={error} onRetry={() => { }}/>}

          {detail && (<>
              {/* Summary Row */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <span className="text-[11px] font-medium text-slate-500">Category</span>
                  <p className="text-sm font-semibold text-slate-900 mt-0.5">
                    {detail.vendor.Category_ID?.Name || 'General'}
                  </p>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <span className="text-[11px] font-medium text-slate-500">Vehicle</span>
                  <p className="text-sm font-semibold text-slate-900 mt-0.5">{detail.vendor.Vehicle}</p>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <span className="text-[11px] font-medium text-slate-500">Avg Rating</span>
                  <div className="flex items-center gap-1 mt-0.5">
                    <Star className="w-4 h-4 text-amber-500 fill-amber-500"/>
                    <span className="text-sm font-bold text-slate-900">
                      {detail.vendor.AvgRating ? detail.vendor.AvgRating.toFixed(1) : 'New'}
                    </span>
                    <span className="text-xs text-slate-400">({detail.vendor.RatingCount || 0})</span>
                  </div>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <span className="text-[11px] font-medium text-slate-500">Status</span>
                  <div className="mt-1">
                    <StatusBadge status={detail.vendor.Status}/>
                  </div>
                </div>
              </div>

              {/* Status Action Controls */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h4 className="text-xs font-semibold text-slate-900">Change Vendor Status</h4>
                  <p className="text-xs text-slate-500">Update vendor operational authorization</p>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => handleStatusChange('ACTIVE')} disabled={isUpdatingStatus || detail.vendor.Status === 'ACTIVE'} className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${detail.vendor.Status === 'ACTIVE'
                ? 'bg-emerald-600 text-white cursor-default'
                : 'bg-white border border-slate-200 text-slate-700 hover:bg-emerald-50 hover:text-emerald-700'}`}>
                    Set Active
                  </button>
                  <button onClick={() => handleStatusChange('INACTIVE')} disabled={isUpdatingStatus || detail.vendor.Status === 'INACTIVE'} className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${detail.vendor.Status === 'INACTIVE'
                ? 'bg-amber-600 text-white cursor-default'
                : 'bg-white border border-slate-200 text-slate-700 hover:bg-amber-50 hover:text-amber-700'}`}>
                    Set Inactive
                  </button>
                  <button onClick={() => handleStatusChange('SUSPENDED')} disabled={isUpdatingStatus || detail.vendor.Status === 'SUSPENDED'} className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${detail.vendor.Status === 'SUSPENDED'
                ? 'bg-rose-600 text-white cursor-default'
                : 'bg-white border border-slate-200 text-slate-700 hover:bg-rose-50 hover:text-rose-700'}`}>
                    Suspend
                  </button>
                </div>
              </div>

              {/* Session & Location Metadata */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl border border-slate-200">
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-900 mb-2">
                    <MapPin className="w-4 h-4 text-emerald-600"/>
                    <span>Location Telemetry</span>
                  </div>
                  {detail.location ? (<div className="space-y-1.5 text-xs text-slate-600">
                      <div>
                        <span className="text-slate-400">Coordinates: </span>
                        <span className="font-mono font-medium text-slate-900">
                          {detail.location.geo.coordinates[1].toFixed(5)},{' '}
                          {detail.location.geo.coordinates[0].toFixed(5)}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400">Last Ping: </span>
                        <span>{new Date(detail.location.UpdatedAt).toLocaleString()}</span>
                      </div>
                      <div>
                        <span className="text-slate-400">Expires At: </span>
                        <span>{new Date(detail.location.ExpiresAt).toLocaleString()}</span>
                      </div>
                    </div>) : (<p className="text-xs text-slate-400 italic">No recent GPS ping recorded</p>)}
                </div>

                <div className="p-4 rounded-xl border border-slate-200">
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-900 mb-2">
                    <Activity className="w-4 h-4 text-blue-600"/>
                    <span>Session & Consent</span>
                  </div>
                  {detail.session ? (<div className="space-y-1.5 text-xs text-slate-600">
                      <div>
                        <span className="text-slate-400">Language: </span>
                        <span className="font-semibold text-slate-900">
                          {detail.vendor.Language === 'ta' ? 'தமிழ் (Tamil)' : 'English'}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400">Channel: </span>
                        <span className="font-mono text-slate-800">
                          {detail.vendor.RegisteredVia || 'WHATSAPP'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Consent:</span>
                        <StatusBadge status={detail.session?.Status || (detail.vendor.LocationConsent ? 'ACTIVE' : 'REVOKED')}/>
                      </div>
                      <div>
                        <span className="text-slate-400">Active Consent: </span>
                        <span className="font-semibold text-slate-900">
                          {detail.session?.Consent || detail.vendor.LocationConsent ? 'Yes (Opted In)' : 'No (Withdrawn / Declined)'}
                        </span>
                      </div>
                      {detail.session?.LastActive && (<div>
                          <span className="text-slate-400">Last Active: </span>
                          <span>{new Date(detail.session.LastActive).toLocaleString()}</span>
                        </div>)}
                    </div>) : (<p className="text-xs text-slate-400 italic">No active session record</p>)}
                </div>
              </div>

              {/* Recent Activity Log */}
              <div>
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <History className="w-3.5 h-3.5 text-slate-500"/>
                  <span>Recent Activity Events</span>
                </h4>
                {detail.recentActivity && detail.recentActivity.length > 0 ? (<div className="border border-slate-200 rounded-xl divide-y divide-slate-100 overflow-hidden text-xs">
                    {detail.recentActivity.map((act) => (<div key={act._id} className="p-2.5 flex items-center justify-between bg-white">
                        <div>
                          <span className="font-medium text-slate-800">{act.Event}</span>
                          {act.Description && (<span className="text-slate-400 ml-2">{act.Description}</span>)}
                        </div>
                        <span className="text-[11px] text-slate-400">
                          {new Date(act.EventTime).toLocaleTimeString()}
                        </span>
                      </div>))}
                  </div>) : (<p className="text-xs text-slate-400 italic">No activity recorded</p>)}
              </div>

              {/* Recent Ratings & Feedback */}
              <div>
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Star className="w-3.5 h-3.5 text-amber-500"/>
                  <span>Resident Reviews</span>
                </h4>
                {detail.recentRatings && detail.recentRatings.length > 0 ? (<div className="border border-slate-200 rounded-xl divide-y divide-slate-100 overflow-hidden text-xs">
                    {detail.recentRatings.map((r) => (<div key={r._id} className="p-3 bg-white">
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-1 text-amber-500 font-bold">
                            {'★'.repeat(r.Rating)}
                            <span className="text-slate-400 font-normal">({r.Rating}/5)</span>
                          </div>
                          <span className="text-[11px] text-slate-400">
                            {new Date(r.RatingDate).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-slate-600 italic">"{r.Review || 'No text review'}"</p>
                      </div>))}
                  </div>) : (<p className="text-xs text-slate-400 italic">No resident ratings submitted yet</p>)}
              </div>
            </>)}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex justify-end">
          <button onClick={onClose} className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-semibold rounded-lg transition-colors">
            Close
          </button>
        </div>
      </div>
    </div>);
};
