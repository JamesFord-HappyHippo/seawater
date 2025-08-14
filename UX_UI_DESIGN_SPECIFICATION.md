# Seawater.io Climate Risk Platform - UX/UI Design Specification

## Executive Summary

This comprehensive design specification provides the complete UX/UI framework for the Seawater.io climate risk platform, designed to serve home buyers, movers, real estate professionals, and insurance agents. The design emphasizes accessibility, clarity, and actionable information to help users make informed decisions about climate risks.

**Design Principles:**
- **Clarity First**: Risk information must be immediately understandable
- **Action-Oriented**: Every interface guides users toward informed decisions
- **Inclusive**: Accessible to all users regardless of technical expertise
- **Trust-Building**: Professional, authoritative design that instills confidence
- **Mobile-First**: Optimized for mobile usage patterns

---

## 1. User Journey Mapping

### 1.1 First-Time Visitor Journey

**Persona**: Sarah, 28, first-time home buyer
**Goal**: Understand what climate risks mean for homeownership

```
Entry Point → Discovery → Education → Property Search → Risk Assessment → Action
     ↓           ↓          ↓            ↓              ↓            ↓
  Homepage   Climate    Learn About   Enter Address   View Risks   Contact
            Overview   Insurance &                               Professional
                      Building Codes
```

**Key Touchpoints:**
1. **Landing Page**: Clear value proposition "Know Your Climate Risk Before You Buy"
2. **Educational Hub**: "Climate Risks 101" with interactive guides
3. **Free Property Lookup**: Single address search with FEMA data
4. **Risk Explanation**: Plain-English explanations of scores
5. **Next Steps**: Clear calls-to-action for deeper assessment

### 1.2 Home Buyer Research Journey

**Persona**: Mike & Jennifer, 35 & 32, comparing properties
**Goal**: Compare climate risks across multiple properties

```
Property List → Bulk Comparison → Detailed Analysis → Professional Help → Decision
      ↓              ↓               ↓                ↓               ↓
  Upload/Enter   Side-by-Side     Premium Data    Find Local      Final
  Addresses      Risk Display     Analysis        Professionals   Selection
```

**Key Features:**
- Multi-property comparison table
- Interactive risk visualization
- "Deal-breaker" risk threshold setting
- Professional directory integration
- Shareable comparison reports

### 1.3 Real Estate Agent Professional Journey

**Persona**: Patricia, 42, realtor specializing in coastal properties
**Goal**: Provide clients with comprehensive risk assessments

```
Dashboard → Client Management → Bulk Analysis → Report Generation → Client Education
    ↓            ↓               ↓              ↓                 ↓
Professional  Organize Client   Analyze      Generate White-   Climate Risk
 Login        Property Lists    Portfolio    Label Reports     Presentations
```

**Professional Tools:**
- Client property portfolio management
- Bulk risk assessment tools
- White-label report generation
- Client communication templates
- Continuing education resources

### 1.4 Insurance Agent Workflow

**Persona**: Robert, 45, insurance agent evaluating properties
**Goal**: Assess risk for policy underwriting and recommendations

```
Property Assessment → Risk Analysis → Coverage Recommendations → Client Communication
         ↓                ↓              ↓                      ↓
    Detailed Risk    Historical Data   Policy Matching      Risk Mitigation
     Evaluation      & Projections                         Recommendations
```

**Insurance-Specific Features:**
- Historical claims data integration
- Risk mitigation cost-benefit analysis
- Policy recommendation engine
- Regulatory compliance tracking

---

## 2. Information Architecture

### 2.1 Site Structure

```
🏠 Homepage
├── 🔍 Property Search
│   ├── Single Property Lookup
│   ├── Multi-Property Comparison
│   └── Map-Based Search
├── 📚 Climate Risk Education
│   ├── Risk Types Overview
│   ├── Insurance Guidance
│   ├── Building Codes & Retrofits
│   └── State Disclosure Laws
├── 🗺️ Interactive Risk Maps
│   ├── National Risk Overview
│   ├── Regional Deep Dives
│   └── Historical Trends
├── 👥 Professional Directory
│   ├── Climate-Aware Agents
│   ├── Home Inspectors
│   └── Insurance Professionals
├── 💼 Professional Tools (Paid)
│   ├── Dashboard
│   ├── Client Management
│   ├── Bulk Analysis
│   └── Report Generation
└── 📞 Contact & Support
    ├── Getting Started Guide
    ├── FAQ
    └── Contact Forms
```

