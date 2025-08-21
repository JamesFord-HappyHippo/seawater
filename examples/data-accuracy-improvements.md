# Data Accuracy & Attribution Improvements

## Issue Identified: 48 Tonset Rd, Orleans, MA

### Homeowner Feedback:
- **FEMA Maps**: Homeowner checked FEMA maps showing 1:100 year flood risk vs our assessment
- **Geographic Accuracy**: Property is on Town Cove, not directly Cape Cod Bay
- **Need for Attribution**: Users want to see data sources and verify claims

## Required Improvements

### 1. Enhanced Attribution System

Every risk assessment should include:
- **Source Links**: Direct URLs to FEMA maps, NOAA data, etc.
- **Data Timestamps**: When each data source was last updated
- **Confidence Intervals**: Uncertainty ranges for risk scores
- **Alternative Sources**: Show multiple data sources when available

### 2. Geographic Precision

- **Precise Water Body Identification**: "Town Cove" vs "Cape Cod Bay"
- **Micro-location Analysis**: Specific flood zones and elevations
- **Local FEMA Panel References**: Exact map panel numbers and dates

### 3. Interactive Data Verification

Users should be able to:
- **Click to verify**: Direct links to source FEMA maps
- **See confidence scores**: How certain we are about each risk factor
- **Report discrepancies**: Feedback mechanism for corrections
- **View methodology**: How we calculate composite scores

## Implementation Plan

### Phase 1: Enhanced Data Structure
```json
{
  "floodRisk": {
    "score": 78,
    "category": "HIGH",
    "sources": [
      {
        "name": "FEMA FIRM",
        "value": "1:100 year (Zone AE)",
        "url": "https://msc.fema.gov/portal/search",
        "panel": "25001C0420F",
        "effective_date": "2014-07-16",
        "confidence": 0.95
      },
      {
        "name": "NOAA Sea Level Rise",
        "value": "High vulnerability",
        "url": "https://coast.noaa.gov/slr/",
        "confidence": 0.85
      }
    ],
    "methodology": "Composite score from FEMA base flood elevation, storm surge modeling, and sea level rise projections",
    "lastUpdated": "2025-01-15T20:00:00Z"
  }
}
```

### Phase 2: User Interface Enhancements
- **Source buttons**: Click any risk score to see supporting data
- **Confidence indicators**: Visual confidence levels for each assessment
- **Dispute mechanism**: "Report an issue" for each data point
- **Methodology tooltips**: Explain how scores are calculated

### Phase 3: Quality Assurance
- **Local validation**: Cross-reference with multiple authoritative sources
- **Peer review**: Professional review of high-value property assessments
- **Feedback loop**: Incorporate user corrections into data model

## Specific Corrections Needed

### 48 Tonset Rd, Orleans, MA:
1. **Water Body**: Change "Cape Cod Bay" to "Town Cove (connects to Cape Cod Bay)"
2. **FEMA Verification**: Cross-check actual FEMA map panel for this address
3. **Flood Risk**: Reconcile our assessment with FEMA 1:100 year designation
4. **Attribution**: Add direct links to:
   - FEMA Map Service Center for exact panel
   - NOAA storm surge data
   - Local Orleans flood ordinances
   - Historical flood events in Town Cove area

## Trust & Credibility Measures

### Transparency Features:
- **"How we calculate"** section for each risk type
- **Data freshness indicators** (e.g., "FEMA data updated 2014")
- **Uncertainty ranges** (e.g., "Flood risk: 75-81/100")
- **Alternative scenarios** (e.g., "If sea level rises 1 foot: 85/100")

### Quality Indicators:
- **Source authority ranking** (FEMA = highest, private models = lower)
- **Data age warnings** (flag data >5 years old)
- **Conflict resolution** (show when sources disagree)
- **Local expert review** (flag when local officials have reviewed)

## User Experience Improvements

### Before:
"Flood risk: 78/100 (HIGH)"

### After:
"Flood risk: 78/100 (HIGH) ⓘ
Sources: FEMA Zone AE (1:100 year) | NOAA Storm Surge Model | Local Ordinances
Last Updated: FEMA 2014, NOAA 2023
[View Sources] [Report Issue] [Methodology]"

This addresses the homeowner's concerns while building a more trustworthy, verifiable platform.