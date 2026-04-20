# Finance Analyser Design System

Inspired by Monarch Money's dark-first aesthetic. All design decisions follow
the principles at the bottom of this document.

---

## Colour Tokens

### Backgrounds

| Token           | Hex       | Usage                                   |
| --------------- | --------- | --------------------------------------- |
| `--bg-base`     | `#0f1923` | App root, page canvas                   |
| `--bg-surface`  | `#162130` | Cards, panels, modals                   |
| `--bg-elevated` | `#1c2a3a` | Dropdowns, tooltips, popovers           |
| `--bg-overlay`  | `#243447` | Hover states on cards, active nav items |
| `--bg-input`    | `#0f1923` | Input fields, textareas                 |

### Text

| Token              | Hex       | Usage                             |
| ------------------ | --------- | --------------------------------- |
| `--text-primary`   | `#e8edf2` | Body text, labels, headings       |
| `--text-secondary` | `#8fa3b8` | Descriptions, sub-labels, hints   |
| `--text-muted`     | `#556b82` | Disabled states, placeholders     |
| `--text-inverse`   | `#0f1923` | Text on accent/positive/danger bg |

### Accent (Teal / Blue-Green)

| Token             | Hex       | Usage                                  |
| ----------------- | --------- | -------------------------------------- |
| `--accent`        | `#2ec4b6` | Primary CTA, links, active indicators  |
| `--accent-hover`  | `#26a99d` | Hover state on accent elements         |
| `--accent-subtle` | `#1a3d3b` | Accent backgrounds (badge bg, icon bg) |
| `--accent-muted`  | `#1d4e4a` | Accent border color on focused inputs  |

### Semantic — Finance

| Token               | Hex       | Usage                            |
| ------------------- | --------- | -------------------------------- |
| `--positive`        | `#27ae60` | Income, positive delta, success  |
| `--positive-subtle` | `#0f2e1c` | Background behind income values  |
| `--negative`        | `#e74c3c` | Expenses, negative delta, danger |
| `--negative-subtle` | `#2e1010` | Background behind expense values |
| `--warning`         | `#f39c12` | Budget nearing limit, caution    |
| `--warning-subtle`  | `#2e230a` | Background behind warning values |

### Borders

| Token              | Hex       | Usage                               |
| ------------------ | --------- | ----------------------------------- |
| `--border-subtle`  | `#1e2f3f` | Card edges, dividers (low contrast) |
| `--border-default` | `#2a3f52` | Input borders, modal edges          |
| `--border-strong`  | `#3d5a73` | Focus rings (combined with accent)  |

### States

| Token             | Hex                      | Usage                         |
| ----------------- | ------------------------ | ----------------------------- |
| `--focus-ring`    | `2px solid #2ec4b6`      | Keyboard focus outline        |
| `--disabled-bg`   | `#162130` at 50% opacity | Disabled buttons, inputs      |
| `--disabled-text` | `#556b82`                | Text inside disabled elements |

---

## Typography

**Font family**: Inter (Google Fonts). Fallback: `system-ui, -apple-system, sans-serif`.

### Scale

| Token         | Size | Weight | Line Height | Usage                               |
| ------------- | ---- | ------ | ----------- | ----------------------------------- |
| `--text-xs`   | 12px | 400    | 1.4         | Labels on chart axes, timestamps    |
| `--text-sm`   | 14px | 400    | 1.5         | Secondary body, table cells, hints  |
| `--text-base` | 16px | 400    | 1.6         | Primary body, inputs, buttons       |
| `--text-lg`   | 18px | 500    | 1.5         | Card headings, section titles       |
| `--text-xl`   | 24px | 600    | 1.3         | Panel hero numbers (monthly total)  |
| `--text-2xl`  | 32px | 700    | 1.2         | Page-level headings                 |
| `--text-3xl`  | 48px | 700    | 1.1         | Reserved — splash / onboarding only |

### Rules

