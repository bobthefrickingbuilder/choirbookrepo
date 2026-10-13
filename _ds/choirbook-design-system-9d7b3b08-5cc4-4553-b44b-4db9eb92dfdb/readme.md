# Choirbook Design System

Choirbook is a web app for running youth and community choirs. Staff (administrators, conductors, section leaders, chaperones), guardians and choristers aged roughly 12–22 all use it. The first choir on it is the **Ottawa Regional Youth Choir (ORYC)**; others will follow, each with its own theme layer.

**Concept.** A Renaissance choirbook was one large book that the whole choir sang from. Choirbook is that shared book for a modern choir: the one place everyone works from. The heritage shows in three restrained choices: warm paper surfaces, ink-dark text, and a single rubric-red accent, the red scribes used to mark important text. It is contemporary software. There are no parchment textures, no blackletter and no ornament.

## Sources

There was no codebase, Figma file, logo or existing brand. Everything here was built from the written brief.
- Fonts: **Newsreader** and **Hanken Grotesk** from Google Fonts (OFL), self-hosted in `assets/fonts/`, latin and latin-ext subsets.
- Icons: **Lucide** (`lucide-static@0.460.0`, ISC licence). The SVGs were copied into `assets/icons/` and their paths are inlined in `components/icons/Icon.jsx`.
- ORYC: there was **no logo and no brand colour**. The UI uses a monogram tile, and `#3A8FD9` is a **placeholder** brand colour (`tokens/themes.css`).

## Index

| Path | What |
|---|---|
| `styles.css` | Entry point. Contains only `@import`s: tokens, then component CSS |
| `tokens/` | `fonts.css`, `colors.css` (light + `[data-mode="dark"]`), `typography.css` (plus `.cb-h1…` utilities), `spacing.css` (space, radius, shadow, motion, layout, breakpoints, z-index), `themes.css` (choir layers), `base.css` (element defaults, reduced motion) |
| `components/<group>/` | `Name.jsx` + `Name.d.ts` + `Name.prompt.md`, the group's CSS file, and one `*.card.html` |
| `guidelines/` | Foundation specimen cards (Colors, Type, Spacing, Theming, Brand) |
| `ui_kits/choirbook-app/` | Click-through recreation of the product, plus `themes.html` (base vs ORYC) |
| `assets/` | `fonts/`, `icons/` (Lucide SVGs) |
| `SKILL.md` | Agent-skill entry point |

### Components
- **brand**: Wordmark, BrandMark, PoweredBy, ChoirLogo
- **icons**: Icon (`ICON_NAMES`)
- **buttons**: Button, IconButton, TextLink
- **forms**: Field, TextInput, Select, Checkbox, Radio, RadioGroup, Toggle, DatePicker, TimePicker, SearchField
- **navigation**: AppHeader, ChoirSwitcher, UserMenu, Sidebar, BottomNav, SegmentedControl
- **badges**: Badge, VoicePartBadge, AttendanceBadge, FormStatusBadge, FeeStatusBadge, Chip (`ATTENDANCE`, `FORM_STATUS`, `FEE_STATUS`, `VOICE_PARTS`)
- **cards**: Card, EventCard, DateLeaf, NextRehearsalCard, AlertCard, StatCard (`EVENT_TYPES`)
- **data**: DataTable
- **attendance**: CheckInRow
- **people**: Avatar, ChoristerProfile
- **comms**: AnnouncementItem
- **music**: MusicItem, AudioPlayer
- **formlayout**: Stepper, FormSection, FormRow, FormActions, ConsentSignature
- **feedback**: EmptyState, Skeleton, Spinner, Toast, ToastStack
- **overlays**: Popover, MenuItem, Modal, ConfirmDialog, SideSheet
- **calendar**: MonthCalendar, WeekCalendar, AgendaList, CalendarBar

**Intentional additions** (not named in the brief, needed to build what it asked for): Icon (wraps the glyph set); Field (shared label, hint and error); Popover and MenuItem (used by the switcher, user menu and pickers); SideSheet (the base for the profile panel); Avatar; SegmentedControl (switches calendar views); Card and Badge (the bases for the named cards and badges); DateLeaf and CalendarBar (shared by the cards and calendars); FormRow and FormActions (form layout); Spinner and ToastStack (loading and toast hosting).

