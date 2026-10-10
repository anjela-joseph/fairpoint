import { ACTIVITIES } from '../../../lib/discovery';

export const minutes = seconds => Math.round(seconds / 60);
export const km = metres => (metres / 1000).toFixed(1);
const capitalise = text => text.charAt(0).toUpperCase() + text.slice(1);
export const labelFor = id => ACTIVITIES.find(a => a.id === id)?.label || capitalise(String(id).replace(/_/g, ' '));
export const breakdown = row => Object.entries(row.counts || {}).filter(([, count]) => count > 0).map(([id, count]) => `${count} ${labelFor(id).toLowerCase()}`).join(' · ');