- Numbers in finance panels use `font-variant-numeric: tabular-nums` to prevent
  layout shift as values change.
- Currency values always use `--text-xl` or larger; never drop below `--text-lg`
  for a primary monetary figure.
- All caps is reserved for status badges only — never apply to body text.
- Max line width for body text: 72ch.

---

## Spacing

Base unit: **4px**.

| Token        | Value | Usage                                      |
| ------------ | ----- | ------------------------------------------ |
| `--space-1`  | 4px   | Icon internal padding, tight list gaps     |
| `--space-2`  | 8px   | Inline element gaps, badge padding         |
| `--space-3`  | 12px  | Input vertical padding, list item spacing  |
| `--space-4`  | 16px  | Card internal padding (sm), button padding |
| `--space-5`  | 20px  | Row gaps in forms                          |
| `--space-6`  | 24px  | Card internal padding (default)            |
| `--space-8`  | 32px  | Section spacing within a page              |
| `--space-10` | 40px  | Between major panels / grid rows           |
| `--space-12` | 48px  | Page-level vertical rhythm                 |
| `--space-16` | 64px  | Hero section padding                       |
| `--space-24` | 96px  | Full-page empty state centering            |

---

## Border Radius

| Token           | Value  | Usage                                       |
| --------------- | ------ | ------------------------------------------- |
| `--radius-sm`   | 4px    | Badges, chips, small tags                   |
| `--radius-md`   | 8px    | Buttons, inputs, tooltips                   |
| `--radius-lg`   | 12px   | Cards, panels, modals                       |
| `--radius-xl`   | 16px   | Bottom sheets, large modal containers       |
| `--radius-full` | 9999px | Avatar circles, pill buttons, progress bars |

---

## Shadows

Shadows use `rgba(0,0,0,…)` opacity — correct for dark backgrounds.

| Token         | Value                        | Usage                    |
| ------------- | ---------------------------- | ------------------------ |
| `--shadow-sm` | `0 1px 3px rgba(0,0,0,0.3)`  | Subtle card lift         |
| `--shadow-md` | `0 4px 12px rgba(0,0,0,0.4)` | Modals, dropdowns        |
| `--shadow-lg` | `0 8px 24px rgba(0,0,0,0.5)` | Popovers, floating menus |

---

## Component Patterns

### Cards

```
background:    var(--bg-surface)
border:        1px solid var(--border-subtle)
border-radius: var(--radius-lg)
padding:       var(--space-6)
box-shadow:    var(--shadow-sm)
```

Hover state (interactive cards only):

```
background:    var(--bg-overlay)
border-color:  var(--border-default)
transition:    background var(--motion-fast) ease-out
```

### Buttons

**Primary**

```
background:     var(--accent)
color:          var(--text-inverse)
border-radius:  var(--radius-md)
padding:        var(--space-3) var(--space-6)
font-size:      var(--text-base)
font-weight:    600
hover:          background var(--accent-hover)
```

**Secondary**

```
background:     transparent
color:          var(--text-primary)
border:         1px solid var(--border-default)
border-radius:  var(--radius-md)
padding:        var(--space-3) var(--space-6)
hover:          background var(--bg-overlay), border-color var(--border-strong)
```

**Ghost**

```
background:     transparent
color:          var(--text-secondary)
border:         none
padding:        var(--space-3) var(--space-4)
hover:          color var(--text-primary), background var(--bg-overlay)
```

**Danger**

```
background:     var(--negative)
color:          var(--text-inverse)
border-radius:  var(--radius-md)
padding:        var(--space-3) var(--space-6)
hover:          opacity 0.85
```

All buttons: `transition: all var(--motion-fast) ease-out`.  
Disabled state: `opacity: 0.4; cursor: not-allowed; pointer-events: none`.

### Inputs

