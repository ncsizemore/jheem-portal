# HIV Age Distribution Interactive App - Planning Document

## Project Context

### Research Goal
Transform static stacked area charts showing projected HIV age distributions (2025-2040) by state into an interactive web application. This represents a departure from our simulation-based models and provides an opportunity to test modern web visualization approaches.

### Key Figure Reference
- Static visualization shows age cohorts (13-24, 25-34, 35-44, 45-54, 55+ years) as stacked areas
- Time series from 2025-2040 showing aging HIV population trends
- State-by-state breakdown with significant variation in patterns
- Located at: `/Users/cristina/wiley/captures/Screenshot 2025-10-13 at 12.03.31 PM.png`

## Codebase Analysis Findings

### Existing Portal Architecture (`/Users/cristina/wiley/Documents/jheem-portal`)

**App Structure Patterns:**
- Route-based organization: `/src/app/[model]/page.tsx`
- Navigation integration via `src/components/Navigation.tsx` with main menu items
- Two app paradigms: embedded Shiny (iframe-based) vs. modern React (map explorer)

**Data Patterns Observed:**
- City-based data in `src/data/cities.ts` with coordinates and metadata
- API discovery pattern: `/plots/cities` → `/plots/search` → `/plot` endpoints
- Hook-based data fetching: `src/hooks/useAvailableCities.ts`
- Static reference data combined with dynamic API calls

**Visualization Components:**
- `src/components/MapPlotOverlay.tsx` - Full-screen Plotly.js overlays with cinematic styling
- `src/components/TestPlotViewer.tsx` - Multiple plot display patterns
- `src/components/ScenarioSelectionPopup.tsx` - Modal selection interfaces
- `src/components/MapboxCityMap.tsx` - Geographic interaction patterns

