---
name: better-layout
description: Design engineering principles for grouping, alignment, spacing, and adaptivity. Use when building UI layouts, reviewing spacing, deciding on margins/padding, handling responsive breakpoints, RTL mirroring, or fixing overlapping elements. Triggers on layout review, spacing, alignment, grouping, container queries, safe areas, right-to-left layout.
---

# Grouping & Alignment

How spacing, shapes, shared edges, and ordering communicate what belongs together and what matters most.

## Group with Space, Not Lines

Three tools create grouping, in order of preference:

1. **Negative space**: the default. Related items sit close; unrelated items sit far apart.
2. **Background shapes**: a card or filled container, when a group needs to read as one unit (a selectable row, a draggable card).
3. **Separator lines**: last resort, for dense data where space would cost too much (tables, long settings lists).

The structural rule: the gap between groups must be at least 2× the gap within a group. If items inside a group are `8px` apart, groups need `16px`+ between them, otherwise the eye can't tell where one group ends.

```css
/* Good: spacing alone communicates the grouping */
.field-group { display: flex; flex-direction: column; gap: 8px; }
.form { display: flex; flex-direction: column; gap: 24px; }

/* Bad: uniform spacing plus lines to compensate */
.form > * { margin-bottom: 12px; border-bottom: 1px solid var(--separator); }
```

```html
<!-- Good: Tailwind -->
<div class="space-y-6">
  <div class="space-y-2">…field group…</div>
  <div class="space-y-2">…field group…</div>
</div>
```

When a separator is genuinely needed, keep it quiet: hairline width, low contrast, and never combined with a large gap (the gap already did the job).

## Keep Controls Distinct from Content

Interactive elements need a visual signal that they're interactive: a background, a border, an underline, or placement in a consistent control zone (toolbar, footer row). A control styled identically to static text is invisible.

```html
<!-- Bad: action looks exactly like the description text next to it -->
<p class="text-zinc-600">Your trial ends soon. Upgrade now</p>

<!-- Good: the action reads as an action -->
<p class="text-zinc-600">Your trial ends soon.</p>
<button class="font-medium text-blue-600">Upgrade now</button>
```

The inverse also holds: don't give static elements control styling. A non-clickable badge shaped exactly like the buttons beside it collects dead clicks.

## Align to Shared Edges

Pick a small set of alignment edges and put everything on them; the eye tracks straight edges to scan content.

- Every stray edge (an icon 2px off the text edge, a card padded differently from its neighbor) reads as noise even when nobody can name the problem.
- Use one consistent project spacing step to express hierarchy; `16px` is a useful default when no scale exists, and deeper nesting repeats the same step.
- Numbers in tables right-align to the trailing edge (see `better-typography` for tabular figures); text left-aligns to the leading edge.

```css
/* Good: one shared leading edge, one indent step */
.section { padding-inline: 24px; }
.section .child { margin-inline-start: 16px; }

/* Bad: three unrelated leading edges in one column */
.header { padding-inline-start: 20px; }
.list-item { padding-inline-start: 14px; }
.footer { padding-inline-start: 24px; }
```

## Logical Properties, Not Physical

Express direction-dependent horizontal position as leading/trailing so the layout mirrors automatically under `dir="rtl"`:

| Physical (avoid) | Logical (use) |
| --- | --- |
| `margin-left` | `margin-inline-start` |
| `padding-right` | `padding-inline-end` |
| `left: 0` | `inset-inline-start: 0` |
| `text-align: left` | `text-align: start` |
| `border-right` | `border-inline-end` |

```html
<!-- Good: Tailwind logical utilities -->
<div class="ms-4 pe-6 text-start">…</div>

<!-- Bad: breaks in RTL -->
<div class="ml-4 pr-6 text-left">…</div>
```

Reserve physical properties for things that genuinely refer to physical screen sides regardless of language, e.g. positioning relative to a device notch, or an element that must match a physical gesture direction.

