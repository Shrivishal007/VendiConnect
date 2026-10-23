import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Radio, ArrowRight, ShieldCheck, HeartHandshake } from 'lucide-react-native';
export const WelcomeScreen = ({ navigation }) => {
    return (<SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content"/>
      <View style={styles.content}>
        {/* Brand Icon & Heading */}
        <View style={styles.heroSection}>
          <View style={styles.iconContainer}>
            <Radio size={40} color="#ffffff"/>
          </View>
          <Text style={styles.brandTitle}>VendiConnect</Text>
          <Text style={styles.tagline}>
            Never miss your local street vendor again.
          </Text>
        </View>

        {/* Feature Highlights */}
        <View style={styles.featureList}>
          <View style={styles.featureItem}>
            <View style={styles.featureIconBox}>
              <Radio size={20} color="#059669"/>
            </View>
            <View style={styles.featureTextBox}>
              <Text style={styles.featureTitle}>Proximity Alerts</Text>
              <Text style={styles.featureDesc}>
                Get notified when fresh fruits, vegetables, flowers, or snacks enter your street.
              </Text>
            </View>
          </View>

          <View style={styles.featureItem}>
            <View style={styles.featureIconBox}>
              <ShieldCheck size={20} color="#059669"/>
            </View>
            <View style={styles.featureTextBox}>
              <Text style={styles.featureTitle}>Privacy First</Text>
              <Text style={styles.featureDesc}>
                Your home address is strictly protected and never shared with vendors.
              </Text>
            </View>
          </View>

          <View style={styles.featureItem}>
            <View style={styles.featureIconBox}>
              <HeartHandshake size={20} color="#059669"/>
            </View>
            <View style={styles.featureTextBox}>
              <Text style={styles.featureTitle}>Support Local Trades</Text>
              <Text style={styles.featureDesc}>
                Empower neighborhood push-cart vendors and verified community vendors.
              </Text>
            </View>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionSection}>
          <TouchableOpacity style={styles.primaryButton} onPress={() => navigation.navigate('Login')} activeOpacity={0.85}>
            <Text style={styles.primaryButtonText}>Continue with Email</Text>
            <ArrowRight size={18} color="#ffffff"/>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>);
};
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8fafc',
    },
    content: {
        flex: 1,
        paddingHorizontal: 24,
        justifyContent: 'space-between',
        paddingVertical: 32,
    },
    heroSection: {
        alignItems: 'center',
        marginTop: 20,
    },
    iconContainer: {
        width: 76,
        height: 76,
        borderRadius: 24,
        backgroundColor: '#059669',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#059669',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.25,
        shadowRadius: 16,
        elevation: 8,
        marginBottom: 20,
    },
    brandTitle: {
        fontSize: 28,
        fontWeight: '800',
        color: '#0f172a',
        letterSpacing: -0.5,
    },
    tagline: {
        fontSize: 14,
        color: '#64748b',
        textAlign: 'center',
        marginTop: 8,
        maxWidth: 280,
        lineHeight: 20,
    },
    featureList: {
        marginVertical: 24,
        gap: 16,
    },
    featureItem: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 14,
        backgroundColor: '#ffffff',
        padding: 14,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
    featureIconBox: {
        width: 38,
        height: 38,
        borderRadius: 10,
        backgroundColor: '#ecfdf5',
        alignItems: 'center',
        justifyContent: 'center',
    },
    featureTextBox: {
        flex: 1,
    },
    featureTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: '#0f172a',
    },
    featureDesc: {
        fontSize: 12,
        color: '#64748b',
        marginTop: 2,
        lineHeight: 16,
    },
    actionSection: {
        gap: 12,
        marginBottom: 8,
    },
    primaryButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: '#059669',
        paddingVertical: 15,
        borderRadius: 14,
        shadowColor: '#059669',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 3,
    },
    primaryButtonText: {
        fontSize: 15,
        fontWeight: '700',
        color: '#ffffff',
    },
});
