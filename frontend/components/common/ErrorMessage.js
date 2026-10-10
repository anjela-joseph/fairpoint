import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Icon from './Icon';
import { C, F, R } from '../../theme';

// Calm "that didn't work" box. Pass text from messages.js, not raw errors.
export default function ErrorMessage({ message }) {
  return <View accessibilityRole="alert" style={s.box}><Icon name="info" color={C.ink} size={18} /><Text style={s.text}>{message}</Text></View>;
}

const s = StyleSheet.create({
  box: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, borderWidth: 1, borderColor: C.ink, backgroundColor: C.card, borderRadius: R.card, padding: 14, marginTop: 16 },
  text: { fontFamily: F.body, fontSize: 17, lineHeight: 22, color: C.ink, flex: 1 },
});
