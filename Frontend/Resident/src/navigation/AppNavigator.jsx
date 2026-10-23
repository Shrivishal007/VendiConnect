import React, { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuthStore } from '../store/useAuthStore';
import { WelcomeScreen } from '../screens/WelcomeScreen';
import { LoginScreen } from '../screens/LoginScreen';
import { TabNavigator } from './TabNavigator';
const Stack = createNativeStackNavigator();
export const AppNavigator = () => {
    const { isAuthenticated, isLoading, restoreSession } = useAuthStore();
    useEffect(() => {
        restoreSession();
    }, []);
    if (isLoading) {
        return (<View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#059669"/>
      </View>);
    }
    return (<NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!isAuthenticated ? (<>
            <Stack.Screen name="Welcome" component={WelcomeScreen}/>
            <Stack.Screen name="Login" component={LoginScreen}/>
          </>) : (<Stack.Screen name="Main" component={TabNavigator}/>)}
      </Stack.Navigator>
    </NavigationContainer>);
};
const styles = StyleSheet.create({
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f8fafc',
    },
});
