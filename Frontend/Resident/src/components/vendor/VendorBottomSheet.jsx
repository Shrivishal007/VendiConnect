import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Star, Clock, MapPin, X, Shield } from 'lucide-react-native';
export const VendorBottomSheet = ({ vendor, onClose, onRate, }) => {
    if (!vendor)
        return null;
    const statusColors = {
        APPROACHING: { bg: '#ecfdf5', text: '#047857' },
        NEARBY: { bg: '#eff6ff', text: '#1d4ed8' },
        IN_ZONE: { bg: '#f5f3ff', text: '#6d28d9' },
        PASSING: { bg: '#fffbeb', text: '#b45309' },
        STALE: { bg: '#f1f5f9', text: '#64748b' },
        OFFLINE: { bg: '#f1f5f9', text: '#64748b' },
    };
    const currentStatus = vendor.status || 'NEARBY';
    const theme = statusColors[currentStatus] || statusColors.NEARBY;
    return (<View style={styles.sheet}>
      {/* Top Handle & Close */}
      <View style={styles.header}>
        <View style={styles.titleGroup}>
          <Text style={styles.vendorName}>{vendor.VendorName}</Text>
          <Text style={styles.vehicleText}>{vendor.Vehicle}</Text>
        </View>

        <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
          <X size={18} color="#94a3b8"/>
        </TouchableOpacity>
      </View>

      {/* Metrics Row */}
      <View style={styles.metricsRow}>
        <View style={styles.metricCard}>
          <View style={styles.metricIconRow}>
            <Clock size={14} color="#059669"/>
            <Text style={styles.metricLabel}>Walking ETA</Text>
          </View>
          <Text style={styles.metricValue}>
            {vendor.etaMinutes !== undefined ? `~${vendor.etaMinutes} min` : 'Calculating'}
          </Text>
        </View>

        <View style={styles.metricCard}>
          <View style={styles.metricIconRow}>
            <MapPin size={14} color="#3b82f6"/>
            <Text style={styles.metricLabel}>Distance</Text>
          </View>
          <Text style={styles.metricValue}>
            {vendor.distanceKm ? `${(vendor.distanceKm * 1000).toFixed(0)}m` : 'Nearby'}
          </Text>
        </View>

        <View style={styles.metricCard}>
          <View style={styles.metricIconRow}>
            <Star size={14} color="#f59e0b" fill="#f59e0b"/>
            <Text style={styles.metricLabel}>Rating</Text>
          </View>
          <Text style={styles.metricValue}>
            {vendor.AvgRating ? `${vendor.AvgRating.toFixed(1)} ★` : 'New'}
          </Text>
        </View>
      </View>

      {/* Status & Privacy Notice */}
      <View style={styles.statusRow}>
        <View style={[styles.statusPill, { backgroundColor: theme.bg }]}>
          <Text style={[styles.statusText, { color: theme.text }]}>
            {currentStatus.replace('_', ' ')}
          </Text>
        </View>

        <View style={styles.privacyGroup}>
          <Shield size={12} color="#64748b"/>
          <Text style={styles.privacyText}>Approximate location only</Text>
        </View>
      </View>

      {/* Action Buttons */}
      <View style={styles.actionRow}>
        <TouchableOpacity onPress={() => onRate(vendor)} style={styles.rateBtn}>
          <Star size={16} color="#ffffff" fill="#ffffff"/>
          <Text style={styles.rateBtnText}>Rate Vendor</Text>
        </TouchableOpacity>
      </View>
    </View>);
};
const styles = StyleSheet.create({
    sheet: {
        position: 'absolute',
        bottom: 16,
        left: 16,
        right: 16,
        backgroundColor: '#ffffff',
        borderRadius: 20,
        padding: 18,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 16,
        elevation: 8,
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 12,
    },
    titleGroup: {
        flex: 1,
    },
    vendorName: {
        fontSize: 16,
        fontWeight: '700',
        color: '#0f172a',
    },
    vehicleText: {
        fontSize: 12,
        color: '#64748b',
        marginTop: 2,
    },
    closeBtn: {
        padding: 4,
    },
    metricsRow: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 12,
    },
    metricCard: {
        flex: 1,
        backgroundColor: '#f8fafc',
        borderRadius: 12,
        padding: 8,
        borderWidth: 1,
        borderColor: '#f1f5f9',
    },
    metricIconRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginBottom: 2,
    },
    metricLabel: {
        fontSize: 10,
        fontWeight: '600',
        color: '#64748b',
    },
    metricValue: {
        fontSize: 13,
        fontWeight: '700',
        color: '#0f172a',
    },
    statusRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 14,
    },
    statusPill: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 9999,
    },
    statusText: {
        fontSize: 10,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    privacyGroup: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    privacyText: {
        fontSize: 10,
        color: '#94a3b8',
    },
    actionRow: {
        flexDirection: 'row',
    },
    rateBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        backgroundColor: '#059669',
        paddingVertical: 11,
        borderRadius: 12,
        shadowColor: '#059669',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.2,
        shadowRadius: 6,
        elevation: 2,
    },
    rateBtnText: {
        fontSize: 13,
        fontWeight: '700',
        color: '#ffffff',
    },
});
