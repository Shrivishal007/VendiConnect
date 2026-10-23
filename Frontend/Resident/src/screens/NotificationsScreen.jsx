import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar, RefreshControl, ActivityIndicator, } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Bell, MapPin, Clock, Star, ShieldCheck, Inbox, CheckCheck } from 'lucide-react-native';
import { useResidentStore } from '../store/useResidentStore';
import { RatingModal } from '../components/rating/RatingModal';
export const NotificationsScreen = ({ navigation }) => {
    const { alerts, unreadAlertCount, isLoadingAlerts, fetchAlerts, markAlertRead, markAllAlertsRead, } = useResidentStore();
    const [ratingVendor, setRatingVendor] = useState(null);
    const [refreshing, setRefreshing] = useState(false);
    useEffect(() => {
        fetchAlerts();
    }, []);
    const onRefresh = async () => {
        setRefreshing(true);
        await fetchAlerts();
        setRefreshing(false);
    };
    const handleAlertPress = async (alert) => {
        if (!alert.read) {
            await markAlertRead(alert.id);
        }
        if (navigation && alert.vendorId) {
            navigation.navigate('Map', { focusVendorId: alert.vendorId });
        }
    };
    return (<SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content"/>

      {/* Screen Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Neighborhood Alerts</Text>
          <Text style={styles.subtitle}>
            {unreadAlertCount > 0
            ? `${unreadAlertCount} unread proximity alert${unreadAlertCount > 1 ? 's' : ''}`
            : 'Real-time vendor arrival notices'}
          </Text>
        </View>

        {unreadAlertCount > 0 && (<TouchableOpacity style={styles.markAllBtn} onPress={() => markAllAlertsRead()} activeOpacity={0.8}>
            <CheckCheck size={14} color="#059669"/>
            <Text style={styles.markAllBtnText}>Mark all read</Text>
          </TouchableOpacity>)}
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#059669']}/>}>
        {/* Info Banner */}
        <View style={styles.infoBanner}>
          <ShieldCheck size={16} color="#059669" style={{ marginTop: 2 }}/>
          <Text style={styles.infoText}>
            Proximity alerts trigger automatically when eligible vendors enter your configured notification zone.
          </Text>
        </View>

        {isLoadingAlerts && alerts.length === 0 ? (<View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color="#059669"/>
            <Text style={styles.loadingText}>Checking for nearby alerts...</Text>
          </View>) : alerts.length === 0 ? (<View style={styles.emptyContainer}>
            <View style={styles.emptyIconBox}>
              <Inbox size={32} color="#94a3b8"/>
            </View>
            <Text style={styles.emptyTitle}>No Proximity Alerts Yet</Text>
            <Text style={styles.emptyDesc}>
              When registered vendors share their live location within your neighborhood perimeter, automated alerts with walking ETA will appear here.
            </Text>
          </View>) : (<View style={styles.alertList}>
            {alerts.map((alert) => (<TouchableOpacity key={alert.id} style={[styles.alertCard, !alert.read && styles.unreadCard]} onPress={() => handleAlertPress(alert)} activeOpacity={0.85}>
                <View style={styles.alertTop}>
                  <View style={[styles.alertBadge, !alert.read ? styles.unreadBadge : styles.readBadge]}>
                    <Bell size={18} color={!alert.read ? '#059669' : '#94a3b8'}/>
                  </View>

                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <View style={styles.nameRow}>
                      <Text style={styles.vendorName}>{alert.vendorName}</Text>
                      {!alert.read && <View style={styles.unreadDot}/>}
                    </View>
                    <Text style={styles.categoryName}>
                      {alert.categoryName || 'General Trade'} • {alert.vehicle || 'Push Cart'}
                    </Text>
                  </View>

                  <View style={styles.etaPill}>
                    <Clock size={12} color="#059669"/>
                    <Text style={styles.etaText}>~{alert.etaMinutes} min</Text>
                  </View>
                </View>

                <View style={styles.cardDivider}/>

                <View style={styles.alertBottom}>
                  <View style={styles.distanceBox}>
                    <MapPin size={13} color="#64748b"/>
                    <Text style={styles.distanceText}>
                      {alert.distanceMeters}m away •{' '}
                      {new Date(alert.timestamp).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                })}
                    </Text>
                  </View>

                  {alert.canRate && (<TouchableOpacity style={styles.rateButton} onPress={(e) => {
                        e.stopPropagation();
                        setRatingVendor({ id: alert.vendorId, name: alert.vendorName });
                    }}>
                      <Star size={13} color="#f59e0b" fill="#f59e0b"/>
                      <Text style={styles.rateButtonText}>Rate Vendor</Text>
                    </TouchableOpacity>)}
                </View>
              </TouchableOpacity>))}
          </View>)}
      </ScrollView>

      {/* Rating Modal */}
      {ratingVendor && (<RatingModal visible={Boolean(ratingVendor)} vendorId={ratingVendor.id} vendorName={ratingVendor.name} onClose={() => setRatingVendor(null)}/>)}
    </SafeAreaView>);
};
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8fafc',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
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
        fontSize: 12,
        color: '#64748b',
        marginTop: 2,
    },
    markAllBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: '#ecfdf5',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#a7f3d0',
    },
    markAllBtnText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#047857',
    },
    scrollContent: {
        padding: 16,
    },
    infoBanner: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 10,
        backgroundColor: '#ecfdf5',
        borderRadius: 12,
        padding: 12,
        borderWidth: 1,
        borderColor: '#a7f3d0',
        marginBottom: 16,
    },
    infoText: {
        flex: 1,
        fontSize: 12,
        color: '#065f46',
        lineHeight: 18,
    },
    loadingContainer: {
        paddingVertical: 40,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
    },
    loadingText: {
        fontSize: 13,
        color: '#64748b',
    },
    emptyContainer: {
        backgroundColor: '#ffffff',
        borderRadius: 16,
        padding: 32,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#e2e8f0',
        marginTop: 10,
    },
    emptyIconBox: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: '#f1f5f9',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
    emptyTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#0f172a',
        marginBottom: 8,
    },
    emptyDesc: {
        fontSize: 13,
        color: '#64748b',
        textAlign: 'center',
        lineHeight: 20,
    },
    alertList: {
        gap: 12,
    },
    alertCard: {
        backgroundColor: '#ffffff',
        borderRadius: 14,
        padding: 14,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 4,
        elevation: 1,
    },
    unreadCard: {
        borderColor: '#6ee7b7',
        backgroundColor: '#fdfffe',
    },
    alertTop: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    alertBadge: {
        width: 38,
        height: 38,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    unreadBadge: {
        backgroundColor: '#ecfdf5',
    },
    readBadge: {
        backgroundColor: '#f1f5f9',
    },
    nameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    vendorName: {
        fontSize: 15,
        fontWeight: '700',
        color: '#0f172a',
    },
    unreadDot: {
        width: 7,
        height: 7,
        borderRadius: 4,
        backgroundColor: '#059669',
    },
    categoryName: {
        fontSize: 12,
        color: '#64748b',
        marginTop: 2,
    },
    etaPill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: '#ecfdf5',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#a7f3d0',
    },
    etaText: {
        fontSize: 11,
        fontWeight: '700',
        color: '#047857',
    },
    cardDivider: {
        height: 1,
        backgroundColor: '#f1f5f9',
        marginVertical: 10,
    },
    alertBottom: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    distanceBox: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    distanceText: {
        fontSize: 12,
        color: '#64748b',
    },
    rateButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: '#fffbeb',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: '#fde68a',
    },
    rateButtonText: {
        fontSize: 11,
        fontWeight: '700',
        color: '#b45309',
    },
});
