import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { ACTIVITIES } from '../lib/discovery';

function Choice({ label, selected, onPress, icon }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ selected }} onPress={onPress} style={[s.chip, selected && s.selected]}>
    {icon && <Feather name={icon} size={13} color={selected ? '#176752' : '#7c857c'} />}<Text style={[s.chipText, selected && { color: '#176752' }]}>{label}</Text>
  </Pressable>;
}
export default function OutingPreferences({ value, onChange, visitedCount, onClear }) {
  const scenicFarther = value.experience === 'scenic' && value.reach >= 80;
  const update = patch => onChange({ ...value, ...patch });
  return <View style={s.root}>
    <Text style={s.title}>Make a day of it</Text>
    <Text style={s.label}>CHOOSE YOUR EXPERIENCE</Text>
    <View style={s.wrap}>{[['city', 'City'], ['scenic', 'Scenic'], ['mixed', 'Mixed']].map(([id, label]) => <Choice key={id} label={label} selected={value.experience === id} onPress={() => update({ experience: id })} />)}</View>
    <Text style={s.copy}>{value.experience === 'city' ? 'Cafés, restaurants, theatre, cinema, shopping and museums.' : value.experience === 'scenic' ? 'Forests, waterfalls, dams, reservoirs, viewpoints, hills, parks and beaches.' : 'A mix of city activities and nature nearby.'}</Text>
    <Text style={s.copy}>Optional must-haves: every selected activity needs mapped evidence within 5 km of the destination.</Text>
    <View style={s.wrap}>{ACTIVITIES.map(activity => <Choice key={activity.id} label={activity.label} icon={activity.icon} selected={value.activities.includes(activity.id)} onPress={() => update({ activities: value.activities.includes(activity.id) ? value.activities.filter(id => id !== activity.id) : [...value.activities, activity.id] })} />)}</View>
    <Text style={s.label}>WHAT DOES FAIR MEAN TODAY?</Text>
    {!scenicFarther && <View style={s.wrap}>{[['equal', 'Similar journeys'], ['shortest', 'Less travel']].map(([id, label]) => <Choice key={id} label={label} selected={value.strategy === id} onPress={() => update({ strategy: id })} />)}</View>}
    {!scenicFarther && <View style={[s.wrap, { marginTop: 8 }]}>{[['time', 'Balance time'], ['distance', 'Balance distance']].map(([id, label]) => <Choice key={id} label={label} selected={value.metric === id} onPress={() => update({ metric: id })} />)}</View>}
    <Text style={s.copy}>{scenicFarther ? 'Scenic + Go farther favours similar road distances to named nature destinations across Kerala.' : 'Compare journeys proportionally: Similar journeys favours an even share; Less travel favours shorter trips.'} No hard travel limits. Scores combine 70% journey fairness and 30% experience.</Text>
    <Text style={s.label}>EXPLORATION AREA</Text>
    <View style={s.wrap}>{[[30, 'Stay closer'], [80, 'Go farther']].map(([reach, label]) => <Choice key={reach} label={label} selected={value.reach === reach} onPress={() => update({ reach })} />)}</View>
    <Text style={s.copy}>Stay closer explores around your group. Go farther considers all Kerala, including destinations beyond your starting areas.</Text>
    <Pressable accessibilityRole="checkbox" accessibilityLabel="Avoid past outings" accessibilityState={{ checked: value.avoidVisited }} onPress={() => update({ avoidVisited: !value.avoidVisited })} style={s.history}>
      <Feather name={value.avoidVisited ? 'check-square' : 'square'} size={18} color="#176752" /><Text style={s.chipText}>Somewhere new · avoid past outings</Text>
    </Pressable>
    {visitedCount > 0 && <View style={s.history}><Text style={s.copy}>{visitedCount} saved on this device</Text><Pressable accessibilityRole="button" accessibilityLabel="Clear outing history" onPress={onClear}><Text style={s.link}>Clear history</Text></Pressable></View>}
  </View>;
}
const s = StyleSheet.create({ root: { marginTop: 20, borderTopWidth: 1, borderColor: '#e5e8df', paddingTop: 20, marginBottom: 16 }, title: { fontSize: 16, color: '#253e34', fontWeight: '600' }, copy: { fontSize: 11, color: '#7c857c', lineHeight: 17, marginVertical: 9 }, wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 }, chip: { borderWidth: 1, borderColor: '#dce2d5', borderRadius: 8, paddingVertical: 10, paddingHorizontal: 11, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#fff' }, selected: { backgroundColor: '#eaf1e2', borderColor: '#91b39a' }, chipText: { fontSize: 11, color: '#61705e' }, label: { fontSize: 9, letterSpacing: 1.1, fontWeight: '600', color: '#7c857c', marginTop: 18, marginBottom: 10 }, history: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 9 }, link: { color: '#176752', fontSize: 11, textDecorationLine: 'underline' } });
