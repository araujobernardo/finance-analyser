# UX Brief — #794 Chat/Auth Styling (Option C — Conversational Soft)

## Decision

The user selected **Option C**: Conversational Soft — pill-shaped chat bubbles, a branded teal AI avatar with "● Active" status, subtle teal gradient on user messages, and a welcoming auth card with pill-shaped inputs and a teal glow submit button.

## Mockup Reference

`specs/redesign/mockups/794/option-c.html`

---

## Design Token Reference

All values must use CSS variables from `src/index.css` (Option B palette). No hardcoded hex values in chat or auth CSS.

```css
--bg: #f4f1ed;
--surface: #faf8f5;
--card: #ffffff;
--border: #ede8e2;
--border-strong: #d9d2c8;
--accent: #0f9d8a;
--accent-light: #e8f5f3;
--accent-mid: #7dc8c0;
--text: #1e2a22;
--text-2: #3d4a40;
--muted: #7a8074;
--subtle: #a09890;
--red: #c53030;
--shadow-sm: 0 1px 3px rgba(30, 42, 34, 0.08);
--shadow-md: 0 4px 12px rgba(30, 42, 34, 0.12);
```

---

## AI Chat Page

### Layout

```
ChatPage (background: var(--bg), display: flex, flex-direction: column, height: 100%)
├── Chat header  (white card strip, border-bottom)
├── Messages area (flex: 1, overflow-y: auto, background: var(--bg), padding 18px 20px, gap 12px)
└── Input footer  (white card strip, box-shadow top)
```

### Chat Header

- `background: var(--card); border-bottom: 1px solid var(--border); padding: 18px 24px 12px; display: flex; align-items: center; gap: 14px`
- **AI avatar circle**: `width: 36px; height: 36px; border-radius: 50%; background: var(--accent); color: #fff; display: flex; align-items: center; justify-content: center; font-size: 16px; flex-shrink: 0` — rendered with the Finance Analyser dot motif (◎)
- **Title**: `font-size: 15px; font-weight: 800; color: var(--text)` — text: "Finance AI"
- **Status label**: `font-size: 12px; font-weight: 600; color: var(--accent)` — text: "● Active"

### Message Rows

- Each row: `display: flex; gap: 8px; align-items: flex-end`
- User rows reverse direction: `flex-direction: row-reverse`
- Small avatar circle (28×28, 50% radius):
  - AI avatar: `background: var(--accent); color: #fff; font-size: 12px` — dot motif (◎)
  - User avatar: `background: var(--text-2); color: #fff; font-size: 10px; font-weight: 700` — user initials

### Chat Bubbles (pill-shaped, 18px radius)

**Assistant bubble** (white card with border):

```css
max-width: 74%;
background: var(--card);
border: 1px solid var(--border);
border-radius: 18px 18px 18px 4px; /* tail bottom-left */
padding: 10px 16px;
font-size: 13.5px;
color: var(--text);
line-height: 1.6;
box-shadow: var(--shadow-sm);
```

**User bubble** (subtle teal gradient):

```css
max-width: 74%;
background: linear-gradient(135deg, var(--accent-mid) 0%, var(--accent) 100%);
border: none;
border-radius: 18px 18px 4px 18px; /* tail bottom-right */
padding: 10px 16px;
font-size: 13.5px;
color: #fff;
font-weight: 600;
box-shadow: 0 2px 8px rgba(15, 157, 138, 0.25);
```

### Chat Input Footer

- `background: var(--card); padding: 12px 20px; box-shadow: 0 -2px 8px rgba(30,42,34,0.06)`
- Input row: `display: flex; gap: 8px; align-items: center`

**Text input** (pill-shaped):

```css
flex: 1;
background: var(--bg);
border: 1.5px solid var(--border-strong);
border-radius: 24px;
padding: 10px 16px;
font-size: 14px;
color: var(--text);
font-family: inherit;
outline: none;
```

Focus: `border-color: var(--accent); box-shadow: 0 0 0 3px var(--accent-light)`

**Send button** (circular, teal):

```css
background: var(--accent);
color: #fff;
border: none;
border-radius: 50%;
width: 40px;
height: 40px;
font-size: 16px;
font-weight: 700;
cursor: pointer;
display: flex;
align-items: center;
justify-content: center;
flex-shrink: 0;
box-shadow: 0 2px 6px rgba(15, 157, 138, 0.3);
transition: opacity 0.15s;
```

Hover: `opacity: 0.88`

---

## Auth Pages (Login, SignUp, ForgotPassword, ResetPassword, VerifyEmail)

