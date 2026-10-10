import React from 'react';
import { Text } from 'react-native';
import { T } from '../../theme';

// Small spaced-out uppercase caption, e.g. "WHO'S COMING".
export default function Label({ children, style, ...props }) {
  return <Text {...props} style={[T.label, style]}>{children}</Text>;
}
