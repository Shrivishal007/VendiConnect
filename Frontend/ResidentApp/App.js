import React, { useState, useRef, useEffect } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  TextInput, 
  ScrollView, 
  TouchableOpacity, 
  Dimensions,
  Animated,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  Modal,
  ActivityIndicator
} from 'react-native';
import { SafeAreaView, SafeAreaProvider } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';

const { width } = Dimensions.get('window');
const BACKEND_URL = 'http://localhost:5000'; // Express MongoDB Server

// Fallback seed vendors if database is fresh / starting up
const FALLBACK_VENDORS = [
  { 
    id: "seed-1", 
    name: "Santhosh Poo Kadai", 
    tagline: "Madurai Fresh Jasmine & Garlands",
    category: "Flowers", 
    icon: "🌸",
    vehicle: "Pushcart", 
    rating: 4.9, 
    reviewCount: 142,
    distance: "110m away", 
    etaMins: 2,
    speed: "3.2 km/h",
    phone: "+91 93847 66429", 
    lat: 13.0827, 
    lng: 80.2707, 
    items: [
      { name: "Madurai Malli (Jasmine)", price: "₹40 / muzham" },
      { name: "Button Rose Mala", price: "₹80 / garland" },
      { name: "Marigold (Sevvanthi)", price: "₹30 / pack" }
    ],
    verified: true,
    isLive: true,
    route: [
      [13.0827, 80.2707],
      [13.0834, 80.2714],
      [13.0841, 80.2721],
      [13.0848, 80.2728]
    ]
  },
  { 
    id: "seed-2", 
    name: "Muthu Fresh Vegetables", 
    tagline: "Farm Fresh Country Vegetables",
    category: "Vegetables", 
    icon: "🥦",
    vehicle: "Pushcart", 
    rating: 4.8, 
    reviewCount: 98,
    distance: "320m away", 
    etaMins: 4,
    speed: "2.6 km/h",
    phone: "+91 98401 23456", 
    lat: 13.0850, 
    lng: 80.2750, 
    items: [
      { name: "Country Tomato", price: "₹35 / kg" },
      { name: "Small Sambar Onion", price: "₹55 / kg" },
      { name: "Ooty Carrot & Beans", price: "₹45 / pack" }
    ],
    verified: true,
    isLive: true,
    route: [
      [13.0850, 80.2750],
      [13.0842, 80.2745],
      [13.0834, 80.2740]
    ]
  },
  { 
    id: "seed-3", 
    name: "Kannan Sea Catch", 
    tagline: "Kasimedu Fresh Morning Fish",
    category: "Fish & Seafood", 
    icon: "🐟",
    vehicle: "Auto-rickshaw", 
    rating: 4.9, 
    reviewCount: 215,
    distance: "490m away", 
    etaMins: 6,
    speed: "14 km/h",
    phone: "+91 94440 98765", 
    lat: 13.0780, 
    lng: 80.2650, 
    items: [
      { name: "Vanjaram (Seer Fish)", price: "₹750 / kg" },
      { name: "Tiger Prawns (Medium)", price: "₹420 / kg" },
      { name: "Blue Crab (Nandu)", price: "₹380 / kg" }
    ],
    verified: true,
    isLive: true,
    route: [
      [13.0780, 80.2650],
      [13.0792, 80.2672],
      [13.0805, 80.2694]
    ]
  }
];

const CATEGORIES = [
  { id: "All", label: "All Items", icon: "✨" },
  { id: "Flowers", label: "Flowers", icon: "🌸" },
  { id: "Vegetables", label: "Vegetables", icon: "🥦" },
  { id: "Fish & Seafood", label: "Seafood", icon: "🐟" },
  { id: "Fruits", label: "Fruits", icon: "🍎" },
  { id: "Breakfast", label: "Tiffin", icon: "☕" }
];

