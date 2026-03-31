# Emerald Hearth Design System



### 1. Overview & Creative North Star

**Creative North Star: "The Digital Sanctuary"**

Emerald Hearth is a design system that balances the clinical efficiency of a task manager with the warmth of a shared home. It moves away from the "cold app" aesthetic by introducing "Human Artifacts"—elements like the Post-it Note component that break the digital grid with rotation and analog textures. It prioritizes emotional connection through high-contrast typography and a vibrant, life-affirming emerald palette.



### 2. Colors

The palette is rooted in a deep, botanical dark mode (`#11211c`) contrasted with a high-energy "Bio-Green" (`#17cf91`).



- **The "No-Line" Rule:** Structural separation is achieved through background shifts (e.g., `surface_container_low` against `background`) or very low-opacity primary-colored strokes (`primary/10`). Solid 1px gray borders are strictly prohibited.

- **Surface Hierarchy:** The system uses "Tonal Nesting." A base `surface` hosts cards of `surface_container`, which in turn can host `surface_container_high` interactive elements.



### 3. Typography

We utilize **Plus Jakarta Sans** for its modern, geometric clarity and friendly apertures.



**Scale & Rhythm (Extracted):**

- **Display/Headline 1 (1.5rem / 24px):** Bold, tight tracking. Used for main mission headers.

- **Headline 2 (1.25rem / 20px):** Bold. Used for profile greetings.

- **Title (1.125rem / 18px):** Bold. Used for task titles.

- **Body (1rem / 16px):** Regular. Used for primary descriptions.

- **Supporting (0.875rem / 14px):** Medium. Used for metadata and button labels.

- **Micro (0.75rem / 12px or 10px):** Uppercase, wide tracking (+0.05em). Used for categories and secondary navigation labels.



The typographic hierarchy relies on extreme weight shifts—heavy bold for headings and light/medium for metadata—to create an editorial cadence.



### 4. Elevation & Depth

Depth is communicated through light and blur, not heavy shadows.



- **The Layering Principle:** Rather than shadows, use `primary/10` or `primary/20` fills to "lift" elements from the background.

- **Ambient Shadows:** We use two specific shadow levels:

- `shadow-sm`: A tight, subtle shadow for small cards.

- `shadow-lg`: A diffused, colored shadow (`primary/20`) used exclusively for primary action buttons (CTAs) to give them a "glow" effect.

- **Glassmorphism:** Navigation bars and sticky headers must use a `backdrop-blur-md` with a 95% opacity background to maintain context of the content scrolling beneath.



### 5. Components

- **Primary Buttons:** High-saturation emerald (`#17cf91`) with dark text. Rounded-xl (1rem). They utilize a 95% scale transform on active states.

- **The "Intercambio" Card:** A specialized dashed-border component (`border-dashed border-primary/40`) used for secondary or "community" actions.

- **Action Chips:** Smaller, secondary buttons use `primary/20` backgrounds with `primary` text, avoiding the "heavy" look of a solid button.

- **Navigation:** Bottom navigation uses "active state containers"—a rounded-xl box (`primary/10`) that appears behind the active icon.

### 6. Extracted Foundations (March 2026)

The first extraction pass introduced reusable UI primitives under [src/components/ui](../src/components/ui) powered by CVA variants (`class-variance-authority`).

- **Button (`Button.tsx`)**
- Variants: `primary`, `ghost`, `icon`, `selector`, `modalAction`, `danger`, `subtle`
- Sizes: `sm`, `md`, `lg`, `icon`, `menu`
- States: `active`, `loading`, `disabled`, `fullWidth`

- **Card (`Card.tsx`)**
- Variants: `surface`, `elevated`, `modal`, `info`, `error`, `subtle`
- Radius scale: `xl`, `2xl`, `3xl`
- Padding scale: `none`, `sm`, `md`, `lg`, `xl`

- **Form primitives (`FormField.tsx`, `TextInput.tsx`)**
- Shared label/error treatment for auth and create flows
- Input variants: `surface`, `elevated`, `soft` and size scale `md`/`lg`/`xl`

- **Feedback and utility primitives**
- `ErrorBanner.tsx` (tone variants)
- `Badge.tsx` (primary/success/warning/danger/neutral)
- `IconBox.tsx` (consistent icon containers)
- `ListRow.tsx` (row shell for dashboard and expenses)

### 7. Semantic Tokens

The token layer in [src/index.css](../src/index.css) now includes semantic values used by the extracted components:

- **Surface and border tokens**
- `--color-surface-1`, `--color-surface-2`, `--color-surface-3`
- `--color-border-subtle`, `--color-border-strong`

- **Status tokens**
- `--color-success`, `--color-warning`, `--color-danger`

- **Shape/elevation/motion tokens**
- Radius: `--radius-sm`, `--radius-md`, `--radius-lg`, `--radius-xl`
- Shadows: `--shadow-card-sm`, `--shadow-glow-primary`
- Motion: `--motion-fast`, `--motion-base`, `--motion-slow`
- Layering: `--z-modal`, `--z-fab`

### 8. Do's and Don'ts



- **Do:** Use rotation on "Note" components to break the grid.

- **Do:** Use uppercase micro-labels with letter spacing for category tags.

- **Don't:** Use pure white text; use the Slate-100 or Slate-200 off-whites to prevent eye strain against the emerald background.

- **Don't:** Use sharp 0px corners. Every element must have at least a `rounded-lg` (0.5rem) or `rounded-xl` (1rem) corner to maintain the "Hearth" softness.