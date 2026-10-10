function inRing(point, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i], [xj, yj] = ring[j];
    if ((yi > point.lat) !== (yj > point.lat) && point.lon < (xj - xi) * (point.lat - yi) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
export function inCoverage(point, metadata) {
  if (!metadata) return false;
  if (!metadata.bounds.some(b => point.lat >= b.south && point.lat <= b.north && point.lon >= b.west && point.lon <= b.east)) return false;
  if (!metadata.geometry) return true;
  const polygons = metadata.geometry.type === 'Polygon' ? [metadata.geometry.coordinates] : metadata.geometry.coordinates;
  return polygons.some(rings => inRing(point, rings[0]) && !rings.slice(1).some(ring => inRing(point, ring)));
}
