import React, { useEffect, useState } from 'react';
import { Store, Users, Bell, Clock, ArrowUpRight, MapPin, } from 'lucide-react';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, } from 'recharts';
import { adminService } from '../services/adminService';
import { Header } from '../components/layout/Header';
import { StatCard, LoadingState, ErrorState } from '../components/common/UIComponents';
import { Link } from 'react-router-dom';
export const Overview = () => {
    const [dashboard, setDashboard] = useState(null);
    const [pilot, setPilot] = useState(null);
    const [categories, setCategories] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [error, setError] = useState(null);
    const fetchData = async (showRefreshSpinner = false) => {
        if (showRefreshSpinner)
            setIsRefreshing(true);
        else
            setIsLoading(true);
        setError(null);
        try {
            const [dashRes, pilotRes, catRes] = await Promise.all([
                adminService.getDashboard(),
                adminService.getPilotReport(30),
                adminService.getCategories(),
            ]);
            if (dashRes.success)
                setDashboard(dashRes.data);
            if (pilotRes.success)
                setPilot(pilotRes.data);
            if (catRes.success)
                setCategories(catRes.data);
        }
        catch (err) {
            setError(err.message || 'Failed to fetch dashboard data');
        }
        finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    };
    useEffect(() => {
        fetchData();
    }, []);
    // Format category data for Recharts
    const categoryChartData = categories.map((cat) => ({
        name: cat.Name,
        vendors: cat.vendorCount || 0,
    }));
    // Alert timeline data from recent alerts
    const alertTimelineData = (dashboard?.recentAlerts || [])
        .slice()
        .reverse()
        .map((alert) => ({
        time: new Date(alert.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        eta: alert.etaMinutes,
        distance: Math.round(alert.distanceAtKm * 1000),
    }));
    return (<div className="min-h-full flex flex-col">
      <Header title="Operations Overview" subtitle="Real-time street vendor telematics and community alert metrics" onRefresh={() => fetchData(true)} isRefreshing={isRefreshing}/>

      <div className="flex-1 p-6 space-y-6 max-w-7xl">
        {isLoading && <LoadingState message="Aggregating live operations metrics..."/>}
        {error && <ErrorState message={error} onRetry={() => fetchData()}/>}

        {dashboard && (<>
            {/* KPI Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard title="Active Vendors" value={dashboard.totalActiveVendors} subtitle="Authorized vendors sharing location" icon={Store} color="emerald" trend={{ value: 'Live', isPositive: true }}/>
              <StatCard title="Registered Residents" value={dashboard.totalResidents} subtitle="Opted-in community members" icon={Users} color="blue"/>
              <StatCard title="Alerts Dispatched" value={pilot?.totalAlertsDispatched ?? dashboard.recentAlerts.length} subtitle="Proximity notices delivered" icon={Bell} color="purple"/>
              <StatCard title="Vendor Active Hours" value={`${(pilot?.activeVendorHours?.totalActiveHours ?? 0).toFixed(1)}h`} subtitle="Cumulative logged on-street time" icon={Clock} color="amber"/>
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Alert ETA & Distance Trend */}
              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Recent Alert Dynamics</h3>
                    <p className="text-xs text-slate-500">Estimated Arrival (Minutes) over recent alerts</p>
                  </div>
                  <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    Proximity
                  </span>
                </div>
                <div className="h-64 w-full">
                  {alertTimelineData.length > 0 ? (<ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={alertTimelineData}>
                        <defs>
                          <linearGradient id="etaGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0.0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9"/>
                        <XAxis dataKey="time" stroke="#94a3b8" fontSize={11} tickLine={false}/>
                        <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} unit="m"/>
                        <Tooltip contentStyle={{
                    backgroundColor: '#0f172a',
                    borderRadius: '8px',
                    border: 'none',
                    color: '#fff',
                    fontSize: '12px',
                }}/>
                        <Area type="monotone" dataKey="eta" stroke="#059669" strokeWidth={2} fillOpacity={1} fill="url(#etaGradient)" name="ETA (mins)"/>
                      </AreaChart>
                    </ResponsiveContainer>) : (<div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
                      <Clock className="w-8 h-8 text-slate-300 mb-2"/>
                      <p className="text-xs font-medium text-slate-600">No proximity alerts dispatched yet</p>
                      <p className="text-[11px] text-slate-400 mt-1">Arrival dynamics will appear once vendors broadcast live near residents</p>
                    </div>)}
                </div>
              </div>

              {/* Vendor Category Breakdown */}
              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Vendor Distribution by Category</h3>
                    <p className="text-xs text-slate-500">Authorized active vendors across community staples</p>
                  </div>
                  <Link to="/categories" className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 inline-flex items-center gap-0.5">
                    <span>View All</span>
                    <ArrowUpRight className="w-3.5 h-3.5"/>
                  </Link>
                </div>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={categoryChartData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9"/>
                      <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} tickLine={false} interval={0} angle={-20} textAnchor="end" height={50}/>
                      <YAxis stroke="#94a3b8" fontSize={11} tickLine={false}/>
                      <Tooltip contentStyle={{
                backgroundColor: '#0f172a',
                borderRadius: '8px',
                border: 'none',
                color: '#fff',
                fontSize: '12px',
            }}/>
                      <Bar dataKey="vendors" fill="#10b981" radius={[4, 4, 0, 0]} name="Vendors"/>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Recent Alerts Feed */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Recent Proximity Alerts Dispatched</h3>
                  <p className="text-xs text-slate-500">
                    Latest geofence triggers notifying residents of approaching vendors
                  </p>
                </div>
                <Link to="/alerts" className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 inline-flex items-center gap-0.5">
                  <span>Full Audit Log</span>
                  <ArrowUpRight className="w-3.5 h-3.5"/>
                </Link>
              </div>

              {dashboard.recentAlerts.length > 0 ? (<div className="divide-y divide-slate-100">
                  {dashboard.recentAlerts.map((alert) => (<div key={alert.alertId} className="p-4 hover:bg-slate-50 transition-colors flex items-center justify-between text-xs">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                          <MapPin className="w-4 h-4"/>
                        </div>
                        <div>
                          <div className="font-semibold text-slate-900 text-sm">
                            {alert.vendorName}
                          </div>
                          <div className="text-slate-500">
                            Approaching <span className="font-medium text-slate-700">{alert.residentName}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 text-right">
                        <div>
                          <div className="font-bold text-emerald-600">
                            ETA ~{alert.etaMinutes} min
                          </div>
                          <div className="text-[11px] text-slate-400">
                            {(alert.distanceAtKm * 1000).toFixed(0)}m away
                          </div>
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono hidden sm:block">
                          {new Date(alert.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    </div>))}
                </div>) : (<div className="p-8 text-center text-xs text-slate-400">
                  No proximity alerts dispatched yet. Verified alerts will appear here in real time.
                </div>)}
            </div>
          </>)}
      </div>
    </div>);
};
