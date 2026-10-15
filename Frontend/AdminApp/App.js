import React, { useState } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  TextInput, 
  ScrollView, 
  TouchableOpacity, 
  Dimensions,
  Platform,
  Modal
} from 'react-native';
import { SafeAreaView, SafeAreaProvider } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';

const INITIAL_VENDORS = [
  { 
    id: 1, 
    name: "Santhosh Poo Kadai", 
    phone: "+91 93847 66429",
    category: "Flowers", 
    vehicle: "Pushcart", 
    status: "ACTIVE", 
    rating: 4.9, 
    tripsToday: 18,
    lat: 13.0827, 
    lng: 80.2707,
    registeredDate: "12 Sep 2026",
    verified: true
  },
  { 
    id: 2, 
    name: "Muthu Fresh Vegetables", 
    phone: "+91 98401 23456",
    category: "Vegetables", 
    vehicle: "Pushcart", 
    status: "ACTIVE", 
    rating: 4.8, 
    tripsToday: 24,
    lat: 13.0850, 
    lng: 80.2750,
    registeredDate: "15 Sep 2026",
    verified: true
  },
  { 
    id: 3, 
    name: "Kannan Sea Catch", 
    phone: "+91 94440 98765",
    category: "Fish & Seafood", 
    vehicle: "Auto-rickshaw", 
    status: "ACTIVE", 
    rating: 4.9, 
    tripsToday: 31,
    lat: 13.0780, 
    lng: 80.2650,
    registeredDate: "18 Sep 2026",
    verified: true
  },
  { 
    id: 4, 
    name: "Subbu Kovai Fruits", 
    phone: "+91 98840 55667",
    category: "Fruits", 
    vehicle: "Pushcart", 
    status: "PENDING", 
    rating: 4.5, 
    tripsToday: 0,
    lat: 13.0810, 
    lng: 80.2770,
    registeredDate: "05 Oct 2026",
    verified: false
  },
  { 
    id: 5, 
    name: "Amma Tiffin & Kaapi", 
    phone: "+91 97910 11223",
    category: "Breakfast", 
    vehicle: "Van", 
    status: "INACTIVE", 
    rating: 4.7, 
    tripsToday: 12,
    lat: 13.0900, 
    lng: 80.2720,
    registeredDate: "20 Sep 2026",
    verified: true
  },
  { 
    id: 6, 
    name: "Murugan Chai & Snacks", 
    phone: "+91 91234 56789",
    category: "Snacks", 
    vehicle: "Bicycle", 
    status: "SUSPENDED", 
    rating: 4.2, 
    tripsToday: 5,
    lat: 13.0835, 
    lng: 80.2715,
    registeredDate: "01 Oct 2026",
    verified: false
  }
];

const RECENT_ALERTS = [
  { id: 101, resident: "Poongodi S. (Flat 4A)", vendor: "Santhosh Poo Kadai", time: "2 mins ago", type: "Stop Request", status: "ACKNOWLEDGED", lat: 13.0830, lng: 80.2710 },
  { id: 102, resident: "Kavitha R. (Lotus Apt)", vendor: "Muthu Fresh Vegetables", time: "7 mins ago", type: "Price Inquiry", status: "COMPLETED", lat: 13.0845, lng: 80.2740 },
  { id: 103, resident: "Rajesh M. (Plot 12)", vendor: "Kannan Sea Catch", time: "14 mins ago", type: "Stop Request", status: "ARRIVED", lat: 13.0790, lng: 80.2660 },
  { id: 104, resident: "Ananya S. (2nd Cross)", vendor: "Amma Tiffin & Kaapi", time: "28 mins ago", type: "Order Alert", status: "COMPLETED", lat: 13.0890, lng: 80.2710 }
];

const CATEGORIES = ["ALL", "Flowers", "Vegetables", "Fish & Seafood", "Fruits", "Breakfast", "Snacks"];

