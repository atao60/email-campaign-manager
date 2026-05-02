import { LitElement, html, css } from 'lit';
import { customElement, state } from 'lit/decorators.js';

// Import the sub-components
import './components/campaign-dashboard'; // Your existing component
import './components/campaign-history';
import './components/app-about';

type ViewState = 'dashboard' | 'history' | 'about';

@customElement('app-shell')
export class AppShell extends LitElement {
  @state() private currentView: ViewState = 'dashboard';
  @state() private isMobileMenuOpen = false;

  static readonly styles = css`
    :host {
      display: block;
      font-family:
        system-ui,
        -apple-system,
        sans-serif;
    }

    /* Navbar Styles */
    nav {
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: #2c3e50;
      color: white;
      padding: 1rem 2rem;
    }
    .brand {
      font-size: 1.2rem;
      font-weight: bold;
    }

    .nav-links {
      display: flex;
      gap: 1.5rem;
    }
    .nav-links button {
      background: none;
      border: none;
      color: #cbd5e1;
      cursor: pointer;
      font-size: 1rem;
      padding: 0.5rem;
    }
    .nav-links button.active {
      color: white;
      font-weight: bold;
      border-bottom: 2px solid #3498db;
    }
    .nav-links button:hover {
      color: white;
    }

    .hamburger {
      display: none;
      background: none;
      border: none;
      color: white;
      font-size: 1.5rem;
      cursor: pointer;
    }

    /* Smartphone Media Query */
    @media (max-width: 768px) {
      nav {
        padding: 1rem;
      }
      .hamburger {
        display: block;
      }
      .nav-links {
        display: none;
        flex-direction: column;
        width: 100%;
        background: #34495e;
        position: absolute;
        top: 60px;
        left: 0;
        padding: 1rem 0;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      }
      .nav-links.open {
        display: flex;
      }
      .nav-links button {
        padding: 1rem;
        text-align: left;
        width: 100%;
      }
    }

    main {
      padding: 2rem;
      max-width: 1200px;
      margin: 0 auto;
    }
  `;

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
        ${this.currentView === 'history' ? html`<campaign-history></campaign-history>` : ''}
        ${this.currentView === 'about' ? html`<app-about></app-about>` : ''}
      </main>
    `;
  }
}
