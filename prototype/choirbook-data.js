// Choirbook demo data. Fictional choir, people and places. Demo "today" is Thursday, October 15, 2026.
const SECTIONS = {
  S: { key: 'S', en: 'Sopranos', fr: 'Sopranos', one: { en: 'Soprano', fr: 'Soprano' } },
  A: { key: 'A', en: 'Altos', fr: 'Altos', one: { en: 'Alto', fr: 'Alto' } },
  T: { key: 'T', en: 'Tenors', fr: 'Ténors', one: { en: 'Tenor', fr: 'Ténor' } },
  B: { key: 'B', en: 'Basses', fr: 'Basses', one: { en: 'Bass', fr: 'Basse' } },
};

const NAMES = {
  S: ['Amara Okafor','Maya Chen','Sophie Gagnon','Lily Nguyen','Zoe Patel','Chloé Roy','Hannah Kowalski','Isla MacDonald','Nora Haddad','Grace Liu','Émilie Côté','Ruby Singh','Leah Friedman','Aanya Sharma','Clara Bouchard','Mia Rossi','Tessa Morin','Jade Wong','Elena Petrov','Freya Lindqvist','Naomi Asante','Juliette Pelletier'],
  A: ['Ella Martin','Priya Nair','Charlotte Lavoie','Imogen Clarke','Sara Haile','Olivia Bergeron','Ayesha Rahman','Camille Dubé','Hazel Park','Lucia Moreno','Rosalie Fortin','Ivy Thompson','Mei Tanaka','Bianca Ferreira','Noor Al-Sayed','Audrey Leblanc','Sienna Walsh','Kiara Williams','Anouk Visser'],
  T: ['Theo Novak','Samuel Osei','Gabriel Lefebvre','Arjun Mehta','Félix Girard','Daniel Kim','Owen Fraser','Mateo Silva','Elliot Brooks','Jonah Weiss'],
  B: ['Lucas Bergeron','Oliver Tremblay','Ethan Wright','Malik Johnson','Nathan Caron','William Zhang','Isaac Mensah',"Liam O'Connor",'Henry Ashworth','Marcus Ibrahim','Adrien Paquette','Kai Yamamoto','Benjamin Hall'],
  U: ['Zara Hussain','Eli Fontaine','Maeve Doyle','Ravi Iyer','Noah Kim'],
};
const SCHOOLS = ['Northfield Secondary','Bayview Collegiate','Hillcrest High School','École secondaire Champlain','St. Mark Catholic High','Westdale Secondary','Linden Park Intermediate','Glenridge Secondary'];
const POST = ['Capital College','Northgate University'];
const G_FIRST = ['Mei','Sandra','Robert','Fatima','Marc','Julie','Kwame','Anne','Hiroshi','Lisa','Ahmed','Nathalie','Paul','Rachel','Viktor','Isabelle','Omar','Karen'];
const FORMS_MISSING = { 'Maya Chen': 'Medical information', 'Ruby Singh': 'Media consent', 'Theo Novak': 'Medical information', 'Malik Johnson': 'Medical information', 'Ivy Thompson': 'Media consent', 'Kai Yamamoto': 'Medical information' };
const FEES_OVERDUE = ['Ethan Wright','Hazel Park','Mateo Silva','Juliette Pelletier'];
const GUARDIAN_OVERRIDE = { 'Ella Martin': 'Daniel Martin', 'Maya Chen': 'Mei Chen', 'Oliver Tremblay': 'Marc Tremblay', 'Priya Nair': 'Anjali Nair', 'Lucas Bergeron': 'Nathalie Bergeron', 'Olivia Bergeron': 'Nathalie Bergeron', 'Noah Kim': 'Hyejin Kim' };
const RELATIONS = ['Mother','Father','Parent','Guardian'];
const REHEARSALS = ['2026-09-10','2026-09-17','2026-09-24','2026-10-01','2026-10-08'];

const slug = (s) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z]+/g, '.').replace(/^\.|\.$/g, '');

