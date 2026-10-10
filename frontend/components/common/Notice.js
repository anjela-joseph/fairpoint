import React from 'react';
import { StyleSheet, Text } from 'react-native';
import { C, F, R } from '../../theme';

// Gentle heads-up. Pass `live` for messages screen readers should announce.
export default function Notice({ children, live }) {
  return <Text accessibilityLiveRegion={live ? 'polite' : undefined} style={s.notice}>{children}</Text>;
}

const s = StyleSheet.create({
  notice: { fontFamily: F.body, fontSize: 17, lineHeight: 22, color: C.ink, backgroundColor: C.sand, padding: 14, borderRadius: R.card, marginTop: 14, overflow: 'hidden' },
});