export default function App() {
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [activeTab, setActiveTab] = useState('vendors'); // 'vendors' | 'radar' | 'alerts'
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [vendorsList, setVendorsList] = useState(INITIAL_VENDORS);
  const [selectedVendorModal, setSelectedVendorModal] = useState(null);

  const handleAdminLogin = () => {
    if (!adminEmail || !adminPassword) {
      alert("Please enter admin credentials (admin@vendiconnect.in / admin123)");
      return;
    }
    setIsAdminLoggedIn(true);
  };

  const handleQuickDemo = () => {
    setAdminEmail('admin@vendiconnect.in');
    setAdminPassword('admin123');
    setIsAdminLoggedIn(true);
  };

  const toggleVendorStatus = (id, newStatus) => {
    setVendorsList(prev => prev.map(v => v.id === id ? { ...v, status: newStatus } : v));
    if (selectedVendorModal && selectedVendorModal.id === id) {
      setSelectedVendorModal(prev => ({ ...prev, status: newStatus }));
    }
  };

  const filteredVendors = vendorsList.filter(v => {
    const matchesSearch = v.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          v.phone.includes(searchQuery) ||
                          v.category.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === 'ALL' || v.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const totalCount = vendorsList.length;
  const activeCount = vendorsList.filter(v => v.status === 'ACTIVE').length;
  const pendingCount = vendorsList.filter(v => v.status === 'PENDING').length;
  const suspendedCount = vendorsList.filter(v => v.status === 'SUSPENDED').length;

  // HTML map for Fleet Radar
  const radarHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
      <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
      <style>
        body { margin: 0; padding: 0; background: #0b1120; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
        #map { width: 100vw; height: 100vh; background: #0b1120; }
        .radar-pulse {
          width: 14px; height: 14px; border-radius: 50%; background: #10b981;
          box-shadow: 0 0 0 rgba(16, 185, 129, 0.7);
          animation: pulse 2s infinite;
        }
        @keyframes pulse {
          0% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7); }
          70% { box-shadow: 0 0 0 16px rgba(16, 185, 129, 0); }
          100% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
        }
        .vendor-pin {
          background: #131b2e; border: 2px solid #10b981; border-radius: 20px;
          padding: 4px 8px; color: #fff; font-size: 11px; font-weight: 700;
          box-shadow: 0 4px 12px rgba(0,0,0,0.5); display: flex; align-items: center; gap: 4px;
          white-space: nowrap;
        }
      </style>
    </head>
    <body>
      <div id="map"></div>
      <script>
        var map = L.map('map', { zoomControl: true }).setView([13.0835, 80.2720], 15);
        L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
          maxZoom: 19,
          attribution: '© CartoDB'
        }).addTo(map);

        var vendors = ${JSON.stringify(vendorsList)};
        vendors.forEach(function(v) {
          var color = v.status === 'ACTIVE' ? '#10b981' : (v.status === 'PENDING' ? '#f59e0b' : '#ef4444');
          var icon = L.divIcon({
            className: 'custom-pin',
            html: '<div style="background:#131b2e; border:2px solid ' + color + '; border-radius:18px; padding:3px 8px; color:#fff; font-size:11px; font-weight:bold; box-shadow:0 4px 10px rgba(0,0,0,0.4); display:flex; align-items:center; gap:4px;">' +
                  '<span>' + (v.status === 'ACTIVE' ? '🛒' : '⏸️') + '</span> ' + v.name + '</div>',
            iconSize: [120, 30],
            iconAnchor: [60, 15]
          });
          L.marker([v.lat, v.lng], { icon: icon }).addTo(map)
            .bindPopup('<b>' + v.name + '</b><br>' + v.category + ' • ' + v.vehicle + '<br>Status: ' + v.status);
        });
      </script>
    </body>
    </html>
  `;

  // =========================================================
  // VIEW 1: AUTHENTICATION SCREEN
  // =========================================================
  if (!isAdminLoggedIn) {
    return (
      <SafeAreaProvider style={{ flex: 1, backgroundColor: '#090d16' }}>
        <View style={styles.loginRoot}>
          <View style={styles.loginCard}>
            <View style={styles.loginHeader}>
              <View style={styles.loginShieldCircle}>
                <Text style={{ fontSize: 30 }}>🛡️</Text>
              </View>
              <Text style={styles.loginTitle}>VendiConnect Portal</Text>
              <Text style={styles.loginSub}>
                Executive Municipal Administration & Vendor Oversight
              </Text>
            </View>

            <View style={styles.fieldBox}>
              <Text style={styles.fieldLabel}>OFFICIAL ADMIN EMAIL</Text>
              <TextInput
                style={styles.textInput}
                placeholder="admin@vendiconnect.in"
                placeholderTextColor="#64748b"
                value={adminEmail}
                onChangeText={setAdminEmail}
                autoCapitalize="none"
              />
            </View>

            <View style={styles.fieldBox}>
              <Text style={styles.fieldLabel}>SECURITY PASSWORD / KEY</Text>
              <TextInput
                style={styles.textInput}
                placeholder="••••••••••••"
                placeholderTextColor="#64748b"
                secureTextEntry
                value={adminPassword}
                onChangeText={setAdminPassword}
              />
            </View>

            <TouchableOpacity style={styles.submitBtn} onPress={handleAdminLogin}>
              <Text style={styles.submitBtnText}>Sign In to Control Center 🔐</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.quickDemoCard} onPress={handleQuickDemo}>
              <View style={styles.demoIconRing}>
                <Text style={{ fontSize: 18 }}>⚡</Text>
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.quickDemoTitle}>1-Click Evaluation Sign In</Text>
                <Text style={styles.quickDemoSub}>Instant administrative oversight (demo mode)</Text>
              </View>
              <Text style={{ color: '#10b981', fontWeight: '900' }}>ENTER ›</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaProvider>
    );
  }

  // =========================================================
  // VIEW 2: FULL AUTHENTICATED WORKSPACE WITH TABS
  // =========================================================
  return (
    <SafeAreaProvider style={{ flex: 1, backgroundColor: '#090d16' }}>
      <View style={styles.desktopRoot}>

        {/* 1. FIXED LEFT SIDEBAR */}
        <View style={styles.sidebar}>
          <View>
            <View style={styles.brandHeader}>
              <View style={styles.brandIconCircle}>
                <Text style={{ fontSize: 20 }}>🛡️</Text>
              </View>
              <View style={{ marginLeft: 12 }}>
                <Text style={styles.brandTitle}>VendiConnect</Text>
                <Text style={styles.brandSub}>Admin Portal • Web</Text>
              </View>
            </View>

            <View style={styles.wardBadge}>
              <View style={styles.greenOnlineDot} />
              <Text style={styles.wardBadgeText}>Ward 104 • Chennai Central</Text>
            </View>

            <View style={styles.navMenu}>
              <TouchableOpacity 
                style={[styles.navItem, activeTab === 'vendors' && styles.navItemActive]}
                onPress={() => setActiveTab('vendors')}
              >
                <Text style={styles.navIcon}>📋</Text>
                <Text style={[styles.navText, activeTab === 'vendors' && styles.navTextActive]}>
                  Vendor Directory
                </Text>
                <View style={styles.countBadge}>
                  <Text style={styles.countBadgeText}>{totalCount}</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.navItem, activeTab === 'radar' && styles.navItemActive]}
                onPress={() => setActiveTab('radar')}
              >
                <Text style={styles.navIcon}>🛰️</Text>
                <Text style={[styles.navText, activeTab === 'radar' && styles.navTextActive]}>
                  Fleet Radar Map
                </Text>
                <View style={[styles.countBadge, { backgroundColor: '#059669' }]}>
                  <Text style={[styles.countBadgeText, { color: '#ffffff' }]}>{activeCount} Live</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.navItem, activeTab === 'alerts' && styles.navItemActive]}
                onPress={() => setActiveTab('alerts')}
              >
                <Text style={styles.navIcon}>🔔</Text>
                <Text style={[styles.navText, activeTab === 'alerts' && styles.navTextActive]}>
                  Doorbell Stop Alerts
                </Text>
                <View style={styles.countBadge}>
                  <Text style={styles.countBadgeText}>{RECENT_ALERTS.length}</Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.sidebarFooter}>
            <View style={styles.adminAvatar}>
              <Text style={{ fontSize: 16 }}>👨‍💼</Text>
            </View>
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={styles.adminName}>Super Admin</Text>
              <Text style={styles.adminEmail}>{adminEmail || 'admin@vendiconnect.in'}</Text>
            </View>
            <TouchableOpacity 
              style={styles.logoutPill}
              onPress={() => setIsAdminLoggedIn(false)}
            >
              <Text style={styles.logoutPillText}>Logout</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 2. MAIN CONTENT AREA */}
        <View style={styles.mainContent}>
          {/* Top App Bar */}
          <View style={styles.topAppBar}>
            <View>
              <Text style={styles.pageTitle}>
                {activeTab === 'vendors' && "Vendor Operations & Moderation Directory"}
                {activeTab === 'radar' && "City Fleet Live Radar Tracking"}
                {activeTab === 'alerts' && "Doorbell Stop Requests & Resident Alerts Log"}
              </Text>
              <Text style={styles.pageSub}>
                {activeTab === 'vendors' && "Approve on-duty pushcarts, manage verification, and inspect KYC profiles"}
                {activeTab === 'radar' && "Real-time spatial monitoring of active street vendors across Ward 104"}
                {activeTab === 'alerts' && "Live feed of resident waves, delivery requests, and arrival confirmations"}
              </Text>
            </View>
            <View style={styles.liveSyncPill}>
              <View style={styles.greenOnlineDot} />
              <Text style={styles.liveSyncText}>MongoDB Atlas Live Sync</Text>
            </View>
          </View>

          {/* 3. KPI CARDS */}
          <View style={styles.kpiGrid}>
            <View style={styles.kpiCard}>
              <View style={styles.kpiTopRow}>
                <Text style={styles.kpiLabel}>TOTAL REGISTERED</Text>
                <Text style={{ fontSize: 18 }}>👥</Text>
              </View>
              <Text style={styles.kpiValue}>{totalCount}</Text>
              <Text style={styles.kpiSub}>Street pushcarts & vans</Text>
            </View>

            <View style={[styles.kpiCard, { borderColor: 'rgba(16, 185, 129, 0.4)' }]}>
              <View style={styles.kpiTopRow}>
                <Text style={[styles.kpiLabel, { color: '#10b981' }]}>ON-DUTY FLEET</Text>
                <Text style={{ fontSize: 18 }}>🟢</Text>
              </View>
              <Text style={[styles.kpiValue, { color: '#10b981' }]}>{activeCount}</Text>
              <Text style={styles.kpiSub}>Broadcasting GPS pins</Text>
            </View>

            <View style={[styles.kpiCard, { borderColor: 'rgba(245, 158, 11, 0.4)' }]}>
              <View style={styles.kpiTopRow}>
                <Text style={[styles.kpiLabel, { color: '#f59e0b' }]}>PENDING KYC</Text>
                <Text style={{ fontSize: 18 }}>⏳</Text>
              </View>
              <Text style={[styles.kpiValue, { color: '#f59e0b' }]}>{pendingCount}</Text>
              <Text style={styles.kpiSub}>Awaiting permit check</Text>
            </View>

            <View style={[styles.kpiCard, { borderColor: 'rgba(239, 68, 68, 0.4)' }]}>
              <View style={styles.kpiTopRow}>
                <Text style={[styles.kpiLabel, { color: '#ef4444' }]}>SUSPENDED</Text>
                <Text style={{ fontSize: 18 }}>🚫</Text>
              </View>
              <Text style={[styles.kpiValue, { color: '#ef4444' }]}>{suspendedCount}</Text>
              <Text style={styles.kpiSub}>Patrol holds / inactive</Text>
            </View>
          </View>

          {/* 4. TAB 1: VENDOR MODERATION DIRECTORY */}
          {activeTab === 'vendors' && (
            <View style={styles.tableCard}>
              <View style={styles.filterBar}>
                <View style={styles.searchBox}>
                  <Text style={{ fontSize: 14, marginRight: 8 }}>🔍</Text>
                  <TextInput
                    style={styles.searchInput}
                    placeholder="Search vendor name, phone, or category..."
                    placeholderTextColor="#64748b"
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                  />
                </View>

                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
                  {CATEGORIES.map((cat, idx) => (
                    <TouchableOpacity
                      key={idx}
                      style={[styles.categoryPill, categoryFilter === cat && styles.categoryPillActive]}
                      onPress={() => setCategoryFilter(cat)}
                    >
                      <Text style={[styles.categoryPillText, categoryFilter === cat && styles.categoryPillTextActive]}>
                        {cat}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              <View style={styles.tableHeaderRow}>
                <Text style={[styles.tableHeadCol, { flex: 2 }]}>VENDOR & SHOP</Text>
                <Text style={[styles.tableHeadCol, { flex: 1.2 }]}>CATEGORY</Text>
                <Text style={[styles.tableHeadCol, { flex: 1 }]}>VEHICLE</Text>
                <Text style={[styles.tableHeadCol, { flex: 1.3 }]}>MOBILE CONTACT</Text>
                <Text style={[styles.tableHeadCol, { flex: 1 }]}>STATUS</Text>
                <Text style={[styles.tableHeadCol, { flex: 1.8, textAlign: 'right' }]}>MODERATION ACTIONS</Text>
              </View>

              <ScrollView style={{ maxHeight: 380 }}>
                {filteredVendors.map((vendor) => {
                  const isActive = vendor.status === 'ACTIVE';
                  const isPending = vendor.status === 'PENDING';
                  const isSuspended = vendor.status === 'SUSPENDED';

                  return (
                    <View key={vendor.id} style={styles.tableRow}>
                      <View style={{ flex: 2, flexDirection: 'row', alignItems: 'center' }}>
                        <View style={styles.vendorAvatar}>
                          <Text style={{ fontSize: 14 }}>🛒</Text>
                        </View>
                        <View style={{ marginLeft: 10 }}>
                          <Text style={styles.vendorNameText}>{vendor.name}</Text>
                          <Text style={styles.vendorMetaText}>⭐ {vendor.rating} • {vendor.tripsToday} trips</Text>
                        </View>
                      </View>

                      <View style={{ flex: 1.2 }}>
                        <Text style={styles.categoryTag}>{vendor.category}</Text>
                      </View>

                      <View style={{ flex: 1 }}>
                        <Text style={styles.vehicleText}>{vendor.vehicle}</Text>
                      </View>

                      <View style={{ flex: 1.3 }}>
                        <Text style={styles.phoneText}>{vendor.phone}</Text>
                      </View>

                      <View style={{ flex: 1 }}>
                        <View style={[
                          styles.statusTag,
                          isActive && styles.statusTagActive,
                          isPending && styles.statusTagPending,
                          isSuspended && styles.statusTagSuspended
                        ]}>
                          <Text style={[
                            styles.statusTagText,
                            isActive && { color: '#10b981' },
                            isPending && { color: '#f59e0b' },
                            isSuspended && { color: '#ef4444' }
                          ]}>
                            {vendor.status}
                          </Text>
                        </View>
                      </View>

                      <View style={{ flex: 1.8, flexDirection: 'row', justifyContent: 'flex-end', gap: 6 }}>
                        <TouchableOpacity 
                          style={styles.actionBtnInspect}
                          onPress={() => setSelectedVendorModal(vendor)}
                        >
                          <Text style={styles.actionBtnInspectText}>Inspect 🔍</Text>
                        </TouchableOpacity>

                        {!isActive ? (
                          <TouchableOpacity 
                            style={styles.actionBtnApprove}
                            onPress={() => toggleVendorStatus(vendor.id, 'ACTIVE')}
                          >
                            <Text style={styles.actionBtnApproveText}>Activate ✓</Text>
                          </TouchableOpacity>
                        ) : (
                          <TouchableOpacity 
                            style={styles.actionBtnSuspend}
                            onPress={() => toggleVendorStatus(vendor.id, 'SUSPENDED')}
                          >
                            <Text style={styles.actionBtnSuspendText}>Suspend ✕</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  );
                })}
              </ScrollView>
            </View>
          )}

          {/* 5. TAB 2: FLEET RADAR MAP */}
          {activeTab === 'radar' && (
            <View style={styles.radarCard}>
              <View style={styles.radarHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={{ fontSize: 16, marginRight: 8 }}>🛰️</Text>
                  <Text style={styles.radarTitle}>Live CartoDB Fleet Spatial Map</Text>
                </View>
                <View style={styles.radarLegend}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 12 }}>
                    <View style={[styles.legendDot, { backgroundColor: '#10b981' }]} />
                    <Text style={styles.legendText}>Active ({activeCount})</Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 12 }}>
                    <View style={[styles.legendDot, { backgroundColor: '#f59e0b' }]} />
                    <Text style={styles.legendText}>Pending ({pendingCount})</Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <View style={[styles.legendDot, { backgroundColor: '#ef4444' }]} />
                    <Text style={styles.legendText}>Suspended ({suspendedCount})</Text>
                  </View>
                </View>
              </View>

              <View style={styles.radarMapBox}>
                {Platform.OS === 'web' ? (
                  <iframe 
                    srcDoc={radarHtml}
                    style={{ width: '100%', height: 420, border: 'none', borderRadius: 14 }}
                    title="Fleet Radar"
                  />
                ) : (
                  <WebView 
                    source={{ html: radarHtml }} 
                    style={{ flex: 1, height: 420, borderRadius: 14 }}
                  />
                )}
              </View>
            </View>
          )}

          {/* 6. TAB 3: DOORBELL STOP ALERTS LOG */}
          {activeTab === 'alerts' && (
            <View style={styles.tableCard}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <Text style={{ color: '#ffffff', fontSize: 16, fontWeight: '800' }}>🔔 Recent Doorbell Stops</Text>
                <Text style={{ color: '#94a3b8', fontSize: 12 }}>Live Dispatch Stream</Text>
              </View>

              <View style={styles.tableHeaderRow}>
                <Text style={[styles.tableHeadCol, { flex: 2 }]}>RESIDENT / ADDRESS</Text>
                <Text style={[styles.tableHeadCol, { flex: 1.5 }]}>TARGET VENDOR</Text>
                <Text style={[styles.tableHeadCol, { flex: 1 }]}>TIME</Text>
                <Text style={[styles.tableHeadCol, { flex: 1.2 }]}>REQUEST TYPE</Text>
                <Text style={[styles.tableHeadCol, { flex: 1, textAlign: 'right' }]}>DISPATCH STATE</Text>
              </View>

              <ScrollView style={{ maxHeight: 380 }}>
                {RECENT_ALERTS.map((alert) => (
                  <View key={alert.id} style={styles.tableRow}>
                    <View style={{ flex: 2, flexDirection: 'row', alignItems: 'center' }}>
                      <Text style={{ fontSize: 18, marginRight: 10 }}>🏠</Text>
                      <View>
                        <Text style={styles.vendorNameText}>{alert.resident}</Text>
                        <Text style={styles.vendorMetaText}>Gate coordinates locked</Text>
                      </View>
                    </View>
                    <View style={{ flex: 1.5 }}>
                      <Text style={styles.categoryTag}>{alert.vendor}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.phoneText}>{alert.time}</Text>
                    </View>
                    <View style={{ flex: 1.2 }}>
                      <Text style={styles.vehicleText}>{alert.type}</Text>
                    </View>
                    <View style={{ flex: 1, alignItems: 'flex-end' }}>
                      <View style={[styles.statusTag, styles.statusTagActive]}>
                        <Text style={[styles.statusTagText, { color: '#10b981' }]}>{alert.status}</Text>
                      </View>
                    </View>
                  </View>
                ))}
              </ScrollView>
            </View>
          )}
        </View>

        {/* 7. VENDOR INSPECTION MODAL */}
        {selectedVendorModal && (
          <Modal transparent visible={!!selectedVendorModal} animationType="fade">
            <View style={styles.modalBackdrop}>
              <View style={styles.modalCard}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <Text style={styles.modalTitle}>Vendor KYC Verification File</Text>
                  <TouchableOpacity onPress={() => setSelectedVendorModal(null)}>
                    <Text style={{ color: '#94a3b8', fontSize: 18, fontWeight: '700' }}>✕</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.modalGrid}>
                  <View style={styles.modalInfoBox}>
                    <Text style={styles.modalLabel}>SHOP / VENDOR NAME</Text>
                    <Text style={styles.modalVal}>{selectedVendorModal.name}</Text>
                  </View>
                  <View style={styles.modalInfoBox}>
                    <Text style={styles.modalLabel}>CONTACT NUMBER</Text>
                    <Text style={styles.modalVal}>{selectedVendorModal.phone}</Text>
                  </View>
                  <View style={styles.modalInfoBox}>
                    <Text style={styles.modalLabel}>CATEGORY</Text>
                    <Text style={styles.modalVal}>{selectedVendorModal.category}</Text>
                  </View>
                  <View style={styles.modalInfoBox}>
                    <Text style={styles.modalLabel}>VEHICLE TYPE</Text>
                    <Text style={styles.modalVal}>{selectedVendorModal.vehicle}</Text>
                  </View>
                  <View style={styles.modalInfoBox}>
                    <Text style={styles.modalLabel}>REGISTERED DATE</Text>
                    <Text style={styles.modalVal}>{selectedVendorModal.registeredDate}</Text>
                  </View>
                  <View style={styles.modalInfoBox}>
                    <Text style={styles.modalLabel}>WARD PERMIT STATUS</Text>
                    <Text style={[styles.modalVal, { color: selectedVendorModal.status === 'ACTIVE' ? '#10b981' : '#f59e0b' }]}>
                      {selectedVendorModal.status}
                    </Text>
                  </View>
                </View>

                <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 24 }}>
                  <TouchableOpacity 
                    style={[styles.modalBtn, { backgroundColor: '#fee2e2' }]}
                    onPress={() => {
                      toggleVendorStatus(selectedVendorModal.id, 'SUSPENDED');
                      setSelectedVendorModal(null);
                    }}
                  >
                    <Text style={{ color: '#dc2626', fontWeight: '800', fontSize: 12 }}>Suspend Patrol ✕</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.modalBtn, { backgroundColor: '#dcfce7' }]}
                    onPress={() => {
                      toggleVendorStatus(selectedVendorModal.id, 'ACTIVE');
                      setSelectedVendorModal(null);
                    }}
                  >
                    <Text style={{ color: '#059669', fontWeight: '800', fontSize: 12 }}>Approve & Activate ✓</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>
        )}

      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loginRoot: {
    flex: 1,
    minHeight: '100%',
    backgroundColor: '#090d16',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  loginCard: {
    width: '100%',
    maxWidth: 460,
    backgroundColor: '#131b2e',
    borderRadius: 24,
    padding: 32,
    borderWidth: 1,
    borderColor: '#1e293b',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.5,
    shadowRadius: 32,
    elevation: 12,
  },
  loginHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  loginShieldCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#059669',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 14,
  },
  loginTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: -0.5,
  },
  loginSub: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 4,
    textAlign: 'center',
    lineHeight: 18,
  },
  fieldBox: {
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#94a3b8',
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  textInput: {
    backgroundColor: '#0b1120',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1e293b',
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: '#ffffff',
    fontSize: 14,
  },
  submitBtn: {
    backgroundColor: '#059669',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  submitBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '900',
  },
  quickDemoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    borderRadius: 14,
    padding: 12,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  demoIconRing: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#0b1120',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickDemoTitle: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
  },
  quickDemoSub: {
    color: '#94a3b8',
    fontSize: 11,
    marginTop: 2,
  },

  // DESKTOP LAYOUT
  desktopRoot: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#090d16',
    minHeight: '100%',
  },

  // SIDEBAR
  sidebar: {
    width: 260,
    backgroundColor: '#0b1120',
    borderRightWidth: 1,
    borderRightColor: '#1e293b',
    padding: 20,
    justifyContent: 'space-between',
  },
  brandHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  brandIconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#059669',
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: -0.5,
  },
  brandSub: {
    fontSize: 11,
    color: '#94a3b8',
  },
  wardBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#131b2e',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#1e293b',
    marginBottom: 24,
  },
  greenOnlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10b981',
    marginRight: 8,
  },
  wardBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#cbd5e1',
  },
  navMenu: {
    gap: 6,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
  },
  navItemActive: {
    backgroundColor: '#131b2e',
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  navIcon: {
    fontSize: 16,
    marginRight: 12,
  },
  navText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    color: '#64748b',
  },
  navTextActive: {
    color: '#ffffff',
  },
  countBadge: {
    backgroundColor: '#1e293b',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  countBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#94a3b8',
  },
  sidebarFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#131b2e',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  adminAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#090d16',
    alignItems: 'center',
    justifyContent: 'center',
  },
  adminName: {
    fontSize: 12,
    fontWeight: '800',
    color: '#ffffff',
  },
  adminEmail: {
    fontSize: 10,
    color: '#64748b',
  },
  logoutPill: {
    backgroundColor: '#fee2e2',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  logoutPillText: {
    color: '#dc2626',
    fontSize: 11,
    fontWeight: '800',
  },

  // MAIN CONTENT
  mainContent: {
    flex: 1,
    padding: 28,
  },
  topAppBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  pageTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: -0.5,
  },
  pageSub: {
    fontSize: 13,
    color: '#94a3b8',
    marginTop: 4,
  },
  liveSyncPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#131b2e',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  liveSyncText: {
    color: '#10b981',
    fontSize: 12,
    fontWeight: '800',
  },

  // KPI CARDS
  kpiGrid: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 24,
  },
  kpiCard: {
    flex: 1,
    backgroundColor: '#131b2e',
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  kpiTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  kpiLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#94a3b8',
    letterSpacing: 0.5,
  },
  kpiValue: {
    fontSize: 28,
    fontWeight: '900',
    color: '#ffffff',
    marginBottom: 4,
  },
  kpiSub: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '600',
  },

  // DATA TABLE CARD
  tableCard: {
    backgroundColor: '#131b2e',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  filterBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
    gap: 14,
  },
  searchBox: {
    flex: 1,
    maxWidth: 380,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0b1120',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1e293b',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  searchInput: {
    flex: 1,
    color: '#ffffff',
    fontSize: 13,
  },
  categoryScroll: {
    flexGrow: 0,
  },
  categoryPill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#0b1120',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  categoryPillActive: {
    backgroundColor: '#059669',
    borderColor: '#10b981',
  },
  categoryPillText: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '700',
  },
  categoryPillTextActive: {
    color: '#ffffff',
  },

  tableHeaderRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: '#0b1120',
    borderRadius: 10,
    marginBottom: 8,
  },
  tableHeadCol: {
    fontSize: 10,
    fontWeight: '800',
    color: '#94a3b8',
    letterSpacing: 0.5,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  vendorAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#1e293b',
    alignItems: 'center',
    justifyContent: 'center',
  },
  vendorNameText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  vendorMetaText: {
    color: '#64748b',
    fontSize: 11,
    marginTop: 2,
  },
  categoryTag: {
    color: '#cbd5e1',
    fontSize: 12,
    fontWeight: '600',
  },
  vehicleText: {
    color: '#94a3b8',
    fontSize: 12,
  },
  phoneText: {
    color: '#94a3b8',
    fontSize: 12,
  },
  statusTag: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#1e293b',
  },
  statusTagActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
  },
  statusTagPending: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
  },
  statusTagSuspended: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
  },
  statusTagText: {
    fontSize: 11,
    fontWeight: '800',
  },
  actionBtnInspect: {
    backgroundColor: '#1e293b',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  actionBtnInspectText: {
    color: '#cbd5e1',
    fontSize: 11,
    fontWeight: '700',
  },
  actionBtnApprove: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  actionBtnApproveText: {
    color: '#10b981',
    fontSize: 11,
    fontWeight: '800',
  },
  actionBtnSuspend: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  actionBtnSuspendText: {
    color: '#ef4444',
    fontSize: 11,
    fontWeight: '800',
  },

  // RADAR CARD
  radarCard: {
    backgroundColor: '#131b2e',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  radarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  radarTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
  },
  radarLegend: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  legendText: {
    fontSize: 12,
    color: '#94a3b8',
    fontWeight: '600',
  },
  radarMapBox: {
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#1e293b',
    height: 420,
  },

  // MODAL
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    maxWidth: 520,
    backgroundColor: '#131b2e',
    borderRadius: 20,
    padding: 28,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#ffffff',
  },
  modalGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  modalInfoBox: {
    width: '48%',
    backgroundColor: '#0b1120',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  modalLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#94a3b8',
    marginBottom: 4,
  },
  modalVal: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
  },
  modalBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
});