let n = 0;
const choristers = [];
for (const sec of ['S','A','T','B','U']) {
  NAMES[sec].forEach((name, j) => {
    const i = n++;
    const last = name.split(' ').slice(1).join(' ');
    const age = 12 + ((i * 7) % 11);
    const inSchool = age <= 17;
    const placed = sec !== 'U';
    const guardian = GUARDIAN_OVERRIDE[name] || `${G_FIRST[(i * 5) % G_FIRST.length]} ${last}`;
    const guardian2 = i % 3 === 0 ? null : `${G_FIRST[(i * 5 + 7) % G_FIRST.length]} ${last}`;
    let recent = ['present','present','present','present','present'];
    if (i % 9 === 4) recent[2] = 'late';
    if (i % 13 === 6) recent[3] = 'excused';
    if (i % 17 === 9) recent[1] = 'absent';
    if (name === 'Lucas Bergeron') recent = ['absent','present','absent','absent','present'];
    if (!placed) recent = [];
    const attended = recent.filter((s) => s === 'present' || s === 'late').length;
    const formsMissing = FORMS_MISSING[name] || null;
    const fees = FEES_OVERDUE.includes(name) ? 'overdue' : (!placed || i % 7 === 3 || name === 'Ella Martin') ? 'due' : 'paid';
    choristers.push({
      id: slug(name), name, first: name.split(' ')[0], last,
      section: placed ? sec : null,
      part: placed ? `${sec}${(j % 2) + 1}` : null,
      years: placed ? Math.max(1, Math.min(age - 11, 1 + ((i * 3) % 6))) : 0,
      age,
      grade: inSchool ? `Grade ${Math.max(7, age - 5)}` : (age <= 19 ? 'College' : 'University'),
      school: inSchool ? SCHOOLS[i % SCHOOLS.length] : POST[i % 2],
      pronouns: (sec === 'T' || sec === 'B') ? (i % 5 === 0 ? 'they/them' : 'he/him') : (i % 7 === 0 ? 'they/them' : 'she/her'),
      email: `${slug(name)}@example.com`,
      phone: `(613) 555-01${String(10 + (i % 89)).padStart(2, '0')}`,
      guardians: [
        { name: guardian, relation: RELATIONS[i % 4], phone: `(613) 555-02${String(10 + (i % 89)).padStart(2, '0')}`, email: `${slug(guardian)}@example.com`, primary: true },
        ...(guardian2 ? [{ name: guardian2, relation: RELATIONS[(i + 1) % 4], phone: `(613) 555-03${String(10 + (i % 89)).padStart(2, '0')}`, email: `${slug(guardian2)}@example.com` }] : []),
      ],
      recent,
      absences: recent.filter((s) => s === 'absent').length,
      rate: recent.length ? Math.round((attended / recent.length) * 100) : null,
      forms: formsMissing ? 'overdue' : 'approved',
      formsMissing,
      fees,
      feeAmount: fees === 'overdue' ? '$390.00 · was due Sep 30' : fees === 'due' ? '$390.00 · due Oct 31' : '$390.00',
      isNew: !placed,
      notes: [],
    });
  });
}
const byId = (id) => choristers.find((c) => c.id === id);
byId('lucas.bergeron').notes = [
  { author: 'Anika Rowe', role: 'Conductor', date: 'Oct 9', text: 'Hockey practice clashes with Thursdays until mid-November. Asked Nathalie for a plan before the dress rehearsal.' },
  { author: 'Claire Dubois', role: 'Administrator', date: 'Oct 1', text: 'Strong sight-reader. Would be a good candidate for bass section leader next season.' },
];
byId('ella.martin').notes = [
  { author: 'Jordan Ellis', role: 'Section leader', date: 'Oct 8', text: 'Holding the A2 line confidently. Offered to buddy with a new alto.' },
];
byId('ella.martin').years = 3;

