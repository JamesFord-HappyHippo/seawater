import { Page, expect } from '@playwright/test';
import { getEnvironmentConfig } from '../config/environment';

/**
 * Base Page Object class providing common functionality for all page objects
 */
export abstract class BasePage {
  protected page: Page;
  protected envConfig = getEnvironmentConfig();

  constructor(page: Page) {
    this.page = page;
  }

  /**
   * Navigate to a specific URL
   */
  async goto(url: string): Promise<void> {
    await this.page.goto(url);
    await this.waitForPageLoad();
  }

  /**
   * Wait for page to be fully loaded
   */
  async waitForPageLoad(): Promise<void> {
    await this.page.waitForLoadState('networkidle');
    await this.page.waitForTimeout(1000);
  }

  /**
   * Take a screenshot with timestamp
   */
  async takeScreenshot(name: string): Promise<void> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    await this.page.screenshot({ 
      path: `test-results/screenshots/${name}-${timestamp}.png`,
      fullPage: true 
    });
  }

  /**
   * Wait for element to be visible
   */
  async waitForElement(selector: string, timeout?: number): Promise<void> {
    await this.page.waitForSelector(selector, { 
      timeout: timeout || this.envConfig.timeout.medium 
    });
  }

  /**
   * Get page title
   */
  async getTitle(): Promise<string> {
    return await this.page.title();
  }

  /**
   * Get current URL
   */
  getCurrentUrl(): string {
    return this.page.url();
  }

  /**
   * Check if element exists
   */
  async elementExists(selector: string): Promise<boolean> {
    return await this.page.locator(selector).count() > 0;
  }

  /**
   * Wait for any of multiple selectors to appear
   */
  async waitForAnySelector(selectors: string[], timeout?: number): Promise<string> {
    const promises = selectors.map(selector => 
      this.page.waitForSelector(selector, { 
        timeout: timeout || this.envConfig.timeout.medium 
      }).then(() => selector).catch(() => null)
    );

    const results = await Promise.allSettled(promises);
    const successfulSelector = results.find(result => 
      result.status === 'fulfilled' && result.value !== null
    );

    if (successfulSelector && successfulSelector.status === 'fulfilled') {
      return successfulSelector.value as string;
    }

    throw new Error(`None of the selectors found: ${selectors.join(', ')}`);
  }

  /**
   * Fill input with retry logic
   */
  async fillInput(selector: string, value: string): Promise<void> {
    const input = this.page.locator(selector);
    await input.waitFor({ state: 'visible' });
    await input.clear();
    await input.fill(value);
    
    // Verify value was filled
    const filledValue = await input.inputValue();
    if (filledValue !== value) {
      await input.fill(value); // Retry once
    }
  }

  /**
   * Click element with retry logic
   */
  async clickElement(selector: string): Promise<void> {
    const element = this.page.locator(selector);
    await element.waitFor({ state: 'visible' });
    await element.click();
  }

  /**
   * Get text content of element
   */
  async getElementText(selector: string): Promise<string> {
    const element = this.page.locator(selector);
    await element.waitFor({ state: 'visible' });
    return await element.textContent() || '';
  }

  /**
   * Wait for navigation to complete
   */
  async waitForNavigation(): Promise<void> {
    await this.page.waitForNavigation({ 
      timeout: this.envConfig.timeout.long,
      waitUntil: 'networkidle' 
    });
  }

  /**
   * Scroll element into view
   */
  async scrollToElement(selector: string): Promise<void> {
    const element = this.page.locator(selector);
    await element.scrollIntoViewIfNeeded();
  }

  /**
   * Get all text contents from multiple elements
   */
  async getAllTextContents(selector: string): Promise<string[]> {
    return await this.page.locator(selector).allTextContents();
  }

  /**
   * Check if page contains text
   */
  async pageContainsText(text: string): Promise<boolean> {
    return await this.page.locator(`text*="${text}"`).count() > 0;
  }

  /**
   * Wait for API response
   */
  async waitForApiResponse(urlPattern: string, timeout?: number): Promise<void> {
    await this.page.waitForResponse(
      response => response.url().includes(urlPattern) && response.status() < 400,
      { timeout: timeout || this.envConfig.timeout.apiResponse }
    );
  }

  /**
   * Setup console logging for debugging
   */
  setupConsoleLogging(): void {
    this.page.on('console', (msg) => {
      if (msg.type() === 'error') {
        console.error(`Browser Error: ${msg.text()}`);
      } else if (msg.type() === 'warning') {
        console.warn(`Browser Warning: ${msg.text()}`);
      }
    });
    
    this.page.on('pageerror', (error) => {
      console.error(`Page Error: ${error.message}`);
    });
  }
}