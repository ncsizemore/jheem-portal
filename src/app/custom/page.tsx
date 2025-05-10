// This page component is now primarily for routing.
// The actual iframe rendering is handled by AppViewManager in layout.tsx
// for /prerun and /custom routes.

export default function CustomPage() {
    return (
        <div>
            {/* Content for this page is managed by AppViewManager if on /custom */}
        </div>
    );
}