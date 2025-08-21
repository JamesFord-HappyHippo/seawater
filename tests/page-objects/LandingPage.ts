import { Page, expect } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * Page Object for the Seawater Landing Page
 */
export class LandingPage extends BasePage {
  // Selectors
  private readonly selectors = {
    // Address search
    addressInput: [
      'input[name="address"]',
      'input[placeholder*="address"]',
      'input[placeholder*="property"]',
      '[data-testid="address-search"]',
      '.address-search input'
    ],
    
    assessButton: [
      'button:has-text("Assess")',
      'button:has-text("Search")',
      'button:has-text("Get Risk")',
      'button:has-text("Start")',
      'button[type="submit"]'
    ],

    // Before You Choose messaging
    beforeYouChooseElements: [
      'text*="Before You Choose"',
      'h1:has-text("Before You Choose")',
      'h2:has-text("Before You Choose")',
      '[data-testid="before-you-choose"]',
      '.before-you-choose',
      '.hero-message:has-text("Before You Choose")'
    ],

    // Navigation
    navigation: [
      'nav',
      '.navigation',
      '.navbar',
      '[role="navigation"]',
      'header nav'
    ],

    // CTA buttons
    ctaButtons: [
      'button:has-text("Get Started")',
      'button:has-text("Start Free")',
      'button:has-text("Try Now")',
      'button:has-text("Assess Property")',
      'button:has-text("Check Risk")',
      '.cta-button',
      '.btn-primary',
      '[data-testid="cta"]'
    ],

    // Risk factors
    riskFactors: [
      'text*="flood"',
      'text*="hurricane"',
      'text*="wildfire"',
      'text*="earthquake"',
      'text*="tornado"',
      'text*="heat"',
      'text*="drought"',
      'text*="hail"'
    ],

    // Data sources
    dataSources: [
      'text*="FEMA"',
      'text*="NOAA"',
      'text*="USGS"'
    ]
  };

  constructor(page: Page) {
    super(page);
  }

  /**
   * Navigate to the landing page
   */
  async navigate(): Promise<void> {
    await this.goto(this.envConfig.baseURL);
  }

  /**
   * Check if "Before You Choose" messaging is displayed
   */
  async hasBeforeYouChooseMessaging(): Promise<boolean> {
    for (const selector of this.selectors.beforeYouChooseElements) {
      if (await this.elementExists(selector)) {
        await expect(this.page.locator(selector)).toBeVisible();
        return true;
      }
    }
    return false;
  }

  /**
   * Get the address search input element
   */
  private async getAddressInput() {
    const selector = await this.waitForAnySelector(this.selectors.addressInput);
    return this.page.locator(selector);
  }

  /**
   * Get the assess button element
   */
  private async getAssessButton() {
    const selector = await this.waitForAnySelector(this.selectors.assessButton);
    return this.page.locator(selector);
  }

  /**
   * Enter an address in the search input
   */
  async enterAddress(address: string): Promise<void> {
    const input = await this.getAddressInput();
    await input.fill(address);
  }

  /**
   * Click the assess/search button
   */
  async clickAssessButton(): Promise<void> {
    const button = await this.getAssessButton();
    await button.click();
  }

  /**
   * Perform a complete property assessment
   */
  async assessProperty(address: string): Promise<void> {
    await this.enterAddress(address);
    await this.clickAssessButton();
    
    // Wait for results to load
    await this.waitForElement('.risk-score, .assessment-results, [data-testid="risk-results"]');
  }

  /**
   * Check if navigation menu is present and functional
   */
  async hasWorkingNavigation(): Promise<boolean> {
    for (const navSelector of this.selectors.navigation) {
      if (await this.elementExists(navSelector)) {
        // Check for common navigation links
        const commonLinks = [
          'a:has-text("Home")',
          'a:has-text("About")',
          'a:has-text("Pricing")',
          'a:has-text("Contact")',
          'a:has-text("Login")',
          'a:has-text("Sign In")',
          'a:has-text("Dashboard")'
        ];

        let linksFound = 0;
        for (const link of commonLinks) {
          if (await this.elementExists(link)) {
            linksFound++;
          }
        }

        return linksFound >= 2;
      }
    }
    return false;
  }

  /**
   * Count visible CTA buttons
   */
  async countCTAButtons(): Promise<number> {
    let ctaCount = 0;
    for (const selector of this.selectors.ctaButtons) {
      if (await this.page.locator(selector).isVisible()) {
        ctaCount++;
      }
    }
    return ctaCount;
  }

