import { LitElement, html, css } from 'lit';
import { customElement, state } from 'lit/decorators.js';

@customElement('campaign-history')
export class CampaignHistory extends LitElement {
  @state() private campaigns: any[] = [];
  @state() private selectedCampaign: any | null = null;
  @state() private loading = true;

  static readonly styles = css`
    :host {
      display: block;
    }
    h2 {
      color: #2c3e50;
    }
    .card {
      background: white;
      border: 1px solid #e2e8f0;
      padding: 1.5rem;
      border-radius: 8px;
      margin-bottom: 1rem;
      cursor: pointer;
      transition: shadow 0.2s;
    }
    .card:hover {
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
      border-color: #cbd5e1;
    }

    .status-badge {
      padding: 0.25rem 0.5rem;
      border-radius: 4px;
      font-size: 0.85rem;
      font-weight: bold;
    }
    .badge-ok {
      background: #dcfce7;
      color: #166534;
    }
    .badge-fail {
      background: #fee2e2;
      color: #991b1b;
    }

    button.back {
      background: #f1f5f9;
      border: none;
      padding: 0.5rem 1rem;
      border-radius: 4px;
      cursor: pointer;
      margin-bottom: 1rem;
    }
    button.back:hover {
      background: #e2e8f0;
    }

    iframe {
      width: 100%;
      height: 400px;
      border: 1px solid #cbd5e1;
      border-radius: 4px;
      margin: 1rem 0;
      background: white;
    }
    ul {
      list-style: none;
      padding: 0;
      margin: 0;
      background: white;
      border-radius: 8px;
      border: 1px solid #e2e8f0;
    }
    li {
      padding: 1rem;
      border-bottom: 1px solid #e2e8f0;
      display: flex;
      justify-content: space-between;
    }
    li:last-child {
      border-bottom: none;
    }
  `;

  connectedCallback() {
    super.connectedCallback();
    this.fetchCampaigns();
  }

  async fetchCampaigns() {
    this.loading = true;
    try {
      const response = await fetch('/api/campaigns');
      this.campaigns = await response.json();
    } catch (e) {
      console.error('Failed to fetch campaigns', e);
    } finally {
      this.loading = false;
    }
  }

  async loadDetails(campaignId: string) {
    this.loading = true;
    try {
      const response = await fetch(`/api/campaigns/${campaignId}`);
      this.selectedCampaign = await response.json();
    } catch (e) {
      console.error('Failed to fetch details', e);
    } finally {
      this.loading = false;
    }
  }

  renderList() {
    if (this.campaigns.length === 0) return html`<p>No campaigns found.</p>`;
    return html`
      <h2>Campaign History</h2>
      ${this.campaigns.map(
        (c) => html`
          <div class="card" @click=${() => this.loadDetails(c.id)}>
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <h3 style="margin: 0 0 0.5rem 0;">${c.subject}</h3>
              <span class="status-badge ${c.status === 'COMPLETED' ? 'badge-ok' : 'badge-fail'}">${c.status}</span>
            </div>
            <p style="margin: 0; color: #64748b;">
              Sent: ${new Date(c.sentDate).toLocaleString()} | Total: ${c.totalSent}
            </p>
          </div>
        `
      )}
    `;
  }

  renderDetails() {
    const c = this.selectedCampaign;
    return html`
      <button class="back" @click=${() => (this.selectedCampaign = null)}>← Back to List</button>
      <h2>${c.subject}</h2>

      <h3>Template Preview</h3>
      <iframe srcdoc=${c.htmlContent}></iframe>

      <h3>Delivery Status (${c.totalSent} total)</h3>
      <ul>
        ${c.emails.map(
          (email: any) => html`
            <li>
              <span>${email.address}</span>
              <span class="status-badge ${email.status === 'OK' ? 'badge-ok' : 'badge-fail'}">
                ${email.status} ${email.errorReason ? `(${email.errorReason})` : ''}
              </span>
            </li>
          `
        )}
      </ul>
    `;
  }

  render() {
    if (this.loading) return html`<p>Loading data...</p>`;
    return this.selectedCampaign ? this.renderDetails() : this.renderList();
  }
}
