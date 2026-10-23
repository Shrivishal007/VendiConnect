import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { WebView } from 'react-native-webview';
export const VendorMap = ({ vendors, homeLatitude, homeLongitude, notificationRadius, onSelectVendor, }) => {
    // Filter and map vendors with actual coordinates only
    const validVendors = vendors.filter((v) => v.approximateLocation &&
        typeof v.approximateLocation.latitude === 'number' &&
        typeof v.approximateLocation.longitude === 'number');
    const vendorsJson = JSON.stringify(validVendors.map((v) => ({
        id: v.Vendor_ID,
        name: v.VendorName,
        lat: v.approximateLocation.latitude,
        lng: v.approximateLocation.longitude,
        category: v.Category_ID,
        vehicle: v.Vehicle,
        rating: v.AvgRating,
        eta: v.etaMinutes,
        status: v.status,
    })));
    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <style>
    html, body, #map { height: 100%; margin: 0; padding: 0; background-color: #f8fafc; }
    .vendor-pin {
      width: 32px;
      height: 32px;
      background: #ffffff;
      border: 2.5px solid #059669;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 6px rgba(0,0,0,0.15);
      font-size: 16px;
      cursor: pointer;
    }
    .home-pin {
      width: 32px;
      height: 32px;
      background: #3b82f6;
      border: 2.5px solid #ffffff;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 8px rgba(0,0,0,0.25);
      font-size: 16px;
      color: #fff;
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script>
    const homeLat = ${homeLatitude};
    const homeLng = ${homeLongitude};
    const radiusMeters = ${notificationRadius};
    const vendors = ${vendorsJson};

    const map = L.map('map', {
      center: [homeLat, homeLng],
      zoom: 15,
      zoomControl: false,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap',
    }).addTo(map);

    // Resident Home Marker
    const homeIcon = L.divIcon({
      className: 'home-marker',
      html: '<div class="home-pin">🏠</div>',
      iconSize: [32, 32],
      iconAnchor: [16, 16],
    });
    L.marker([homeLat, homeLng], { icon: homeIcon }).addTo(map);

    // Notification Perimeter Circle
    L.circle([homeLat, homeLng], {
      radius: radiusMeters,
      color: '#059669',
      fillColor: '#34d399',
      fillOpacity: 0.12,
      weight: 1.5,
      dashArray: '4, 4',
    }).addTo(map);

    // Add Vendors
    vendors.forEach(v => {
      const vendorIcon = L.divIcon({
        className: 'vendor-marker',
        html: '<div class="vendor-pin">🛒</div>',
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });

      const marker = L.marker([v.lat, v.lng], { icon: vendorIcon }).addTo(map);
      marker.on('click', () => {
        if (window.ReactNativeWebView) {
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'VENDOR_CLICK', vendorId: v.id }));
        } else {
          window.parent.postMessage({ type: 'VENDOR_CLICK', vendorId: v.id }, '*');
        }
      });
    });
  </script>
</body>
</html>
  `;
    const handleMessage = (event) => {
        try {
            const data = JSON.parse(event.nativeEvent.data);
            if (data.type === 'VENDOR_CLICK') {
                const found = vendors.find((v) => v.Vendor_ID === data.vendorId);
                if (found)
                    onSelectVendor(found);
            }
        }
        catch {
            // ignore
        }
    };
    if (Platform.OS === 'web') {
        return (<View style={styles.container}>
        <iframe srcDoc={htmlContent} style={{ width: '100%', height: '100%', border: 'none' }} title="Vendor Discovery Map"/>
      </View>);
    }
    return (<View style={styles.container}>
      <WebView originWhitelist={['*']} source={{ html: htmlContent }} onMessage={handleMessage} style={styles.webview} javaScriptEnabled={true} domStorageEnabled={true}/>
    </View>);
};
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8fafc',
    },
    webview: {
        flex: 1,
        backgroundColor: 'transparent',
    },
});
