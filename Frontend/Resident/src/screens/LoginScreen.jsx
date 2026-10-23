import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Mail, Lock, User, ArrowRight, ShieldCheck, AlertCircle, Navigation } from 'lucide-react-native';
import * as Location from 'expo-location';
import { useAuthStore } from '../store/useAuthStore';
export const LoginScreen = ({ navigation }) => {
    const [mode, setMode] = useState('signIn');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [fullName, setFullName] = useState('');
    const [residentLocation, setResidentLocation] = useState(null);
    const [isLocating, setIsLocating] = useState(false);
    const [formError, setFormError] = useState(null);
    const [locationMessage, setLocationMessage] = useState(null);
    const { authenticateWithEmail, isLoading, error } = useAuthStore();
    const handleGetLocation = async () => {
        setIsLocating(true);
        setFormError(null);
        setLocationMessage(null);
        try {
            const permission = await Location.requestForegroundPermissionsAsync();
            if (permission.status !== 'granted') {
                setFormError('Location permission is required to create your resident account.');
                return;
            }
            const position = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.Balanced,
            });
            const { latitude, longitude } = position.coords;
            let address = '';
            if (Platform.OS !== 'web') {
                try {
                    const [place] = await Location.reverseGeocodeAsync({ latitude, longitude });
                    if (place) {
                        address = [
                            place.name || place.street,
                            place.district || place.subregion,
                            place.city,
                            place.region,
                            place.postalCode,
                        ]
                            .filter((part, index, parts) => Boolean(part) && parts.indexOf(part) === index)
                            .join(', ')
                            .slice(0, 300);
                    }
                }
                catch (geocodeError) {
                    console.warn('[Location] Reverse geocoding failed; saving coordinates only.', geocodeError);
                }
            }
            setResidentLocation({ latitude, longitude, address });
            setLocationMessage(address ? `Location found: ${address}` : 'Coordinates found; street address could not be determined.');
        }
        catch (locationError) {
            setFormError(locationError instanceof Error
                ? `Unable to get your current location: ${locationError.message}`
                : 'Unable to get your current location. Check that device location services are enabled.');
        }
        finally {
            setIsLocating(false);
        }
    };
    const handleSignIn = async () => {
        setFormError(null);
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
            setFormError('Please enter a valid email address.');
            return;
        }
        if (!password || (mode === 'signUp' && password.length < 8)) {
            setFormError(mode === 'signUp' ? 'Password must be at least 8 characters.' : 'Please enter your password.');
            return;
        }
        if (mode === 'signUp' && !residentLocation) {
            setFormError('Get your device location before creating your resident account.');
            return;
        }
        const success = await authenticateWithEmail({
            email: email.trim(),
            password,
            mode,
            name: fullName.trim() || undefined,
            address: residentLocation?.address,
            latitude: residentLocation?.latitude,
            longitude: residentLocation?.longitude,
        });
        if (success && navigation) {
            // Session automatically navigates via App.jsx auth state
        }
    };
    return (<SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.badge}>
              <ShieldCheck size={14} color="#059669"/>
              <Text style={styles.badgeText}>Resident Community</Text>
            </View>
            <Text style={styles.title}>
              {mode === 'signIn' ? 'Resident Sign In' : 'Create Resident Account'}
            </Text>
            <Text style={styles.subtitle}>
              {mode === 'signIn'
            ? 'Sign in with your Firebase email and password.'
            : 'Create a Firebase account with your email and password. No OTP is used.'}
            </Text>
          </View>

          {/* Error Banner */}
          {(formError || error) && (<View style={styles.errorBanner}>
              <AlertCircle size={16} color="#e11d48" style={{ marginTop: 2 }}/>
              <Text style={styles.errorText}>{formError || error}</Text>
            </View>)}

          {/* Form */}
          <View style={styles.form}>
            {/* Email Address */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Email Address *</Text>
              <View style={styles.standardInputContainer}>
                <Mail size={18} color="#64748b" style={styles.inputIcon}/>
                <TextInput style={styles.standardInput} placeholder="you@example.com" placeholderTextColor="#94a3b8" keyboardType="email-address" autoCapitalize="none" autoComplete="email" textContentType="emailAddress" value={email} onChangeText={(text) => {
            setEmail(text);
            if (formError)
                setFormError(null);
        }} autoFocus/>
              </View>
            </View>

            {/* Password */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Password *</Text>
              <View style={styles.standardInputContainer}>
                <Lock size={18} color="#64748b" style={styles.inputIcon}/>
                <TextInput style={styles.standardInput} placeholder={mode === 'signUp' ? 'At least 8 characters' : 'Your password'} placeholderTextColor="#94a3b8" secureTextEntry autoComplete="password" textContentType="password" value={password} onChangeText={(text) => {
            setPassword(text);
            if (formError)
                setFormError(null);
        }}/>
              </View>
            </View>

            {mode === 'signUp' && (<>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Full Name (Optional)</Text>
                  <View style={styles.standardInputContainer}>
                    <User size={18} color="#64748b" style={styles.inputIcon}/>
                    <TextInput style={styles.standardInput} placeholder="e.g. Karthik S" placeholderTextColor="#94a3b8" value={fullName} onChangeText={(text) => {
                setFullName(text);
                if (formError)
                    setFormError(null);
            }} autoCapitalize="words"/>
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Home Location *</Text>
                  <TouchableOpacity style={[styles.locationButton, isLocating && styles.locationButtonDisabled]} onPress={handleGetLocation} disabled={isLocating} activeOpacity={0.8}>
                    {isLocating ? (<ActivityIndicator size="small" color="#059669"/>) : (<Navigation size={17} color="#059669"/>)}
                    <Text style={styles.locationButtonText}>
                      {isLocating
                ? 'Getting device location...'
                : residentLocation
                    ? 'Refresh Device Location'
                    : 'Use Current Device Location'}
                    </Text>
                  </TouchableOpacity>
                  {locationMessage && (<Text style={styles.helperText}>{locationMessage}</Text>)}
                  <Text style={styles.helperText}>
                    Used to find nearby vendors. Your exact location is not shown to vendors.
                  </Text>
                </View>
              </>)}

            {/* Sign In Button */}
            <TouchableOpacity style={[styles.primaryButton, isLoading && { opacity: 0.7 }]} onPress={handleSignIn} disabled={isLoading} activeOpacity={0.85}>
              {isLoading ? (<ActivityIndicator size="small" color="#ffffff"/>) : (<>
                  <Text style={styles.primaryButtonText}>
                    {mode === 'signIn' ? 'Sign In to VendiConnect' : 'Create Account'}
                  </Text>
                  <ArrowRight size={18} color="#ffffff"/>
                </>)}
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.modeToggle} onPress={() => {
            setMode(mode === 'signIn' ? 'signUp' : 'signIn');
            setFormError(null);
            useAuthStore.setState({ error: null });
        }}>
            <Text style={styles.modeToggleText}>
              {mode === 'signIn' ? "New to VendiConnect? Create an account" : 'Already have an account? Sign in'}
            </Text>
          </TouchableOpacity>

          {/* Privacy Note */}
          <View style={styles.privacyNote}>
            <ShieldCheck size={14} color="#64748b"/>
            <Text style={styles.privacyText}>
              Firebase securely manages your password. VendiConnect never stores or shares it with vendors.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>);
};
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8fafc',
    },
    scrollContent: {
        padding: 24,
        justifyContent: 'center',
        flexGrow: 1,
    },
    header: {
        marginBottom: 28,
    },
    badge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        alignSelf: 'flex-start',
        backgroundColor: '#ecfdf5',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#a7f3d0',
        marginBottom: 12,
    },
    badgeText: {
        fontSize: 11,
        fontWeight: '700',
        color: '#047857',
    },
    title: {
        fontSize: 26,
        fontWeight: '800',
        color: '#0f172a',
        letterSpacing: -0.5,
    },
    subtitle: {
        fontSize: 13,
        color: '#64748b',
        marginTop: 6,
        lineHeight: 20,
    },
    errorBanner: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 8,
        backgroundColor: '#fff1f2',
        borderWidth: 1,
        borderColor: '#fecdd3',
        borderRadius: 12,
        padding: 12,
        marginBottom: 20,
    },
    errorText: {
        flex: 1,
        fontSize: 12,
        color: '#9f1239',
        lineHeight: 18,
    },
    form: {
        marginBottom: 24,
        gap: 16,
    },
    modeToggle: {
        alignItems: 'center',
        paddingVertical: 12,
        marginBottom: 12,
    },
    modeToggleText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#047857',
    },
    inputGroup: {
        gap: 6,
    },
    locationButton: {
        minHeight: 50,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 9,
        paddingHorizontal: 14,
        borderWidth: 1.5,
        borderColor: '#a7f3d0',
        borderRadius: 12,
        backgroundColor: '#ecfdf5',
    },
    locationButtonDisabled: {
        opacity: 0.7,
    },
    locationButtonText: {
        fontSize: 14,
        color: '#047857',
        fontWeight: '700',
    },
    inputLabel: {
        fontSize: 11,
        fontWeight: '700',
        color: '#475569',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    standardInputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1.5,
        borderColor: '#e2e8f0',
        borderRadius: 12,
        backgroundColor: '#ffffff',
        height: 52,
        paddingHorizontal: 14,
    },
    inputIcon: {
        marginRight: 10,
    },
    standardInput: {
        flex: 1,
        fontSize: 15,
        color: '#0f172a',
    },
    helperText: {
        fontSize: 11,
        color: '#94a3b8',
        marginTop: 2,
    },
    primaryButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: '#059669',
        height: 52,
        borderRadius: 12,
        marginTop: 8,
        shadowColor: '#059669',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.2,
        shadowRadius: 6,
        elevation: 3,
    },
    primaryButtonText: {
        fontSize: 15,
        fontWeight: '700',
        color: '#ffffff',
    },
    privacyNote: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 8,
        paddingHorizontal: 4,
    },
    privacyText: {
        flex: 1,
        fontSize: 11,
        color: '#64748b',
        lineHeight: 16,
    },
});
