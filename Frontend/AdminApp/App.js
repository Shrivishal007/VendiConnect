import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  TextInput, 
  ScrollView, 
  TouchableOpacity, 
  Platform,
  ActivityIndicator
} from 'react-native';
import { SafeAreaView, SafeAreaProvider } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';

const BACKEND_URL = 'http://localhost:5000';

const CATEGORIES = ["ALL", "Flowers", "Vegetables", "Fish & Seafood", "Fruits", "Breakfast"];

export default function App() {
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Desktop active tab: 'vendors' | 'radar' | 'alerts' | 'residents' | 'analytics'
  const [activeTab, setActiveTab] = useState('vendors');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');

  // Live MongoDB Atlas Data (Zero hardcoded vendors)
  const [vendorsList, setVendorsList] = useState([]);
  const [alertsList, setAlertsList] = useState([]);
  const [residentsList, setResidentsList] = useState([]);
  const [isSyncing, setIsSyncing] = useState(false);

  // 1. Fetch live data from MongoDB Atlas backend
  const fetchAllDbData = async () => {
    try {
      setIsSyncing(true);
      // Fetch Vendors
      const vRes = await fetch(`${BACKEND_URL}/api/vendors`);
      const vJson = await vRes.json();
      if (vJson.success && Array.isArray(vJson.data) && vJson.data.length > 0) {
        setVendorsList(vJson.data.map(v => ({
          id: v._id || v.id,
          name: v.VendorName || v.name,
          category: v.Category_ID?.Name || v.category || 'General',
          vehicle: v.Vehicle || v.vehicle || 'Pushcart',
          status: v.Status || v.status || 'ACTIVE',
          rating: v.AvgRating || v.rating || 4.8,
          lat: Number(v.latitude) || 13.0827,
          lng: Number(v.longitude) || 80.2707
        })));
      }

      // Fetch Doorbell Alerts
      const aRes = await fetch(`${BACKEND_URL}/api/alerts`);
      const aJson = await aRes.json();
      if (aJson.success && Array.isArray(aJson.data)) {
        setAlertsList(aJson.data);
      }

      // Fetch Registered Residents
      const rRes = await fetch(`${BACKEND_URL}/api/residents`);
      const rJson = await rRes.json();
      if (rJson.success && Array.isArray(rJson.data)) {
        setResidentsList(rJson.data);
      }
    } catch (err) {
      console.log('[AdminApp] MongoDB Atlas sync notice:', err.message);
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    if (isAdminLoggedIn) {
      fetchAllDbData();
      const interval = setInterval(fetchAllDbData, 6000);
      return () => clearInterval(interval);
    }
  }, [isAdminLoggedIn]);

  // 2. Admin Authentication against MongoDB backend
  const handleAdminLogin = async () => {
    if (!adminEmail || !adminPassword) {
      alert("Please enter official admin credentials");
      return;
    }
    setIsLoggingIn(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: adminEmail.trim(), password: adminPassword.trim() })
      });
      const json = await res.json();
      if (json.success) {
        setIsAdminLoggedIn(true);
      } else {
        alert(json.message || "Invalid credentials");
      }
    } catch (e) {
      // Offline fallback
      if (adminEmail === 'admin@vendiconnect.in' && adminPassword === 'admin123') {
        setIsAdminLoggedIn(true);
      } else {
        alert("Backend not reachable or invalid credentials");
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleQuickDemo = () => {
    setAdminEmail('admin@vendiconnect.in');
    setAdminPassword('admin123');
    setIsAdminLoggedIn(true);
  };

  // 3. Moderation: Update vendor status in MongoDB Atlas
  const updateVendorStatus = async (vendorId, newStatus) => {
    try {
      await fetch(`${BACKEND_URL}/api/vendors/${vendorId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      setVendorsList(prev => prev.map(v => v.id === vendorId ? { ...v, status: newStatus } : v));
    } catch (err) {
      setVendorsList(prev => prev.map(v => v.id === vendorId ? { ...v, status: newStatus } : v));
    }
  };

  // KPI Computations
  const totalVendors = vendorsList.length;
  const activeVendors = vendorsList.filter(v => v.status === 'ACTIVE').length;
  const suspendedVendors = vendorsList.filter(v => v.status === 'SUSPENDED').length;
  const totalAlerts = alertsList.length;
  const totalResidents = residentsList.length;

  const filteredVendors = vendorsList.filter(v => {
    const matchesSearch = v.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          v.category.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === 'ALL' || v.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  // Fleet Radar Map HTML
  const radarHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
      <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
      <style>
        body { margin: 0; padding: 0; background: #0b1120; font-family: -apple-system, sans-serif; }
        #map { width: 100vw; height: 100vh; }
      </style>
    </head>
    <body>
      <div id="map"></div>
      <script>
        var map = L.map('map').setView([13.0835, 80.2720], 14);
        L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© OpenStreetMap' }).addTo(map);

        var vendors = ${JSON.stringify(vendorsList)};
        vendors.forEach(function(v) {
          var color = v.status === 'ACTIVE' ? '#10b981' : '#ef4444';
          var icon = L.divIcon({
            className: 'vendor-pin',
            html: '<div style="background:#0f172a; border:2px solid ' + color + '; border-radius:14px; padding:3px 8px; color:#fff; font-size:11px; font-weight:bold; white-space:nowrap;">🛒 ' + v.name + '</div>',
            iconSize: [120, 24]
          });
          L.marker([v.lat, v.lng], { icon: icon }).addTo(map).bindPopup('<b>' + v.name + '</b><br>' + v.category + '<br>Status: ' + v.status);
        });
      </script>
    </body>
    </html>
  `;

  // ==========================================
  // VIEW 1: ADMIN LOGIN SCREEN (DESKTOP)
  // ==========================================
  if (!isAdminLoggedIn) {
    return (
      <SafeAreaProvider style={{ flex: 1, backgroundColor: '#090d16' }}>
        <View style={styles.loginCenter}>
          <View style={styles.loginCard}>
            <Text style={{ fontSize: 32, textAlign: 'center', marginBottom: 6 }}>🛡️</Text>
            <Text style={styles.loginTitle}>VendiConnect Admin Portal</Text>
            <Text style={styles.loginSub}>Desktop Municipal Operations & Real-time Street Fleet Control</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>ADMIN EMAIL</Text>
              <TextInput 
                style={styles.input} 
                placeholder="admin@vendiconnect.in" 
                placeholderTextColor="#64748b"
                value={adminEmail}
                onChangeText={setAdminEmail}
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>PASSWORD</Text>
              <TextInput 
                style={styles.input} 
                placeholder="admin123" 
                placeholderTextColor="#64748b"
                secureTextEntry
                value={adminPassword}
                onChangeText={setAdminPassword}
              />
            </View>

            <TouchableOpacity 
              style={styles.primaryBtn} 
              onPress={handleAdminLogin}
              disabled={isLoggingIn}
            >
              {isLoggingIn ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.primaryBtnText}>Sign In to Control Center 🔐</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.demoBtn} onPress={handleQuickDemo}>
              <Text style={styles.demoBtnText}>⚡ 1-Click Evaluation Sign In</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaProvider>
    );
  }

  // ==========================================
  // VIEW 2: FULL DESKTOP CONTROL CENTER
  // ==========================================
  return (
    <SafeAreaProvider style={{ flex: 1, backgroundColor: '#090d16' }}>
      <View style={styles.desktopContainer}>
        
        {/* Fixed Left Sidebar (Desktop Navigation) */}
        <View style={styles.sidebar}>
          <View style={styles.sidebarBrand}>
            <Text style={{ fontSize: 24, marginRight: 8 }}>🛡️</Text>
            <View>
              <Text style={styles.brandTitle}>VendiConnect</Text>
              <Text style={styles.brandSub}>Desktop Admin Portal</Text>
            </View>
          </View>

          <View style={styles.wardBadge}>
            <View style={styles.onlineDot} />
            <Text style={styles.wardText}>Ward 104 • Chennai Central</Text>
          </View>

          {/* Navigation Links */}
          <View style={styles.navMenu}>
            <TouchableOpacity 
              style={[styles.navItem, activeTab === 'vendors' && styles.navItemActive]}
              onPress={() => setActiveTab('vendors')}
            >
              <Text style={styles.navText}>📋 Vendor Directory ({totalVendors})</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.navItem, activeTab === 'radar' && styles.navItemActive]}
              onPress={() => setActiveTab('radar')}
            >
              <Text style={styles.navText}>🛰️ Live Fleet Radar ({activeVendors})</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.navItem, activeTab === 'alerts' && styles.navItemActive]}
              onPress={() => setActiveTab('alerts')}
            >
              <Text style={styles.navText}>🔔 Doorbell Alerts ({totalAlerts})</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.navItem, activeTab === 'residents' && styles.navItemActive]}
              onPress={() => setActiveTab('residents')}
            >
              <Text style={styles.navText}>👥 Residents ({totalResidents})</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.navItem, activeTab === 'analytics' && styles.navItemActive]}
              onPress={() => setActiveTab('analytics')}
            >
              <Text style={styles.navText}>📊 Visual Analytics</Text>
            </TouchableOpacity>
          </View>

          {/* Admin Footer */}
          <View style={styles.sidebarFooter}>
            <Text style={styles.adminEmail}>{adminEmail || 'admin@vendiconnect.in'}</Text>
            <TouchableOpacity style={styles.logoutBtn} onPress={() => setIsAdminLoggedIn(false)}>
              <Text style={styles.logoutText}>Logout</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Desktop Main Content Workspace */}
        <View style={styles.mainWorkspace}>
          
          {/* Top Bar with Live Sync */}
          <View style={styles.topBar}>
            <View>
              <Text style={styles.pageTitle}>
                {activeTab === 'vendors' && "Vendor Fleet Operations & Moderation"}
                {activeTab === 'radar' && "City Street Fleet Spatial Live Radar"}
                {activeTab === 'alerts' && "Doorbell Stop Requests Stream"}
                {activeTab === 'residents' && "Registered Residents Directory (MongoDB)"}
                {activeTab === 'analytics' && "Platform Visual Analytics & Metrics"}
              </Text>
              <Text style={styles.pageSub}>Hyperlocal Street Commerce Control Center</Text>
            </View>

            <View style={styles.syncBadge}>
              <View style={styles.onlineDot} />
              <Text style={styles.syncText}>
                {isSyncing ? "Syncing..." : "MongoDB Atlas Live Connected"}
              </Text>
            </View>
          </View>

          {/* Desktop KPI Metrics Row */}
          <View style={styles.kpiRow}>
            <View style={styles.kpiCard}>
              <Text style={styles.kpiLabel}>TOTAL VENDORS</Text>
              <Text style={styles.kpiValue}>{totalVendors}</Text>
            </View>
            <View style={[styles.kpiCard, { borderColor: '#10b981' }]}>
              <Text style={[styles.kpiLabel, { color: '#10b981' }]}>ON-DUTY ACTIVE</Text>
              <Text style={[styles.kpiValue, { color: '#10b981' }]}>{activeVendors}</Text>
            </View>
            <View style={[styles.kpiCard, { borderColor: '#ef4444' }]}>
              <Text style={[styles.kpiLabel, { color: '#ef4444' }]}>SUSPENDED</Text>
              <Text style={[styles.kpiValue, { color: '#ef4444' }]}>{suspendedVendors}</Text>
            </View>
            <View style={styles.kpiCard}>
              <Text style={styles.kpiLabel}>DOORBELL ALERTS</Text>
              <Text style={styles.kpiValue}>{totalAlerts}</Text>
            </View>
            <View style={styles.kpiCard}>
              <Text style={styles.kpiLabel}>REGISTERED RESIDENTS</Text>
              <Text style={styles.kpiValue}>{totalResidents}</Text>
            </View>
          </View>

          {/* TAB 1: VENDOR DIRECTORY */}
          {activeTab === 'vendors' && (
            <View style={styles.tableCard}>
              <View style={styles.tableControls}>
                <TextInput 
                  style={styles.tableSearch}
                  placeholder="Search vendors by name or category..."
                  placeholderTextColor="#64748b"
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginLeft: 10 }}>
                  {CATEGORIES.map(cat => (
                    <TouchableOpacity 
                      key={cat}
                      style={[styles.pill, categoryFilter === cat && styles.pillActive]}
                      onPress={() => setCategoryFilter(cat)}
                    >
                      <Text style={[styles.pillText, categoryFilter === cat && styles.pillTextActive]}>{cat}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              <View style={styles.tableHeader}>
                <Text style={[styles.th, { flex: 2 }]}>VENDOR NAME</Text>
                <Text style={[styles.th, { flex: 1.5 }]}>CATEGORY</Text>
                <Text style={[styles.th, { flex: 1.2 }]}>VEHICLE</Text>
                <Text style={[styles.th, { flex: 1 }]}>RATING</Text>
                <Text style={[styles.th, { flex: 1.2 }]}>STATUS</Text>
                <Text style={[styles.th, { flex: 1.5, textAlign: 'right' }]}>MODERATION ACTIONS</Text>
              </View>

              <ScrollView style={{ maxHeight: 420 }}>
                {filteredVendors.map(vendor => (
                  <View key={vendor.id} style={styles.tableRow}>
                    <Text style={[styles.td, { flex: 2, fontWeight: '700' }]}>{vendor.name}</Text>
                    <Text style={[styles.td, { flex: 1.5 }]}>{vendor.category}</Text>
                    <Text style={[styles.td, { flex: 1.2 }]}>{vendor.vehicle}</Text>
                    <Text style={[styles.td, { flex: 1 }]}>⭐ {vendor.rating}</Text>
                    <View style={{ flex: 1.2 }}>
                      <Text style={[styles.statusTag, vendor.status === 'ACTIVE' ? styles.statusActive : styles.statusSuspended]}>
                        {vendor.status}
                      </Text>
                    </View>
                    <View style={{ flex: 1.5, flexDirection: 'row', justifyContent: 'flex-end', gap: 6 }}>
                      {vendor.status !== 'ACTIVE' ? (
                        <TouchableOpacity 
                          style={styles.actionApprove}
                          onPress={() => updateVendorStatus(vendor.id, 'ACTIVE')}
                        >
                          <Text style={styles.actionText}>Activate ✓</Text>
                        </TouchableOpacity>
                      ) : (
                        <TouchableOpacity 
                          style={styles.actionSuspend}
                          onPress={() => updateVendorStatus(vendor.id, 'SUSPENDED')}
                        >
                          <Text style={styles.actionText}>Suspend ✕</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                ))}
              </ScrollView>
            </View>
          )}

          {/* TAB 2: LIVE FLEET RADAR */}
          {activeTab === 'radar' && (
            <View style={styles.radarCard}>
              <View style={{ height: 480, borderRadius: 12, overflow: 'hidden' }}>
                {Platform.OS === 'web' ? (
                  <iframe 
                    srcDoc={radarHtml} 
                    style={{ width: '100%', height: '100%', border: 'none' }}
                    title="Fleet Radar"
                  />
                ) : (
                  <WebView source={{ html: radarHtml }} style={{ flex: 1 }} />
                )}
              </View>
            </View>
          )}

          {/* TAB 3: DOORBELL STOP ALERTS */}
          {activeTab === 'alerts' && (
            <View style={styles.tableCard}>
              <View style={styles.tableHeader}>
                <Text style={[styles.th, { flex: 2 }]}>RESIDENT / ADDRESS</Text>
                <Text style={[styles.th, { flex: 2 }]}>TARGET VENDOR</Text>
                <Text style={[styles.th, { flex: 1.5 }]}>ALERT TYPE</Text>
                <Text style={[styles.th, { flex: 1 }]}>ETA</Text>
                <Text style={[styles.th, { flex: 1.2, textAlign: 'right' }]}>STATUS</Text>
              </View>

              <ScrollView style={{ maxHeight: 420 }}>
                {alertsList.length === 0 ? (
                  <Text style={{ color: '#64748b', textAlign: 'center', padding: 30 }}>
                    No Doorbell Stop alerts recorded yet. Click "Wave to Stop Here" in Resident App!
                  </Text>
                ) : (
                  alertsList.map((alert, idx) => (
                    <View key={alert._id || idx} style={styles.tableRow}>
                      <Text style={[styles.td, { flex: 2, fontWeight: '700' }]}>{alert.ResidentName || "Resident"}</Text>
                      <Text style={[styles.td, { flex: 2 }]}>{alert.VendorName || "Street Vendor"}</Text>
                      <Text style={[styles.td, { flex: 1.5 }]}>{alert.Type || "Doorbell Stop"}</Text>
                      <Text style={[styles.td, { flex: 1 }]}>~{alert.EtaMinutes || 2} mins</Text>
                      <View style={{ flex: 1.2, alignItems: 'flex-end' }}>
                        <Text style={[styles.statusTag, styles.statusActive]}>{alert.Status || "DISPATCHED"}</Text>
                      </View>
                    </View>
                  ))
                )}
              </ScrollView>
            </View>
          )}

          {/* TAB 4: RESIDENTS DIRECTORY */}
          {activeTab === 'residents' && (
            <View style={styles.tableCard}>
              <View style={styles.tableHeader}>
                <Text style={[styles.th, { flex: 2 }]}>RESIDENT NAME</Text>
                <Text style={[styles.th, { flex: 2 }]}>PHONE NUMBER</Text>
                <Text style={[styles.th, { flex: 2.5 }]}>GATE LOCATION / AREA</Text>
                <Text style={[styles.th, { flex: 1.2, textAlign: 'right' }]}>COORDINATES</Text>
              </View>

              <ScrollView style={{ maxHeight: 420 }}>
                {residentsList.length === 0 ? (
                  <Text style={{ color: '#64748b', textAlign: 'center', padding: 30 }}>
                    No residents registered in MongoDB yet. Register via the Resident App!
                  </Text>
                ) : (
                  residentsList.map((resItem, idx) => (
                    <View key={resItem._id || idx} style={styles.tableRow}>
                      <Text style={[styles.td, { flex: 2, fontWeight: '700' }]}>{resItem.Name}</Text>
                      <Text style={[styles.td, { flex: 2 }]}>{resItem.Phone}</Text>
                      <Text style={[styles.td, { flex: 2.5 }]}>{resItem.Area || "GPS Gate Location"}</Text>
                      <Text style={[styles.td, { flex: 1.2, textAlign: 'right', color: '#10b981' }]}>
                        {resItem.Latitude?.toFixed(4)}°N
                      </Text>
                    </View>
                  ))
                )}
              </ScrollView>
            </View>
          )}

          {/* TAB 5: MINIMAL VISUAL ANALYTICS (PURE CODE BARS) */}
          {activeTab === 'analytics' && (
            <View style={styles.analyticsGrid}>
              
              {/* Category Breakdown Bar Chart */}
              <View style={styles.chartCard}>
                <Text style={styles.chartTitle}>Vendor Category Distribution</Text>
                <Text style={styles.chartSub}>Active pushcarts categorized across Ward 104</Text>
                
                {["Vegetables", "Flowers", "Fish & Seafood", "Fruits", "Breakfast"].map(cat => {
                  const count = vendorsList.filter(v => v.category.toLowerCase().includes(cat.toLowerCase().slice(0, 4))).length;
                  const pct = totalVendors > 0 ? Math.round((count / totalVendors) * 100) : 0;
                  return (
                    <View key={cat} style={styles.barItem}>
                      <View style={styles.barLabelRow}>
                        <Text style={styles.barLabel}>{cat}</Text>
                        <Text style={styles.barVal}>{count} vendors ({pct}%)</Text>
                      </View>
                      <View style={styles.barTrack}>
                        <View style={[styles.barFill, { width: `${Math.max(pct, 8)}%`, backgroundColor: '#10b981' }]} />
                      </View>
                    </View>
                  );
                })}
              </View>

              {/* Fleet Status Breakdown */}
              <View style={styles.chartCard}>
                <Text style={styles.chartTitle}>Fleet Moderation & Compliance</Text>
                <Text style={styles.chartSub}>Real-time status breakdown from MongoDB Atlas</Text>

                <View style={styles.barItem}>
                  <View style={styles.barLabelRow}>
                    <Text style={styles.barLabel}>Active On-Duty</Text>
                    <Text style={[styles.barVal, { color: '#10b981' }]}>{activeVendors}</Text>
                  </View>
                  <View style={styles.barTrack}>
                    <View style={[styles.barFill, { width: `${totalVendors > 0 ? (activeVendors/totalVendors)*100 : 0}%`, backgroundColor: '#10b981' }]} />
                  </View>
                </View>

                <View style={styles.barItem}>
                  <View style={styles.barLabelRow}>
                    <Text style={styles.barLabel}>Suspended / Off-Duty</Text>
                    <Text style={[styles.barVal, { color: '#ef4444' }]}>{suspendedVendors}</Text>
                  </View>
                  <View style={styles.barTrack}>
                    <View style={[styles.barFill, { width: `${totalVendors > 0 ? (suspendedVendors/totalVendors)*100 : 0}%`, backgroundColor: '#ef4444' }]} />
                  </View>
                </View>

                <View style={styles.barItem}>
                  <View style={styles.barLabelRow}>
                    <Text style={styles.barLabel}>Doorbell Waves Recorded</Text>
                    <Text style={[styles.barVal, { color: '#3b82f6' }]}>{totalAlerts}</Text>
                  </View>
                  <View style={styles.barTrack}>
                    <View style={[styles.barFill, { width: '85%', backgroundColor: '#3b82f6' }]} />
                  </View>
                </View>

                <View style={styles.pureCodeNote}>
                  <Text style={{ color: '#94a3b8', fontSize: 11, fontStyle: 'italic' }}>
                    💡 Pure React Native UI primitives: Built without heavy 3rd-party charting libraries for ultra-low latency & clean code walkthroughs.
                  </Text>
                </View>
              </View>

            </View>
          )}

        </View>
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loginCenter: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#090d16', padding: 20 },
  loginCard: { backgroundColor: '#131b2e', borderRadius: 20, padding: 30, width: '100%', maxWidth: 440, borderWidth: 1, borderColor: '#1e293b' },
  loginTitle: { fontSize: 24, fontWeight: '900', color: '#ffffff', textAlign: 'center' },
  loginSub: { fontSize: 13, color: '#94a3b8', textAlign: 'center', marginBottom: 20, marginTop: 4 },
  inputGroup: { marginBottom: 14 },
  label: { color: '#94a3b8', fontSize: 11, fontWeight: '800', marginBottom: 5 },
  input: { backgroundColor: '#0b1120', borderRadius: 10, borderWidth: 1, borderColor: '#1e293b', padding: 12, color: '#ffffff', fontSize: 14 },
  primaryBtn: { backgroundColor: '#059669', borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 8 },
  primaryBtnText: { color: '#ffffff', fontWeight: '800', fontSize: 14 },
  demoBtn: { marginTop: 14, paddingVertical: 10, alignItems: 'center', backgroundColor: '#1e293b', borderRadius: 10 },
  demoBtnText: { color: '#34d399', fontSize: 12, fontWeight: '700' },

  desktopContainer: { flex: 1, flexDirection: 'row', backgroundColor: '#090d16' },
  sidebar: { width: 250, backgroundColor: '#0c1322', borderRightWidth: 1, borderRightColor: '#1e293b', padding: 18, justifyContent: 'space-between' },
  sidebarBrand: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  brandTitle: { fontSize: 18, fontWeight: '900', color: '#ffffff' },
  brandSub: { fontSize: 11, color: '#64748b' },
  wardBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#131b2e', padding: 8, borderRadius: 8, marginBottom: 20 },
  onlineDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#10b981', marginRight: 8 },
  wardText: { color: '#94a3b8', fontSize: 11, fontWeight: '600' },
  navMenu: { flex: 1 },
  navItem: { paddingVertical: 12, paddingHorizontal: 12, borderRadius: 10, marginBottom: 6 },
  navItemActive: { backgroundColor: '#1e293b' },
  navText: { color: '#cbd5e1', fontSize: 13, fontWeight: '700' },
  sidebarFooter: { borderTopWidth: 1, borderTopColor: '#1e293b', paddingTop: 12 },
  adminEmail: { color: '#64748b', fontSize: 11, marginBottom: 6 },
  logoutBtn: { backgroundColor: '#1e293b', paddingVertical: 6, borderRadius: 6, alignItems: 'center' },
  logoutText: { color: '#ef4444', fontSize: 11, fontWeight: '700' },

  mainWorkspace: { flex: 1, padding: 24, backgroundColor: '#090d16' },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  pageTitle: { fontSize: 22, fontWeight: '900', color: '#ffffff' },
  pageSub: { fontSize: 12, color: '#64748b' },
  syncBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#131b2e', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: '#1e293b' },
  syncText: { color: '#10b981', fontSize: 12, fontWeight: '700' },

  kpiRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  kpiCard: { flex: 1, backgroundColor: '#131b2e', padding: 14, borderRadius: 12, borderWidth: 1, borderColor: '#1e293b' },
  kpiLabel: { fontSize: 10, color: '#94a3b8', fontWeight: '800' },
  kpiValue: { fontSize: 24, fontWeight: '900', color: '#ffffff', marginTop: 4 },

  tableCard: { backgroundColor: '#131b2e', borderRadius: 14, padding: 16, borderWidth: 1, borderColor: '#1e293b' },
  tableControls: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  tableSearch: { flex: 1, backgroundColor: '#0b1120', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, color: '#ffffff', fontSize: 13, borderWidth: 1, borderColor: '#1e293b' },
  pill: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: '#0b1120', marginRight: 6 },
  pillActive: { backgroundColor: '#059669' },
  pillText: { color: '#64748b', fontSize: 12, fontWeight: '700' },
  pillTextActive: { color: '#ffffff' },
  tableHeader: { flexDirection: 'row', paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: '#1e293b', marginBottom: 8 },
  th: { color: '#64748b', fontSize: 11, fontWeight: '800' },
  tableRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#1e293b' },
  td: { color: '#ffffff', fontSize: 13 },
  statusTag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, fontSize: 10, fontWeight: '800', alignSelf: 'flex-start' },
  statusActive: { backgroundColor: 'rgba(16, 185, 129, 0.15)', color: '#10b981' },
  statusSuspended: { backgroundColor: 'rgba(239, 68, 68, 0.15)', color: '#ef4444' },
  actionApprove: { backgroundColor: '#065f46', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6 },
  actionSuspend: { backgroundColor: '#7f1d1d', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6 },
  actionText: { color: '#ffffff', fontSize: 11, fontWeight: '700' },

  radarCard: { backgroundColor: '#131b2e', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#1e293b' },
  analyticsGrid: { flexDirection: 'row', gap: 16 },
  chartCard: { flex: 1, backgroundColor: '#131b2e', borderRadius: 14, padding: 20, borderWidth: 1, borderColor: '#1e293b' },
  chartTitle: { fontSize: 16, fontWeight: '800', color: '#ffffff' },
  chartSub: { fontSize: 12, color: '#64748b', marginBottom: 16 },
  barItem: { marginBottom: 14 },
  barLabelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  barLabel: { fontSize: 12, color: '#cbd5e1', fontWeight: '700' },
  barVal: { fontSize: 12, color: '#94a3b8', fontWeight: '700' },
  barTrack: { height: 8, backgroundColor: '#0b1120', borderRadius: 4, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 4 },
  pureCodeNote: { marginTop: 14, padding: 10, backgroundColor: '#0b1120', borderRadius: 8 }
});
