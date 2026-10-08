import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { SafeAreaView, SafeAreaProvider } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';

export default function App() {
  // We use Leaflet (OpenStreetMap) inside a WebView to completely bypass Google API keys
  const mapHtml = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
        <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
        <style>
            body { padding: 0; margin: 0; }
            html, body, #map { height: 100%; width: 100%; }
        </style>
    </head>
    <body>
        <div id="map"></div>
        <script>
            // Initialize map centered on Chennai
            var map = L.map('map').setView([13.0827, 80.2707], 13);
            
            // Load free OpenStreetMap tiles
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                maxZoom: 19,
                attribution: '© OpenStreetMap'
            }).addTo(map);

            // Dummy Vendors
            var vendors = [
              { name: "Santhosh Poo Kadai", cat: "Flowers", lat: 13.0827, lng: 80.2707 },
              { name: "Fresh Veg Cart", cat: "Vegetables", lat: 13.0850, lng: 80.2750 },
              { name: "Kannan Fish", cat: "Fish & Seafood", lat: 13.0780, lng: 80.2650 },
              { name: "Morning Tiffin", cat: "Breakfast & Tiffin", lat: 13.0900, lng: 80.2720 }
            ];

            // Add markers with popup bubbles
            vendors.forEach(v => {
                L.marker([v.lat, v.lng])
                 .bindPopup('<b>' + v.name + '</b><br>' + v.cat)
                 .addTo(map);
            });
        </script>
    </body>
    </html>
  `;

  return (
    <SafeAreaProvider style={{ flex: 1 }}>
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>VendiConnect</Text>
          <Text style={styles.subtitle}>Find nearby street vendors</Text>
        </View>
        
        {/* Open-Source Map via WebView */}
        <WebView 
          style={styles.map}
          source={{ html: mapHtml }}
          originWhitelist={['*']}
          javaScriptEnabled={true}
        />
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    padding: 20,
    backgroundColor: '#4CAF50',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    elevation: 3,
    zIndex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  subtitle: {
    fontSize: 14,
    color: '#e8f5e9',
    marginTop: 5,
  },
  map: {
    flex: 1,
    width: '100%',
  },
});
