# DESIGN.md

# Design Implementation Rules (MANDATORY)

## Primary Objective

The provided reference image is the **single source of truth** for the entire UI.

Your task is **NOT** to create a similar design.

Your task is **NOT** to improve the design.

Your task is **NOT** to reinterpret the design.

Your task is to reproduce the interface so accurately that, when placed beside the reference image, the implementation is visually indistinguishable.

Everything should match the reference image as closely as technically possible.

---

# Absolute Rule

Treat the image as a specification, not inspiration.

Do not make creative decisions.

Do not modernize anything.

Do not simplify anything.

Do not "use best practices" if they change the appearance.

Do not replace layouts with your preferred implementation.

Every decision must come from the reference image.

---

# Before Writing Code

Thoroughly inspect the image.

Do not immediately begin coding.

First identify every visual detail including:

- overall page dimensions
- spacing system
- grid structure
- alignment
- margins
- padding
- typography
- font weights
- font sizes
- line heights
- letter spacing
- icon sizes
- border radius
- border thickness
- shadows
- opacity
- gradients
- colors
- image crops
- positioning
- stacking order
- whitespace
- component hierarchy
- responsive behavior (when inferable)

Only after fully understanding the design should implementation begin.

---

# Pixel Accuracy

Everything must match the reference including:

- exact spacing
- exact proportions
- exact alignment
- exact component sizes
- exact typography
- exact button dimensions
- exact icon placement
- exact image placement
- exact padding
- exact corner radius
- exact shadows
- exact borders
- exact color values
- exact gradients
- exact transparency
- exact visual hierarchy

Avoid approximations whenever possible.

---

# Typography

Match:

- font family
- font weight
- font size
- line height
- letter spacing
- capitalization
- text alignment
- paragraph spacing

Do not substitute different typography styles unless the original font is unavailable.
DO NOT CHANGE THE FONT

---

# Colors

Extract colors directly from the image.

Do not estimate.

Do not replace colors with "close enough."

Preserve:

- backgrounds
- cards
- buttons
- text
- icons
- dividers
- borders
- gradients
- shadows

---

# Layout

Reproduce:

- page width
- container width
- gutters
- margins
- padding
- section spacing
- alignment
- columns
- rows
- responsive behavior

Do not reorganize components.

---

# Components

Every component should match the image.

Including:

- cards
- buttons
- inputs
- navigation
- menus
- tabs
- badges
- chips
- avatars
- progress bars
- images
- icons
- dividers

No redesigns.

No substitutions.

---

# Icons

Use icons that visually match the reference.

Their:

- size
- weight
- spacing
- color
- alignment

must match the image.

---

# Images

Maintain:

- crop
- aspect ratio
- positioning
- corner radius
- scaling
- shadows
- overlays

Never crop differently unless required by responsiveness.

---

# Responsiveness

Desktop implementation should match the reference exactly.

When adapting for smaller screens:

Maintain the same:

- visual hierarchy
- spacing ratios
- typography scale
- alignment
- component proportions

Do not redesign the mobile layout unless absolutely necessary.

---

# Implementation

Use clean, reusable components internally.

However:

Visual accuracy always takes priority over implementation preference.

Never change the UI simply because another implementation seems cleaner.

---

# Validation Checklist

Before considering the task complete, compare the implementation against the reference image and verify:

- Layout matches exactly
- Typography matches exactly
- Colors match exactly
- Shadows match exactly
- Border radii match exactly
- Borders match exactly
- Images match exactly
- Icons match exactly
- Padding matches exactly
- Margins match exactly
- Component sizes match exactly
- Alignment matches exactly
- Visual hierarchy matches exactly
- Overall appearance is indistinguishable from the reference

If any visible difference remains, continue refining until it is eliminated.

---

# Final Requirement

The finished interface should appear to be the same design recreated in code—not a redesign, reinterpretation, or approximation.

The implementation should be visually indistinguishable from the supplied reference image.