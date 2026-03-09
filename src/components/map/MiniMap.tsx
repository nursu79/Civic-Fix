'use client';

import { MapContainer, TileLayer } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

export default function MiniMap() {
  const center: [number, number] = [9.0192, 38.7525]; // Addis Ababa

  return (
    <MapContainer
      center={center}
      zoom={11}
      zoomControl={false}
      scrollWheelZoom={false}
      dragging={false}
      style={{ height: '100%', width: '100%' }}
    >
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
      />
    </MapContainer>
  );
}
