import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { residentService } from './residentService';
// Configure foreground notification presentation behavior
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
    }),
});
export const notificationService = {
    // Register for push notifications and submit token to backend
    async registerForPushNotifications() {
        if (Platform.OS === 'web') {
            return null;
        }
        try {
            const { status: existingStatus } = await Notifications.getPermissionsAsync();
            let finalStatus = existingStatus;
            if (existingStatus !== 'granted') {
                const { status } = await Notifications.requestPermissionsAsync();
                finalStatus = status;
            }
            if (finalStatus !== 'granted') {
                console.log('[Notifications] Permission not granted');
                return null;
            }
            // Android Channel Setup
            if (Platform.OS === 'android') {
                await Notifications.setNotificationChannelAsync('vendiconnect-alerts', {
                    name: 'Vendor Proximity Alerts',
                    importance: Notifications.AndroidImportance.MAX,
                    vibrationPattern: [0, 250, 250, 250],
                    lightColor: '#059669',
                });
            }
            const tokenData = await Notifications.getExpoPushTokenAsync();
            const token = tokenData.data;
            // Update backend with FCM/Expo token if authenticated
            if (token) {
                try {
                    await residentService.updateFcmToken(token);
                }
                catch (err) {
                    console.log('[Notifications] Failed to sync token with backend:', err);
                }
            }
            return token;
        }
        catch (error) {
            console.log('[Notifications] Registration error:', error);
            return null;
        }
    },
    // Setup listeners for foreground alerts and user interactions
    subscribeToNotifications(onReceived, onResponse) {
        const receivedSubscription = Notifications.addNotificationReceivedListener(onReceived);
        const responseSubscription = Notifications.addNotificationResponseReceivedListener(onResponse);
        return () => {
            receivedSubscription.remove();
            responseSubscription.remove();
        };
    },
    // Local simulated alert for developer testing
    async triggerTestAlert(vendorName, etaMinutes) {
        await Notifications.scheduleNotificationAsync({
            content: {
                title: '🛒 Vendor Approaching!',
                body: `${vendorName} is approaching your neighborhood! Estimated arrival in ${etaMinutes} minutes.`,
                data: { vendorName, etaMinutes, type: 'PROXIMITY_ALERT' },
            },
            trigger: null, // immediate
        });
    },
};
