import { LitElement, html } from 'lit';
import { customElement, state, query } from 'lit/decorators.js';
import { t } from 'i18next';

import { apiClient, type LaunchCampaignRequest } from '../api-client';

import styles from './campaign-launcher.scss' with { type: 'css' };

@customElement('campaign-launcher')
export class CampaignLauncher extends LitElement {
  static readonly styles = styles;

  @state() private subject = '';
  @state() private templateMode: 'html' | 'url' = 'html';
  @state() private templateContent = '';
  @state() private isSubmitting = false;
  @state() private statusMessage: { type: 'success' | 'error'; text: string } | null = null;
  @state() private selectedExclusions: string[] = [];
  @state() private selectedAttachments: string[] = [];

  @query('#csv-file') private readonly fileInput!: HTMLInputElement;
  @query('#attachments-file') private readonly attachmentsInput!: HTMLInputElement;
  @query('#exclusions-file') private readonly exclusionsInput!: HTMLInputElement;

  private handleSubjectChange(e: Event) {
    this.subject = (e.target as HTMLInputElement).value;
  }

  private handleTemplateContentChange(e: Event) {
    this.templateContent = (e.target as HTMLTextAreaElement | HTMLInputElement).value;
  }

  private handleExclusionsChange() {
    if (this.exclusionsInput.files) {
      this.selectedExclusions = Array.from(this.exclusionsInput.files).map((f) => f.name);
    } else {
      this.selectedExclusions = [];
    }
  }

  private handleAttachmentsChange() {
    if (this.attachmentsInput.files) {
      this.selectedAttachments = Array.from(this.attachmentsInput.files).map((f) => f.name);
    } else {
      this.selectedAttachments = [];
    }
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

    // Declare the payload variable using the strictly required base fields
    const payload: LaunchCampaignRequest = {
      csvFile: file,
      subject: this.subject
    };

    // Attach the correct template key
    if (this.templateMode === 'html') {
      payload.html = this.templateContent;
    } else {
      payload.url = this.templateContent;
    }

    // Attach attachments ONLY if they exist
    const attachments = Array.from(this.attachmentsInput.files || []);
    if (attachments.length > 0) {
      payload.attachments = attachments;
    }

    // Attach exclusion files ONLY if they exist
    const exclusions = Array.from(this.exclusionsInput.files || []);
    if (exclusions.length > 0) {
      payload.exclusions = exclusions;
    }

    try {
      // Pass the strongly-typed object to your updated apiClient
      const result = await apiClient.launchCampaign(payload);

      this.statusMessage = {
        type: 'success',
        text: t('launcher.successQueued', { count: result.processed })
      };

      // Reset form on success
      this.subject = '';
      this.templateContent = '';
      this.fileInput.value = '';
      this.attachmentsInput.value = '';
      this.exclusionsInput.value = '';
      this.selectedExclusions = [];
      this.selectedAttachments = [];
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

        <div class="form-group">
          <label for="exclusions-file">${t('launcher.exclusions')} (${t('launcher.optional')})</label>
          <input type="file" id="exclusions-file" accept=".csv" multiple @change=${this.handleExclusionsChange} />
          <small class="help-text">${t('launcher.exclusionsHelp')}</small>

          ${this.selectedExclusions.length > 1
            ? html`
                <ul class="selected-files-list">
                  ${this.selectedExclusions.map((name) => html`<li>${name}</li>`)}
                </ul>
              `
            : ''}
        </div>

        <div class="form-group">
          <label for="attachments-file">${t('launcher.attachments')} (${t('launcher.optional')})</label>
          <input type="file" id="attachments-file" multiple @change=${this.handleAttachmentsChange} />
          <small class="help-text">${t('launcher.attachmentsHelp')}</small>
          ${this.selectedAttachments.length > 1
            ? html`
                <ul class="selected-files-list">
                  ${this.selectedAttachments.map((name) => html`<li>${name}</li>`)}
                </ul>
              `
            : ''}
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
