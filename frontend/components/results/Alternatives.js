import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import Label from '../common/Label';
import { breakdown, minutes } from './format';
import { C, F, R } from '../../theme';

export default function Alternatives({ alternatives, selectedId, onSelect }) {
  if (alternatives.length < 2) return null;
  return <View style={s.root}>
    <Label style={s.label}>Other options</Label>
    {alternatives.map(row => {
      const selected = selectedId === row.id;
      const nearby = row.evidenceSource?.kind === 'vibes' ? `Known for ${row.vibes.join(' and ')}` : breakdown(row);
      return <Pressable key={row.id} accessibilityRole="button" accessibilityLabel={`Choose ${row.name}`} accessibilityState={{ selected }} onPress={() => onSelect(row.id)}
        style={({ hovered }) => [s.row, hovered && !selected && { backgroundColor: C.card }, selected && s.selected]}>
        <View style={{ flex: 1 }}>
          <Text style={s.name}>{row.name}</Text>
          <Text style={s.meta}>{minutes(row.worst)} min longest drive · {row.similarity}% even</Text>
          {!!nearby && <Text style={s.meta} numberOfLines={2}>{nearby}</Text>}
        </View>
        <Feather name={selected ? 'check' : 'arrow-right'} size={20} color={C.ink} />
      </Pressable>;
    })}
  </View>;
}

const s = StyleSheet.create({
  root: { marginTop: 34 },
  label: { marginBottom: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 16, borderWidth: 1, borderColor: C.ink, borderRadius: R.card, marginBottom: 8 },
  selected: { backgroundColor: C.lime },
  name: { fontFamily: F.medium, fontSize: 19, color: C.ink, textTransform: 'uppercase', letterSpacing: 0.4 },
  meta: { fontFamily: F.body, fontSize: 15, lineHeight: 20, color: C.muted, marginTop: 2 },
});
