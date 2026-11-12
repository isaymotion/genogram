/* What's new. Newest entry FIRST. version = semver string (also the key for the unseen badge),
   date = ISO YYYY-MM-DD. Item type: feature | update | correction | content.
   Optional per item: href (an in-app '#/...' link) shown as "Open". Add an entry for every release,
   then bump APP_META.version, VERSION in sw.js, and "Latest version" in the footer / README. */
window.APP_CHANGELOG = [
  {
    version: '1.1.0',
    date: '2026-11-12',
    title: 'More symbols, undo, zoom and a passcode lock',
    items: [
      { type: 'feature', text: 'Cousins: add an aunt or uncle, then their children. Paternal cousins are drawn on the left, maternal cousins on the right.' },
      { type: 'feature', text: 'Adopted and foster children: a dashed or dotted line down to the child.' },
      { type: 'feature', text: 'Pregnancies and losses: current pregnancy, miscarriage, abortion and stillbirth each have their own symbol.', href: '#/symbols' },
      { type: 'feature', text: 'Substance use disorder: its own switch, drawn as a dark lower half. “Psychiatric disorder” keeps the shaded symbol, and the two can be combined.' },
      { type: 'feature', text: 'Undo: takes back the last change while editing, one step at a time. A deleted genogram can be brought back from the message that appears.' },
      { type: 'feature', text: 'The chart: tap a person to open their card. Pinch, or use + and −, to zoom, then drag to move around.' },
      { type: 'feature', text: 'Initials only: one switch above the chart shortens every name on it, in the picture and the PDF too.' },
      { type: 'feature', text: 'Share file: save one genogram as a file for a colleague, who opens it with “Open a genogram file”. PsychInterview can open it too.' },
      { type: 'feature', text: 'Passcode lock: under About. It closes the app to someone who picks up your phone; it does not encrypt what is saved.', href: '#/about' },
      { type: 'update', text: 'Fonts: now part of the app, so nothing at all is fetched from another site.' }
    ]
  },
  {
    version: '1.0.1',
    date: '2026-11-12',
    title: 'Clearer wording',
    items: [
      { type: 'update', text: '“How many” is now “Number of people (if a group)”, with a note to leave it empty for one person.' }
    ]
  },
  {
    version: '1.0.0',
    date: '2026-11-12',
    title: 'First release',
    items: [
      { type: 'feature', text: 'Make a family genogram in three steps: add the family, mark how people relate, and see the chart.', href: '#/' },
      { type: 'feature', text: 'One-tap adding of parents, siblings, partners and children; step-parents, half-siblings, former partners, nephews and nieces, grandchildren, grandparents, aunts and uncles under “Someone else”.' },
      { type: 'feature', text: 'Siblings and children are placed oldest to youngest automatically. Twins, and one symbol for several people (×5).' },
      { type: 'feature', text: 'Relationship lines: close, very close, distant, conflictual, close but conflictual, cut off, abusive toward.' },
      { type: 'feature', text: 'Save the genogram as a picture or a one-page PDF, made on the device.' },
      { type: 'feature', text: 'Symbols and lines: what every shape and line means.', href: '#/symbols' },
      { type: 'feature', text: 'Search, text size, light and dark theme, and backup of your genograms.' }
    ]
  }
];
