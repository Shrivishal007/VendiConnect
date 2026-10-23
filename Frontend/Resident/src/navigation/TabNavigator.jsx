import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Home, Map, Bell, Sliders, User } from 'lucide-react-native';
import { HomeScreen } from '../screens/HomeScreen';
import { MapScreen } from '../screens/MapScreen';
import { NotificationsScreen } from '../screens/NotificationsScreen';
import { PreferencesScreen } from '../screens/PreferencesScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { useResidentStore } from '../store/useResidentStore';
const Tab = createBottomTabNavigator();
export const TabNavigator = () => {
    const { unreadAlertCount } = useResidentStore();
    return (<Tab.Navigator screenOptions={{
            headerShown: false,
            tabBarActiveTintColor: '#059669',
            tabBarInactiveTintColor: '#94a3b8',
            tabBarStyle: {
                backgroundColor: '#ffffff',
                borderTopColor: '#f1f5f9',
                borderTopWidth: 1,
                height: 60,
                paddingBottom: 8,
                paddingTop: 6,
            },
            tabBarLabelStyle: {
                fontSize: 10,
                fontWeight: '600',
            },
        }}>
      <Tab.Screen name="Home" component={HomeScreen} options={{
            tabBarLabel: 'Discover',
            tabBarIcon: ({ color, size }) => <Home size={20} color={color}/>,
        }}/>
      <Tab.Screen name="Map" component={MapScreen} options={{
            tabBarLabel: 'Map',
            tabBarIcon: ({ color, size }) => <Map size={20} color={color}/>,
        }}/>
      <Tab.Screen name="Alerts" component={NotificationsScreen} options={{
            tabBarLabel: 'Alerts',
            tabBarBadge: unreadAlertCount > 0 ? unreadAlertCount : undefined,
            tabBarBadgeStyle: {
                backgroundColor: '#059669',
                fontSize: 9,
                fontWeight: '700',
            },
            tabBarIcon: ({ color, size }) => <Bell size={20} color={color}/>,
        }}/>
      <Tab.Screen name="Preferences" component={PreferencesScreen} options={{
            tabBarLabel: 'Perimeter',
            tabBarIcon: ({ color, size }) => <Sliders size={20} color={color}/>,
        }}/>
      <Tab.Screen name="Profile" component={ProfileScreen} options={{
            tabBarLabel: 'Profile',
            tabBarIcon: ({ color, size }) => <User size={20} color={color}/>,
        }}/>
    </Tab.Navigator>);
};
