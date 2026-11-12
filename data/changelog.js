/* What's new. Newest entry FIRST. version = semver string (also the key for the unseen badge),
   date = ISO YYYY-MM-DD. Item type: feature | update | correction | content.
   Optional per item: href (an in-app '#/...' link) shown as "Open". Add an entry for every release,
   then bump APP_META.version, VERSION in sw.js, and "Latest version" in the footer / README. */
window.APP_CHANGELOG = [
  {
    version: '1.7.0',
    date: '2026-11-13',
    title: "Move people by hand, gender identity, pets and others in the household",
    items: [
      { type: 'feature', text: "Move people: turn it on above the chart and drag a person left or right; the lines follow. “Reset positions” puts everyone back." },
      { type: 'feature', text: "Gender identity: Transgender or Non-binary for any person. The symbol follows the identity, with a small symbol beside it." },
      { type: 'feature', text: "Pets, other relatives and household members who are not related are now drawn, in a row of their own under the family. Join them to someone with a relationship line." },
      { type: 'content', text: "The guide has new notes on same-sex couples, moving people, and others in the household." }
    ]
  },
  {
    version: '1.6.0',
    date: '2026-11-13',
    title: "Years, medical illness, notes, a welcome and a privacy page",
    items: [
      { type: 'feature', text: "Year of birth and year of death for each person, shown under the name (1950–2020)." },
      { type: 'feature', text: "Medical illness: a small cross beside the symbol, separate from the shading for a psychiatric disorder." },
      { type: 'feature', text: "Notes under the genogram: a box above the chart options for the informant, who drew it and a short summary. It is printed below the key." },
      { type: 'feature', text: "A short welcome the first time the app is opened, and a reminder to save a backup file once you have a few genograms." },
      { type: 'content', text: "A Privacy page in the menu: nothing leaves this device, where your genograms are kept, and how to remove them." }
    ]
  },
  {
    version: '1.5.0',
    date: '2026-11-13',
    title: "Clearer charts, a household outline and more relationship lines",
    items: [
      { type: 'update', text: "The age of someone who has died can now be read: it sits on a small plate over the cross." },
      { type: 'update', text: "Crowded rows are tidier: when a row has several curved relationship lines, or also a third or fourth partner, each line gets its own height and the row gets more room." },
      { type: 'feature', text: "Outline the household: a new switch above the chart draws a dashed blue outline around the index person and everyone who lives with them, instead of the small houses." },
      { type: 'feature', text: "Six more relationship lines: hostile, physical abuse, emotional abuse, sexual abuse, neglect and caregiver. The ones with an arrow point at the person harmed or cared for." }
    ]
  },
  {
    version: '1.4.0',
    date: '2026-11-13',
    title: 'Four more sample families',
    items: [
      { type: 'feature', text: 'Sample families on the home screen: five made-up families to open, study and edit. New are the Santos family (a blended family), the Dela Cruz family (an older index person with children and grandchildren), the Villanueva family (substance use, current and former partners) and the Lim family (a family history of psychosis, with great-grandparents and a twin).', href: '#/' },
      { type: 'content', text: 'The new samples use the couple lines added in 1.3.0: nullity, cohabitation, engagement, and committed and casual relationships that ended.' }
    ]
  },
  {
    version: '1.3.0',
    date: '2026-11-13',
    title: 'Many more kinds of couple',
    items: [
      { type: 'feature', text: 'The couple’s relationship now has 25 choices in groups: Married (separated, legal separation, divorce, nullity, widowed), Engaged, Living together, Not living together (committed, casual, temporary, love affair) and Other.' },
      { type: 'feature', text: 'Married couples are joined by a dark line and couples who are not married by a blue line. A small house on the line means they live together; a slash means they have separated. The key under the genogram names each line it uses.', href: '#/symbols' },
      { type: 'update', text: '“Parents’ relationship” and “Index person and current spouse / partner” are now lists instead of four buttons.' },
      { type: 'update', text: 'Genograms made earlier look exactly the same. “Living together” and “Annulled / divorced” on older charts are kept as they are; new entries use Cohabitation, Divorce or Nullity.' },
      { type: 'content', text: 'Symbols and lines shows every new line, and the guide has a new section on couples. The Tagalog for these is a first draft.', href: '#/symbols' }
    ]
  },
  {
    version: '1.2.0',
    date: '2026-11-12',
    title: 'Great-grandparents, four partners and Tagalog',
    items: [
      { type: 'feature', text: 'Great-grandparents: add the grandparent first, then the great-grandfather or great-grandmother and choose whose parent they are.' },
      { type: 'feature', text: 'Up to four partners for each person. The third and fourth are joined by a line that goes over the top, and their children hang from that line.' },
      { type: 'feature', text: 'Tagalog: the forms, the guide and the symbols page now follow the language chosen under About. The chart itself stays in English. The Tagalog is a first draft.', href: '#/about' }
    ]
  },
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
