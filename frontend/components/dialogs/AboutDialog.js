import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Button from '../common/Button';
import Dialog from '../common/Dialog';
import Label from '../common/Label';
import { C, F } from '../../theme';

const STEPS = [
  ['01', 'Add everyone', 'Search where each friend is starting from, or tap the map. Two to four people.'],
  ['02', 'Pick your day', 'City, scenic, or a bit of both. Add must-haves if there’s something you won’t skip.'],
  ['03', 'Get a spot', 'We check real drive times. If you all live close by, the spot stays close. Once someone’s drive goes past 20 minutes, we make sure the extra time is shared evenly.'],
];

export default function AboutDialog({ onClose }) {
  return <Dialog title="How it works" onClose={onClose}>
    {STEPS.map(([number, title, copy]) => <View key={number} style={s.row}>
      <Label style={s.number}>{number}</Label>
      <View style={{ flex: 1 }}><Text style={s.title}>{title}</Text><Text style={s.text}>{copy}</Text></View>
    </View>)}
    <Text style={s.note}>Places come from OpenStreetMap and Wikipedia, so a few may be missing. Drive times don’t include traffic. Places you’ve been are saved only on this device.</Text>
    <Button primary label="Got it" onPress={onClose} />
  </Dialog>;
}

const s = StyleSheet.create({
  row: { flexDirection: 'row', gap: 16 },
  number: { marginTop: 2 },
  title: { fontFamily: F.medium, fontSize: 20, color: C.ink, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 4 },
  text: { fontFamily: F.body, fontSize: 17, lineHeight: 23, color: C.ink },
  note: { fontFamily: F.body, fontSize: 15, lineHeight: 20, color: C.muted },
});
