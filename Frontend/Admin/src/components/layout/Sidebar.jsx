import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Radio, Store, Users, Tags, Bell, Star, BarChart3, Sliders, LogOut, Menu, X, ShieldCheck, UserPlus, } from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
const navItems = [
    { name: 'Overview', to: '/', icon: LayoutDashboard },
    { name: 'Live Operations', to: '/live-ops', icon: Radio },
    { name: 'Vendors', to: '/vendors', icon: Store },
    { name: 'Residents', to: '/residents', icon: Users },
    { name: 'Categories', to: '/categories', icon: Tags },
    { name: 'Alerts', to: '/alerts', icon: Bell },
    { name: 'Ratings & Feedback', to: '/ratings', icon: Star },
    { name: 'Analytics', to: '/analytics', icon: BarChart3 },
    { name: 'System Settings', to: '/settings', icon: Sliders },
];
export const Sidebar = () => {
    const { admin, logout } = useAuthStore();
    const navigate = useNavigate();
    const [isOpen, setIsOpen] = useState(false);
    const handleLogout = () => {
        logout();
        navigate('/login');
    };
    const roleColor = (role) => {
        switch (role) {
            case 'SUPER_ADMIN':
                return 'bg-purple-100 text-purple-700 border-purple-200';
            case 'OPERATIONS':
                return 'bg-blue-100 text-blue-700 border-blue-200';
            case 'SUPPORT':
                return 'bg-amber-100 text-amber-700 border-amber-200';
            default:
                return 'bg-slate-100 text-slate-700 border-slate-200';
        }
    };
    const navContent = (<div className="flex flex-col h-full bg-white border-r border-slate-200">
      {/* Brand logo */}
      <div className="h-16 flex items-center px-6 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center text-white shadow-sm shadow-emerald-500/20">
            <Radio className="w-5 h-5"/>
          </div>
          <div>
            <span className="font-bold text-slate-900 tracking-tight text-lg">VendiConnect</span>
            <span className="block text-[10px] font-semibold text-emerald-600 uppercase tracking-wider">
              Admin Ops
            </span>
          </div>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
            const Icon = item.icon;
            return (<NavLink key={item.to} to={item.to} end={item.to === '/'} onClick={() => setIsOpen(false)} className={({ isActive }) => `flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors ${isActive
                    ? 'bg-emerald-50 text-emerald-800 font-semibold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'}`}>
              <Icon className="w-4 h-4 text-emerald-600"/>
              <span>{item.name}</span>
            </NavLink>);
        })}
        {admin?.role === 'SUPER_ADMIN' && (<NavLink to="/admin-users" onClick={() => setIsOpen(false)} className={({ isActive }) => `flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors ${isActive
                ? 'bg-emerald-50 text-emerald-800 font-semibold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'}`}>
            <UserPlus className="w-4 h-4 text-emerald-600"/>
            <span>Admin Accounts</span>
          </NavLink>)}
      </nav>

      {/* Admin Profile & Logout */}
      <div className="p-4 border-t border-slate-100 bg-slate-50/60">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-9 h-9 rounded-full bg-slate-200 border border-slate-300 flex items-center justify-center text-slate-600 font-semibold text-xs">
            {admin?.email?.charAt(0).toUpperCase() || 'A'}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-slate-900 truncate">{admin?.email}</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <ShieldCheck className="w-3 h-3 text-emerald-600"/>
              <span className={`text-[10px] px-1.5 py-0.2 rounded border font-semibold tracking-wide ${roleColor(admin?.role)}`}>
                {admin?.role || 'ADMIN'}
              </span>
            </div>
          </div>
        </div>

        <button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium text-slate-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg border border-slate-200 transition-colors">
          <LogOut className="w-3.5 h-3.5"/>
          <span>Sign Out</span>
        </button>
      </div>
    </div>);
    return (<>
      {/* Mobile top toggle */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-14 bg-white border-b border-slate-200 z-40 flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-emerald-600 flex items-center justify-center text-white">
            <Radio className="w-4 h-4"/>
          </div>
          <span className="font-bold text-slate-900">VendiConnect</span>
        </div>
        <button onClick={() => setIsOpen(!isOpen)} className="p-2 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100">
          {isOpen ? <X className="w-5 h-5"/> : <Menu className="w-5 h-5"/>}
        </button>
      </div>

      {/* Mobile drawer backdrop */}
      {isOpen && (<div className="lg:hidden fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-40" onClick={() => setIsOpen(false)}/>)}

      {/* Mobile drawer */}
      <div className={`lg:hidden fixed inset-y-0 left-0 w-64 z-50 transform transition-transform duration-200 ease-in-out ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        {navContent}
      </div>

      {/* Desktop static sidebar */}
      <aside className="hidden lg:block w-64 shrink-0 h-screen sticky top-0 z-30">
        {navContent}
      </aside>
    </>);
};
