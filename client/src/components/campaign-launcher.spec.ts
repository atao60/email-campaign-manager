import { describe, it, expect, vi, beforeEach, afterEach, beforeAll } from 'vitest';

import { initTestI18n } from '../test-i18n-setup';
import { CampaignLauncher } from './campaign-launcher'; // Imports and registers the custom element
import { apiClient } from '../api-client';
import type { LaunchCampaignResponse } from '@campaign-manager/backend';

// 1. Mock the API Client
vi.mock('../api-client', () => ({
  apiClient: {
    launchCampaign: vi.fn()
  }
}));

beforeAll(async () => {
  await initTestI18n();
});

describe('CampaignLauncher Component', () => {
  let element: CampaignLauncher;

  beforeEach(async () => {
    // Render the component into the DOM before each test
    element = document.createElement('campaign-launcher') as CampaignLauncher;
    document.body.appendChild(element);
    await customElements.whenDefined('campaign-launcher');
    await element.updateComplete;
  });

  afterEach(() => {
    // Clean up DOM and mocks
    element.remove();
    vi.clearAllMocks();
  });

  // --- Utility helper to simulate user typing ---
  const fillInput = (selector: string, value: string) => {
    const input = element.shadowRoot?.querySelector<HTMLInputElement | HTMLTextAreaElement>(selector);
    if (input) {
      input.value = value;
      input.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
    }
    return input;
  };

  // --- Utility helper to attach a fake file ---
  const attachFakeFile = (selector: string, filename: string, content: string) => {
    const input = element.shadowRoot?.querySelector<HTMLInputElement>(selector);

    if (!(input instanceof HTMLInputElement)) {
      throw new Error(`Could not find a file input for selector: ${selector}`);
    }

    const file = new File([content], filename, { type: 'text/csv' });

    // Simulate a FileList by passing an array containing our file
    // Use Object.defineProperty to bypass JSDOM's missing DataTransfer API
    Object.defineProperty(input, 'files', {
      value: [file],
      writable: false
    });

    input.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
    return file;
  };

  it('should render the default state correctly', () => {
    const shadow = element.shadowRoot;
    expect(shadow?.querySelector('h2')?.textContent).toBe('Launch New Campaign');

    // HTML mode should be default
    const htmlRadio = shadow?.querySelector<HTMLInputElement>('input[value="html"]');
    expect(htmlRadio?.checked).toBe(true);

    // Textarea should be visible for HTML, URL input should not
    expect(shadow?.querySelector('textarea')).toBeTruthy();
    expect(shadow?.querySelector('input[type="url"]')).toBeFalsy();
  });

  it('should toggle between HTML textarea and URL input when template mode changes', async () => {
    const shadow = element.shadowRoot;
    const urlRadio = shadow?.querySelector<HTMLInputElement>('input[value="url"]');

    // Click URL radio
    urlRadio?.click();
    await element.updateComplete;

    expect(shadow?.querySelector('textarea')).toBeFalsy();
    expect(shadow?.querySelector('input[type="url"]')).toBeTruthy();
  });

  it('should show an error if the form is submitted without a file', async () => {
    fillInput('#subject', 'My Subject');
    fillInput('textarea', '<h1>Hello</h1>');

    // Submit form (without attaching a file)
    const form = element.shadowRoot?.querySelector('form');
    form?.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));

    await element.updateComplete;

    const statusMessage = element.shadowRoot?.querySelector('.status.error');
    expect(statusMessage?.textContent).toContain('Please select a CSV file');
    expect(apiClient.launchCampaign).not.toHaveBeenCalled();
  });

  it('should successfully submit the form with HTML template mode', async () => {
    vi.mocked(apiClient.launchCampaign).mockResolvedValue({ processed: 25 } as LaunchCampaignResponse);

    fillInput('#subject', 'Test Subject HTML');
    fillInput('textarea', '<p>Test content</p>');
    const fakeFile = attachFakeFile('#csv-file', 'contacts.csv', 'name,email\nAlice,alice@test.com');

    // Submit form
    const form = element.shadowRoot?.querySelector('form');
    form?.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));

    // Verify loading state appears
    await element.updateComplete;
    const button = element.shadowRoot?.querySelector<HTMLButtonElement>('button[type="submit"]');
    expect(button?.disabled).toBe(true);
    expect(button?.textContent).toContain('Queueing Campaign...');

    // Wait for API promise to resolve
    await new Promise((resolve) => setTimeout(resolve, 0));
    await element.updateComplete;

    // Verify API call
    expect(apiClient.launchCampaign).toHaveBeenCalledTimes(1);
    const formDataArg = vi.mocked(apiClient.launchCampaign).mock.calls[0][0];

    expect(formDataArg.get('subject')).toBe('Test Subject HTML');
    expect(formDataArg.get('templateHtml')).toBe('<p>Test content</p>');
    expect(formDataArg.get('templateUrl')).toBeNull();
    expect(formDataArg.get('contactsCsv')).toBe(fakeFile);

    // Verify success message
    const statusMessage = element.shadowRoot?.querySelector('.status.success');
    expect(statusMessage?.textContent).toContain('Success! Campaign queued for 25 contacts.');

    // Verify form resets
    const subjectInput = element.shadowRoot?.querySelector<HTMLInputElement>('#subject');
    expect(subjectInput?.value).toBe('');
  });

  it('should successfully submit the form with URL template mode', async () => {
    vi.mocked(apiClient.launchCampaign).mockResolvedValue({ processed: 10 } as LaunchCampaignResponse);

    // Switch to URL mode
    const urlRadio = element.shadowRoot?.querySelector('input[value="url"]');
    if (urlRadio instanceof HTMLInputElement) urlRadio.click();
    await element.updateComplete;

    fillInput('#subject', 'Test Subject URL');
    fillInput('input[type="url"]', 'https://example.com/template.html');
    attachFakeFile('#csv-file', 'contacts.csv', '...');

    // Submit form
    const form = element.shadowRoot?.querySelector('form');
    form?.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));

    await new Promise((resolve) => setTimeout(resolve, 0));
    await element.updateComplete;

    const formDataArg = vi.mocked(apiClient.launchCampaign).mock.calls[0][0];
    expect(formDataArg.get('templateUrl')).toBe('https://example.com/template.html');
    expect(formDataArg.get('templateHtml')).toBeNull();
  });

  it('should show an error message if the API fails', async () => {
    vi.mocked(apiClient.launchCampaign).mockRejectedValue(new Error('Invalid CSV format'));

    fillInput('#subject', 'Fail Test');
    fillInput('textarea', 'content');
    attachFakeFile('#csv-file', 'bad.csv', '...');

    const form = element.shadowRoot?.querySelector('form');
    form?.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));

    await new Promise((resolve) => setTimeout(resolve, 0));
    await element.updateComplete;

    const statusMessage = element.shadowRoot?.querySelector('.status.error');
    expect(statusMessage?.textContent).toContain('Invalid CSV format');

    // Ensure button is re-enabled
    const button = element.shadowRoot?.querySelector<HTMLButtonElement>('button[type="submit"]');
    expect(button?.disabled).toBe(false);
  });
});
