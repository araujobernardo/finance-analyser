# UX Brief — #795: Mobile Responsive Layout (Option A — Slide Drawer)

## Chosen option

**Option A — Slide Drawer**

Reference mockup: `specs/redesign/mockups/795/option-a.html`

---

## Breakpoint

- **Mobile**: ≤ 768px
- **Desktop**: > 768px — layout remains completely unchanged

---

## Mobile top bar (≤ 768px)

- Fixed top bar, 52px tall, background `var(--sidebar-bg)`, border-bottom `var(--sidebar-border)`
- **Left**: hamburger button — 36×36px, border-radius 8px, white card background, 3 horizontal lines (14px wide, 1.5px thick, 4px gap), `aria-label="Open menu"`
- **Centre**: "Finance Analyser" title, 15px, font-weight 800
- **Right**: "↑ CSV" button — 32px tall, accent background, border-radius 8px, 12px font, triggers the existing CSV upload action
- Sidebar is hidden (`display: none`) when viewport ≤ 768px

---

## Drawer overlay

Triggered by the hamburger button:

- Full-screen overlay (`position: fixed; inset: 0; z-index: 100`)
- Semi-transparent backdrop (`rgba(30,42,34,0.4)`); tapping it closes the drawer
- Drawer panel: 260px wide, slides in from the left (`transform: translateX(-100%)` → `translateX(0)`), transition `350ms cubic-bezier(0,0,0.2,1)`
- Drawer content mirrors the existing sidebar: brand header, account list, upload button, nav links, footer/sign-out
- Close button (✕) in the top-right corner of the drawer panel
- Tapping any nav item also closes the drawer

---

## Stats grid (≤ 768px)

- `display: grid; grid-template-columns: 1fr 1fr; gap: 10px`
- Income and Expenses cards: one column each
- Savings card: one column
- **Net Worth card**: `grid-column: span 2` (full width)

---

## Month pills (≤ 768px)

- Wrapper: `overflow-x: auto; padding-bottom: 4px`
- Pills row: `display: flex; flex-wrap: nowrap; gap: 8px`
- Each pill: `flex-shrink: 0; white-space: nowrap`
- No wrapping — pills scroll horizontally

---

## Charts (≤ 768px)

- Charts container: `display: flex; flex-direction: column; gap: 10px` (single column, stacks vertically)
- Each chart card fills full width
- Donut chart: legend renders below the donut (not beside it)
- Trend / line chart: uses `preserveAspectRatio` on the SVG so it scales to container width

---

## Interaction notes

- Opening the drawer should trap focus within the panel (accessibility)
- Pressing Escape closes the drawer
- No animation on desktop — drawer logic only activates at ≤ 768px
- Use a React state variable (`drawerOpen: boolean`) managed in the layout component

---

## Desktop (> 768px)

No changes. The permanent sidebar remains exactly as it is today. The hamburger and top bar are hidden (`display: none` above the breakpoint).

---

## Design tokens (from `src/index.css`)

| Token              | Value     |
| ------------------ | --------- |
| `--sidebar-bg`     | `#f9f7f4` |
| `--sidebar-border` | `#e8e2da` |
| `--accent`         | `#0f9d8a` |
| `--accent-light`   | `#e8f5f3` |
| `--text`           | `#1e2a22` |
| `--muted`          | `#7a8074` |
| `--motion-slow`    | `350ms`   |

---

_UX brief written by Delivery Lead from Designer's Option A mockup. User confirmed: Option A — Slide Drawer._