```
background:     var(--bg-input)
border:         1px solid var(--border-default)
border-radius:  var(--radius-md)
padding:        var(--space-3) var(--space-4)
color:          var(--text-primary)
font-size:      var(--text-base)

focus:
  outline:      none
  border-color: var(--accent)
  box-shadow:   0 0 0 2px var(--accent-muted)

placeholder:    color var(--text-muted)
```

### Badges / Status Chips

```
border-radius:  var(--radius-sm)
padding:        2px var(--space-2)
font-size:      var(--text-xs)
font-weight:    600
text-transform: uppercase
letter-spacing: 0.05em
```

Variants: use semantic tokens (positive/negative/warning) for background and
set text to `--text-inverse`. Neutral badge: `--bg-elevated` bg, `--text-secondary` text.

### Charts (Recharts)

- Background: `var(--bg-surface)` (matches card)
- Grid lines: `var(--border-subtle)` at 50% opacity
- Axis tick text: `var(--text-muted)`, `var(--text-xs)`
- Tooltip: `background var(--bg-elevated)`, `border var(--border-default)`,
  `border-radius var(--radius-md)`, `box-shadow var(--shadow-md)`
- Selected / active bar: `var(--accent)`
- Inactive bars: `var(--bg-overlay)` or a muted palette variant
- Income series: `var(--positive)`
- Expense series: `var(--negative)`
- Always use `animationDuration={250}` (matches `--motion-normal`)

### Empty States

```
display:        flex / column / center / gap var(--space-4)
padding:        var(--space-24) var(--space-8)
icon:           48px, stroke var(--text-muted), weight 1.5
heading:        var(--text-lg), var(--text-secondary)
body:           var(--text-sm), var(--text-muted)
CTA:            Primary button (if actionable)
```

### Skeletons

```
background:     var(--bg-overlay)
border-radius:  var(--radius-md)
animation:      pulse 1.5s ease-in-out infinite

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0.4; }
}
```

### Navigation (NavBar)

```
background:     var(--bg-surface)
border-bottom:  1px solid var(--border-subtle)
height:         56px
padding:        0 var(--space-6)

active link:    color var(--accent), border-bottom 2px solid var(--accent)
inactive link:  color var(--text-secondary)
hover link:     color var(--text-primary)
```

Account selector dropdown:

```
background:     var(--bg-elevated)
border:         1px solid var(--border-default)
border-radius:  var(--radius-md)
box-shadow:     var(--shadow-md)
item hover:     background var(--bg-overlay)
```

---

## Motion

| Token             | Value | Usage                                        |
| ----------------- | ----- | -------------------------------------------- |
| `--motion-fast`   | 150ms | Hover states, button presses, badge changes  |
| `--motion-normal` | 250ms | Panel transitions, modal open, chart animate |
| `--motion-slow`   | 400ms | Page-level transitions, drawer slide         |

**Easing**:

- Entrances (appearing): `cubic-bezier(0, 0, 0.2, 1)` (ease-out — fast start, slow end)
- Exits (disappearing): `cubic-bezier(0.4, 0, 1, 1)` (ease-in — slow start, fast end)
- State changes (hover, press): `ease-out`

Respect `prefers-reduced-motion`: wrap all non-essential animations in
`@media (prefers-reduced-motion: no-preference)`.

---

## Finance Analyser Design Principles

1. **Numbers are the hero.** Monetary figures must always be the most prominent
   element on any panel. Never let decorative chrome compete with data.

2. **Dark means calm.** The deep navy palette reduces cognitive load during
   financial review. Avoid bright backgrounds or high-saturation colours outside
   the accent and semantic tokens.

3. **Colour carries meaning.** Green = income/positive, red = expense/negative,
   teal = interactive. Never repurpose these colours for decoration — a user
   scanning quickly must trust the colour signal.

4. **Empty is informative.** Every panel in an empty or loading state should
   tell the user why it's empty and what to do next. A blank panel is a bug,
   not a design choice.

5. **Consistency over cleverness.** Reach for an existing component pattern
   before designing a new one. The value of a design system is predictability —
   every new pattern costs the user a moment of re-learning.