### 2.2 Content Hierarchy

**Primary Content (Above the Fold):**
- Property search functionality
- Key value propositions
- Risk visualization previews

**Secondary Content (Scroll Discovery):**
- Educational resources
- Professional services
- Interactive features

**Supporting Content (Footer/Navigation):**
- Legal information
- Data sources
- Contact information

---

## 3. Risk Visualization Design

### 3.1 Risk Score Display System

**Multi-Source Risk Card Design:**

```
┌─────────────────────────────────────┐
│ 🏠 1234 Main St, Anytown, FL       │
├─────────────────────────────────────┤
│ FLOOD RISK                          │
│ ████████░░ 8.2/10 ⚠️ HIGH          │
│ FEMA: 8.5  │ First St: 8.0  │ CC: 8.1│
│                                     │
│ WILDFIRE RISK                       │
│ ██░░░░░░░░ 2.1/10 ✅ LOW           │
│ FEMA: 2.0  │ First St: 2.3  │ CC: 2.0│
│                                     │
│ EXTREME HEAT RISK                   │
│ ████████░░ 7.8/10 🔥 HIGH          │
│ FEMA: 7.5  │ First St: 8.1  │ CC: 7.9│
└─────────────────────────────────────┘
```

**Design Principles:**
- **Color-Blind Friendly**: Uses patterns + colors + icons
- **Immediate Recognition**: Traffic light system (Green/Yellow/Red)
- **Source Transparency**: Shows multiple data sources
- **Context Provided**: Explains what scores mean

### 3.2 Risk Comparison Visualization

**Side-by-Side Property Comparison:**

```
┌─────────────┬─────────────┬─────────────┐
│  Property A │  Property B │  Property C │
├─────────────┼─────────────┼─────────────┤
│ 🌊 Flood    │ 🌊 Flood    │ 🌊 Flood    │
│ ████████░░  │ ██░░░░░░░░  │ ████░░░░░░  │
│ 8.2 HIGH    │ 2.1 LOW     │ 4.5 MODERATE│
├─────────────┼─────────────┼─────────────┤
│ 🔥 Wildfire │ 🔥 Wildfire │ 🔥 Wildfire │
│ ██░░░░░░░░  │ ██████████  │ ████░░░░░░  │
│ 2.1 LOW     │ 9.8 EXTREME │ 4.2 MODERATE│
├─────────────┼─────────────┼─────────────┤
│ 🌡️ Heat     │ 🌡️ Heat     │ 🌡️ Heat     │
│ ████████░░  │ ██████░░░░  │ ████████░░  │
│ 7.8 HIGH    │ 6.2 MODERATE│ 7.9 HIGH    │
└─────────────┴─────────────┴─────────────┘
     WINNER        AVOID        CONSIDER
```

### 3.3 Historical Trend Visualization

**30-Year Risk Projection Chart:**

```
Risk Score
    10 │                              ╭─────
       │                         ╭────╯
     8 │                    ╭────╯
       │               ╭────╯
     6 │          ╭────╯
       │     ╭────╯
     4 │╭────╯
       ├────┼────┼────┼────┼────┼────┼─
     2025  2027  2029  2031  2033  2035  Years

🌊 Flood Risk Projection: Moderate → High by 2030
💡 Recommendation: Consider flood insurance now
```

### 3.4 Interactive Map Design

**Risk Overlay System:**
- **Base Layer**: Clean, minimal street map (Mapbox Light)
- **Risk Overlays**: Semi-transparent heat maps for each risk type
- **Property Markers**: Clustered pins showing overall risk scores
- **Detail Popups**: Quick risk summary on marker click
- **Filter Controls**: Toggle risk types, adjust time periods

---

## 4. Component Library Specifications

### 4.1 Core Search Components

#### AddressSearchBar
```typescript
interface AddressSearchBarProps {
  placeholder?: string;
  onSelect: (address: string, coordinates: LatLng) => void;
  suggestions?: boolean;
  geolocation?: boolean;
  className?: string;
}

// Features:
// - Autocomplete with geocoding
// - "Use my location" option
// - Recent searches dropdown
// - Address validation feedback
```