### UI kit
`ui_kits/choirbook-app/index.html` covers: staff **Today** dashboard, **tablet attendance check-in**, **choristers roster** with profile sheet, **calendar** (month, week, list) with event modal and cancel confirmation, **music**, **guardian phone** home with an absence report, **multi-step registration** with e-signature, and **sign-in**. Switch choir in the header (ORYC or a base-theme choir), language and light/dark in the user menu, and views in the bottom-left Prototype bar. `themes.html` shows the same page in both themes.

---

## Content fundamentals

**Voice.** Calm, plain and specific, like a well-run choir office. It is credible to parents and boards and doesn't talk down to a 13-year-old. It is never cute.

- **Person.** Address the reader as *you*. The product doesn't speak as *I*, but it does say *we* for the choir or office ("We'll remind you on 1 November").
- **Casing.** Sentence case everywhere: buttons, titles, nav and badges. Overlines are the only uppercase text, and they use letter-spacing instead.
- **Buttons** start with a verb and name the object: "Take attendance", "Send reminder", "Report an absence", "Cancel rehearsal". Never "OK", "Yes" or "Submit" alone.
- **Confirmations** say what happens and who is affected: "64 choristers and 71 guardians will be notified." The confirm button repeats the verb.
- **Toasts** use the past tense and are specific: "Reminder sent to 9 guardians", not "Success!".
- **Errors** say how to fix the problem: "Enter an email like name@example.com", not "Invalid input".
- **Empty states** say what will appear and how to get it, in one sentence, with no jokes.
- **Dates and times** are always absolute and localised: "Wednesday, October 14 · 6:30–9:00 p.m."; in French, "mercredi 14 octobre · 18 h 30". Relative words are fine for the near term ("Tonight", "Starts in 50 min").
- **Names of people** come first and in full in staff views ("Amélie Gagnon"). Choristers see first names.
- **Musical vocabulary** is real choir vocabulary: call time, sectional, divisi, learning tracks, mm. 1–48, part predominant.
- **Bilingual.** English and French are equal. Every built-in string has an FR version (`lang`/`locale` props). Layouts are designed for French at about 130% of English length: labels wrap rather than truncate, and buttons never have fixed widths. *French copy should be reviewed by a native Canadian French speaker.*
- **Emoji.** None, in the UI or in system messages.
- **Minors.** Copy never exposes a chorister's medical details, or a photo without consent, beyond the staff who need them. Care notes are labelled "Shared only with staff and chaperones".

## Visual foundations

- **Colour.** Warm paper neutrals (`--paper-*`) and warm ink (`--ink-*`). No pure white page and no blue-grey. There is **one accent**: rubric red `#B9391F`, used for primary actions, the active state, today, and red-letter days (performances and tours). State colours (green, amber, crimson, blue, slate) are separate from the accent and always come with an icon and a word. Voice parts use the Okabe–Ito colourblind-safe set (S orange, A reddish-purple, T bluish-green, B blue) and always carry their letter. All text pairs pass 4.5:1, and control borders (`--border-control`) pass 3:1.
- **Dark mode** (`[data-mode="dark"]`) turns the ink into the page (`#15130F`) and the paper into the text. The accent lightens to `#E8735C` with dark text on it, shadows deepen, and roles stay the same.
- **Type.** Newsreader (serif, optical sizes) is the book's voice: display, h1–h3, card and event titles, stat values, composer names in italic. Hanken Grotesk is the working voice: UI, body, labels and data. The default UI size is 15px, which suits dense staff views; inputs are 16px on phones. Every number column uses `--numeric-tabular`.
- **Spacing.** On a 4px grid: 8–16px inside components, 20–32px between them, 40px and up between sections. Density is moderate. Staff tables use 52px rows (42px compact). Touch targets are at least 44px, and check-in buttons are 84×56.
- **Backgrounds.** Flat paper colours only: no gradients, textures, full-bleed imagery or patterns. Hierarchy comes from the paper steps: `--bg-sunken` (sidebar) under `--bg-app` under `--surface-card`.
- **Borders and cards.** A card is `--surface-card` with a 1px `--border-subtle` border, a 10px radius and `--shadow-1`. Borders do most of the separating; shadows are warm-tinted and low. There are no coloured left-border cards. Alerts are fully tinted and bordered, and selected rows are tinted with `--accent-subtle`.
- **Radii.** 2 / 4 / 6 / 10 / 14 / full. Buttons and inputs use 6, cards 10, modals and sheets 14, badges and chips full.
- **Elevation.** shadow-1 for cards; shadow-2 for popovers and hover lift; shadow-3 for modals, sheets and toasts. Nothing else floats.
- **Hover** darkens fills one step (`--accent-hover`) or lays a translucent ink wash (`--surface-hover`) on neutral surfaces. **Press** goes one step further (`--accent-pressed`, `--surface-pressed`). There is no scale or shrink.
- **Focus.** A 2px `--focus-ring` outline with a 2px offset on everything. Inputs show the ring as a 1px border plus a soft 4px halo.
- **Motion.** Minimal: 120, 180 or 260ms with `cubic-bezier(.2,0,0,1)`. Popovers fade and rise 6px, sheets slide 24px, skeletons pulse gently. There is no bounce or parallax. Under `prefers-reduced-motion` every duration drops to zero.
- **Transparency and blur.** Only on the scrim (`--scrim`) and hover washes. No backdrop blur.
- **Imagery.** None is supplied. Chorister photos appear only with consent; otherwise avatars use initials on a warm neutral disc and are never colour-coded.
- **Layout.** Desktop (1024px and up) has a 60px header with a **3px `--choir-brand` rule across the top** and a 248px sunken sidebar. Tablet (600–1023px) has the header and a drawer. Phones (under 600px) have the header and a bottom nav. Content is capped at 1200px. Side sheets are 440px.
- **Red-letter days.** Medieval calendars rubricated feast days. Choirbook does the same for performances and tours: their date-leaf header and calendar pills use the accent, while rehearsals stay ink.

