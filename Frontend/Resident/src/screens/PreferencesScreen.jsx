import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, ActivityIndicator, Alert, StatusBar, Platform, } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MapPin, Check, Shield, Navigation, Save, CheckCircle2, } from 'lucide-react-native';
import * as Location from 'expo-location';
import { useResidentStore } from '../store/useResidentStore';
import { useAuthStore } from '../store/useAuthStore';
const MAX_SELECTED_CATEGORIES = 10;
export const PreferencesScreen = () => {
    const { categories, selectedCategoryIds, homeCoordinates, notificationRadius, setRadius, setHomeLocation, savePreferences, } = useResidentStore();
    const { profile, updateProfile } = useAuthStore();
    const [address, setAddress] = useState(profile?.Address || homeCoordinates?.address || '');
    const [radius, setLocalRadius] = useState(profile?.NotificationRadius || notificationRadius);
    const [selectedCats, setSelectedCats] = useState(selectedCategoryIds);
    const [isLocating, setIsLocating] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [savedSuccess, setSavedSuccess] = useState(false);
    // Initialize selected categories if loaded
    useEffect(() => {
        if (selectedCategoryIds.length > 0) {
            setSelectedCats(selectedCategoryIds);
        }
    }, [selectedCategoryIds]);
    const handleUseCurrentLocation = async () => {
        setIsLocating(true);
        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Location Permission', 'Enable location permission in your device settings to set your current location.');
                setIsLocating(false);
                return;
            }
            const location = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.Balanced,
            });
            const lat = location.coords.latitude;
            const lng = location.coords.longitude;
            let streetAddress = 'Current location';
            if (Platform.OS !== 'web') {
                try {
                    const [geocoded] = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
                    if (geocoded) {
                        streetAddress = [
                            geocoded.name || geocoded.street,
                            geocoded.subregion || geocoded.city,
                            geocoded.region,
                        ]
                            .filter(Boolean)
                            .join(', ') || streetAddress;
                    }
                }
                catch (error) {
                    console.warn('[Location] Reverse geocoding failed; using coordinates only.', error);
                }
            }
            setAddress(streetAddress);
            await setHomeLocation(lat, lng, streetAddress);
            Alert.alert('Location Updated', `Home location set to ${streetAddress}`);
        }
        catch (err) {
            Alert.alert('GPS Unavailable', err.message || 'Could not fetch current GPS location.');
        }
        finally {
            setIsLocating(false);
        }
    };
    const handleToggleCat = (catId) => {
        if (selectedCats.includes(catId)) {
            setSelectedCats(selectedCats.filter((id) => id !== catId));
        }
        else if (selectedCats.length >= MAX_SELECTED_CATEGORIES) {
            Alert.alert('Preference limit reached', `Choose up to ${MAX_SELECTED_CATEGORIES} categories.`);
        }
        else {
            setSelectedCats([...selectedCats, catId]);
        }
    };
    const handleSaveAll = async () => {
        setIsSaving(true);
        try {
            await setRadius(radius);
            await updateProfile({
                Address: address,
            });
            await savePreferences(selectedCats);
            setSavedSuccess(true);
            setTimeout(() => setSavedSuccess(false), 2000);
        }
        catch (err) {
            Alert.alert('Save Failed', err.message || 'Could not save preferences.');
        }
        finally {
            setIsSaving(false);
        }
    };
    return (<SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content"/>

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Preferences</Text>
          <Text style={styles.subtitle}>Configure alert perimeter & vendor categories</Text>
        </View>

        <TouchableOpacity style={[styles.saveHeaderBtn, isSaving && { opacity: 0.6 }]} onPress={handleSaveAll} disabled={isSaving}>
          {isSaving ? (<ActivityIndicator size="small" color="#fff"/>) : savedSuccess ? (<CheckCircle2 size={16} color="#ffffff"/>) : (<Save size={16} color="#ffffff"/>)}
          <Text style={styles.saveHeaderText}>
            {savedSuccess ? 'Saved!' : 'Save'}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Privacy Card */}
        <View style={styles.privacyCard}>
          <Shield size={18} color="#059669" style={{ marginTop: 2 }}/>
          <View style={{ flex: 1 }}>
            <Text style={styles.privacyTitle}>Privacy Architecture</Text>
            <Text style={styles.privacyDesc}>
              Your exact home location is never exposed to vendors or other users. VendiConnect uses server-side geofence matching to dispatch alerts without broadcasting your coordinates.
            </Text>
          </View>
        </View>

        {/* Home Location Section */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Home Location</Text>
          <Text style={styles.sectionSubtitle}>
            Your primary neighborhood where vendor proximity alerts will be triggered
          </Text>

          <View style={styles.addressInputBox}>
            <MapPin size={16} color="#94a3b8" style={{ marginTop: 2 }}/>
            <TextInput style={styles.addressInput} value={address} onChangeText={setAddress} placeholder="Neighborhood label (optional)" placeholderTextColor="#94a3b8" multiline/>
          </View>

          <TouchableOpacity style={styles.gpsButton} onPress={handleUseCurrentLocation} disabled={isLocating}>
            {isLocating ? (<ActivityIndicator size="small" color="#059669"/>) : (<Navigation size={15} color="#059669"/>)}
            <Text style={styles.gpsButtonText}>
              {isLocating ? 'Detecting GPS...' : 'Use Current Device Location'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Alert Perimeter Radius Selection */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Notification Radius</Text>
          <Text style={styles.sectionSubtitle}>
            How close should a vendor be before sending you a proximity alert?
          </Text>

          <View style={styles.radiusGrid}>
            {[
            { val: 200, label: '200 meters', desc: 'Immediate street (~2 min walk)' },
            { val: 300, label: '300 meters', desc: 'Nearby corner (~3 min walk)' },
            { val: 500, label: '500 meters', desc: 'Neighborhood (~5 min walk)' },
            { val: 1000, label: '1 kilometer', desc: 'Wider community (~10 min walk)' },
        ].map((option) => (<TouchableOpacity key={option.val} style={[
                styles.radiusCard,
                radius === option.val && styles.radiusCardActive,
            ]} onPress={() => setLocalRadius(option.val)}>
                <View style={styles.radiusCardHeader}>
                  <Text style={[
                styles.radiusCardTitle,
                radius === option.val && styles.radiusCardTitleActive,
            ]}>
                    {option.label}
                  </Text>
                  {radius === option.val && (<View style={styles.checkedCircle}>
                      <Check size={12} color="#ffffff"/>
                    </View>)}
                </View>
                <Text style={[
                styles.radiusCardDesc,
                radius === option.val && styles.radiusCardDescActive,
            ]}>
                  {option.desc}
                </Text>
              </TouchableOpacity>))}
          </View>
        </View>

        {/* Subscribed Trade Categories */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Subscribed Vendor Categories</Text>
          <Text style={styles.sectionSubtitle}>
            Choose up to {MAX_SELECTED_CATEGORIES} categories for alerts ({selectedCats.length} selected).
          </Text>

          <View style={styles.catGrid}>
            {categories.map((cat) => {
            const isSelected = selectedCats.includes(cat._id);
            return (<TouchableOpacity key={cat._id} style={[styles.catCard, isSelected && styles.catCardActive]} onPress={() => handleToggleCat(cat._id)}>
                  <View style={styles.catCardLeft}>
                    <Text style={styles.catEmoji}>🛒</Text>
                    <Text style={[styles.catName, isSelected && styles.catNameActive]}>
                      {cat.Name}
                    </Text>
                  </View>

                  <View style={[styles.catCheckbox, isSelected && styles.catCheckboxActive]}>
                    {isSelected && <Check size={12} color="#ffffff"/>}
                  </View>
                </TouchableOpacity>);
        })}
          </View>
        </View>
      </ScrollView>
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
        fontSize: 11,
        color: '#64748b',
        marginTop: 2,
    },
    saveHeaderBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: '#059669',
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 10,
        shadowColor: '#059669',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 2,
    },
    saveHeaderText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#ffffff',
    },
    scrollContent: {
        padding: 20,
        gap: 16,
    },
    privacyCard: {
        flexDirection: 'row',
        gap: 12,
        backgroundColor: '#ecfdf5',
        borderRadius: 16,
        padding: 14,
        borderWidth: 1,
        borderColor: '#a7f3d0',
    },
    privacyTitle: {
        fontSize: 13,
        fontWeight: '700',
        color: '#065f46',
    },
    privacyDesc: {
        fontSize: 11,
        color: '#047857',
        marginTop: 2,
        lineHeight: 16,
    },
    sectionCard: {
        backgroundColor: '#ffffff',
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
    sectionTitle: {
        fontSize: 15,
        fontWeight: '700',
        color: '#0f172a',
    },
    sectionSubtitle: {
        fontSize: 11,
        color: '#64748b',
        marginTop: 2,
        marginBottom: 14,
        lineHeight: 16,
    },
    addressInputBox: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 8,
        backgroundColor: '#f8fafc',
        borderWidth: 1,
        borderColor: '#cbd5e1',
        borderRadius: 12,
        padding: 10,
        marginBottom: 10,
    },
    addressInput: {
        flex: 1,
        fontSize: 13,
        color: '#0f172a',
        minHeight: 40,
        textAlignVertical: 'top',
    },
    gpsButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        backgroundColor: '#ecfdf5',
        paddingVertical: 10,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#a7f3d0',
    },
    gpsButtonText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#059669',
    },
    radiusGrid: {
        gap: 8,
    },
    radiusCard: {
        padding: 12,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        backgroundColor: '#f8fafc',
    },
    radiusCardActive: {
        backgroundColor: '#ecfdf5',
        borderColor: '#059669',
    },
    radiusCardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    radiusCardTitle: {
        fontSize: 13,
        fontWeight: '700',
        color: '#334155',
    },
    radiusCardTitleActive: {
        color: '#047857',
    },
    radiusCardDesc: {
        fontSize: 11,
        color: '#64748b',
        marginTop: 2,
    },
    radiusCardDescActive: {
        color: '#059669',
    },
    checkedCircle: {
        width: 18,
        height: 18,
        borderRadius: 9,
        backgroundColor: '#059669',
        alignItems: 'center',
        justifyContent: 'center',
    },
    catGrid: {
        gap: 8,
    },
    catCard: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        backgroundColor: '#f8fafc',
    },
    catCardActive: {
        backgroundColor: '#ecfdf5',
        borderColor: '#059669',
    },
    catCardLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    catEmoji: {
        fontSize: 16,
    },
    catName: {
        fontSize: 13,
        fontWeight: '600',
        color: '#334155',
    },
    catNameActive: {
        color: '#047857',
        fontWeight: '700',
    },
    catCheckbox: {
        width: 20,
        height: 20,
        borderRadius: 6,
        borderWidth: 1.5,
        borderColor: '#cbd5e1',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#ffffff',
    },
    catCheckboxActive: {
        backgroundColor: '#059669',
        borderColor: '#059669',
    },
});
