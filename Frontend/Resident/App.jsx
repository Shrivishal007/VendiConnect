import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { AppNavigator } from './src/navigation/AppNavigator';
export default function App() {
    const content = (<SafeAreaProvider>
      <StatusBar style="dark"/>
      <AppNavigator />
    </SafeAreaProvider>);
    if (Platform.OS === 'web') {
        return (<View style={styles.webBackdrop}>
        <View style={styles.mobileFrame}>
          {content}
        </View>
      </View>);
    }
    return content;
}
const styles = StyleSheet.create({
    webBackdrop: {
        flex: 1,
        backgroundColor: '#0f172a',
        alignItems: 'center',
        justifyContent: 'center',
    },
    mobileFrame: {
        width: '100%',
        maxWidth: 460,
        height: '100%',
        backgroundColor: '#ffffff',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.25,
        shadowRadius: 24,
        elevation: 10,
        overflow: 'hidden',
    },
});
