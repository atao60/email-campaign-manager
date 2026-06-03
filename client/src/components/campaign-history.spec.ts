import { describe, it, expect, vi, beforeEach, afterEach, beforeAll } from 'vitest';

import { initTestI18n } from '../test-i18n-setup';
import './campaign-history'; // Ensure the custom element is registered
import type { CampaignHistory } from './campaign-history';
import { apiClient } from '../api-client';

// 1. Mock the API Client
vi.mock('../api-client', () => ({
  apiClient: {
    getCampaigns: vi.fn(),
    getCampaignDetails: vi.fn()
  }
}));

beforeAll(async () => {
  await initTestI18n();
});

describe('CampaignHistory Component', () => {
  let element: CampaignHistory;

  // Helper to mount the component and wait for its initial render
  const mountComponent = async () => {
    element = document.createElement('campaign-history') as CampaignHistory;
    document.body.appendChild(element);
    await customElements.whenDefined('campaign-history');
    await element.updateComplete;
  };

  beforeEach(() => {
    // 2. Enable fake timers before each test to control setInterval
    vi.useFakeTimers();
    vi.clearAllMocks();

    // Suppress console.error for tests that intentionally trigger errors
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    // 3. Clean up the DOM, restore timers, and clear mocks
    if (element?.parentNode) {
      element.remove();
    }
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe('Basic Rendering & Navigation', () => {
    it('should show a loading state initially', async () => {
      // Create a pending promise to freeze the API response in a loading state
      vi.mocked(apiClient.getCampaigns).mockReturnValue(new Promise(() => {}));

      await mountComponent();

      expect(element.shadowRoot?.textContent).toContain('Loading data...');
    });

    it('should display a list of campaigns when fetched successfully', async () => {
      vi.mocked(apiClient.getCampaigns).mockResolvedValue([
        { id: '1', subject: 'Promo 1', status: 'COMPLETED', sentDate: new Date().toISOString(), totalSent: 100 },
        { id: '2', subject: 'Promo 2', status: 'FAILED', sentDate: new Date().toISOString(), totalSent: 50 }
      ]);

      await mountComponent();
      // Need to wait another tick for the fetch promise to resolve and trigger re-render
      await element.updateComplete;

      const shadow = element.shadowRoot;
      expect(shadow?.textContent).toContain('Promo 1');
      expect(shadow?.textContent).toContain('COMPLETED');
      expect(shadow?.textContent).toContain('Promo 2');
      expect(shadow?.textContent).toContain('FAILED');
      expect(shadow?.querySelectorAll('.card').length).toBe(2);
    });

    it('should display an empty state message if no campaigns exist', async () => {
      vi.mocked(apiClient.getCampaigns).mockResolvedValue([]);

      await mountComponent();
      await element.updateComplete;

      expect(element.shadowRoot?.textContent).toContain('No campaigns found.');
    });

    it('should load and display campaign details when a card is clicked', async () => {
      vi.mocked(apiClient.getCampaigns).mockResolvedValue([
        { id: '1', subject: 'Promo 1', status: 'COMPLETED', sentDate: new Date().toISOString(), totalSent: 2 }
      ]);

      const mockDetails = {
        id: '1',
        subject: 'Promo 1',
        sentDate: '',
        status: 'COMPLETED' as const,
        htmlContent: '<h1>Hello</h1>',
        totalSent: 2,
        emails: [
          { address: 'alice@example.com', name: 'Alice Smith', status: 'OK' as const }, // With Name
          { address: 'bob@example.com', status: 'FAILED' as const } // Without Name
        ]
      };
      vi.mocked(apiClient.getCampaignDetails).mockResolvedValue(mockDetails);

      await mountComponent();
      await element.updateComplete;

      // Click the card
      const card = element.shadowRoot?.querySelector<HTMLElement>('.card');
      card?.click();

      // Wait for details to fetch and component to re-render
      await element.updateComplete;

      // Flush the microtask queue so the API promise resolves
      // even though we are using fake timers.
      await vi.advanceTimersByTimeAsync(0);

      // 3. Wait for the final "Success" state to render
      await element.updateComplete;

      const shadow = element.shadowRoot;
      expect(apiClient.getCampaignDetails).toHaveBeenCalledWith('1');
      expect(shadow?.textContent).toContain('← Back to List');

      // Verify Contact 1 (With Name) - Rendered as: <strong>Alice Smith</strong> <alice@example.com>
      const strongTag = shadow?.querySelector('strong');
      expect(strongTag).not.toBeNull();
      expect(strongTag?.textContent).toBe('Alice Smith');
      // The DOM textContent automatically un-escapes &lt; and &gt; back to < and >
      expect(shadow?.textContent).toContain('<alice@example.com>');

      // Verify Contact 2 (Without Name) - Rendered purely by its address string
      expect(shadow?.textContent).toContain('bob@example.com');
      expect(shadow?.textContent).not.toContain('<bob@example.com>'); // Should not have brackets if no name exists

      // Check iframe srcdoc mapping
      const iframe = shadow?.querySelector('iframe');
      expect(iframe?.getAttribute('srcdoc')).toBe('<h1>Hello</h1>');
    });

    it('should render the refreshing spinner if the selected campaign details are PARTIAL', async () => {
      vi.mocked(apiClient.getCampaigns).mockResolvedValue([
        { id: '1', subject: 'Promo', status: 'PARTIAL', sentDate: '', totalSent: 0 }
      ]);
      vi.mocked(apiClient.getCampaignDetails).mockResolvedValue({
        id: '1',
        subject: 'Promo',
        status: 'PARTIAL',
        sentDate: '',
        htmlContent: '<h1>Hello</h1>',
        totalSent: 0,
        emails: []
      });

      await mountComponent();
      await element.updateComplete;

      // Click the card to go to details view
      element.shadowRoot?.querySelector<HTMLElement>('.card')?.click();
      await vi.advanceTimersByTimeAsync(0);
      await element.updateComplete;

      // Assert that the specific spinner DOM node was conditionally rendered
      const spinner = element.shadowRoot?.querySelector('.spinner');
      expect(spinner).not.toBeNull();
    });

    it('should return to the list view when the back button is clicked', async () => {
      // Setup initial list and details fetch
      vi.mocked(apiClient.getCampaigns).mockResolvedValue([
        { id: '1', subject: 'Promo', status: 'COMPLETED', sentDate: '', totalSent: 0 }
      ]);
      vi.mocked(apiClient.getCampaignDetails).mockResolvedValue({
        id: '1',
        subject: 'Promo',
        status: 'COMPLETED',
        sentDate: '',
        htmlContent: '',
        totalSent: 0,
        emails: []
      });

      await mountComponent();
      await element.updateComplete;

      // Go to details
      element.shadowRoot?.querySelector<HTMLElement>('.card')?.click();
      await vi.advanceTimersByTimeAsync(0); // Flush API promise
      await element.updateComplete;

      // Click back
      const backButton = element.shadowRoot?.querySelector<HTMLButtonElement>('.back');
      backButton?.click();

      // Wait for the state change to propagate to the DOM
      await element.updateComplete;

      // Should see the list again
      const shadow = element.shadowRoot;
      expect(shadow?.querySelector('.card')).not.toBeNull();
      expect(shadow?.querySelector('.back')).toBeNull();
      expect(shadow?.textContent).toContain('Promo');
    });
  });

  describe('Error Handling', () => {
    it('should gracefully handle and log errors when fetching the campaign list fails', async () => {
      const mockError = new Error('Network timeout');
      vi.mocked(apiClient.getCampaigns).mockRejectedValue(mockError);

      await mountComponent();

      // Wait for the microtask rejection to be caught
      await vi.advanceTimersByTimeAsync(0);

      // Verify the catch block executed and logged the error
      expect(console.error).toHaveBeenCalledWith('Failed to fetch campaigns', mockError);
    });

    it('should log errors and stop polling if fetching campaign details fails', async () => {
      // Setup: Mock a successful list fetch to render a PARTIAL card, starting the polling interval
      vi.mocked(apiClient.getCampaigns).mockResolvedValue([
        { id: '1', subject: 'Promo', status: 'PARTIAL', sentDate: '', totalSent: 0 }
      ]);

      const mockError = new Error('Database disconnected');
      vi.mocked(apiClient.getCampaignDetails).mockRejectedValue(mockError);

      const clearIntervalSpy = vi.spyOn(window, 'clearInterval');

      await mountComponent();
      await element.updateComplete;

      // Trigger the loadDetails method by clicking the card
      element.shadowRoot?.querySelector<HTMLElement>('.card')?.click();

      // Wait for the rejection to process
      await vi.advanceTimersByTimeAsync(0);
      await element.updateComplete;

      // Verify the catch block executed
      expect(console.error).toHaveBeenCalledWith('Failed to fetch details', mockError);

      // Verify that this.stopPolling() successfully cleared the active interval
      expect(clearIntervalSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('Polling Logic', () => {
    it('should start polling the list if any campaign is PARTIAL', async () => {
      vi.mocked(apiClient.getCampaigns).mockResolvedValue([
        { id: '1', subject: 'Promo', status: 'PARTIAL', sentDate: '', totalSent: 0 }
      ]);

      await mountComponent();
      await element.updateComplete;

      expect(apiClient.getCampaigns).toHaveBeenCalledTimes(1);
      expect(element.shadowRoot?.textContent).toContain('● Live Updating');

      // Fast-forward 3 seconds
      await vi.advanceTimersByTimeAsync(3000);

      // It should have silently fetched the list again
      expect(apiClient.getCampaigns).toHaveBeenCalledTimes(2);
    });

    it('should poll campaign details if viewing a PARTIAL campaign', async () => {
      vi.mocked(apiClient.getCampaigns).mockResolvedValue([
        { id: '1', subject: 'Promo', status: 'PARTIAL', sentDate: '', totalSent: 0 }
      ]);
      vi.mocked(apiClient.getCampaignDetails).mockResolvedValue({
        id: '1',
        subject: 'Promo',
        status: 'PARTIAL',
        sentDate: '',
        htmlContent: '',
        totalSent: 0,
        emails: []
      });

      await mountComponent();
      await element.updateComplete;

      // Navigate to details
      element.shadowRoot?.querySelector<HTMLElement>('.card')?.click();

      // Flush the microtask so the details finish loading
      await vi.advanceTimersByTimeAsync(0);
      await element.updateComplete;

      // Now it should be out of "Loading data..." and into the details view
      expect(apiClient.getCampaignDetails).toHaveBeenCalledTimes(1);
      expect(element.shadowRoot?.textContent).toContain('↻ Refreshing...');

      // Fast-forward 3 seconds
      await vi.advanceTimersByTimeAsync(3000);

      // It should have silently fetched the details again (NOT the list)
      expect(apiClient.getCampaignDetails).toHaveBeenCalledTimes(2);
      expect(apiClient.getCampaigns).toHaveBeenCalledTimes(1); // List fetch count shouldn't change
    });

    it('should stop polling when the component is removed from the DOM', async () => {
      const clearIntervalSpy = vi.spyOn(window, 'clearInterval');

      vi.mocked(apiClient.getCampaigns).mockResolvedValue([
        { id: '1', subject: 'Promo', status: 'PARTIAL', sentDate: '', totalSent: 0 }
      ]);

      await mountComponent();
      await element.updateComplete;

      // Trigger standard unmount lifecycle
      element.remove();

      expect(clearIntervalSpy).toHaveBeenCalledTimes(1);
    });

    it('should stop polling if a PARTIAL campaign becomes COMPLETED', async () => {
      // Initial fetch: PARTIAL
      vi.mocked(apiClient.getCampaigns).mockResolvedValueOnce([
        { id: '1', subject: 'Promo', status: 'PARTIAL', sentDate: '', totalSent: 0 }
      ]);

      await mountComponent();
      await element.updateComplete;

      // Prepare the second fetch to simulate completion
      vi.mocked(apiClient.getCampaigns).mockResolvedValueOnce([
        { id: '1', subject: 'Promo', status: 'COMPLETED', sentDate: '', totalSent: 0 }
      ]);

      // Fast forward 3 seconds to trigger the interval
      await vi.advanceTimersByTimeAsync(3000);

      // Prepare a 3rd fetch just to prove the interval was stopped
      vi.mocked(apiClient.getCampaigns).mockResolvedValueOnce([]);

      // Fast forward another 3 seconds
      await vi.advanceTimersByTimeAsync(3000);

      // Should only have been called twice (Initial + 1st Poll), the 2nd poll should have been cancelled
      expect(apiClient.getCampaigns).toHaveBeenCalledTimes(2);
    });
  });
});
