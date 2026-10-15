import React, { useState } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  Dimensions 
} from 'react-native';
import { SafeAreaView, SafeAreaProvider } from 'react-native-safe-area-context';

const INITIAL_VENDORS = [
  { id: 1, name: "Santhosh Poo Kadai", category: "Flowers", vehicle: "Pushcart", status: "ACTIVE" },
  { id: 2, name: "Muthu Fresh Vegetables", category: "Vegetables", vehicle: "Pushcart", status: "ACTIVE" },
  { id: 3, name: "Kannan Sea Catch", category: "Fish & Seafood", vehicle: "Auto-rickshaw", status: "ACTIVE" },
  { id: 4, name: "Subbu Kovai Fruits", category: "Fruits", vehicle: "Pushcart", status: "PENDING" },
  { id: 5, name: "Amma Tiffin & Kaapi", category: "Breakfast", vehicle: "Van", status: "INACTIVE" },
  { id: 6, name: "Murugan Chai & Snacks", category: "Snacks", vehicle: "Bicycle", status: "SUSPENDED" }
];

export default function App() {
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [activeTab, setActiveTab] = useState('vendors'); // 'vendors' | 'radar' | 'alerts'
  const [vendorsList] = useState(INITIAL_VENDORS);

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

  // Status counters for KPI Cards
  const totalCount = vendorsList.length;
  const activeCount = vendorsList.filter(v => v.status === 'ACTIVE').length;
  const pendingCount = vendorsList.filter(v => v.status === 'PENDING').length;
  const suspendedCount = vendorsList.filter(v => v.status === 'SUSPENDED').length;

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
  // VIEW 2: DESKTOP WORKSPACE WITH SIDEBAR & KPI METRICS
  // =========================================================
  return (
    <SafeAreaProvider style={{ flex: 1, backgroundColor: '#090d16' }}>
      <View style={styles.desktopRoot}>

        {/* 1. FIXED LEFT SIDEBAR */}
        <View style={styles.sidebar}>
          <View>
            {/* Brand Header */}
            <View style={styles.brandHeader}>
              <View style={styles.brandIconCircle}>
                <Text style={{ fontSize: 20 }}>🛡️</Text>
              </View>
              <View style={{ marginLeft: 12 }}>
                <Text style={styles.brandTitle}>VendiConnect</Text>
                <Text style={styles.brandSub}>Admin Portal • Web</Text>
              </View>
            </View>

            {/* Ward Status Badge */}
            <View style={styles.wardBadge}>
              <View style={styles.greenOnlineDot} />
              <Text style={styles.wardBadgeText}>Ward 104 • Chennai Central</Text>
            </View>

            {/* Navigation Menu */}
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
                  <Text style={styles.countBadgeText}>4</Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>

          {/* Bottom Admin User Info & Logout */}
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

        {/* 2. MAIN DESKTOP CONTENT AREA */}
        <View style={styles.mainContent}>
          {/* Top Desktop App Bar */}
          <View style={styles.topAppBar}>
            <View>
              <Text style={styles.pageTitle}>Municipal Operations & Moderation Center</Text>
              <Text style={styles.pageSub}>Real-time monitoring of registered street pushcarts and sector activities</Text>
            </View>
            <View style={styles.liveSyncPill}>
              <View style={styles.greenOnlineDot} />
              <Text style={styles.liveSyncText}>MongoDB Atlas Live Sync</Text>
            </View>
          </View>

          {/* 3. 4 WIDE EXECUTIVE KPI CARDS */}
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

          {/* Module Placeholder (Ready for Stage 4 Moderation Table) */}
          <View style={styles.contentPlaceholderCard}>
            <Text style={{ fontSize: 32, marginBottom: 8 }}>📋</Text>
            <Text style={styles.placeholderTitle}>Operational Module Skeleton Ready</Text>
            <Text style={styles.placeholderSub}>
              Sidebar navigation and KPI metric summaries verified. Stage 4 will mount the full vendor directory moderation table and interactive status controls.
            </Text>
          </View>
        </View>

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

  // MAIN CONTENT AREA
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

  // PLACEHOLDER CARD
  contentPlaceholderCard: {
    backgroundColor: '#131b2e',
    borderRadius: 20,
    padding: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  placeholderTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#ffffff',
    marginBottom: 6,
  },
  placeholderSub: {
    fontSize: 13,
    color: '#94a3b8',
    textAlign: 'center',
    maxWidth: 500,
    lineHeight: 20,
  },
});
