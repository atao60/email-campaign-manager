import { LitElement, html } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { t } from 'i18next';

import { apiClient, type CampaignStatus } from '../api-client';

import styles from './campaign-dashboard.scss' with { type: 'css' };

const POLL_FREQUENCY = 3000; // in ms

@customElement('campaign-dashboard')
export class CampaignDashboard extends LitElement {
  @state()
  private status: CampaignStatus | null = null;

  @state()
  private error: string | null = null;

  private pollInterval: ReturnType<typeof setInterval> | null = null;

  static readonly styles = styles;

  connectedCallback() {
    super.connectedCallback();
    this.fetchStatus();
    this.pollInterval = setInterval(() => this.fetchStatus(), POLL_FREQUENCY);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
    }
  }

  private async fetchStatus() {
    try {
      this.status = await apiClient.getStatus();
      this.error = null;
    } catch (err) {
      this.error = t('dashboard.errorBackend');
      console.error(err);
    }
  }

  render() {
    return html`
      <h1>${t('dashboard.title')}</h1>

      ${this.error ? html`<div class="error">${this.error}</div>` : ''}
      ${this.status
        ? html`
            <div class="metrics-grid">
              <div class="metric-card">
                <div class="metric-label">${t('dashboard.waiting')}</div>
                <div class="metric-value">${this.status.waiting}</div>
              </div>
              <div class="metric-card">
                <div class="metric-label">${t('dashboard.active')}</div>
                <div class="metric-value">${this.status.active}</div>
              </div>
              <div class="metric-card">
                <div class="metric-label">${t('dashboard.completed')}</div>
                <div class="metric-value">${this.status.completed}</div>
              </div>
              <div class="metric-card">
                <div class="metric-label">${t('dashboard.queueFailed')}</div>
                <div class="metric-value">${this.status.failed}</div>
              </div>
              <div class="metric-card hard-failures">
                <div class="metric-label">${t('dashboard.hardFailures')}</div>
                <div class="metric-value">${this.status.hardFailures}</div>
              </div>
            </div>
          `
        : html`<p>Loading metrics...</p>`}
    `;
  }
}