const placed = choristers.filter((c) => c.section);
const data = {
  sections: SECTIONS,
  sectionCounts: ['S','A','T','B'].map((k) => ({ ...SECTIONS[k], count: placed.filter((c) => c.section === k).length })),
  choirs: [
    { id: 'myc', name: 'Ottawa Regional Youth Choir', shortName: 'ORYC', subtitle: '2026–27 season', theme: 'oryc' },
    { id: 'lcc', name: 'Lakeside Children’s Chorus', shortName: 'LCC', subtitle: '2026–27 season', theme: 'choirbook' },
  ],
  users: {
    staff: { name: 'Claire Dubois', first: 'Claire', role: 'Administrator', email: 'claire.dubois@example.com' },
    guardian: { name: 'Daniel Martin', first: 'Daniel', role: 'Guardian', email: 'daniel.martin@example.com' },
    chorister: { name: 'Ella Martin', first: 'Ella', role: 'Chorister · Alto 2', email: 'ella.martin@example.com' },
  },
  today: '2026-10-15',
  rehearsalDates: REHEARSALS,
  rehearsal: {
    number: 6, date: '2026-10-15', start: '18:30', end: '20:30', callTime: '18:15',
    location: 'Grace Hall', address: '41 Linden Street',
    dress: 'Rehearsal casual. Choir T-shirt for the 8:15 pm group photo.',
    bring: 'Black folder, pencil, water bottle',
    pieces: [
      { title: 'Ubi Caritas', composer: 'Duruflé', note: 'full run' },
      { title: 'Bogoroditse Devo', composer: 'Rachmaninoff', note: 'mm. 1–24' },
    ],
    runningOrder: [
      { time: '6:30', item: 'Warm-up and vocalises', who: 'Full choir' },
      { time: '6:45', item: 'Ubi Caritas', who: 'Full choir' },
      { time: '7:10', item: 'Sectionals', who: 'S/A in the hall · T/B in Room 2' },
      { time: '7:40', item: 'Break', who: '' },
      { time: '7:50', item: 'Bogoroditse Devo', who: 'Full choir' },
      { time: '8:15', item: 'Group photo', who: 'Choir T-shirts' },
      { time: '8:20', item: 'Announcements', who: 'Claire Dubois' },
    ],
  },
  reportedAbsences: [
    { id: 'maya.chen', reason: 'Sick', by: 'Mei Chen', when: 'Today, 9:12 a.m.' },
    { id: 'oliver.tremblay', reason: 'Family travel', by: 'Marc Tremblay', when: 'Oct 12' },
    { id: 'priya.nair', reason: 'School exam', by: 'Anjali Nair', when: 'Oct 13' },
  ],
  stats: { placed: placed.length, unplaced: choristers.length - placed.length, total: choristers.length, attendanceRate: 91, attendanceDelta: '+1 pt', threshold: 3, formsMissing: 6, feesOverdue: 4, feesOverdueTotal: '$1,560' },
  choristers,
  repertoire: [
    { id: 'ubi', title: 'Ubi Caritas', composer: 'Maurice Duruflé', voicing: 'SATB', language: 'Latin', duration: '2:34', seconds: 154, scoreSize: '0.8 MB' },
    { id: 'bogo', title: 'Bogoroditse Devo', composer: 'Sergei Rachmaninoff', voicing: 'SATB divisi', language: 'Church Slavonic', duration: '3:16', seconds: 196, scoreSize: '1.1 MB', due: 'Nov 26' },
    { id: 'seal', title: 'The Seal Lullaby', composer: 'Eric Whitacre', voicing: 'SATB', language: 'English', duration: '3:52', seconds: 232, scoreSize: '1.6 MB' },
    { id: 'swallow', title: 'She’s Like the Swallow', composer: 'Newfoundland folk song', arranger: 'M. Lavoie', voicing: 'SATB', language: 'English', duration: '3:25', seconds: 205, scoreSize: '0.9 MB' },
    { id: 'winter', title: 'Winter Light', composer: 'Anna Whitfield', voicing: 'SSAATB', language: 'English', duration: '4:28', seconds: 268, scoreSize: '2.3 MB', due: 'Dec 3' },
  ],
  practice: { pieceId: 'bogo', piece: 'Bogoroditse Devo', composer: 'Sergei Rachmaninoff', bars: 'mm. 1–24', text: 'Learn mm. 1–24 from memory. Watch the crescendo at m. 17 and keep the vowels tall.', from: 'Anika Rowe', due: 'Thursday, October 22' },
  concerts: [
    { id: 'c1', type: 'concert', title: 'Winter Light', date: '2026-12-12', start: '19:00', end: '21:00', location: 'Holy Trinity Church, 120 Oak Avenue', call: '5:45 p.m.', dress: 'Concert blacks with choir scarf' },
    { id: 'c2', type: 'concert', title: 'Songs of the River', date: '2027-05-15', start: '14:30', end: '16:30', location: 'Riverside Arts Centre, 8 Quay Road', call: '1:15 p.m.', dress: 'Concert blacks with a spring colour accent' },
  ],
  guardianChildren: [
    {
      id: 'ella', choirId: 'myc', first: 'Ella', name: 'Ella Martin', part: 'A2',
      next: { when: { en: 'Tonight', fr: 'Ce soir' }, date: '2026-10-15', start: '18:30', end: '20:30', callTime: '18:15', location: 'Grace Hall', address: '41 Linden Street', bring: 'Black folder, pencil, water bottle, choir T-shirt for the group photo', countdown: { en: 'Starts in 2 h 10 min', fr: 'Dans 2 h 10' }, pieces: [{ title: 'Bogoroditse Devo', composer: 'Rachmaninoff', note: 'practise mm. 1–24 this week' }] },
      todo: [
        { id: 'permission', kind: 'form', icon: 'signature', title: 'Winter Light permission form', detail: 'Due Monday, November 30', action: 'Sign form' },
        { id: 'fee', kind: 'fee', icon: 'receipt', title: 'Annual fee 2026–27', detail: '$390.00 · due Saturday, October 31', action: 'Pay $390' },
      ],
      announcements: [
        { id: 1, title: 'Group photo this Thursday', author: 'Anika Rowe', role: 'Conductor', date: 'Oct 13', unread: true, body: 'Please wear your choir T-shirt on October 15. The photo is at 8:15 pm, right after the break, and takes about five minutes.' },
        { id: 2, title: 'Winter Light tickets are on sale', author: 'Claire Dubois', role: 'Administrator', date: 'Oct 9', body: 'Family tickets are $15 and choristers are free. Each family can reserve up to six seats until November 20.' },
        { id: 3, title: 'Carpool sign-up for the dress rehearsal', author: 'Claire Dubois', role: 'Administrator', date: 'Oct 2', requiresAck: true, ackDue: 'Nov 27', body: 'If you can drive from Grace Hall to Holy Trinity Church on December 11, add your name to the sign-up sheet by November 27.' },
      ],
      events: [
        { id: 'e1', type: 'rehearsal', title: 'Weekly rehearsal', date: '2026-10-22', start: '18:30', end: '20:30', location: 'Grace Hall' },
        { id: 'e2', type: 'sectional', title: 'Sectional workshop', date: '2026-11-07', start: '10:00', end: '13:00', location: 'Grace Hall' },
        { id: 'e3', type: 'rehearsal', title: 'Dress rehearsal', date: '2026-12-11', start: '17:30', end: '20:30', location: 'Holy Trinity Church' },
        { id: 'e4', type: 'concert', title: 'Winter Light', date: '2026-12-12', start: '19:00', end: '21:00', location: 'Holy Trinity Church', note: 'Call time 5:45 p.m.' },
        { id: 'e5', type: 'concert', title: 'Songs of the River', date: '2027-05-15', start: '14:30', end: '16:30', location: 'Riverside Arts Centre', note: 'Call time 1:15 p.m.' },
      ],
      absenceDates: [
        { id: '2026-10-15', label: 'Thu, Oct 15 · tonight' }, { id: '2026-10-22', label: 'Thu, Oct 22' }, { id: '2026-10-29', label: 'Thu, Oct 29' }, { id: '2026-11-05', label: 'Thu, Nov 5' }, { id: '2026-11-07', label: 'Sat, Nov 7 · workshop' },
      ],
    },
    {
      id: 'sam', choirId: 'lcc', first: 'Sam', name: 'Sam Martin', part: null,
      next: { when: { en: 'Tuesday', fr: 'Mardi' }, date: '2026-10-20', start: '16:30', end: '17:45', callTime: '16:20', location: 'Lakeside Community Centre', address: '300 Shore Drive', bring: 'Blue folder, water bottle', countdown: null, pieces: [{ title: 'Land of the Silver Birch', composer: 'trad.', note: 'verse 2' }] },
      todo: [],
      announcements: [
        { id: 4, title: 'Snack schedule for November', author: 'Ruth Okonkwo', role: 'Director', date: 'Oct 10', body: 'Thanks to everyone who signed up for snacks. The November schedule is on the calendar.' },
      ],
      events: [
        { id: 's1', type: 'rehearsal', title: 'Weekly rehearsal', date: '2026-10-20', start: '16:30', end: '17:45', location: 'Lakeside Community Centre' },
        { id: 's2', type: 'concert', title: 'Holiday sing-along', date: '2026-12-05', start: '11:00', end: '12:00', location: 'Lakeside Library' },
      ],
      absenceDates: [{ id: '2026-10-20', label: 'Tue, Oct 20' }, { id: '2026-10-27', label: 'Tue, Oct 27' }, { id: '2026-11-03', label: 'Tue, Nov 3' }],
    },
  ],
  i18n: {
    en: {
      home: 'Home', today: 'Today', roster: 'Roster', calendar: 'Calendar', attendance: 'Attendance', music: 'Music', comms: 'Communications', formsFees: 'Forms & fees', users: 'Users & permissions', reports: 'Reports', messages: 'Messages', profile: 'Profile',
      secChoir: 'Choir', secOffice: 'Office', secAdmin: 'Admin',
      mainNav: 'Main', openMenu: 'Open menu', switchChoir: 'Switch choir', notifications: 'Notifications', search: 'Search', searchPh: 'Search choristers, music, events',
      takeAttendance: 'Take attendance', sendAnnouncement: 'Send announcement', addEvent: 'Add event', reportAbsence: 'Report an absence', submitAttendance: 'Submit attendance', addToCalendar: 'Add to calendar', added: 'Added',
      notDesigned: 'Not part of this design round', notDesignedBody: 'This area is planned but not designed yet. The other screens show how it will connect.', backHome: 'Back to home',
    },
    fr: {
      home: 'Accueil', today: 'Aujourd’hui', roster: 'Choristes', calendar: 'Calendrier', attendance: 'Présences', music: 'Musique', comms: 'Communications', formsFees: 'Formulaires et frais', users: 'Utilisateurs et autorisations', reports: 'Rapports', messages: 'Messages', profile: 'Profil',
      secChoir: 'Chœur', secOffice: 'Bureau', secAdmin: 'Administration',
      mainNav: 'Principal', openMenu: 'Ouvrir le menu', switchChoir: 'Changer de chœur', notifications: 'Notifications', search: 'Rechercher', searchPh: 'Rechercher choristes, musique, événements',
      takeAttendance: 'Prendre les présences', sendAnnouncement: 'Envoyer une annonce', addEvent: 'Ajouter un événement', reportAbsence: 'Signaler une absence', submitAttendance: 'Soumettre les présences', addToCalendar: 'Ajouter au calendrier', added: 'Ajouté',
      notDesigned: 'Hors de cette maquette', notDesignedBody: 'Cette section est prévue mais pas encore conçue.', backHome: 'Retour à l’accueil',
    },
  },
};

