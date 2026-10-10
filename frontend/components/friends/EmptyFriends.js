import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { C, F, R } from '../../theme';

export default function EmptyFriends() {
  return <View style={s.empty}><Text style={s.text}>Add where each friend is starting from. Two to four people.</Text></View>;
}

const s = StyleSheet.create({
  empty: { borderWidth: 1, borderStyle: 'dashed', borderColor: C.ink, borderRadius: R.card, padding: 18, marginBottom: 10 },
  text: { fontFamily: F.body, fontSize: 17, lineHeight: 23, color: C.ink },
});
