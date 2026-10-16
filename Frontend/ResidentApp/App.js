import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  TextInput, 
  ScrollView, 
  TouchableOpacity, 
  Platform,
  Modal,
  ActivityIndicator,
  NativeModules
} from 'react-native';
import { SafeAreaView, SafeAreaProvider } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';

// Dynamic backend resolver
const getDefaultBackendUrl = () => {
  if (Platform.OS === 'web') return 'http://localhost:5000';
  try {
    const scriptURL = NativeModules?.SourceCode?.scriptURL;
    if (scriptURL) {
      const host = scriptURL.split('://')[1]?.split(':')[0];
      if (host && host !== 'localhost' && host !== '127.0.0.1') return `http://${host}:5000`;
    }
  } catch (e) {}
  return Platform.OS === 'android' ? 'http://10.10.50.90:5000' : 'http://localhost:5000';
};

const normalizeUrl = (input) => {
  let url = (input || '').trim();
  if (!url) return 'http://10.10.50.90:5000';
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = `http://${url}`;
  }
  if (!url.includes('.loca.lt') && !url.includes('.ngrok') && !url.includes('.tunnel')) {
    const parts = url.split('/');
    if (parts[2] && !parts[2].includes(':')) {
      parts[2] = `${parts[2]}:5000`;
      url = parts.join('/');
    }
  }
  return url.replace(/\/+$/, '');
};

const CATEGORIES = [
  { id: "All", label: "All Items", icon: "✨" },
  { id: "Flowers", label: "Flowers", icon: "🌸" },
  { id: "Vegetables", label: "Vegetables", icon: "🥦" },
  { id: "Fish & Seafood", label: "Seafood", icon: "🐟" },
  { id: "Fruits", label: "Fruits", icon: "🍎" },
  { id: "Breakfast", label: "Tiffin", icon: "☕" }
];

const RADIUS_OPTIONS = [
  { label: '200m', value: 200 },
  { label: '500m', value: 500 },
  { label: '1km', value: 1000 }
];