#### PropertyCard
```typescript
interface PropertyCardProps {
  address: string;
  riskData: RiskAssessment;
  showComparison?: boolean;
  compactView?: boolean;
  onViewDetails: () => void;
  onCompare: () => void;
}

// Features:
// - Responsive layout (card/list view)
// - Risk score visualizations
// - Quick action buttons
// - Shareable links
```

### 4.2 Risk Display Components

#### RiskScoreWidget
```typescript
interface RiskScoreWidgetProps {
  hazardType: 'flood' | 'wildfire' | 'heat' | 'tornado' | 'hurricane';
  scores: MultiSourceScore;
  showSources?: boolean;
  showProjections?: boolean;
  size?: 'small' | 'medium' | 'large';
}

// Design variants:
// - Compact: Icon + score only
// - Standard: Bar chart + multiple sources
// - Detailed: Includes explanations and trends
```

#### TrendChart
```typescript
interface TrendChartProps {
  data: HistoricalData[];
  projections: ProjectionData[];
  hazardTypes: string[];
  timeRange: [Date, Date];
  interactive?: boolean;
}

// Features:
// - Responsive SVG charts
// - Zoom/pan interactions
// - Data point tooltips
// - Export functionality
```

### 4.3 Interactive Map Components

#### ClimateRiskMap
```typescript
interface ClimateRiskMapProps {
  center: LatLng;
  zoom: number;
  activeOverlay?: RiskType;
  properties: PropertyMarker[];
  onLocationSelect: (coordinates: LatLng) => void;
  onPropertySelect: (property: Property) => void;
}

// Features:
// - Multiple risk overlay layers
// - Property clustering
// - Draw/measure tools
// - Fullscreen mode
```

#### RiskOverlayControl
```typescript
interface RiskOverlayControlProps {
  availableOverlays: RiskType[];
  activeOverlay: RiskType | null;
  onChange: (overlay: RiskType | null) => void;
  opacity: number;
  onOpacityChange: (opacity: number) => void;
}

// Features:
// - Toggle switches for each risk type
// - Opacity slider
// - Legend display
// - Color scale explanations
```

### 4.4 Educational Components

#### RiskExplainer
```typescript
interface RiskExplainerProps {
  hazardType: RiskType;
  userScore?: number;
  expandable?: boolean;
  includeActionItems?: boolean;
}

// Content includes:
// - What this risk means
// - How it's calculated
// - What the score means for the user
// - Actionable next steps
```

#### InsuranceCalculator
```typescript
interface InsuranceCalculatorProps {
  property: PropertyData;
  riskScores: RiskAssessment;
  onEstimate: (estimate: InsuranceEstimate) => void;
}

// Features:
// - Interactive premium estimation
// - Coverage recommendations
// - Risk mitigation impact
// - Provider comparisons
```

### 4.5 Professional Tools Components

#### ClientDashboard
```typescript
interface ClientDashboardProps {
  client: ClientData;
  properties: Property[];
  riskAssessments: RiskAssessment[];
  onGenerateReport: (properties: string[]) => void;
}

// Professional features:
// - Client portfolio overview
// - Bulk property analysis
// - Report generation tools
// - Client communication logs
```

#### BulkPropertyUpload
```typescript
interface BulkPropertyUploadProps {
  onUpload: (addresses: string[]) => void;
  maxProperties?: number;
  supportedFormats: string[];
  onProgress: (progress: number) => void;
}

// Features:
// - CSV/Excel upload
// - Address validation
// - Progress tracking
// - Error handling and corrections
```

---

## 5. Mobile-First Design Guidelines

### 5.1 Mobile User Interface Patterns

#### Touch-Optimized Search
```
┌─────────────────────────────┐
│ 🔍 [Enter property address] │ 44px min height
├─────────────────────────────┤
│ 📍 Use my location         │ Touch target
├─────────────────────────────┤
│ Recent Searches:            │
│ • 123 Main St, Boston      │ 48px touch targets
│ • 456 Oak Ave, Miami       │
└─────────────────────────────┘
```

