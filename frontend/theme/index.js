// Design tokens. Change these to restyle the whole app.

// Colours: light, high-contrast, one green accent and one highlight.
export const C = {
  ink: '#141414',      // main text, borders, primary buttons
  muted: '#55584f',    // secondary text (still easy to read)
  faint: '#8b8d85',    // small hints only
  paper: '#f6f5f0',    // page background
  card: '#ffffff',     // inputs, rows, cards
  line: '#d9d8d0',     // soft dividers
  green: '#0e6b4e',    // accent: selected spot, links
  lime: '#dcf25e',     // highlight: selected chips
  sand: '#f1ebd9',     // gentle notices
};

// Fonts (loaded in App.js). On custom fonts, pick a family instead of fontWeight.
export const F = {
  logo: 'BigShouldersDisplay_700Bold',    // FAIRPOINT only
  display: 'BarlowCondensed_300Light',    // big thin headings
  body: 'BarlowCondensed_400Regular',     // most text
  medium: 'BarlowCondensed_500Medium',    // names, buttons
  bold: 'BarlowCondensed_600SemiBold',    // numbers, emphasis
};

export const FONT_FILES = {
  [F.logo]: require('../assets/fonts/BigShouldersDisplay_700Bold.ttf'),
  [F.display]: require('../assets/fonts/BarlowCondensed_300Light.ttf'),
  [F.body]: require('../assets/fonts/BarlowCondensed_400Regular.ttf'),
  [F.medium]: require('../assets/fonts/BarlowCondensed_500Medium.ttf'),
  [F.bold]: require('../assets/fonts/BarlowCondensed_600SemiBold.ttf'),
};

// Pills for anything you press, softly rounded cards for content.
export const R = { pill: 999, card: 14 };

// Shared text styles.
export const T = {
  label: { fontFamily: F.medium, fontSize: 15, letterSpacing: 1.6, color: C.ink, textTransform: 'uppercase' },
  body: { fontFamily: F.body, fontSize: 17, lineHeight: 23, color: C.ink },
  small: { fontFamily: F.body, fontSize: 15, lineHeight: 20, color: C.muted },
};
