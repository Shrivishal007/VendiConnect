import React, { useEffect, useState } from 'react';
import { Server, Database, Clock, CheckCircle2, } from 'lucide-react';
import { adminService } from '../services/adminService';
import { Header } from '../components/layout/Header';
import { LoadingState, ErrorState } from '../components/common/UIComponents';
export const Settings = () => {
    const [health, setHealth] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [error, setError] = useState(null);
    const fetchHealth = async (silent = false) => {
        if (!silent)
            setIsLoading(true);
        else
            setIsRefreshing(true);
        setError(null);
        try {
            const res = await adminService.getHealth();
            setHealth(res);
        }
        catch (err) {
            setError(err.message || 'Failed to connect to backend health check service');
        }
        finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    };
    useEffect(() => {
        fetchHealth();
    }, []);
    return (<div className="min-h-full flex flex-col">
      <Header title="System Health & SLA Settings" subtitle="Backend service telemetry, database connectivity, and geospatial SLA target monitoring" onRefresh={() => fetchHealth(true)} isRefreshing={isRefreshing}/>

      <div className="flex-1 p-6 space-y-6 max-w-7xl">
        {isLoading ? (<LoadingState message="Probing backend health endpoints..."/>) : error ? (<ErrorState message={error} onRetry={() => fetchHealth()}/>) : health ? (<div className="space-y-6">
            {/* Top Overview Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    API Status
                  </span>
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <Server className="w-4 h-4"/>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold text-slate-900 uppercase">{health.status}</span>
                  <CheckCircle2 className="w-5 h-5 text-emerald-600"/>
                </div>
                <p className="text-xs text-slate-500 mt-1">Environment: {health.env}</p>
              </div>

              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Database Ping
                  </span>
                  <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                    <Database className="w-4 h-4"/>
                  </div>
                </div>
                <div className="text-2xl font-bold text-slate-900 font-mono">
                  {health.database.pingMs} ms
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  State: <span className="font-semibold text-slate-700">{health.database.state}</span>
                </p>
              </div>

              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Service Uptime
                  </span>
                  <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
                    <Clock className="w-4 h-4"/>
                  </div>
                </div>
                <div className="text-2xl font-bold text-slate-900">
                  {Math.floor(health.uptimeSeconds / 3600)}h {Math.floor((health.uptimeSeconds % 3600) / 60)}m
                </div>
                <p className="text-xs text-slate-500 mt-1">{health.uptimeSeconds} seconds</p>
              </div>
            </div>

            {/* SLA Configuration & Targets */}
            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
              <h3 className="text-sm font-bold text-slate-900 mb-1">Architecture SLA Targets</h3>
              <p className="text-xs text-slate-500 mb-4">
                Latency targets enforced across location telemetry ingest and spatial queries
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="font-semibold text-slate-700">Webhook Processing Latency</span>
                  <div className="text-xl font-bold text-slate-900 mt-1">
                    {health.slaTargets.WEBHOOK_PROCESSING_LATENCY_MS} ms
                  </div>
                  <p className="text-slate-500 mt-1 text-[11px]">
                    Maximum synchronous budget for GPS telemetry ingest and verification
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="font-semibold text-slate-700">Geospatial Query Latency</span>
                  <div className="text-xl font-bold text-slate-900 mt-1">
                    {health.slaTargets.GEOSPATIAL_QUERY_LATENCY_MS} ms
                  </div>
                  <p className="text-slate-500 mt-1 text-[11px]">
                    Target execution time for 2dsphere proximity radius candidate matching
                  </p>
                </div>
              </div>
            </div>

            {/* Memory Utilization */}
            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
              <h3 className="text-sm font-bold text-slate-900 mb-1">Process Memory Allocation</h3>
              <p className="text-xs text-slate-500 mb-4">Node.js V8 runtime memory consumption</p>

              <div className="grid grid-cols-3 gap-4 text-xs">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-slate-500 text-[11px]">Resident Set (RSS)</span>
                  <div className="font-bold text-slate-900 font-mono text-sm mt-0.5">
                    {health.memory.rss}
                  </div>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-slate-500 text-[11px]">Heap Used</span>
                  <div className="font-bold text-slate-900 font-mono text-sm mt-0.5">
                    {health.memory.heapUsed}
                  </div>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-slate-500 text-[11px]">Heap Total</span>
                  <div className="font-bold text-slate-900 font-mono text-sm mt-0.5">
                    {health.memory.heapTotal}
                  </div>
                </div>
              </div>
            </div>
          </div>) : null}
      </div>
    </div>);
};