// Season calendar
const iso = (d) => d.toISOString().slice(0, 10);
const events = [];
const SKIP = ['2026-12-24', '2026-12-31', '2027-03-18'];
let rn = 0;
for (let d = new Date('2026-09-10T12:00:00Z'); d <= new Date('2027-05-13T12:00:00Z'); d.setUTCDate(d.getUTCDate() + 7)) {
  const id = iso(d);
  if (SKIP.includes(id) || id === '2026-12-17') continue;
  rn++;
  events.push({ id: 'r' + id, type: 'rehearsal', title: `Rehearsal ${rn}`, date: id, start: '18:30', end: '20:30', location: 'Grace Hall' });
}
events.push(
  { id: 'sec-tb', type: 'sectional', title: 'Tenor and bass sectional', date: '2026-10-24', start: '10:00', end: '11:30', location: 'Grace Hall, Room 2', parts: ['T', 'B'] },
  { id: 'workshop', type: 'sectional', title: 'Sectional workshop', date: '2026-11-07', start: '10:00', end: '13:00', location: 'Grace Hall' },
  { id: 'sec-sa', type: 'sectional', title: 'Soprano and alto sectional', date: '2026-11-14', start: '10:00', end: '11:30', location: 'Grace Hall', parts: ['S', 'A'] },
  { id: 'fee-due', type: 'deadline', title: 'Annual fee due', date: '2026-10-31' },
  { id: 'perm-due', type: 'deadline', title: 'Winter Light permission forms due', date: '2026-11-30' },
  { id: 'dress', type: 'rehearsal', title: 'Dress rehearsal', date: '2026-12-11', start: '17:30', end: '20:30', location: 'Holy Trinity Church' },
  { id: 'c1', type: 'concert', title: 'Winter Light', date: '2026-12-12', start: '19:00', end: '21:00', location: 'Holy Trinity Church' },
  { id: 'party', type: 'social', title: 'Holiday party', date: '2026-12-17', start: '18:30', end: '20:30', location: 'Grace Hall' },
  { id: 'c2', type: 'concert', title: 'Songs of the River', date: '2027-05-15', start: '14:30', end: '16:30', location: 'Riverside Arts Centre' },
);
events.sort((a, b) => (a.date + (a.start || '')).localeCompare(b.date + (b.start || '')));
data.events = events;
data.now = '16:20';

