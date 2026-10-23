import React from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
export const AdminLayout = () => {
    return (<div className="flex h-screen bg-slate-50 overflow-hidden font-sans">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden pt-14 lg:pt-0">
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>);
};
