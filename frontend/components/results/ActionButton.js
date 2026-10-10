import React from 'react';
import Button from '../common/Button';

// Small outlined pill used in the results section.
export default function ActionButton({ label, icon, disabled, onPress }) {
  return <Button small label={label} icon={icon} disabled={disabled} onPress={onPress} />;
}
