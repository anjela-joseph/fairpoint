import React from 'react';
import { Platform, StyleSheet, Text } from 'react-native';
import Button from '../common/Button';
import Dialog from '../common/Dialog';
import { C, F, R } from '../../theme';

// How to add the openrouteservice key.
export default function SetupDialog({ onClose, onOpen }) {
  return <Dialog title="Add a routing key" onClose={onClose}>
    <Text style={s.text}>Drive times come from openrouteservice. Get a free key, copy .env.example to .env in the project folder, and add this line:</Text>
    <Text selectable style={s.code}>EXPO_PUBLIC_ORS_KEY=your_key</Text>
    <Text style={s.text}>Then restart with npx expo start -c. Searching saved places works without a key.</Text>
    <Button primary label="Get a free key" icon="arrow-up-right" onPress={() => onOpen('https://openrouteservice.org/dev/#/signup')} />
  </Dialog>;
}

const s = StyleSheet.create({
  text: { fontFamily: F.body, fontSize: 17, lineHeight: 23, color: C.ink },
  code: { fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', fontSize: 14, backgroundColor: C.card, borderWidth: 1, borderColor: C.ink, padding: 14, borderRadius: R.card, color: C.ink },
});
