# Voltra

Voltra is a premium platform for discovering, sharing, and reviewing Minecraft Add-ons. Designed with a sleek, modern UI, it offers a fast, responsive, and intuitive experience for both creators and players.

## Features

- **Premium UI/UX**: Built with a sleek, dark-themed design using Tailwind CSS and Framer Motion for buttery-smooth animations and transitions.
- **Discover Add-ons**: Browse a curated list of Minecraft Add-ons with advanced filtering, sorting, and search capabilities.
- **User Authentication**: Secure login, registration, and password reset functionalities powered by Firebase Authentication.
- **Author Profiles**: Dedicated profiles for creators to showcase their add-ons.
- **Review System**: Users can rate and review their favorite add-ons.
- **Real-time Database**: Powered by Firebase Firestore for robust data management.
- **Responsive Design**: Fully responsive layout optimized for mobile, tablet, and desktop devices.

## Tech Stack

- **Frontend Framework**: React (Vite, TypeScript)
- **Styling**: Tailwind CSS
- **Animations**: Framer Motion
- **Icons**: Lucide React
- **Backend & Database**: Firebase (Authentication, Firestore, Storage)

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- Firebase Project

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/voltra.git
   cd voltra
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure Environment Variables**
   Create a `.env` file in the root directory and add your Firebase configuration:
   ```env
   VITE_FIREBASE_API_KEY=your_api_key
   VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
   VITE_FIREBASE_PROJECT_ID=your_project_id
   VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
   VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   VITE_FIREBASE_APP_ID=your_app_id
   ```

4. **Start the Development Server**
   ```bash
   npm run dev
   ```

5. **Build for Production**
   ```bash
   npm run build
   ```

## Design System

Voltra employs a sophisticated dark theme utilizing deep zinc tones (`zinc-900`, `zinc-950`) combined with high-contrast white and subtle accents (`amber-400`, `rose-500`, `emerald-500`) for specific states (reviews, likes, success).

### Typography
- **Hierarchy**: Clear distinction between headings (bold, tight tracking) and body text (medium/light, relaxed leading).

### Layout & Components
- **Fluid Grid System**: Built mobile-first, ensuring pixel-perfect alignment across all viewports.
- **Glassmorphism**: Strategic use of translucent backgrounds (`bg-zinc-900/60`, `backdrop-blur-3xl`) to establish hierarchy and depth.
- **Micro-interactions**: Hover, active, and focus states are meticulously designed to provide immediate, satisfying feedback without performance penalties.

## License

This project is licensed under the MIT License.
