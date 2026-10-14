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

export default function App() {
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');

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

            {/* Email Field */}
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

            {/* Password Field */}
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

            {/* Submit Button */}
            <TouchableOpacity style={styles.submitBtn} onPress={handleAdminLogin}>
              <Text style={styles.submitBtnText}>Sign In to Control Center 🔐</Text>
            </TouchableOpacity>

            {/* 1-Click Evaluation Sign In */}
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
  // VIEW 2: AUTHENTICATED STATE
  // =========================================================
  return (
    <SafeAreaProvider style={{ flex: 1, backgroundColor: '#090d16' }}>
      <View style={styles.authContainer}>
        <View style={styles.topbar}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={styles.topShield}>
              <Text style={{ fontSize: 18 }}>🛡️</Text>
            </View>
            <View style={{ marginLeft: 10 }}>
              <Text style={styles.topTitle}>VendiConnect Control Center</Text>
              <Text style={styles.topSub}>Authenticated • {adminEmail || 'admin@vendiconnect.in'}</Text>
            </View>
          </View>
          <TouchableOpacity 
            style={styles.logoutBtn}
            onPress={() => setIsAdminLoggedIn(false)}
          >
            <Text style={styles.logoutText}>Log Out</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.authBody}>
          <Text style={{ fontSize: 36, marginBottom: 10 }}>✅</Text>
          <Text style={styles.authHeading}>Administrator Session Verified</Text>
          <Text style={styles.authSub}>
            Authentication layer is active. Ready to load operational metrics and sidebar navigation in Stage 3.
          </Text>
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
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
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
  authContainer: {
    flex: 1,
    backgroundColor: '#090d16',
    padding: 24,
  },
  topbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
    paddingBottom: 16,
  },
  topShield: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#059669',
    alignItems: 'center',
    justifyContent: 'center',
  },
  topTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#ffffff',
  },
  topSub: {
    fontSize: 11,
    color: '#94a3b8',
  },
  logoutBtn: {
    backgroundColor: '#fee2e2',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  logoutText: {
    color: '#dc2626',
    fontWeight: '800',
    fontSize: 12,
  },
  authBody: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  authHeading: {
    fontSize: 20,
    fontWeight: '900',
    color: '#ffffff',
    marginBottom: 6,
  },
  authSub: {
    fontSize: 13,
    color: '#94a3b8',
    textAlign: 'center',
    maxWidth: 420,
    lineHeight: 20,
  },
});
