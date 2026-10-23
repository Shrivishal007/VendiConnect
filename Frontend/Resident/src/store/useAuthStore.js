import { create } from 'zustand';
import { createUserWithEmailAndPassword, getIdToken, signInWithEmailAndPassword, signOut, updateProfile as updateFirebaseProfile, } from 'firebase/auth';
import { residentService } from '../services/residentService';
import { auth } from '../services/firebase';
export const useAuthStore = create((set, get) => ({
    token: null,
    email: null,
    profile: null,
    isAuthenticated: false,
    isLoading: true,
    error: null,
    authenticateWithEmail: async (payload) => {
        set({ isLoading: true, error: null });
        try {
            const email = payload.email.trim().toLowerCase();
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                throw new Error('Please enter a valid email address.');
            }
            if (payload.mode === 'signUp' && payload.password.length < 8) {
                throw new Error('Password must be at least 8 characters.');
            }
            const credential = payload.mode === 'signUp'
                ? await createUserWithEmailAndPassword(auth, email, payload.password)
                : await signInWithEmailAndPassword(auth, email, payload.password);
            if (payload.mode === 'signUp' && payload.name?.trim()) {
                await updateFirebaseProfile(credential.user, { displayName: payload.name.trim() });
            }
            const idToken = await getIdToken(credential.user);
            const result = await residentService.syncResident({
                name: payload.mode === 'signUp' ? payload.name?.trim() : undefined,
                address: payload.mode === 'signUp' ? payload.address?.trim() : undefined,
                latitude: payload.mode === 'signUp' ? payload.latitude : undefined,
                longitude: payload.mode === 'signUp' ? payload.longitude : undefined,
            });
            if (!result.success || !result.data) {
                throw new Error('Unable to sync your resident profile.');
            }
            set({
                token: idToken,
                email,
                profile: result.data,
                isAuthenticated: true,
                isLoading: false,
                error: null,
            });
            return true;
        }
        catch (err) {
            const firebaseMessages = {
                'auth/email-already-in-use': 'An account already exists for this email. Sign in instead.',
                'auth/invalid-credential': 'Invalid email or password.',
                'auth/invalid-email': 'Please enter a valid email address.',
                'auth/weak-password': 'Choose a stronger password with at least 8 characters.',
                'auth/network-request-failed': 'Unable to connect to Firebase. Check your internet connection.',
                'auth/operation-not-allowed': 'Email/password sign-in is not enabled for this Firebase project.',
                'auth/user-disabled': 'This account has been disabled. Contact support.',
            };
            if (auth.currentUser) {
                try {
                    await signOut(auth);
                }
                catch (signOutError) {
                    console.error('[Auth] Unable to sign out after resident profile sync failed:', signOutError);
                }
            }
            set({
                isLoading: false,
                error: firebaseMessages[err.code] || err.message || 'Authentication failed',
            });
            return false;
        }
    },
    logout: async () => {
        await signOut(auth);
        set({
            token: null,
            email: null,
            profile: null,
            isAuthenticated: false,
            error: null,
        });
    },
    restoreSession: async () => {
        set({ isLoading: true });
        try {
            await auth.authStateReady();
            const user = auth.currentUser;
            if (!user) {
                set({ isAuthenticated: false, isLoading: false });
                return;
            }
            const token = await getIdToken(user);
            const res = await residentService.getMyProfile();
            if (res.success && res.data) {
                set({
                    token,
                    email: user.email,
                    profile: res.data,
                    isAuthenticated: true,
                    isLoading: false,
                });
            }
            else {
                await signOut(auth);
                set({ isAuthenticated: false, isLoading: false });
            }
        }
        catch {
            try {
                await signOut(auth);
            }
            catch (signOutError) {
                console.error('[Auth] Unable to clear an invalid Firebase session:', signOutError);
            }
            set({ isAuthenticated: false, isLoading: false });
        }
    },
    updateProfile: async (data) => {
        const current = get().profile;
        if (!current) {
            throw new Error('Resident profile is not available.');
        }
        const response = await residentService.updateMyProfile({
            name: data.Name,
            address: data.Address,
            latitude: data.Latitude ?? undefined,
            longitude: data.Longitude ?? undefined,
            notificationRadius: data.NotificationRadius,
        });
        set({ profile: response.data });
    },
}));
