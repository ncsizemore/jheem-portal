# JHEEM Interactive Application Portal

This project is a Next.js-based web portal designed to serve as a unified interface for accessing different functionalities of the JHEEM (Johns Hopkins Epidemiological and Economic Model) interactive applications.

Currently, it provides access to "Prerun Scenarios" and "Custom Simulations" from the `jheem2_interactive` Shiny application.

## Getting Started

### Prerequisites

*   Node.js (LTS version recommended, e.g., v18.x or v20.x)
*   npm (comes with Node.js)
*   A running instance of the `jheem2_interactive` Shiny application.

### Installation

1.  Clone the repository (if you haven't already):
    ```bash
    git clone <your-repository-url>
    cd jheem-portal
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```

### Running the Portal Locally

1.  **Ensure your local `jheem2_interactive` Shiny application is running.**
    The portal expects the Shiny app to be accessible. By default, it's configured to look for the Shiny app at:
    *   Prerun: `http://127.0.0.1:4927/?initial_tab=prerun`
    *   Custom: `http://127.0.0.1:4927/?initial_tab=custom`
    These URLs are currently configured in `src/components/AppViewManager.tsx`. (Future improvement: Use environment variables).

2.  Run the Next.js development server:
    ```bash
    npm run dev
    ```

3.  Open [http://localhost:3000](http://localhost:3000) with your browser to see the portal.

## Key Architectural Features

*   **Persistent Iframes:** The portal uses a component (`src/components/AppViewManager.tsx`) integrated into the main layout (`src/app/layout.tsx`). This manager renders the "Prerun Scenarios" and "Custom Simulations" views within iframes.
*   **State Preservation:** By keeping the iframes persistently loaded within the main layout and toggling their visibility, the state of the underlying Shiny application is preserved when navigating between the "Prerun" and "Custom" sections in the portal.

## Development Scripts

*   `npm run dev`: Starts the development server.
*   `npm run build`: Builds the application for production.
*   `npm run start`: Starts a production server (after building).
*   `npm run lint`: Lints the codebase using ESLint.

## Future Enhancements (Phase 1 Considerations)

*   **Scroll Position Persistence:** Investigate preserving the scroll position within the iframes when switching views.

## Deployment

(Details to be added - typically deployed to platforms like Vercel or Netlify.)

---

*This project was bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app) and uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) with the [Geist](https://vercel.com/font) font family.*
