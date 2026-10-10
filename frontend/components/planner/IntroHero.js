import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Label from '../common/Label';
import { C, F } from '../../theme';

// Tagline + subheading, laid out like a poster: big thin words, a small spaced-out line under them.
export default function IntroHero({ desktop }) {
  return <View style={[s.root, !desktop && s.mobile]}>
    <Text accessibilityRole="header" style={[s.tagline, !desktop && { fontSize: 46, lineHeight: 46 }]}>Everyone drives{'\n'}about the same</Text>
    <Label style={s.sub}>Not the middle of the map,{'\n'}the middle of the effort</Label>
  </View>;
}

const s = StyleSheet.create({
  root: { paddingHorizontal: 32, paddingTop: 40, paddingBottom: 36 },
  mobile: { paddingHorizontal: 16, paddingTop: 24, paddingBottom: 22 },
  tagline: { fontFamily: F.display, fontSize: 60, lineHeight: 58, color: C.ink, textTransform: 'uppercase', letterSpacing: -0.5 },
  sub: { marginTop: 16, fontSize: 17, lineHeight: 22, letterSpacing: 2 },
});
