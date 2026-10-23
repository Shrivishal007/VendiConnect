import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, StatusBar, Platform, } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Mail, MapPin, Bell, ShieldCheck, LogOut, } from 'lucide-react-native';
import { useAuthStore } from '../store/useAuthStore';
import { notificationService } from '../services/notificationService';
export const ProfileScreen = () => {
    const { profile, email, logout } = useAuthStore();
    const [isRegisteringPush, setIsRegisteringPush] = useState(false);
    const [pushStatus, setPushStatus] = useState(Platform.OS === 'web' ? 'Unavailable on web' : 'Active');
    const handleTestPush = async () => {
        setIsRegisteringPush(true);
        const token = await notificationService.registerForPushNotifications();
        setIsRegisteringPush(false);
        if (token) {
            setPushStatus('Connected & Registered');
            Alert.alert('Push Registered', 'Expo / FCM push token synchronized with backend.');
        }
        else {
            setPushStatus('Permission Required');
            Alert.alert('Notification Permission', 'Please enable notifications in device settings.');
        }
    };
    const handleLogout = () => {
        Alert.alert('Sign Out', 'Are you sure you want to sign out from VendiConnect?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Sign Out',
                style: 'destructive',
                onPress: async () => {
                    await logout();
                },
            },
        ]);
    };
    return (<SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content"/>

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Resident Profile</Text>
        <Text style={styles.subtitle}>Account details and privacy settings</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* User Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {profile?.Name ? profile.Name.charAt(0).toUpperCase() : 'R'}
            </Text>
          </View>

          <Text style={styles.profileName}>{profile?.Name || 'Resident Member'}</Text>
          <View style={styles.emailRow}>
            <Mail size={14} color="#64748b"/>
            <Text style={styles.profileEmail}>
              {email || profile?.Email || 'Authenticated Member'}
            </Text>
          </View>

          <View style={styles.idBadge}>
            <Text style={styles.idText}>
              Resident ID: {profile?.Resident_ID ? profile.Resident_ID.slice(-8) : 'Verified'}
            </Text>
          </View>
        </View>

        {/* Location & Notification Summary */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Neighborhood Location</Text>
          <View style={styles.infoRow}>
            <MapPin size={16} color="#059669"/>
            <Text style={styles.infoValue}>
              {profile?.Address || 'Location not set yet'}
            </Text>
          </View>
        </View>

        {/* Push Notification Channel */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <View>
              <Text style={styles.sectionTitle}>Push Notifications</Text>
              <Text style={styles.sectionSubtitle}>Status: {pushStatus}</Text>
            </View>
            <TouchableOpacity style={styles.pushTestBtn} onPress={handleTestPush} disabled={isRegisteringPush || Platform.OS === 'web'}>
              <Bell size={13} color="#059669"/>
              <Text style={styles.pushTestText}>
                {Platform.OS === 'web' ? 'Use Mobile App' : isRegisteringPush ? 'Checking...' : 'Check Token'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Community & Privacy Safeguards */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Privacy & Verification Rules</Text>
          <View style={styles.privacyItem}>
            <ShieldCheck size={16} color="#059669"/>
            <Text style={styles.privacyItemText}>
              Exact home coordinates are protected by server-side geofencing and never exposed to vendors.
            </Text>
          </View>
          <View style={styles.privacyItem}>
            <ShieldCheck size={16} color="#059669"/>
            <Text style={styles.privacyItemText}>
              Vendor ratings require a verified proximity alert in the last 2 hours to prevent fraudulent feedback.
            </Text>
          </View>
        </View>

        {/* Sign Out Button */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <LogOut size={16} color="#e11d48"/>
          <Text style={styles.logoutText}>Sign Out from Resident App</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>);
};
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8fafc',
    },
    header: {
        paddingHorizontal: 20,
        paddingVertical: 14,
        backgroundColor: '#ffffff',
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9',
    },
    title: {
        fontSize: 20,
        fontWeight: '800',
        color: '#0f172a',
    },
    subtitle: {
        fontSize: 11,
        color: '#64748b',
        marginTop: 2,
    },
    scrollContent: {
        padding: 20,
        gap: 16,
    },
    profileCard: {
        backgroundColor: '#ffffff',
        borderRadius: 20,
        padding: 24,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#e2e8f0',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 6,
        elevation: 2,
    },
    avatar: {
        width: 68,
        height: 68,
        borderRadius: 34,
        backgroundColor: '#ecfdf5',
        borderWidth: 2,
        borderColor: '#a7f3d0',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 12,
    },
    avatarText: {
        fontSize: 26,
        fontWeight: '800',
        color: '#059669',
    },
    profileName: {
        fontSize: 18,
        fontWeight: '800',
        color: '#0f172a',
    },
    profileEmail: {
        fontSize: 13,
        color: '#64748b',
    },
    emailRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    idBadge: {
        marginTop: 10,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
        backgroundColor: '#f1f5f9',
    },
    idText: {
        fontSize: 11,
        color: '#475569',
        fontFamily: 'monospace',
        fontWeight: '600',
    },
    sectionCard: {
        backgroundColor: '#ffffff',
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: '#0f172a',
        marginBottom: 8,
    },
    sectionSubtitle: {
        fontSize: 11,
        color: '#059669',
        fontWeight: '600',
    },
    sectionHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    infoValue: {
        fontSize: 13,
        color: '#334155',
        fontWeight: '500',
        flex: 1,
    },
    pushTestBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: '#ecfdf5',
        paddingHorizontal: 12,
        paddingVertical: 7,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#a7f3d0',
    },
    pushTestText: {
        fontSize: 11,
        fontWeight: '700',
        color: '#047857',
    },
    privacyItem: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 8,
        marginTop: 8,
    },
    privacyItemText: {
        flex: 1,
        fontSize: 11,
        color: '#64748b',
        lineHeight: 16,
    },
    logoutButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: '#fff1f2',
        borderWidth: 1,
        borderColor: '#fecdd3',
        paddingVertical: 14,
        borderRadius: 14,
        marginTop: 8,
    },
    logoutText: {
        fontSize: 13,
        fontWeight: '700',
        color: '#e11d48',
    },
});
