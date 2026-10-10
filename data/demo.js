import { CANDIDATES } from './candidates.js';

export const DEMO_FRIENDS = [
  { ...CANDIDATES[1], person: 'Anu' },
  { ...CANDIDATES[0], person: 'Ravi' },
  { ...CANDIDATES[3], person: 'Meera' },
];

// Illustrative minutes, NOT captured routing results. Bound to the exact pins
// above and candidate order. Never use this matrix with user-selected pins.
const SAMPLE_MINUTES = [
  [100, 0, 160, 155, 100, 52, 85, 145, 55, 65, 35, 30, 135, 125, 125, 90, 105, 60, 40, 145],
  [0, 100, 75, 90, 65, 48, 165, 250, 32, 52, 70, 90, 50, 55, 100, 85, 20, 45, 65, 110],
  [90, 155, 50, 0, 65, 105, 210, 310, 95, 71, 125, 145, 55, 40, 60, 90, 75, 110, 125, 35],
];
export const DEMO_DURATIONS = SAMPLE_MINUTES.map(row => row.map(minutes => minutes * 60));
export const DEMO_PLACES = [
  { title: 'Iringole Kavu', dist: 2600, pageid: null },
  { title: 'Perumbavoor town', dist: 400, pageid: null },
  { title: 'Periyar river', dist: 4200, pageid: null },
];
