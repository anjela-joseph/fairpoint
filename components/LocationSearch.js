import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { localLocations } from '../data/locations';
import { searchLocations } from '../lib/geocoding';
import { LOCATION_METADATA } from '../data/location-index';

export default function LocationSearch({ onSelect }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const active = useRef(null);
  useEffect(() => () => active.current?.abort(), []);
  function change(text) { active.current?.abort(); active.current = null; setBusy(false); setQuery(text); setResults(null); setError(''); }
  async function search() {
    active.current?.abort();
    const controller = new AbortController(); active.current = controller;
    setBusy(true); setError(''); setResults(null);
    try {
      const places = await searchLocations(query, { signal: controller.signal });
      if (active.current === controller) setResults(places);
    } catch (err) { if (!controller.signal.aborted && active.current === controller) setError(err.message); }
    finally { if (active.current === controller) { setBusy(false); active.current = null; } }
  }
  const local = useMemo(() => localLocations(query), [query]);
  const options = results ?? local;
  return <View style={{ gap: 12 }}>
    <Text style={s.copy}>Type to search {LOCATION_METADATA.count.toLocaleString()} saved Kerala locations, including local roads, villages, metro stations, airports and landmarks. For more addresses in Kerala, search online. Always check the selected pin.</Text>
    <TextInput autoFocus accessibilityLabel="Search specific locations" placeholder="Place, local road, metro station or airport…" placeholderTextColor="#7c857c" value={query} onChangeText={change} onSubmitEditing={search} returnKeyType="search" style={s.input} />
    <Pressable accessibilityRole="button" accessibilityLabel="Search online" disabled={busy || query.trim().length < 3} onPress={search} style={[s.search, (busy || query.trim().length < 3) && { opacity: 0.45 }]}>{busy ? <ActivityIndicator size="small" color="white" /> : <Feather name="search" size={16} color="white" />}<Text style={{ color: 'white', fontSize: 12, fontWeight: '600' }}>{busy ? 'Searching…' : 'Search online'}</Text></Pressable>
    {!!error && <Text accessibilityRole="alert" style={s.error}>{error}</Text>}
    <Text style={s.label}>{results !== null ? 'KERALA ONLINE RESULTS · OPENROUTESERVICE' : 'SAVED KERALA SEARCH · OPENSTREETMAP + GEONAMES'}</Text>
    {results !== null && <Pressable accessibilityRole="button" onPress={() => setResults(null)}><Text style={s.link}>Back to saved search</Text></Pressable>}
    <ScrollView style={{ maxHeight: 320 }} keyboardShouldPersistTaps="handled">{options.map((place, index) => <Pressable key={place.id || `${place.name}-${index}`} accessibilityRole="button" accessibilityLabel={`Choose ${place.name}`} onPress={() => onSelect(place)} style={s.option}>
      <Feather name="map-pin" size={16} color="#176752" /><View style={{ flex: 1 }}><Text style={s.name}>{place.name}</Text>{place.matchedAlias && <Text style={s.address}>Also listed as {place.matchedAlias}</Text>}<Text style={s.address}>{place.address}</Text><Text style={s.address}>{place.source} · {place.kind || 'approximate centre'}</Text></View><Feather name="plus" size={16} color="#7c857c" />
    </Pressable>)}{!options.length && <Text style={s.copy}>{!query.trim() ? 'Try a local area and district, a station name, or an airport code. English and Malayalam names are supported where mapped.' : results !== null ? 'No matching Kerala address found. Try a landmark and district, or drop a map pin.' : 'No saved match. Search online for the address, or drop a map pin.'}</Text>}</ScrollView>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}><Pressable accessibilityRole="link" onPress={() => Linking.openURL('https://www.openstreetmap.org/copyright')}><Text style={s.link}>OSM contributors · ODbL</Text></Pressable><Pressable accessibilityRole="link" onPress={() => Linking.openURL('https://www.geonames.org/')}><Text style={s.link}>GeoNames · CC BY 4.0</Text></Pressable></View>
  </View>;
}
const s = StyleSheet.create({ copy: { fontSize: 12, color: '#7c857c', lineHeight: 19 }, input: { color: '#253e34', borderWidth: 1, borderColor: '#cbd6c2', backgroundColor: 'white', padding: 14, borderRadius: 9, fontSize: 13 }, search: { borderRadius: 9, backgroundColor: '#176752', padding: 13, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 9 }, label: { color: '#7c857c', fontSize: 8, letterSpacing: 0.8, lineHeight: 14 }, option: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, borderBottomWidth: 1, borderColor: '#e5e8df' }, name: { fontSize: 13, color: '#253e34', fontWeight: '500' }, address: { fontSize: 11, color: '#7c857c', lineHeight: 17, marginTop: 3 }, error: { color: '#a94d3e', fontSize: 12, lineHeight: 18 }, link: { fontSize: 11, color: '#176752' } });
