import { describe, it, expect, vi, afterEach, beforeAll } from 'vitest';

import { initTestI18n } from '../test-i18n-setup';
import { CampaignDashboard } from './campaign-dashboard'; // Imports and registers <campaign-dashboard>
import { apiClient, type CampaignStatus } from '../api-client';

// Mock the API client module entirely
vi.mock('../api-client', () => ({
  apiClient: {
    getStatus: vi.fn()
  }
}));

beforeAll(async () => {
  await initTestI18n();
});

describe('CampaignDashboard Component', () => {
  afterEach(() => {
    // Clean up the DOM after each test
    document.body.innerHTML = '';
    vi.clearAllMocks();
  });

  it('should display a loading message before the API request resolves', async () => {
    // Delay the mock resolution so we can inspect the initial render state
    let resolveApi!: (value: CampaignStatus | PromiseLike<CampaignStatus>) => void;
    vi.mocked(apiClient.getStatus).mockReturnValue(
      new Promise((res) => {
        resolveApi = res;
      })
    );

    const element = document.createElement('campaign-dashboard') as CampaignDashboard;
    document.body.appendChild(element);

    await customElements.whenDefined('campaign-dashboard');
    await element.updateComplete;

    const shadow = element.shadowRoot;

    // Assert the loading text is present
    expect(shadow?.textContent).toContain('Loading metrics...');

    // Clean up the hanging promise
    resolveApi({ waiting: 0, active: 0, completed: 0, failed: 0, hardFailures: 0 });
  });

  it('should render the dashboard and display metrics and bilingual labels from the API', async () => {
    // 1. Setup the mock data before the component connects
    vi.mocked(apiClient.getStatus).mockResolvedValue({
      waiting: 15,
      active: 2,
      completed: 100,
      failed: 0,
      hardFailures: 4
    });

    // 2. Attach the component to the DOM
    const element = document.createElement('campaign-dashboard') as CampaignDashboard;
    document.body.appendChild(element);

    // 3. Wait for the initial render and the async API call to resolve
    await customElements.whenDefined('campaign-dashboard');
    await new Promise((resolve) => setTimeout(resolve, 0)); // Flushes microtasks
    await element.updateComplete; // Wait for Lit to process the state change

    // 4. Assert against the Shadow DOM
    const shadow = element.shadowRoot;

    // Check "Waiting" metric (first card) and its label
    const firstCard = shadow?.querySelector('.metric-card:nth-child(1)');
    expect(firstCard?.querySelector('.metric-label')?.textContent).toBe('Waiting');
    expect(firstCard?.querySelector('.metric-value')?.textContent).toBe('15');

    // Check "Hard Failures" metric and its label
    const hardFailuresCard = shadow?.querySelector('.hard-failures');
    expect(hardFailuresCard?.querySelector('.metric-label')?.textContent).toBe('Hard Failures');
    expect(hardFailuresCard?.querySelector('.metric-value')?.textContent).toBe('4');
  });

  it('should display an error banner if the API request fails', async () => {
    // Temporarily swallow console.error because we EXPECT it to throw here
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    vi.mocked(apiClient.getStatus).mockImplementation(() => Promise.reject(new Error('Network Error')));

    const element = document.createElement('campaign-dashboard') as CampaignDashboard;
    document.body.appendChild(element);

    await customElements.whenDefined('campaign-dashboard');
    await new Promise((resolve) => setTimeout(resolve, 0));
    await element.updateComplete;

    const shadow = element.shadowRoot;
    const errorDiv = shadow?.querySelector('.error');

    expect(errorDiv?.textContent).toContain('Failed to connect to the backend API');
    expect(consoleSpy).toHaveBeenCalled(); // Ensure the error was actually logged internally

    consoleSpy.mockRestore();
  });

  it('should clear the polling interval when removed from the DOM', async () => {
    // Explicitly reset the mock to a success state to prevent leakage!
    vi.mocked(apiClient.getStatus).mockResolvedValue({
      waiting: 0,
      active: 0,
      completed: 0,
      failed: 0,
      hardFailures: 0
    });

    // Spy on the global clearInterval function
    const clearIntervalSpy = vi.spyOn(globalThis, 'clearInterval');

    const element = document.createElement('campaign-dashboard') as CampaignDashboard;
    document.body.appendChild(element);

    await customElements.whenDefined('campaign-dashboard');

    // Removing the element from the DOM triggers disconnectedCallback() naturally
    element.remove();

    // Assert that the cleanup logic actually ran
    expect(clearIntervalSpy).toHaveBeenCalled();
  });

  it('should safely handle disconnection if no polling interval exists', () => {
    // Also reset it here just to be completely safe
    vi.mocked(apiClient.getStatus).mockResolvedValue({
      waiting: 0,
      active: 0,
      completed: 0,
      failed: 0,
      hardFailures: 0
    });

    const clearIntervalSpy = vi.spyOn(globalThis, 'clearInterval');

    const element = document.createElement('campaign-dashboard') as CampaignDashboard;

    // By deliberately NOT appending it to document.body, connectedCallback() never runs,
    // which means this.pollInterval remains null.

    // Manually trigger the disconnect lifecycle to cover the "false" branch of the if statement.
    element.disconnectedCallback();

    // Assert that it didn't crash and didn't try to clear a non-existent interval
    expect(clearIntervalSpy).not.toHaveBeenCalled();
  });

  it('should poll the API every 3 seconds', async () => {
    // 1. Hijack the system clock
    vi.useFakeTimers();

    vi.mocked(apiClient.getStatus).mockResolvedValue({
      waiting: 0,
      active: 0,
      completed: 0,
      failed: 0,
      hardFailures: 0
    });

    const element = document.createElement('campaign-dashboard') as CampaignDashboard;
    document.body.appendChild(element);

    await customElements.whenDefined('campaign-dashboard');

    // The initial render calls fetchStatus once immediately via connectedCallback
    expect(apiClient.getStatus).toHaveBeenCalledTimes(1);

    // 2. Fast-forward time by exactly 3000 milliseconds
    await vi.advanceTimersByTimeAsync(3000);

    // 3. Assert that the interval callback executed and called the API again
    expect(apiClient.getStatus).toHaveBeenCalledTimes(2);

    // 4. Restore the real system clock so other tests aren't affected
    vi.useRealTimers();
  });
});
