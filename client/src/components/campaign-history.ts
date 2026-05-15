import { LitElement, html } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { t } from 'i18next';

import type { CampaignDetail, CampaignSummary, EmailDeliveryStatus } from '@campaign-manager/backend';
import { apiClient } from '../api-client';

import styles from './campaign-history.scss' with { type: 'css' };

const POLL_FREQUENCY = 3000; // in ms

@customElement('campaign-history')
export class CampaignHistory extends LitElement {
  @state() private campaigns: CampaignSummary[] = [];
  @state() private selectedCampaign: CampaignDetail | null = null;
  @state() private loading = true;

  static readonly styles = styles;

  /*
   * CampaignHistory will poll the backend for updates whenever it is looking at a
   * campaign that isn't finished yet.
   * When a user clicks on a campaign, if its status is PARTIAL, the component will
   * quietly ask the backend for the latest data every 3 seconds until the campaign
   * is finally COMPLETED or FAILED.
   * No Server-Sent Events (SSE) and no WebSocket.
   */
  private pollInterval: number | null = null;

  connectedCallback() {
    super.connectedCallback();
    this.fetchCampaigns();
  }

  // Always clean up intervals when the component is destroyed to prevent memory leaks
  disconnectedCallback() {
    super.disconnectedCallback();
    this.stopPolling();
  }

  private stopPolling() {
    if (this.pollInterval !== null) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
  }

  async fetchCampaigns(isSilentRefresh = false) {
    if (!isSilentRefresh) {
      this.loading = true;
    }
    try {
      this.campaigns = await apiClient.getCampaigns();

      // If we are looking at the list and something is still in progress, start polling the list
      if (!this.selectedCampaign && this.campaigns.some((c) => c.status === 'PARTIAL')) {
        this.setupListPolling();
      } else if (!this.campaigns.some((c) => c.status === 'PARTIAL')) {
        this.stopPolling();
      }
    } catch (e) {
      console.error('Failed to fetch campaigns', e);
    } finally {
      if (!isSilentRefresh) {
        this.loading = false;
      }
    }
  }

  private setupListPolling() {
    if (this.pollInterval !== null) return; // Already polling

    this.pollInterval = window.setInterval(() => {
      if (this.selectedCampaign) {
        // If the user clicked into a detail, this interval should now handle details
        this.loadDetails(this.selectedCampaign.id, true);
      } else {
        // Otherwise, refresh the whole list
        this.fetchCampaigns(true);
      }
    }, POLL_FREQUENCY);
  }

  async loadDetails(campaignId: string, isSilentRefresh = false) {
    if (!isSilentRefresh) {
      this.loading = true;
    }

    try {
      this.selectedCampaign = await apiClient.getCampaignDetails(campaignId);

      if (this.selectedCampaign) {
        const status = this.selectedCampaign.status;
        this.campaigns = this.campaigns.map((c) => (c.id === campaignId ? { ...c, status } : c));
      }

      if (this.selectedCampaign.status === 'PARTIAL') {
        this.setupListPolling();
      } else if (!this.campaigns.some((c) => c.status === 'PARTIAL')) {
        // Stop only if NO other campaign in the list is pending either
        this.stopPolling();
      }
    } catch (e) {
      console.error('Failed to fetch details', e);
      this.stopPolling(); // Stop polling if the server crashes
    } finally {
      if (!isSilentRefresh) {
        this.loading = false;
      }
    }
  }

  private handleBackClick() {
    // Don't stopPolling() here!
    // Keep it running so the list continues to update.
    this.selectedCampaign = null;
  }

  // Helper to color code the badges correctly
  private getBadgeClass(status: string) {
    if (status === 'OK' || status === 'COMPLETED') {
      return 'badge-ok';
    }
    if (status === 'PENDING' || status === 'PARTIAL') {
      return 'badge-pending'; // FUTURE Add a yellow/gray CSS class for this!
    }
    return 'badge-fail';
  }

  renderList() {
    if (this.campaigns.length === 0) {
      return html`<p>${t('history.none')}</p>`;
    }

    const isAnyPending = this.campaigns.some((c) => c.status === 'PARTIAL');

    return html`
      <div style="display: flex; justify-content: space-between;">
        <h2>${t('history.title')}</h2>
        ${isAnyPending ? html`<span class="live-indicator">${t('history.live')}</span>` : ''}
      </div>
      ${this.campaigns.map(
        (c) => html`
          <div class="card" @click=${() => this.loadDetails(c.id)}>
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <h3 style="margin: 0 0 0.5rem 0;">${c.subject}</h3>
              <span class="status-badge ${this.getBadgeClass(c.status)}">${t('history.status.' + c.status)}</span>
            </div>
            <p style="margin: 0; color: #64748b;">
              ${t('history.sentTotal', { sent: new Date(c.sentDate).toLocaleString(), total: c.totalSent })}
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
          <p>${t('history.selectPrompt')}</p>
        </div>
      `;
    }

    return html`
      <button class="back" @click=${this.handleBackClick}>${t('history.back')}</button>
      <h2>${c.subject}</h2>

      <div style="display: flex; align-items: center; gap: 1rem;">
        <h2>${c.subject}</h2>
        <span class="status-badge ${this.getBadgeClass(c.status)}">${t('history.status.' + c.status)}</span>
        ${c.status === 'PARTIAL' ? html`<span class="spinner">${t('history.refreshing')}</span>` : ''}
      </div>

      <h3>${t('history.deliveryStatus', { total: c.totalSent })}</h3>
      <ul>
        ${c.emails.map(
          (email: EmailDeliveryStatus) => html`
            <li>
              <span>${email.address}</span>
              <span class="status-badge ${this.getBadgeClass(email.status)}">
                ${email.status} ${email.errorReason ? `(${email.errorReason})` : ''}
              </span>
            </li>
          `
        )}
      </ul>

      <h3>${t('history.templatePreview')}</h3>
      <iframe srcdoc=${c.htmlContent}></iframe>
    `;
  }

  render() {
    if (this.loading) {
      return html`<p>${t('history.loading')}</p>`;
    }

    return this.selectedCampaign ? this.renderDetails() : this.renderList();
  }
}
