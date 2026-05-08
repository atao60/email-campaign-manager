import { LitElement, html } from 'lit';
import { customElement, state } from 'lit/decorators.js';

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
      this.error = 'Failed to connect to the backend API.';
      console.error(err);
    }
  }

  render() {
    return html`
      <h1>Campaign Queue Status</h1>

      ${this.error ? html`<div class="error">${this.error}</div>` : ''}
      ${this.status
        ? html`
            <div class="metrics-grid">
              <div class="metric-card">
                <div class="metric-label">En attente (Waiting)</div>
                <div class="metric-value">${this.status.waiting}</div>
              </div>
              <div class="metric-card">
                <div class="metric-label">En cours (Active)</div>
                <div class="metric-value">${this.status.active}</div>
              </div>
              <div class="metric-card">
                <div class="metric-label">Terminés (Completed)</div>
                <div class="metric-value">${this.status.completed}</div>
              </div>
              <div class="metric-card">
                <div class="metric-label">Échecs File (Queue Failed)</div>
                <div class="metric-value">${this.status.failed}</div>
              </div>
              <div class="metric-card hard-failures">
                <div class="metric-label">Échecs Permanents (Hard Failures)</div>
                <div class="metric-value">${this.status.hardFailures}</div>
              </div>
            </div>
          `
        : html`<p>Loading metrics...</p>`}
    `;
  }
}