data.areas = [
  { id: 'roster', label: 'Roster', hint: 'Names, sections, contact details' },
  { id: 'care', label: 'Medical and care notes', hint: 'Allergies, medication, care plans' },
  { id: 'calendar', label: 'Calendar', hint: 'Rehearsals, concerts, deadlines' },
  { id: 'attendance', label: 'Attendance', hint: 'Check-in and history' },
  { id: 'music', label: 'Music library', hint: 'Scores, tracks, practice assignments' },
  { id: 'announcements', label: 'Announcements', hint: 'Send to families and choristers' },
  { id: 'inbox', label: 'Office inbox', hint: 'Messages from guardians and choristers' },
  { id: 'monthly', label: 'Monthly updates', hint: 'Family update emails' },
  { id: 'forms', label: 'Forms', hint: 'Build forms, see responses' },
  { id: 'fees', label: 'Fees and payments', hint: 'Amounts, payments, receipts' },
  { id: 'tickets', label: 'Tickets', hint: 'Concert sales, orders, refunds' },
  { id: 'reports', label: 'Reports', hint: 'Attendance, fees and enrolment' },
  { id: 'users', label: 'Users and permissions', hint: 'Invite staff, edit roles' },
];
const all = (v) => Object.fromEntries(data.areas.map((a) => [a.id, v]));
data.roles = [
  { id: 'admin', name: 'Administrator', description: 'Runs the choir office. Full access to everything.', locked: true, perms: all('edit') },
  { id: 'conductor', name: 'Conductor', description: 'Artistic lead. Manages music, calendar and attendance.', perms: { ...all('view'), music: 'edit', calendar: 'edit', attendance: 'edit', announcements: 'edit', inbox: 'edit', monthly: 'edit', fees: 'none', users: 'none' } },
  { id: 'section', name: 'Section leader', description: 'Takes attendance and supports one section.', perms: { ...all('none'), roster: 'view', calendar: 'view', attendance: 'edit', music: 'view', inbox: 'view' } },
  { id: 'chaperone', name: 'Chaperone', description: 'Supervises at rehearsals, concerts and trips.', perms: { ...all('none'), roster: 'view', care: 'view', calendar: 'view', attendance: 'edit' } },
  { id: 'treasurer', name: 'Treasurer', description: 'Board member who looks after fees.', custom: true, perms: { ...all('none'), roster: 'view', fees: 'edit', tickets: 'edit', reports: 'view' } },
  { id: 'accompanist', name: 'Accompanist', description: 'Plays for rehearsals.', custom: true, perms: { ...all('none'), calendar: 'view', music: 'view' } },
];
data.staff = [
  { id: 'u1', name: 'Claire Dubois', email: 'claire.dubois@example.com', role: 'admin', status: 'active', last: 'Today, 9:40 a.m.' },
  { id: 'u2', name: 'Anika Rowe', email: 'anika.rowe@example.com', role: 'conductor', status: 'active', last: 'Today, 2:15 p.m.' },
  { id: 'u3', name: 'Jordan Ellis', email: 'jordan.ellis@example.com', role: 'section', scope: 'Altos', status: 'active', last: 'Oct 14' },
  { id: 'u4', name: 'Marcus Lee', email: 'marcus.lee@example.com', role: 'section', scope: 'Basses', status: 'active', last: 'Oct 13' },
  { id: 'u5', name: 'Sofia Reyes', email: 'sofia.reyes@example.com', role: 'section', scope: 'Sopranos', status: 'active', last: 'Oct 8' },
  { id: 'u6', name: 'Ruth Campbell', email: 'ruth.campbell@example.com', role: 'chaperone', status: 'active', last: 'Oct 8' },
  { id: 'u7', name: 'Tom Okafor', email: 'tom.okafor@example.com', role: 'chaperone', status: 'invited', last: 'Invited Oct 12' },
  { id: 'u8', name: 'Helen Ng', email: 'helen.ng@example.com', role: 'treasurer', status: 'active', last: 'Oct 10' },
  { id: 'u9', name: 'Priya Desai', email: 'priya.desai@example.com', role: 'accompanist', status: 'active', last: 'Sep 30' },
];

