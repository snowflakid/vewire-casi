# Project: Vewire Casino (vewire-casi)

## Overview
Vewire Casino is a cryptocurrency casino prototype built with **React**, **Vite**, and **TypeScript**. It features a collection of classic provably fair gambling games such as Crash, Mines, Dice, Plinko, and Slots. The application uses **Supabase** for data persistence and **Tailwind CSS** for styling.

## Tech Stack
*   **Frontend Framework:** React 19 (via Vite)
*   **Language:** TypeScript
*   **Styling:** Tailwind CSS (v4)
*   **Backend / Database:** Supabase (PostgreSQL)
*   **Icons:** Lucide React
*   **Crypto/Hashing:** crypto-js (for provably fair logic)

## Key Features
*   **Provably Fair System:** Implements HMAC-SHA256 hashing to ensure game results are deterministic and verifiable by the client. See `src/utils/provably-fair.ts`.
*   **Game Engine:** Custom implementations for various games using `requestAnimationFrame` for animations (e.g., Crash graph).
*   **Authentication:** Custom manual authentication implementation (currently stores password hashes in a `users` table). **Note:** This is a prototype implementation; production versions should use Supabase Auth.
*   **Theming:** Dark mode centric design with theme synchronization via `SettingsContext`.

## Getting Started

### Prerequisites
*   Node.js (v20+ recommended)
*   npm or yarn

### Installation
1.  Install dependencies:
    ```bash
    npm install
    ```

### Configuration
Create a `.env` file in the root directory with your Supabase credentials (or use the provided defaults for local development if applicable):

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Running the Project
*   **Development Server:**
    ```bash
    npm run dev
    ```
*   **Build for Production:**
    ```bash
    npm run build
    ```
*   **Linting:**
    ```bash
    npm run lint
    ```

## Architecture & Conventions

### Directory Structure
*   `src/games/`: Individual game components (e.g., `Crash.tsx`, `Mines.tsx`). Each game generally handles its own logic and animation loop.
*   `src/context/`: Global state management.
    *   `AuthContext.tsx`: Manages user session, login/register logic, and leaderboard data syncing.
    *   `SettingsContext.tsx`: Handles application settings like sound and theme.
*   `src/utils/`: shared utility logic.
    *   `provably-fair.ts`: Core class for generating deterministic game results using Server Seed + Client Seed + Nonce.
*   `src/lib/`: External library initialization (`supabase.ts`).

### Database Schema
The Supabase database consists of a `public.users` table tracking:
*   Balance & Weekly Balance
*   Stats (wins, bets, wagered amount)
*   Theme preference
*   *See `supabase_schema.sql` for the full definition.*

### Game Development Pattern
Games typically follow this pattern (seen in `Crash.tsx`):
1.  **State Refs:** Use `useRef` to hold mutable game state (like `isPlaying`, `multiplier`) accessed inside the animation loop to avoid closure staleness.
2.  **Animation Loop:** `requestAnimationFrame` drives the visual updates.
3.  **Provably Fair Calculation:** Results are pre-calculated at the start of the game using `ProvablyFair.generateResult()`.
4.  **Balance Updates:** The game component calls `setBalance` and `onGameEnd` props to update the global user state.
