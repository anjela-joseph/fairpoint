import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Button from '../common/Button';
import { FRIEND_COLORS } from '../../../data/candidates';
import { C, F, R } from '../../theme';

const formatCoordinates = ({ lat, lon }) => `${Math.abs(lat).toFixed(3)}° ${lat >= 0 ? 'N' : 'S'}, ${Math.abs(lon).toFixed(3)}° ${lon >= 0 ? 'E' : 'W'}`;

export default function FriendRow({ friend, index, editable, onEdit, onRemove }) {
  return <View style={s.row}>
    <View style={[s.badge, { backgroundColor: FRIEND_COLORS[index] }]}><Text style={s.badgeText}>{index + 1}</Text></View>
    <Pressable accessibilityRole="button" accessibilityLabel={`Change where ${friend.person} starts`} onPress={onEdit} style={{ flex: 1 }}>
      <Text style={s.name}>{friend.person}</Text>
      <Text style={s.place} numberOfLines={1}>{friend.name === 'Dropped pin' ? formatCoordinates(friend) : friend.name}</Text>
    </Pressable>
    {editable && <Button icon="x" plain small accessibilityLabel={`Remove ${friend.person}`} onPress={onRemove} />}
  </View>;
}

const s = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, borderWidth: 1, borderColor: C.ink, borderRadius: R.card, backgroundColor: C.card, paddingVertical: 12, paddingLeft: 14, paddingRight: 6, marginBottom: 10 },
  badge: { width: 34, height: 34, borderRadius: 17, justifyContent: 'center', alignItems: 'center' },
  badgeText: { fontFamily: F.bold, fontSize: 18, color: 'white' },
  name: { fontFamily: F.medium, fontSize: 18, color: C.ink, textTransform: 'uppercase', letterSpacing: 0.4 },
  place: { fontFamily: F.body, fontSize: 16, color: C.muted, marginTop: 1 },
});