When the arrangement of elements encodes progression (star ratings, step indicators, progress bars), the sequence mirrors in RTL: stars fill from the trailing side. Flexbox and grid with logical properties mirror automatically; hand-positioned elements don't. Digit order inside numbers never reverses; that and other bidi text rules live in the `better-typography` skill.

## Order by Importance

Readers scan top-to-bottom and leading-to-trailing. Place content accordingly:

- The most important information sits near the top and the leading edge; the further down and trailing something sits, the less attention it gets.
- Give essential information room. Don't bury the one number the user came for under rows of secondary detail; push secondary content into collapsed sections, tabs, or detail views.
- Within a row, the identifying content (name, title) leads; metadata and actions trail.

```html
<!-- Good: primary fact first, detail demoted -->
<div>
  <p class="text-2xl font-semibold">$4,320.00</p>
  <p class="text-sm text-zinc-500">Available balance</p>
</div>

<!-- Bad: the key fact is buried below the fold of the card -->
<div>
  <p class="text-sm">Account 4402 · Opened 2019 · Standard tier</p>
  <p class="text-sm">Last statement: June 30</p>
  <p class="text-sm">Balance: $4,320.00</p>
</div>
```

Think in **leading/trailing**, not left/right: combined with logical properties, the same hierarchy mirrors correctly in RTL locales.

## Don't Overload the Entry Point

The first screenful is a table of contents, not the whole book. If everything is prominent, nothing is:

- One primary action per view (see `better-colors` for how color enforces this).
- Group secondary actions behind a menu once they exceed two or three.
- Prefer a short view that links deeper over a long view that shows everything at level one.

# Spacing & Adaptivity

Space between controls, margins against the viewport, hinting at off-screen content, and layouts that survive resizing and translation.

## Breathing Room Between Targets

Controls placed too close together get mis-tapped and read as one unit. When the project has no established density scale, use these starting points:

| Between | Starting point |
| --- | --- |
| Adjacent bordered/filled controls (buttons, inputs) | `12px` |
| Around borderless controls (text buttons, icon buttons) | `24px` |
| Unrelated control groups | `24px`+ (2× the intra-group gap) |

Borderless controls usually need more clearance because nothing marks where one target ends and the next begins; the space itself is the boundary. Compact professional tools may use less when the hit areas remain distinct and do not overlap. Preserve an established, usable density instead of expanding controls solely to match these values.

```html
<!-- Good: bordered buttons at 12px, icon buttons given room -->
<div class="flex gap-3">
  <button class="rounded-lg border px-4 py-2">Cancel</button>
  <button class="rounded-lg bg-blue-600 px-4 py-2 text-white">Save</button>
</div>

<!-- Bad: three borderless icon buttons packed at 4px -->
<div class="flex gap-1">
  <button><TrashIcon /></button>
  <button><ArchiveIcon /></button>
  <button><ShareIcon /></button>
</div>
```

WCAG target-size requirements, larger usability targets, and pseudo-element expansion are covered by the `better-accessibility` skill; these clearances are in addition, so expanded hit areas never overlap.

## Inset Buttons from the Edges

In content layouts, buttons pressed accidentally against the viewport can look like system chrome and clip against curved corners or gesture zones. Keep them inside the layout margins. Edge-to-edge actions remain valid when they intentionally are application/platform chrome and account for safe areas:

```css
/* Good: inset action bar */
.action-bar {
  padding-inline: 16px;
  padding-bottom: calc(16px + env(safe-area-inset-bottom));
}
.action-bar button { width: 100%; border-radius: 12px; }

/* Bad: button glued to all three edges */
.action-bar button {
  width: 100vw;
  border-radius: 0;
  position: fixed;
  bottom: 0;
}
```

Start near `16px` inline margin on mobile when the project has no layout token; the button can still span the full content width inside those margins.

## Progressive Disclosure Needs an Affordance

Hiding complexity is good; hiding it without a cue is a trap. Every piece of off-screen or collapsed content needs a visible hint that it exists. Preserve the product's established scroll indicator or disclosure pattern; use the recipes below when no clear cue exists:

