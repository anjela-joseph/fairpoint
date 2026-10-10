import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Label from '../common/Label';
import { km, minutes } from './format';
import { C, F } from '../../theme';

// One pair of bars per friend: drive to the chosen spot vs. drive to the map's halfway point.
export default function JourneyBars({ friends, winner, naive }) {
  const max = Math.max(1, ...winner.times, ...naive.times);
  return <View style={s.root}>
    <Label style={s.label}>Everyone’s drive</Label>
    <View style={s.legend}>
      <View style={[s.key, s.limeKey]} /><Text style={s.legendText}>This spot</Text>
      <View style={[s.key, { backgroundColor: '#c9c7bd', marginLeft: 12 }]} /><Text style={s.legendText}>Halfway on the map ({naive.name})</Text>
    </View>
    {friends.map((friend, i) => <View key={i} style={s.friend}>
      <View style={s.between}>
        <Text style={s.name}>{friend.person}</Text>
        <Text style={s.value}>{minutes(winner.times[i])} min{winner.distances?.[i] != null ? ` · ${km(winner.distances[i])} km` : ''}</Text>
      </View>
      {[[winner.times[i], 'This spot'], [naive.times[i], 'Halfway']].map(([time, label], k) =>
        <View key={label} style={s.track} accessibilityLabel={`${friend.person}, ${label}, ${minutes(time)} minutes`}>
          <View style={[k === 0 ? s.spotBar : s.halfBar, { width: `${Math.max(2, time / max * 100)}%` }]} />
        </View>)}
    </View>)}
  </View>;
}

const s = StyleSheet.create({
  root: { marginTop: 34 },
  label: { marginBottom: 10 },
  legend: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6, marginBottom: 6 },
  key: { width: 18, height: 10, borderRadius: 5 },
  limeKey: { backgroundColor: C.lime, borderWidth: 1, borderColor: C.ink },
  legendText: { fontFamily: F.body, fontSize: 15, color: C.muted },
  friend: { marginTop: 14 },
  between: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 },
  name: { fontFamily: F.medium, fontSize: 17, color: C.ink, textTransform: 'uppercase', letterSpacing: 0.4 },
  value: { fontFamily: F.body, fontSize: 16, color: C.ink },
  track: { height: 12, backgroundColor: '#ebeae3', borderRadius: 6, overflow: 'hidden', marginTop: 5 },
  spotBar: { height: '100%', backgroundColor: C.lime, borderWidth: 1, borderColor: C.ink, borderRadius: 6 },
  halfBar: { height: '100%', backgroundColor: '#c9c7bd', borderRadius: 6 },
});