const total = choristers.length;
data.forms = [
  { id: 'perm', title: 'Winter Light permission form', kind: 'Permission', due: 'Nov 30', status: 'open', done: 22, total, signature: true, fields: ['Chorister attending dress rehearsal and concert', 'Pick-up person', 'Guardian signature'] },
  { id: 'medical', title: 'Medical information 2026–27', kind: 'Medical', due: 'Sep 30', status: 'overdue', done: total - 4, total, signature: true, fields: ['Allergies', 'Medication', 'Health card number', 'Guardian signature'] },
  { id: 'media', title: 'Photo and video consent', kind: 'Consent', due: 'Sep 30', status: 'overdue', done: total - 2, total, signature: true, fields: ['Consent choice', 'Guardian signature'] },
  { id: 'reg', title: 'Registration 2026–27', kind: 'Registration', due: 'Sep 10', status: 'closed', done: total, total, fields: ['Chorister details', 'Guardian details', 'Emergency contact'] },
  { id: 'conduct', title: 'Code of conduct', kind: 'Agreement', due: 'Sep 10', status: 'closed', done: total, total, signature: true, fields: ['Chorister agreement', 'Guardian signature'] },
];

data.threads = [
  { id: 't1', subject: 'Maya’s inhaler', topic: 'Medical', from: 'Mei Chen', fromRole: 'guardian', about: 'Maya Chen', assignee: null, status: 'open', unread: true, updated: 'Today, 9:20 a.m.',
    messages: [{ from: 'Mei Chen', role: 'guardian', at: 'Today, 9:20 a.m.', text: 'Maya is home sick tonight. When she is back next week she will have a new inhaler. Can a chaperone keep a spare in the first-aid kit?' }] },
  { id: 't2', subject: 'Lucas and hockey practice', topic: 'Attendance', from: 'Nathalie Bergeron', fromRole: 'guardian', about: 'Lucas Bergeron', assignee: 'Anika Rowe', status: 'open', unread: false, updated: 'Oct 13',
    messages: [
      { from: 'Nathalie Bergeron', role: 'guardian', at: 'Oct 12, 8:05 p.m.', text: 'Lucas’s hockey practices move to Thursdays until mid-November. He really wants to sing in Winter Light. Is there a way to make it work?' },
      { from: 'Anika Rowe', role: 'staff', at: 'Oct 13, 10:30 a.m.', text: 'Thanks for telling us early. If he can come to the T/B sectional on Oct 24 and the Nov 7 workshop, he can catch up on the parts he misses.' },
    ] },
  { id: 't3', subject: 'Carpool for the dress rehearsal', topic: 'Events', from: 'Marc Tremblay', fromRole: 'guardian', about: 'Oliver Tremblay', assignee: 'Claire Dubois', status: 'open', unread: false, updated: 'Oct 11',
    messages: [{ from: 'Marc Tremblay', role: 'guardian', at: 'Oct 11, 6:42 p.m.', text: 'I can drive four choristers from Grace Hall to Holy Trinity on December 11. Where do I sign up?' }] },
  { id: 't4', subject: 'Alto 2 track for Winter Light', topic: 'Music', from: 'Ella Martin', fromRole: 'chorister', about: 'Ella Martin', assignee: 'Jordan Ellis', status: 'resolved', unread: false, updated: 'Oct 9',
    messages: [
      { from: 'Ella Martin', role: 'chorister', at: 'Oct 8, 9:10 p.m.', text: 'Is there a separate alto 2 learning track for Winter Light? The divisi in bar 30 is hard to hear on the full alto track.' },
      { from: 'Jordan Ellis', role: 'staff', at: 'Oct 9, 4:00 p.m.', text: 'Good catch. Anika recorded one today. It is in the music library under Winter Light now.' },
    ] },
  { id: 't5', subject: 'Fee receipt for taxes', topic: 'Fees', from: 'Daniel Martin', fromRole: 'guardian', about: 'Ella Martin', assignee: 'Claire Dubois', status: 'resolved', unread: false, updated: 'Oct 2',
    messages: [
      { from: 'Daniel Martin', role: 'guardian', at: 'Oct 1, 7:30 p.m.', text: 'Could I get an official receipt for last season’s fee for my taxes?' },
      { from: 'Claire Dubois', role: 'staff', at: 'Oct 2, 9:15 a.m.', text: 'Here it is. You can also download receipts any time from Forms and fees.' },
    ] },
  { id: 't6', subject: 'Question about the first rehearsal', topic: 'General', from: 'Hyejin Kim', fromRole: 'guardian', about: 'Noah Kim', assignee: null, status: 'open', unread: true, updated: 'Yesterday',
    messages: [{ from: 'Hyejin Kim', role: 'guardian', at: 'Yesterday, 8:48 p.m.', text: 'Noah starts next Thursday. Should he bring anything, and where do parents wait during rehearsal?' }] },
  { id: 't7', subject: 'Pick-up after the dress rehearsal', topic: 'Events', from: 'Daniel Martin', fromRole: 'guardian', about: 'Ella Martin', assignee: 'Claire Dubois', status: 'open', unread: false, updated: 'Oct 14',
    messages: [
      { from: 'Daniel Martin', role: 'guardian', at: 'Oct 14, 7:02 p.m.', text: 'Ella’s grandmother will pick her up after the dress rehearsal on December 11. Do I need to add her somewhere?' },
      { from: 'Claire Dubois', role: 'staff', at: 'Oct 14, 8:20 p.m.', text: 'Yes, please add her as the pick-up person on the Winter Light permission form. Chaperones check that list at the door.' },
    ] },
];

