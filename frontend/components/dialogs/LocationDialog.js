import React from 'react';
import Dialog from '../common/Dialog';
import LocationSearch from '../search/LocationSearch';

export default function LocationDialog({ editing, onSelect, onClose }) {
  return <Dialog title={editing ? 'Change starting point' : 'Where are they starting?'} onClose={onClose}>
    <LocationSearch onSelect={onSelect} />
  </Dialog>;
}