## Theming (choir layers)

Choirbook is the base. A choir supplies **one brand colour, a logo and its name**. In `tokens/themes.css`:
- `--choir-brand` / `--choir-on-brand` hold the **raw** colour. It is decorative only: the 3px header rule and the monogram or logo tile.
- `--accent`, `--accent-hover`, `--accent-pressed`, `--accent-text`, `--accent-subtle`, `--accent-subtle-strong`, `--on-accent` and `--focus-ring` are **derived, contrast-checked values** for anything interactive or textual, in both light and dark mode. The raw ORYC blue `#3A8FD9` fails AA with white text (3.4:1), so its derived accent is `#1D5596` (7.5:1).
- These **never change per choir**: neutrals, type, spacing, state colours, voice parts, attendance colours, and the rubric C in "Powered by Choirbook".
- Set `data-choir="<key>"` (and `data-mode`) on `<html>` or the app root. `data-choir="choirbook"` resets a subtree to base (ChoirSwitcher rows use this so each choir shows its own colour).
- Choirbook branding stays small: `<PoweredBy/>` in the sidebar footer and on sign-in.

To add a choir, copy the ORYC block in `themes.css`, then derive accent, hover, pressed, text and subtle values that reach 4.5:1 on paper and with `--on-accent`, plus dark-mode values that reach 4.5:1 on `#1D1A16`.

## Iconography

- **Set.** Lucide line icons on a 24px grid. They're drawn at **1.75 stroke** by default; use 2–2.25 at 16px and below and in badges, and 2.5 for the selected check-in state. All are round-capped outline icons, never filled.
- **Delivery.** `<Icon name="…" />` inlines the path data, so there's no icon font and no CDN at runtime. The source SVGs are in `assets/icons/` (104 icons; see `ICON_NAMES`). Add icons by copying from `lucide-static@0.460.0` and regenerating the map.
- **Sizes.** 13–16 in badges and meta lines, 18 in nav and inputs, 20 by default, 22–24 for touch and check-in.
- **Meaning.** Icons reinforce words; they never replace them except in IconButtons, which always have an `aria-label` and tooltip. Fixed meanings: present `check`, late `clock`, absent `x`, excused `circle-minus`, rehearsal `music`, sectional `mic-vocal`, performance `ticket`, tour `bus`, social `party-popper`, deadline `clipboard-check`, medical `heart-pulse`, signature `signature`.
- **No emoji, and no Unicode symbols used as icons.** The only Unicode marks used are typographic: `·` as a separator, `–` in ranges and `×` for playback speed.

## Caveats
- No real ORYC logo or brand colour yet: the colour is a placeholder and the UI uses a monogram.
- Fonts are a deliberate choice, not a match to an existing brand.
- French strings are a first pass.
