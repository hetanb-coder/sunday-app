---
name: Sunday Morning
colors:
  surface: '#fff8f5'
  surface-dim: '#e1d8d4'
  surface-bright: '#fff8f5'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#fbf2ed'
  surface-container: '#f5ece7'
  surface-container-high: '#efe6e2'
  surface-container-highest: '#e9e1dc'
  on-surface: '#1e1b18'
  on-surface-variant: '#57423e'
  inverse-surface: '#34302c'
  inverse-on-surface: '#f8efea'
  outline: '#8a716c'
  outline-variant: '#dec0ba'
  surface-tint: '#a43c28'
  primary: '#a43c28'
  on-primary: '#ffffff'
  primary-container: '#ff7f66'
  on-primary-container: '#731808'
  inverse-primary: '#ffb4a5'
  secondary: '#735c00'
  on-secondary: '#ffffff'
  secondary-container: '#fcd664'
  on-secondary-container: '#745c00'
  tertiary: '#006b5c'
  on-tertiary: '#ffffff'
  tertiary-container: '#00b9a1'
  on-tertiary-container: '#004339'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#ffdad3'
  primary-fixed-dim: '#ffb4a5'
  on-primary-fixed: '#3f0400'
  on-primary-fixed-variant: '#842413'
  secondary-fixed: '#ffe088'
  secondary-fixed-dim: '#e7c353'
  on-secondary-fixed: '#241a00'
  on-secondary-fixed-variant: '#574500'
  tertiary-fixed: '#6cf9df'
  tertiary-fixed-dim: '#4adcc3'
  on-tertiary-fixed: '#00201b'
  on-tertiary-fixed-variant: '#005045'
  background: '#fff8f5'
  on-background: '#1e1b18'
  surface-variant: '#e9e1dc'
typography:
  display-lg:
    fontFamily: Epilogue
    fontSize: 40px
    fontWeight: '700'
    lineHeight: 48px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Epilogue
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 38px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Epilogue
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  title-lg:
    fontFamily: Manrope
    fontSize: 20px
    fontWeight: '700'
    lineHeight: 28px
  body-lg:
    fontFamily: Manrope
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Manrope
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-md:
    fontFamily: Manrope
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: 0.05em
  label-sm:
    fontFamily: Manrope
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 8px
  container-padding: 24px
  gutter: 16px
  card-gap: 20px
  section-margin: 40px
---

## Brand & Style

This design system is built for a "human-first" mobile experience that prioritizes calm over productivity and warmth over efficiency. The aesthetic is rooted in **Premium Minimalism** with a tactile, editorial soul. It rejects the cold, blue-toned "SaaS" look in favor of a palette that feels like sun-drenched paper and organic textures.

The visual narrative is "Optimistic Presence." It uses structured layouts and distinctive geometric headlines to create a sense of organized peace. The experience should feel like a slow morning—spacious, intentional, and encouraging. Key pillars include:
- **Luxurious Whitespace:** Content is never crowded; margins are generous to reduce cognitive load.
- **Organic Geometry:** High-radius corners and soft outlines replace harsh edges.
- **Editorial Polish:** Using bold typography as a structural element rather than just a medium for information.

## Colors

The palette is anchored by the **Warm Vanilla (#FDFBF7)** background, which provides a soft, non-clinical canvas. **Sunday Coral (#FF7F66)** serves as the primary energetic driver for actions and highlights, while **Golden Yellow** is used sparingly for moments of delight or achievement.

To maintain an editorial feel, we use **Deep Charcoal (#2D2926)** for typography, ensuring high legibility without the jarring contrast of pure black. Supporting categories use a desaturated, earthy trio:
- **Sage:** For nature, growth, or calm tasks.
- **Rose:** For personal connection and reflection.
- **Sky:** For expansive thinking or focused breathing.

Avoid gradients. Use solid fills or very subtle tonal shifts to maintain a contemporary, flat-yet-tactile appearance.

## Typography

This design system employs a sophisticated pairing to balance character with readability. 

**Epilogue** is our display face. Its geometric, slightly eccentric construction provides the "editorial" edge. Use it for headers and milestone numbers to ground the layout. 

**Manrope** is our workhorse. Its balanced, modern proportions ensure that long-form body text and interface labels feel trustworthy and clear. 

For mobile efficiency:
- `display-lg` is reserved for empty states or hero dashboards.
- Use `label-md` with 0.05em letter spacing for sub-headers and category tags to create a rhythmic "card header" look.

## Layout & Spacing

The layout philosophy follows a **Fixed-Fluid hybrid** model optimized for mobile. While the content scales to the device width, we maintain a strict **24px container padding** to ensure breathing room on all sides.

A standard 4-column or 8-column grid is used for internal card structures, but the primary rhythm is vertical. 
- **The 8px Rule:** All spacing between elements must be a multiple of 8px.
- **Breathing Room:** Components like cards should have at least 40px of vertical separation between distinct logical sections.
- **Density:** We prioritize "Low Density." Avoid fitting more than three primary interactive elements on the screen at once (above the fold).

## Elevation & Depth

To maintain a "warm and human" feel, we avoid harsh, high-offset shadows. Depth is communicated through two primary methods:

1.  **Tonal Layering:** The background is `#FDFBF7`. Primary containers (Cards) should use pure White or a slightly lighter tint of the background to appear "raised."
2.  **Soft Ambient Shadows:** When a card needs to pop, use a very diffused shadow: `Y: 4, Blur: 20, Color: rgba(45, 41, 38, 0.04)`. The shadow should feel like a subtle "glow" of darkness rather than a hard drop shadow.
3.  **Keyline Borders:** Instead of shadows, use 1px solid borders in a slightly darker vanilla tone (`#F1EEE4`) to define secondary elements. This keeps the UI flat but structured.

## Shapes

The shape language is "Soft Geometric." We avoid perfect circles for everything except specific action buttons to prevent a "bubbly" or childish look.

- **Primary Cards:** Use a generous `24px` radius to feel approachable and modern.
- **Secondary Elements (Chips/Tags):** Use a `12px` radius. This distinguishes them from cards and buttons.
- **Action Buttons:** Use a `16px` radius for a "squircle" feel that is easy to tap and visually distinct from the sharp 2px standard.
- **Inputs:** Match the button radius at `16px` to maintain consistency in the interactive layer.

## Components

### Buttons
- **Primary:** Sunday Coral background with White text. Bold Manrope caps.
- **Secondary:** Transparent background with Coral border (1.5px) and Coral text.
- **Tertiary/Ghost:** No border, Coral text. Used for "Cancel" or "Skip."

### Cards
Cards are the heart of the system. They feature a white background, 24px corner radius, and the ambient shadow defined in the Elevation section. Headers within cards should use `label-md` for categories and `headline-md` for the title.

### Chips & Tags
Used for categories (Sage, Rose, Sky). Chips have a `12px` radius and use a light tint of their category color (15% opacity) for the background with the full-strength color for the text and a 1px border.

### Input Fields
Soft vanilla fill (`#F7F3EB`) with a 1px border that turns Coral on focus. Typography is `body-md` in Deep Charcoal.

### Interactive Elements (Checkboxes/Radios)
When selected, these should fill with Sunday Coral and use a "spring" animation to feel tactile and responsive. Avoid simple checkmarks; use meaningful icons or custom states where possible to enhance the "human" feel.

### Navigation Bar
A floating pill-shaped container with high roundedness. Use subtle icons and `label-sm` for active states. The active indicator should be a soft Coral dot or a light background tint.