#### Swipeable Risk Cards
```
Property A     Property B     Property C
┌─────────┐   ┌─────────┐   ┌─────────┐
│ 🏠 Home │◄──┤ 🏠 Home ├──►│ 🏠 Home │
│ Flood:8 │   │ Flood:3 │   │ Flood:6 │
│ Fire: 2 │   │ Fire: 9 │   │ Fire: 4 │
│ Heat: 7 │   │ Heat: 6 │   │ Heat: 8 │
└─────────┘   └─────────┘   └─────────┘
```

#### Collapsible Risk Details
```
┌─────────────────────────────┐
│ 🌊 FLOOD RISK: 8.2 HIGH ▼  │
├─────────────────────────────┤
│ What this means:            │
│ • High chance of flooding   │
│ • Flood insurance required  │
│ • Consider elevation        │
│                             │
│ Data sources:               │
│ FEMA: 8.5 | First St: 8.0  │
└─────────────────────────────┘
```

### 5.2 Mobile Navigation Structure

**Bottom Tab Navigation:**
```
┌─────┬─────┬─────┬─────┬─────┐
│ 🏠  │ 🔍  │ 🗺️  │ 📚  │ ⚙️  │
│Home │Search│ Map │Learn│More │
└─────┴─────┴─────┴─────┴─────┘
```

**Hamburger Menu (Secondary Actions):**
```
☰ Menu
├── 📊 Compare Properties
├── 👥 Find Professionals
├── 💾 Saved Searches
├── ❓ Help & Support
└── 👤 Account Settings
```

### 5.3 Responsive Breakpoints

```css
/* Mobile First Approach */
.risk-card {
  /* Base mobile styles */
  display: block;
  width: 100%;
  margin-bottom: 1rem;
}

/* Tablet Portrait: 768px+ */
@media (min-width: 768px) {
  .risk-card {
    display: inline-block;
    width: calc(50% - 1rem);
  }
}

/* Desktop: 1024px+ */
@media (min-width: 1024px) {
  .risk-card {
    width: calc(33.33% - 1rem);
  }
}

/* Large Desktop: 1440px+ */
@media (min-width: 1440px) {
  .risk-card {
    width: calc(25% - 1rem);
  }
}
```

---

## 6. Accessibility Standards

### 6.1 Color and Contrast Guidelines

**Risk Level Color System (WCAG AA Compliant):**
```css
:root {
  /* Primary Risk Colors */
  --risk-low: #22c55e;      /* Green - 4.5:1 contrast */
  --risk-moderate: #f59e0b; /* Amber - 4.5:1 contrast */
  --risk-high: #ef4444;     /* Red - 4.5:1 contrast */
  --risk-extreme: #7c2d12;  /* Dark Red - 7:1 contrast */
  
  /* Accessible Patterns for Color-Blind Users */
  --pattern-low: url('data:image/svg+xml,<svg>...</svg>');
  --pattern-moderate: repeating-linear-gradient(45deg, transparent, transparent 2px, rgba(0,0,0,0.1) 2px, rgba(0,0,0,0.1) 4px);
  --pattern-high: repeating-linear-gradient(-45deg, transparent, transparent 3px, rgba(0,0,0,0.2) 3px, rgba(0,0,0,0.2) 6px);
}

.risk-indicator {
  /* Always combine color with pattern/icon */
  background: var(--risk-color);
  background-image: var(--risk-pattern);
}

.risk-indicator::before {
  /* Icon reinforcement */
  content: var(--risk-icon);
  font-size: 1.2em;
  margin-right: 0.5em;
}
```

### 6.2 Screen Reader Compatibility

