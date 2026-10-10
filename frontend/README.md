# Frontend editing guide

All React Native / web UI files live here. The same app runs in Expo Go and the
browser; Expo automatically picks `MeetingMap.web.js` on web and `MeetingMap.js`
on phones.

```
frontend/
├── index.js                  Expo entry point; registers App.js
├── App.js                    Wraps the app in SafeAreaProvider
├── theme/index.js            Colours (C), fonts (F), corner radii (R), shared text styles (T)
├── messages.js               Friendly wording for errors and loading text
├── assets/fonts/             Barlow Condensed (all text), Big Shoulders Bold (logo)
├── hooks/
│   └── useMeetingPlanner.js  All trip state + actions (friends, search, history, dialogs)
├── screens/
│   └── MeetingScreen.js      Page layout: header, planner panel, map, dialogs
├── components/
│   ├── common/               Reusable pieces: Button, Label, Icon, Dialog, ErrorMessage, Notice
│   ├── layout/AppHeader.js   Top bar with logo and "How it works"
│   ├── map/                  MapPanel (overlays), MeetingMap.web.js (browser), MeetingMap.js + mapPage.js (phones: same map in a WebView)
│   ├── planner/              PlannerPanel, IntroHero (tagline), RoutingKeyNotice
│   ├── friends/              FriendList, FriendRow, EmptyFriends
│   ├── preferences/          OutingPreferences, Choice chip
│   ├── results/              OutingResults, JourneyBars, Alternatives, NearbyPlaces, Attractions
│   ├── search/               LocationSearch
│   └── dialogs/              LocationDialog, AboutDialog, SetupDialog
└── styles/
    ├── map.css               Web map colours, markers, labels and controls
    └── map-style.json        OpenFreeMap basemap style
```

Where to look:

- **Change behaviour** (what happens when you add a friend, run a search, save an
  outing): `hooks/useMeetingPlanner.js`. Components contain no planning logic.
- **Change how something looks**: open that component; its styles are in the
  `StyleSheet.create(...)` block at the bottom of the same file.
- **Change app colours or fonts**: `theme/index.js`.
- **Change error or loading wording**: `messages.js`.

Look and feel: thin condensed type everywhere (Barlow Condensed), the FAIRPOINT
logo in Big Shoulders Bold, and small spaced-out uppercase labels. Anything you press is a
pill with a 1px black border; selected options turn lime. With custom fonts, set
`fontFamily: F.medium` (etc.) rather than `fontWeight`, so Android renders it.

Run commands from the **project root**, one level above this folder:

```powershell
npm.cmd run web
# Or run on Expo Go:
npm.cmd start
```

Project configuration (`package.json`, `app.json`, `.env`) remains at the root.
Shared planning/search logic is in `../lib/`, datasets in `../data/`, import tools
in `../scripts/`, and checks in `../tests/`. There is no separate backend server.
