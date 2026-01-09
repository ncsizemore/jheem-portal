'use client';

import { usePathname } from 'next/navigation';
import React from 'react';

// URLs are now sourced from environment variables
const PRERUN_URL = process.env.NEXT_PUBLIC_SHINY_PRERUN_URL || "https://jheem.shinyapps.io/ryan-white-prerun/"; // Fallback URL
const CUSTOM_URL = process.env.NEXT_PUBLIC_SHINY_CUSTOM_URL || "https://jheem.shinyapps.io/ryan-white-custom/"; // Fallback URL

interface AppViewManagerProps {
    children: React.ReactNode;
}

export default function AppViewManager({ children }: AppViewManagerProps) {
    const pathname = usePathname();

    // Support both old routes (for backwards compatibility) and new /shiny/ routes
    const isPrerunRoute = pathname === '/prerun' || pathname === '/shiny/ryan-white-prerun';
    const isCustomRoute = pathname === '/custom' || pathname === '/shiny/ryan-white-custom';
    // Determines if the current route is one that should display an embedded Shiny app view.
    const isAppRoute = isPrerunRoute || isCustomRoute;

    // Styles for the container that will hold the iframes
    // This container needs to fill the space made available by the main layout
    const iframeContainerStyle: React.CSSProperties = {
        width: '100%',
        // height: '100%', // Let flex-grow handle height based on parent
        display: 'flex',
        flexDirection: 'column',
        flexGrow: 1, // This is key for taking available space
        minHeight: 0, // Essential for flex children that need to grow but also not overflow their parent
    };

    const iframeWrapperStyle: React.CSSProperties = { // Style for the divs that wrap each iframe
        display: 'flex', // Make this a flex container to help iframe fill it
        flexDirection: 'column',
        flexGrow: 1,
        minHeight: 0, // Also important here for the same reasons as above
        height: '100%', // Try to take full height of iframeContainerStyle when visible
    };

    const iframeStyle: React.CSSProperties = {
        width: '100%',
        height: '100%',
        border: 'none',
        flexGrow: 1, // Allow iframe to grow within its parent div (the iframeWrapper)
    };

    if (isAppRoute) {
        return (
            <div style={iframeContainerStyle}>
                {/* Each iframe is wrapped in a div that's conditionally displayed.
                The `key` prop helps React identify these iframes consistently,
                which is important for preserving their state when their parent (`AppViewManager`)
                re-renders but doesn't unmount. */}
                <div style={{ ...iframeWrapperStyle, display: isPrerunRoute ? 'flex' : 'none' }}>
                    <iframe
                        key="prerun-iframe-global"
                        src={PRERUN_URL}
                        title="Prerun Scenarios - JHEEM Interactive (Global)"
                        style={iframeStyle}
                    />
                </div>
                <div style={{ ...iframeWrapperStyle, display: isCustomRoute ? 'flex' : 'none' }}>
                    <iframe
                        key="custom-iframe-global"
                        src={CUSTOM_URL}
                        title="Custom Simulations - JHEEM Interactive (Global)"
                        style={iframeStyle}
                    />
                </div>
            </div>
        );
    }

    // For any other route, render the normal page children
    return <>{children}</>;
}