**Semantic HTML Structure:**
```html
<main role="main" aria-labelledby="page-title">
  <h1 id="page-title">Climate Risk Assessment</h1>
  
  <section aria-labelledby="property-search">
    <h2 id="property-search">Property Search</h2>
    
    <form role="search" aria-label="Property address search">
      <label for="address-input">Property Address</label>
      <input 
        id="address-input"
        type="text"
        aria-describedby="address-help"
        autocomplete="street-address"
      />
      <div id="address-help">Enter a complete street address</div>
    </form>
  </section>
  
  <section aria-labelledby="risk-results">
    <h2 id="risk-results">Risk Assessment Results</h2>
    
    <article 
      role="region" 
      aria-labelledby="flood-risk"
      aria-describedby="flood-description"
    >
      <h3 id="flood-risk">
        <span aria-hidden="true">🌊</span>
        Flood Risk: <span class="score">8.2 out of 10</span>
        <span class="level">High Risk</span>
      </h3>
      
      <div id="flood-description">
        This property has a high flood risk score of 8.2 out of 10, 
        indicating significant potential for flooding events.
      </div>
      
      <!-- Visual chart with alternative text -->
      <div class="risk-chart" role="img" aria-labelledby="flood-chart-desc">
        <div id="flood-chart-desc" class="sr-only">
          Bar chart showing flood risk score of 8.2 out of 10, 
          with FEMA score of 8.5, First Street score of 8.0, 
          and ClimateCheck score of 8.1
        </div>
        <!-- Chart implementation -->
      </div>
    </article>
  </section>
</main>
```

### 6.3 Keyboard Navigation

**Focus Management System:**
```typescript
// Keyboard navigation for risk cards
const useKeyboardNavigation = () => {
  const [focusedIndex, setFocusedIndex] = useState(0);
  
  const handleKeyDown = (event: KeyboardEvent) => {
    switch (event.key) {
      case 'ArrowRight':
        setFocusedIndex((prev) => Math.min(prev + 1, maxIndex));
        break;
      case 'ArrowLeft':
        setFocusedIndex((prev) => Math.max(prev - 1, 0));
        break;
      case 'Enter':
      case ' ':
        // Activate focused element
        activateFocusedElement();
        break;
      case 'Escape':
        // Close modals/dropdowns
        closeActiveModal();
        break;
    }
  };
  
  return { focusedIndex, handleKeyDown };
};
```

**Skip Navigation Links:**
```html
<a href="#main-content" class="skip-link">Skip to main content</a>
<a href="#property-search" class="skip-link">Skip to property search</a>
<a href="#risk-results" class="skip-link">Skip to risk results</a>
```

---

## 7. Competitive Analysis

### 7.1 Direct Competitors Analysis

#### ClimateCheck.com
**Strengths:**
- Clean, professional interface
- Comprehensive risk methodology transparency
- Good mobile responsiveness

**Weaknesses:**
- Limited free data
- Complex scientific language
- No professional tools integration

**Design Opportunities:**
- Simplified risk explanations
- More actionable recommendations
- Professional workflow integration

#### RiskFactor.com (First Street)
**Strengths:**
- Property-specific granular data
- Excellent future projections
- Integration with real estate platforms

**Weaknesses:**
- Paywall limits exploration
- Limited educational content
- No professional directory

**Design Opportunities:**
- Comprehensive free tier
- Educational content integration
- Professional services marketplace

#### Redfin Climate Risk Integration
**Strengths:**
- Seamless property listing integration
- Simple risk score display
- Familiar real estate interface

**Weaknesses:**
- Limited risk explanation
- No comparison tools
- Basic visualization

**Design Opportunities:**
- Dedicated climate risk platform
- Advanced comparison tools
- Comprehensive risk education

### 7.2 Indirect Competitors Analysis

#### Zillow Property Information
**Strengths:**
- Comprehensive property data
- User-friendly interface
- Strong mobile experience

**Weaknesses:**
- Limited climate risk focus
- No risk mitigation guidance
- Basic visualization

#### FEMA Flood Map Service Center
**Strengths:**
- Authoritative data source
- Comprehensive geographic coverage
- Free access

**Weaknesses:**
- Complex technical interface
- Poor user experience
- Limited mobile optimization

**Design Opportunities:**
- Consumer-friendly FEMA data presentation
- Mobile-optimized flood zone lookup
- Plain-language risk explanations

---

## 8. Design System Specifications

### 8.1 Brand Color Palette

