import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Radio, RefreshCw } from 'lucide-react-native';
import { useResidentStore } from '../store/useResidentStore';
import { VendorMap } from '../components/map/VendorMap';
import { VendorBottomSheet } from '../components/vendor/VendorBottomSheet';
import { RatingModal } from '../components/rating/RatingModal';
export const MapScreen = () => {
    const { nearbyVendors, categories, homeCoordinates, notificationRadius, isLoadingVendors, fetchNearbyVendors, } = useResidentStore();
    const [selectedCategory, setSelectedCategory] = useState('');
    const [selectedVendor, setSelectedVendor] = useState(null);
    const [ratingVendor, setRatingVendor] = useState(null);
    const filteredVendors = nearbyVendors.filter((v) => {
        if (!selectedCategory)
            return true;
        return v.Category_ID === selectedCategory;
    });
    return (<SafeAreaView style={styles.container}>
      {/* Top Filter Bar */}
      <View style={styles.filterBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          <TouchableOpacity onPress={() => setSelectedCategory('')} style={[styles.filterChip, !selectedCategory && styles.filterChipActive]}>
            <Text style={[styles.filterChipText, !selectedCategory && styles.filterChipTextActive]}>
              All ({nearbyVendors.length})
            </Text>
          </TouchableOpacity>

          {categories.map((c) => (<TouchableOpacity key={c._id} onPress={() => setSelectedCategory(selectedCategory === c._id ? '' : c._id)} style={[styles.filterChip, selectedCategory === c._id && styles.filterChipActive]}>
              <Text style={[styles.filterChipText, selectedCategory === c._id && styles.filterChipTextActive]}>
                {c.Name}
              </Text>
            </TouchableOpacity>))}
        </ScrollView>
      </View>

      {/* Map View */}
      <View style={styles.mapArea}>
        {homeCoordinates ? (<VendorMap vendors={filteredVendors} homeLatitude={homeCoordinates.latitude} homeLongitude={homeCoordinates.longitude} notificationRadius={notificationRadius} onSelectVendor={(v) => setSelectedVendor(v)}/>) : (<View style={styles.locationPrompt}>
            <Text style={styles.locationPromptTitle}>Set your location</Text>
            <Text style={styles.locationPromptText}>
              Choose your current location in Perimeter preferences to see nearby vendors.
            </Text>
          </View>)}

        {/* Floating Refresh Control */}
        <TouchableOpacity style={styles.refreshFab} onPress={() => fetchNearbyVendors({ category: selectedCategory || undefined })} disabled={isLoadingVendors}>
          <RefreshCw size={18} color="#059669"/>
        </TouchableOpacity>

        {/* Radius Indicator Badge */}
        <View style={styles.radiusBadge}>
          <Radio size={12} color="#059669"/>
          <Text style={styles.radiusBadgeText}>{notificationRadius}m Alert Zone</Text>
        </View>

        {/* Vendor Detail Bottom Sheet */}
        {selectedVendor && (<VendorBottomSheet vendor={selectedVendor} onClose={() => setSelectedVendor(null)} onRate={(vendor) => {
                setSelectedVendor(null);
                setRatingVendor(vendor);
            }}/>)}
      </View>

      {/* Rating Modal */}
      {ratingVendor && (<RatingModal visible={Boolean(ratingVendor)} vendorId={ratingVendor.Vendor_ID} vendorName={ratingVendor.VendorName} onClose={() => setRatingVendor(null)} onSuccess={() => fetchNearbyVendors()}/>)}
    </SafeAreaView>);
};
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#ffffff',
    },
    filterBar: {
        paddingVertical: 10,
        backgroundColor: '#ffffff',
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9',
    },
    filterScroll: {
        paddingHorizontal: 16,
        gap: 8,
    },
    filterChip: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 10,
        backgroundColor: '#f8fafc',
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
    filterChipActive: {
        backgroundColor: '#059669',
        borderColor: '#059669',
    },
    filterChipText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#475569',
    },
    filterChipTextActive: {
        color: '#ffffff',
        fontWeight: '700',
    },
    mapArea: {
        flex: 1,
        position: 'relative',
    },
    locationPrompt: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        backgroundColor: '#f8fafc',
    },
    locationPromptTitle: {
        color: '#0f172a',
        fontSize: 17,
        fontWeight: '700',
    },
    locationPromptText: {
        marginTop: 8,
        color: '#64748b',
        fontSize: 13,
        lineHeight: 19,
        textAlign: 'center',
    },
    refreshFab: {
        position: 'absolute',
        top: 14,
        right: 14,
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#ffffff',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 4,
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
    radiusBadge: {
        position: 'absolute',
        top: 14,
        left: 14,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: '#ffffff',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 9999,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
    radiusBadgeText: {
        fontSize: 11,
        fontWeight: '700',
        color: '#059669',
    },
});
