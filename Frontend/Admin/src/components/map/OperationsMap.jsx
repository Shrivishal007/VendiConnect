import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { RefreshCw, Layers, Store, Users } from 'lucide-react';
export const OperationsMap = ({ vendors, residents, categories, selectedCategory, onSelectCategory, onRefresh, isRefreshing, onSelectVendor, }) => {
    const mapContainerRef = useRef(null);
    const mapInstanceRef = useRef(null);
    const markersLayerRef = useRef(null);
    const residentsLayerRef = useRef(null);
    const [showResidents, setShowResidents] = useState(true);
    const [showVendors, setShowVendors] = useState(true);
    // Initialize Map
    useEffect(() => {
        if (!mapContainerRef.current || mapInstanceRef.current)
            return;
        // Default center Chennai (13.0418, 80.2341)
        const map = L.map(mapContainerRef.current, {
            center: [13.0418, 80.2341],
            zoom: 13,
            zoomControl: true,
        });
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; OpenStreetMap contributors',
            maxZoom: 19,
        }).addTo(map);
        markersLayerRef.current = L.layerGroup().addTo(map);
        residentsLayerRef.current = L.layerGroup().addTo(map);
        mapInstanceRef.current = map;
        return () => {
            map.remove();
            mapInstanceRef.current = null;
        };
    }, []);
    // Update Markers when vendors or residents change
    useEffect(() => {
        if (!mapInstanceRef.current || !markersLayerRef.current || !residentsLayerRef.current)
            return;
        markersLayerRef.current.clearLayers();
        residentsLayerRef.current.clearLayers();
        const bounds = [];
        // Filter vendors by category
        const filteredVendors = vendors.filter((v) => {
            if (!selectedCategory)
                return true;
            return v.Category?.Category_ID === selectedCategory;
        });
        // Plot Vendors
        if (showVendors) {
            filteredVendors.forEach((vendor) => {
                // Find coordinates from real database geo record
                const lat = vendor.geo?.coordinates?.[1] ??
                    vendor.approximateLocation?.latitude;
                const lng = vendor.geo?.coordinates?.[0] ??
                    vendor.approximateLocation?.longitude;
                if (lat === undefined || lat === null || lng === undefined || lng === null)
                    return;
                bounds.push([lat, lng]);
                const isOnline = vendor.Status === 'ACTIVE' && vendor.ConsentStatus !== 'WITHDRAWN';
                const markerColor = isOnline ? '#059669' : '#94a3b8';
                const customIcon = L.divIcon({
                    className: 'custom-vendor-pin',
                    html: `
            <div style="
              width: 34px;
              height: 34px;
              background-color: white;
              border: 2px solid ${markerColor};
              border-radius: 9999px;
              display: flex;
              align-items: center;
              justify-content: center;
              box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1);
              cursor: pointer;
            ">
              <span style="font-size: 16px;">🛒</span>
            </div>
          `,
                    iconSize: [34, 34],
                    iconAnchor: [17, 17],
                    popupAnchor: [0, -18],
                });
                const marker = L.marker([lat, lng], { icon: customIcon });
                const popupContent = document.createElement('div');
                popupContent.className = 'p-1 text-slate-800 text-xs min-w-[180px]';
                popupContent.innerHTML = `
          <div style="font-weight: 700; font-size: 13px; margin-bottom: 2px;">${vendor.VendorName}</div>
          <div style="color: #64748b; margin-bottom: 4px;">${vendor.Category?.Name || 'General Goods'} • ${vendor.Vehicle}</div>
          <div style="display: flex; align-items: center; gap: 4px; margin-bottom: 6px;">
            <span style="color: #f59e0b; font-weight: 600;">★ ${vendor.AvgRating ? vendor.AvgRating.toFixed(1) : 'New'}</span>
            <span style="color: #94a3b8;">(${vendor.RatingCount || 0} reviews)</span>
          </div>
          <div style="display: flex; align-items: center; justify-content: space-between; padding-top: 4px; border-top: 1px solid #e2e8f0;">
            <span style="font-size: 10px; font-weight: 600; padding: 2px 6px; border-radius: 9999px; background-color: ${isOnline ? '#ecfdf5' : '#f1f5f9'}; color: ${isOnline ? '#047857' : '#475569'};">
              ${vendor.Status}
            </span>
            <button id="view-vendor-${vendor.Vendor_ID}" style="font-size: 11px; font-weight: 600; color: #059669; background: none; border: none; cursor: pointer; text-decoration: underline;">
              Inspect
            </button>
          </div>
        `;
                marker.bindPopup(popupContent);
                marker.on('popupopen', () => {
                    const btn = document.getElementById(`view-vendor-${vendor.Vendor_ID}`);
                    if (btn && onSelectVendor) {
                        btn.onclick = () => onSelectVendor(vendor.Vendor_ID);
                    }
                });
                marker.addTo(markersLayerRef.current);
            });
        }
        // Plot Resident Density Clusters (Privacy-preserving fuzzy circles)
        if (showResidents) {
            residents.forEach((resident) => {
                if (resident.Latitude === null || resident.Longitude === null)
                    return;
                bounds.push([resident.Latitude, resident.Longitude]);
                // Draw density buffer
                const circle = L.circle([resident.Latitude, resident.Longitude], {
                    radius: resident.NotificationRadius || 300,
                    color: '#3b82f6',
                    fillColor: '#60a5fa',
                    fillOpacity: 0.12,
                    weight: 1,
                    dashArray: '4, 4',
                });
                circle.bindTooltip(`<b>${resident.Name}</b><br/>Alert Radius: ${resident.NotificationRadius || 300}m`, { direction: 'top', opacity: 0.9 });
                circle.addTo(residentsLayerRef.current);
            });
        }
        // Fit bounds if we have points
        if (bounds.length > 0 && mapInstanceRef.current) {
            try {
                mapInstanceRef.current.fitBounds(L.latLngBounds(bounds), {
                    padding: [50, 50],
                    maxZoom: 15,
                });
            }
            catch {
                // bounds error safeguard
            }
        }
    }, [vendors, residents, selectedCategory, showResidents, showVendors, onSelectVendor]);
    return (<div className="relative w-full h-[600px] lg:h-[700px] rounded-xl overflow-hidden border border-slate-200 shadow-xs bg-slate-100">
      {/* Top Controls Bar */}
      <div className="absolute top-3 left-3 right-3 z-[1000] flex flex-wrap items-center justify-between gap-2 pointer-events-none">
        {/* Category Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto p-1.5 bg-white/95 backdrop-blur-xs rounded-xl shadow-sm border border-slate-200/80 pointer-events-auto max-w-[85vw]">
          <button onClick={() => onSelectCategory('')} className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${!selectedCategory
            ? 'bg-emerald-600 text-white shadow-xs'
            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'}`}>
            All Categories ({vendors.length})
          </button>
          {categories.map((c) => (<button key={c._id} onClick={() => onSelectCategory(c._id)} className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${selectedCategory === c._id
                ? 'bg-emerald-600 text-white font-semibold shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'}`}>
              {c.Name}
            </button>))}
        </div>

        {/* Layer Toggles & Refresh */}
        <div className="flex items-center gap-2 pointer-events-auto bg-white/95 backdrop-blur-xs p-1.5 rounded-xl shadow-sm border border-slate-200/80">
          <button onClick={() => setShowVendors(!showVendors)} className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${showVendors
            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
            : 'text-slate-500 hover:bg-slate-100'}`} title="Toggle Vendor Markers">
            <Store className="w-3.5 h-3.5"/>
            <span className="hidden sm:inline">Vendors</span>
          </button>

          <button onClick={() => setShowResidents(!showResidents)} className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${showResidents
            ? 'bg-blue-50 text-blue-700 border border-blue-200'
            : 'text-slate-500 hover:bg-slate-100'}`} title="Toggle Resident Coverage">
            <Users className="w-3.5 h-3.5"/>
            <span className="hidden sm:inline">Resident Coverage</span>
          </button>

          <button onClick={onRefresh} disabled={isRefreshing} className="p-1.5 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition-colors disabled:opacity-50" title="Refresh Map Coordinates">
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-emerald-600' : ''}`}/>
          </button>
        </div>
      </div>

      {/* Map Element */}
      <div ref={mapContainerRef} className="w-full h-full"/>

      {/* Map Legend */}
      <div className="absolute bottom-4 left-4 z-[1000] bg-white/95 backdrop-blur-xs px-3.5 py-2.5 rounded-xl border border-slate-200/90 shadow-sm text-xs text-slate-700 space-y-1.5">
        <div className="font-semibold text-slate-900 flex items-center gap-1.5 text-[11px] uppercase tracking-wider">
          <Layers className="w-3.5 h-3.5 text-emerald-600"/>
          <span>Legend</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-emerald-600 border border-emerald-700 inline-block"/>
          <span>Active Vendor Ping</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-slate-400 border border-slate-500 inline-block"/>
          <span>Inactive / Offline Vendor</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-blue-100 border border-blue-400 border-dashed inline-block"/>
          <span>Resident Alert Zone</span>
        </div>
      </div>
    </div>);
};
