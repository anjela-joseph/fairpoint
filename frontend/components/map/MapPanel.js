import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import MeetingMap from './MeetingMap';
import Button from '../common/Button';
import { C, F, R } from '../../theme';

// The map plus its floating controls.
export default function MapPanel({ desktop, friends, result, onAdd, recenter, onRecenter }) {
  return <View style={[s.panel, !desktop && { height: 360, minHeight: 360 }]}>
    <MeetingMap friends={friends} winner={result?.winner} onAdd={onAdd} recenter={recenter} />
    <View pointerEvents="box-none" style={s.top}>
      {friends.length === 0 ? <View pointerEvents="none" style={s.hint}><Text style={s.hintText}>Tap the map to drop a pin</Text></View> : <View />}
      {friends.length > 0 && <Button icon="maximize" small accessibilityLabel="Fit all pins on the map" onPress={onRecenter} style={s.control} />}
    </View>
  </View>;
}

const s = StyleSheet.create({
  panel: { flex: 1, position: 'relative', backgroundColor: '#e8e9e2', overflow: 'hidden' },
  top: { position: 'absolute', left: 16, right: 16, top: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  hint: { backgroundColor: C.paper, borderWidth: 1, borderColor: C.ink, borderRadius: R.pill, paddingVertical: 9, paddingHorizontal: 16 },
  hintText: { fontFamily: F.medium, fontSize: 16, color: C.ink, letterSpacing: 0.4, textTransform: 'uppercase' },
  control: { backgroundColor: C.paper },
});
