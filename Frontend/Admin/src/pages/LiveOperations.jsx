import React, { useEffect, useState } from 'react';
import { adminService } from '../services/adminService';
import { Header } from '../components/layout/Header';
import { OperationsMap } from '../components/map/OperationsMap';
import { VendorDetailModal } from '../components/vendors/VendorDetailModal';
import { LoadingState, ErrorState } from '../components/common/UIComponents';
export const LiveOperations = () => {
    const [vendors, setVendors] = useState([]);
    const [residents, setResidents] = useState([]);
    const [categories, setCategories] = useState([]);
    const [selectedCategory, setSelectedCategory] = useState('');
    const [selectedVendorId, setSelectedVendorId] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [error, setError] = useState(null);
    const [autoRefresh, setAutoRefresh] = useState(true);
    const fetchData = async (silent = false) => {
        if (!silent)
            setIsRefreshing(true);
        try {
            const [vRes, rRes, cRes] = await Promise.all([
                adminService.getVendors({ limit: 100 }),
                adminService.getResidents({ limit: 100 }),
                adminService.getCategories(),
            ]);
            if (vRes.success)
                setVendors(vRes.data);
            if (rRes.success)
                setResidents(rRes.data);
            if (cRes.success)
                setCategories(cRes.data);
            setError(null);
        }
        catch (err) {
            if (!silent)
                setError(err.message || 'Failed to fetch live operations telemetry');
        }
        finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    };
    useEffect(() => {
        fetchData();
    }, []);
    // 10s Polling interval if autoRefresh is enabled
    useEffect(() => {
        if (!autoRefresh)
            return;
        const interval = setInterval(() => {
            fetchData(true);
        }, 10000);
        return () => clearInterval(interval);
    }, [autoRefresh]);
    const activeCount = vendors.filter((v) => v.Status === 'ACTIVE').length;
    return (<div className="min-h-full flex flex-col">
      <Header title="Live Operations Map" subtitle="OpenStreetMap geospatial telemetry of authorized vendors and community coverage" onRefresh={() => fetchData(false)} isRefreshing={isRefreshing}/>

      <div className="flex-1 p-6 space-y-4 max-w-7xl">
        {/* Operations Sub-header Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"/>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"/>
              </span>
              <span className="text-xs font-bold text-slate-800">
                {activeCount} Active Vendors Broadcasting
              </span>
            </div>
            <span className="text-slate-300">|</span>
            <span className="text-xs text-slate-500">
              {residents.length} Resident Locations Protected
            </span>
          </div>

          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-xs font-medium text-slate-600 cursor-pointer">
              <input type="checkbox" checked={autoRefresh} onChange={(e) => setAutoRefresh(e.target.checked)} className="rounded text-emerald-600 focus:ring-emerald-500 w-3.5 h-3.5"/>
              <span>Live Auto-Poll (10s)</span>
            </label>
          </div>
        </div>

        {isLoading ? (<LoadingState message="Connecting to geospatial vendor stream..."/>) : error ? (<ErrorState message={error} onRetry={() => fetchData(false)}/>) : (<OperationsMap vendors={vendors} residents={residents} categories={categories} selectedCategory={selectedCategory} onSelectCategory={setSelectedCategory} onRefresh={() => fetchData(false)} isRefreshing={isRefreshing} onSelectVendor={(id) => setSelectedVendorId(id)}/>)}

        {/* Selected Vendor Detail Modal */}
        {selectedVendorId && (<VendorDetailModal vendorId={selectedVendorId} onClose={() => setSelectedVendorId(null)} onStatusChanged={() => fetchData(true)}/>)}
      </div>
    </div>);
};
