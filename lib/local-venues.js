import { KOCHI_CATALOGUE } from '../data/kochi.js';

export function savedCatalogueFor(friends) {
  const { metadata } = KOCHI_CATALOGUE;
  // Use this limited snapshot only when every start is inside an imported area.
  // A larger exploration radius still searches only these saved Kochi places.
  return friends.length > 0 && friends.every(point => metadata.bounds.some(bounds =>
    point.lat >= bounds.south && point.lat <= bounds.north &&
    point.lon >= bounds.west && point.lon <= bounds.east)) ? KOCHI_CATALOGUE : null;
}
