import React, { useEffect, useState } from 'react';
import { Search, Star, ChevronLeft, ChevronRight, ExternalLink, } from 'lucide-react';
import { adminService } from '../services/adminService';
import { Header } from '../components/layout/Header';
import { StatusBadge, LoadingState, EmptyState, ErrorState } from '../components/common/UIComponents';
import { VendorDetailModal } from '../components/vendors/VendorDetailModal';
export const Vendors = () => {
    const [vendors, setVendors] = useState([]);
    const [categories, setCategories] = useState([]);
    const [meta, setMeta] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
    // Filters
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('');
    const [page, setPage] = useState(1);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [error, setError] = useState(null);
    const [selectedVendorId, setSelectedVendorId] = useState(null);
    const fetchVendors = async (silent = false) => {
        if (!silent)
            setIsLoading(true);
        else
            setIsRefreshing(true);
        setError(null);
        try {
            const [vRes, cRes] = await Promise.all([
                adminService.getVendors({
                    page,
                    limit: 10,
                    status: statusFilter || undefined,
                    category: categoryFilter || undefined,
                    q: search.trim() || undefined,
                }),
                adminService.getCategories(),
            ]);
            if (vRes.success) {
                setVendors(vRes.data);
                setMeta(vRes.meta);
            }
            if (cRes.success)
                setCategories(cRes.data);
        }
        catch (err) {
            setError(err.message || 'Failed to load vendors');
        }
        finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    };
    useEffect(() => {
        fetchVendors();
    }, [page, statusFilter, categoryFilter]);
    const handleSearchSubmit = (e) => {
        e.preventDefault();
        setPage(1);
        fetchVendors();
    };
    const handleQuickStatusChange = async (vendorId, newStatus) => {
        try {
            await adminService.updateVendorStatus(vendorId, newStatus);
            setVendors((prev) => prev.map((v) => (v.Vendor_ID === vendorId ? { ...v, Status: newStatus } : v)));
        }
        catch (err) {
            alert(err.message || 'Failed to update status');
        }
    };
    return (<div className="min-h-full flex flex-col">
      <Header title="Vendor Directory" subtitle="Manage street vendor authorization, vehicle types, categories, and operational status" onRefresh={() => fetchVendors(true)} isRefreshing={isRefreshing}/>

      <div className="flex-1 p-6 space-y-4 max-w-7xl">
        {/* Filter Bar */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
          <form onSubmit={handleSearchSubmit} className="relative flex-1 min-w-[240px] max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2"/>
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search vendor by name..." className="w-full pl-9 pr-3 py-2 text-xs text-slate-900 border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"/>
          </form>

          <div className="flex flex-wrap items-center gap-2">
            {/* Status Filter */}
            <select value={statusFilter} onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
        }} className="text-xs border border-slate-200 rounded-lg px-2.5 py-2 bg-white text-slate-700 focus:outline-none focus:border-emerald-600">
              <option value="">All Statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
              <option value="SUSPENDED">Suspended</option>
            </select>

            {/* Category Filter */}
            <select value={categoryFilter} onChange={(e) => {
            setCategoryFilter(e.target.value);
            setPage(1);
        }} className="text-xs border border-slate-200 rounded-lg px-2.5 py-2 bg-white text-slate-700 focus:outline-none focus:border-emerald-600">
              <option value="">All Categories</option>
              {categories.map((c) => (<option key={c._id} value={c._id}>
                  {c.Name}
                </option>))}
            </select>
          </div>
        </div>

        {/* Vendors Table */}
        {isLoading ? (<LoadingState message="Loading registered vendors..."/>) : error ? (<ErrorState message={error} onRetry={() => fetchVendors()}/>) : vendors.length === 0 ? (<EmptyState title="No vendors found" description="Try modifying search keywords or clearing status filters." actionText="Reset Filters" onAction={() => {
                setSearch('');
                setStatusFilter('');
                setCategoryFilter('');
                setPage(1);
            }}/>) : (<div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                    <th className="py-3 px-4">Vendor Details</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Vehicle</th>
                    <th className="py-3 px-4">Rating</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Consent</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {vendors.map((vendor) => (<tr key={vendor.Vendor_ID} className="hover:bg-slate-50/80 transition-colors cursor-pointer" onClick={() => setSelectedVendorId(vendor.Vendor_ID)}>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900 text-sm flex items-center gap-1.5">
                          <span>{vendor.VendorName}</span>
                          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                            {vendor.Language === 'ta' ? 'தமிழ்' : 'English'}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono">
                          ID: {vendor.Vendor_ID.slice(-8)}
                        </div>
                      </td>

                      <td className="py-3 px-4 text-slate-700 font-medium">
                        {vendor.Category?.Name || 'General'}
                      </td>

                      <td className="py-3 px-4 text-slate-600">{vendor.Vehicle}</td>

                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1 font-semibold text-slate-800">
                          <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500"/>
                          <span>{vendor.AvgRating ? vendor.AvgRating.toFixed(1) : 'New'}</span>
                          <span className="text-slate-400 font-normal">
                            ({vendor.RatingCount || 0})
                          </span>
                        </div>
                      </td>

                      <td className="py-3 px-4" onClick={(e) => e.stopPropagation()}>
                        <select value={vendor.Status} onChange={(e) => handleQuickStatusChange(vendor.Vendor_ID, e.target.value)} className="text-[11px] font-semibold rounded-md border border-slate-200 px-2 py-1 bg-white focus:outline-none focus:border-emerald-600">
                          <option value="ACTIVE">ACTIVE</option>
                          <option value="INACTIVE">INACTIVE</option>
                          <option value="SUSPENDED">SUSPENDED</option>
                        </select>
                      </td>

                      <td className="py-3 px-4">
                        <StatusBadge status={vendor.ConsentStatus}/>
                      </td>

                      <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <button onClick={() => setSelectedVendorId(vendor.Vendor_ID)} className="text-xs font-semibold text-emerald-600 hover:text-emerald-800 px-2.5 py-1 rounded-md hover:bg-emerald-50 transition-colors inline-flex items-center gap-1">
                          <span>Inspect</span>
                          <ExternalLink className="w-3 h-3"/>
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
                {Math.min(meta.page * meta.limit, meta.total)} of {meta.total} vendors
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

        {/* Vendor Detail Modal */}
        {selectedVendorId && (<VendorDetailModal vendorId={selectedVendorId} onClose={() => setSelectedVendorId(null)} onStatusChanged={() => fetchVendors(true)}/>)}
      </div>
    </div>);
};
