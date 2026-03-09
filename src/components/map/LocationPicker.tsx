'use client';

import dynamic from 'next/dynamic';
import { Loader2 } from 'lucide-react';

// Fix SSR "window is not defined" error by loading Leaflet client-side only
const LocationPickerClient = dynamic(
  () => import('./LocationPickerClient').then(mod => ({ default: mod.LocationPickerClient })),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-[400px] rounded-xl overflow-hidden glass flex items-center justify-center border-2 border-glass-border">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-accent-primary animate-spin" />
          <p className="text-text-muted">Loading map...</p>
        </div>
      </div>
    ),
  }
);

interface LocationPickerProps {
  onLocationSelect: (location: { lat: number; lng: number; address: string }) => void;
  initialLocation?: { lat: number; lng: number };
}

export function LocationPicker(props: LocationPickerProps) {
  return <LocationPickerClient {...props} />;
}
