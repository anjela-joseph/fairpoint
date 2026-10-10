import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { C, F, R } from '../../theme';

// Pill chip used for every option. Selected = lime fill.
export default function Choice({ label, selected, onPress, icon }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ selected }} onPress={onPress}
    style={({ hovered }) => [s.chip, hovered && !selected && { backgroundColor: C.card }, selected && s.selected]}>
    {icon && <Feather name={icon} size={15} color={C.ink} />}<Text style={s.text}>{label}</Text>
  </Pressable>;
}

const s = StyleSheet.create({
  chip: { borderWidth: 1, borderColor: C.ink, borderRadius: R.pill, minHeight: 40, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 7 },
  selected: { backgroundColor: C.lime },
  text: { fontFamily: F.medium, fontSize: 17, color: C.ink },
});
