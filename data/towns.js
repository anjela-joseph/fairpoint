import { CANDIDATES } from './candidates.js';
// Editorial hints only, not measured POI counts or guarantees of attractions.
// Used when neither a saved catalogue nor a successful Overpass lookup exists.
const vibes = {
  Kochi: ['city', 'scenic'], Thrissur: ['city'], Alappuzha: ['city', 'scenic'],
  Kottayam: ['city'], Muvattupuzha: ['city'], Angamaly: ['city'],
  Palakkad: ['city', 'scenic'], Kozhikode: ['city', 'scenic'], Aluva: ['city'],
  Perumbavoor: ['city'], Chalakudy: ['city'], Irinjalakuda: ['city'],
  Cherthala: ['city', 'scenic'], Vaikom: ['city', 'scenic'], Thodupuzha: ['city', 'scenic'],
  Kothamangalam: ['city', 'scenic'], Tripunithura: ['city'],
  'North Paravur': ['city'], Kodungallur: ['city'], Pala: ['city'],
};
const extra = [
  ['Fort Kochi', 9.9656, 76.2421, ['city', 'scenic']],
  ['Edappally', 10.0261, 76.3125, ['city']],
  ['Kaloor', 9.9971, 76.3028, ['city']],
  ['Kakkanad', 10.0159, 76.3419, ['city']],
  ['Marine Drive', 9.9815, 76.2740, ['city', 'scenic']],
  ['Cherai', 10.1415, 76.1783, ['scenic']],
  ['Kumarakom', 9.6175, 76.4301, ['scenic']],
  ['Athirappilly', 10.2851, 76.5698, ['scenic']],
  ['Munnar', 10.0889, 77.0595, ['scenic']],
  ['Thekkady', 9.6031, 77.1615, ['scenic']],
  ['Guruvayur', 10.5946, 76.0410, ['city']],
  ['Varkala', 8.7379, 76.7163, ['city', 'scenic']],
  ['Thiruvananthapuram', 8.5241, 76.9366, ['city']],
  ['Kollam', 8.8932, 76.6141, ['city', 'scenic']],
  ['Kannur', 11.8745, 75.3704, ['city', 'scenic']],
  ['Kalpetta', 11.6103, 76.0828, ['city', 'scenic']],
];
export const TOWNS = [...CANDIDATES.map(town => ({ ...town, vibes: vibes[town.name] || [] })),
  ...extra.map(([name, lat, lon, vibes]) => ({ name, lat, lon, vibes }))]
  .map(town => ({ ...town, id: `town:${town.name.toLowerCase().replace(/\s+/g, '-')}`, kind: 'town' }));
