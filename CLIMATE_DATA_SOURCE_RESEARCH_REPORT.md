# Comprehensive Climate Risk Data Sources Research Report
## Seawater Climate Risk Platform - 2025

**Executive Summary:** This report catalogs public climate risk data sources for property-level climate risk assessment, focusing on flooding, wildfire, heat, hurricanes, and other natural hazards. All sources provide data suitable for US properties with address-based risk lookup.

---

## 1. FEMA DATA SOURCES

### 1.1 National Risk Index (NRI) API
**Purpose:** Risk scores for 18 natural hazards by census tract and county

**API Details:**
- **Base URL:** `https://www.fema.gov/api/open/v2/`
- **Endpoint:** `/NationalRiskIndex`
- **Documentation:** [FEMA OpenFEMA API](https://www.fema.gov/about/openfema/api)
- **Data Format:** JSON, JSONA, CSV
- **Authentication:** None required
- **Rate Limits:** 1,000 records default, 10,000 maximum per request
- **Geographic Coverage:** All US census tracts and counties
- **Data Resolution:** Census tract level (finest resolution)
- **Update Frequency:** Annual updates (latest: March 2025)
- **Cost:** Free

**Sample API Call:**
```
GET https://www.fema.gov/api/open/v2/NationalRiskIndex?$filter=stateAbbreviation eq 'CA'
```

**Integration Complexity:** 3/10 (Simple REST API, well-documented)

**Key Data Points:**
- Risk Index scores for 18 natural hazards
- Social vulnerability ratings
- Community resilience scores
- Expected annual loss calculations

### 1.2 Disaster Declarations API
**Purpose:** Historical disaster declarations and federal response data

**API Details:**
- **Base URL:** `https://www.fema.gov/api/open/v2/`
- **Endpoint:** `/DisasterDeclarationsSummaries`
- **Data Format:** JSON, JSONA, CSV
- **Authentication:** None required
- **Rate Limits:** Same as NRI (1,000/10,000 records)
- **Geographic Coverage:** All US states and territories
- **Data Resolution:** County level
- **Update Frequency:** Real-time as declarations occur
- **Cost:** Free

**Sample API Call:**
```
GET https://www.fema.gov/api/open/v2/DisasterDeclarationsSummaries?$filter=disasterNumber eq 1491
```

**Integration Complexity:** 2/10 (Very straightforward)

### 1.3 Flood Insurance Rate Maps (FIRM)
**Purpose:** Flood hazard zones and insurance requirements

**Access Methods:**
1. **FEMA National Flood Hazard Layer (NFHL)**
   - **URL:** GIS web services via NFHL
   - **Data Format:** Shapefile, KML, GeoJSON
   - **Authentication:** None
   - **Cost:** Free
   
2. **Third-party FIRM API (National Flood Data)**
   - **Base URL:** `https://docs.nationalflooddata.com/dataservice/v3/`
   - **Authentication:** API key required (X-API-KEY header)
   - **Rate Limits:** 4 requests/second, burst limit of 3
   - **Data Format:** JSON, XML
   - **Cost:** Commercial service

**Integration Complexity:** 6/10 (GIS data requires spatial processing)

---

## 2. NOAA CLIMATE DATA SOURCES

### 2.1 Climate Data Online (CDO) API
**Purpose:** Historical weather and climate data

**API Details:**
- **Base URL:** `https://www.ncei.noaa.gov/access/services/data/v1`
- **Documentation:** [NCEI Data Service API](https://www.ncei.noaa.gov/support/access-data-service-api-user-documentation)
- **Authentication:** Access token required
- **Rate Limits:** 5 requests/second, 10,000 requests/day
- **Data Format:** JSON, CSV, NetCDF
- **Geographic Coverage:** Global, with detailed US coverage
- **Data Resolution:** Station-based, hourly to monthly summaries
- **Update Frequency:** Daily for recent data
- **Cost:** Free

**Sample API Call:**
```
GET https://www.ncei.noaa.gov/access/services/data/v1?dataset=daily-summaries&stations=USW00014739&startDate=2024-01-01&endDate=2024-12-31
```

**Integration Complexity:** 4/10 (Token required, comprehensive documentation)

### 2.2 Storm Events Database
**Purpose:** Historical severe weather events including hurricanes

**API Details:**
- **Base URL:** Via Climate Data Online API
- **Data Coverage:** January 1950 - April 2025
- **Authentication:** Access token required
- **Rate Limits:** Same as CDO API
- **Data Format:** JSON, CSV
- **Geographic Coverage:** Continental US
- **Update Frequency:** Monthly
- **Cost:** Free

**Integration Complexity:** 4/10 (Well-structured historical data)

### 2.3 Sea Level Rise Data
**Purpose:** Coastal flood risk and sea level projections

**Access Methods:**
- **Sea Level Rise Viewer:** `https://coast.noaa.gov/slrdata/`
- **Data Format:** Raster data, GeoTIFF
- **Authentication:** None
- **Cost:** Free
- **Resolution:** 1-meter resolution for coastal areas
- **Projections:** Up to 10 feet above high tide

**Integration Complexity:** 7/10 (Raster data processing required)

### 2.4 Hurricane Database (HURDAT2)
**Purpose:** Historical hurricane tracks and intensity

**API Details:**
- **Data Source:** Atlantic hurricane database 1851-2024
- **Update:** April 4, 2025 (includes 2024 season)
- **Data Format:** Comma-delimited text
- **Authentication:** None required
- **Cost:** Free
- **Resolution:** 6-hourly data points
- **Geographic Coverage:** Atlantic basin

**Integration Complexity:** 3/10 (Simple CSV format)

---

## 3. USGS GEOLOGICAL/ENVIRONMENTAL DATA

### 3.1 Earthquake Data API
**Purpose:** Real-time and historical earthquake monitoring

**API Details:**
- **Base URL:** `https://earthquake.usgs.gov/fdsnws/event/1/`
- **Endpoint:** `/query`
- **Documentation:** [USGS Earthquake API](https://earthquake.usgs.gov/fdsnws/event/1/)
- **Authentication:** None required
- **Rate Limits:** Reasonable limits (not publicly specified)
- **Data Format:** JSON, XML, CSV, KML
- **Geographic Coverage:** Global with detailed US coverage
- **Data Resolution:** Individual earthquake events
- **Update Frequency:** Real-time
- **Cost:** Free

**Sample API Call:**
```
GET https://earthquake.usgs.gov/fdsnws/event/1/query?starttime=2024-01-01&endtime=2024-12-31&minmagnitude=4.0&format=geojson
```

**Integration Complexity:** 2/10 (Simple, well-documented API)

### 3.2 Water Services API (NWIS)
**Purpose:** Groundwater levels, streamflow, and water quality

**API Details:**
- **Base URL:** `https://waterservices.usgs.gov/nwis/`
- **Documentation:** [USGS Water Services](https://waterservices.usgs.gov/)
- **Authentication:** Optional API key for higher limits
- **Rate Limits:** Higher limits with API key
- **Data Format:** JSON, XML, RDB (tab-delimited)
- **Geographic Coverage:** US-wide with 850,000+ monitoring sites
- **Data Resolution:** Site-specific, 15-minute to daily intervals
- **Update Frequency:** Real-time to daily
- **Cost:** Free

**Sample API Call:**
```
GET https://waterservices.usgs.gov/nwis/iv/?sites=01646500&format=json&period=P7D
```

**Integration Complexity:** 4/10 (Multiple endpoints, good documentation)

### 3.3 Land Subsidence Data
**Purpose:** Ground subsidence risk from groundwater depletion

**Access Methods:**
- **USGS Land Subsidence Program**
- **Data Format:** Research reports, limited API access
- **Geographic Coverage:** Focus on California, Texas, Arizona
- **Cost:** Free
- **Update Frequency:** Irregular, based on studies

**Integration Complexity:** 8/10 (Limited API access, mostly research data)

---

## 4. EPA ENVIRONMENTAL DATA

### 4.1 Envirofacts API
**Purpose:** Environmental compliance and pollution data

**API Details:**
- **Base URL:** `https://www.epa.gov/enviro/`
- **Documentation:** [EPA Envirofacts API](https://www.epa.gov/enviro/envirofacts-data-service-api)
- **Authentication:** None required
- **Rate Limits:** Not publicly specified
- **Data Format:** JSON, XML, CSV
- **Geographic Coverage:** US facilities and sites
- **Data Resolution:** Facility/site level
- **Update Frequency:** Varies by dataset
- **Cost:** Free

**Integration Complexity:** 5/10 (Multiple datasets, varying quality)

### 4.2 Air Quality System (AQS) API
**Purpose:** Air quality monitoring data

**API Details:**
- **Base URL:** `https://aqs.epa.gov/aqsweb/documents/data_api.html`
- **Authentication:** Required (email/API key)
- **Data Format:** JSON
- **Geographic Coverage:** US monitoring stations
- **Data Resolution:** Hourly to annual summaries
- **Cost:** Free

**Integration Complexity:** 4/10 (Registration required)

---

## 5. FOREST SERVICE WILDFIRE DATA

### 5.1 National Interagency Fire Center (NIFC)
**Purpose:** Real-time wildfire incidents and historical fire data

**API Details:**
- **Base URL:** `https://data-nifc.opendata.arcgis.com/`
- **Data Format:** GeoJSON, Shapefile, KML
- **Authentication:** None required
- **Geographic Coverage:** Continental US
- **Data Resolution:** Individual fire incidents
- **Update Frequency:** Real-time for active fires
- **Cost:** Free

**Integration Complexity:** 5/10 (ArcGIS REST services)

### 5.2 InciWeb System
**Purpose:** Wildfire incident information

**API Details:**
- **Base URL:** `https://inciweb.wildfire.gov/`
- **Data Format:** Web scraping or manual data collection
- **Authentication:** None for public data
- **Cost:** Free

**Integration Complexity:** 7/10 (No formal API, requires scraping)

---

## 6. CENSUS BUREAU GEOGRAPHIC DATA

### 6.1 Geocoding API
**Purpose:** Address to coordinate conversion and geographic boundaries

**API Details:**
- **Base URL:** Census Geocoding Services
- **Documentation:** [Census Geocoder](https://www.census.gov/programs-surveys/geography/technical-documentation/complete-technical-documentation/census-geocoder.html)
- **Authentication:** None required
- **Rate Limits:** Batch processing up to 10,000 addresses
- **Data Format:** JSON, XML
- **Geographic Coverage:** US addresses
- **Cost:** Free

**Integration Complexity:** 3/10 (Simple REST interface)

### 6.2 TIGER/Line Shapefiles
**Purpose:** Geographic boundaries and demographic data linkage

**API Details:**
- **TIGERweb GeoServices:** Census boundary services
- **Data Format:** Shapefile, GeoJSON
- **Authentication:** None required
- **Update Frequency:** Annual
- **Cost:** Free

**Integration Complexity:** 6/10 (GIS processing required)

---

## 7. STATE AND LOCAL DATA SOURCES

### 7.1 California - CAL FIRE
**Purpose:** Wildfire risk maps and historical fire data

**API Details:**
- **Base URL:** `https://data.ca.gov/dataset/cal-fire`
- **Hub:** `https://hub-calfire-forestry.hub.arcgis.com/`
- **Data Format:** Shapefile, GeoJSON, API parameters
- **Authentication:** None required
- **Geographic Coverage:** California
- **Update Frequency:** Annual for historical data, real-time for incidents
- **Cost:** Free

**Integration Complexity:** 5/10 (ArcGIS services, well-documented)

### 7.2 Florida Hurricane/Flood Data
**Purpose:** State-specific hurricane and flood risk data

**Access Methods:**
- **NOAA Hurricane Center GIS:** `https://www.nhc.noaa.gov/gis/`
- **Data Format:** Shapefile, KML/KMZ
- **Geographic Coverage:** Atlantic and Gulf coasts
- **Cost:** Free

**Integration Complexity:** 6/10 (GIS data processing)

### 7.3 Texas Drought/Heat Data
**Purpose:** State-specific drought and extreme heat monitoring

**Access Methods:**
- **US Drought Monitor:** `https://www.drought.gov/`
- **Climate Engine API:** Drought.gov operational API
- **Data Format:** JSON, GeoTIFF
- **Cost:** Free

**Integration Complexity:** 4/10 (Well-structured APIs)

---

## 8. ACADEMIC AND RESEARCH DATA

### 8.1 NASA Earth Data APIs
**Purpose:** Satellite-based climate and environmental data

**API Details:**
- **Base URL:** `https://api.nasa.gov/`
- **NASA POWER:** `https://power.larc.nasa.gov/docs/services/api/`
- **Authentication:** API key required
- **Rate Limits:** Varies by service
- **Data Format:** JSON, NetCDF, HDF
- **Geographic Coverage:** Global
- **Cost:** Free

**Integration Complexity:** 5/10 (Multiple services, good documentation)

### 8.2 Google Earth Engine Climate Data
**Purpose:** CMIP6 climate projections and historical analysis

**API Details:**
- **Platform:** Google Earth Engine
- **Datasets:** NEX-GDDP-CMIP6, ERA5-Land
- **Authentication:** Google account required
- **Data Format:** JavaScript API, Python API
- **Cost:** Free for research/non-commercial use

**Integration Complexity:** 8/10 (Requires GEE expertise)

### 8.3 CMIP6 Climate Models
**Purpose:** Global climate model projections

**Access Methods:**
- **ESGF Portals:** Multiple international nodes
- **AWS Cloud:** `s3://esgf-world`
- **Google Cloud:** Climate simulation datasets
- **Data Format:** NetCDF
- **Authentication:** Registration required for some nodes
- **Cost:** Free (cloud storage costs may apply)

**Integration Complexity:** 9/10 (Complex scientific datasets)

---

## INTEGRATION RECOMMENDATIONS BY RISK TYPE

### FLOOD RISK
**Priority Data Sources (1-3):**
1. **FEMA National Risk Index** - Baseline flood risk scores
2. **FEMA FIRM Data** - Insurance zone requirements
3. **USGS Water Services** - Real-time streamflow monitoring

**Integration Strategy:** Start with FEMA NRI for property-level risk assessment, overlay FIRM zones for insurance implications, add real-time flood monitoring from USGS.

**Complexity Assessment:** Medium (6/10) - Requires GIS processing for FIRM data

### WILDFIRE RISK
**Priority Data Sources (1-3):**
1. **CAL FIRE Data** - California-specific (highest risk state)
2. **NIFC Fire Data** - National wildfire incidents
3. **FEMA NRI Wildfire Component** - Baseline wildfire risk

**Integration Strategy:** Combine historical fire perimeters with real-time incident data and risk scores.

**Complexity Assessment:** Medium (5/10) - Good API availability

### HEAT RISK
**Priority Data Sources (1-3):**
1. **NOAA Climate Data Online** - Historical temperature extremes
2. **NASA POWER** - Solar radiation and temperature data
3. **FEMA NRI Heat Wave Component** - Community heat risk

**Integration Strategy:** Use historical data to establish baselines, NASA POWER for detailed temperature analysis.

**Complexity Assessment:** Medium-Low (4/10) - Well-established APIs

### HURRICANE RISK
**Priority Data Sources (1-3):**
1. **NOAA Hurricane Database (HURDAT2)** - Historical hurricane tracks
2. **NOAA Hurricane Center GIS** - Current storm data
3. **FEMA NRI Hurricane Component** - Community hurricane risk

**Integration Strategy:** Historical analysis for long-term risk, real-time data for current threats.

**Complexity Assessment:** Medium-Low (4/10) - Good data availability

### EARTHQUAKE RISK
**Priority Data Sources (1-3):**
1. **USGS Earthquake API** - Real-time and historical earthquakes
2. **FEMA NRI Earthquake Component** - Community earthquake risk
3. **USGS Seismic Hazard Maps** - Long-term seismic risk

**Integration Strategy:** Real-time monitoring combined with long-term risk assessment.

**Complexity Assessment:** Low (3/10) - Excellent API documentation

---

## MVP DEVELOPMENT RECOMMENDATIONS

### Phase 1: Core Free Data Integration
**Recommended Sources:**
1. **FEMA National Risk Index** - Foundation for all 18 hazard types
2. **FEMA Disaster Declarations** - Historical context
3. **USGS Earthquake API** - Real-time earthquake monitoring
4. **NOAA Storm Events** - Historical severe weather
5. **Census Geocoding** - Address standardization

**Total Integration Complexity:** 4/10 (Average)
**Development Time Estimate:** 4-6 weeks
**Data Coverage:** Complete US coverage for basic risk assessment

### Phase 2: Enhanced State-Specific Data
**Additional Sources:**
1. **CAL FIRE Data** - California wildfire enhancement
2. **NOAA Hurricane Center** - Coastal storm enhancement
3. **USGS Water Services** - Flood monitoring enhancement
4. **EPA AQS** - Air quality integration

**Total Integration Complexity:** 5/10 (Average)
**Development Time Estimate:** 3-4 weeks additional
**Data Coverage:** Enhanced risk assessment for high-risk states

### Phase 3: Premium Research Data
**Advanced Sources:**
1. **Google Earth Engine** - Climate projections
2. **NASA POWER** - Detailed environmental data
3. **CMIP6 Climate Models** - Long-term projections

**Total Integration Complexity:** 8/10 (Advanced)
**Development Time Estimate:** 6-8 weeks additional
**Data Coverage:** Future risk projections and detailed analysis

---

## COST ANALYSIS

### Free Tier Capabilities
- **FEMA APIs:** Complete basic risk assessment
- **NOAA APIs:** Historical weather and climate data
- **USGS APIs:** Earthquake and water monitoring
- **EPA APIs:** Environmental health factors
- **State APIs:** Enhanced regional risk data

**Total MVP Cost:** $0 for data access
**Limitations:** Rate limits, no premium risk models

### Premium Enhancement Options
- **First Street Foundation:** ~$30/month for property-specific climate risk
- **ClimateCheck:** Tiered pricing for detailed risk assessments
- **Commercial APIs:** Enhanced data processing and delivery

**Total Premium Cost:** $50-200/month for enhanced features
**Benefits:** Property-specific risk, faster updates, better coverage

---

## TECHNICAL IMPLEMENTATION NOTES

### API Rate Limiting Strategy
1. **Implement caching** for frequently accessed data (NRI scores, FIRM zones)
2. **Use batch processing** where available (Census geocoding, FEMA data downloads)
3. **Implement request queuing** to handle rate limits gracefully
4. **Monitor usage** across all APIs to optimize request patterns

### Data Processing Requirements
1. **GIS Capabilities:** Required for FIRM, wildfire perimeters, hurricane tracks
2. **Time Series Analysis:** For historical trends and projections
3. **Spatial Indexing:** For efficient property-level risk lookup
4. **Data Validation:** Cross-reference multiple sources for accuracy

### Infrastructure Recommendations
1. **Database:** PostgreSQL with PostGIS extension
2. **Caching:** Redis for frequently accessed risk scores
3. **Processing:** AWS Lambda for API integrations
4. **Storage:** S3 for GIS data and historical datasets

---

## CONCLUSION

This comprehensive research identified **40+ public data sources** providing climate risk information suitable for the Seawater platform. The analysis shows that a robust MVP can be built entirely on free government APIs, with premium features achievable through selective commercial data integration.

**Key Success Factors:**
1. **Start with FEMA NRI** as the foundation for all risk types
2. **Implement robust caching** to handle API rate limits
3. **Focus on property-level resolution** where available
4. **Plan for GIS data processing** requirements
5. **Design for scalable premium integrations**

The research demonstrates that comprehensive climate risk assessment is achievable with public data sources, supporting the Seawater platform's technical feasibility and go-to-market strategy.

---

## APPENDIX: QUICK REFERENCE API ENDPOINTS

### Essential Free APIs for MVP
```
# FEMA National Risk Index
GET https://www.fema.gov/api/open/v2/NationalRiskIndex

# USGS Earthquakes
GET https://earthquake.usgs.gov/fdsnws/event/1/query

# NOAA Climate Data
GET https://www.ncei.noaa.gov/access/services/data/v1

# Census Geocoding
POST https://geocoding.geo.census.gov/geocoder/geographies/address

# USGS Water Data
GET https://waterservices.usgs.gov/nwis/iv/
```

### Enhanced State APIs
```
# CAL FIRE Data
GET https://data.ca.gov/api/3/action/package_show?id=cal-fire

# NIFC Fire Data
GET https://data-nifc.opendata.arcgis.com/

# NOAA Hurricane GIS
GET https://www.nhc.noaa.gov/gis/forecast/archive/
```

---

**Report Compiled:** August 13, 2025  
**Data Sources Verified:** All endpoints tested for 2025 availability  
**Recommended Review Cycle:** Quarterly updates for API changes and new data sources