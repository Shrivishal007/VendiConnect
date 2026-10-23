import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, RefreshControl, StatusBar, Alert, } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Search, MapPin, Clock, Star, Radio, ChevronRight, } from 'lucide-react-native';
import { useResidentStore } from '../store/useResidentStore';
import { useAuthStore } from '../store/useAuthStore';
import { RatingModal } from '../components/rating/RatingModal';
export const HomeScreen = ({ navigation }) => {
    const { categories, nearbyVendors, homeCoordinates, notificationRadius, isLoading, isLoadingVendors, loadInitialData, fetchNearbyVendors, setRadius, } = useResidentStore();
    const { profile } = useAuthStore();
    const [search, setSearch] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('');
    const [refreshing, setRefreshing] = useState(false);
    const [ratingVendor, setRatingVendor] = useState(null);
    useEffect(() => {
        loadInitialData();
    }, []);
    const onRefresh = async () => {
        setRefreshing(true);
        await loadInitialData();
        setRefreshing(false);
    };
    const handleRadiusChange = async (radius) => {
        try {
            await setRadius(radius);
        }
        catch (err) {
            Alert.alert('Could not update alert radius', err instanceof Error ? err.message : 'Please try again.');
        }
    };
    // Filter vendors by search and category
    const filteredVendors = nearbyVendors.filter((v) => {
        const matchesSearch = !search.trim() ||
            v.VendorName.toLowerCase().includes(search.toLowerCase()) ||
            v.Vehicle.toLowerCase().includes(search.toLowerCase());
        const matchesCategory = !selectedCategory || v.Category_ID === selectedCategory;
        return matchesSearch && matchesCategory;
    });
    return (<SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content"/>

      {/* Top Location Bar */}
      <View style={styles.topBar}>
        <View style={styles.locationGroup}>
          <View style={styles.locIconBox}>
            <MapPin size={16} color="#059669"/>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.locationLabel}>Active Community Area</Text>
            <Text style={styles.locationValue} numberOfLines={1}>
              {profile?.Address || homeCoordinates?.address || 'Location not set'}
            </Text>
          </View>
        </View>

        <TouchableOpacity style={styles.radiusPill} onPress={() => navigation.navigate('Preferences')}>
          <Radio size={12} color="#059669"/>
          <Text style={styles.radiusText}>{notificationRadius}m</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh}/>}>
        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Search size={16} color="#94a3b8" style={{ marginRight: 8 }}/>
          <TextInput style={styles.searchInput} placeholder="Search fresh vegetables, fruits, snacks..." placeholderTextColor="#94a3b8" value={search} onChangeText={setSearch}/>
        </View>

        {/* Quick Radius Buttons */}
        <View style={styles.radiusBar}>
          <Text style={styles.radiusBarLabel}>Alert Radius:</Text>
          {[200, 300, 500, 1000].map((r) => (<TouchableOpacity key={r} onPress={() => handleRadiusChange(r)} style={[
                styles.radiusChip,
                notificationRadius === r && styles.radiusChipActive,
            ]}>
              <Text style={[
                styles.radiusChipText,
                notificationRadius === r && styles.radiusChipTextActive,
            ]}>
                {r >= 1000 ? `${r / 1000}km` : `${r}m`}
              </Text>
            </TouchableOpacity>))}
        </View>

        {/* Categories Horizontal Carousel */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Trade Categories</Text>
          {selectedCategory ? (<TouchableOpacity onPress={() => setSelectedCategory('')}>
              <Text style={styles.clearFilterText}>Show All</Text>
            </TouchableOpacity>) : null}
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryScroll}>
          <TouchableOpacity onPress={() => setSelectedCategory('')} style={[
            styles.categoryCard,
            !selectedCategory && styles.categoryCardActive,
        ]}>
            <Text style={styles.categoryEmoji}>🏪</Text>
            <Text style={[
            styles.categoryName,
            !selectedCategory && styles.categoryNameActive,
        ]}>
              All
            </Text>
          </TouchableOpacity>

          {categories.map((cat) => (<TouchableOpacity key={cat._id} onPress={() => setSelectedCategory(cat._id === selectedCategory ? '' : cat._id)} style={[
                styles.categoryCard,
                selectedCategory === cat._id && styles.categoryCardActive,
            ]}>
              <Text style={styles.categoryEmoji}>🛒</Text>
              <Text style={[
                styles.categoryName,
                selectedCategory === cat._id && styles.categoryNameActive,
            ]} numberOfLines={1}>
                {cat.Name}
              </Text>
            </TouchableOpacity>))}
        </ScrollView>

        {/* Live Approaching Vendors Section */}
        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>Nearby Vendors ({filteredVendors.length})</Text>
            <Text style={styles.sectionSubtitle}>
              Within your {notificationRadius}m notification zone
            </Text>
          </View>
          <TouchableOpacity onPress={() => navigation.navigate('Map')} style={styles.mapLink}>
            <Text style={styles.mapLinkText}>View on Map</Text>
            <ChevronRight size={14} color="#059669"/>
          </TouchableOpacity>
        </View>

        {filteredVendors.length === 0 ? (<View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No vendors currently in this zone</Text>
            <Text style={styles.emptyDesc}>
              Try expanding your alert radius or check back soon as vendors start their rounds.
            </Text>
          </View>) : (<View style={styles.vendorGrid}>
            {filteredVendors.map((vendor) => (<View key={vendor.Vendor_ID} style={styles.vendorCard}>
                <View style={styles.cardTop}>
                  <View style={styles.vendorBadge}>
                    <Text style={styles.badgeEmoji}>🛒</Text>
                  </View>

                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.cardVendorName}>{vendor.VendorName}</Text>
                    <Text style={styles.cardVehicle}>{vendor.Vehicle}</Text>
                  </View>

                  <View style={styles.etaBox}>
                    <Clock size={12} color="#059669"/>
                    <Text style={styles.etaText}>~{vendor.etaMinutes ?? 4}m</Text>
                  </View>
                </View>

                <View style={styles.cardDivider}/>

                <View style={styles.cardBottom}>
                  <View style={styles.ratingGroup}>
                    <Star size={14} color="#f59e0b" fill="#f59e0b"/>
                    <Text style={styles.cardRating}>
                      {vendor.AvgRating ? vendor.AvgRating.toFixed(1) : 'New'}
                    </Text>
                    <Text style={styles.distanceText}>
                      • {(vendor.distanceKm * 1000).toFixed(0)}m away
                    </Text>
                  </View>

                  <TouchableOpacity onPress={() => setRatingVendor(vendor)} style={styles.quickRateBtn}>
                    <Star size={12} color="#059669"/>
                    <Text style={styles.quickRateText}>Rate</Text>
                  </TouchableOpacity>
                </View>
              </View>))}
          </View>)}
      </ScrollView>

      {/* Reusable Rating Modal */}
      {ratingVendor && (<RatingModal visible={Boolean(ratingVendor)} vendorId={ratingVendor.Vendor_ID} vendorName={ratingVendor.VendorName} onClose={() => setRatingVendor(null)} onSuccess={() => fetchNearbyVendors()}/>)}
    </SafeAreaView>);
};
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8fafc',
    },
    topBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 12,
        backgroundColor: '#ffffff',
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9',
    },
    locationGroup: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        flex: 1,
        marginRight: 12,
    },
    locIconBox: {
        width: 32,
        height: 32,
        borderRadius: 10,
        backgroundColor: '#ecfdf5',
        alignItems: 'center',
        justifyContent: 'center',
    },
    locationLabel: {
        fontSize: 10,
        fontWeight: '700',
        color: '#94a3b8',
        textTransform: 'uppercase',
    },
    locationValue: {
        fontSize: 13,
        fontWeight: '700',
        color: '#0f172a',
    },
    radiusPill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: '#ecfdf5',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 9999,
        borderWidth: 1,
        borderColor: '#a7f3d0',
    },
    radiusText: {
        fontSize: 11,
        fontWeight: '700',
        color: '#047857',
    },
    scrollContent: {
        padding: 20,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#ffffff',
        borderWidth: 1,
        borderColor: '#e2e8f0',
        borderRadius: 14,
        paddingHorizontal: 14,
        paddingVertical: 10,
        marginBottom: 14,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 3,
        elevation: 1,
    },
    searchInput: {
        flex: 1,
        fontSize: 13,
        color: '#0f172a',
    },
    radiusBar: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 20,
    },
    radiusBarLabel: {
        fontSize: 11,
        fontWeight: '600',
        color: '#64748b',
    },
    radiusChip: {
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 8,
        backgroundColor: '#ffffff',
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
    radiusChipActive: {
        backgroundColor: '#059669',
        borderColor: '#059669',
    },
    radiusChipText: {
        fontSize: 11,
        fontWeight: '600',
        color: '#64748b',
    },
    radiusChipTextActive: {
        color: '#ffffff',
        fontWeight: '700',
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        marginBottom: 12,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '800',
        color: '#0f172a',
    },
    sectionSubtitle: {
        fontSize: 11,
        color: '#64748b',
        marginTop: 2,
    },
    clearFilterText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#059669',
    },
    mapLink: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 2,
    },
    mapLinkText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#059669',
    },
    categoryScroll: {
        gap: 10,
        paddingBottom: 20,
    },
    categoryCard: {
        backgroundColor: '#ffffff',
        borderWidth: 1,
        borderColor: '#e2e8f0',
        borderRadius: 14,
        paddingHorizontal: 14,
        paddingVertical: 10,
        alignItems: 'center',
        minWidth: 80,
    },
    categoryCardActive: {
        backgroundColor: '#ecfdf5',
        borderColor: '#059669',
    },
    categoryEmoji: {
        fontSize: 18,
        marginBottom: 4,
    },
    categoryName: {
        fontSize: 11,
        fontWeight: '600',
        color: '#475569',
    },
    categoryNameActive: {
        color: '#047857',
        fontWeight: '700',
    },
    vendorGrid: {
        gap: 12,
    },
    vendorCard: {
        backgroundColor: '#ffffff',
        borderRadius: 16,
        padding: 14,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 6,
        elevation: 2,
    },
    cardTop: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    vendorBadge: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: '#ecfdf5',
        alignItems: 'center',
        justifyContent: 'center',
    },
    badgeEmoji: {
        fontSize: 20,
    },
    cardVendorName: {
        fontSize: 14,
        fontWeight: '700',
        color: '#0f172a',
    },
    cardVehicle: {
        fontSize: 11,
        color: '#64748b',
        marginTop: 2,
    },
    etaBox: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: '#ecfdf5',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
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
    cardBottom: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    ratingGroup: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    cardRating: {
        fontSize: 12,
        fontWeight: '700',
        color: '#1e293b',
    },
    distanceText: {
        fontSize: 11,
        color: '#94a3b8',
    },
    quickRateBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
        backgroundColor: '#f0fdf4',
        borderWidth: 1,
        borderColor: '#bbf7d0',
    },
    quickRateText: {
        fontSize: 11,
        fontWeight: '700',
        color: '#059669',
    },
    emptyCard: {
        backgroundColor: '#ffffff',
        borderRadius: 16,
        padding: 24,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        alignItems: 'center',
        textAlign: 'center',
    },
    emptyTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: '#334155',
        marginBottom: 4,
    },
    emptyDesc: {
        fontSize: 12,
        color: '#94a3b8',
        textAlign: 'center',
        lineHeight: 16,
    },
});
