import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import Label from '../common/Label';
import { ACTIVITIES } from '../../../lib/discovery';
import { labelFor } from './format';
import { C, F } from '../../theme';

// Mapped places near the chosen spot, with the ones matching your must-haves first.
export default function NearbyPlaces({ winner, activities, onOpen }) {
  const places = [...new Set([...activities.flatMap(category => winner.places.find(p => p.categories.includes(category)) || []), ...winner.places])].slice(0, 10);
  if (!places.length) return null;
  return <View style={s.root}>
    <Label style={s.label}>Nearby · within 5 km</Label>
    {places.map((place, i) => <Pressable key={place.id || i} disabled={!place.url} accessibilityRole={place.url ? 'link' : undefined} onPress={() => onOpen(place.url)} style={s.row}>
      <Feather name={ACTIVITIES.find(a => place.categories.includes(a.id))?.icon || 'map-pin'} size={18} color={C.ink} />
      <View style={{ flex: 1 }}>
        <Text style={s.name}>{place.title}</Text>
        <Text style={s.meta}>{place.categories.map(labelFor).join(' · ') || (place.kind || 'Place').replace(/_/g, ' ')} · {(place.dist / 1000).toFixed(1)} km</Text>
      </View>
      {place.url && <Feather name="arrow-up-right" size={18} color={C.ink} />}
    </Pressable>)}
  </View>;
}

const s = StyleSheet.create({
  root: { marginTop: 34 },
  label: { marginBottom: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13, borderBottomWidth: 1, borderColor: C.line },
  name: { fontFamily: F.medium, fontSize: 17, color: C.ink },
  meta: { fontFamily: F.body, fontSize: 15, color: C.muted, marginTop: 2 },
});
