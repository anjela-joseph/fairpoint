import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Button from '../common/Button';
import { C, F } from '../../theme';

export default function AppHeader({ width, desktop, onHelp }) {
  return <View style={[s.header, !desktop && s.mobile]}>
    <Text accessibilityRole="header" style={[s.logo, !desktop && { fontSize: 36 }]}>FAIRPOINT</Text>
    <Button small label={width > 420 ? 'How it works' : undefined} icon={width > 420 ? undefined : 'help-circle'} accessibilityLabel="How it works" onPress={onHelp} />
  </View>;
}

const s = StyleSheet.create({
  header: { height: 84, backgroundColor: C.paper, borderBottomWidth: 1, borderColor: C.ink, paddingHorizontal: 32, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  mobile: { height: 68, paddingHorizontal: 16 },
  logo: { fontFamily: F.logo, fontSize: 44, lineHeight: 48, letterSpacing: 2, color: C.ink, includeFontPadding: false },
});
