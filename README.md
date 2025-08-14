# 🌊 Seawater Climate Risk Platform

**Accessible climate risk information for home buyers, movers, and real estate professionals**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-22.x-brightgreen.svg)](https://nodejs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15+-blue.svg)](https://www.postgresql.org/)
[![AWS](https://img.shields.io/badge/AWS-Serverless-orange.svg)](https://aws.amazon.com/)

## 📋 Project Overview

Seawater is a comprehensive climate risk assessment platform that provides property-level climate risk information through integration with multiple authoritative data sources including FEMA, NOAA, USGS, and premium climate risk services.

### Key Features
- **Property Risk Assessment**: Comprehensive climate risk scores for any US property
- **Multi-Hazard Analysis**: Flood, wildfire, hurricane, earthquake, heat, and drought risks
- **Interactive Mapping**: MapBox-powered visualization with risk overlays
- **Professional Tools**: Bulk analysis, client management, and white-label reporting
- **Real-Time Data**: Integration with 40+ climate data sources
- **Dual Units**: Complete English/Metric unit support

## 🏗️ Architecture

**Serverless-First Design:**
- **Frontend**: React 18 + TypeScript + Tailwind CSS + MapBox
- **Backend**: AWS Lambda (Node.js 22) + API Gateway + PostgreSQL + PostGIS
- **Data Sources**: FEMA, NOAA, USGS, First Street, ClimateCheck, MapBox
- **Infrastructure**: AWS SAM for Infrastructure as Code

## 🚀 Quick Start

### Prerequisites
- Node.js 22+
- AWS CLI configured
- SAM CLI installed
- PostgreSQL client (for database initialization)
- MapBox account (free tier available)

### Phase 1 Deployment

1. **Clone and Configure**
   ```bash
   git clone https://github.com/yourusername/seawater.git
   cd seawater
   cp .env.example .env
   # Edit .env with your API keys
   ```

2. **Deploy Infrastructure**
   ```bash
   chmod +x deploy-phase1-simple.sh
   ./deploy-phase1-simple.sh
   ```

3. **Test Deployment**
   ```bash
   # Health check
   curl https://your-api-id.execute-api.us-east-2.amazonaws.com/dev/health
   
   # Property risk assessment
   curl "https://your-api-id.execute-api.us-east-2.amazonaws.com/dev/properties/1600%20Pennsylvania%20Avenue/risk"
   ```

## 📊 Sample Output

**Property Risk Assessment for Orleans, MA:**
```json
{
  "success": true,
  "data": {
    "property": {
      "address": "48 Tonset Rd, Orleans, MA 02653",
      "location": {
        "latitude": 41.7901,
        "longitude": -69.9892,
        "elevation": {"feet": 12, "meters": 3.7}
      }
    },
    "riskAssessment": {
      "overall": {"score": 72, "category": "HIGH"},
      "detailedRisks": {
        "floodRisk": {"score": 78, "category": "HIGH"},
        "hurricaneRisk": {"score": 81, "category": "HIGH"},
        "coastalErosion": {"score": 85, "category": "VERY_HIGH"}
      }
    },
    "insurance": {
      "floodInsurance": {"required": true, "estimatedPremium": 2850},
      "totalEstimatedPremium": 4050
    }
  }
}
```

See complete examples in [`examples/`](examples/) directory.

## 🔧 Development

### Backend Development
```bash
cd src/backend
npm install
npm test
```

### Frontend Development
```bash
cd src/frontend
npm install
npm run dev
```

### Database Setup
```bash
# Initialize PostgreSQL + PostGIS schema
psql -h your-db-endpoint -U postgres -d seawater -f database/init-schema.sql
```

## 📈 Scalability & Security

The platform follows a **progressive security enhancement** model based on usage thresholds:

| Level | Users | Cost/Month | Features |
|-------|-------|------------|----------|
| **Level 1** | <100 | $30-50 | Basic security, pilot deployment |
| **Level 2** | 100-500 | $75-125 | WAF, enhanced monitoring, Redis |
| **Level 3** | 500-2000 | $150-250 | VPC, SOC2, Multi-AZ database |
| **Level 4** | 2000+ | $300-500 | Multi-region, 99.9% SLA, enterprise |

See [Security Roadmap](docs/SECURITY_ROADMAP.md) for complete details.

## 📚 Documentation

- **[Technical Specifications](docs/TECHNICAL_SPECIFICATIONS.md)** - Complete technical overview
- **[Business Case](docs/BUSINESS_CASE.md)** - Market analysis and financial projections
- **[Implementation Plan](docs/IMPLEMENTATION_PLAN.md)** - 26-week development roadmap
- **[API Architecture](API_ARCHITECTURE.md)** - REST API documentation
- **[Database Schema](DATABASE_SCHEMA.md)** - PostgreSQL + PostGIS schema
- **[UX/UI Design](UX_UI_DESIGN_SPECIFICATION.md)** - Component specifications
- **[Testing Guide](docs/TESTING_GUIDE.md)** - Comprehensive testing framework
- **[Phase 1 Deployment](README-PHASE1.md)** - MVP deployment guide

## 🌍 Data Sources

**Free Government Sources:**
- **FEMA National Risk Index** - 18 natural hazards by census tract
- **NOAA Climate Data** - Weather and climate projections
- **USGS** - Earthquake and geological hazards
- **State Data** - Wildfire, flood, and emergency management

**Premium Sources:**
- **First Street Foundation** - Property-specific climate projections ($30/month)
- **ClimateCheck** - Comprehensive risk analytics (usage-based)
- **MapBox** - High-precision geocoding (50K requests/month free)

See [Climate Data Research](CLIMATE_DATA_SOURCE_RESEARCH_REPORT.md) for complete catalog.

## 🎯 Use Cases

**For Home Buyers:**
- Property risk assessment before purchase
- Insurance cost estimation
- Mitigation recommendations
- Long-term climate projections

**For Real Estate Professionals:**
- Client property analysis
- Comparative market analysis with climate risks
- Listing enhancement with risk disclosures
- Professional reporting tools

**For Insurance Professionals:**
- Risk-based pricing analysis
- Portfolio risk assessment
- Mitigation program development
- Regulatory compliance reporting

## 💰 Business Model

**Subscription Tiers:**
- **Free**: 10 property assessments/month
- **Premium**: $19/month - 100 assessments, detailed reports
- **Professional**: $99/month - 500 assessments, client management, API access
- **Enterprise**: Custom pricing - unlimited assessments, white-label, dedicated support

**Financial Projections:**
- Year 1: $250K revenue, 2,500 users
- Year 2: $850K revenue, 7,500 users  
- Year 3: $2.1M revenue, 15,000 users
- **282% ROI** over 3 years

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Documentation**: Check the `docs/` directory for comprehensive guides
- **Issues**: Report bugs and feature requests via GitHub Issues
- **Security**: Report security vulnerabilities to security@seawater.io

## 🌟 Acknowledgments

- **FEMA** for providing open access to the National Risk Index
- **NOAA** for comprehensive climate data
- **USGS** for geological hazard information
- **MapBox** for mapping and geocoding services
- **Tim-Combo** project for infrastructure patterns and security guidelines

---

**Built with ❤️ for climate resilience and informed decision-making**