**Design System:**
- Johns Hopkins colors: `hopkins-blue` (#002D72), `hopkins-spirit-blue` (#68ACE5), `hopkins-gold` (#F2C413)
- Tailwind 4 with custom theme in `src/app/globals.css`
- Framer Motion animations throughout
- Academic/professional aesthetic with clean layouts

### Backend Analysis (`/Users/cristina/wiley/Documents/jheem-backend`)

**Current Architecture:**
- AWS serverless: Lambda + API Gateway + S3 + DynamoDB
- Pre-computed plot approach: R generates JSON → S3 storage → API serving
- Composite key structure in DynamoDB (`city_scenario` + `outcome_stat_facet`)
- Production cost-effective: ~$1-2/month vs $50/month Shiny apps

**Key Files Reviewed:**
- `serverless.yml` - Stage-based deployment configuration
- `src/handlers/plot_discovery.py` - Search and registration logic
- Production endpoints serving existing React map explorer

## Open Questions & Considerations

### Data Structure (Awaiting Input)
- **Unknown**: Exact format of raw data arrays from colleague
- **Unknown**: Whether data includes confidence intervals, scenarios, or just baseline projections
- **Unknown**: Data volume and complexity - affects static vs. API approach
- **Geographic limitation**: Not all 50 states available (rules out full US map approach)

### Technical Architecture Decisions

**Data Storage Options:**
1. **Static bundling** - Include data directly in frontend (`/src/data/` pattern)
   - Pros: Simple, fast, no backend needed
   - Cons: Larger bundle size, no dynamic updates
   - Best for: Limited, static datasets

2. **Extend existing backend** - Add endpoints following current patterns
   - Pros: Leverages existing infrastructure, scalable
   - Cons: More complex, backend maintenance
   - Best for: Large, dynamic, or frequently updated data

**Visualization Library Exploration Needed:**
- **Current**: Portal uses Plotly.js via R-generated JSONs
- **Opportunity**: Test modern alternatives (D3.js, Recharts, Nivo, Observable Plot)
- **Decision factors**: Data complexity, interactivity needs, bundle size, maintenance

**Interface Approach Options:**
- **List-based selection** - Simple dropdown/sidebar for available states
- **Simplified map** - Small subset of states with available data
- **Data-first approach** - Lead with temporal trends, state selection secondary

## Existing Code Patterns to Leverage

### Proven Component Patterns:
- Error boundaries: `src/components/ErrorBoundary.tsx`
- Loading states and timeouts in API hooks
- React.memo optimization patterns in map components
- Framer Motion animation patterns throughout

### Navigation Integration:
- Add to main menu in `src/components/Navigation.tsx`
- Follow existing route structure: `/src/app/hiv-age-projections/page.tsx`
- No landing page needed (lesson from Shiny app complexity)

### Design Consistency:
- Use existing color variables and Tailwind classes
- Follow animation and interaction patterns from map explorer
- Maintain academic/professional aesthetic established in portal

## Strategic Opportunities

### "Fresh Start" Benefits:
- **Simplified data model** - No simulation complexity or parameter spaces
- **Modern plotting test case** - Move away from R → Plotly JSON pipeline
- **Performance-first** - No iframe loading delays or Shiny startup times
- **Focused scope** - Single research question vs. multi-modal analysis tools

### Learning Objectives:
- Evaluate modern React visualization approaches
- Test static data bundling vs. API patterns
- Understand user preferences for temporal data exploration
- Establish patterns for future "simplified" research apps

## Next Steps for Collaborative Review

### Immediate Decisions Needed:
1. **Data format confirmation** - Once colleague provides arrays and R code
2. **Interface approach** - List-based vs. geographic vs. other entry points
3. **Visualization library selection** - Based on data complexity and requirements
4. **Backend necessity** - Static vs. API approach decision

### Implementation Phases (Tentative):
1. **Foundation** - Route setup, basic single-state visualization, simple navigation
2. **Enhancement** - Multi-state comparison, timeline controls, animations
3. **Polish** - Error handling, responsive design, performance optimization

### Questions for Future Review:
- How does temporal interaction (2025-2040 progression) best serve the research story?
- What comparison patterns are most valuable for HIV age distribution analysis?
- How can we balance simplicity with analytical depth?
- What export/sharing capabilities would be most valuable?

---

## Concrete Implementation Proposal (Senior SWE Perspective)

### Problem Scope Clarification
After examining the reference figure in detail, the scope is now clear:
- **Exact state set**: ~25 states shown in the figure (comprehensive list)
- **Data structure**: Time series (2025-2040) × age cohorts (5 groups) × states
- **Visualization type**: Stacked area charts showing demographic shifts over time
- **No geographic interface needed**: Limited state set rules out full US map approach

### Technical Architecture Recommendations

#### **1. Data Strategy: Static-First with Migration Path**
```typescript
// src/data/hiv-age-projections.ts
interface StateAgeData {
  state_code: string;
  state_name: string;
  data: Array<{
    year: number;
    age_cohorts: {
      '13-24': number;
      '25-34': number;
      '35-44': number;
      '45-54': number;
      '55+': number;
    }
  }>
}

export const HIV_AGE_PROJECTIONS: StateAgeData[] = [/* data */];
```

**Rationale**:
- **Start simple**: ~25 states × 16 years = manageable static data
- **Future flexibility**: Structure allows easy API migration later
- **TypeScript-first**: Clear data contracts prevent integration issues
- **Follows existing patterns**: Similar to `src/data/cities.ts` approach

#### **2. Plotting Library: Recharts**
**Recommendation**: Choose Recharts over D3/Nivo/Observable Plot

**Justification**:
- **React-native**: Declarative JSX syntax, no DOM manipulation
- **Appropriate complexity**: Not D3's learning curve, more capable than Chart.js
- **TypeScript support**: Excellent type definitions and IDE support
- **Maintenance burden**: Mature, stable, well-documented
- **Migration-friendly**: Easy to swap for other libraries if needed
- **Bundle size**: Reasonable footprint for this use case

#### **3. Component Architecture: Composition Pattern**
```typescript
// Clean separation of concerns
<HIVAgeProjectionsApp>
  <StateSelector selectedStates={states} onStateChange={setStates} />
  <TimelineControls yearRange={range} onYearChange={setRange} />
  <AgeDistributionChart data={chartData} />
  <ComparisonPanel states={states} />
</HIVAgeProjectionsApp>
```

**Benefits**:
- **Single responsibility**: Each component has clear purpose
- **Testability**: Components can be tested in isolation
- **Reusability**: Generic demographic chart components for future apps
- **Maintainability**: Clear data flow, minimal prop drilling

#### **4. State Management: React Hooks + Custom Hook**
```typescript
const useHIVProjections = () => {
  const [selectedStates, setSelectedStates] = useState<string[]>([]);
  const [yearRange, setYearRange] = useState<[number, number]>([2025, 2040]);

  const chartData = useMemo(() =>
    processDataForChart(selectedStates, yearRange),
    [selectedStates, yearRange]
  );

  return { selectedStates, setSelectedStates, yearRange, setYearRange, chartData };
};
```

**Rationale**: App complexity doesn't justify Redux/Zustand. Custom hook encapsulates logic for reusability.

### Final Implementation Plan (Post-Collaborative Review)

This plan integrates feedback from external technical review and clarifies MVP requirements based on the "paper reader" audience and research analytical needs.

#### **Phase 1: MVP - Core Analytical Experience**
**Goal**: Deliver a fully functional, analytically powerful companion to Figure 2

**Deliverables**:
1. **Multi-State Comparison View**: Grid layout (2×2 or 3×2) for selected states, replicating paper figure structure
2. **Complete Data Set**: All ~25 states from figure plus essential "Total" view option
3. **Core Chart Component** with full analytical capabilities:
   - **Normalization Toggle**: Primary control switching between "Absolute Numbers" and "Proportional (Percentage)" views
   - **Interactive Tooltips**: Hover displays year, cohort, absolute count, and percentage of total for that year
   - **Legend Toggling**: Click legend to hide/show specific age cohorts
   - **Timeline Controls**: Interactive year range selection (2025-2040)
4. **Navigation Integration**: Route setup with main menu integration

**Rationale**: This ambitious MVP immediately provides more analytical value than the static image, equipping researchers with primary analytical tools (comparison, normalization, temporal filtering) from day one.

#### **Phase 2: Polish & Usability Features**
**Goal**: Enhance user experience with professional-grade features

**Deliverables**:
1. **Seamless Animations**: Framer Motion transitions for state selection and mode toggles
2. **Export Functionality**: "Export as PNG" and "Download Data as CSV" options
3. **Responsive Design**: Mobile and tablet optimization
4. **Error Boundaries**: Following existing portal patterns
5. **Performance Optimization**: Chart rendering optimization if needed

#### **Phase 3: Advanced Analysis & Future Enhancements**
**Goal**: Extend analytical capabilities based on user feedback

**Deliverables**:
1. **Alternative Chart Type**: Toggle between Stacked Area and Line Chart views for clearer individual cohort trend comparison
2. **Advanced Comparison Modes**: Overlay selected state trends against "Total" average
3. **Regional Groupings**: Pre-defined state groupings for common analytical patterns
4. **Enhanced Export**: PDF reports, presentation-ready chart exports

### Future Flexibility Built In

#### **Data Layer Abstraction**:
```typescript
interface DataProvider {
  getStates(): Promise<StateInfo[]>;
  getProjections(states: string[]): Promise<StateAgeData[]>;
}

class StaticDataProvider implements DataProvider { /* current */ }
class APIDataProvider implements DataProvider { /* future migration */ }
```

#### **Generic Chart Components**:
```typescript
// Reusable for future demographic apps
interface DemographicChartProps<T> {
  data: T[];
  dimensions: ChartDimension[];
  colorScheme: ColorScheme;
  timeRange: [number, number];
}
```

### Modern Best Practices Applied

- **TypeScript-first**: Strict typing prevents runtime errors
- **Accessibility**: ARIA labels, keyboard navigation, color-blind friendly palettes
- **Performance**: React.memo, useMemo, lazy loading patterns
- **Testing**: Jest + RTL for component tests, data transformation unit tests
- **Code organization**: Clear separation of concerns, consistent with existing portal

### Key Insights from Collaborative Review

#### **Audience-Driven Design**:
- **Primary users**: Researchers reading the paper who want to explore Figure 2 interactively
- **Core analytical need**: Ability to compare states meaningfully via normalization toggle
- **Research workflow**: Focus on specific states/regions rather than overwhelming comprehensive display

#### **Engineering Insights Validated**:
- **Normalization as core feature**: Data transformation concern, not UI polish - build into Phase 1
- **Timeline controls are analytical**: Temporal progression is central to research story, not cosmetic enhancement
- **Multi-state comparison essential**: Non-negotiable MVP requirement for replicating paper value

#### **Architectural Strategy Confirmed**:
- **Disciplined monorepo approach**: Self-contained within portal for speed and integration benefits
- **Static-first data strategy**: Right-sized for ~25 states × 16 years dataset
- **Component composition**: Clean separation enabling future reuse in demographic apps

### Why This Approach

#### **Right-Sized Engineering**:
- No over-architecture for current needs
- Uses proven patterns from existing portal codebase
- Ambitious but achievable MVP delivers immediate analytical value

#### **Strategic Value**:
- **Learning platform**: Tests modern visualization approach (Recharts) for future apps
- **Migration template**: Establishes patterns for moving away from R→Plotly pipeline
- **User research**: Validates interaction patterns for temporal demographic data
- **Research impact**: Provides analytical tools that surpass static figure capabilities

#### **Risk Management**:
- **Conservative technology choices**: Recharts is battle-tested, TypeScript catches errors early
- **Incremental delivery**: Core analytical experience in Phase 1, enhancements in subsequent phases
- **Migration paths**: Architecture supports future scaling and backend integration needs
- **External validation**: Plan refined through collaborative technical review process

---

**Status**: Ready for implementation - plan finalized through collaborative review process.
**Next Step**: Begin Phase 1 development with synthetic data matching figure structure.
**Success Criteria**: MVP delivers more analytical value than static Figure 2 for paper readers.