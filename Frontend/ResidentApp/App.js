import React, { useState, useRef, useEffect } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  TextInput, 
  ScrollView, 
  TouchableOpacity, 
  Dimensions,
  Animated
} from 'react-native';
import { SafeAreaView, SafeAreaProvider } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';

const INITIAL_VENDORS = [
  { 
    id: 1, 
    name: "Santhosh Poo Kadai", 
    category: "Flowers", 
    vehicle: "Pushcart", 
    rating: 4.8, 
    distance: "120m away", 
    eta: "2 mins",
    speed: "3.5 km/h",
    phone: "+91 93847 66429", 
    lat: 13.0827, 
    lng: 80.2707, 
    heading: 45,
    items: "Jasmine, Rose, Marigold, Garlands",
    isLive: true,
    route: [
      [13.0827, 80.2707],
      [13.0835, 80.2715],
      [13.0842, 80.2722],
      [13.0850, 80.2730]
    ]
  },
  { 
    id: 2, 
    name: "Fresh Veg Cart", 
    category: "Vegetables", 
    vehicle: "Pushcart", 
    rating: 4.5, 
    distance: "340m away", 
    eta: "5 mins",
    speed: "2.8 km/h",
    phone: "+91 98401 23456", 
    lat: 13.0850, 
    lng: 80.2750, 
    heading: 180,
    items: "Tomato, Onion, Potato, Fresh Greens",
    isLive: true,
    route: [
      [13.0850, 80.2750],
      [13.0840, 80.2745],
      [13.0830, 80.2740]
    ]
  },
  { 
    id: 3, 
    name: "Kannan Fish Stall", 
    category: "Fish & Seafood", 
    vehicle: "Auto-rickshaw", 
    rating: 4.9, 
    distance: "550m away", 
    eta: "7 mins",
    speed: "12 km/h",
    phone: "+91 94440 98765", 
    lat: 13.0780, 
    lng: 80.2650, 
    heading: 90,
    items: "Seer Fish, Prawns, Crab, Vanjaram",
    isLive: true,
    route: [
      [13.0780, 80.2650],
      [13.0790, 80.2670],
      [13.0800, 80.2690]
    ]
  },
  { 
    id: 4, 
    name: "Morning Tiffin Point", 
    category: "Breakfast & Tiffin", 
    vehicle: "Van", 
    rating: 4.7, 
    distance: "210m away", 
    eta: "3 mins",
    speed: "0 km/h (Stationary)",
    phone: "+91 97910 11223", 
    lat: 13.0900, 
    lng: 80.2720, 
    heading: 0,
    items: "Hot Idli, Medu Vada, Filter Coffee",
    isLive: false,
    route: []
  },
  { 
    id: 5, 
    name: "Kovai Fruit Stall", 
    category: "Fruits", 
    vehicle: "Pushcart", 
    rating: 4.6, 
    distance: "400m away", 
    eta: "6 mins",
    speed: "3.1 km/h",
    phone: "+91 98840 55667", 
    lat: 13.0810, 
    lng: 80.2770, 
    heading: 270,
    items: "Banana, Apple, Papaya, Sweet Corn",
    isLive: true,
    route: [
      [13.0810, 80.2770],
      [13.0818, 80.2760],
      [13.0825, 80.2750]
    ]
  },
];

const CATEGORIES = ["All", "Vegetables", "Fruits", "Flowers", "Fish & Seafood", "Breakfast & Tiffin"];

