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
        <h2>About Campaign Manager</h2>
        <p><strong>Version:</strong> 1.0.0</p>
        <p>
          This system will manage mailing list merges and tracks asynchronous email campaigns. It will ensure high
          deliverability and provide detailed tracking of successful deliveries and hard bounces.
        </p>
      </div>
    `;
  }
}
