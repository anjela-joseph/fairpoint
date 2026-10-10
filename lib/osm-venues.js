export function categoriesFor(tags) {
  const categories = [];
  if (['restaurant', 'fast_food', 'food_court'].includes(tags.amenity)) categories.push('restaurant');
  if (tags.amenity === 'cafe') categories.push('cafe');
  if (tags.amenity === 'cinema') categories.push('cinema');
  if (tags.amenity === 'theatre') categories.push('theatre');
  if (tags.shop === 'mall') categories.push('shopping');
  if (tags.tourism === 'museum') categories.push('museum');
  if (tags.historic && tags.historic !== 'no') categories.push('historic');
  if (tags.tourism === 'viewpoint' || ['beach', 'waterfall', 'peak', 'hill', 'wood'].includes(tags.natural) || ['waterfall', 'dam'].includes(tags.waterway) || ['forest', 'reservoir'].includes(tags.landuse) || tags.water === 'reservoir' || tags.boundary === 'national_park' || ['park', 'nature_reserve', 'garden'].includes(tags.leisure)) categories.push('nature');
  return categories;
}

export function normalizeVenues(elements) {
  const seen = new Set();
  return elements.flatMap(element => {
    const tags = element.tags || {};
    const lat = element.lat ?? element.center?.lat, lon = element.lon ?? element.center?.lon;
    const name = tags['name:en'] || tags.name;
    const categories = categoriesFor(tags);
    const attraction = !!(['museum', 'attraction', 'viewpoint', 'gallery', 'zoo', 'aquarium', 'theme_park', 'artwork', 'picnic_site'].includes(tags.tourism) || (tags.historic && tags.historic !== 'no') || categories.includes('nature'));
    const id = `osm:${element.type}:${element.id}`;
    if (!name || (!categories.length && !attraction) || !Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180 || seen.has(id)) return [];
    seen.add(id);
    const kind = tags.waterway === 'dam' ? 'dam' : tags.water === 'reservoir' || tags.landuse === 'reservoir' ? 'reservoir' : tags.landuse === 'forest' || tags.natural === 'wood' ? 'forest' : tags.boundary === 'national_park' ? 'national_park' : tags.historic || tags.tourism || tags.natural || tags.waterway || tags.leisure || tags.amenity || tags.shop;
    return [{ id, name, lat, lon, categories, attraction,
      kind, access: tags.access || '', description: tags['description:en'] || '',
      alternateNames: [tags.name, tags['name:en']].filter(Boolean),
      wikipedia: tags.wikipedia || '', wikidata: tags.wikidata || '',
      address: [tags['addr:suburb'], tags['addr:city']].filter(Boolean).join(', '),
      url: `https://www.openstreetmap.org/${element.type}/${element.id}` }];
  });
}
