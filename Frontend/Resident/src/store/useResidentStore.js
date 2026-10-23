import { create } from 'zustand';
import { residentService } from '../services/residentService';
import { useAuthStore } from './useAuthStore';
export const useResidentStore = create((set, get) => ({
    categories: [],
    selectedCategoryIds: [],
    nearbyVendors: [],
    activeVendors: [],
    alerts: [],
    unreadAlertCount: 0,
    homeCoordinates: null,
    notificationRadius: 300,
    isLoading: false,
    isLoadingVendors: false,
    isLoadingAlerts: false,
    error: null,
    loadInitialData: async () => {
        set({ isLoading: true });
        try {
            const profile = useAuthStore.getState().profile;
            const homeCoordinates = profile?.Latitude != null && profile.Longitude != null
                ? {
                    latitude: profile.Latitude,
                    longitude: profile.Longitude,
                    address: profile.Address || '',
                }
                : null;
            if (profile) {
                set({
                    homeCoordinates,
                    notificationRadius: profile.NotificationRadius || 300,
                });
            }
            const preferencesRequest = profile?.Resident_ID
                ? residentService.getPreferences(profile.Resident_ID)
                : Promise.resolve({ success: true, data: [] });
            const [catRes, activeRes, preferencesRes] = await Promise.all([
                residentService.getCategories(),
                residentService.getActiveVendors(),
                preferencesRequest,
            ]);
            const categories = catRes.success ? catRes.data : [];
            const activeVendors = activeRes.success ? activeRes.data : [];
            set({
                categories,
                activeVendors,
                selectedCategoryIds: preferencesRes.success
                    ? preferencesRes.data.map((category) => category._id)
                    : [],
                isLoading: false,
            });
            // Also trigger initial nearby vendors and alerts
            get().fetchNearbyVendors();
            get().fetchAlerts();
        }
        catch (err) {
            set({ isLoading: false, error: err.message });
        }
    },
    fetchAlerts: async () => {
        const token = useAuthStore.getState().token;
        if (!token)
            return;
        set({ isLoadingAlerts: true });
        try {
            const res = await residentService.getAlerts();
            if (res.success) {
                set({
                    alerts: res.data || [],
                    unreadAlertCount: res.unreadCount || 0,
                    isLoadingAlerts: false,
                });
            }
            else {
                set({ isLoadingAlerts: false });
            }
        }
        catch {
            set({ isLoadingAlerts: false });
        }
    },
    markAlertRead: async (alertId) => {
        try {
            await residentService.markAlertRead(alertId);
            set((state) => ({
                alerts: state.alerts.map((a) => (a.id === alertId ? { ...a, read: true } : a)),
                unreadAlertCount: Math.max(state.unreadAlertCount - 1, 0),
            }));
        }
        catch {
            // ignore
        }
    },
    markAllAlertsRead: async () => {
        try {
            await residentService.markAllAlertsRead();
            set((state) => ({
                alerts: state.alerts.map((a) => ({ ...a, read: true })),
                unreadAlertCount: 0,
            }));
        }
        catch {
            // ignore
        }
    },
    savePreferences: async (categoryIds) => {
        const profile = useAuthStore.getState().profile;
        if (!profile?.Resident_ID) {
            throw new Error('Resident profile is not available.');
        }
        await residentService.setPreferences(profile.Resident_ID, categoryIds);
        set({ selectedCategoryIds: categoryIds });
    },
    fetchNearbyVendors: async (params = {}) => {
        const { homeCoordinates, notificationRadius } = get();
        if (!homeCoordinates) {
            set({
                nearbyVendors: [],
                isLoadingVendors: false,
                error: 'Set your current location in Perimeter preferences to find nearby vendors.',
            });
            return;
        }
        set({ isLoadingVendors: true });
        try {
            const res = await residentService.getNearbyVendors({
                lat: homeCoordinates.latitude,
                lng: homeCoordinates.longitude,
                radius: params.radius || notificationRadius || 1000,
                category: params.category,
                minRating: params.minRating,
            });
            if (res.success) {
                set({ nearbyVendors: res.data || [], isLoadingVendors: false, error: null });
            }
            else {
                set({ nearbyVendors: [], isLoadingVendors: false });
            }
        }
        catch (err) {
            set({
                nearbyVendors: [],
                isLoadingVendors: false,
                error: err.message || 'Failed to fetch nearby vendors',
            });
        }
    },
    setRadius: async (radius) => {
        const { updateProfile } = useAuthStore.getState();
        await updateProfile({ NotificationRadius: radius });
        set({ notificationRadius: radius });
        get().fetchNearbyVendors({ radius });
    },
    setHomeLocation: async (lat, lng, address) => {
        const { updateProfile } = useAuthStore.getState();
        await updateProfile({
            Latitude: lat,
            Longitude: lng,
            Address: address,
        });
        set({ homeCoordinates: { latitude: lat, longitude: lng, address } });
        get().fetchNearbyVendors();
    },
    addAlert: (alert) => {
        set((state) => ({
            alerts: [alert, ...state.alerts.filter((a) => a.id !== alert.id)],
            unreadAlertCount: state.unreadAlertCount + 1,
        }));
    },
}));
