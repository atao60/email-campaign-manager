import { t } from 'i18next';
import { LitElement, html, css } from 'lit';
import { customElement } from 'lit/decorators.js';

@customElement('app-about')
export class AppAbout extends LitElement {
  static readonly styles = css`
    :host {
      display: block;
    }
    .container {
      background: white;
      padding: 2rem;
      border-radius: 8px;
      border: 1px solid #e2e8f0;
    }
    h2 {
      margin-top: 0;
      color: #2c3e50;
    }
    p {
      color: #475569;
      line-height: 1.6;
    }
  `;

  render() {
    return html`
      <div class="container">
        <h2>${t('app.aboutTitle')}</h2>
        <p><strong>${t('web:app.version')}</strong> 1.0.0</p>
        <p>${t('about.description')}</p>
      </div>
    `;
  }
}
