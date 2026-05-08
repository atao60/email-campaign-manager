import { LitElement, html } from 'lit';
import { customElement, state } from 'lit/decorators.js';

import type { CampaignDetail, CampaignSummary, EmailDeliveryStatus } from '@campaign-manager/backend';
import { apiClient } from '../api-client';

import styles from './campaign-history.scss' with { type: 'css' };

@customElement('campaign-history')
export class CampaignHistory extends LitElement {
  @state() private campaigns: CampaignSummary[] = [];
  @state() private selectedCampaign: CampaignDetail | null = null;
  @state() private loading = true;

  static readonly styles = styles;

  connectedCallback() {
    super.connectedCallback();
    this.fetchCampaigns();
  }

  async fetchCampaigns() {
    this.loading = true;
    try {
      this.campaigns = await apiClient.getCampaigns();
    } catch (e) {
      console.error('Failed to fetch campaigns', e);
    } finally {
      this.loading = false;
    }
  }

  async loadDetails(campaignId: string) {
    this.loading = true;
    try {
      this.selectedCampaign = await apiClient.getCampaignDetails(campaignId);
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

    if (!c) {
      return html`
        <div class="empty-state">
          <p>Please select a campaign to view its details.</p>
        </div>
      `;
    }

    return html`
      <button class="back" @click=${() => (this.selectedCampaign = null)}>← Back to List</button>
      <h2>${c.subject}</h2>

      <h3>Template Preview</h3>
      <iframe srcdoc=${c.htmlContent}></iframe>

      <h3>Delivery Status (${c.totalSent} total)</h3>
      <ul>
        ${c.emails.map(
          (email: EmailDeliveryStatus) => html`
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
