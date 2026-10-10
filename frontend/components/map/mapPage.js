// The phone map: a small web page running the same Leaflet + MapLibre map as the browser version
// (MeetingMap.web.js). MeetingMap.js shows it in a WebView and talks to it with messages.
// If you restyle pins or labels, update styles/map.css too so web and phone stay the same.

const CDN = 'https://cdn.jsdelivr.net/npm';
export const MAP_LIBS = {
  leafletCss: `${CDN}/leaflet@1.9.4/dist/leaflet.css`,
  leafletJs: `${CDN}/leaflet@1.9.4/dist/leaflet.js`,
  maplibreCss: `${CDN}/maplibre-gl@5.24.0/dist/maplibre-gl.css`,
  maplibreJs: `${CDN}/maplibre-gl@5.24.0/dist/maplibre-gl.js`,
  bridgeJs: `${CDN}/@maplibre/maplibre-gl-leaflet@0.1.4/leaflet-maplibre-gl.js`,
  fonts: 'https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@400;500;600&display=swap',
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
(function (style) {
  var send = function (message) { if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(JSON.stringify(message)); };
  if (!window.L || !L.maplibreGL) { send({ type: 'offline' }); return; }
  var map = L.map('map', { zoomControl: false, attributionControl: true }).setView([10.5, 76.1], 7);
  L.control.zoom({ position: 'bottomright' }).addTo(map);
  map.attributionControl.addAttribution('<a href="https://openfreemap.org/">OpenFreeMap</a> · <a href="https://openmaptiles.org/">OpenMapTiles</a> · © <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>');
  try {
    var vector = L.maplibreGL({ style: style, attributionControl: false }).addTo(map).getMaplibreMap();
    vector.on('error', function () { send({ type: 'offline' }); });
    vector.on('idle', function () { send({ type: 'online' }); });
  } catch (error) { send({ type: 'offline' }); }
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
<link rel="stylesheet" href="${MAP_LIBS.leafletCss}"><link rel="stylesheet" href="${MAP_LIBS.maplibreCss}"><link rel="stylesheet" href="${MAP_LIBS.fonts}">
<style>${CSS}</style></head><body><div id="map"></div>
<script src="${MAP_LIBS.leafletJs}"></script><script src="${MAP_LIBS.maplibreJs}"></script><script src="${MAP_LIBS.bridgeJs}"></script>
<script>${MAP_SCRIPT}(${JSON.stringify(style).replace(/</g, '\\u003c')});</script></body></html>`;
}
