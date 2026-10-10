// The phone map: a small web page running the same Leaflet + MapLibre map as the browser version
// (MeetingMap.web.js). MeetingMap.js shows it in a WebView and talks to it with messages.
// If you restyle pins or labels, update styles/map.css too so web and phone stay the same.

import { BRIDGE_JS, FONT_CSS, LEAFLET_CSS, LEAFLET_JS, MAPLIBRE_CSS, MAPLIBRE_JS } from './vendor';

// Map libraries and fonts are built into the app (vendor.js), so the only downloads are the map
// pictures themselves: OpenFreeMap (styled map) or, as a backup, CARTO Positron image tiles.
export const MAP_LIBS = {
  rasterTiles: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
};

const CSS = `
html, body, #map { margin:0; height:100%; width:100%; background:#e8e9e2; }
.leaflet-container { font-family:'Barlow Condensed', 'Arial Narrow', sans-serif; background:#e8e9e2; }
.friend-marker span { display:flex; align-items:center; justify-content:center; width:34px; height:34px; background:var(--pin-color); color:white; border:2px solid #141414; border-radius:50%; font-family:'Barlow Condensed', sans-serif; font-weight:600; font-size:18px; }
.meeting-marker span { display:block; width:30px; height:30px; border-radius:50%; background:#141414; border:3px solid #dcf25e; box-shadow:0 0 0 2px #141414, 0 0 0 10px #dcf25e55; }
.leaflet-tooltip.friend-label, .leaflet-tooltip.winner-label { border:1px solid #141414; border-radius:999px; box-shadow:none; padding:4px 12px; background:#f6f5f0; color:#141414; font-family:'Barlow Condensed', sans-serif; font-weight:500; font-size:15px; letter-spacing:.3px; text-transform:uppercase; }
.leaflet-tooltip.winner-label { background:#141414; color:#f6f5f0; font-size:17px; }
.leaflet-tooltip.friend-label:before { border-top-color:#141414; }
.leaflet-tooltip.winner-label:before { border-bottom-color:#141414; }
.leaflet-control-zoom { border:1px solid #141414 !important; border-radius:999px !important; overflow:hidden; box-shadow:none !important; margin:0 12px 30px 0 !important; }
.leaflet-control-zoom a { width:38px !important; height:38px !important; line-height:38px !important; color:#141414 !important; background:#f6f5f0 !important; }
.leaflet-control-attribution { font-size:10px !important; background:#f6f5f0e6 !important; }
.leaflet-tile-pane { filter:saturate(.35) contrast(.95) brightness(1.04); }
`;