data.announcementsSent = [
  { id: 1, title: 'Group photo this Thursday', audience: 'Everyone', author: 'Anika Rowe', date: 'Oct 13', read: 118, total: 160 },
  { id: 2, title: 'Winter Light tickets are on sale', audience: 'Guardians', author: 'Claire Dubois', date: 'Oct 9', read: 84, total: 91 },
  { id: 3, title: 'Carpool sign-up for the dress rehearsal', audience: 'Guardians', author: 'Claire Dubois', date: 'Oct 2', read: 79, total: 91, ack: 41 },
  { id: 4, title: 'Tenor and bass sectional on October 24', audience: 'Tenors and basses', author: 'Anika Rowe', date: 'Sep 29', read: 38, total: 46 },
];
data.announcementsScheduled = [
  { id: 5, title: 'Permission forms due in one week', audience: 'Guardians', author: 'Claire Dubois', date: 'Scheduled for Nov 23, 9:00 a.m.' },
];

data.monthly = {
  month: 'October 2026', sendDate: 'Saturday, October 31', sendDay: '31', mode: 'review',
  conductorNote: 'October has been a big month. The choir is singing Ubi Caritas from memory, and the Rachmaninoff is starting to glow. Please keep encouraging ten minutes of practice a day with the learning tracks.',
  freeText: 'Winter Light tickets are on sale until November 20. Choristers are free; family tickets are $15.',
  photos: ['Group photo, Oct 15', 'Sectional, Oct 1', 'Warm-up, Sep 24'],
  history: [{ month: 'September 2026', sent: 'Oct 1, 9:00 a.m.', families: 69, opened: 61 }],
};

export default data;
