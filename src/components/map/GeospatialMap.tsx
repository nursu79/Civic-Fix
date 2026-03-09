'use client';

import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { createClient } from '@/lib/supabase/client';
import { Issue } from '@/lib/supabase';
import { categories } from '@/lib/utils';

// Fix Leaflet default marker icon
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface GeospatialMapProps {
  onIssueClick?: (issue: Issue) => void;
  center?: [number, number];
  zoom?: number;
}

/**
 * Geospatial map with issue discovery using Leaflet
 * Fetches all 'open' issues and renders custom markers
 */
export function GeospatialMap({ 
  onIssueClick, 
  center = [9.0192, 38.7469], // Addis Ababa
  zoom = 12 
}: GeospatialMapProps) {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [isMounted, setIsMounted] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Fetch open issues with geospatial data
  useEffect(() => {
    const fetchIssues = async () => {
      const { data, error } = await supabase
        .from('issues')
        .select(`
          *,
          reporter:profiles!reporter_id(id, display_name, avatar_url)
        `)
        .eq('status', 'open')
        .not('lat', 'is', null)
        .not('lng', 'is', null);

      if (error) {
        console.error('Failed to fetch issues:', error);
        return;
      }

      setIssues(data || []);
    };

    fetchIssues();

    // Subscribe to realtime updates
    const channel = supabase
      .channel('map-issues')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'issues' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newIssue = payload.new as Issue;
            if (newIssue.status === 'open' && newIssue.lat && newIssue.lng) {
              setIssues(prev => [...prev, newIssue]);
            }
          } else if (payload.eventType === 'UPDATE') {
            setIssues(prev => 
              prev.map(i => i.id === payload.new.id ? payload.new as Issue : i)
            );
          } else if (payload.eventType === 'DELETE') {
            setIssues(prev => prev.filter(i => i.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase]);

  // Create custom icons for each category
  const createCustomIcon = (category: string, upvoteCount: number) => {
    const categoryConfig = categories[category as keyof typeof categories];
    const color = categoryConfig?.color || '#14b8a6';
    
    return L.divIcon({
      className: 'custom-marker',
      html: `
        <div style="
          background: ${color};
          width: 32px;
          height: 32px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: bold;
          font-size: 12px;
          border: 3px solid rgba(255,255,255,0.3);
          box-shadow: 0 4px 12px rgba(0,0,0,0.4);
        ">
          ${upvoteCount}
        </div>
      `,
      iconSize: [32, 32],
      iconAnchor: [16, 16],
    });
  };

  if (!isMounted) {
    return (
      <div className="w-full h-full rounded-xl overflow-hidden glass flex items-center justify-center" style={{ minHeight: '500px' }}>
        <div className="text-text-muted">Loading map...</div>
      </div>
    );
  }

  return (
    <div className="w-full h-full rounded-xl overflow-hidden border-2 border-glass-border" style={{ minHeight: '500px' }}>
      <MapContainer
        center={center}
        zoom={zoom}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {issues.map((issue) => {
          if (!issue.lat || !issue.lng) return null;
          
          const categoryConfig = categories[issue.category];
          
          return (
            <Marker
              key={issue.id}
              position={[issue.lat, issue.lng]}
              icon={createCustomIcon(issue.category, issue.upvote_count)}
              eventHandlers={{
                click: () => {
                  if (onIssueClick) {
                    onIssueClick(issue);
                  }
                },
              }}
            >
              <Popup className="luxury-popup">
                <div style={{ padding: '12px', minWidth: '200px' }}>
                  <h3 style={{ 
                    margin: '0 0 8px 0', 
                    fontWeight: 600, 
                    color: categoryConfig?.color || '#14b8a6' 
                  }}>
                    {issue.title}
                  </h3>
                  <p style={{ 
                    margin: '0 0 8px 0', 
                    fontSize: '13px', 
                    color: '#94a3b8' 
                  }}>
                    {issue.description?.substring(0, 100)}
                    {issue.description && issue.description.length > 100 ? '...' : ''}
                  </p>
                  <div style={{ 
                    display: 'flex', 
                    gap: '12px', 
                    fontSize: '12px', 
                    color: '#64748b' 
                  }}>
                    <span>👍 {issue.upvote_count}</span>
                    <span>💬 {issue.comment_count}</span>
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}