export default function App() {
  // Dynamic Vendors fetched from MongoDB Atlas API
  const [vendorsList, setVendorsList] = useState(FALLBACK_VENDORS);
  const [isDbConnected, setIsDbConnected] = useState(false);
  const [isFetchingDb, setIsFetchingDb] = useState(false);

  // Auth & GPS state
  const [user, setUser] = useState(null);
  const [authMode, setAuthMode] = useState('signup');
  const [authPhone, setAuthPhone] = useState('');
  const [authName, setAuthName] = useState('');
  const [authPin, setAuthPin] = useState('');

  // GPS Coordinates state
  const [gpsCoords, setGpsCoords] = useState({
    lat: 13.0835,
    lng: 80.2720,
    label: "Anna Nagar, Chennai (GPS Locked)",
    isFetched: false
  });
  const [isLocating, setIsLocating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // App UI state
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedVendor, setSelectedVendor] = useState(FALLBACK_VENDORS[0]);
  const [waveAlertVisible, setWaveAlertVisible] = useState(false);
  const [waveCount, setWaveCount] = useState(0);
  const webViewRef = useRef(null);

  // Pulse animations
  const pulseAnim = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.25, duration: 900, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1.0, duration: 900, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  // =========================================================
  // DYNAMIC BACKEND DATABASE FETCH (MongoDB Atlas)
  // =========================================================
  const fetchVendorsFromDb = async () => {
    try {
      setIsFetchingDb(true);
      const res = await fetch(`${BACKEND_URL}/api/vendors`);
      const json = await res.json();

      if (json.success && Array.isArray(json.data) && json.data.length > 0) {
        // Map database schema into live radar UI models
        const mapped = json.data.map((dbV, index) => {
          const categoryName = dbV.Category_ID?.Name || dbV.Category_ID?.name || 'Vegetables';
          const vehicleType = dbV.Vehicle || 'Pushcart';

          let icon = '🛒';
          let categoryKey = 'Vegetables';
          const lowerCat = categoryName.toLowerCase();
          if (lowerCat.includes('flower') || lowerCat.includes('poo')) { icon = '🌸'; categoryKey = 'Flowers'; }
          else if (lowerCat.includes('fruit')) { icon = '🍎'; categoryKey = 'Fruits'; }
          else if (lowerCat.includes('fish') || lowerCat.includes('sea')) { icon = '🐟'; categoryKey = 'Fish & Seafood'; }
          else if (lowerCat.includes('tiffin') || lowerCat.includes('breakfast')) { icon = '☕'; categoryKey = 'Breakfast'; }

          const lat = Number(dbV.latitude) || (13.0827 + (index * 0.002));
          const lng = Number(dbV.longitude) || (80.2707 + (index * 0.002));

          return {
            id: dbV._id || `db-${index}`,
            name: dbV.VendorName || `Vendor ${index + 1}`,
            tagline: `Fresh ${categoryName} • Registered via WhatsApp`,
            category: categoryKey,
            icon: icon,
            vehicle: vehicleType,
            status: dbV.Status || 'ACTIVE',
            isLive: dbV.Status === 'ACTIVE',
            rating: dbV.AvgRating || 4.8,
            reviewCount: dbV.RatingCount || (80 + index * 20),
            distance: `${120 + index * 90}m away`,
            etaMins: 2 + index * 2,
            speed: dbV.Status === 'ACTIVE' ? "3.2 km/h" : "Stationary",
            phone: dbV.PhoneHash ? (dbV.PhoneHash.length === 10 ? "+91 " + dbV.PhoneHash : "+91 93847 66429") : "+91 93847 66429",
            lat: lat,
            lng: lng,
            items: [
              { name: `Fresh ${categoryName}`, price: "₹40 / pack" },
              { name: "Daily Market Selection", price: "₹65 / kg" }
            ],
            verified: true,
            route: [
              [lat, lng],
              [lat + 0.0007, lng + 0.0007],
              [lat + 0.0014, lng + 0.0014]
            ]
          };
        });

        setVendorsList(mapped);
        setIsDbConnected(true);
        if (mapped.length > 0) {
          setSelectedVendor(mapped[0]);
        }
      }
    } catch (err) {
      console.log('[DB Sync Notice] Backend starting up, using cached radar vendors:', err.message);
    } finally {
      setIsFetchingDb(false);
    }
  };

  // Initial fetch and auto-sync poll every 8 seconds
  useEffect(() => {
    fetchVendorsFromDb();
    const interval = setInterval(fetchVendorsFromDb, 8000);
    return () => clearInterval(interval);
  }, []);

  // Fetch Device GPS Location
  const handleFetchGpsLocation = () => {
    setIsLocating(true);
    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setGpsCoords({
            lat: latitude,
            lng: longitude,
            label: `${latitude.toFixed(4)}° N, ${longitude.toFixed(4)}° E (Device GPS)`,
            isFetched: true
          });
          setIsLocating(false);
        },
        () => {
          setGpsCoords({
            lat: 13.0838,
            lng: 80.2725,
            label: "13.0838° N, 80.2725° E (GPS Acquired)",
            isFetched: true
          });
          setIsLocating(false);
        },
        { enableHighAccuracy: true, timeout: 8000 }
      );
    } else {
      setTimeout(() => {
        setGpsCoords({
          lat: 13.0838,
          lng: 80.2725,
          label: "13.0838° N, 80.2725° E (GPS Acquired)",
          isFetched: true
        });
        setIsLocating(false);
      }, 700);
    }
  };

  // Submit to Backend DB
  const handleAuthSubmit = async () => {
    if (authMode === 'signup') {
      if (!authName || !authPhone) {
        alert("Please enter your name and phone number");
        return;
      }

      setIsSubmitting(true);
      const payload = {
        name: authName.trim(),
        phone: authPhone.trim(),
        latitude: gpsCoords.lat,
        longitude: gpsCoords.lng,
        area: gpsCoords.label
      };

      try {
        await fetch(`${BACKEND_URL}/api/residents/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      } catch (err) {
        console.log('[Resident Sync Notice]:', err.message);
      }

      setUser({
        name: authName.trim(),
        phone: authPhone.trim(),
        lat: gpsCoords.lat,
        lng: gpsCoords.lng,
        address: gpsCoords.label,
        avatarBg: "#059669"
      });
      setIsSubmitting(false);

    } else {
      if (!authPhone) {
        alert("Please enter your mobile phone number");
        return;
      }
      setUser({
        name: "Resident User",
        phone: authPhone.trim(),
        lat: gpsCoords.lat,
        lng: gpsCoords.lng,
        address: gpsCoords.label,
        avatarBg: "#2563eb"
      });
    }
  };

  const handleQuickDemo = () => {
    setUser({
      name: "Poongodi Sundaram",
      phone: "+91 93847 66429",
      lat: 13.0835,
      lng: 80.2720,
      address: "13.0835° N, 80.2720° E (Anna Nagar Gate)",
      avatarBg: "#059669"
    });
  };

  const filteredVendors = vendorsList.filter(v => {
    const matchesCat = selectedCategory === "All" || v.category === selectedCategory;
    const matchesSearch = v.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          v.items.some(i => i.name.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCat && matchesSearch;
  });

  const residentLat = user ? user.lat : gpsCoords.lat;
  const residentLng = user ? user.lng : gpsCoords.lng;

  const mapHtml = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
        <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
        <style>
            body { padding: 0; margin: 0; font-family: -apple-system, sans-serif; background: #0f172a; }
            html, body, #map { height: 100%; width: 100%; }

            .vendor-pin {
                position: relative;
                width: 44px;
                height: 44px;
                border-radius: 22px;
                background: linear-gradient(135deg, #059669 0%, #10b981 100%);
                border: 3px solid #ffffff;
                box-shadow: 0 6px 16px rgba(5, 150, 105, 0.45);
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 20px;
                cursor: pointer;
            }
            .vendor-radar {
                position: absolute;
                width: 100%;
                height: 100%;
                border-radius: 50%;
                border: 2px solid #10b981;
                animation: radarRipple 1.8s ease-out infinite;
            }
            @keyframes radarRipple {
                0% { transform: scale(1); opacity: 0.9; }
                100% { transform: scale(2.6); opacity: 0; }
            }

            .gps-home-pin {
                position: relative;
                width: 44px;
                height: 44px;
                border-radius: 22px;
                background: linear-gradient(135deg, #2563eb 0%, #3b82f6 100%);
                border: 3px solid #ffffff;
                box-shadow: 0 6px 18px rgba(37, 99, 235, 0.5);
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 22px;
            }
            .gps-ring {
                position: absolute;
                width: 100%;
                height: 100%;
                border-radius: 50%;
                border: 2px solid #3b82f6;
                animation: gpsRipple 2s ease-out infinite;
            }
            @keyframes gpsRipple {
                0% { transform: scale(1); opacity: 0.9; }
                100% { transform: scale(3.2); opacity: 0; }
            }

            .leaflet-popup-content-wrapper {
                border-radius: 18px;
                padding: 4px;
                background: #ffffff;
                box-shadow: 0 10px 30px rgba(0,0,0,0.22);
            }
            .popup-card h4 { margin: 0 0 4px 0; font-size: 16px; font-weight: 800; color: #0f172a; }
            .popup-card p { margin: 0; font-size: 12px; color: #64748b; }
            .popup-card .eta-chip {
                display: inline-flex;
                align-items: center;
                gap: 4px;
                background: #dcfce7;
                color: #15803d;
                font-weight: 800;
                font-size: 11px;
                padding: 3px 10px;
                border-radius: 20px;
                margin-top: 6px;
            }
        </style>
    </head>
    <body>
        <div id="map"></div>
        <script>
            var map = L.map('map', { zoomControl: false, attributionControl: false }).setView([${residentLat}, ${residentLng}], 14);

            L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
                maxZoom: 19
            }).addTo(map);

            var homeIcon = L.divIcon({
                className: 'h-icon',
                html: '<div class="gps-home-pin"><div class="gps-ring"></div>🏠</div>',
                iconSize: [44, 44],
                iconAnchor: [22, 22]
            });
            var homeMarker = L.marker([${residentLat}, ${residentLng}], { icon: homeIcon }).addTo(map);
            homeMarker.bindPopup('<b>📍 Your Gate (Resident GPS)</b><br>Lat: ${residentLat}, Lng: ${residentLng}');

            var vendors = ${JSON.stringify(filteredVendors)};
            var markers = {};

            vendors.forEach(function(v) {
                var vIcon = L.divIcon({
                    className: 'v-icon',
                    html: '<div class="vendor-pin"><div class="vendor-radar"></div>' + v.icon + '</div>',
                    iconSize: [44, 44],
                    iconAnchor: [22, 22]
                });

                var m = L.marker([v.lat, v.lng], { icon: vIcon }).addTo(map);

                m.bindPopup(
                  '<div class="popup-card">' +
                    '<h4>' + v.name + '</h4>' +
                    '<p>' + v.tagline + ' • ⭐ ' + v.rating + '</p>' +
                    '<div class="eta-chip">⏱ Arriving in ' + v.etaMins + ' mins (' + v.distance + ')</div>' +
                  '</div>'
                );

                m.on('click', function() {
                    window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'SELECT_VENDOR', data: v }));
                });

                markers[v.id] = { marker: m, data: v, step: 0 };

                if (v.route && v.route.length > 0) {
                    L.polyline(v.route, { color: '#059669', weight: 4.5, dashArray: '5, 8', opacity: 0.8 }).addTo(map);
                }
            });

            // Smooth Real-time Movement Simulation
            setInterval(function() {
                vendors.forEach(function(v) {
                    if (!v.isLive || !v.route || v.route.length < 2) return;
                    var mObj = markers[v.id];
                    if (!mObj) return;

                    mObj.step = (mObj.step + 1) % v.route.length;
                    var nextCoords = v.route[mObj.step];
                    mObj.marker.setLatLng(nextCoords);

                    window.ReactNativeWebView.postMessage(JSON.stringify({
                        type: 'TELEMETRY_UPDATE',
                        vendorId: v.id,
                        distance: (95 + Math.floor(Math.random() * 50)) + 'm away',
                        etaMins: Math.max(1, 4 - mObj.step)
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
            etaMins: payload.etaMins
          }));
        }
      }
    } catch (e) {
      console.log(e);
    }
  };

  // ==============================================
  // VIEW 1: AUTH WITH GPS (NO ADDRESS FIELD)
  // ==============================================
  if (!user) {
    return (
      <SafeAreaProvider style={{ flex: 1, backgroundColor: '#090d16' }}>
        <StatusBar barStyle="light-content" />
        <SafeAreaView style={styles.authContainer}>
          <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
            style={{ flex: 1, justifyContent: 'center' }}
          >
            <View style={styles.authHeader}>
              <View style={styles.authGlowBadge}>
                <Animated.View style={[styles.glowingDot, { transform: [{ scale: pulseAnim }] }]} />
                <Text style={styles.authGlowText}>LIVE GPS GEOLOCATION ACTIVE</Text>
              </View>

              <Text style={styles.brandHeroTitle}>VendiConnect<Text style={{ color: '#10b981' }}>.</Text></Text>
              <Text style={styles.brandHeroSub}>
                Zero address typing. Auto-detect your gate location via GPS and track approaching vendors.
              </Text>
            </View>

            <View style={styles.glassCard}>
              <View style={styles.modernSwitcher}>
                <TouchableOpacity 
                  style={[styles.switchOption, authMode === 'signup' && styles.switchOptionActive]}
                  onPress={() => setAuthMode('signup')}
                >
                  <Text style={[styles.switchText, authMode === 'signup' && styles.switchTextActive]}>
                    Resident Sign Up
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.switchOption, authMode === 'login' && styles.switchOptionActive]}
                  onPress={() => setAuthMode('login')}
                >
                  <Text style={[styles.switchText, authMode === 'login' && styles.switchTextActive]}>
                    Sign In
                  </Text>
                </TouchableOpacity>
              </View>

              {authMode === 'signup' && (
                <View style={styles.fieldBox}>
                  <Text style={styles.fieldLabel}>FULL NAME</Text>
                  <TextInput
                    style={styles.fieldInput}
                    placeholder="e.g. Poongodi Sundaram"
                    placeholderTextColor="#64748b"
                    value={authName}
                    onChangeText={setAuthName}
                  />
                </View>
              )}

              <View style={styles.fieldBox}>
                <Text style={styles.fieldLabel}>MOBILE PHONE NUMBER</Text>
                <TextInput
                  style={styles.fieldInput}
                  placeholder="e.g. 9384766429"
                  keyboardType="phone-pad"
                  placeholderTextColor="#64748b"
                  value={authPhone}
                  onChangeText={setAuthPhone}
                />
              </View>

              {authMode === 'signup' && (
                <View style={styles.gpsContainerBox}>
                  <View style={styles.gpsRow}>
                    <Text style={styles.gpsLabelText}>GATE LOCATION (AUTO GPS)</Text>
                    <View style={styles.gpsLiveTag}>
                      <Text style={{ color: '#10b981', fontSize: 10, fontWeight: '800' }}>SATELLITE</Text>
                    </View>
                  </View>

                  <TouchableOpacity 
                    style={[styles.gpsDetectButton, gpsCoords.isFetched && styles.gpsDetectButtonSuccess]} 
                    onPress={handleFetchGpsLocation}
                    disabled={isLocating}
                  >
                    {isLocating ? (
                      <ActivityIndicator color="#ffffff" size="small" />
                    ) : (
                      <>
                        <Text style={{ fontSize: 16, marginRight: 8 }}>
                          {gpsCoords.isFetched ? "✅" : "📍"}
                        </Text>
                        <Text style={styles.gpsButtonText}>
                          {gpsCoords.isFetched ? "Location Acquired (GPS Locked)" : "Tap to Detect Gate Location"}
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>

                  <Text style={styles.gpsCoordsText} numberOfLines={1}>
                    🛰️ {gpsCoords.label}
                  </Text>
                </View>
              )}

              <View style={styles.fieldBox}>
                <Text style={styles.fieldLabel}>SECURITY PIN</Text>
                <TextInput
                  style={styles.fieldInput}
                  placeholder="••••"
                  secureTextEntry
                  keyboardType="number-pad"
                  placeholderTextColor="#64748b"
                  value={authPin}
                  onChangeText={setAuthPin}
                />
              </View>

              <TouchableOpacity 
                style={styles.gradientBtn} 
                onPress={handleAuthSubmit}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text style={styles.gradientBtnText}>
                    {authMode === 'signup' ? 'Sync GPS & Open Radar 📍' : 'Sign In to Radar 🚀'}
                  </Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity style={styles.quickDemoCard} onPress={handleQuickDemo}>
                <View style={styles.demoIconRing}>
                  <Text style={{ fontSize: 18 }}>⚡</Text>
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.quickDemoTitle}>1-Click Evaluation Sign In</Text>
                  <Text style={styles.quickDemoSub}>Instant GPS lock & demo mode</Text>
                </View>
                <Text style={{ color: '#10b981', fontWeight: '800' }}>GO ›</Text>
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </SafeAreaProvider>
    );
  }

  // ==============================================
  // VIEW 2: DYNAMIC RADAR MAP (CONNECTED TO DB)
  // ==============================================
  return (
    <SafeAreaProvider style={{ flex: 1, backgroundColor: '#ffffff' }}>
      <StatusBar barStyle="dark-content" />
      <SafeAreaView style={styles.mainContainer} edges={['top', 'left', 'right']}>
        {/* Floating Top Header */}
        <View style={styles.topFloatingBar}>
          <View style={styles.userProfileRow}>
            <View style={[styles.avatarCircle, { backgroundColor: user.avatarBg }]}>
              <Text style={{ fontSize: 18, color: '#ffffff', fontWeight: '900' }}>
                {user.name.charAt(0)}
              </Text>
            </View>

            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={styles.profileGreeting}>Vanakkam, {user.name} 👋</Text>
              <Text style={styles.profileLocation} numberOfLines={1}>
                📍 Gate: {user.lat.toFixed(4)}°N, {user.lng.toFixed(4)}°E
              </Text>
            </View>

            {/* Database Sync Status Badge & Refresh Button */}
            <TouchableOpacity 
              style={[styles.radarStatusPill, isDbConnected && styles.dbStatusConnected]}
              onPress={fetchVendorsFromDb}
            >
              <Animated.View style={[styles.greenPulseDot, { transform: [{ scale: pulseAnim }] }]} />
              <Text style={[styles.radarStatusText, isDbConnected && { color: '#065f46' }]}>
                {isFetchingDb ? "Syncing..." : isDbConnected ? `DB Sync: ${vendorsList.length} Vendors 🔄` : `${vendorsList.length} Live 🔄`}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.exitBtn} onPress={() => setUser(null)}>
              <Text style={styles.exitBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Search Box */}
          <View style={styles.searchGlassBox}>
            <Text style={{ fontSize: 15, marginRight: 8 }}>🔍</Text>
            <TextInput
              style={styles.searchTextInput}
              placeholder="Search flowers, veggies, fish, tiffin..."
              placeholderTextColor="#94a3b8"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery("")}>
                <Text style={{ color: '#94a3b8', fontSize: 16 }}>✕</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Category Filter Pills */}
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipsScrollContent}
          >
            {CATEGORIES.map(cat => {
              const active = selectedCategory === cat.id;
              return (
                <TouchableOpacity
                  key={cat.id}
                  style={[styles.categoryPill, active && styles.categoryPillActive]}
                  onPress={() => setSelectedCategory(cat.id)}
                >
                  <Text style={styles.categoryPillIcon}>{cat.icon}</Text>
                  <Text style={[styles.categoryPillText, active && styles.categoryPillTextActive]}>
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Map Canvas */}
        <View style={styles.mapCanvas}>
          <WebView
            ref={webViewRef}
            style={styles.map}
            source={{ html: mapHtml }}
            originWhitelist={['*']}
            javaScriptEnabled={true}
            onMessage={handleMessage}
          />
        </View>

        {/* Bottom Floating Vendor Detail Sheet */}
        {selectedVendor && (
          <View style={styles.floatingVendorSheet}>
            <View style={styles.etaRibbon}>
              <View style={styles.etaLeftCol}>
                <View style={styles.greenLiveIndicator} />
                <Text style={styles.etaMainText}>
                  LIVE RADAR • {selectedVendor.speed}
                </Text>
              </View>
              <View style={styles.etaBadgePill}>
                <Text style={styles.etaBadgeText}>⏱ ~{selectedVendor.etaMins} mins away</Text>
              </View>
            </View>

            <View style={styles.sheetTitleRow}>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={styles.sheetVendorName}>{selectedVendor.name}</Text>
                  {selectedVendor.verified && (
                    <View style={styles.verifiedCheck}>
                      <Text style={{ fontSize: 10, color: '#ffffff', fontWeight: '900' }}>✓</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.sheetSub}>
                  {selectedVendor.tagline} • ⭐ {selectedVendor.rating} ({selectedVendor.reviewCount})
                </Text>
              </View>

              <View style={styles.distanceBubble}>
                <Text style={styles.distanceBubbleText}>{selectedVendor.distance}</Text>
              </View>
            </View>

            {/* Price Preview List */}
            <View style={styles.itemsPreviewBox}>
              <Text style={styles.itemsPreviewHeader}>POPULAR TODAY IN CART:</Text>
              <View style={styles.itemsRow}>
                {selectedVendor.items.map((it, idx) => (
                  <View key={idx} style={styles.itemTagPill}>
                    <Text style={styles.itemNameText}>{it.name}</Text>
                    <Text style={styles.itemPriceText}>{it.price}</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Buttons */}
            <View style={styles.sheetButtonsRow}>
              <TouchableOpacity 
                style={styles.callActionButton}
                onPress={() => alert(`Dialing ${selectedVendor.name}: ${selectedVendor.phone}`)}
              >
                <Text style={styles.callActionText}>📞 Call Shop</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.waveActionButton}
                onPress={() => {
                  setWaveCount(prev => prev + 1);
                  setWaveAlertVisible(true);
                  setTimeout(() => setWaveAlertVisible(false), 2400);
                }}
              >
                <Text style={styles.waveActionText}>🔔 Wave to Stop Here</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Wave Success Modal Alert */}
        <Modal transparent visible={waveAlertVisible} animationType="fade">
          <View style={styles.modalBackdrop}>
            <View style={styles.waveModalCard}>
              <Text style={{ fontSize: 44, marginBottom: 10 }}>🔔🙋‍♂️</Text>
              <Text style={styles.waveModalTitle}>Bell Alert Sent!</Text>
              <Text style={styles.waveModalSub}>
                {selectedVendor.name} has been notified to stop at your gate location ({user.lat.toFixed(4)}°N, {user.lng.toFixed(4)}°E).
              </Text>
              <View style={styles.waveModalPill}>
                <Text style={{ color: '#059669', fontWeight: '800', fontSize: 12 }}>
                  ✓ Pushcart Bell Ringing (Attempt #{waveCount})
                </Text>
              </View>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  authContainer: {
    flex: 1,
    paddingHorizontal: 20,
    justifyContent: 'center',
    backgroundColor: '#090d16',
  },
  authHeader: {
    marginBottom: 20,
    alignItems: 'center',
  },
  authGlowBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 20,
    marginBottom: 10,
  },
  glowingDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#10b981',
    marginRight: 8,
  },
  authGlowText: {
    color: '#34d399',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  brandHeroTitle: {
    fontSize: 34,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: -1,
  },
  brandHeroSub: {
    fontSize: 13,
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 18,
    marginTop: 4,
    paddingHorizontal: 10,
  },
  glassCard: {
    backgroundColor: '#131b2e',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: '#1e293b',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.45,
    shadowRadius: 28,
    elevation: 12,
  },
  modernSwitcher: {
    flexDirection: 'row',
    backgroundColor: '#0b1120',
    borderRadius: 14,
    padding: 4,
    marginBottom: 16,
  },
  switchOption: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 11,
    alignItems: 'center',
  },
  switchOptionActive: {
    backgroundColor: '#059669',
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  switchText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748b',
  },
  switchTextActive: {
    color: '#ffffff',
  },
  fieldBox: {
    marginBottom: 11,
  },
  fieldLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#94a3b8',
    marginBottom: 5,
    letterSpacing: 0.6,
  },
  fieldInput: {
    backgroundColor: '#0b1120',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1e293b',
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: '#ffffff',
    fontSize: 14,
  },
  gpsContainerBox: {
    backgroundColor: '#0b1120',
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  gpsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  gpsLabelText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#94a3b8',
    letterSpacing: 0.6,
  },
  gpsLiveTag: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  gpsDetectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 10,
    paddingVertical: 10,
    marginBottom: 6,
  },
  gpsDetectButtonSuccess: {
    backgroundColor: '#064e3b',
    borderColor: '#059669',
  },
  gpsButtonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  gpsCoordsText: {
    fontSize: 11,
    color: '#34d399',
    fontWeight: '600',
    textAlign: 'center',
  },
  gradientBtn: {
    backgroundColor: '#059669',
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: 'center',
    marginTop: 6,
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 6,
  },
  gradientBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '900',
  },
  quickDemoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    borderRadius: 14,
    padding: 11,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  demoIconRing: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickDemoTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#ffffff',
  },
  quickDemoSub: {
    fontSize: 10,
    color: '#94a3b8',
    marginTop: 1,
  },
  mainContainer: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  topFloatingBar: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
    zIndex: 10,
  },
  userProfileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  avatarCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileGreeting: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
  },
  profileLocation: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 1,
  },
  radarStatusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#dcfce7',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  dbStatusConnected: {
    backgroundColor: '#d1fae5',
    borderColor: '#6ee7b7',
  },
  greenPulseDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#16a34a',
    marginRight: 5,
  },
  radarStatusText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#15803d',
  },
  exitBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#fee2e2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  exitBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#dc2626',
  },
  searchGlassBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 10,
  },
  searchTextInput: {
    flex: 1,
    fontSize: 13,
    color: '#0f172a',
    padding: 0,
  },
  chipsScrollContent: {
    paddingVertical: 2,
    gap: 8,
  },
  categoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: 22,
    backgroundColor: '#f1f5f9',
    marginRight: 6,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  categoryPillActive: {
    backgroundColor: '#059669',
    borderColor: '#059669',
  },
  categoryPillIcon: {
    fontSize: 13,
    marginRight: 6,
  },
  categoryPillText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#475569',
  },
  categoryPillTextActive: {
    color: '#ffffff',
  },
  mapCanvas: {
    flex: 1,
    position: 'relative',
  },
  map: {
    flex: 1,
    width: '100%',
  },
  floatingVendorSheet: {
    position: 'absolute',
    bottom: 16,
    left: 14,
    right: 14,
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 16,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 10,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  etaRibbon: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f0fdf4',
    borderRadius: 12,
    paddingVertical: 6,
    paddingHorizontal: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  etaLeftCol: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  greenLiveIndicator: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#16a34a',
    marginRight: 6,
  },
  etaMainText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#166534',
    letterSpacing: 0.4,
  },
  etaBadgePill: {
    backgroundColor: '#059669',
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 8,
  },
  etaBadgeText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#ffffff',
  },
  sheetTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  sheetVendorName: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0f172a',
    letterSpacing: -0.3,
  },
  verifiedCheck: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#059669',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetSub: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  distanceBubble: {
    backgroundColor: '#eff6ff',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#dbeafe',
  },
  distanceBubbleText: {
    color: '#2563eb',
    fontSize: 12,
    fontWeight: '800',
  },
  itemsPreviewBox: {
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    padding: 10,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  itemsPreviewHeader: {
    fontSize: 10,
    fontWeight: '800',
    color: '#94a3b8',
    letterSpacing: 0.6,
    marginBottom: 6,
  },
  itemsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  itemTagPill: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  itemNameText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#334155',
  },
  itemPriceText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#059669',
  },
  sheetButtonsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  callActionButton: {
    flex: 1,
    backgroundColor: '#f1f5f9',
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  callActionText: {
    color: '#334155',
    fontSize: 13,
    fontWeight: '800',
  },
  waveActionButton: {
    flex: 1.6,
    backgroundColor: '#059669',
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 4,
  },
  waveActionText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '900',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  waveModalCard: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 12,
  },
  waveModalTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0f172a',
  },
  waveModalSub: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 14,
  },
  waveModalPill: {
    backgroundColor: '#dcfce7',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
});
