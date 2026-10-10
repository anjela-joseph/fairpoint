import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import Button from '../common/Button';
import Label from '../common/Label';
import { localLocations } from '../../../data/locations';
import { searchLocations } from '../../../lib/geocoding';
import { friendly } from '../../messages';
import { C, F, R } from '../../theme';

// Saved places match as you type; "Search online" looks up addresses too.
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
    } catch (err) { if (!controller.signal.aborted && active.current === controller) setError(friendly(err)); }
    finally { if (active.current === controller) { setBusy(false); active.current = null; } }
  }
  const local = useMemo(() => localLocations(query), [query]);
  const options = results ?? local;
  const canSearch = !busy && query.trim().length >= 3;
  const emptyText = !query.trim() ? 'Start typing to see places.' : results !== null ? 'Nothing found online. Try a nearby landmark, or tap the map.' : 'No saved match. Try searching online, or tap the map.';

  return <View style={{ gap: 14 }}>
    <View style={s.inputRow}>
      <Feather name="search" size={18} color={C.ink} />
      <TextInput autoFocus accessibilityLabel="Search places" placeholder="Search a town, area, landmark, or station." placeholderTextColor={C.faint} value={query} onChangeText={change} onSubmitEditing={search} returnKeyType="search" style={s.input} />
    </View>
    <Button small label={busy ? 'Searching…' : 'Search online'} icon={busy ? undefined : 'globe'} disabled={!canSearch} onPress={search} style={{ alignSelf: 'flex-start' }} />
    {busy && <ActivityIndicator size="small" color={C.ink} style={{ alignSelf: 'flex-start' }} />}
    {!!error && <Text accessibilityRole="alert" style={s.message}>{error}</Text>}
    <View style={s.between}>
      <Label>{results !== null ? 'Online results' : 'Saved places'}</Label>
      {results !== null && <Pressable accessibilityRole="button" onPress={() => setResults(null)}><Text style={s.link}>Back to saved</Text></Pressable>}
    </View>
    <ScrollView style={{ maxHeight: 340 }} keyboardShouldPersistTaps="handled">
      {options.map((place, index) => <Pressable key={place.id || `${place.name}-${index}`} accessibilityRole="button" accessibilityLabel={`Choose ${place.name}`} onPress={() => onSelect(place)}
        style={({ hovered }) => [s.option, hovered && { backgroundColor: C.card }]}>
        <View style={{ flex: 1 }}>
          <Text style={s.name}>{place.name}</Text>
          {!!place.matchedAlias && <Text style={s.meta}>Also called {place.matchedAlias}</Text>}
          <Text style={s.meta} numberOfLines={2}>{[place.address, place.kind && place.kind.replace(/_/g, ' ')].filter(Boolean).join(' · ')}</Text>
        </View>
        <Feather name="plus" size={20} color={C.ink} />
      </Pressable>)}
      {!options.length && <Text style={s.message}>{emptyText}</Text>}
    </ScrollView>
    <View style={s.credits}>
      <Pressable accessibilityRole="link" onPress={() => Linking.openURL('https://www.openstreetmap.org/copyright')}><Text style={s.credit}>© OpenStreetMap (ODbL)</Text></Pressable>
      <Pressable accessibilityRole="link" onPress={() => Linking.openURL('https://www.geonames.org/')}><Text style={s.credit}>GeoNames (CC BY 4.0)</Text></Pressable>
    </View>
  </View>;
}

const s = StyleSheet.create({
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderColor: C.ink, backgroundColor: C.card, borderRadius: R.pill, paddingHorizontal: 18 },
  input: { flex: 1, fontFamily: F.body, fontSize: 18, color: C.ink, paddingVertical: 14, outlineStyle: 'none' },
  between: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  option: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13, paddingHorizontal: 4, borderBottomWidth: 1, borderColor: C.line },
  name: { fontFamily: F.medium, fontSize: 18, color: C.ink },
  meta: { fontFamily: F.body, fontSize: 15, lineHeight: 20, color: C.muted, marginTop: 2 },
  message: { fontFamily: F.body, fontSize: 17, lineHeight: 22, color: C.ink, paddingVertical: 8 },
  link: { fontFamily: F.medium, fontSize: 15, color: C.ink, textDecorationLine: 'underline' },
  credits: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  credit: { fontFamily: F.body, fontSize: 13, color: C.muted, textDecorationLine: 'underline' },
});
