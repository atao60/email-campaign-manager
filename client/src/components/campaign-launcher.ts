import { LitElement, html } from 'lit';
import { customElement, state, query } from 'lit/decorators.js';
import { t } from 'i18next';

import { apiClient } from '../api-client';

import styles from './campaign-launcher.scss' with { type: 'css' };

@customElement('campaign-launcher')
export class CampaignLauncher extends LitElement {
  static readonly styles = styles;

  @state() private subject = '';
  @state() private templateMode: 'html' | 'url' = 'html';
  @state() private templateContent = '';
  @state() private isSubmitting = false;
  @state() private statusMessage: { type: 'success' | 'error'; text: string } | null = null;

  @query('#csv-file') private readonly fileInput!: HTMLInputElement;

  private handleSubjectChange(e: Event) {
    this.subject = (e.target as HTMLInputElement).value;
  }

  private handleTemplateContentChange(e: Event) {
    this.templateContent = (e.target as HTMLTextAreaElement | HTMLInputElement).value;
  }

  private async handleSubmit(e: Event) {
    e.preventDefault();
    this.statusMessage = null;

    const file = this.fileInput.files?.[0];
    if (!file) {
      this.statusMessage = { type: 'error', text: t('launcher.selectCsvError') };
      return;
    }

    if (!this.subject || !this.templateContent) {
      this.statusMessage = { type: 'error', text: t('launcher.fillAllFieldsError') };
      return;
    }

    this.isSubmitting = true;

    // Build the multipart/form-data payload
    const formData = new FormData();
    formData.append('contactsCsv', file);
    formData.append('subject', this.subject);

    if (this.templateMode === 'html') {
      formData.append('templateHtml', this.templateContent);
    } else {
      formData.append('templateUrl', this.templateContent);
    }

    try {
      const result = await apiClient.launchCampaign(formData);
      this.statusMessage = {
        type: 'success',
        text: t('launcher.successQueued', { count: result.processed })
      };

      // Reset form on success
      this.subject = '';
      this.templateContent = '';
      this.fileInput.value = '';
    } catch (error: unknown) {
      if (error instanceof Error) {
        this.statusMessage = { type: 'error', text: error.message || t('launcher.failedLaunch') };
      }
      // Fallback for weird cases where someone throws a string or object
      else if (typeof error === 'string') {
        this.statusMessage = { type: 'error', text: error || t('launcher.failedLaunch') };
      } else {
        this.statusMessage = { type: 'error', text: t('launcher.unknownError') };
      }
    } finally {
      this.isSubmitting = false;
    }
  }

  render() {
    return html`
      <h2>${t('launcher.title')}</h2>

      <form @submit=${this.handleSubmit}>
        <div class="form-group">
          <label for="subject">${t('launcher.emailSubject')}</label>
          <input
            type="text"
            id="subject"
            .value=${this.subject}
            @input=${this.handleSubjectChange}
            placeholder=${t('launcher.subjectPlaceholder')}
            required
          />
        </div>

        <div class="form-group">
          <label>${t('launcher.templateSource')}</label>
          <div class="radio-group">
            <label>
              <input
                type="radio"
                name="templateMode"
                value="html"
                .checked=${this.templateMode === 'html'}
                @change=${() => (this.templateMode = 'html')}
              />
              ${t('launcher.rawHtml')}
            </label>
            <label>
              <input
                type="radio"
                name="templateMode"
                value="url"
                .checked=${this.templateMode === 'url'}
                @change=${() => (this.templateMode = 'url')}
              />
              ${t('launcher.remoteUrl')}
            </label>
          </div>

          ${this.templateMode === 'html'
            ? html`
                <textarea
                  .value=${this.templateContent}
                  @input=${this.handleTemplateContentChange}
                  placeholder=${t('launcher.htmlPlaceholder')}
                  required
                ></textarea>
              `
            : html`
                <input
                  type="url"
                  .value=${this.templateContent}
                  @input=${this.handleTemplateContentChange}
                  placeholder=${t('launcher.urlPlaceholder')}
                  required
                />
              `}
        </div>

        <div class="form-group">
          <label for="csv-file">${t('launcher.contactsCsv')}</label>
          <input type="file" id="csv-file" accept=".csv" required />
        </div>

        <button type="submit" ?disabled=${this.isSubmitting}>
          ${this.isSubmitting ? t('launcher.queueing') : t('launcher.launch')}
        </button>
      </form>

      ${this.statusMessage
        ? html` <div class="status ${this.statusMessage.type}">${this.statusMessage.text}</div> `
        : ''}
    `;
  }
}
