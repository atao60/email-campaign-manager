import { LitElement, html, css } from 'lit';
import { customElement, state } from 'lit/decorators.js';

import { apiClient, type CampaignStatus } from '../api-client';

@customElement('campaign-dashboard')
export class CampaignDashboard extends LitElement {
  @state()
  private status: CampaignStatus | null = null;

  @state()
  private error: string | null = null;

  private pollInterval: ReturnType<typeof setInterval> | null = null;

  static readonly styles = css`
    :host {
      display: block;
      font-family:
        system-ui,
        -apple-system,
        sans-serif;
      max-width: 600px;
      margin: 2rem auto;
      padding: 2rem;
      background: #ffffff;
      border-radius: 8px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      color: #333;
    }
    h1 {
      margin-top: 0;
      color: #1a1a1a;
      border-bottom: 2px solid #eaeaea;
      padding-bottom: 0.5rem;
    }
    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 1rem;
      margin-top: 1.5rem;
    }
    .metric-card {
      background: #f8f9fa;
      padding: 1rem;
      border-radius: 6px;
      border: 1px solid #e9ecef;
    }
    .metric-value {
      font-size: 2rem;
      font-weight: bold;
      color: #0056b3;
      margin: 0.5rem 0 0 0;
    }
    .metric-label {
      font-size: 0.875rem;
      color: #6c757d;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .error {
      color: #dc3545;
      background: #f8d7da;
      padding: 1rem;
      border-radius: 4px;
    }
    .hard-failures {
      grid-column: span 2;
      background: #fff3f3;
      border-color: #ffc9c9;
    }
    .hard-failures .metric-value {
      color: #dc3545;
    }
  `;

  connectedCallback() {
    super.connectedCallback();
    this.fetchStatus();
    // Poll the REST API every 3 seconds
    this.pollInterval = setInterval(() => this.fetchStatus(), 3000);
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
