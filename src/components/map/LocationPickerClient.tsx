'use client';

import { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin, Target, Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

// Fix Leaflet default marker icon
if (typeof window !== 'undefined') {
  delete (L.Icon.Default.prototype as any)._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  });
}

interface LocationPickerClientProps {
  onLocationSelect: (location: { lat: number; lng: number; address: string }) => void;
  initialLocation?: { lat: number; lng: number };
}

function LocationMarker({ 
  onLocationSelect,
  position,
  setPosition 
}: { 
  onLocationSelect: (lat: number, lng: number) => void;
  position: L.LatLng | null;
  setPosition: (pos: L.LatLng) => void;
}) {
  useMapEvents({
    click(e) {
      setPosition(e.latlng);
      onLocationSelect(e.latlng.lat, e.latlng.lng);
    },
  });

  return position === null ? null : (
    <Marker 
      position={position} 
      draggable={true} 
      eventHandlers={{
        dragend: (e) => {
          const marker = e.target;
          const pos = marker.getLatLng();
          setPosition(pos);
          onLocationSelect(pos.lat, pos.lng);
        },
      }} 
    />
  );
}

export function LocationPickerClient({ onLocationSelect, initialLocation }: LocationPickerClientProps) {
  const [position, setPosition] = useState<L.LatLng | null>(
    initialLocation ? L.latLng(initialLocation.lat, initialLocation.lng) : null
  );
  const [isLoading, setIsLoading] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const t = useTranslations('map');
  const common = useTranslations('common');

  // Auto-locate on mount
  useEffect(() => {
    if (!initialLocation) {
      handleLocate();
    }
  }, []);

  // Default to Addis Ababa - fallback if geolocation fails
  const defaultCenter: [number, number] = [9.0192, 38.7525];

  const reverseGeocode = async (lat: number, lng: number) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=en`,
        {
          headers: {
            'User-Agent': 'CivicFix/1.0 (contact@civicfix.com)'
          }
        }
      );
      const data = await response.json();
      
      const address = data.display_name || `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
      
      onLocationSelect({ lat, lng, address });
    } catch (error) {
      console.error('Reverse geocoding failed:', error);
      setError(t('errors.noAddress'));
      onLocationSelect({ lat, lng, address: `${lat.toFixed(6)}, ${lng.toFixed(6)}` });
    } finally {
      setIsLoading(false);
    }
  };

  const handleLocate = () => {
    setIsLocating(true);
    setError(null);
    
    // Check if geolocation is available
    if (!navigator.geolocation) {
      setError(t('errors.noGeolocation'));
      setIsLocating(false);
      // Fallback to Addis Ababa
      const fallbackPos = L.latLng(defaultCenter[0], defaultCenter[1]);
      setPosition(fallbackPos);
      reverseGeocode(defaultCenter[0], defaultCenter[1]);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const newPos = L.latLng(latitude, longitude);
        setPosition(newPos);
        
        // Fly to user's location
        if (mapRef.current) {
          mapRef.current.flyTo([latitude, longitude], 16);
        }
        
        reverseGeocode(latitude, longitude);
        setIsLocating(false);
      },
      (error) => {
        console.error('Geolocation error:', error);
        setError(t('errors.locateFailed'));
        setIsLocating(false);
        
        // Fallback to Addis Ababa
        const fallbackPos = L.latLng(defaultCenter[0], defaultCenter[1]);
        setPosition(fallbackPos);
        if (mapRef.current) {
          mapRef.current.flyTo(defaultCenter, 13);
        }
        reverseGeocode(defaultCenter[0], defaultCenter[1]);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  };

  return (
    <div className="relative">
      <div className="w-full h-[400px] rounded-xl overflow-hidden border-2 border-glass-border">
        <MapContainer
          center={initialLocation ? [initialLocation.lat, initialLocation.lng] : defaultCenter}
          zoom={13}
          style={{ height: '100%', width: '100%' }}
          ref={mapRef}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
            url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
          />
          <LocationMarker 
            onLocationSelect={reverseGeocode} 
            position={position}
            setPosition={setPosition}
          />
        </MapContainer>
        
        <button
          onClick={handleLocate}
          disabled={isLocating}
          className="absolute top-4 right-4 z-[1000] p-3 glass rounded-lg hover:bg-accent-primary/20 transition-all duration-200 disabled:opacity-50"
          title={common('you')}
        >
          {isLocating ? (
            <Loader2 className="w-5 h-5 text-accent-primary animate-spin" />
          ) : (
            <Target className="w-5 h-5 text-accent-primary" />
          )}
        </button>
      </div>
      
      {isLoading && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 px-4 py-2 glass rounded-lg text-sm text-text-primary z-[1000]">
          <div className="flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            {t('instructions.gettingAddress')}
          </div>
        </div>
      )}
      
      {error && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 px-4 py-2 bg-red-500/20 border border-red-500/50 rounded-lg text-sm text-red-300 z-[1000] max-w-md text-center">
          {error}
        </div>
      )}
      
      <div className="mt-4 glass p-4 rounded-lg">
        <div className="flex items-start gap-3">
          <MapPin className="w-5 h-5 text-accent-primary flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-text-primary font-medium mb-1">{t('instructions.title')}</p>
            <ul className="text-sm text-text-secondary space-y-1">
              <li>• {t.rich('instructions.gps', { icon: (chunks) => <Target className="w-3 h-3 inline text-accent-primary" /> })}</li>
              <li>• {t('instructions.click')}</li>
              <li>• {t('instructions.drag')}</li>
            </ul>
            {position && (
              <p className="text-xs text-accent-primary mt-2">
                ✓ {t('instructions.selected', { lat: position.lat.toFixed(6), lng: position.lng.toFixed(6) })}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
