import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Linking, StyleSheet, Text, View } from 'react-native';
import { WebView } from 'react-native-webview';
import mapStyle from '../../styles/map-style.json';
import { buildMapHtml } from './mapPage';
import { FRIEND_COLORS } from '../../../data/candidates';
import { C, F, R } from '../../theme';

// Phone map (Expo Go / iOS / Android). Shows the same map as the browser version inside a WebView,
// so it doesn't depend on Google or Apple Maps. The browser uses MeetingMap.web.js instead.
const BASE_URL = 'https://fairpoint.local/';

export default function MeetingMap({ friends, winner, onAdd, recenter }) {
  const view = useRef(null);
  const add = useRef(onAdd);
  add.current = onAdd;
  const [ready, setReady] = useState(false);
  const [offline, setOffline] = useState(false);
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
    else if (message.type === 'offline') setOffline(true);
    else if (message.type === 'online') setOffline(false);
  }

  // Attribution links open in the phone's browser instead of inside the map.
  function onNavigate(request) {
    if (request.url.startsWith(BASE_URL) || request.url === 'about:blank') return true;
    if (/^https?:/.test(request.url)) { Linking.openURL(request.url).catch(() => {}); return false; }
    return true;
  }

  return <View style={StyleSheet.absoluteFillObject}>
    <WebView ref={view} source={source} originWhitelist={['*']} onMessage={onMessage} onShouldStartLoadWithRequest={onNavigate}
      javaScriptEnabled domStorageEnabled scrollEnabled={false} bounces={false} nestedScrollEnabled overScrollMode="never"
      setSupportMultipleWindows={false} style={s.web} containerStyle={s.web}
      onError={() => setOffline(true)} />
    {offline && <View pointerEvents="none" style={s.notice}><Text style={s.text}>The map couldn’t load. You can still search for places.</Text></View>}
  </View>;
}

const s = StyleSheet.create({
  web: { flex: 1, backgroundColor: '#e8e9e2' },
  notice: { position: 'absolute', bottom: 28, left: 12, right: 60, backgroundColor: C.paper, borderWidth: 1, borderColor: C.ink, padding: 12, borderRadius: R.card },
  text: { fontFamily: F.body, fontSize: 16, color: C.ink },
});
