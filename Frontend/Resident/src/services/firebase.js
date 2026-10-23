import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApp, getApps, initializeApp } from 'firebase/app';
import { getAuth, 
// Firebase exposes this through its React Native conditional export.
// @ts-expect-error The package's top-level type declarations omit the React Native export.
getReactNativePersistence, initializeAuth, } from 'firebase/auth';
import { Platform } from 'react-native';
const firebaseConfig = {
    apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};
const missingConfig = Object.entries(firebaseConfig)
    .filter(([, value]) => !value || value.startsWith('YOUR_'))
    .map(([key]) => key);
if (missingConfig.length > 0) {
    throw new Error(`Firebase is not configured. Set these Resident environment variables: ${missingConfig.join(', ')}`);
}
const firebaseApp = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
function getFirebaseAuth() {
    if (Platform.OS === 'web')
        return getAuth(firebaseApp);
    try {
        return initializeAuth(firebaseApp, {
            persistence: getReactNativePersistence(AsyncStorage),
        });
    }
    catch (error) {
        if (error.code === 'auth/already-initialized') {
            return getAuth(firebaseApp);
        }
        throw error;
    }
}
export const auth = getFirebaseAuth();
