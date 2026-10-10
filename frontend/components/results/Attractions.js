import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import Label from '../common/Label';
import { getAttractions, osmAttractions } from '../../../lib/attractions';
import { C, F } from '../../theme';

// Things to see around the chosen spot (OpenStreetMap + Wikipedia).
export default function Attractions({ town, onOpen }) {
  const key = `${town.id}:${town.lat}:${town.lon}`;
  const [state, setState] = useState(null);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setState({ key, loading: true, items: osmAttractions(town) });
    getAttractions(town, { signal: controller.signal }).then(value => {
      if (!controller.signal.aborted) setState({ key, loading: false, ...value });
    }).catch(() => {
      if (!controller.signal.aborted) setState({ key, loading: false, items: osmAttractions(town), wikipediaUnavailable: true, osmUnavailable: true });
    });
    return () => controller.abort();
  }, [key, retry]);
  const current = state?.key === key ? state : { loading: true, items: [] };
  const partial = current.wikipediaUnavailable || current.osmUnavailable;
  if (!current.loading && !current.items.length && !partial) return null;

  return <View style={s.root}>
    <Label style={s.label}>Things to see around {town.name}</Label>
    {current.loading && <View style={s.loading}><ActivityIndicator size="small" color={C.ink} /><Text style={s.meta}>Loading…</Text></View>}
    {partial && <Text style={s.meta}>Couldn’t load everything right now. <Text accessibilityRole="button" style={s.link} onPress={() => setRetry(v => v + 1)}>Try again</Text></Text>}
    {current.items.slice(0, 20).map(place => <View key={place.id} style={s.place}>
      <View style={s.head}><Text style={s.name}>{place.name}</Text><Text style={s.meta}>{(place.dist / 1000).toFixed(1)} km</Text></View>
      {!!place.description && <Text style={s.copy}>{place.description}</Text>}
      <View style={s.links}>{place.sources.map(source => <Pressable key={source.url} accessibilityRole="link" onPress={() => onOpen(source.url)}><Text style={s.link}>{source.label} ↗</Text></Pressable>)}</View>
    </View>)}
    <Text style={s.small}>Descriptions from Wikipedia (CC BY-SA). Check opening times before you go.</Text>
  </View>;
}

const s = StyleSheet.create({
  root: { marginTop: 34 },
  label: { marginBottom: 4 },
  loading: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  place: { paddingVertical: 14, borderBottomWidth: 1, borderColor: C.line },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: 10 },
  name: { fontFamily: F.medium, fontSize: 17, color: C.ink, flex: 1 },
  copy: { fontFamily: F.body, fontSize: 16, lineHeight: 21, color: C.ink, marginTop: 4 },
  meta: { fontFamily: F.body, fontSize: 15, color: C.muted, marginTop: 6 },
  links: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, marginTop: 4 },
  link: { fontFamily: F.medium, fontSize: 15, color: C.ink, textDecorationLine: 'underline', paddingVertical: 4 },
  small: { fontFamily: F.body, fontSize: 14, lineHeight: 19, color: C.muted, marginTop: 12 },
});
