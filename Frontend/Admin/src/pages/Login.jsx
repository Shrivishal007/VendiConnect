import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Radio, Lock, Mail, ArrowRight, AlertCircle } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { ThemeToggle } from '../components/common/ThemeToggle';
export const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const { login, isLoading, error } = useAuthStore();
    const navigate = useNavigate();
    const location = useLocation();
    const from = location.state?.from?.pathname || '/';
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!email.trim() || !password)
            return;
        try {
            await login(email.trim(), password);
            navigate(from, { replace: true });
        }
        catch {
            // Error is stored in auth store
        }
    };
    return (<div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="fixed top-4 right-4">
        <ThemeToggle />
      </div>
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-emerald-600 text-white shadow-lg shadow-emerald-600/25 mb-4">
          <Radio className="w-8 h-8"/>
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">
          VendiConnect Operations
        </h2>
        <p className="mt-1.5 text-sm text-slate-500">
          Street Vendor Community Alert & Operations Management
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-sm border border-slate-200 rounded-2xl sm:px-10">
          {error && (<div className="mb-6 p-3.5 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-2.5 text-xs text-rose-800">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5"/>
              <span>{error}</span>
            </div>)}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Admin Email
              </label>
              <div className="relative rounded-xl border border-slate-200 focus-within:border-emerald-600 focus-within:ring-1 focus-within:ring-emerald-600 transition-all">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-4 h-4"/>
                </div>
                <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@example.com" className="block w-full pl-10 pr-3 py-2.5 text-sm text-slate-900 bg-transparent rounded-xl focus:outline-none"/>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Password
              </label>
              <div className="relative rounded-xl border border-slate-200 focus-within:border-emerald-600 focus-within:ring-1 focus-within:ring-emerald-600 transition-all">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4"/>
                </div>
                <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="block w-full pl-10 pr-3 py-2.5 text-sm text-slate-900 bg-transparent rounded-xl focus:outline-none"/>
              </div>
            </div>

            <button type="submit" disabled={isLoading} className="w-full mt-2 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none shadow-sm shadow-emerald-600/30 transition-all disabled:opacity-60">
              {isLoading ? (<span>Authenticating...</span>) : (<>
                  <span>Sign In to Dashboard</span>
                  <ArrowRight className="w-4 h-4"/>
                </>)}
            </button>
          </form>

        </div>
      </div>
    </div>);
};