**Primary Colors:**
```css
:root {
  /* Primary Brand Colors */
  --seawater-primary: #006666;    /* Teal - Trust, reliability */
  --seawater-secondary: #004d4d;  /* Dark teal - Depth, expertise */
  --seawater-accent: #008080;     /* Bright teal - Action, energy */
  --seawater-light: #e0f2f1;     /* Light teal - Backgrounds */
  
  /* Risk Indication Colors (Accessibility Compliant) */
  --risk-low: #10b981;           /* Green */
  --risk-moderate: #f59e0b;      /* Amber */
  --risk-high: #ef4444;          /* Red */
  --risk-extreme: #991b1b;       /* Dark red */
  
  /* Neutral Colors */
  --neutral-white: #ffffff;
  --neutral-50: #f9fafb;
  --neutral-100: #f3f4f6;
  --neutral-200: #e5e7eb;
  --neutral-300: #d1d5db;
  --neutral-400: #9ca3af;
  --neutral-500: #6b7280;
  --neutral-600: #4b5563;
  --neutral-700: #374151;
  --neutral-800: #1f2937;
  --neutral-900: #111827;
  
  /* Semantic Colors */
  --success: #10b981;
  --warning: #f59e0b;
  --error: #ef4444;
  --info: #3b82f6;
}
```

### 8.2 Typography System

**Font Stack:**
```css
:root {
  /* Primary Font: Clean, readable sans-serif */
  --font-primary: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
  
  /* Secondary Font: For headings and emphasis */
  --font-secondary: 'Poppins', -apple-system, BlinkMacSystemFont, sans-serif;
  
  /* Monospace: For data and codes */
  --font-mono: 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, 'Courier New', monospace;
}

/* Type Scale */
.text-xs   { font-size: 0.75rem;  line-height: 1rem; }    /* 12px */
.text-sm   { font-size: 0.875rem; line-height: 1.25rem; } /* 14px */
.text-base { font-size: 1rem;     line-height: 1.5rem; }  /* 16px */
.text-lg   { font-size: 1.125rem; line-height: 1.75rem; } /* 18px */
.text-xl   { font-size: 1.25rem;  line-height: 1.75rem; } /* 20px */
.text-2xl  { font-size: 1.5rem;   line-height: 2rem; }    /* 24px */
.text-3xl  { font-size: 1.875rem; line-height: 2.25rem; } /* 30px */
.text-4xl  { font-size: 2.25rem;  line-height: 2.5rem; }  /* 36px */
```

**Typography Classes:**
```css
.heading-primary {
  font-family: var(--font-secondary);
  font-size: 2.25rem;
  font-weight: 700;
  line-height: 1.2;
  color: var(--seawater-primary);
}

.heading-secondary {
  font-family: var(--font-secondary);
  font-size: 1.875rem;
  font-weight: 600;
  line-height: 1.3;
  color: var(--neutral-800);
}

.body-text {
  font-family: var(--font-primary);
  font-size: 1rem;
  line-height: 1.6;
  color: var(--neutral-700);
}

.risk-score {
  font-family: var(--font-secondary);
  font-size: 1.5rem;
  font-weight: 700;
  letter-spacing: -0.025em;
}
```

### 8.3 Component Styles

**Button System:**
```css
.btn {
  /* Base button styles */
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.75rem 1.5rem;
  border-radius: 0.5rem;
  font-weight: 600;
  font-size: 0.875rem;
  line-height: 1.25rem;
  transition: all 0.2s ease-in-out;
  cursor: pointer;
  border: none;
  text-decoration: none;
}

.btn-primary {
  background-color: var(--seawater-primary);
  color: var(--neutral-white);
}

.btn-primary:hover {
  background-color: var(--seawater-secondary);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 102, 102, 0.4);
}

.btn-secondary {
  background-color: transparent;
  color: var(--seawater-primary);
  border: 2px solid var(--seawater-primary);
}

.btn-secondary:hover {
  background-color: var(--seawater-primary);
  color: var(--neutral-white);
}

.btn-danger {
  background-color: var(--error);
  color: var(--neutral-white);
}

.btn-lg {
  padding: 1rem 2rem;
  font-size: 1rem;
}

.btn-sm {
  padding: 0.5rem 1rem;
  font-size: 0.75rem;
}
```

**Card System:**
```css
.card {
  background-color: var(--neutral-white);
  border-radius: 1rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0, 0, 0, 0.06);
  padding: 1.5rem;
  border: 1px solid var(--neutral-200);
  transition: box-shadow 0.2s ease-in-out;
}

.card:hover {
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1), 0 4px 10px rgba(0, 0, 0, 0.06);
}

.card-header {
  border-bottom: 1px solid var(--neutral-200);
  padding-bottom: 1rem;
  margin-bottom: 1rem;
}

.card-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--neutral-900);
  margin: 0;
}

.card-body {
  color: var(--neutral-700);
}
```