// Runs inside the WebView. Messages out: ready, tap {lat, lon}, offline, online.
// Kept as plain text (not a function) because Hermes on phones can't turn functions back into source.
const MAP_SCRIPT = String.raw`
(function (style, rasterTiles) {
  var send = function (message) { if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(JSON.stringify(message)); };
  window.onerror = function (message) { send({ type: 'log', text: String(message) }); };
  var canvas = document.createElement('canvas');
  var webgl = !!(canvas.getContext('webgl2') || canvas.getContext('webgl'));
  send({ type: 'log', text: 'page ok · leaflet ' + (window.L ? '✓' : '✗') + ' · maplibre ' + (window.maplibregl ? '✓' : '✗') + ' · webgl ' + (webgl ? '✓' : '✗') + ' · ' + window.innerWidth + '×' + window.innerHeight });
  if (!window.L) { send({ type: 'offline', reason: 'The map didn’t start on this phone.' }); return; }
  var map = L.map('map', { zoomControl: false, attributionControl: true }).setView([10.5, 76.1], 7);
  // Phones often lay the page out at 0 height first and resize it a moment later.
  // Leaflet and MapLibre keep the size they started with unless told, so redraw on every size change.
  var lastSize = '';
  var fixSize = function () {
    var size = window.innerWidth + '×' + window.innerHeight;
    if (size === lastSize) return;
    lastSize = size;
    map.invalidateSize({ pan: false });
    send({ type: 'log', text: 'map size ' + size });
  };
  window.addEventListener('resize', fixSize);
  if (window.ResizeObserver) new ResizeObserver(fixSize).observe(document.getElementById('map'));
  [100, 500, 1500].forEach(function (delay) { setTimeout(fixSize, delay); });
  L.control.zoom({ position: 'bottomright' }).addTo(map);
  var shown = false, usingBackup = false;
  var useBackup = function (why) {
    if (usingBackup) return;
    usingBackup = true;
    send({ type: 'log', text: 'Using backup map: ' + why });
    if (window.__vectorLayer) { try { map.removeLayer(window.__vectorLayer); } catch (e) {} }
    L.tileLayer(rasterTiles, { subdomains: 'abcd', maxZoom: 19, attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> · © <a href="https://carto.com/attributions">CARTO</a>' })
      .on('tileload', function () { if (!shown) { shown = true; send({ type: 'log', text: 'backup map drawn' }); send({ type: 'online' }); } })
      .on('tileerror', function () { if (!shown) send({ type: 'offline', reason: 'Map tiles didn’t download. Check your internet connection.' }); })
      .addTo(map);
  };
  if (!L.maplibreGL || !webgl) useBackup(!webgl ? 'no WebGL' : 'vector library missing');
  else {
    try {
      map.attributionControl.addAttribution('<a href="https://openfreemap.org/">OpenFreeMap</a> · <a href="https://openmaptiles.org/">OpenMapTiles</a> · © <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>');
      window.__vectorLayer = L.maplibreGL({ style: style, attributionControl: false }).addTo(map);
      var vector = window.__vectorLayer.getMaplibreMap();
      // Only count the styled map as working once real map tiles arrive; 'idle' also fires when every download failed.
      var gotTiles = false, failures = 0;
      vector.on('sourcedata', function (event) { if (event.tile) gotTiles = true; });
      vector.on('error', function (event) { failures++; if (!shown) send({ type: 'log', text: 'styled map: ' + ((event && event.error && event.error.message) || 'error').slice(0, 80) }); });
      vector.on('idle', function () {
        if (usingBackup || shown) return;
        if (gotTiles) { shown = true; send({ type: 'log', text: 'styled map drawn' }); send({ type: 'online' }); }
        else if (failures) useBackup('styled map server unreachable');
      });
    } catch (error) { useBackup('vector map failed: ' + error.message); }
    // If the styled map hasn't drawn within 8 seconds, switch to the backup.
    setTimeout(function () { if (!shown) useBackup('vector map timed out'); }, 8000);
  }
  var layer = L.layerGroup().addTo(map);
  map.on('click', function (event) { send({ type: 'tap', lat: event.latlng.lat, lon: event.latlng.lng }); });
  var label = function (text) { var span = document.createElement('span'); span.textContent = text; return span; };

  window.updateMap = function (data) {
    layer.clearLayers();
    data.friends.forEach(function (friend, index) {
      L.marker([friend.lat, friend.lon], { icon: L.divIcon({ className: 'friend-marker', html: '<span style="--pin-color:' + data.colors[index] + '">' + (index + 1) + '</span>', iconSize: [38, 44], iconAnchor: [19, 42] }) })
        .addTo(layer).bindTooltip(label(friend.person + ' · ' + friend.name), { direction: 'top', offset: [0, -38], permanent: true, className: 'friend-label' });
    });
    if (data.winner) {
      L.marker([data.winner.lat, data.winner.lon], { zIndexOffset: 500, icon: L.divIcon({ className: 'meeting-marker', html: '<span></span>', iconSize: [30, 30], iconAnchor: [15, 15] }) })
        .addTo(layer).bindTooltip(label('Meet in ' + data.winner.name), { permanent: true, direction: 'bottom', offset: [0, 18], className: 'winner-label' });
    }
    var points = data.friends.concat(data.winner ? [data.winner] : []).map(function (p) { return [p.lat, p.lon]; });
    if (points.length > 1) map.fitBounds(L.latLngBounds(points), { paddingTopLeft: [40, 70], paddingBottomRight: [50, 50], maxZoom: 13 });
    else map.setView(points[0] || [10.5, 76.1], points.length ? 11 : 7);
  };
  send({ type: 'ready' });
})`;

export function buildMapHtml(style) {
  return `<!doctype html><html><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
<style>${LEAFLET_CSS}</style><style>${MAPLIBRE_CSS}</style><style>${FONT_CSS}${CSS}</style></head><body><div id="map"></div>
<script>${LEAFLET_JS}</script><script>${MAPLIBRE_JS}</script><script>${BRIDGE_JS}</script>
<script>${MAP_SCRIPT}(${JSON.stringify(style).replace(/</g, '\\u003c')}, ${JSON.stringify(MAP_LIBS.rasterTiles)});</script></body></html>`;
}
