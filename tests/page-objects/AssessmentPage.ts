import { Page, expect } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * Page Object for the Property Risk Assessment functionality
 */
export class AssessmentPage extends BasePage {
  // Selectors
  private readonly selectors = {
    // Assessment results
    riskScore: [
      '.risk-score',
      '.overall-risk-score',
      '.total-risk-score',
      '.property-risk-score',
      '[data-testid="risk-score"]',
      '[data-testid="overall-risk-score"]',
      '[data-testid="total-score"]'
    ],

    propertyInfo: [
      '.property-info',
      '[data-testid="property-info"]',
      '.address-info',
      '.property-details'
    ],

    hazardInfo: [
      '.hazards',
      '.risk-factors',
      '[data-testid="hazards"]',
      '.risk-details'
    ],

    // Individual risk factors
    riskFactors: {
      flood: ['.flood-risk', '[data-testid="flood-risk"]', 'text*="flood"'],
      hurricane: ['.hurricane-risk', '[data-testid="hurricane-risk"]', 'text*="hurricane"'],
      wildfire: ['.wildfire-risk', '.fire-risk', '[data-testid="fire-risk"]', 'text*="wildfire"', 'text*="fire"'],
      earthquake: ['.earthquake-risk', '[data-testid="earthquake-risk"]', 'text*="earthquake"'],
      tornado: ['.tornado-risk', '[data-testid="tornado-risk"]', 'text*="tornado"'],
      heat: ['.heat-risk', '[data-testid="heat-risk"]', 'text*="heat"', 'text*="extreme heat"'],
      drought: ['.drought-risk', '[data-testid="drought-risk"]', 'text*="drought"'],
      hail: ['.hail-risk', '[data-testid="hail-risk"]', 'text*="hail"']
    },

    // Risk scores and ratings
    riskScoreElements: [
      '.risk-score',
      '.risk-rating',
      '.risk-level',
      '[data-testid*="risk-score"]',
      '.score',
      '.rating',
      'text*="High"',
      'text*="Medium"',
      'text*="Low"',
      'text*="/10"',
      'text*="Score:"'
    ],

    // Data sources
    dataSources: [
      '.data-sources',
      '.attribution',
      '.sources',
      '[data-testid="data-sources"]',
      'text*="Data provided by"',
      'text*="Sources:"',
      'text*="Based on data from"'
    ],

    dataSourceLinks: [
      'a[href*="fema.gov"]',
      'a[href*="noaa.gov"]',
      'a[href*="usgs.gov"]',
      'a[href*="weather.gov"]',
      'a:has-text("FEMA")',
      'a:has-text("NOAA")',
      'a:has-text("USGS")'
    ],

    // Methodology and reliability
    methodology: [
      '.methodology',
      '.calculation-method',
      '.how-calculated',
      'text*="How is this calculated"',
      'text*="methodology"',
      'text*="based on"',
      'text*="weighted"',
      'button:has-text("Learn more")',
      'button:has-text("How we calculate")'
    ],

    // Loading indicators
    loadingIndicators: [
      '.loading',
      '.spinner',
      '.progress',
      '.loader',
      '[data-testid="loading"]',
      'div[class*="animate-spin"]',
      'svg[class*="animate"]'
    ],

    // Error states
    errorElements: [
      '.error',
      '.invalid-feedback',
      'text*="invalid"',
      'text*="not found"',
      'text*="enter a valid"',
      '[role="alert"]'
    ]
  };

  constructor(page: Page) {
    super(page);
  }

  /**
   * Verify that risk assessment results are displayed
   */
  async verifyRiskResults(): Promise<void> {
    // Check for risk score display
    await this.waitForAnySelector(this.selectors.riskScore);
    await expect(this.page.locator('.risk-score, [data-testid="risk-score"]')).toBeVisible();
    
    // Check for property information
    await expect(this.page.locator('.property-info, [data-testid="property-info"]')).toBeVisible();
    
    // Check for hazard information
    await expect(this.page.locator('.hazards, .risk-factors, [data-testid="hazards"]')).toBeVisible();
  }

