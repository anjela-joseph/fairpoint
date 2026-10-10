import React from 'react';
import Feather from '@expo/vector-icons/Feather';
import { C } from '../../theme';

export default function Icon({ name, size = 18, color = C.ink }) {
  return <Feather name={name} size={size} color={color} />;
}
