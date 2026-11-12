/* What's new. Newest entry FIRST. version = semver string (also the key for the unseen badge),
   date = ISO YYYY-MM-DD. Item type: feature | update | correction | content.
   Optional per item: href (an in-app '#/...' link) shown as "Open". Add an entry for every release,
   then bump APP_META.version, VERSION in sw.js, and "Latest version" in the footer / README. */
window.APP_CHANGELOG = [
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