All auth pages share `src/pages/auth.css`. Apply the Option C style to this shared stylesheet.

### Page Shell

- Full-page centred layout: `background: var(--bg); display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; padding: 24px`

### Logo Pill Badge (above card)

```css
display: inline-flex;
align-items: center;
gap: 7px;
background: var(--card);
border: 1px solid var(--border);
border-radius: 99px;
padding: 7px 16px 7px 10px;
margin-bottom: 28px;
box-shadow: var(--shadow-sm);
```

- **Dot**: `width: 10px; height: 10px; border-radius: 50%; background: var(--accent)`
- **Wordmark**: `font-size: 13px; font-weight: 800; color: var(--text); letter-spacing: -0.01em` — "FINANCE " followed by `<span style="color: var(--accent)">Analyser</span>`

### Auth Card

```css
width: 100%;
max-width: 360px;
background: var(--card);
border: 1px solid var(--border);
border-radius: 20px;
padding: 32px 28px;
box-shadow: var(--shadow-md);
```

### Typography inside card

- **Heading** (`h1`): `font-size: 22px; font-weight: 800; color: var(--text); margin-bottom: 4px`
- **Subheading** (`p`): `font-size: 13px; color: var(--muted); margin-bottom: 24px; line-height: 1.5`

### Form Fields

- Form: `display: flex; flex-direction: column; gap: 14px`
- Field wrapper: `display: flex; flex-direction: column; gap: 5px`
- Label: `font-size: 12.5px; font-weight: 600; color: var(--text-2); padding-left: 4px`
- Forgot password link: `font-size: 12px; color: var(--muted)` → hover: `color: var(--accent)`

**Inputs** (pill-shaped, 24px radius):

```css
background: var(--surface);
border: 1.5px solid var(--border);
border-radius: 24px;
padding: 11px 16px;
font-size: 13.5px;
color: var(--text);
font-family: inherit;
outline: none;
width: 100%;
transition: all 0.15s;
```

Focus: `border-color: var(--accent); background: var(--card); box-shadow: 0 0 0 3px var(--accent-light)`
Placeholder: `color: var(--muted)`

### Submit Button (pill-shaped with teal glow)

```css
width: 100%;
background: var(--accent);
color: #fff;
border: none;
border-radius: 24px;
padding: 12px;
font-size: 14px;
font-weight: 700;
font-family: inherit;
cursor: pointer;
margin-top: 4px;
transition: opacity 0.15s;
box-shadow: 0 4px 12px rgba(15, 157, 138, 0.3);
letter-spacing: 0.01em;
```

Hover: `opacity: 0.88`

### Divider & Footer Link

- Divider: `height: 1px; background: var(--border); margin: 18px 0 14px`
- Footer text: `font-size: 13px; color: var(--muted); text-align: center`
- Footer link: `color: var(--accent); text-decoration: none; font-weight: 700` → hover: `text-decoration: underline`

---

## Acceptance Criteria (from issue #794, updated for Option C)

- [ ] Chat page: AI header shows branded teal avatar circle (◎) and "● Active" status label in accent colour
- [ ] Chat page: message bubbles are pill-shaped (18px radius) throughout
- [ ] Chat page: user bubbles use subtle teal gradient (`accent-mid` → `accent`) with white text
- [ ] Chat page: assistant bubbles use white card with `var(--border)` border and `shadow-sm`
- [ ] Chat page: input bar is pill-shaped (24px radius) with teal focus glow
- [ ] Chat page: send button is circular teal with teal box-shadow
- [ ] Auth pages: card has 20px radius, centred on `var(--bg)` warm background
- [ ] Auth pages: pill-badge logo chip (white card, rounded 99px, dot + wordmark) appears above the card
- [ ] Auth pages: all inputs are pill-shaped (24px radius) with teal focus ring
- [ ] Auth pages: submit button is pill-shaped (24px radius) with teal glow shadow
- [ ] Auth form still functional (login/register/forgot-password still work)
- [ ] No hardcoded hex colours in `ChatPage.css` or `auth.css`

## Files to Change

- `src/pages/ChatPage.css` — chat page styles
- `src/pages/ChatPage.tsx` — AI avatar markup, "● Active" status label
- `src/pages/auth.css` — shared auth styles (covers Login, SignUp, ForgotPassword, ResetPassword, VerifyEmail)
- `src/pages/LoginPage.tsx` — logo pill badge markup
- `src/pages/SignUpPage.tsx` — logo pill badge markup
- Any other auth page TSX files that render the logo/card directly