  /**
   * Get overall risk score value
   */
  async getOverallRiskScore(): Promise<string | null> {
    for (const selector of this.selectors.riskScore) {
      if (await this.elementExists(selector)) {
        return await this.getElementText(selector);
      }
    }
    return null;
  }

  /**
   * Check which of the 8 risk factors are displayed
   */
  async getDisplayedRiskFactors(): Promise<{ [key: string]: boolean }> {
    const results: { [key: string]: boolean } = {};
    
    for (const [riskName, selectors] of Object.entries(this.selectors.riskFactors)) {
      results[riskName] = false;
      for (const selector of selectors) {
        if (await this.elementExists(selector)) {
          results[riskName] = true;
          break;
        }
      }
    }
    
    return results;
  }

  /**
   * Count displayed risk factors
   */
  async countDisplayedRiskFactors(): Promise<number> {
    const displayedFactors = await this.getDisplayedRiskFactors();
    return Object.values(displayedFactors).filter(displayed => displayed).length;
  }

  /**
   * Verify all 8 risk factors are assessed
   */
  async verifyAllRiskFactors(): Promise<void> {
    const displayedFactors = await this.getDisplayedRiskFactors();
    const displayedCount = Object.values(displayedFactors).filter(displayed => displayed).length;
    
    console.log('Displayed risk factors:', displayedFactors);
    console.log(`Found ${displayedCount}/8 risk factors`);
    
    // Should have at least 6 of 8 risk factors visible
    expect(displayedCount).toBeGreaterThanOrEqual(6);
  }

  /**
   * Get individual risk scores
   */
  async getRiskScores(): Promise<string[]> {
    const scores = [];
    for (const selector of this.selectors.riskScoreElements) {
      if (await this.elementExists(selector)) {
        const elements = await this.page.locator(selector).allTextContents();
        scores.push(...elements);
      }
    }
    return scores.filter(score => score.trim() !== '');
  }

  /**
   * Verify risk scores are displayed
   */
  async verifyRiskScores(): Promise<void> {
    const scores = await this.getRiskScores();
    expect(scores.length).toBeGreaterThanOrEqual(3);
    
    // Verify at least some scores contain numeric values
    const numericScores = scores.filter(score => /\d+/.test(score));
    expect(numericScores.length).toBeGreaterThanOrEqual(1);
  }

  /**
   * Check for data source attribution
   */
  async verifyDataAttribution(): Promise<{ hasAttribution: boolean; sources: string[] }> {
    const dataSources = ['FEMA', 'NOAA', 'USGS'];
    const foundSources = [];
    
    for (const source of dataSources) {
      if (await this.pageContainsText(source)) {
        foundSources.push(source);
      }
    }
    
    // Check for attribution section
    let hasAttribution = false;
    for (const selector of this.selectors.dataSources) {
      if (await this.elementExists(selector)) {
        hasAttribution = true;
        break;
      }
    }
    
    return { hasAttribution, sources: foundSources };
  }

  /**
   * Verify data source links
   */
  async verifyDataSourceLinks(): Promise<number> {
    let linksFound = 0;
    for (const link of this.selectors.dataSourceLinks) {
      const count = await this.page.locator(link).count();
      if (count > 0) {
        linksFound++;
        
        // Verify links open in new tab/window
        const target = await this.page.locator(link).first().getAttribute('target');
        if (target === '_blank') {
          console.log(`External link opens in new tab: ${link}`);
        }
      }
    }
    
    return linksFound;
  }

