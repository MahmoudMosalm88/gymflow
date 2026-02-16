# GymFlow SaaS Web Design System Documentation

This document outlines the core design principles, typography, color palette, and component integration strategy for the GymFlow SaaS web application UI redesign. It serves as a guide for maintaining consistency and achieving the "modern & premium" aesthetic.

---

## 1. Vision & Goals

**Overall Aesthetic:** Modern & Premium
**Key Objectives:** Increase conversion, enhance user experience for gym owners, full mobile optimization, full RTL and functional Arabic support.

---

## 2. Typography

The font system is built upon the IBM Plex typeface family, chosen for its professional, modern aesthetic, excellent readability, and robust support for both Latin and Arabic scripts.

*   **Latin Font (English):** IBM Plex Sans
    *   **Usage:** Primary font for all Latin text within the application.
    *   **Weights:** Light (300), Regular (400), Medium (500), SemiBold (600), Bold (700)
    *   **Tailwind CSS Variable:** `--font-sans`

*   **Arabic Font (العربية):** IBM Plex Sans Arabic
    *   **Usage:** Primary font for all Arabic text within the application.
    *   **Weights:** Light (300), Regular (400), Medium (500), SemiBold (600), Bold (700)
    *   **Tailwind CSS Variable:** `--font-arabic`

**Integration:**
Fonts are loaded via `next/font/google` in `app/layout.tsx` and applied using Tailwind CSS `font-sans` and `font-arabic` classes, which reference the respective CSS variables.

---

## 3. Color Palette

The color palette is designed to evoke a "modern & premium" feel, combining a deep, stable primary blue with a vibrant accent orange, supported by a comprehensive neutral grayscale and clear semantic colors. The palette is fully integrated with Tailwind CSS using HSL CSS variables, enabling seamless light and dark mode support.

### Core Colors

*   **Primary:** Deep Blue
    *   **HSL (Light):** `231 48% 48%` (Equivalent to `#3F51B5`)
    *   **HSL (Dark):** `217.2 91.2% 59.8%` (Lighter blue for contrast in dark mode)
    *   **Usage:** Main interactive elements, primary buttons, significant highlights, branding elements.

*   **Accent:** Vibrant Orange
    *   **HSL (Light/Dark):** `33 100% 50%` (Equivalent to `#FF8C00`)
    *   **Usage:** Call-to-action buttons, interactive states, secondary highlights, notifications. This color maintains brand recognition from the landing page.

### Neutral Grayscale

A full range of neutral colors is provided for backgrounds, text, borders, and UI elements to ensure high contrast and readability in both light and dark modes.

*   **Background:** White (light mode), Very Dark Blue/Gray (dark mode)
    *   **HSL (Light):** `0 0% 100%`
    *   **HSL (Dark):** `224 71.4% 4.1%`
*   **Foreground (Text):** Very Dark Gray (light mode), Light Gray (dark mode)
    *   **HSL (Light):** `222.2 47.4% 11.2%`
    *   **HSL (Dark):** `210 20% 98%`
*   **Border/Input/Ring:** Defined to provide subtle separation and focus states.

### Semantic Colors

Used for conveying status, alerts, and feedback.

*   **Success (Green):**
    *   **HSL:** `142.1 76.2% 36.3%` (Equivalent to `#4CAF50` approx.)
    *   **Usage:** Positive confirmations, successful operations.
*   **Warning (Yellow):**
    *   **HSL:** `48 96% 63%` (Equivalent to `#FFC107` approx.)
    *   **Usage:** Cautionary messages, non-critical alerts.
*   **Destructive/Error (Red):**
    *   **HSL:** `0 84.2% 60.2%` (Equivalent to `#F44336` approx.)
    *   **Usage:** Error messages, critical actions (e.g., delete).
*   **Info (Blue):**
    *   **HSL:** `200 80% 50%` (Equivalent to `#2196F3` approx.)
    *   **Usage:** Informational messages, contextual hints.

**Integration:**
All colors are exposed as Tailwind CSS classes (e.g., `text-primary`, `bg-accent`, `border-destructive`), referencing the HSL CSS variables defined in `globals.css`.

---

## 4. `shadcn/ui` Component Integration

`shadcn/ui` components form the foundation of the GymFlow SaaS UI. They are built on Radix UI primitives for accessibility and unstyled by default, allowing for deep customization with Tailwind CSS.

**Strategy:**

1.  **CSS Variables for Theming:** `shadcn/ui` components automatically consume the CSS variables defined in `globals.css` (e.g., `--primary`, `--background`). This ensures a consistent theme across all components.
2.  **Tailwind CSS Customization:** Components are styled primarily using Tailwind CSS classes within their `className` or `variant` props. This allows for rapid iteration and adherence to the design system's aesthetic (e.g., rounded corners, shadows, spacing, typography).
3.  **Local Component Modification:** Components are copied directly into the project (`components/ui/`) rather than installed as a dependency. This allows for full control over their code and enables project-specific modifications when necessary, while still benefiting from Radix UI's accessibility and headless features.
4.  **`cn` Utility:** The `cn` helper function (`@/lib/utils`) is used for conditionally joining Tailwind CSS classes, simplifying dynamic styling.

---

## 5. Right-to-Left (RTL) Guidance

Full RTL support is a core requirement for the Arabic version of GymFlow SaaS.

**Principles:**

*   **`dir="rtl"` on `<html>`:** The primary mechanism for enabling RTL is setting the `dir` attribute of the `<html>` element to `rtl` when the active language is Arabic. This automatically flips the layout direction for block-level elements and text flow.
*   **Tailwind CSS & RTL:** Tailwind CSS classes (e.g., `ml-auto`, `mr-4`) inherently adapt to `dir="rtl"` when used correctly (e.g., `start` and `end` utilities like `ps-4` for padding-inline-start).
*   **`shadcn/ui` Components:** Components from `shadcn/ui` (built on Radix UI) generally support RTL out-of-the-box or require minimal configuration. Visual components like sliders or progress bars will correctly mirror their direction.
*   **Icon Mirroring:** Icons that convey direction (e.g., arrows for navigation, pagination) must be visually mirrored in RTL mode. This can be achieved conditionally in React or via CSS transformations.
*   **Text Alignment:** Text alignment within containers should respond to the `dir` attribute (e.g., default `text-left` becomes `text-right` in RTL). Explicit `text-start` or `text-end` is preferred for direction-aware alignment.
*   **Input Fields:** Placeholder text and cursor behavior in input fields will naturally adapt to RTL.
*   **Language Specific Content:** All UI labels, messages, and content will be provided in Arabic when the `dir="rtl"` attribute is active.
*   **Testing:** Thorough testing of all screens in both LTR and RTL modes is crucial to ensure functional and visual correctness.
