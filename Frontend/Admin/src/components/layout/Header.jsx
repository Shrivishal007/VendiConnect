import React, { useEffect, useState } from 'react';
import { RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';
import { adminService } from '../../services/adminService';
import { ThemeToggle } from '../common/ThemeToggle';
export const Header = ({ title, subtitle, onRefresh, isRefreshing = false, }) => {
    const [health, setHealth] = useState(null);
    useEffect(() => {
        let mounted = true;
        const fetchHealth = async () => {
            try {
                const res = await adminService.getHealth();
                if (mounted)
                    setHealth(res);
            }
            catch {
                if (mounted)
                    setHealth(null);
            }
        };
        fetchHealth();
        const interval = setInterval(fetchHealth, 30000);
        return () => {
            mounted = false;
            clearInterval(interval);
        };
    }, []);
    return (<header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between shrink-0">
      <div>
        <h1 className="text-xl font-bold text-slate-900 tracking-tight leading-none">
          {title}
        </h1>
        {subtitle && <p className="text-xs text-slate-500 mt-1">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-3">
        <ThemeToggle />

        {/* Backend connectivity indicator */}
        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${health?.status === 'ok'
            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
            : 'bg-rose-50 text-rose-700 border-rose-200'}`} title={health
            ? `DB Latency: ${health.database.pingMs}ms, Uptime: ${Math.round(health.uptimeSeconds / 60)}m`
            : 'Backend disconnected'}>
          {health?.status === 'ok' ? (<CheckCircle2 className="w-3.5 h-3.5 text-emerald-600"/>) : (<AlertCircle className="w-3.5 h-3.5 text-rose-600"/>)}
          <span>{health?.status === 'ok' ? 'API Online' : 'API Offline'}</span>
          {health?.database?.pingMs !== undefined && (<span className="text-[10px] text-emerald-600/80 font-mono">
              {health.database.pingMs}ms
            </span>)}
        </div>

        {onRefresh && (<button onClick={onRefresh} disabled={isRefreshing} className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors disabled:opacity-50" title="Refresh Data">
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-emerald-600' : ''}`}/>
          </button>)}
      </div>
    </header>);
};