export default function App() {
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedVendor, setSelectedVendor] = useState(INITIAL_VENDORS[0]);
  const webViewRef = useRef(null);

  // Pulse animation for Live radar badge
  const pulseAnim = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.3, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1.0, duration: 800, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const filteredVendors = INITIAL_VENDORS.filter(v => {
    const matchesCategory = selectedCategory === "All" || v.category === selectedCategory;
    const matchesSearch = v.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          v.items.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const mapHtml = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
        <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
        <style>
            body { padding: 0; margin: 0; font-family: -apple-system, sans-serif; }
            html, body, #map { height: 100%; width: 100%; }

            /* Pulsing radar for live vendors */
            .pulse-icon {
                position: relative;
                width: 32px;
                height: 32px;
                border-radius: 50%;
                background: #15803d;
                border: 3px solid white;
                box-shadow: 0 2px 6px rgba(0,0,0,0.3);
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 16px;
            }
            .pulse-ring {
                position: absolute;
                width: 100%;
                height: 100%;
                border-radius: 50%;
                border: 3px solid #22c55e;
                animation: ripple 1.6s ease-out infinite;
            }
            @keyframes ripple {
                0% { transform: scale(1); opacity: 1; }
                100% { transform: scale(2.4); opacity: 0; }
            }

            .leaflet-popup-content-wrapper { border-radius: 14px; padding: 6px; box-shadow: 0 4px 16px rgba(0,0,0,0.2); }
            .custom-popup h4 { margin: 0 0 4px 0; color: #166534; font-size: 15px; }
            .custom-popup p { margin: 0; font-size: 12px; color: #555; }
            .custom-popup .live-tag { display: inline-flex; align-items: center; background: #dcfce7; color: #15803d; padding: 2px 8px; border-radius: 99px; font-weight: 700; font-size: 11px; margin-top: 6px; }
            .custom-popup .live-dot { width: 6px; height: 6px; border-radius: 50%; background: #22c55e; margin-right: 4px; }
        </style>
    </head>
    <body>
        <div id="map"></div>
        <script>
            var map = L.map('map', { zoomControl: false }).setView([13.0835, 80.2720], 14);
            L.control.zoom({ position: 'topright' }).addTo(map);

            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                maxZoom: 19,
                attribution: '© OpenStreetMap'
            }).addTo(map);

            var vendors = ${JSON.stringify(filteredVendors)};
            var markers = {};
            var paths = {};

            function getVehicleEmoji(type) {
                if (type.includes("Pushcart")) return "🛒";
                if (type.includes("Auto")) return "🛺";
                if (type.includes("Van")) return "🚐";
                return "🚲";
            }

            function createPulseIcon(vendor) {
                var emoji = getVehicleEmoji(vendor.vehicle);
                return L.divIcon({
                    className: 'custom-div-icon',
                    html: '<div class="pulse-icon"><div class="pulse-ring"></div>' + emoji + '</div>',
                    iconSize: [32, 32],
                    iconAnchor: [16, 16]
                });
            }

            // Render initial vendors and routes
            vendors.forEach(function(v) {
                var icon = createPulseIcon(v);
                var marker = L.marker([v.lat, v.lng], { icon: icon }).addTo(map);
                
                marker.bindPopup(
                  '<div class="custom-popup">' +
                    '<h4>' + v.name + '</h4>' +
                    '<p><b>Vehicle:</b> ' + v.vehicle + ' | ⭐ ' + v.rating + '</p>' +
                    '<p style="margin-top:2px; font-size:11px; color:#666;">' + v.items + '</p>' +
                    '<div class="live-tag"><span class="live-dot"></span>LIVE • ETA: ' + v.eta + ' (' + v.distance + ')</div>' +
                  '</div>'
                );

                marker.on('click', function() {
                    window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'SELECT_VENDOR', data: v }));
                });

                markers[v.id] = { marker: marker, data: v, step: 0 };

                // Draw live trail path
                if (v.route && v.route.length > 0) {
                    var poly = L.polyline(v.route, { color: '#15803d', weight: 4, dashArray: '6, 8', opacity: 0.7 }).addTo(map);
                    paths[v.id] = poly;
                }
            });

            // REAL-TIME SIMULATION: Vendors advance along streets
            setInterval(function() {
                vendors.forEach(function(v) {
                    if (!v.isLive || !v.route || v.route.length < 2) return;

                    var mObj = markers[v.id];
                    if (!mObj) return;

                    mObj.step = (mObj.step + 1) % v.route.length;
                    var nextCoords = v.route[mObj.step];

                    // Smooth marker pan
                    mObj.marker.setLatLng(nextCoords);

                    // Send live GPS telemetry update back to React Native
                    window.ReactNativeWebView.postMessage(JSON.stringify({
                        type: 'TELEMETRY_UPDATE',
                        vendorId: v.id,
                        lat: nextCoords[0],
                        lng: nextCoords[1],
                        distance: (100 + Math.floor(Math.random() * 80)) + 'm away',
                        eta: (Math.max(1, 4 - mObj.step)) + ' mins'
                    }));
                });
            }, 2500);
        </script>
    </body>
    </html>
  `;

  const handleMessage = (event) => {
    try {
      const payload = JSON.parse(event.nativeEvent.data);
      if (payload.type === 'SELECT_VENDOR') {
        setSelectedVendor(payload.data);
      } else if (payload.type === 'TELEMETRY_UPDATE') {
        if (selectedVendor && selectedVendor.id === payload.vendorId) {
          setSelectedVendor(prev => ({
            ...prev,
            distance: payload.distance,
            eta: payload.eta
          }));
        }
      }
    } catch (e) {
      console.log('Error handling WebView message', e);
    }
  };

  return (
    <SafeAreaProvider style={{ flex: 1 }}>
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        {/* Header & Live Status */}
        <View style={styles.header}>
          <View style={styles.headerTitleRow}>
            <View>
              <Text style={styles.brandTitle}>VendiConnect 🛒</Text>
              <Text style={styles.subTitle}>Street Vendors • Live GPS Radar</Text>
            </View>

            {/* Pulsing Live Tracking Indicator */}
            <View style={styles.liveBadge}>
              <Animated.View style={[styles.liveDot, { transform: [{ scale: pulseAnim }] }]} />
              <Text style={styles.liveText}>GPS Active</Text>
            </View>
          </View>

          {/* Search Bar */}
          <View style={styles.searchBar}>
            <Text style={styles.searchIcon}>🔍</Text>
            <TextInput
              style={styles.searchInput}
              placeholder="Search by vendor, vegetable, flowers..."
              placeholderTextColor="#9ca3af"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery("")}>
                <Text style={styles.clearSearch}>✕</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Category Filter Chips */}
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false} 
            contentContainerStyle={styles.categoryScroll}
          >
            {CATEGORIES.map(cat => {
              const active = selectedCategory === cat;
              return (
                <TouchableOpacity
                  key={cat}
                  style={[styles.categoryChip, active && styles.categoryChipActive]}
                  onPress={() => setSelectedCategory(cat)}
                >
                  <Text style={[styles.categoryText, active && styles.categoryTextActive]}>
                    {cat}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Map Area */}
        <View style={styles.mapContainer}>
          <WebView
            ref={webViewRef}
            style={styles.map}
            source={{ html: mapHtml }}
            originWhitelist={['*']}
            javaScriptEnabled={true}
            onMessage={handleMessage}
          />
        </View>

        {/* Live Vendor Detail Card */}
        {selectedVendor && (
          <View style={styles.bottomCard}>
            {/* Live Telemetry Banner */}
            <View style={styles.telemetryBanner}>
              <View style={styles.telemetryRow}>
                <View style={styles.radarDot} />
                <Text style={styles.telemetryText}>
                  LIVE TRACKING • Speed: {selectedVendor.speed}
                </Text>
              </View>
              <View style={styles.etaPill}>
                <Text style={styles.etaText}>⏱ ETA: {selectedVendor.eta}</Text>
              </View>
            </View>

            <View style={styles.cardHeaderRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.vendorName} numberOfLines={1}>{selectedVendor.name}</Text>
                <Text style={styles.vendorMeta}>
                  {selectedVendor.category} • {selectedVendor.vehicle} • ⭐ {selectedVendor.rating}
                </Text>
              </View>
              <View style={styles.distanceBadge}>
                <Text style={styles.distanceText}>{selectedVendor.distance}</Text>
              </View>
            </View>

            <Text style={styles.vendorItems} numberOfLines={1}>
              🛒 <Text style={{ color: '#4b5563', fontWeight: '600' }}>Available:</Text> {selectedVendor.items}
            </Text>

            {/* Action Buttons */}
            <View style={styles.cardActionsRow}>
              <TouchableOpacity 
                style={[styles.actionButton, styles.callButton]} 
                onPress={() => alert(`Calling ${selectedVendor.name} at ${selectedVendor.phone}`)}
              >
                <Text style={styles.callButtonText}>📞 Call Vendor</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.actionButton, styles.notifyButton]} 
                onPress={() => alert(`🔔 Sent wave to ${selectedVendor.name}! Vendor alerted to pause at your gate.`)}
              >
                <Text style={styles.notifyButtonText}>🙋 Request Stop</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 10,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
    zIndex: 10,
  },
  headerTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  brandTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#15803d',
  },
  subTitle: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: -2,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#dcfce7',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 99,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#22c55e',
    marginRight: 6,
  },
  liveText: {
    color: '#166534',
    fontSize: 12,
    fontWeight: '700',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 8,
  },
  searchIcon: {
    fontSize: 14,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#1f2937',
    padding: 0,
  },
  clearSearch: {
    fontSize: 14,
    color: '#9ca3af',
    paddingHorizontal: 4,
  },
  categoryScroll: {
    paddingVertical: 2,
    gap: 8,
  },
  categoryChip: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    marginRight: 6,
  },
  categoryChipActive: {
    backgroundColor: '#15803d',
  },
  categoryText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4b5563',
  },
  categoryTextActive: {
    color: '#ffffff',
  },
  mapContainer: {
    flex: 1,
    position: 'relative',
  },
  map: {
    flex: 1,
    width: '100%',
  },
  bottomCard: {
    position: 'absolute',
    bottom: 20,
    left: 16,
    right: 16,
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  telemetryBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    borderRadius: 10,
    paddingVertical: 6,
    paddingHorizontal: 10,
    marginBottom: 10,
  },
  telemetryRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  radarDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#16a34a',
    marginRight: 6,
  },
  telemetryText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#166534',
  },
  etaPill: {
    backgroundColor: '#15803d',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  etaText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  vendorName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
  },
  vendorMeta: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 2,
  },
  distanceBadge: {
    backgroundColor: '#eff6ff',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  distanceText: {
    color: '#2563eb',
    fontSize: 12,
    fontWeight: '700',
  },
  vendorItems: {
    fontSize: 13,
    color: '#374151',
    marginBottom: 12,
  },
  cardActionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  callButton: {
    backgroundColor: '#f3f4f6',
  },
  callButtonText: {
    color: '#374151',
    fontWeight: '700',
    fontSize: 14,
  },
  notifyButton: {
    backgroundColor: '#15803d',
  },
  notifyButtonText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 14,
  },
});
