import { request } from './apiClient';
export const adminService = {
    // Authentication
    async login(email, password) {
        return request('admin/login', {
            method: 'POST',
            body: JSON.stringify({ email, password }),
        });
    },
    async getMe() {
        return request('admin/me');
    },
    async createAdmin(email, password, role) {
        return request('admin/register', {
            method: 'POST',
            body: JSON.stringify({ email, password, role }),
        });
    },
    // Overview & Analytics
    async getDashboard() {
        return request('admin/dashboard');
    },
    async getPilotReport(windowDays = 30) {
        return request(`admin/pilot-report?windowDays=${windowDays}`);
    },
    async getHealth() {
        return request('health');
    },
    // Vendors
    async getVendors(params = {}) {
        const query = new URLSearchParams();
        if (params.page)
            query.set('page', String(params.page));
        if (params.limit)
            query.set('limit', String(params.limit));
        if (params.status)
            query.set('status', params.status);
        if (params.category)
            query.set('category', params.category);
        if (params.q)
            query.set('q', params.q);
        return request(`admin/vendors?${query.toString()}`);
    },
    async getVendorDetail(vendorId) {
        return request(`admin/vendors/${vendorId}`);
    },
    async updateVendorStatus(vendorId, status) {
        return request(`admin/vendors/${vendorId}/status`, {
            method: 'PATCH',
            body: JSON.stringify({ status }),
        });
    },
    // Residents
    async getResidents(params = {}) {
        const query = new URLSearchParams();
        if (params.page)
            query.set('page', String(params.page));
        if (params.limit)
            query.set('limit', String(params.limit));
        return request(`admin/residents?${query.toString()}`);
    },
    async getResidentDetail(residentId) {
        return request(`admin/residents/${residentId}`);
    },
    // Categories
    async getCategories() {
        return request('admin/categories');
    },
    async createCategory(name, icon) {
        return request('admin/categories', {
            method: 'POST',
            body: JSON.stringify({ name, icon }),
        });
    },
    async updateCategory(categoryId, payload) {
        return request(`admin/categories/${categoryId}`, {
            method: 'PATCH',
            body: JSON.stringify(payload),
        });
    },
    async deleteCategory(categoryId) {
        return request(`admin/categories/${categoryId}`, {
            method: 'DELETE',
        });
    },
    // Alerts
    async getAlerts(params = {}) {
        const query = new URLSearchParams();
        if (params.page)
            query.set('page', String(params.page));
        if (params.limit)
            query.set('limit', String(params.limit));
        if (params.vendorId)
            query.set('vendorId', params.vendorId);
        if (params.residentId)
            query.set('residentId', params.residentId);
        return request(`admin/alerts?${query.toString()}`);
    },
    // Ratings
    async getRatings(params = {}) {
        const query = new URLSearchParams();
        if (params.page)
            query.set('page', String(params.page));
        if (params.limit)
            query.set('limit', String(params.limit));
        if (params.vendorId)
            query.set('vendorId', params.vendorId);
        return request(`admin/ratings?${query.toString()}`);
    },
    // Activity Logs
    async getActivity(params = {}) {
        const query = new URLSearchParams();
        if (params.page)
            query.set('page', String(params.page));
        if (params.limit)
            query.set('limit', String(params.limit));
        if (params.vendorId)
            query.set('vendorId', params.vendorId);
        return request(`admin/activity?${query.toString()}`);
    },
};
