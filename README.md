# Voltra - Minecraft Add-ons Marketplace

Voltra is a flagship, high-performance marketplace for discovering, sharing, and reviewing Minecraft Add-ons. It features a modern, accessible, and highly responsive user interface designed with a refined editorial design language, delivering an unmatched user experience.

## Design System

### Editorial Philosophy
The design philosophy of Voltra centers on a clean, professional "Editorial Dark Mode" aesthetic. Moving away from heavy, cluttered layouts, Voltra employs deliberate negative space, restrained typography weights, subtle border accents, and fluid interactions.

### Color Palette
- **Base Canvas:** Deep Charcoal/Zinc (`#07070a` / `zinc-950`) for a true eye-safe dark atmosphere.
- **Surfaces & Cards:** Refined Zinc (`#18181b` / `zinc-900`) with subtle border framing (`border-zinc-800/80`).
- **Typography:** Crisp White (`#ffffff`) for primary headers with Slate/Zinc muted text (`text-zinc-400`) for secondary information.
- **Accents:** 
  - Brand & Interactive: Indigo / White contrast elements with subtle focus rings.
  - Success/Status: Emerald (`emerald-600`) for download confirmations.
  - Likes & Ratings: Rose (`rose-400`) and Amber (`amber-400`).

### Editorial Typography Scale
- **Primary Typeface:** Clean, modern sans-serif typography paired with precise optical line heights.
- **Hierarchy:**
  - `H1`: 3xl to 5xl, Semi-Bold (`font-semibold`), tight tracking for hero sections.
  - `H2/H3`: Base to xl, Semi-Bold / Medium, for section dividers and card titles.
  - `Body`: text-xs to text-sm, Regular weight (`font-normal`), 1.5–1.6 line height for optimal legibility.
  - `Microcopy / Labels`: text-[10px] to text-[11px], Medium weight (`font-medium`), uppercase with wide tracking for tags and metadata.

### Performance & Interaction Enhancements
- **Scroll-Blended Navbar:** Seamlessly transitions from transparent to solid background upon scrolling to prevent visual distraction at the top of the viewport.
- **Instant Filter Drawer:** Replaced heavy spring-layout re-calculations with lightweight CSS height transitions for zero-lag filtering.
- **Grid Reflow Optimization:** Optimized grid rendering by removing heavy layout recalculation props, eliminating browser layout reflows during search or category filtering.

## Tech Stack & Architecture

### Frontend
- **Framework:** React 18+ with Vite
- **Styling:** Tailwind CSS (Utility-first, responsive, dark-mode native)
- **Animations:** Framer Motion (`motion/react`) for smooth, hardware-accelerated transitions
- **Icons:** Lucide React for consistent SVG iconography

### Backend & Database (Firebase Integration)
- **Database:** Firebase Firestore (NoSQL Document Database)
- **Authentication:** Firebase Auth (Google, Email/Password)
- **Storage:** Firebase Cloud Storage for add-on files and images

#### Database Schema Summary (Firestore)
- **`addons` (Collection)**
  - `id` (String): Unique identifier
  - `title` (String): Add-on title
  - `description` (String): Detailed description
  - `category` (String): Category (e.g., 'Resource Pack', 'Behavior Pack', 'World')
  - `status` (String): 'approved', 'pending', 'rejected'
  - `authorId` (String): Reference to `users` collection
  - `downloadsCount` (Number): Total downloads
  - `likesCount` (Number): Total likes
  - `averageRating` (Number): Aggregated rating
  - `tags` (Array<String>): Searchable tags
  - `images` (Array<String>): Image URLs
- **`users` (Collection)**
  - `uid` (String): Auth UID
  - `displayName` (String): Display name
  - `role` (String): 'user' | 'admin'
- **`reviews` (Sub-collection under `addons`)**
  - `userId` (String): Reviewer ID
  - `rating` (Number): 1-5 scale
  - `text` (String): Review body

## Accessibility & Performance
- **Image Optimization:** All images utilize `<FadeImage>` for seamless skeleton-to-image transitions without layout shifts.
- **Keyboard Navigation:** Full support with visible focus rings (`focus-visible:ring-2`) and proper ARIA labels across controls.
- **Contrast & Legibility:** WCAG 2.1 AA compliant color ratios.
