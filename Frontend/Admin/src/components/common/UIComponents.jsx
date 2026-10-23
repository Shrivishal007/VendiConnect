import React from 'react';
import { AlertCircle, RefreshCw, Inbox } from 'lucide-react';
export const StatCard = ({ title, value, subtitle, icon: Icon, trend, color = 'emerald', }) => {
    const colorMap = {
        emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100',
        blue: 'bg-blue-50 text-blue-600 border-blue-100',
        purple: 'bg-purple-50 text-purple-600 border-purple-100',
        amber: 'bg-amber-50 text-amber-600 border-amber-100',
    };
    return (<div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs transition-shadow hover:shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
          {title}
        </span>
        <div className={`w-9 h-9 rounded-lg border flex items-center justify-center ${colorMap[color]}`}>
          <Icon className="w-5 h-5"/>
        </div>
      </div>
      <div className="mt-3 flex items-baseline gap-2">
        <span className="text-2xl font-bold text-slate-900 tracking-tight">{value}</span>
        {trend && (<span className={`text-xs font-medium ${trend.isPositive ? 'text-emerald-600' : 'text-slate-500'}`}>
            {trend.value}
          </span>)}
      </div>
      {subtitle && <p className="mt-1 text-xs text-slate-500">{subtitle}</p>}
    </div>);
};
export const StatusBadge = ({ status }) => {
    const cleanStatus = status?.toUpperCase() || 'UNKNOWN';
    const styles = {
        ACTIVE: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        INACTIVE: 'bg-amber-50 text-amber-700 border-amber-200',
        SUSPENDED: 'bg-rose-50 text-rose-700 border-rose-200',
        ONLINE: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        OFFLINE: 'bg-slate-100 text-slate-600 border-slate-200',
        GRANTED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        PENDING_CONSENT: 'bg-amber-50 text-amber-700 border-amber-200',
        WITHDRAWN: 'bg-rose-50 text-rose-700 border-rose-200',
        NOT_STARTED: 'bg-slate-100 text-slate-600 border-slate-200',
    };
    return (<span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border tracking-wide uppercase ${styles[cleanStatus] || 'bg-slate-100 text-slate-700 border-slate-200'}`}>
      {cleanStatus.replace('_', ' ')}
    </span>);
};
export const LoadingState = ({ message = 'Loading data...', }) => (<div className="py-16 flex flex-col items-center justify-center text-center">
    <div className="w-10 h-10 rounded-full border-3 border-emerald-200 border-t-emerald-600 animate-spin mb-3"/>
    <p className="text-sm font-medium text-slate-600">{message}</p>
  </div>);
export const EmptyState = ({ title, description, actionText, onAction }) => (<div className="py-16 px-4 text-center border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50">
    <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 mx-auto flex items-center justify-center mb-3">
      <Inbox className="w-6 h-6"/>
    </div>
    <h3 className="text-base font-semibold text-slate-900">{title}</h3>
    <p className="mt-1 text-sm text-slate-500 max-w-sm mx-auto">{description}</p>
    {actionText && onAction && (<button onClick={onAction} className="mt-4 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors">
        {actionText}
      </button>)}
  </div>);
export const ErrorState = ({ title = 'Failed to load data', message, onRetry }) => (<div className="p-4 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-3">
    <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5"/>
    <div className="flex-1">
      <h4 className="text-sm font-semibold text-rose-900">{title}</h4>
      <p className="text-xs text-rose-700 mt-0.5">{message}</p>
      {onRetry && (<button onClick={onRetry} className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-rose-800 hover:text-rose-950 underline">
          <RefreshCw className="w-3 h-3"/>
          <span>Try again</span>
        </button>)}
    </div>
  </div>);
