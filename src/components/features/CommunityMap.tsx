'use client';

import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Issue } from '@/lib/types';
import { categories, statuses, Status } from '@/lib/utils';
import { useLocale } from 'next-intl';

// Fix Leaflet default marker icon
if (typeof window !== 'undefined') {
  delete (L.Icon.Default.prototype as any)._getIconUrl;
}

export interface CommunityMapProps {
  issues: Issue[];
  center?: [number, number];
  zoom?: number;
}

/** Auto-fits the map viewport to all visible markers */
function FitBounds({ positions }: { positions: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (positions.length === 0) return;
    if (positions.length === 1) {
      map.setView(positions[0], 15);
      return;
    }
    const bounds = L.latLngBounds(positions);
    map.fitBounds(bounds, { padding: [60, 60] });
  }, [positions.length]); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}

function createPulseIcon(color: string) {
  return L.divIcon({
    className: '',
    html: `<div style="position:relative;width:36px;height:36px;display:flex;align-items:center;justify-content:center;">
      <div style="position:absolute;width:36px;height:36px;border-radius:50%;background:${color}44;animation:cfPulse 2s ease-out infinite;transform-origin:center;"></div>
      <div style="width:16px;height:16px;border-radius:50%;background:${color};border:3px solid white;box-shadow:0 2px 10px ${color}99;position:relative;z-index:2;"></div>
    </div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -22],
  });
}

export default function CommunityMap({ issues, center = [9.0192, 38.7525], zoom = 13 }: CommunityMapProps) {
  const [isMounted, setIsMounted] = useState(false);
  const locale = useLocale();

  useEffect(() => {
    setIsMounted(true);

    if (typeof document !== 'undefined' && !document.getElementById('cf-pulse-style')) {
      const style = document.createElement('style');
      style.id = 'cf-pulse-style';
      style.innerHTML = `
        @keyframes cfPulse {
          0%   { transform:scale(0.7); opacity:0.9; }
          70%  { transform:scale(2.4); opacity:0; }
          100% { transform:scale(0.7); opacity:0; }
        }
        .leaflet-popup-content-wrapper {
          border-radius:18px!important; padding:0!important;
          border:1px solid rgba(0,0,0,0.07)!important;
          box-shadow:0 20px 50px rgba(0,0,0,0.14)!important;
          overflow:hidden!important;
        }
        .leaflet-popup-content { margin:0!important; }
        .leaflet-popup-tip-container { display:none!important; }
        .leaflet-control-attribution { 
          font-size:9px!important; opacity:0.6;
          background:rgba(0,0,0,0.5)!important;
          color:#fff!important;
          border-radius:6px!important;
        }
        .leaflet-control-attribution a { color:#5eead4!important; }
        .leaflet-control-zoom a {
          border-radius:8px!important;
          color:#0f172a!important;
        }
      `;
      document.head.appendChild(style);
    }
  }, []);

  if (!isMounted) {
    return (
      <div style={{
        width: '100%', height: '100%', display: 'flex',
        alignItems: 'center', justifyContent: 'center',
        background: '#0f172a', borderRadius: 'inherit',
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: 32, height: 32, borderRadius: '50%',
            border: '3px solid #0d9488', borderTopColor: 'transparent',
            margin: '0 auto 10px',
          }} />
          <p style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
            Loading satellite view…
          </p>
        </div>
      </div>
    );
  }

  const mappableIssues = issues.filter(
    (i) => typeof i.lat === 'number' && typeof i.lng === 'number' && i.lat !== 0 && i.lng !== 0
  );
  const unmappedCount = issues.length - mappableIssues.length;
  const positions: [number, number][] = mappableIssues.map((i) => [i.lat as number, i.lng as number]);

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', borderRadius: 'inherit', overflow: 'hidden' }}>
      <MapContainer
        center={center}
        zoom={zoom}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={false}
        zoomControl={true}
      >
        {/* Clean CartoDB map (doesn't have the ESRI zoom issue) */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          maxZoom={19}
        />

        {/* Auto-fit the map to show all pins */}
        {positions.length > 0 && <FitBounds positions={positions} />}

        {mappableIssues.map((issue) => {
          const cat = categories[issue.category as keyof typeof categories];
          const color = cat?.color || '#0d9488';
          const icon = createPulseIcon(color);
          const statusLabel = statuses[issue.status as Status]?.label[locale as 'en' | 'am'] || issue.status;

          return (
            <Marker key={issue.id} position={[issue.lat as number, issue.lng as number]} icon={icon}>
              <Popup>
                <div style={{ width: 240, fontFamily: "'Instrument Sans', system-ui, sans-serif" }}>
                  {issue.images?.[0] && (
                    <div style={{ height: 110, overflow: 'hidden', background: '#f1f5f9' }}>
                      <img src={issue.images[0]} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                  )}
                  <div style={{ padding: '12px 14px' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, marginBottom: 7 }}>
                      <div style={{ width: 7, height: 7, borderRadius: '50%', background: color }} />
                      <span style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.12em', color }}>
                        {cat?.label['en'] || issue.category}
                      </span>
                    </div>
                    <h4 style={{ margin: '0 0 5px', fontSize: 13, fontWeight: 700, color: '#0f172a', lineHeight: 1.3 }}>
                      {issue.title}
                    </h4>
                    {issue.address && (
                      <p style={{ margin: '0 0 10px', fontSize: 10, color: '#94a3b8', lineHeight: 1.4 }}>
                        📍 {issue.address}
                      </p>
                    )}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 8, borderTop: '1px solid #f1f5f9' }}>
                      <span style={{
                        fontSize: 9, fontWeight: 800, textTransform: 'uppercase',
                        letterSpacing: '0.1em', padding: '3px 9px', borderRadius: 99,
                        background: issue.status === 'resolved' ? '#ecfdf5' : issue.status === 'in_progress' ? '#eff6ff' : '#fffbeb',
                        color: issue.status === 'resolved' ? '#059669' : issue.status === 'in_progress' ? '#2563eb' : '#d97706',
                      }}>
                        {statusLabel}
                      </span>
                      <a
                        href={`/${locale}/issues/${issue.id}`}
                        style={{ fontSize: 10, fontWeight: 800, color: '#0d9488', textDecoration: 'none' }}
                      >
                        VIEW DETAILS →
                      </a>
                    </div>
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>

      {/* Floating stats chip */}
      <div style={{
        position: 'absolute', bottom: 14, left: 14, zIndex: 1000,
        background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(12px)',
        border: '1px solid rgba(0,0,0,0.06)',
        borderRadius: 14, padding: '8px 14px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
        display: 'flex', flexDirection: 'column', gap: 4,
      }}>
        <p style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.2em', color: '#94a3b8', margin: 0 }}>
          Live Map
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#f97316', boxShadow: '0 0 6px #f97316' }} />
          <span style={{ fontSize: 11, fontWeight: 700, color: '#0f172a' }}>
            {mappableIssues.length} pinned
          </span>
        </div>
        {unmappedCount > 0 && (
          <p style={{ fontSize: 9, color: '#94a3b8', margin: 0 }}>
            {unmappedCount} without location
          </p>
        )}
      </div>
    </div>
  );
}
