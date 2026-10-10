import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import Icon from './Icon';
import { C, F, R } from '../../theme';

// Pill button. `primary` = solid black, default = outlined, `plain` = no border (icon-only controls).
export default function Button({ label, icon, onPress, primary, plain, disabled, small, style, accessibilityLabel }) {
  const colour = primary ? C.paper : C.ink;
  return <Pressable accessibilityRole="button" accessibilityLabel={accessibilityLabel || label} accessibilityState={{ disabled: !!disabled }} disabled={disabled} onPress={onPress}
    style={({ pressed, hovered }) => [s.button, primary && s.primary, plain && s.plain, small && s.small, !label && s.iconOnly, !label && small && s.iconOnlySmall, hovered && !disabled && (primary ? s.primaryHover : s.hover), pressed && { opacity: 0.7 }, disabled && { opacity: 0.35 }, style]}>
    {label && <Text style={[s.text, small && s.smallText, { color: colour }]}>{label}</Text>}
    {icon && <Icon name={icon} size={small ? 16 : 18} color={colour} />}
  </Pressable>;
}

const s = StyleSheet.create({
  button: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10, minHeight: 50, paddingHorizontal: 24, borderRadius: R.pill, borderWidth: 1, borderColor: C.ink, backgroundColor: 'transparent' },
  primary: { backgroundColor: C.ink },
  plain: { borderColor: 'transparent' },
  hover: { backgroundColor: C.card },
  primaryHover: { backgroundColor: '#2c2c2c' },
  small: { minHeight: 38, paddingHorizontal: 16, gap: 7 },
  iconOnly: { width: 50, paddingHorizontal: 0 },
  iconOnlySmall: { width: 38, minHeight: 38 },
  text: { fontFamily: F.medium, fontSize: 18, letterSpacing: 0.6, textTransform: 'uppercase' },
  smallText: { fontSize: 15 },
});
