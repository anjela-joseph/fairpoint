import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import * as L from 'leaflet';
import { maplibreGL } from '@maplibre/maplibre-gl-leaflet';
import mapStyle from '../data/map-style.json';
import 'leaflet/dist/leaflet.css';
import 'maplibre-gl/dist/maplibre-gl.css';
import './map.css';
import { FRIEND_COLORS } from '../data/candidates';

export default function MeetingMap({ friends, winner, onAdd, recenter }) {
  const element = useRef(null);
  const map = useRef(null);
  const layer = useRef(null);
  const add = useRef(onAdd);
  const [offline, setOffline] = useState(false);
  add.current = onAdd;
  useEffect(() => {
    const instance = L.map(element.current, { zoomControl: false, scrollWheelZoom: true, attributionControl: true }).setView([10.5, 76.1], 7);
    map.current = instance;
    L.control.zoom({ position: 'bottomright' }).addTo(instance);
    // Raster OSM tiles bake in ferry lines across the sea. Use a vector style
    // without ferry features so these cannot be mistaken for suggested journeys.
    instance.attributionControl.addAttribution('<a href="https://openfreemap.org/">OpenFreeMap</a> · <a href="https://openmaptiles.org/">OpenMapTiles</a> · © <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>');
    try {
      const tiles = maplibreGL({ style: mapStyle, attributionControl: false }).addTo(instance);
      const vector = tiles.getMaplibreMap();
      vector.on('error', () => setOffline(true));
      vector.on('idle', () => { setOffline(false); element.current?.setAttribute('data-map-ready', 'true'); });
    } catch { setOffline(true); }
    layer.current = L.layerGroup().addTo(instance);
    instance.on('click', event => add.current({ lat: event.latlng.lat, lon: event.latlng.lng }));
    const observer = new ResizeObserver(() => instance.invalidateSize());
    observer.observe(element.current);
    return () => { observer.disconnect(); instance.remove(); map.current = null; };
  }, []);
  useEffect(() => {
    if (!map.current || !layer.current) return;
    layer.current.clearLayers();
    friends.forEach((friend, index) => {
      const color = FRIEND_COLORS[index];
      const marker = L.marker([friend.lat, friend.lon], { icon: L.divIcon({ className: 'friend-marker', html: `<span style="--pin-color:${color}">${index + 1}</span>`, iconSize: [38, 44], iconAnchor: [19, 42] }) }).addTo(layer.current);
      const label = document.createElement('span');
      label.textContent = `${friend.person} · ${friend.name}`;
      marker.bindTooltip(label, { direction: 'top', offset: [0, -38], permanent: true, className: 'friend-label' });
    });
    if (winner) {
      const marker = L.marker([winner.lat, winner.lon], { zIndexOffset: 500, icon: L.divIcon({ className: 'meeting-marker', html: '<span>✦</span>', iconSize: [48, 48], iconAnchor: [24, 24] }) }).addTo(layer.current);
      const label = document.createElement('span');
      label.textContent = `Meet in ${winner.name}`;
      marker.bindTooltip(label, { permanent: true, direction: 'bottom', offset: [0, 26], className: 'winner-label' });
    }
    const points = [...friends, ...(winner ? [winner] : [])].map(p => [p.lat, p.lon]);
    if (points.length > 1) map.current.fitBounds(L.latLngBounds(points), { paddingTopLeft: [90, 110], paddingBottomRight: [90, 120], maxZoom: 11 });
    else map.current.setView(points[0] || [10.5, 76.1], points.length ? 10 : 7);
  }, [friends, winner, recenter]);
  return <View style={StyleSheet.absoluteFillObject}>
    <div ref={element} role="region" aria-label="Interactive map of Kerala. Add friend pins by clicking, or search Kerala locations." style={{ height: '100%', width: '100%', background: '#e5eadd', zIndex: 0 }} />
    {offline && <View style={styles.notice}><Text style={styles.text}>Map tiles unavailable. Saved location search still works.</Text></View>}
  </View>;
}
const styles = StyleSheet.create({ notice: { position: 'absolute', bottom: 28, left: 12, right: 55, backgroundColor: '#fff9e6', padding: 10, borderRadius: 8 }, text: { fontSize: 12, color: '#685331' } });
