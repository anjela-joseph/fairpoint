import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { getAttractions, osmAttractions } from '../lib/attractions';

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
  return <View style={s.root}>
    <Text accessibilityRole="header" style={s.heading}>Explore {town.name}</Text>
    <Text style={s.copy}>Nearby attractions and places of interest, within 5 km of the town centre. Distances are straight-line estimates.</Text>
    {current.loading && <View style={s.loading}><ActivityIndicator size="small" color="#176752" /><Text style={s.copy}>Adding Wikipedia descriptions…</Text></View>}
    {(current.wikipediaUnavailable || current.osmUnavailable) && <View><Text style={s.copy}>{current.wikipediaUnavailable ? 'Wikipedia is unavailable. ' : ''}{current.osmUnavailable ? 'Live OpenStreetMap attractions are unavailable. ' : ''}Any saved places remain available.</Text><Pressable accessibilityRole="button" onPress={() => setRetry(value => value + 1)}><Text style={s.link}>Retry attraction sources</Text></Pressable></View>}
    {!current.loading && !current.items.length && <Text style={s.copy}>No nearby attractions were returned. This does not mean the town has none.</Text>}
    {current.items.slice(0, 20).map(place => <View key={place.id} style={s.place}>
      <Text style={s.name}>{place.name}</Text>
      <Text style={s.copy}>{place.description}</Text>
      <Text style={s.copy}>{(place.dist / 1000).toFixed(1)} km from town centre</Text>
      <View style={s.links}>{place.sources.map(source => <Pressable key={source.url} accessibilityRole="link" onPress={() => onOpen(source.url)}><Text style={s.link}>{source.label} ↗</Text></Pressable>)}</View>
    </View>)}
    <Text style={s.copy}>OpenStreetMap contributors · ODbL. Wikipedia descriptions: CC BY-SA; article links provide attribution. Check opening hours and access before visiting.</Text>
  </View>;
}
const s = StyleSheet.create({ root: { marginTop: 25 }, heading: { color: '#253e34', fontSize: 17, fontWeight: '600' }, copy: { fontSize: 11, color: '#7c857c', lineHeight: 18, marginVertical: 5 }, loading: { flexDirection: 'row', alignItems: 'center', gap: 8 }, place: { paddingVertical: 12, borderBottomWidth: 1, borderColor: '#e5e8df' }, name: { fontSize: 12, color: '#253e34', fontWeight: '600' }, links: { flexDirection: 'row', flexWrap: 'wrap', gap: 15 }, link: { color: '#176752', fontSize: 11, paddingVertical: 5 } });
