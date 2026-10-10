import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { FRIEND_COLORS } from '../data/candidates';

const coordinate = p => ({ latitude: p.lat, longitude: p.lon });
export default function MeetingMap({ friends, winner, onAdd, recenter }) {
  const ref = useRef(null);
  const ready = useRef(false);
  function fit() {
    if (!ready.current) return;
    const points = [...friends, ...(winner ? [winner] : [])].map(coordinate);
    if (points.length > 1) ref.current?.fitToCoordinates(points, { edgePadding: { top: 100, right: 65, bottom: 100, left: 65 }, animated: true });
    else if (points.length === 1) ref.current?.animateToRegion({ ...points[0], latitudeDelta: 0.5, longitudeDelta: 0.5 });
    else ref.current?.animateToRegion({ latitude: 10.5, longitude: 76.1, latitudeDelta: 5, longitudeDelta: 4 });
  }
  useEffect(fit, [friends, winner, recenter]);
  return <MapView ref={ref} style={StyleSheet.absoluteFillObject}
    initialRegion={{ latitude: 10.5, longitude: 76.1, latitudeDelta: 5, longitudeDelta: 4 }}
    onMapReady={() => { ready.current = true; fit(); }}
    onPress={event => { if (event.nativeEvent.action !== 'marker-press') onAdd({ lat: event.nativeEvent.coordinate.latitude, lon: event.nativeEvent.coordinate.longitude }); }}>
    {friends.map((friend, index) => <Marker key={`${index}-${friend.lat}-${friend.lon}`} coordinate={coordinate(friend)} title={friend.person} description={friend.name}>
      <View style={[styles.pin, { backgroundColor: FRIEND_COLORS[index] }]}><Text style={styles.pinText}>{index + 1}</Text></View>
    </Marker>)}
    {winner && <Marker coordinate={coordinate(winner)} title={`Meet in ${winner.name}`} pinColor="#146654" />}
  </MapView>;
}
const styles = StyleSheet.create({ pin: { width: 36, height: 36, borderRadius: 18, borderWidth: 3, borderColor: 'white', alignItems: 'center', justifyContent: 'center' }, pinText: { color: 'white', fontWeight: '800', fontSize: 15 } });