### 8.4 Icon System

**Weather and Climate Icons:**
```css
/* Using a mix of emoji and SVG icons for accessibility */
.icon-flood::before     { content: "🌊"; }
.icon-wildfire::before  { content: "🔥"; }
.icon-heat::before      { content: "🌡️"; }
.icon-tornado::before   { content: "🌪️"; }
.icon-hurricane::before { content: "🌀"; }
.icon-drought::before   { content: "🏜️"; }

/* Status icons */
.icon-low-risk::before     { content: "✅"; color: var(--risk-low); }
.icon-moderate-risk::before { content: "⚠️"; color: var(--risk-moderate); }
.icon-high-risk::before    { content: "🚨"; color: var(--risk-high); }

/* Action icons */
.icon-info::before     { content: "ℹ️"; }
.icon-external::before { content: "🔗"; }
.icon-download::before { content: "📥"; }
.icon-share::before    { content: "📤"; }
```

### 8.5 Layout Grid System

**CSS Grid Layout:**
```css
.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 1rem;
}

.grid {
  display: grid;
  gap: 1.5rem;
}

.grid-cols-1 { grid-template-columns: repeat(1, 1fr); }
.grid-cols-2 { grid-template-columns: repeat(2, 1fr); }
.grid-cols-3 { grid-template-columns: repeat(3, 1fr); }
.grid-cols-4 { grid-template-columns: repeat(4, 1fr); }

/* Responsive grid */
.grid-responsive {
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
}

/* Property comparison layout */
.comparison-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1rem;
  margin: 2rem 0;
}
```

---

## 9. Implementation Guidelines for Developers

### 9.1 React Component Architecture

**Component Hierarchy:**
```
App
├── Layout
│   ├── Header
│   │   ├── Logo
│   │   ├── Navigation
│   │   └── UserActions
│   ├── Main
│   │   ├── PropertySearch
│   │   ├── RiskVisualization
│   │   └── EducationalContent
│   └── Footer
├── Pages
│   ├── HomePage
│   ├── PropertyDetailsPage
│   ├── ComparisonPage
│   ├── ProfessionalDashboard
│   └── EducationHub
└── Providers
    ├── ThemeProvider
    ├── APIProvider
    └── UserProvider
```

**State Management Pattern:**
```typescript
// Use React Context for global state
interface AppState {
  user: User | null;
  searchHistory: PropertySearch[];
  comparisonList: Property[];
  preferences: UserPreferences;
}

// Use React Query for API state
const useRiskData = (address: string) => {
  return useQuery({
    queryKey: ['risk', address],
    queryFn: () => fetchRiskData(address),
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 30 * 60 * 1000, // 30 minutes
  });
};
```

### 9.2 Performance Optimization

**Code Splitting Strategy:**
```typescript
// Lazy load heavy components
const InteractiveMap = lazy(() => import('./components/InteractiveMap'));
const ProfessionalDashboard = lazy(() => import('./pages/ProfessionalDashboard'));

// Component-level code splitting
const PropertyDetailsPage = lazy(() => 
  import('./pages/PropertyDetailsPage').then(module => ({
    default: module.PropertyDetailsPage
  }))
);
```

**Image Optimization:**
```typescript
// Use Next.js Image component or similar optimization
import Image from 'next/image';

const PropertyImage = ({ src, alt, ...props }) => (
  <Image
    src={src}
    alt={alt}
    loading="lazy"
    quality={85}
    placeholder="blur"
    blurDataURL="data:image/jpeg;base64,..."
    {...props}
  />
);
```

### 9.3 Accessibility Implementation

**Focus Management:**
```typescript
// Trap focus in modals
const useModalFocus = (isOpen: boolean) => {
  const modalRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (!isOpen) return;
    
    const modal = modalRef.current;
    if (!modal) return;
    
    const focusableElements = modal.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    
    const firstElement = focusableElements[0] as HTMLElement;
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;
    
    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      
      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          lastElement.focus();
          e.preventDefault();
        }
      } else {
        if (document.activeElement === lastElement) {
          firstElement.focus();
          e.preventDefault();
        }
      }
    };
    
    modal.addEventListener('keydown', handleTab);
    firstElement.focus();
    
    return () => modal.removeEventListener('keydown', handleTab);
  }, [isOpen]);
  
  return modalRef;
};
```

