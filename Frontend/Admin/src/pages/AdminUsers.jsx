import React, { useState } from 'react';
import { AlertCircle, CheckCircle2, ShieldCheck, UserPlus } from 'lucide-react';
import { Header } from '../components/layout/Header';
import { useAuthStore } from '../store/useAuthStore';
import { adminService } from '../services/adminService';
export const AdminUsers = () => {
    const { admin } = useAuthStore();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState('OPERATIONS');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    if (admin?.role !== 'SUPER_ADMIN') {
        return (<div className="p-6">
        <div className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0"/>
          <p>Only a super admin can create administrator accounts.</p>
        </div>
      </div>);
    }
    const handleSubmit = async (event) => {
        event.preventDefault();
        setError(null);
        setSuccess(null);
        setIsSubmitting(true);
        try {
            const response = await adminService.createAdmin(email.trim(), password, role);
            setSuccess(`${response.data.admin.email} was added as ${response.data.admin.role}.`);
            setEmail('');
            setPassword('');
            setRole('OPERATIONS');
        }
        catch (err) {
            setError(err instanceof Error ? err.message : 'Could not create the administrator account.');
        }
        finally {
            setIsSubmitting(false);
        }
    };
    return (<div className="min-h-full flex flex-col">
      <Header title="Admin Accounts" subtitle="Create administrator accounts and assign dashboard access roles"/>

      <div className="flex-1 p-6 max-w-7xl">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(260px,1fr)]">
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
            <div className="mb-6 flex items-center gap-3">
              <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-2.5 text-emerald-700">
                <UserPlus className="h-5 w-5"/>
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900">Create administrator</h2>
                <p className="mt-1 text-xs text-slate-500">New accounts can sign in immediately.</p>
              </div>
            </div>

            {error && (<div role="alert" className="mb-5 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-sm text-rose-800">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0"/>
                <span>{error}</span>
              </div>)}
            {success && (<div role="status" className="mb-5 flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3.5 text-sm text-emerald-800">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0"/>
                <span>{success}</span>
              </div>)}

            <form onSubmit={handleSubmit} className="max-w-xl space-y-5">
              <div>
                <label htmlFor="admin-email" className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-700">
                  Admin email
                </label>
                <input id="admin-email" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="name@example.com" className="block w-full rounded-xl border border-slate-200 bg-transparent px-3.5 py-2.5 text-sm text-slate-900 outline-none transition-all focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"/>
              </div>

              <div>
                <label htmlFor="admin-password" className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-700">
                  Temporary password
                </label>
                <input id="admin-password" type="password" autoComplete="new-password" required minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} className="block w-full rounded-xl border border-slate-200 bg-transparent px-3.5 py-2.5 text-sm text-slate-900 outline-none transition-all focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"/>
                <p className="mt-1.5 text-xs text-slate-500">Use at least 8 characters.</p>
              </div>

              <div>
                <label htmlFor="admin-role" className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-700">
                  Role
                </label>
                <select id="admin-role" value={role} onChange={(event) => setRole(event.target.value)} className="block w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition-all focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600">
                  <option value="OPERATIONS">Operations</option>
                  <option value="SUPPORT">Support</option>
                  <option value="SUPER_ADMIN">Super Admin</option>
                </select>
              </div>

              <button type="submit" disabled={isSubmitting} className="flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60">
                <UserPlus className="h-4 w-4"/>
                {isSubmitting ? 'Creating account...' : 'Create Admin Account'}
              </button>
            </form>
          </section>

          <aside className="h-fit rounded-2xl border border-purple-200 bg-purple-50 p-5">
            <div className="mb-3 flex items-center gap-2 text-purple-800">
              <ShieldCheck className="h-5 w-5"/>
              <h2 className="text-sm font-bold">Role access</h2>
            </div>
            <ul className="space-y-3 text-xs leading-relaxed text-purple-900">
              <li><strong>Operations</strong> — manage day-to-day vendor and resident operations.</li>
              <li><strong>Support</strong> — support access for dashboard workflows.</li>
              <li><strong>Super Admin</strong> — full administrative access, including creating other admin accounts.</li>
            </ul>
            <p className="mt-4 border-t border-purple-200 pt-3 text-xs leading-relaxed text-purple-800">
              Assign Super Admin only to trusted administrators. This form creates accounts; it does not display or manage existing accounts.
            </p>
          </aside>
        </div>
      </div>
    </div>);
};
