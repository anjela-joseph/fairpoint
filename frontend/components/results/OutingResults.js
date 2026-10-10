import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Label from '../common/Label';
import ActionButton from './ActionButton';
import Alternatives from './Alternatives';
import Attractions from './Attractions';
import JourneyBars from './JourneyBars';
import NearbyPlaces from './NearbyPlaces';
import { breakdown, labelFor, minutes } from './format';
import { C, F, R } from '../../theme';

export default function OutingResults({ result, friends, mode, onOpen, onSelect, onRemember, remembered, saving }) {
  const { winner, naive, preferences, alternatives } = result;
  const live = mode === 'live';
  const matched = [...new Set(winner.places.flatMap(p => p.categories))];
  const nextId = alternatives[(alternatives.findIndex(r => r.id === winner.id) + 1) % alternatives.length]?.id;
  const summary = winner.evidenceSource?.kind === 'vibes'
    ? `Known for ${winner.vibes.join(' and ')}. We couldn’t check what’s nearby, so look around before you go.`
    : breakdown(winner) ? `Within 5 km: ${breakdown(winner)}.` : null;

  return <View style={s.root} accessibilityLiveRegion="polite">
    <Label>Meet in</Label>
    <Text accessibilityRole="header" style={s.name}>{winner.name}</Text>
    {summary && <Text style={s.summary}>{summary}</Text>}

    <View style={s.stats}>
      <View style={s.stat}><Label style={s.statLabel}>Longest drive</Label><Text style={s.number}>{minutes(winner.worst)}<Text style={s.unit}> min</Text></Text></View>
      <View style={s.divider} />
      <View style={s.stat}><Label style={s.statLabel}>How even</Label><Text style={s.number}>{winner.similarity}<Text style={s.unit}>%</Text></Text></View>
    </View>

    {matched.length > 0 && <View style={s.tags}>{matched.map(category => <Text key={category} style={s.tag}>{labelFor(category)}</Text>)}</View>}

    <View style={s.actions}>
      {live && <ActionButton label="Open in Maps" icon="arrow-up-right" onPress={() => onOpen(`https://www.google.com/maps/search/?api=1&query=${winner.lat},${winner.lon}`)} />}
      <ActionButton label="Another option" icon="shuffle" disabled={!alternatives.some(row => row.id !== winner.id)} onPress={() => onSelect(nextId)} />
      <ActionButton label={saving ? 'Saving…' : remembered ? 'Saved' : 'We went here'} icon={remembered ? 'check' : undefined} disabled={saving || remembered} onPress={onRemember} />
    </View>

    <JourneyBars friends={friends} winner={winner} naive={naive} />
    <Alternatives alternatives={alternatives} selectedId={winner.id} onSelect={onSelect} />
    <NearbyPlaces winner={winner} activities={preferences.activities} onOpen={onOpen} />
    {live && <Attractions town={winner} onOpen={onOpen} />}

    <Text style={s.footnote}>Map data © <Text accessibilityRole="link" style={s.link} onPress={() => onOpen('https://www.openstreetmap.org/copyright')}>OpenStreetMap contributors</Text> (ODbL). Drive times from openrouteservice, without traffic.</Text>
  </View>;
}

const s = StyleSheet.create({
  root: { marginTop: 40, paddingTop: 32, borderTopWidth: 1, borderColor: C.ink },
  name: { fontFamily: F.display, fontSize: 56, lineHeight: 56, color: C.ink, textTransform: 'uppercase', marginTop: 8 },
  summary: { fontFamily: F.body, fontSize: 17, lineHeight: 23, color: C.ink, marginTop: 10 },
  stats: { flexDirection: 'row', borderWidth: 1, borderColor: C.ink, borderRadius: R.card, backgroundColor: C.card, marginTop: 20 },
  stat: { flex: 1, padding: 16 },
  statLabel: { fontSize: 13 },
  divider: { width: 1, backgroundColor: C.ink },
  number: { fontFamily: F.display, fontSize: 48, lineHeight: 52, color: C.ink, marginTop: 4 },
  unit: { fontFamily: F.body, fontSize: 18 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 14 },
  tag: { fontFamily: F.medium, fontSize: 15, color: C.ink, backgroundColor: C.lime, paddingVertical: 5, paddingHorizontal: 12, borderRadius: R.pill, overflow: 'hidden' },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 18 },
  link: { textDecorationLine: 'underline', color: C.ink },
  footnote: { fontFamily: F.body, fontSize: 14, lineHeight: 19, color: C.muted, marginTop: 32 },
});
