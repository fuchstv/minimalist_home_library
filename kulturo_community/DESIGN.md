---
name: Kulturo Community
colors:
  surface: '#fdf9f6'
  surface-dim: '#ddd9d6'
  surface-bright: '#fdf9f6'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f7f3f0'
  surface-container: '#f1edea'
  surface-container-high: '#ebe7e4'
  surface-container-highest: '#e5e2df'
  on-surface: '#1c1b1a'
  on-surface-variant: '#5e3f3a'
  inverse-surface: '#31302f'
  inverse-on-surface: '#f4f0ed'
  outline: '#926e69'
  outline-variant: '#e8bdb6'
  surface-tint: '#c00000'
  primary: '#9e0000'
  on-primary: '#ffffff'
  primary-container: '#cc0000'
  on-primary-container: '#ffdad4'
  inverse-primary: '#ffb4a8'
  secondary: '#006e1a'
  on-secondary: '#ffffff'
  secondary-container: '#8cf888'
  on-secondary-container: '#00731c'
  tertiary: '#003ec2'
  on-tertiary: '#ffffff'
  tertiary-container: '#0052f9'
  on-tertiary-container: '#dce1ff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#ffdad4'
  primary-fixed-dim: '#ffb4a8'
  on-primary-fixed: '#410000'
  on-primary-fixed-variant: '#930000'
  secondary-fixed: '#8ffa8a'
  secondary-fixed-dim: '#73dd71'
  on-secondary-fixed: '#002203'
  on-secondary-fixed-variant: '#005312'
  tertiary-fixed: '#dce1ff'
  tertiary-fixed-dim: '#b7c4ff'
  on-tertiary-fixed: '#001551'
  on-tertiary-fixed-variant: '#0039b4'
  background: '#fdf9f6'
  on-background: '#1c1b1a'
  surface-variant: '#e5e2df'
  white: '#FFFFFF'
  deep-black: '#000000'
typography:
  headline-xl:
    fontFamily: Montserrat
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Montserrat
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.01em
  headline-lg-mobile:
    fontFamily: Montserrat
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 36px
  headline-md:
    fontFamily: Montserrat
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  body-lg:
    fontFamily: Open Sans
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Open Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-sm:
    fontFamily: Open Sans
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-lg:
    fontFamily: Open Sans
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: 0.05em
  label-md:
    fontFamily: Open Sans
    fontSize: 12px
    fontWeight: '700'
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
  section-gap-lg: 80px
  section-gap-md: 48px
  container-max-width: 1200px
  gutter: 24px
  margin-mobile: 16px
  margin-desktop: 32px
---

## Brand & Style

The design system is built around the concept of a "Modern Cultural Hub." It balances the energy of a vibrant community center with the clarity of a modern digital platform. The personality is warm, inclusive, and education-focused, designed to make language and cultural exchange feel accessible rather than academic.

The visual style is a hybrid of **Minimalism** and **Modern Humanist** design. It leverages significant white space to allow content to breathe, paired with bold, circular accents that represent unity and conversation. The interface avoids cold, clinical layouts in favor of soft surfaces and high-contrast focal points that guide the user toward participation and connection.

## Colors

The palette is anchored by a vibrant, high-energy red used for primary actions and brand presence. This red signifies passion and the "heart" of the community. To prevent the red from becoming overwhelming, it is paired with a warm, off-white neutral (`#FAF6F3`) which serves as the primary canvas color, providing a softer, more inviting background than pure white.

A secondary "Growth Green" is utilized for success states and secondary accents, referencing vitality and learning. Pure white is reserved for cards and elevated surfaces to create clear visual separation from the warm background. Text is primarily handled in deep black or dark variations of the primary red to maintain high accessibility.

## Typography

The typography system uses a dual-sans approach to distinguish between brand presence and information density. **Montserrat** is the chosen headline face; its geometric structure and wide stance lend a modern, confident, and authoritative voice to headers. 

**Open Sans** is used for all body text, UI labels, and inputs. It provides a friendly, approachable contrast to Montserrat and ensures high legibility across long-form cultural articles and event listings. Large headlines use slightly tighter letter spacing to create a cohesive "block" look, while labels utilize increased spacing and uppercase styling for hierarchy and scanability.

## Layout & Spacing

This design system employs a **Fixed Grid** model for desktop, centering content within a 1200px container to maintain readability and focus. On mobile devices, the layout transitions to a fluid 4-column system.

The spacing philosophy is generous, prioritizing "white space" to reduce cognitive load. A strict 8px base unit governs all dimensions. Sections are separated by large vertical gaps (80px on desktop) to clearly delineate different content areas. Information density should be kept low, especially in marketing and landing pages, to preserve the "clean and modern" aesthetic.

## Elevation & Depth

Hierarchy is achieved through **Tonal Layering** rather than heavy shadows. The primary background is the neutral off-white, while interactive components and content containers occupy white "plates" (`#FFFFFF`).

Depth is subtly indicated using:
- **Low-contrast outlines:** 1px borders in a darkened version of the neutral tone are used for cards and inputs.
- **Ambient Tinted Shadows:** When elevation is required (e.g., on hover for cards), use very soft, diffused shadows with a slight red tint (`rgba(204, 0, 0, 0.04)`) to maintain the brand's warmth.
- **Flat Overlays:** Modals and dropdowns use clean edges with a slightly higher elevation shadow but no heavy borders.

## Shapes

The shape language is defined by **rounded and circular motifs**. While standard UI containers (cards, buttons) use a `0.5rem` radius to feel approachable yet structured, "Brand Elements" use full circles.

Circular elements should be used for:
- User avatars and profile images.
- Icon backgrounds.
- Decorative background motifs that "peek" from the corners of sections.
- Image masks for featured community members or event highlights.

## Components

### Buttons
Primary buttons are solid red (`#CC0000`) with white text and `0.5rem` corner radius. Secondary buttons use a red outline with a transparent background. Hover states should involve a slight darkening of the red or a very subtle lift using an ambient shadow.

### Cards
Cards should be pure white (`#FFFFFF`) sitting on the neutral background (`#FAF6F3`). They feature a 1px soft border and the standard `0.5rem` rounding. Content inside cards should have generous internal padding (at least 24px).

### Input Fields
Inputs utilize the neutral background with a slightly darker stroke. On focus, the border shifts to the primary red. Labels are positioned above the field using the `label-lg` typographic style.

### Chips & Tags
Chips are pill-shaped (fully rounded) and use a light tint of the primary or secondary colors (e.g., 10% opacity red) to categorize events or topics without competing with primary buttons.

### Lists
Lists in this system are "airy," with significant vertical spacing between items. Dividers, if used, should be thin, light-gray lines that do not span the full width of the container.

### Circular Accents
To reinforce the brand identity, use circular "floating" icons or decorative blobs in the background to break up the linear nature of the grid. These should be in low-opacity primary red or secondary green.