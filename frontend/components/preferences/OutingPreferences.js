import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import Label from '../common/Label';
import Choice from './Choice';
import { ACTIVITIES } from '../../../lib/discovery';
import { C, F } from '../../theme';

const EXPERIENCES = [
  ['city', 'City', 'Cafés, cinemas, shopping, and good food.'],
  ['scenic', 'Scenic', 'Waterfalls, hills, forests, and views.'],
  ['mixed', 'Mixed', 'A bit of both.'],
];
const AREAS = [
  [30, 'Stay closer', 'Keep it around where you all are.'],
  [80, 'Go farther', 'Anywhere in Kerala is on the table.'],
];

function Section({ label, children }) {
  return <View style={s.section}><Label style={s.label}>{label}</Label>{children}</View>;
}

export default function OutingPreferences({ value, onChange, visitedCount, onClear }) {
  const scenicFarther = value.experience === 'scenic' && value.reach >= 80;
  const update = patch => onChange({ ...value, ...patch });
  const toggle = id => update({ activities: value.activities.includes(id) ? value.activities.filter(a => a !== id) : [...value.activities, id] });
  return <View style={s.root}>
    <Section label="What kind of day are you after?">
      <View style={s.wrap}>{EXPERIENCES.map(([id, label]) => <Choice key={id} label={label} selected={value.experience === id} onPress={() => update({ experience: id })} />)}</View>
      <Text style={s.hint}>{EXPERIENCES.find(([id]) => id === value.experience)?.[2]}</Text>
    </Section>

    <Section label="Must-haves (optional)">
      <View style={s.wrap}>{ACTIVITIES.map(a => <Choice key={a.id} label={a.label} selected={value.activities.includes(a.id)} onPress={() => toggle(a.id)} />)}</View>
      <Text style={s.hint}>Only show places with these nearby.</Text>
    </Section>

    <Section label="How far?">
      <View style={s.wrap}>{AREAS.map(([reach, label]) => <Choice key={reach} label={label} selected={value.reach === reach} onPress={() => update({ reach })} />)}</View>
      <Text style={s.hint}>{AREAS.find(([reach]) => reach === value.reach)?.[2]}</Text>
    </Section>

    <Section label="What’s fair?">
      {scenicFarther
        ? <Text style={s.hint}>For scenic trips across Kerala, everyone gets a similar distance on the road.</Text>
        : <>
          <View style={s.wrap}>{[['equal', 'Similar drives'], ['shortest', 'Less driving overall']].map(([id, label]) => <Choice key={id} label={label} selected={value.strategy === id} onPress={() => update({ strategy: id })} />)}</View>
          <View style={[s.wrap, { marginTop: 8 }]}>{[['time', 'By time'], ['distance', 'By distance']].map(([id, label]) => <Choice key={id} label={label} selected={value.metric === id} onPress={() => update({ metric: id })} />)}</View>
          <Text style={s.hint}>Drives under {value.metric === 'distance' ? '12 km' : '20 minutes'} all count as even.</Text>
        </>}
    </Section>

    <Pressable accessibilityRole="checkbox" accessibilityLabel="Skip places we’ve been" accessibilityState={{ checked: value.avoidVisited }} onPress={() => update({ avoidVisited: !value.avoidVisited })} style={s.check}>
      <Feather name={value.avoidVisited ? 'check-square' : 'square'} size={20} color={C.ink} /><Text style={s.checkText}>Skip places we’ve been</Text>
    </Pressable>
    {visitedCount > 0 && <View style={s.history}>
      <Text style={s.hint}>{visitedCount} {visitedCount === 1 ? 'place' : 'places'} saved on this device</Text>
      <Pressable accessibilityRole="button" accessibilityLabel="Clear past outings" onPress={onClear}><Text style={s.link}>Clear</Text></Pressable>
    </View>}
  </View>;
}

const s = StyleSheet.create({
  root: { marginTop: 36 },
  section: { marginBottom: 26 },
  label: { marginBottom: 12 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  hint: { fontFamily: F.body, fontSize: 16, lineHeight: 21, color: C.muted, marginTop: 10 },
  check: { flexDirection: 'row', alignItems: 'center', gap: 10, alignSelf: 'flex-start', paddingVertical: 4 },
  checkText: { fontFamily: F.medium, fontSize: 17, color: C.ink },
  history: { flexDirection: 'row', alignItems: 'baseline', gap: 12 },
  link: { fontFamily: F.medium, fontSize: 16, color: C.ink, textDecorationLine: 'underline' },
});
