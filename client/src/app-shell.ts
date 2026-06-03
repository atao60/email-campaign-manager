import { LitElement, html } from 'lit';
import { customElement, state } from 'lit/decorators.js';

import { initI18n } from './i18n';

import './components/campaign-dashboard';
import './components/campaign-launcher';
import './components/campaign-history';
import './components/app-about';

import styles from './app-shell.scss' with { type: 'css' };

type ViewState = 'dashboard' | 'launcher' | 'history' | 'about';

const i18n = await initI18n();

const DEFAULT_ENV_MODE = 'production';

@customElement('app-shell')
export class AppShell extends LitElement {
  @state() private currentView: ViewState = 'dashboard';
  @state() private isMobileMenuOpen = false;

  static readonly styles = styles;

  connectedCallback() {
    super.connectedCallback();

    // Tell Lit to re-render the HTML when the language changes
    i18n.on('languageChanged', () => {
      this.requestUpdate();
    });
  }

  // Cleanup to prevent memory leaks if the app-shell is ever removed
  disconnectedCallback() {
    super.disconnectedCallback();
    i18n.off('languageChanged');
  }

  private switchView(view: ViewState) {
    this.currentView = view;
    this.isMobileMenuOpen = false; // Auto-close menu on mobile
  }

  render() {
    const t = i18n.t;
    const envMode = import.meta.env.MODE;
    return html`
      <nav>
        <div class="brand">
          ${t('app.name')}
          ${envMode && envMode !== DEFAULT_ENV_MODE
            ? html`<span class="env-badge env-${envMode}">${envMode}</span>`
            : ''}
        </div>
        <button class="hamburger" @click=${() => (this.isMobileMenuOpen = !this.isMobileMenuOpen)}>☰</button>
        <div class="nav-links ${this.isMobileMenuOpen ? 'open' : ''}">
          <button
            class="${this.currentView === 'dashboard' ? 'active' : ''}"
            @click=${() => this.switchView('dashboard')}
          >
            ${t('nav.dashboard')}
          </button>
          <button
            class="${this.currentView === 'launcher' ? 'active' : ''}"
            @click=${() => this.switchView('launcher')}
          >
            ${t('nav.launcher')}
          </button>
          <button class="${this.currentView === 'history' ? 'active' : ''}" @click=${() => this.switchView('history')}>
            ${t('nav.history')}
          </button>
          <button class="${this.currentView === 'about' ? 'active' : ''}" @click=${() => this.switchView('about')}>
            ${t('nav.about')}
          </button>
        </div>
      </nav>

      <main>
        ${this.currentView === 'dashboard' ? html`<campaign-dashboard></campaign-dashboard>` : ''}
        ${this.currentView === 'launcher' ? html`<campaign-launcher></campaign-launcher>` : ''}
        ${this.currentView === 'history' ? html`<campaign-history></campaign-history>` : ''}
        ${this.currentView === 'about' ? html`<app-about></app-about>` : ''}
      </main>
    `;
  }
}
