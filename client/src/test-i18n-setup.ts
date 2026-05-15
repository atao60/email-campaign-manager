import i18next from 'i18next';

const webEn = {
  app: { name: 'Campaign Manager', aboutTitle: 'About Campaign Manager', version: 'Version' },
  nav: { dashboard: 'Dashboard', launcher: 'Launch Campaign 🚀', history: 'History', about: 'About' },
  dashboard: {
    title: 'Campaign Queue Status',
    errorBackend: 'Failed to connect to the backend API.',
    loading: 'Loading metrics...',
    waiting: 'Waiting',
    active: 'Active',
    completed: 'Completed',
    queueFailed: 'Queue Failed',
    hardFailures: 'Hard Failures'
  },
  launcher: {
    title: 'Launch New Campaign',
    selectCsvError: 'Please select a CSV file containing your contacts.',
    fillAllFieldsError: 'Please fill out all fields.',
    successQueued: 'Success! Campaign queued for {{count}} contacts.',
    failedLaunch: 'Failed to launch campaign.',
    unknownError: 'An unknown error occurred.',
    emailSubject: 'Email Subject',
    subjectPlaceholder: 'e.g., Welcome to our platform!',
    templateSource: 'Template Source',
    rawHtml: 'Raw HTML',
    remoteUrl: 'Remote URL',
    htmlPlaceholder: '<h1>Hello {{firstName}}</h1>...',
    urlPlaceholder: 'https://example.com/template.html',
    contactsCsv: 'Contacts (CSV File)',
    queueing: 'Queueing Campaign...',
    launch: 'Launch Campaign 🚀'
  },
  history: {
    none: 'No campaigns found.',
    title: 'Campaign History',
    live: '● Live Updating',
    sentTotal: 'Sent: {{sent}} | Total: {{total}}',
    selectPrompt: 'Please select a campaign to view its details.',
    back: '← Back to List',
    refreshing: '↻ Refreshing...',
    deliveryStatus: 'Delivery Status ({{total}} total)',
    templatePreview: 'Template Preview',
    loading: 'Loading data...'
  },
  about: {
    description:
      'This system manages mailing list merges and tracks asynchronous email campaigns. It helps ensure high deliverability and provides detailed tracking of successful deliveries and hard bounces.'
  }
};

export const initTestI18n = async () => {
  await i18next.init({
    lng: 'en',
    fallbackLng: 'en',
    defaultNS: 'web',
    ns: ['web'],
    resources: {
      en: { web: webEn }
    },
    interpolation: { escapeValue: false }
  });
};
