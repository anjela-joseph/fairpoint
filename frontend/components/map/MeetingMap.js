import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Linking, StyleSheet, Text, View } from 'react-native';
import { WebView } from 'react-native-webview';
import mapStyle from '../../styles/map-style.json';
import { buildMapHtml } from './mapPage';
import { FRIEND_COLORS } from '../../../data/candidates';
import { C, F, R } from '../../theme';

// Phone map (Expo Go / iOS / Android). Shows the same map as the browser version inside a WebView,
// so it doesn't depend on Google or Apple Maps. The browser uses MeetingMap.web.js instead.
// Not a real site; only gives the page a normal web address. (Avoid .local: iOS treats it as a home-network device.)
const BASE_URL = 'https://localhost/';

export default function MeetingMap({ friends, winner, onAdd, recenter }) {
  const view = useRef(null);
  const add = useRef(onAdd);
  add.current = onAdd;
  const [ready, setReady] = useState(false);
  const [status, setStatus] = useState('Loading map…');
  const [debug, setDebug] = useState('waiting for map page');
  // Give the WebView an exact size; some phones otherwise lay it out at 0 height.
  const [size, setSize] = useState(null);
  const source = useMemo(() => ({ html: buildMapHtml(mapStyle), baseUrl: BASE_URL }), []);

  useEffect(() => {
    if (!ready) return;
    const data = {
      friends: friends.map(({ lat, lon, person, name }) => ({ lat, lon, person, name })),
      winner: winner ? { lat: winner.lat, lon: winner.lon, name: winner.name } : null,
      colors: FRIEND_COLORS,
    };
    view.current?.injectJavaScript(`window.updateMap && window.updateMap(${JSON.stringify(data)}); true;`);
  }, [ready, friends, winner, recenter]);

  function onMessage(event) {
    let message;
    try { message = JSON.parse(event.nativeEvent.data); } catch { return; }
    if (message.type === 'ready') setReady(true);
    else if (message.type === 'tap') add.current({ lat: message.lat, lon: message.lon });
    else if (message.type === 'offline') setStatus(message.reason || 'The map couldn’t load. You can still search for places.');
    else if (message.type === 'online') setStatus('');
    else if (message.type === 'log') { setDebug(message.text); if (__DEV__) console.log('[map]', message.text); }
  }

  // Attribution links open in the phone's browser instead of inside the map.
  function onNavigate(request) {
    const clicked = request.navigationType ? request.navigationType === 'click' : request.isTopFrame !== false && !request.url.startsWith(BASE_URL);
    if (clicked && /^https?:/.test(request.url) && !request.url.startsWith(BASE_URL)) { Linking.openURL(request.url).catch(() => {}); return false; }
    return true;
  }

  return <View style={StyleSheet.absoluteFill} onLayout={event => {
    const { width, height } = event.nativeEvent.layout;
    if (width > 0 && height > 0 && (width !== size?.width || height !== size?.height)) setSize({ width, height });
  }}>
    {size && <WebView ref={view} source={source} originWhitelist={['*']} onMessage={onMessage} onShouldStartLoadWithRequest={onNavigate}
      javaScriptEnabled domStorageEnabled scrollEnabled={false} bounces={false} nestedScrollEnabled overScrollMode="never"
      setSupportMultipleWindows={false} style={[s.web, size]} containerStyle={[s.web, size]}
      webviewDebuggingEnabled={__DEV__}
      onLoadEnd={() => setDebug(current => current === 'waiting for map page' ? 'page loaded, script not running' : current)}
      onHttpError={event => setDebug(`http ${event.nativeEvent.statusCode}`)}
      onError={event => setStatus(`The map couldn’t load (${event.nativeEvent.description || 'web view error'}).`)}
      onContentProcessDidTerminate={() => { setReady(false); view.current?.reload(); }} />}
    {!!status && <View pointerEvents="none" style={s.notice}><Text style={s.text}>{status}</Text></View>}
    {/* Development only (Expo Go): shows how far the map got, to help diagnose a blank map. */}
    {__DEV__ && <Text pointerEvents="none" style={s.debug} numberOfLines={2}>map: {debug}</Text>}
  </View>;
}

const s = StyleSheet.create({
  web: { flex: 1, backgroundColor: '#e8e9e2' },
  notice: { position: 'absolute', bottom: 40, left: 12, right: 60, backgroundColor: C.paper, borderWidth: 1, borderColor: C.ink, padding: 12, borderRadius: R.card },
  text: { fontFamily: F.body, fontSize: 16, color: C.ink },
  debug: { position: 'absolute', left: 8, right: 8, bottom: 8, fontSize: 11, color: '#141414', backgroundColor: '#ffffffcc', paddingHorizontal: 6, paddingVertical: 2 },
});
