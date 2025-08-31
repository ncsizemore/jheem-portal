# JHEEM Portal - Session Memory

## Project Context
- Modeling applications portal transitioning from Shiny apps to React/Next.js/AWS stack
- Ryan White model is first to transition (has interactive map + legacy prerun/custom)
- State level and CDC testing apps currently Shiny-only (embedded as iframes)
- Currently on temporary Vercel domain, preparing for live domain deployment

## Current Session Goals (2025-08-29)

### Priority 1: Enhance Embedded Shiny App Pages
- **Ryan White State Level** & **CDC Testing** pages need improvement
- Issue: Shiny apps slow to load, users see blank screen with no feedback
- Solutions needed:
  - Loading indicators/visual feedback
  - Proper landing page content (like basic Ryan White MSA model has)

### Priority 2: Improve Ryan White MSA Map Explorer UX
- Team feedback: unclear flow/UI, not obvious how to use
- Need better user guidance and intuitive interaction patterns

### Priority 3: Enhance Overall Design Aesthetic
- Current design lacks sophistication and creative elegance  
- Goal: More inspired, professional academic site design
- Consider elite university academic sites for reference
- Move beyond generic/template-like appearance

## Technical Stack
- Next.js 15+ with TypeScript
- Tailwind CSS
- Mapbox for mapping components
- Embedded Shiny apps via iframes

## Key Files
- Main pages: `/src/app/[model]/page.tsx`
- Components: `/src/components/`
- Navigation: `/src/components/Navigation.tsx`