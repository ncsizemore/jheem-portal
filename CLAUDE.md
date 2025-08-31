# JHEEM Portal - Session Memory

## Project Context
- Modeling applications portal transitioning from Shiny apps to React/Next.js/AWS stack
- Ryan White model is first to transition (has interactive map + legacy prerun/custom)
- State level and CDC testing apps currently Shiny-only (embedded as iframes)
- Currently on temporary Vercel domain, preparing for live domain deployment

## Current Session Status (2025-08-31)

### ✅ COMPLETED (Previous Sessions)
- **Enhanced Embedded Shiny App Pages**: Both Ryan White State Level & CDC Testing pages now have sophisticated landing pages with floating controls, session preservation, and proper Footer integration
- **Standardized Footer Component**: All pages now use consistent dark Footer component
- **Improved Loading States**: Enhanced loading indicators with Hopkins branding
- **Fixed UI Issues**: Resolved iframe overlay problems, floating panel positioning

### 🔍 CURRENT FOCUS: Post-Enhancement Review & Optimization

After comprehensive code review, identified critical issues requiring immediate attention:

#### Priority 1: Security & Stability (CRITICAL)
- Fix build configuration (remove TypeScript/ESLint error ignoring)
- Address dependency vulnerabilities (Next.js, d3-color, etc.)
- Implement Content Security Policy headers
- Secure iframe configurations

#### Priority 2: Code Quality & Architecture (HIGH)
- Implement error boundaries across application
- Replace 'any' types with proper TypeScript interfaces  
- Add comprehensive testing infrastructure
- Refactor large components (450+ lines)

#### Priority 3: Performance Optimization (HIGH)
- Optimize bundle size (plotly.js 3.5MB, potential unused dependencies)
- Fix excessive re-renders in MapboxCityMap
- Implement proper memory management for plot data

#### Priority 4: Ryan White MSA Map Explorer UX (MEDIUM)
- Team feedback: unclear flow/UI, not obvious how to use
- Need better user guidance and intuitive interaction patterns

## Technical Stack
- Next.js 15+ with TypeScript
- Tailwind CSS
- Mapbox for mapping components
- Embedded Shiny apps via iframes

## Key Files
- Main pages: `/src/app/[model]/page.tsx`
- Components: `/src/components/`
- Navigation: `/src/components/Navigation.tsx`