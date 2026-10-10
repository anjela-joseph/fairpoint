// Plain-language wording for anything that goes wrong.
// Services return technical messages; this turns them into something friendly.
const RULES = [
  [/routing key|openrouteservice key|EXPO_PUBLIC_ORS_KEY/i, /not accepted|did not accept/i, 'The routing key didn’t work. Check it, then restart the app.'],
  [/online address search needs/i, null, 'Online search needs a routing key. Saved places still work, or tap the map.'],
  [/routing key|openrouteservice key|EXPO_PUBLIC_ORS_KEY/i, null, 'You’ll need a routing key first. Tap “Add a routing key” above.'],
  [/limit has been reached|busy|429/i, null, 'Lots of searches right now. Try again in a minute.'],
  [/please wait/i, null, 'Give it a few seconds, then try again.'],
  [/at least 3 characters/i, null, 'Type a few more letters.'],
  [/no candidate kerala towns/i, null, 'Nothing in this area. Try “Go farther” or move a pin.'],
  [/no reachable destination has mapped|matches all your choices/i, null, 'No place has everything you picked. Try removing a must-have or choose “Go farther”.'],
  [/reachable by everyone|no town is reachable/i, null, 'Couldn’t find somewhere everyone can drive to. Try moving a pin closer to a road.'],
  [/distances are unavailable/i, null, 'Couldn’t get road distances. Try balancing by time instead.'],
  [/add 2–4 friends/i, null, 'Add two to four people first.'],
  [/timed out|request failed|unavailable|invalid|could not finish/i, null, 'Couldn’t reach the map service. Check your connection and try again.'],
];

export function friendly(error) {
  const text = typeof error === 'string' ? error : error?.message || '';
  for (const [match, also, message] of RULES) if (match.test(text) && (!also || also.test(text))) return message;
  return 'That didn’t work. Try again in a moment.';
}

export const MESSAGES = {
  outsideKerala: 'That spot’s outside Kerala. Pick somewhere in Kerala.',
  groupFull: 'That’s four already. Remove someone to add another.',
  historyLoad: 'Couldn’t load your past outings.',
  historySave: 'Couldn’t save that. Try again.',
  historyClear: 'Couldn’t clear your history. Try again.',
  link: 'Couldn’t open that link.',
  progressRoutes: 'Working out who drives how far…',
  progressPlaces: 'Looking for somewhere worth the drive…',
};