- **Peeking items.** In a horizontal scroller or carousel, size items so the next one peeks `16–32px` past the container edge. A row of cards that ends exactly at the edge looks complete, and nobody scrolls it.
- **Disclosure controls.** Collapsed sections get a chevron or "Show more" control; the label states what's hidden ("Show 12 more results"), not just "More".
- **Truncation cues.** Clamped text shows an ellipsis and a way to expand; see `better-typography` for truncation mechanics.

The peeking-scroller recipe: the container's padding creates the peek, and snap points stay on the content edge.

```css
.scroller {
  display: flex;
  gap: 12px;
  overflow-x: auto;
  padding-inline: 24px;
  scroll-padding-inline: 24px;
  scroll-snap-type: x mandatory;
}
.scroller > * {
  flex: 0 0 calc(100% - 48px - 24px); /* container minus margins minus peek */
  scroll-snap-align: start;
}
```

```html
<!-- Tailwind: the 80% width keeps the next card's leading 16-32px visible -->
<div class="flex gap-3 overflow-x-auto px-6 [scroll-padding-inline:1.5rem] snap-x snap-mandatory">
  <div class="w-[80%] shrink-0 snap-start">…</div>
  <div class="w-[80%] shrink-0 snap-start">…</div>
</div>
```

## Content Bleeds, Controls Float

The two layers behave differently at the edges:

- **Content layer**: backgrounds, hero media, and scrollable lists extend to the viewport edges.
- **Control layer**: text and controls stay inside the layout margins and safe areas, floating above the content.

```css
/* Good: full-bleed media inside a constrained article */
.article {
  display: grid;
  grid-template-columns: 1fr min(65ch, calc(100% - 48px)) 1fr;
}
.article > * { grid-column: 2; }
.article > .full-bleed { grid-column: 1 / -1; }
```

Sticky headers and floating action buttons account for safe areas:

```css
.fab {
  position: fixed;
  inset-inline-end: calc(16px + env(safe-area-inset-right));
  bottom: calc(16px + env(safe-area-inset-bottom));
}
```

## Hold Structure Until It Breaks

Breakpoints belong to the content, not the device catalog:

- Break where the layout actually stops fitting (when the sidebar squeezes the content below its minimum measure, when the card grid drops below a usable column width), not at `768px` because a preset says so.
- Collapse late. A layout that keeps its expanded structure as long as it genuinely fits stays stable and familiar; premature collapsing throws away space users paid for.
- Prefer **container queries** for components: a card should adapt to the column it's in, not to the viewport.

```css
/* Good: component adapts to its container */
.card-list { container-type: inline-size; }
@container (max-width: 400px) {
  .card { grid-template-columns: 1fr; }
}

/* Bad: viewport media query breaks the card inside a narrow sidebar */
@media (max-width: 768px) {
  .card { grid-template-columns: 1fr; }
}
```

Test order: the smallest supported size and the largest first (those break first), then the sizes in between.

## Plan for Growth and Clipping

Layouts fail in two directions: content grows, and viewports shrink.

**String expansion varies substantially by language and source-string length.** Do not rely on one universal percentage. Rules:

- No fixed widths sized to English labels; use `max-width` plus wrapping.
- No fixed heights on text containers; use `min-height` if a floor is needed.
- Buttons size themselves from their label (`padding-inline`), never a hardcoded width.
- Test with pseudo-localization or a long-string locale before shipping.

```css
/* Good: label defines the size */
.button { padding-inline: 16px; white-space: nowrap; }

/* Bad: German will overflow or truncate */
.button { width: 96px; overflow: hidden; }
```

**Clipping:** never park critical actions where they can be cut off: the bottom edge of a resizable pane, below the fold of a fixed-height modal, behind an expanding keyboard. Keep primary actions in stable chrome: a sticky footer with safe-area padding, or the top of the view. If a modal's content scrolls, its action row doesn't.
