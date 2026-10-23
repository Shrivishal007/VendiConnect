import React, { useEffect, useState } from 'react';
import { Plus, Edit2, Trash2, Store, X } from 'lucide-react';
import { adminService } from '../services/adminService';
import { Header } from '../components/layout/Header';
import { LoadingState, EmptyState, ErrorState } from '../components/common/UIComponents';
export const Categories = () => {
    const [categories, setCategories] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [error, setError] = useState(null);
    // Modal states
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [editingCategory, setEditingCategory] = useState(null);
    const [categoryName, setCategoryName] = useState('');
    const [categoryIcon, setCategoryIcon] = useState('basket');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const fetchCategories = async (silent = false) => {
        if (!silent)
            setIsLoading(true);
        else
            setIsRefreshing(true);
        setError(null);
        try {
            const res = await adminService.getCategories();
            if (res.success)
                setCategories(res.data);
        }
        catch (err) {
            setError(err.message || 'Failed to load categories');
        }
        finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    };
    useEffect(() => {
        fetchCategories();
    }, []);
    const handleCreate = async (e) => {
        e.preventDefault();
        if (!categoryName.trim())
            return;
        setIsSubmitting(true);
        try {
            await adminService.createCategory(categoryName.trim(), categoryIcon.trim());
            setIsAddOpen(false);
            setCategoryName('');
            setCategoryIcon('basket');
            fetchCategories(true);
        }
        catch (err) {
            alert(err.message || 'Failed to create category');
        }
        finally {
            setIsSubmitting(false);
        }
    };
    const handleUpdate = async (e) => {
        e.preventDefault();
        if (!editingCategory || !categoryName.trim())
            return;
        setIsSubmitting(true);
        try {
            await adminService.updateCategory(editingCategory._id, {
                name: categoryName.trim(),
                icon: categoryIcon.trim(),
            });
            setEditingCategory(null);
            setCategoryName('');
            setCategoryIcon('basket');
            fetchCategories(true);
        }
        catch (err) {
            alert(err.message || 'Failed to update category');
        }
        finally {
            setIsSubmitting(false);
        }
    };
    const handleDelete = async (categoryId, vendorCount = 0) => {
        if (vendorCount > 0) {
            alert(`Cannot delete category: ${vendorCount} vendors are currently assigned to this category.`);
            return;
        }
        if (!confirm('Are you sure you want to delete this category?'))
            return;
        try {
            await adminService.deleteCategory(categoryId);
            fetchCategories(true);
        }
        catch (err) {
            alert(err.message || 'Failed to delete category');
        }
    };
    const openEdit = (cat) => {
        setEditingCategory(cat);
        setCategoryName(cat.Name);
        setCategoryIcon(cat.Icon || 'basket');
    };
    return (<div className="min-h-full flex flex-col">
      <Header title="Category Manager" subtitle="Manage vendor trade classifications, discovery icons, and resident preference tags" onRefresh={() => fetchCategories(true)} isRefreshing={isRefreshing}/>

      <div className="flex-1 p-6 space-y-6 max-w-7xl">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Trade Categories ({categories.length})</h2>
            <p className="text-xs text-slate-500">Categories define how vendors are indexed on the discovery map</p>
          </div>
          <button onClick={() => {
            setCategoryName('');
            setCategoryIcon('basket');
            setIsAddOpen(true);
        }} className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors">
            <Plus className="w-4 h-4"/>
            <span>Add Category</span>
          </button>
        </div>

        {isLoading ? (<LoadingState message="Loading vendor trade categories..."/>) : error ? (<ErrorState message={error} onRetry={() => fetchCategories()}/>) : categories.length === 0 ? (<EmptyState title="No categories defined" description="Create categories to help residents filter local vendors." actionText="Add First Category" onAction={() => setIsAddOpen(true)}/>) : (<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {categories.map((cat) => (<div key={cat._id} className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs flex flex-col justify-between hover:border-slate-300 transition-colors">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-2xl p-2 bg-emerald-50 text-emerald-700 rounded-xl border border-emerald-100 inline-block">
                      🛒
                    </span>
                    <div className="flex items-center gap-1">
                      <button onClick={() => openEdit(cat)} className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors" title="Edit Category">
                        <Edit2 className="w-3.5 h-3.5"/>
                      </button>
                      <button onClick={() => handleDelete(cat._id, cat.vendorCount)} className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors" title="Delete Category">
                        <Trash2 className="w-3.5 h-3.5"/>
                      </button>
                    </div>
                  </div>

                  <h3 className="font-bold text-slate-900 text-sm">{cat.Name}</h3>
                  <div className="text-[11px] text-slate-400 font-mono mt-0.5">Icon: {cat.Icon}</div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 text-slate-600 font-medium">
                    <Store className="w-3.5 h-3.5 text-emerald-600"/>
                    <span>{cat.vendorCount || 0} active vendors</span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">ID: {cat._id.slice(-6)}</span>
                </div>
              </div>))}
          </div>)}

        {/* Add Category Modal */}
        {isAddOpen && (<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
            <div className="bg-white w-full max-w-md rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
                <h3 className="text-sm font-bold text-slate-900">Add New Category</h3>
                <button onClick={() => setIsAddOpen(false)} className="p-1 text-slate-400 hover:text-slate-700 rounded-lg">
                  <X className="w-5 h-5"/>
                </button>
              </div>

              <form onSubmit={handleCreate} className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Category Name
                  </label>
                  <input type="text" required value={categoryName} onChange={(e) => setCategoryName(e.target.value)} placeholder="e.g. Fresh Flowers, Hot Tiffin" className="w-full px-3 py-2 text-sm text-slate-900 border border-slate-200 rounded-xl focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"/>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Icon Identifier
                  </label>
                  <input type="text" required value={categoryIcon} onChange={(e) => setCategoryIcon(e.target.value)} placeholder="e.g. flowers, tiffin, fruit, tea" className="w-full px-3 py-2 text-sm text-slate-900 border border-slate-200 rounded-xl focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"/>
                  <p className="mt-1 text-[11px] text-slate-400">
                    Matches icon keywords in resident and mobile discovery views
                  </p>
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <button type="button" onClick={() => setIsAddOpen(false)} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl">
                    Cancel
                  </button>
                  <button type="submit" disabled={isSubmitting} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-xs disabled:opacity-50">
                    {isSubmitting ? 'Creating...' : 'Create Category'}
                  </button>
                </div>
              </form>
            </div>
          </div>)}

        {/* Edit Category Modal */}
        {editingCategory && (<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
            <div className="bg-white w-full max-w-md rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
                <h3 className="text-sm font-bold text-slate-900">Edit Category</h3>
                <button onClick={() => setEditingCategory(null)} className="p-1 text-slate-400 hover:text-slate-700 rounded-lg">
                  <X className="w-5 h-5"/>
                </button>
              </div>

              <form onSubmit={handleUpdate} className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Category Name
                  </label>
                  <input type="text" required value={categoryName} onChange={(e) => setCategoryName(e.target.value)} className="w-full px-3 py-2 text-sm text-slate-900 border border-slate-200 rounded-xl focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"/>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Icon Identifier
                  </label>
                  <input type="text" required value={categoryIcon} onChange={(e) => setCategoryIcon(e.target.value)} className="w-full px-3 py-2 text-sm text-slate-900 border border-slate-200 rounded-xl focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"/>
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <button type="button" onClick={() => setEditingCategory(null)} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl">
                    Cancel
                  </button>
                  <button type="submit" disabled={isSubmitting} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-xs disabled:opacity-50">
                    {isSubmitting ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </div>
          </div>)}
      </div>
    </div>);
};
