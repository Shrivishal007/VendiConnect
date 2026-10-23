import React, { useEffect, useState } from 'react';
import { Clock, TrendingUp, Users, Bell, Calendar, Award, } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, } from 'recharts';
import { adminService } from '../services/adminService';
import { Header } from '../components/layout/Header';
import { StatCard, LoadingState, ErrorState } from '../components/common/UIComponents';
export const Analytics = () => {
    const [pilot, setPilot] = useState(null);
    const [windowDays, setWindowDays] = useState(30);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [error, setError] = useState(null);
    const fetchPilot = async (silent = false) => {
        if (!silent)
            setIsLoading(true);
        else
            setIsRefreshing(true);
        setError(null);
        try {
            const res = await adminService.getPilotReport(windowDays);
            if (res.success)
                setPilot(res.data);
        }
        catch (err) {
            setError(err.message || 'Failed to fetch analytics pilot report');
        }
        finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    };
    useEffect(() => {
        fetchPilot();
    }, [windowDays]);
    // Format category rating data for Recharts
    const categoryRatingData = (pilot?.avgRatingPerCategory || []).map((cat) => ({
        name: cat.categoryName,
        avgRating: cat.avgRating,
        ratingCount: cat.ratingCount,
    }));
    // Interaction density pie data
    const interactionData = pilot?.interactionDensity
        ? [
            {
                name: 'Interacted (Rated/Purchased)',
                value: pilot.interactionDensity.interactedVendorResidentPairs,
                color: '#10b981',
            },
            {
                name: 'Alerted Only',
                value: Math.max(0, pilot.interactionDensity.totalAlertedVendorResidentPairs -
                    pilot.interactionDensity.interactedVendorResidentPairs),
                color: '#cbd5e1',
            },
        ]
        : [];
    return (<div className="min-h-full flex flex-col">
      <Header title="Operations & Pilot Analytics" subtitle="Performance analytics derived from backend pilot analytics and telemetry models" onRefresh={() => fetchPilot(true)} isRefreshing={isRefreshing}/>

      <div className="flex-1 p-6 space-y-6 max-w-7xl">
        {/* Time Window Selector Bar */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-emerald-600"/>
            <span className="text-xs font-bold text-slate-900">Analysis Window:</span>
            {pilot?.period && (<span className="text-xs text-slate-500">
                {new Date(pilot.period.from).toLocaleDateString()} —{' '}
                {new Date(pilot.period.to).toLocaleDateString()}
              </span>)}
          </div>

          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-lg">
            {[7, 14, 30, 60].map((days) => (<button key={days} onClick={() => setWindowDays(days)} className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors ${windowDays === days
                ? 'bg-white text-emerald-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'}`}>
                {days} Days
              </button>))}
          </div>
        </div>

        {isLoading ? (<LoadingState message="Computing telemetry aggregation and density metrics..."/>) : error ? (<ErrorState message={error} onRetry={() => fetchPilot()}/>) : pilot ? (<>
            {/* Top Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard title="Registered Vendors" value={pilot.totalVendorsRegistered} subtitle="Onboarded pilot vendors" icon={Users} color="blue"/>
              <StatCard title="Alert Volume" value={pilot.totalAlertsDispatched} subtitle={`Dispatched over last ${windowDays} days`} icon={Bell} color="purple"/>
              <StatCard title="Total Active Hours" value={`${pilot.activeVendorHours.totalActiveHours}h`} subtitle={`Avg ${pilot.activeVendorHours.avgActiveHoursPerVendorDay}h per active vendor`} icon={Clock} color="emerald"/>
              <StatCard title="Interaction Density" value={`${Math.round(pilot.interactionDensity.notificationToInteractionDensity * 100)}%`} subtitle={`${pilot.interactionDensity.interactedVendorResidentPairs} of ${pilot.interactionDensity.totalAlertedVendorResidentPairs} pairs engaged`} icon={TrendingUp} color="amber"/>
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Category Ratings Bar Chart */}
              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Average Satisfaction by Trade</h3>
                    <p className="text-xs text-slate-500">Resident star ratings (1–5) aggregated by vendor category</p>
                  </div>
                  <Award className="w-4 h-4 text-amber-500"/>
                </div>
                <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={categoryRatingData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9"/>
                      <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} tickLine={false} interval={0} angle={-20} textAnchor="end" height={50}/>
                      <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} domain={[0, 5]} ticks={[1, 2, 3, 4, 5]}/>
                      <Tooltip contentStyle={{
                backgroundColor: '#0f172a',
                borderRadius: '8px',
                border: 'none',
                color: '#fff',
                fontSize: '12px',
            }}/>
                      <Bar dataKey="avgRating" fill="#f59e0b" radius={[4, 4, 0, 0]} name="Avg Stars"/>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Notification-to-Interaction Density */}
              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Proximity Alert Engagement Density</h3>
                    <p className="text-xs text-slate-500">Proportion of alerted resident-vendor pairs leading to feedback</p>
                  </div>
                  <TrendingUp className="w-4 h-4 text-emerald-600"/>
                </div>
                <div className="h-72 w-full flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={interactionData} cx="50%" cy="50%" innerRadius={65} outerRadius={95} paddingAngle={4} dataKey="value">
                        {interactionData.map((entry, index) => (<Cell key={`cell-${index}`} fill={entry.color}/>))}
                      </Pie>
                      <Tooltip contentStyle={{
                backgroundColor: '#0f172a',
                borderRadius: '8px',
                border: 'none',
                color: '#fff',
                fontSize: '12px',
            }}/>
                      <Legend verticalAlign="bottom" height={36} formatter={(value) => <span className="text-xs text-slate-700">{value}</span>}/>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </>) : null}
      </div>
    </div>);
};