  /**
   * Check for climate risk education content
   */
  async hasEducationalContent(): Promise<{ found: number; total: number }> {
    const educationElements = [
      'text*="climate risk"',
      'text*="property assessment"',
      'text*="comprehensive analysis"',
      'text*="8 risk factors"',
      'text*="climate data"'
    ];

    let foundCount = 0;
    for (const element of educationElements) {
      if (await this.elementExists(element)) {
        foundCount++;
      }
    }

    return { found: foundCount, total: educationElements.length };
  }

  /**
   * Count mentioned risk factors
   */
  async countMentionedRiskFactors(): Promise<number> {
    let factorsFound = 0;
    for (const factor of this.selectors.riskFactors) {
      if (await this.elementExists(factor)) {
        factorsFound++;
      }
    }
    return factorsFound;
  }

  /**
   * Check for data source attribution
   */
  async hasDataSourceAttribution(): Promise<{ sources: string[]; count: number }> {
    const foundSources = [];
    
    for (const source of this.selectors.dataSources) {
      if (await this.elementExists(source)) {
        foundSources.push(source.replace('text*="', '').replace('"', ''));
      }
    }

    return { sources: foundSources, count: foundSources.length };
  }

  /**
   * Check for value proposition elements
   */
  async hasValueProposition(): Promise<number> {
    const valueProps = [
      'text*="comprehensive"',
      'text*="accurate"',
      'text*="detailed"',
      'text*="professional"',
      'text*="reliable"',
      'text*="expert"',
      'text*="trusted"'
    ];

    let valuePropsFound = 0;
    for (const prop of valueProps) {
      if (await this.elementExists(prop)) {
        valuePropsFound++;
      }
    }

    return valuePropsFound;
  }

  /**
   * Navigate to property assessment interface
   */
  async navigateToAssessment(): Promise<void> {
    const assessmentTriggers = [
      'button:has-text("Get Started")',
      'button:has-text("Assess Property")',
      'button:has-text("Start Assessment")',
      'button:has-text("Check Risk")',
      'a:has-text("Start")'
    ];

    for (const trigger of assessmentTriggers) {
      if (await this.page.locator(trigger).isVisible()) {
        await this.clickElement(trigger);
        await this.page.waitForTimeout(2000);
        break;
      }
    }

    // Verify assessment interface is visible
    await this.waitForAnySelector(this.selectors.addressInput);
  }

  /**
   * Verify responsive design elements
   */
  async verifyResponsiveElements(): Promise<void> {
    // Check that main content is visible
    await expect(this.page.locator('main, .main-content, [role="main"]')).toBeVisible();
    
    // Check that text is readable (not too small)
    const bodyText = this.page.locator('body');
    const fontSize = await bodyText.evaluate(el => window.getComputedStyle(el).fontSize);
    const fontSizeNum = parseInt(fontSize);
    expect(fontSizeNum).toBeGreaterThanOrEqual(14);
    
    // Check for horizontal scroll (should not exist)
    const hasHorizontalScroll = await this.page.evaluate(() => 
      document.body.scrollWidth > window.innerWidth
    );
    expect(hasHorizontalScroll).toBeFalsy();
  }

  /**
   * Test mobile navigation functionality
   */
  async testMobileNavigation(): Promise<void> {
    const menuButton = this.page.locator(
      '.mobile-menu-button, .hamburger, [data-testid="mobile-menu"]'
    );
    
    if (await menuButton.isVisible()) {
      await menuButton.click();
      
      // Verify menu opens
      await expect(this.page.locator(
        '.mobile-menu, .nav-menu, [data-testid="navigation-menu"]'
      )).toBeVisible();
      
      // Test menu close
      await menuButton.click();
      await expect(this.page.locator(
        '.mobile-menu, .nav-menu, [data-testid="navigation-menu"]'
      )).not.toBeVisible();
    }
  }

  /**
   * Verify page performance
   */
  async measurePageLoadTime(): Promise<number> {
    const startTime = Date.now();
    await this.navigate();
    const endTime = Date.now();
    return endTime - startTime;
  }

  /**
   * Check accessibility features
   */
  async checkAccessibility(): Promise<{
    hasPageTitle: boolean;
    h1Count: number;
    imagesWithAlt: number;
    totalImages: number;
    inputsWithLabels: number;
    totalInputs: number;
  }> {
    const title = await this.getTitle();
    const h1Count = await this.page.locator('h1').count();
    const totalImages = await this.page.locator('img').count();
    const imagesWithAlt = await this.page.locator('img[alt]').count();
    const totalInputs = await this.page.locator('input').count();
    const inputsWithLabels = await this.page.locator(
      'input[aria-label], input[id] + label, label input'
    ).count();

    return {
      hasPageTitle: title.length > 10,
      h1Count,
      imagesWithAlt,
      totalImages,
      inputsWithLabels,
      totalInputs
    };
  }
}