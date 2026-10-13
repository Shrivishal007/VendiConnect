import React, { useState, useRef } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  TextInput, 
  ScrollView, 
  TouchableOpacity, 
  Dimensions 
} from 'react-native';
import { SafeAreaView, SafeAreaProvider } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';

const { width } = Dimensions.get('window');

const ALL_VENDORS = [
  { id: 1, name: "Santhosh Poo Kadai", category: "Flowers", vehicle: "Pushcart", rating: 4.8, distance: "150m away", phone: "+91 93847 66429", lat: 13.0827, lng: 80.2707, items: "Jasmine, Rose, Marigold, Garlands" },
  { id: 2, name: "Fresh Veg Cart", category: "Vegetables", vehicle: "Pushcart", rating: 4.5, distance: "300m away", phone: "+91 98401 23456", lat: 13.0850, lng: 80.2750, items: "Tomato, Onion, Potato, Greens" },
  { id: 3, name: "Kannan Fish Stall", category: "Fish & Seafood", vehicle: "Auto-rickshaw", rating: 4.9, distance: "500m away", phone: "+91 94440 98765", lat: 13.0780, lng: 80.2650, items: "Seer Fish, Prawns, Crab, Vanjaram" },
  { id: 4, name: "Morning Tiffin Point", category: "Breakfast & Tiffin", vehicle: "Van", rating: 4.7, distance: "200m away", phone: "+91 97910 11223", lat: 13.0900, lng: 80.2720, items: "Idli, Vada, Dosa, Pongal, Tea" },
  { id: 5, name: "Kovai Fruit Stall", category: "Fruits", vehicle: "Pushcart", rating: 4.6, distance: "450m away", phone: "+91 98840 55667", lat: 13.0810, lng: 80.2770, items: "Banana, Apple, Papaya, Sweet Corn" },
];

const CATEGORIES = ["All", "Vegetables", "Fruits", "Flowers", "Fish & Seafood", "Breakfast & Tiffin"];

export default function App() {
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedVendor, setSelectedVendor] = useState(ALL_VENDORS[0]);
  const webViewRef = useRef(null);

  // Filter vendors based on category and search query
  const filteredVendors = ALL_VENDORS.filter(v => {
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
            .leaflet-popup-content-wrapper { border-radius: 12px; padding: 4px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); }
            .custom-popup h4 { margin: 0 0 4px 0; color: #166534; font-size: 15px; }
            .custom-popup p { margin: 0; font-size: 12px; color: #555; }
            .custom-popup .badge { display: inline-block; background: #dcfce7; color: #15803d; padding: 2px 8px; border-radius: 99px; font-weight: 600; font-size: 11px; margin-top: 6px; }
        </style>
    </head>
    <body>
        <div id="map"></div>
        <script>
            var map = L.map('map', { zoomControl: false }).setView([13.0827, 80.2707], 14);
            L.control.zoom({ position: 'topright' }).addTo(map);

            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                maxZoom: 19,
                attribution: '© OpenStreetMap'
            }).addTo(map);

            var vendors = ${JSON.stringify(filteredVendors)};
            var markers = [];

            function renderMarkers(list) {
                markers.forEach(m => map.removeLayer(m));
                markers = [];

                list.forEach(function(v) {
                    var m = L.marker([v.lat, v.lng]).addTo(map);
                    m.bindPopup(
                      '<div class="custom-popup">' +
                        '<h4>' + v.name + '</h4>' +
                        '<p><b>Vehicle:</b> ' + v.vehicle + ' | ⭐ ' + v.rating + '</p>' +
                        '<p style="margin-top:2px; font-size:11px; color:#666;">' + v.items + '</p>' +
                        '<span class="badge">' + v.distance + '</span>' +
                      '</div>'
                    );

                    m.on('click', function() {
                        window.ReactNativeWebView.postMessage(JSON.stringify(v));
                    });

                    markers.push(m);
                });
            }

            renderMarkers(vendors);
        </script>
    </body>
    </html>
  `;

  const handleMessage = (event) => {
    try {
      const vendorData = JSON.parse(event.nativeEvent.data);
      setSelectedVendor(vendorData);
    } catch (e) {
      console.log('Error parsing marker event', e);
    }
  };

  return (
    <SafeAreaProvider style={{ flex: 1 }}>
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        {/* Top Header & Search */}
        <View style={styles.header}>
          <View style={styles.headerTitleRow}>
            <Text style={styles.brandTitle}>VendiConnect 🛒</Text>
            <View style={styles.liveBadge}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>{filteredVendors.length} Live</Text>
            </View>
          </View>

          {/* Search Input */}
          <View style={styles.searchBar}>
            <Text style={styles.searchIcon}>🔍</Text>
            <TextInput
              style={styles.searchInput}
              placeholder="Search vendors (e.g. flowers, tomatoes, fish)..."
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

        {/* Selected Vendor Bottom Card */}
        {selectedVendor && (
          <View style={styles.bottomCard}>
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
              🛒 <Text style={{ color: '#4b5563' }}>Items:</Text> {selectedVendor.items}
            </Text>

            <View style={styles.cardActionsRow}>
              <TouchableOpacity 
                style={[styles.actionButton, styles.callButton]} 
                onPress={() => alert(`Calling ${selectedVendor.name} at ${selectedVendor.phone}`)}
              >
                <Text style={styles.callButtonText}>📞 Call Vendor</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.actionButton, styles.notifyButton]} 
                onPress={() => alert(`Requested ${selectedVendor.name} to stop near your door!`)}
              >
                <Text style={styles.notifyButtonText}>🔔 Stop Here</Text>
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
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#dcfce7',
    paddingVertical: 4,
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
    marginBottom: 10,
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
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
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
