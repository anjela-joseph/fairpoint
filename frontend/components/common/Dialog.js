import React from 'react';
import { Modal, ScrollView, StyleSheet, Text, View } from 'react-native';
import Button from './Button';
import { C, F, R } from '../../theme';

export default function Dialog({ title, children, onClose }) {
  return <Modal transparent animationType="fade" visible onRequestClose={onClose}>
    <View style={s.scrim}><View accessibilityViewIsModal style={s.dialog}>
      <View style={s.header}><Text accessibilityRole="header" style={s.title}>{title}</Text><Button icon="x" accessibilityLabel="Close" small onPress={onClose} /></View>
      <ScrollView style={{ flexShrink: 1 }} contentContainerStyle={{ gap: 18 }} keyboardShouldPersistTaps="handled">{children}</ScrollView>
    </View></View>
  </Modal>;
}

const s = StyleSheet.create({
  scrim: { flex: 1, backgroundColor: '#14141466', alignItems: 'center', justifyContent: 'center', padding: 16 },
  dialog: { backgroundColor: C.paper, borderRadius: 22, borderWidth: 1, borderColor: C.ink, padding: 24, width: '100%', maxWidth: 500, maxHeight: '90%', gap: 18 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  title: { fontFamily: F.display, fontSize: 34, lineHeight: 36, color: C.ink, textTransform: 'uppercase', flex: 1 },
});