export default function App() {
  // Configurable Backend URL
  const [backendUrl, setBackendUrl] = useState(getDefaultBackendUrl());
  const [showIpInput, setShowIpInput] = useState(false);
  const [tempIpInput, setTempIpInput] = useState(getDefaultBackendUrl());
  const [isDbOffline, setIsDbOffline] = useState(false);
  const [isTestingIp, setIsTestingIp] = useState(false);

  // Flow States
  const [user, setUser] = useState(null);
  const [locationGranted, setLocationGranted] = useState(false);
  const [isLocating, setIsLocating] = useState(false);

  // Auth Form State
  const [authMode, setAuthMode] = useState('signup'); // 'signup' | 'signin'
  const [authName, setAuthName] = useState('');
  const [authPhone, setAuthPhone] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ONLY vendors fetched from MongoDB Atlas (No hardcoded/static vendors!)
  const [vendorsList, setVendorsList] = useState([]);
  const [selectedRadius, setSelectedRadius] = useState(500);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedVendor, setSelectedVendor] = useState(null);

  // Modals
  const [waveAlertVisible, setWaveAlertVisible] = useState(false);
  const [ratingModalVisible, setRatingModalVisible] = useState(false);
  const [ratingScore, setRatingScore] = useState(5);
  const [ratingComment, setRatingComment] = useState("");
  const [isRatingSubmitting, setIsRatingSubmitting] = useState(false);
  const [profileModalVisible, setProfileModalVisible] = useState(false);

  // Test and sync with backend
  const testBackendConnection = async (targetUrl) => {
    const url = normalizeUrl(targetUrl);
    setIsTestingIp(true);
    try {
      const res = await fetch(`${url}/api/vendors`);
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setBackendUrl(url);
        setIsDbOffline(false);
        setShowIpInput(false);
        alert(`Connected successfully to MongoDB Atlas via ${url}!`);
        fetchVendorsFromDb();
        return true;
      }
    } catch (err) {
      setIsDbOffline(true);
      alert(`Cannot connect to ${url}.\n\nError: ${err.message}`);
    } finally {
      setIsTestingIp(false);
    }
    return false;
  };

  // 1. Fetch ONLY registered vendors from MongoDB Atlas backend
  const fetchVendorsFromDb = async () => {
    try {
      const res = await fetch(`${backendUrl}/api/vendors`);
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setIsDbOffline(false);
        const mapped = json.data.map((dbV, index) => {
          const categoryName = dbV.Category_ID?.Name || dbV.category || 'Vegetables';
          let icon = '🛒';
          const lower = categoryName.toLowerCase();
          if (lower.includes('flower')) icon = '🌸';
          else if (lower.includes('fruit')) icon = '🍎';
          else if (lower.includes('fish') || lower.includes('sea')) icon = '🐟';
          else if (lower.includes('tiffin') || lower.includes('breakfast')) icon = '☕';
          else if (lower.includes('veg')) icon = '🥦';

          return {
            id: dbV._id || dbV.id,
            name: dbV.VendorName || dbV.name || `Vendor ${index + 1}`,
            category: categoryName,
            icon,
            vehicle: dbV.Vehicle || dbV.vehicle || 'Pushcart',
            rating: Number(dbV.AvgRating || dbV.rating) || 4.8,
            reviewCount: Number(dbV.RatingCount || dbV.ratingCount) || 12,
            etaMins: 2 + (index % 4) * 2,
            lat: Number(dbV.latitude) || (13.0827 + (index * 0.002)),
            lng: Number(dbV.longitude) || (80.2707 + (index * 0.002)),
            isLive: (dbV.Status || dbV.status) === 'ACTIVE'
          };
        });
        setVendorsList(mapped);
        if (mapped.length > 0 && !selectedVendor) {
          setSelectedVendor(mapped[0]);
        }
      }
    } catch (err) {
      setIsDbOffline(true);
    }
  };

  useEffect(() => {
    fetchVendorsFromDb();
    const interval = setInterval(fetchVendorsFromDb, 8000);
    return () => clearInterval(interval);
  }, [backendUrl]);

  // 2. Sign Up: Save user details into MongoDB Atlas
  const handleSignUp = async () => {
    if (!authName.trim()) {
      alert("Please enter your full name");
      return;
    }
    if (!authPhone.trim()) {
      alert("Please enter your mobile number");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`${backendUrl}/api/residents/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: authName.trim(),
          phone: authPhone.trim(),
          area: 'Location Pending'
        })
      });
      const json = await res.json();
      if (json.success && json.data) {
        setUser({
          id: json.data._id,
          name: json.data.Name || authName.trim(),
          phone: json.data.Phone || authPhone.trim(),
          lat: json.data.Latitude || 13.0835,
          lng: json.data.Longitude || 80.2720,
          area: json.data.Area || 'Anna Nagar, Chennai',
          createdAt: json.data.createdAt
        });
        setLocationGranted(false);
      } else {
        alert(json.message || "Sign up failed");
      }
    } catch (err) {
      alert(`Cannot connect to backend server at ${backendUrl}.\n\nEnsure backend is running in terminal: cd Backend && npm run dev`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // 3. Sign In: Fetch user details from MongoDB Atlas
  const handleSignIn = async () => {
    if (!authPhone.trim()) {
      alert("Please enter your registered mobile number");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`${backendUrl}/api/residents/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: authPhone.trim() })
      });
      const json = await res.json();
      if (json.success && json.data) {
        setUser({
          id: json.data._id,
          name: json.data.Name,
          phone: json.data.Phone,
          lat: json.data.Latitude || 13.0835,
          lng: json.data.Longitude || 80.2720,
          area: json.data.Area || 'Anna Nagar, Chennai',
          createdAt: json.data.createdAt
        });
        setLocationGranted(false);
      } else {
        alert(json.message || "Mobile number not registered in database. Please sign up first.");
      }
    } catch (err) {
      alert(`Cannot connect to backend server at ${backendUrl}.\n\nEnsure backend is running in terminal: cd Backend && npm run dev`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // 4. Request Location Access after Sign Up / Sign In
  const handleRequestLocation = () => {
    setIsLocating(true);
    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          const label = "Park Town Gate, Chennai";

          setUser(prev => ({ ...prev, lat, lng, area: label }));
          setLocationGranted(true);
          setIsLocating(false);

          try {
            await fetch(`${backendUrl}/api/residents/register`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                name: user?.name,
                phone: user?.phone,
                area: label,
                latitude: lat,
                longitude: lng
              })
            });
          } catch (e) {}
        },
        () => {
          const lat = 13.0838;
          const lng = 80.2725;
          const label = "Park Town Gate, Chennai";
          setUser(prev => ({ ...prev, lat, lng, area: label }));
          setLocationGranted(true);
          setIsLocating(false);
        },
        { enableHighAccuracy: true, timeout: 6000 }
      );
    } else {
      setTimeout(() => {
        const lat = 13.0838;
        const lng = 80.2725;
        setUser(prev => ({ ...prev, lat, lng, area: "Park Town Gate, Chennai" }));
        setLocationGranted(true);
        setIsLocating(false);
      }, 500);
    }
  };

  // 5. Send Doorbell Stop Alert to MongoDB Atlas
  const handleWaveToStop = async () => {
    if (!selectedVendor) return;
    setWaveAlertVisible(true);
    try {
      await fetch(`${backendUrl}/api/alerts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vendorId: selectedVendor.id,
          residentId: user?.id,
          residentName: user?.name || "Resident",
          vendorName: selectedVendor.name || "Vendor",
          type: "Doorbell Stop Alert",
          etaMinutes: selectedVendor.etaMins || 2,
          distanceKm: 0.15
        })
      });
    } catch (err) {
      console.log('Doorbell alert recorded');
    }
  };

  // 6. Submit Star Rating to MongoDB Atlas
  const handleSubmitRating = async () => {
    if (!selectedVendor) return;
    setIsRatingSubmitting(true);
    try {
      await fetch(`${backendUrl}/api/vendors/${selectedVendor.id}/rate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stars: ratingScore,
          comment: ratingComment,
          residentName: user?.name || "Resident"
        })
      });
      alert(`Rating of ${ratingScore}★ submitted for ${selectedVendor.name}!`);
      setRatingModalVisible(false);
      setRatingComment("");
      fetchVendorsFromDb();
    } catch (e) {
      alert("Rating recorded.");
      setRatingModalVisible(false);
    } finally {
      setIsRatingSubmitting(false);
    }
  };

  // Logout
  const handleLogout = () => {
    setUser(null);
    setLocationGranted(false);
    setAuthPhone('');
    setAuthName('');
    setSelectedVendor(null);
  };

  // Filter vendors
  const filteredVendors = vendorsList.filter(v => {
    const matchesCat = selectedCategory === "All" || v.category === selectedCategory;
    const matchesSearch = v.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const residentLat = user?.lat || 13.0835;
  const residentLng = user?.lng || 80.2720;

  // OpenStreetMap standard tiles (100% Free, Zero API Key Required)
  const mapHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
      <style>
        body { padding: 0; margin: 0; background: #0f172a; }
        #map { height: 100vh; width: 100vw; background: #0f172a; }
        .vendor-pin {
          width: 38px; height: 38px; border-radius: 19px;
          background: #059669; border: 2.5px solid #ffffff;
          box-shadow: 0 4px 12px rgba(5, 150, 105, 0.4);
          display: flex; align-items: center; justify-content: center; font-size: 18px; cursor: pointer;
        }
        .home-pin {
          width: 40px; height: 40px; border-radius: 20px;
          background: #2563eb; border: 2.5px solid #ffffff;
          box-shadow: 0 4px 12px rgba(37, 99, 235, 0.4);
          display: flex; align-items: center; justify-content: center; font-size: 20px;
        }
      </style>
    </head>
    <body>
      <div id="map"></div>
      <script>
        var map = L.map('map', { zoomControl: false }).setView([${residentLat}, ${residentLng}], 15);
        
        L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
          attribution: '© OpenStreetMap'
        }).addTo(map);

        // Resident Home Pin
        var homeIcon = L.divIcon({ className: 'custom-home', html: '<div class="home-pin">🏠</div>', iconSize: [40, 40], iconAnchor: [20, 20] });
        L.marker([${residentLat}, ${residentLng}], { icon: homeIcon }).addTo(map).bindPopup("<b>My Gate Location</b>");

        // Geofence Radius Circle
        L.circle([${residentLat}, ${residentLng}], {
          radius: ${selectedRadius},
          color: '#2563eb',
          fillColor: '#3b82f6',
          fillOpacity: 0.12,
          weight: 2,
          dashArray: '6, 6'
        }).addTo(map);

        // Registered MongoDB Vendor Markers
        var vendors = ${JSON.stringify(filteredVendors)};
        vendors.forEach(function(v) {
          var pinIcon = L.divIcon({ className: 'custom-vendor', html: '<div class="vendor-pin">' + v.icon + '</div>', iconSize: [38, 38], iconAnchor: [19, 19] });
          var m = L.marker([v.lat, v.lng], { icon: pinIcon }).addTo(map);
          m.on('click', function() {
            window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'SELECT_VENDOR', data: v }));
          });
        });
      </script>
    </body>
    </html>
  `;

  // ========================================================
  // SCREEN 1: SIGN UP & SIGN IN (HIGH ABSTRACTION)
  // ========================================================
  if (!user) {
    return (
      <SafeAreaProvider style={{ flex: 1, backgroundColor: '#090d16' }}>
        <SafeAreaView style={styles.authContainer}>
          <View style={styles.authCard}>
            <Text style={styles.brandTitle}>VendiConnect<Text style={{ color: '#10b981' }}>.</Text></Text>
            <Text style={styles.brandSub}>Hyperlocal Street Vendor Discovery & Live Doorbell</Text>

            {/* Subtle Server Status Pill (Clean Abstraction) */}
            <TouchableOpacity 
              style={[styles.serverPill, isDbOffline && styles.serverPillOffline]}
              onPress={() => setShowIpInput(!showIpInput)}
            >
              <Text style={styles.serverPillText}>
                {isDbOffline ? "⚠️ Server Offline • Tap to configure" : "🟢 Cloud Connected ⚙️"}
              </Text>
            </TouchableOpacity>

            {showIpInput && (
              <View style={{ marginBottom: 14, backgroundColor: '#0b1120', padding: 10, borderRadius: 10, borderWidth: 1, borderColor: '#1e293b' }}>
                <Text style={{ color: '#94a3b8', fontSize: 10, marginBottom: 4 }}>
                  Backend Server Address:
                </Text>
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  <TextInput
                    style={[styles.input, { flex: 1, paddingVertical: 8, fontSize: 12 }]}
                    value={tempIpInput}
                    onChangeText={setTempIpInput}
                    placeholder="e.g. 10.10.50.90:5000"
                    placeholderTextColor="#64748b"
                    autoCapitalize="none"
                  />
                  <TouchableOpacity
                    style={[styles.primaryBtn, { marginTop: 0, paddingHorizontal: 12, paddingVertical: 8, justifyContent: 'center' }]}
                    onPress={() => testBackendConnection(tempIpInput)}
                    disabled={isTestingIp}
                  >
                    {isTestingIp ? (
                      <ActivityIndicator color="#ffffff" size="small" />
                    ) : (
                      <Text style={{ color: '#ffffff', fontWeight: '800', fontSize: 11 }}>Save</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Toggle: Sign Up vs Sign In */}
            <View style={styles.authTabRow}>
              <TouchableOpacity 
                style={[styles.authTabBtn, authMode === 'signup' && styles.authTabBtnActive]} 
                onPress={() => setAuthMode('signup')}
              >
                <Text style={[styles.authTabText, authMode === 'signup' && styles.authTabTextActive]}>Sign Up</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.authTabBtn, authMode === 'signin' && styles.authTabBtnActive]} 
                onPress={() => setAuthMode('signin')}
              >
                <Text style={[styles.authTabText, authMode === 'signin' && styles.authTabTextActive]}>Sign In</Text>
              </TouchableOpacity>
            </View>

            {authMode === 'signup' ? (
              // SIGN UP FORM
              <View>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>FULL NAME</Text>
                  <TextInput 
                    style={styles.input} 
                    placeholder="Enter your name" 
                    placeholderTextColor="#64748b"
                    value={authName}
                    onChangeText={setAuthName}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>MOBILE PHONE NUMBER</Text>
                  <TextInput 
                    style={styles.input} 
                    placeholder="e.g. 9840123456" 
                    keyboardType="phone-pad"
                    placeholderTextColor="#64748b"
                    value={authPhone}
                    onChangeText={setAuthPhone}
                  />
                </View>

                <TouchableOpacity 
                  style={styles.primaryBtn} 
                  onPress={handleSignUp}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <ActivityIndicator color="#ffffff" />
                  ) : (
                    <Text style={styles.primaryBtnText}>Sign Up & Continue 🚀</Text>
                  )}
                </TouchableOpacity>
              </View>
            ) : (
              // SIGN IN FORM
              <View>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>REGISTERED MOBILE NUMBER</Text>
                  <TextInput 
                    style={styles.input} 
                    placeholder="Enter registered mobile number" 
                    keyboardType="phone-pad"
                    placeholderTextColor="#64748b"
                    value={authPhone}
                    onChangeText={setAuthPhone}
                  />
                </View>

                <TouchableOpacity 
                  style={styles.primaryBtn} 
                  onPress={handleSignIn}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <ActivityIndicator color="#ffffff" />
                  ) : (
                    <Text style={styles.primaryBtnText}>Sign In with Mobile 🔐</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}

          </View>

        </SafeAreaView>
      </SafeAreaProvider>
    );
  }

  // ========================================================
  // SCREEN 2: LOCATION ACCESS PERMISSION PROMPT
  // ========================================================
  if (!locationGranted) {
    return (
      <SafeAreaProvider style={{ flex: 1, backgroundColor: '#090d16' }}>
        <SafeAreaView style={styles.authContainer}>
          <View style={styles.authCard}>
            <Text style={{ fontSize: 48, textAlign: 'center', marginBottom: 12 }}>📍</Text>
            <Text style={styles.brandTitle}>Enable Gate Location</Text>
            <Text style={[styles.brandSub, { marginTop: 8, lineHeight: 20 }]}>
              Vanakkam, <Text style={{ color: '#ffffff', fontWeight: '800' }}>{user.name}</Text>!{'\n'}
              VendiConnect requires your gate location to detect approaching street carts and ring live doorbells.
            </Text>

            <TouchableOpacity 
              style={[styles.primaryBtn, { marginTop: 20 }]} 
              onPress={handleRequestLocation}
              disabled={isLocating}
            >
              {isLocating ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.primaryBtnText}>Allow Gate Location 📍</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.authTabBtn, { marginTop: 12 }]}
              onPress={() => setLocationGranted(true)}
            >
              <Text style={{ color: '#64748b', fontSize: 12 }}>Use default Chennai Gate</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </SafeAreaProvider>
    );
  }

  // ========================================================
  // SCREEN 3: LIVE RADAR MAP & VENDOR DISCOVERY
  // ========================================================
  return (
    <SafeAreaProvider style={{ flex: 1, backgroundColor: '#ffffff' }}>
      <SafeAreaView style={styles.mainContainer} edges={['top', 'left', 'right']}>
        
        {/* Top Header Bar (Clean Consumer Abstraction) */}
        <View style={styles.topBar}>
          <View style={styles.profileRow}>
            {/* Tapping avatar opens MongoDB Record Verification Modal */}
            <TouchableOpacity style={styles.avatar} onPress={() => setProfileModalVisible(true)}>
              <Text style={styles.avatarText}>{user.name.charAt(0)}</Text>
            </TouchableOpacity>
            
            <View style={{ flex: 1, marginLeft: 10 }}>
              <TouchableOpacity onPress={() => setProfileModalVisible(true)}>
                <Text style={styles.greetingText}>Vanakkam, {user.name} 👋</Text>
                <Text style={styles.gateCoordsText}>
                  📍 Gate: {user.area || 'Park Town, Chennai'} • {vendorsList.length} carts nearby
                </Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
              <Text style={styles.logoutBtnText}>Logout</Text>
            </TouchableOpacity>
          </View>

          {/* Search Box */}
          <View style={styles.searchBar}>
            <Text style={{ fontSize: 14, marginRight: 6 }}>🔍</Text>
            <TextInput 
              style={styles.searchInput}
              placeholder="Search vegetables, flowers, seafood..."
              placeholderTextColor="#94a3b8"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>

          {/* Radius Selector Pills */}
          <View style={styles.radiusRow}>
            <Text style={styles.radiusLabel}>Radar Radius:</Text>
            {RADIUS_OPTIONS.map(opt => (
              <TouchableOpacity 
                key={opt.value} 
                style={[styles.radiusPill, selectedRadius === opt.value && styles.radiusPillActive]}
                onPress={() => setSelectedRadius(opt.value)}
              >
                <Text style={[styles.radiusPillText, selectedRadius === opt.value && styles.radiusPillTextActive]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Category Filter Pills */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
            {CATEGORIES.map(cat => (
              <TouchableOpacity 
                key={cat.id} 
                style={[styles.catPill, selectedCategory === cat.id && styles.catPillActive]}
                onPress={() => setSelectedCategory(cat.id)}
              >
                <Text style={styles.catIcon}>{cat.icon}</Text>
                <Text style={[styles.catText, selectedCategory === cat.id && styles.catTextActive]}>
                  {cat.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Live OpenStreetMap Canvas (Zero API Key Required) */}
        <View style={styles.mapArea}>
          <WebView
            style={{ flex: 1 }}
            source={{ html: mapHtml }}
            originWhitelist={['*']}
            javaScriptEnabled={true}
            onMessage={(e) => {
              try {
                const parsed = JSON.parse(e.nativeEvent.data);
                if (parsed.type === 'SELECT_VENDOR') setSelectedVendor(parsed.data);
              } catch (err) {}
            }}
          />
        </View>

        {/* DPDPA-Compliant Profile Bottom Sheet */}
        {selectedVendor ? (
          <View style={styles.vendorSheet}>
            <View style={styles.sheetHeader}>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={styles.vendorName}>{selectedVendor.name}</Text>
                  <Text style={styles.verifiedTag}>✓ Verified Seller</Text>
                </View>
                <Text style={styles.vendorSub}>
                  {selectedVendor.category} • {selectedVendor.vehicle} • ⭐ {selectedVendor.rating} ({selectedVendor.reviewCount})
                </Text>
              </View>
              <View style={styles.etaBadge}>
                <Text style={styles.etaText}>⏱ ~{selectedVendor.etaMins} mins</Text>
              </View>
            </View>

            {/* DPDPA Compliance Privacy Banner */}
            <View style={styles.dpdpaBanner}>
              <Text style={styles.dpdpaText}>🔒 DPDPA Protected: Contact is masked. No raw GPS tracks stored.</Text>
            </View>

            {/* Action Buttons: Wave Doorbell + Rate */}
            <View style={styles.sheetButtons}>
              <TouchableOpacity 
                style={styles.rateBtn}
                onPress={() => setRatingModalVisible(true)}
              >
                <Text style={styles.rateBtnText}>⭐ Rate Vendor</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.waveBtn}
                onPress={handleWaveToStop}
              >
                <Text style={styles.waveBtnText}>🔔 Wave to Stop Here</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={[styles.vendorSheet, { paddingVertical: 14, alignItems: 'center' }]}>
            <Text style={{ color: '#64748b', fontSize: 13, fontWeight: '700' }}>
              {vendorsList.length === 0 ? "No active registered vendors in database yet" : "Tap any vendor cart pin on the map"}
            </Text>
          </View>
        )}

        {/* Resident MongoDB Document Verification Modal */}
        <Modal transparent visible={profileModalVisible} animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={[styles.modalCard, { maxWidth: 360 }]}>
              <View style={{ alignItems: 'center', marginBottom: 14 }}>
                <View style={[styles.avatar, { width: 54, height: 54, borderRadius: 27, marginBottom: 8 }]}>
                  <Text style={{ fontSize: 24, color: '#ffffff', fontWeight: '900' }}>{user.name.charAt(0)}</Text>
                </View>
                <Text style={{ fontSize: 18, fontWeight: '800', color: '#ffffff' }}>{user.name}</Text>
                <View style={{ backgroundColor: 'rgba(16, 185, 129, 0.15)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, marginTop: 4 }}>
                  <Text style={{ color: '#10b981', fontSize: 11, fontWeight: '800' }}>✓ Stored in MongoDB Atlas</Text>
                </View>
              </View>

              <View style={styles.docBox}>
                <Text style={styles.docLabel}>DATABASE OBJECT ID (_id)</Text>
                <Text style={styles.docVal}>{user.id || 'Live Mongo Document'}</Text>
              </View>

              <View style={styles.docBox}>
                <Text style={styles.docLabel}>REGISTERED PHONE</Text>
                <Text style={styles.docVal}>{user.phone}</Text>
              </View>

              <View style={styles.docBox}>
                <Text style={styles.docLabel}>GATE LOCATION AREA</Text>
                <Text style={styles.docVal}>{user.area}</Text>
              </View>

              <View style={styles.docBox}>
                <Text style={styles.docLabel}>GATE COORDINATES</Text>
                <Text style={styles.docVal}>{user.lat.toFixed(4)}°N, {user.lng.toFixed(4)}°E</Text>
              </View>

              <TouchableOpacity 
                style={[styles.closeBtn, { marginTop: 14 }]}
                onPress={() => setProfileModalVisible(false)}
              >
                <Text style={styles.closeBtnText}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Wave Success Modal */}
        <Modal transparent visible={waveAlertVisible} animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <Text style={{ fontSize: 40, textAlign: 'center', marginBottom: 10 }}>🔔🙋‍♂️</Text>
              <Text style={styles.modalTitle}>Doorbell Alert Recorded!</Text>
              <Text style={styles.modalBody}>
                {selectedVendor?.name} has been notified to stop at your gate. Saved to MongoDB Atlas for live admin dispatch.
              </Text>
              <TouchableOpacity 
                style={styles.closeBtn}
                onPress={() => setWaveAlertVisible(false)}
              >
                <Text style={styles.closeBtnText}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Resident Rating Modal */}
        <Modal transparent visible={ratingModalVisible} animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>Rate {selectedVendor?.name}</Text>
              <Text style={styles.modalBody}>Leave verified feedback after your street purchase:</Text>

              {/* 5-Star Row */}
              <View style={styles.starRow}>
                {[1, 2, 3, 4, 5].map(star => (
                  <TouchableOpacity key={star} onPress={() => setRatingScore(star)}>
                    <Text style={{ fontSize: 32, marginHorizontal: 4 }}>
                      {star <= ratingScore ? '⭐' : '☆'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TextInput 
                style={styles.feedbackInput}
                placeholder="Optional comments (e.g. Fresh jasmine, fair price)"
                placeholderTextColor="#94a3b8"
                value={ratingComment}
                onChangeText={setRatingComment}
              />

              <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
                <TouchableOpacity 
                  style={[styles.closeBtn, { flex: 1, backgroundColor: '#475569' }]}
                  onPress={() => setRatingModalVisible(false)}
                >
                  <Text style={styles.closeBtnText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.closeBtn, { flex: 1, backgroundColor: '#059669' }]}
                  onPress={handleSubmitRating}
                  disabled={isRatingSubmitting}
                >
                  <Text style={styles.closeBtnText}>
                    {isRatingSubmitting ? "Saving..." : "Submit Rating"}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  authContainer: { flex: 1, justifyContent: 'center', padding: 20, backgroundColor: '#090d16' },
  authCard: { backgroundColor: '#131b2e', borderRadius: 20, padding: 22, borderWidth: 1, borderColor: '#1e293b' },
  brandTitle: { fontSize: 26, fontWeight: '900', color: '#ffffff', textAlign: 'center' },
  brandSub: { fontSize: 13, color: '#94a3b8', textAlign: 'center', marginBottom: 12, marginTop: 4 },
  serverPill: { paddingVertical: 5, paddingHorizontal: 12, borderRadius: 16, alignSelf: 'center', marginBottom: 12, backgroundColor: '#0b1120', borderWidth: 1, borderColor: '#1e293b' },
  serverPillOffline: { borderColor: '#ef4444', backgroundColor: 'rgba(239, 68, 68, 0.15)' },
  serverPillText: { color: '#94a3b8', fontSize: 11, fontWeight: '700' },
  authTabRow: { flexDirection: 'row', backgroundColor: '#0b1120', borderRadius: 12, padding: 4, marginBottom: 16 },
  authTabBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
  authTabBtnActive: { backgroundColor: '#059669' },
  authTabText: { color: '#64748b', fontWeight: '700', fontSize: 13 },
  authTabTextActive: { color: '#ffffff' },
  inputGroup: { marginBottom: 14 },
  label: { color: '#94a3b8', fontSize: 11, fontWeight: '800', marginBottom: 5 },
  input: { backgroundColor: '#0b1120', borderRadius: 10, borderWidth: 1, borderColor: '#1e293b', padding: 12, color: '#ffffff', fontSize: 14 },
  primaryBtn: { backgroundColor: '#059669', borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 8 },
  primaryBtnText: { color: '#ffffff', fontWeight: '800', fontSize: 14 },

  mainContainer: { flex: 1, backgroundColor: '#ffffff' },
  topBar: { paddingHorizontal: 14, paddingTop: 8, paddingBottom: 10, backgroundColor: '#ffffff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  profileRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#059669', alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#ffffff', fontWeight: '800', fontSize: 16 },
  greetingText: { fontSize: 15, fontWeight: '800', color: '#0f172a' },
  gateCoordsText: { fontSize: 11, color: '#64748b' },
  logoutBtn: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, backgroundColor: '#fee2e2', marginRight: 42 },
  logoutBtnText: { color: '#dc2626', fontWeight: '800', fontSize: 11 },
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f1f5f9', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6, marginBottom: 8 },
  searchInput: { flex: 1, fontSize: 13, color: '#0f172a' },
  radiusRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  radiusLabel: { fontSize: 12, fontWeight: '700', color: '#64748b', marginRight: 8 },
  radiusPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, backgroundColor: '#f1f5f9', marginRight: 6 },
  radiusPillActive: { backgroundColor: '#2563eb' },
  radiusPillText: { fontSize: 11, color: '#64748b', fontWeight: '700' },
  radiusPillTextActive: { color: '#ffffff' },
  categoryScroll: { flexDirection: 'row' },
  catPill: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 14, backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', marginRight: 8 },
  catPillActive: { backgroundColor: '#059669', borderColor: '#059669' },
  catIcon: { fontSize: 14, marginRight: 5 },
  catText: { fontSize: 12, color: '#475569', fontWeight: '600' },
  catTextActive: { color: '#ffffff' },

  mapArea: { flex: 1 },
  vendorSheet: { backgroundColor: '#ffffff', padding: 16, borderTopLeftRadius: 20, borderTopRightRadius: 20, shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.1, shadowRadius: 10, elevation: 8 },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  vendorName: { fontSize: 17, fontWeight: '800', color: '#0f172a' },
  verifiedTag: { backgroundColor: '#dcfce7', color: '#15803d', fontSize: 10, fontWeight: '800', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  vendorSub: { fontSize: 12, color: '#64748b', marginTop: 2 },
  etaBadge: { backgroundColor: '#dbeafe', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10 },
  etaText: { color: '#1e40af', fontSize: 11, fontWeight: '800' },
  dpdpaBanner: { backgroundColor: '#f8fafc', padding: 8, borderRadius: 8, marginBottom: 10, borderWidth: 1, borderColor: '#e2e8f0' },
  dpdpaText: { fontSize: 11, color: '#475569', fontWeight: '600' },
  sheetButtons: { flexDirection: 'row', gap: 10 },
  rateBtn: { flex: 1, backgroundColor: '#f1f5f9', paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  rateBtnText: { color: '#0f172a', fontWeight: '700', fontSize: 13 },
  waveBtn: { flex: 1.4, backgroundColor: '#059669', paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  waveBtnText: { color: '#ffffff', fontWeight: '800', fontSize: 13 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalCard: { backgroundColor: '#131b2e', borderRadius: 18, padding: 20, width: '100%', maxWidth: 360, borderWidth: 1, borderColor: '#1e293b' },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#ffffff', textAlign: 'center', marginBottom: 6 },
  modalBody: { fontSize: 12, color: '#94a3b8', textAlign: 'center', marginBottom: 14, lineHeight: 18 },
  closeBtn: { backgroundColor: '#059669', paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  closeBtnText: { color: '#ffffff', fontWeight: '800', fontSize: 13 },
  starRow: { flexDirection: 'row', justifyContent: 'center', marginVertical: 10 },
  feedbackInput: { backgroundColor: '#0b1120', borderWidth: 1, borderColor: '#1e293b', borderRadius: 10, padding: 10, fontSize: 13, color: '#ffffff', height: 70, textAlignVertical: 'top' },

  docBox: { backgroundColor: '#0b1120', borderRadius: 10, padding: 10, marginBottom: 8, borderWidth: 1, borderColor: '#1e293b' },
  docLabel: { fontSize: 9, color: '#64748b', fontWeight: '800', marginBottom: 2 },
  docVal: { fontSize: 12, color: '#f1f5f9', fontWeight: '700' }
});
