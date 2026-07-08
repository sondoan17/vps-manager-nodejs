# VPS Manager Design System

## 1. Atmosphere & Identity

A warm operational command center for self-hosted infrastructure: technical, trustworthy, and recruiter-readable without feeling like a generic cloud console. The signature is parchment-toned depth with teal command accents and amber operational emphasis.

## 2. Color

### Palette

| Role              | Token                | Light         | Usage                                     |
| ----------------- | -------------------- | ------------- | ----------------------------------------- |
| Surface/primary   | `--background`       | `38 34% 94%`  | Main page background                      |
| Surface/card      | `--card`             | `43 100% 97%` | Panels and cards                          |
| Text/primary      | `--foreground`       | `30 21% 7%`   | Headlines and body                        |
| Text/secondary    | `--muted-foreground` | `31 12% 38%`  | Captions and helper copy                  |
| Border/default    | `--border`           | `37 25% 80%`  | Card and input outlines                   |
| Accent/command    | `--primary`          | `174 67% 18%` | Primary actions and healthy state         |
| Accent/operations | `--accent`           | `25 59% 47%`  | Operational labels and warning emphasis   |
| Status/error      | `--destructive`      | `6 63% 38%`   | Destructive actions and unreachable state |

### Rules

Use Tailwind theme tokens that resolve to these CSS variables. Do not add raw hex values in components.

## 3. Typography

### Scale

| Level    | Size    | Weight  | Line Height | Usage            |
| -------- | ------- | ------- | ----------- | ---------------- |
| Display  | 48-72px | 800-900 | 1.05        | Page title       |
| H2       | 24-32px | 800     | 1.2         | Section headings |
| H3       | 18-22px | 800     | 1.3         | Card titles      |
| Body     | 16px    | 400-600 | 1.6         | Default text     |
| Body/sm  | 14px    | 400-600 | 1.5         | Metadata         |
| Overline | 12px    | 900     | 1.3         | Uppercase labels |

### Font Stack

- Primary: Be Vietnam Pro, Inter, Segoe UI, sans-serif
- Mono: system monospace only when terminal output is introduced

## 4. Spacing & Layout

All spacing derives from 4px. Main content uses `w-[min(1120px,calc(100%-1.5rem))]`, `py-12`, `gap-4`, `gap-6`, and `p-6` as the current rhythm.

## 5. Components

### Card

- **Structure**: `Card > CardHeader > CardTitle/CardDescription > CardContent`
- **Spacing**: `p-6`, `gap-4`, `space-y-4`
- **States**: static elevated surface with token border and `shadow-panel`
- **Accessibility**: headings describe each panel

### Alert

- **Structure**: bordered message block
- **Variants**: default, success, destructive
- **Spacing**: compact body padding with readable line height
- **Accessibility**: status copy remains text, not icon-only

## 6. Motion & Interaction

Keep motion minimal. Buttons and inputs rely on existing hover, focus-visible, and disabled states. If new motion is added, animate only transform or opacity and respect reduced motion.

## 7. Depth & Surface

Strategy: mixed. Cards use token borders plus `--shadow-panel`; dashboard background uses subtle radial and patterned gradients declared in `index.css`.
