import test from 'node:test';
import assert from 'node:assert/strict';
import { tidyAddress, tidyLocationRow, tidyName } from '../lib/place-names.js';
import { searchSavedLocations } from '../lib/location-index.js';

test('place names get tidy spacing and punctuation', () => {
  assert.equal(tidyName('Police Station ,Cherpu'), 'Police Station, Cherpu');
  assert.equal(tidyName('Fort Immanuel,Fort Kochi'), 'Fort Immanuel, Fort Kochi');
  assert.equal(tidyName('Cochin  Bakery'), 'Cochin Bakery');
  assert.equal(tidyName('St.Joseph\'s Junior School'), 'St. Joseph\'s Junior School');
  assert.equal(tidyName('Arjuna Furniture Showroom..'), 'Arjuna Furniture Showroom');
  assert.equal(tidyName('Uliyathaduka(Seethangoli Jn)'), 'Uliyathaduka (Seethangoli Jn)');
  assert.equal(tidyName('- Sabari Vegiterian hotel'), 'Sabari Vegiterian Hotel');
  assert.equal(tidyName('Kerala State Co-operative Bank Ltd.'), 'Kerala State Co-operative Bank Ltd.');
});

test('capitalisation is fixed without breaking acronyms or Malayalam', () => {
  assert.equal(tidyName('chungam bus stop'), 'Chungam Bus Stop');
  assert.equal(tidyName('MADATHIL STOP'), 'Madathil Stop');
  assert.equal(tidyName('CEES WATCHES AND OPTICALS'), 'Cees Watches and Opticals');
  assert.equal(tidyName('HILL TOP school'), 'Hill Top School');
  assert.equal(tidyName('ICICI BANK ATM'), 'ICICI Bank ATM');
  assert.equal(tidyName('AMLP SCHOOL CHOLAYIL'), 'AMLP School Cholayil');
  assert.equal(tidyName('KSRTC'), 'KSRTC');
  assert.equal(tidyName('McDonald\'s'), 'McDonald\'s');
  assert.equal(tidyName('Cafe del Mar'), 'Cafe del Mar');
  assert.equal(tidyName('പാലച്ചുവട്'), 'പാലച്ചുവട്');
});

test('addresses lose repeated and empty parts', () => {
  assert.equal(tidyAddress('NAGAMPADAM ,KOTTAYAM, Kottayam, Kerala, India'), 'Nagampadam, Kottayam, Kerala, India');
  assert.equal(tidyAddress(',Ernakulam, Malipuram PO, Ernakulam, Kerala, India'), 'Malipuram PO, Ernakulam, Kerala, India');
});

test('the old spelling still finds a tidied place', () => {
  const row = tidyLocationRow(['x', 'St.Mary\'s HSS', 10, 76, 'Kerala, India', ['school'], 'school', 'OpenStreetMap']);
  assert.equal(row[1], 'St. Mary\'s HSS');
  assert.ok(row[5].includes('St.Mary\'s HSS'));
  assert.ok(searchSavedLocations('kaloor').length > 0);
});
