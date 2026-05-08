import { LitElement, html } from 'lit';
import { customElement, state, query } from 'lit/decorators.js';

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
      this.statusMessage = { type: 'error', text: 'Please select a CSV file containing your contacts.' };
      return;
    }

    if (!this.subject || !this.templateContent) {
      this.statusMessage = { type: 'error', text: 'Please fill out all fields.' };
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
        text: `Success! Campaign queued for ${result.processed} contacts.`
      };

      // Reset form on success
      this.subject = '';
      this.templateContent = '';
      this.fileInput.value = '';
    } catch (error: unknown) {
      if (error instanceof Error) {
        this.statusMessage = { type: 'error', text: error.message || 'Failed to launch campaign.' };
      }
      // Fallback for weird cases where someone throws a string or object
      else if (typeof error === 'string') {
        this.statusMessage = { type: 'error', text: error || 'Failed to launch campaign.' };
      } else {
        this.statusMessage = { type: 'error', text: 'An unknown error occurred.' };
      }
    } finally {
      this.isSubmitting = false;
    }
  }

  render() {
    return html`
      <h2>Launch New Campaign</h2>

      <form @submit=${this.handleSubmit}>
        <div class="form-group">
          <label for="subject">Email Subject</label>
          <input
            type="text"
            id="subject"
            .value=${this.subject}
            @input=${this.handleSubjectChange}
            placeholder="e.g., Welcome to our platform!"
            required
          />
        </div>

        <div class="form-group">
          <label>Template Source</label>
          <div class="radio-group">
            <label>
              <input
                type="radio"
                name="templateMode"
                value="html"
                .checked=${this.templateMode === 'html'}
                @change=${() => (this.templateMode = 'html')}
              />
              Raw HTML
            </label>
            <label>
              <input
                type="radio"
                name="templateMode"
                value="url"
                .checked=${this.templateMode === 'url'}
                @change=${() => (this.templateMode = 'url')}
              />
              Remote URL
            </label>
          </div>

          ${this.templateMode === 'html'
            ? html`
                <textarea
                  .value=${this.templateContent}
                  @input=${this.handleTemplateContentChange}
                  placeholder="<h1>Hello {{firstName}}</h1>..."
                  required
                ></textarea>
              `
            : html`
                <input
                  type="url"
                  .value=${this.templateContent}
                  @input=${this.handleTemplateContentChange}
                  placeholder="https://example.com/template.html"
                  required
                />
              `}
        </div>

        <div class="form-group">
          <label for="csv-file">Contacts (CSV File)</label>
          <input type="file" id="csv-file" accept=".csv" required />
        </div>

        <button type="submit" ?disabled=${this.isSubmitting}>
          ${this.isSubmitting ? 'Queueing Campaign...' : 'Launch Campaign 🚀'}
        </button>
      </form>

      ${this.statusMessage
        ? html` <div class="status ${this.statusMessage.type}">${this.statusMessage.text}</div> `
        : ''}
    `;
  }
}