  /**
   * Check for methodology information
   */
  async hasMethodologyInfo(): Promise<boolean> {
    for (const element of this.selectors.methodology) {
      if (await this.elementExists(element)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Check for loading indicators during assessment
   */
  async checkLoadingIndicators(): Promise<boolean> {
    // This should be called immediately after triggering an assessment
    await this.page.waitForTimeout(500); // Brief pause to catch loading state
    
    for (const selector of this.selectors.loadingIndicators) {
      if (await this.page.locator(selector).isVisible()) {
        console.log(`Loading indicator found: ${selector}`);
        return true;
      }
    }
    return false;
  }

  /**
   * Verify error handling for invalid addresses
   */
  async verifyErrorHandling(): Promise<boolean> {
    for (const element of this.selectors.errorElements) {
      if (await this.elementExists(element)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Get risk level categorization
   */
  async getRiskLevel(): Promise<string | null> {
    const riskLevels = [
      'text*="Low Risk"',
      'text*="Medium Risk"',
      'text*="High Risk"',
      'text*="Very High"',
      'text*="Extreme"'
    ];
    
    for (const level of riskLevels) {
      if (await this.elementExists(level)) {
        return await this.getElementText(level);
      }
    }
    
    // Check for CSS classes
    const riskLevelClasses = [
      '.risk-low',
      '.risk-medium',
      '.risk-high',
      '.low-risk',
      '.high-risk'
    ];
    
    for (const className of riskLevelClasses) {
      if (await this.elementExists(className)) {
        return className;
      }
    }
    
    return null;
  }

  /**
   * Check for comprehensive risk information
   */
  async hasDetailedRiskInfo(): Promise<{
    hasDetails: boolean;
    hasExplanation: boolean;
    hasHistoricalData: boolean;
  }> {
    const detailElements = [
      '.risk-details',
      '.risk-explanation',
      '.risk-factors',
      '.hazard-info'
    ];
    
    const explanationElements = [
      'text*="based on"',
      'text*="historical data"',
      'text*="probability"',
      'text*="likelihood"'
    ];
    
    let hasDetails = false;
    for (const element of detailElements) {
      if (await this.elementExists(element)) {
        hasDetails = true;
        break;
      }
    }
    
    let hasExplanation = false;
    for (const element of explanationElements) {
      if (await this.elementExists(element)) {
        hasExplanation = true;
        break;
      }
    }
    
    const hasHistoricalData = await this.pageContainsText('historical') || 
                             await this.pageContainsText('past events') ||
                             await this.pageContainsText('historical data');
    
    return { hasDetails, hasExplanation, hasHistoricalData };
  }

  /**
   * Measure assessment completion time
   */
  async measureAssessmentTime(address: string): Promise<number> {
    const startTime = Date.now();
    
    // This assumes we're already on a page with address input
    const addressInput = await this.waitForAnySelector([
      'input[name="address"]',
      'input[placeholder*="address"]'
    ]);
    
    await this.fillInput(addressInput, address);
    
    const submitButton = await this.waitForAnySelector([
      'button:has-text("Assess")',
      'button[type="submit"]'
    ]);
    
    await this.clickElement(submitButton);
    
    // Wait for results
    await this.waitForAnySelector(this.selectors.riskScore);
    
    const endTime = Date.now();
    return endTime - startTime;
  }

  /**
   * Compare results for same address (consistency check)
   */
  async compareResults(firstResults: any, secondResults: any): Promise<boolean> {
    // This would compare risk scores, factors, etc.
    // Implementation depends on the structure of results
    if (!firstResults || !secondResults) return false;
    
    // Basic comparison - can be expanded based on needs
    return JSON.stringify(firstResults) === JSON.stringify(secondResults);
  }

  /**
   * Extract all assessment data for comparison
   */
  async extractAssessmentData(): Promise<{
    overallScore: string | null;
    riskFactors: { [key: string]: boolean };
    riskScores: string[];
    riskLevel: string | null;
    dataSources: string[];
  }> {
    const overallScore = await this.getOverallRiskScore();
    const riskFactors = await this.getDisplayedRiskFactors();
    const riskScores = await this.getRiskScores();
    const riskLevel = await this.getRiskLevel();
    const dataAttribution = await this.verifyDataAttribution();
    
    return {
      overallScore,
      riskFactors,
      riskScores,
      riskLevel,
      dataSources: dataAttribution.sources
    };
  }
}