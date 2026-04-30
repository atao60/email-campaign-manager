import { describe, it, expect, vi, afterEach } from 'vitest';

import { CampaignDashboard } from './campaign-dashboard'; // Imports and registers <campaign-dashboard>
import { apiClient } from './api-client';

// Mock the API client module entirely
vi.mock('./api-client', () => ({
  apiClient: {
    getStatus: vi.fn()
  }
}));

describe('CampaignDashboard Component', () => {
  afterEach(() => {
    // Clean up the DOM after each test
    document.body.innerHTML = '';
    vi.clearAllMocks();
  });

  it('should render the dashboard and display metrics from the API', async () => {
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

    // @ts-expect-ignore - access the LitElement updateComplete promise
    await element.updateComplete;

    // 4. Assert against the Shadow DOM
    const shadow = element.shadowRoot;

    // Check "Waiting" metric (first card)
    const waitingValue = shadow?.querySelector('.metric-card:nth-child(1) .metric-value');
    expect(waitingValue?.textContent).toBe('15');

    // Check "Hard Failures" metric
    const hardFailuresValue = shadow?.querySelector('.hard-failures .metric-value');
    expect(hardFailuresValue?.textContent).toBe('4');
  });

  it('should display an error banner if the API request fails', async () => {
    // Temporarily swallow console.error because we EXPECT it to throw here
    vi.spyOn(console, 'error').mockImplementation(() => {});

    vi.mocked(apiClient.getStatus).mockRejectedValue(new Error('Network Error'));

    const element = document.createElement('campaign-dashboard') as CampaignDashboard;
    document.body.appendChild(element);

    await customElements.whenDefined('campaign-dashboard');
    await new Promise((resolve) => setTimeout(resolve, 0));
    await element.updateComplete;

    const shadow = element.shadowRoot;
    const errorDiv = shadow?.querySelector('.error');

    expect(errorDiv?.textContent).toContain('Failed to connect to the backend API');
  });

  it('should clear the polling interval when removed from the DOM', async () => {
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
    const clearIntervalSpy = vi.spyOn(globalThis, 'clearInterval');

    const element = document.createElement('campaign-dashboard') as CampaignDashboard;

    // By deliberately NOT appending it to document.body, connectedCallback() never runs,
    // which means this.pollInterval remains null.

    // We manually trigger the disconnect lifecycle to cover the "false" branch of the if statement.
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
