import { request } from './apiClient';
export const residentService = {
    // Public Category Discovery
    async getCategories() {
        return request('public/categories');
    },
    // Sync a Firebase-authenticated resident profile with the backend
    async syncResident(payload) {
        return request('residents/auth/sync', {
            method: 'POST',
            body: JSON.stringify(payload),
        });
    },
    // Public Active Vendors
    async getActiveVendors() {
        return request('vendors/active-vendors');
    },
    // Nearby Vendors by Coordinates
    async getNearbyVendors(params) {
        const query = new URLSearchParams();
        query.set('lat', String(params.lat));
        query.set('lng', String(params.lng));
        if (params.radius)
            query.set('radius', String(params.radius));
        if (params.category)
            query.set('category', params.category);
        if (params.minRating !== undefined)
            query.set('minRating', String(params.minRating));
        return request(`vendors/nearby?${query.toString()}`);
    },
    // Nearby Vendors for Authenticated Resident's Saved Location
    async getNearbyVendorsForMe(params = {}) {
        const query = new URLSearchParams();
        if (params.radius)
            query.set('radius', String(params.radius));
        if (params.category)
            query.set('category', params.category);
        if (params.minRating !== undefined)
            query.set('minRating', String(params.minRating));
        return request(`vendors/nearby/me?${query.toString()}`);
    },
    // Resident Profile Management
    async getMyProfile() {
        return request('residents/auth/me');
    },
    async updateMyProfile(payload) {
        return request('residents/auth/me', {
            method: 'PATCH',
            body: JSON.stringify(payload),
        });
    },
    async updateFcmToken(fcmToken) {
        return request('residents/auth/fcm-token', {
            method: 'PATCH',
            body: JSON.stringify({ fcmToken }),
        });
    },
    // Category Preferences
    async getPreferences(residentId) {
        return request(`residents/${residentId}/preferences`);
    },
    async setPreferences(residentId, categoryIds) {
        return request(`residents/${residentId}/preferences`, {
            method: 'PUT',
            body: JSON.stringify({ categoryIds }),
        });
    },
    // Ratings Submission
    async createRating(vendorId, ratingValue, review) {
        return request('ratings', {
            method: 'POST',
            body: JSON.stringify({ vendorId, ratingValue, review: review || '' }),
        });
    },
    // In-App Proximity Alerts
    async getAlerts(params = {}) {
        const query = new URLSearchParams();
        if (params.page)
            query.set('page', String(params.page));
        if (params.limit)
            query.set('limit', String(params.limit));
        const endpoint = `residents/alerts${query.toString() ? `?${query.toString()}` : ''}`;
        return request(endpoint);
    },
    async markAlertRead(alertId) {
        return request(`residents/alerts/${alertId}/read`, {
            method: 'PATCH',
        });
    },
    async markAllAlertsRead() {
        return request('residents/alerts/read-all', {
            method: 'PATCH',
        });
    },
};
