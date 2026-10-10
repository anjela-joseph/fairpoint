import React from 'react';
import { StyleSheet, View } from 'react-native';
import Button from '../common/Button';
import Label from '../common/Label';
import EmptyFriends from './EmptyFriends';
import FriendRow from './FriendRow';
import { MAX_FRIENDS } from '../../hooks/useMeetingPlanner';

// "Who's coming" section: counter, empty state, one row per friend and the add button.
export default function FriendList({ friends, editable, loading, onAdd, onEdit, onRemove }) {
  const full = friends.length >= MAX_FRIENDS;
  return <View>
    <View style={s.header}><Label>Who’s coming</Label><Label style={s.counter}>{friends.length}/{MAX_FRIENDS}</Label></View>
    {friends.length === 0 && <EmptyFriends />}
    {friends.map((friend, index) => <FriendRow key={`${index}-${friend.lat}-${friend.lon}`} friend={friend} index={index} editable={editable} onEdit={() => onEdit(index)} onRemove={() => onRemove(index)} />)}
    {editable && <Button label={full ? 'That’s everyone' : 'Add a friend'} icon={full ? undefined : 'plus'} disabled={full || loading} onPress={onAdd} />}
  </View>;
}

const s = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  counter: { letterSpacing: 0.5 },
});
