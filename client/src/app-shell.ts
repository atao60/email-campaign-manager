import { LitElement, html } from 'lit';
import { customElement, state } from 'lit/decorators.js';

import './components/campaign-dashboard';
import './components/campaign-launcher';
import './components/campaign-history';
import './components/app-about';

import styles from './app-shell.scss' with { type: 'css' };

type ViewState = 'dashboard' | 'launcher' | 'history' | 'about';

@customElement('app-shell')
export class AppShell extends LitElement {
  @state() private currentView: ViewState = 'dashboard';
  @state() private isMobileMenuOpen = false;

  static readonly styles = styles;

  private switchView(view: ViewState) {
    this.currentView = view;
    this.isMobileMenuOpen = false; // Auto-close menu on mobile
  }

  render() {
    return html`
      <nav>
        <div class="brand">Campaign Manager</div>
        <button class="hamburger" @click=${() => (this.isMobileMenuOpen = !this.isMobileMenuOpen)}>☰</button>
        <div class="nav-links ${this.isMobileMenuOpen ? 'open' : ''}">
          <button
            class="${this.currentView === 'dashboard' ? 'active' : ''}"
            @click=${() => this.switchView('dashboard')}
          >
            Dashboard
          </button>
          <button
            class="${this.currentView === 'launcher' ? 'active' : ''}"
            @click=${() => this.switchView('launcher')}
          >
            Launch Campaign 🚀
          </button>
          <button class="${this.currentView === 'history' ? 'active' : ''}" @click=${() => this.switchView('history')}>
            History
          </button>
          <button class="${this.currentView === 'about' ? 'active' : ''}" @click=${() => this.switchView('about')}>
            About
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