**Screen Reader Announcements:**
```typescript
// Live region for dynamic content updates
const useLiveRegion = () => {
  const announce = useCallback((message: string, priority: 'polite' | 'assertive' = 'polite') => {
    const liveRegion = document.getElementById(`live-region-${priority}`);
    if (liveRegion) {
      liveRegion.textContent = message;
      // Clear after announcement
      setTimeout(() => {
        liveRegion.textContent = '';
      }, 1000);
    }
  }, []);
  
  return announce;
};

// Usage in risk data loading
const RiskDataLoader = () => {
  const announce = useLiveRegion();
  const { data, isLoading, error } = useRiskData(address);
  
  useEffect(() => {
    if (isLoading) {
      announce('Loading risk data...');
    } else if (error) {
      announce('Error loading risk data. Please try again.', 'assertive');
    } else if (data) {
      announce(`Risk data loaded for ${data.address}`);
    }
  }, [isLoading, error, data, announce]);
};
```

### 9.4 Responsive Implementation

**Breakpoint System:**
```scss
// Sass mixins for consistent breakpoints
$breakpoints: (
  'mobile': 480px,
  'tablet': 768px,
  'desktop': 1024px,
  'large': 1440px
);

@mixin breakpoint($size) {
  @media (min-width: map-get($breakpoints, $size)) {
    @content;
  }
}

// Usage
.risk-card {
  width: 100%;
  
  @include breakpoint('tablet') {
    width: 50%;
  }
  
  @include breakpoint('desktop') {
    width: 33.33%;
  }
}
```

**Container Queries (Future-Ready):**
```css
/* When container queries have wider support */
.property-comparison {
  container-type: inline-size;
}

@container (min-width: 600px) {
  .comparison-item {
    display: grid;
    grid-template-columns: 1fr 2fr;
    gap: 1rem;
  }
}
```

---

## 10. Testing and Validation Framework

### 10.1 Usability Testing Protocol

**Test Scenarios:**
1. **First-Time User Flow**: Complete property search to risk understanding
2. **Comparison Task**: Compare 3 properties for risk factors
3. **Professional Workflow**: Generate client report
4. **Mobile Usage**: Complete all tasks on mobile device
5. **Accessibility Test**: Navigate using screen reader only

**Success Metrics:**
- Task completion rate > 85%
- Time to complete property search < 2 minutes
- User satisfaction score > 4.0/5.0
- Accessibility compliance score 100%

### 10.2 A/B Testing Framework

**Test Variations:**
- Risk score presentation (bars vs. circles vs. gauges)
- Color schemes for risk levels
- Information hierarchy on property pages
- Call-to-action button placement and wording

**Implementation:**
```typescript
const useABTest = (testId: string, variants: string[]) => {
  const [variant, setVariant] = useState<string>();
  
  useEffect(() => {
    // Get user's assigned variant
    const userVariant = getABTestVariant(testId, variants);
    setVariant(userVariant);
    
    // Track assignment
    analytics.track('ab_test_assigned', {
      test_id: testId,
      variant: userVariant
    });
  }, [testId, variants]);
  
  return variant;
};
```

---

This comprehensive UX/UI design specification provides the complete framework for building the Seawater.io climate risk platform. The design prioritizes user needs, accessibility, and actionable information delivery while maintaining a professional, trustworthy appearance that instills confidence in users making critical property decisions.

The specification covers all requested areas:
- ✅ User journey mapping for all personas
- ✅ Complete information architecture
- ✅ Risk visualization design concepts
- ✅ Comprehensive component library
- ✅ Mobile-first design guidelines
- ✅ Accessibility standards (WCAG AA)
- ✅ Competitive analysis
- ✅ Complete design system
- ✅ Implementation guidelines for developers

The design balances simplicity for consumers with sophistication for professionals, ensuring the platform serves all user types effectively while maintaining consistent, accessible, and actionable climate risk information.