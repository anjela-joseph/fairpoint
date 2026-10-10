import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import Icon from '../common/Icon';
import { C, F, R } from '../../theme';

// Shown when EXPO_PUBLIC_ORS_KEY is missing.
export default function RoutingKeyNotice({ onPress }) {
  return <Pressable accessibilityRole="button" onPress={onPress} style={s.note}>
    <Text style={s.text}>Add a routing key to start</Text>
    <Icon name="arrow-up-right" size={18} color={C.ink} />
  </Pressable>;
}

const s = StyleSheet.create({
  note: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: C.sand, paddingVertical: 12, paddingHorizontal: 16, borderRadius: R.card, marginBottom: 12 },
  text: { fontFamily: F.medium, fontSize: 17, color: C.ink, flex: 1 },
});
