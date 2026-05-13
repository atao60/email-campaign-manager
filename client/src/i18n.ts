import i18next from 'i18next';
import HttpBackend from 'i18next-http-backend';

export const DEFAULT_LANGUAGE = 'fr';
const SUPPORTED_LANGUAGES = [DEFAULT_LANGUAGE, 'en'];

const NAME_SPACE = 'web';

export const initI18n = async () => {
  const rawBaseUrl = import.meta.env.BASE_URL || '/';
  const baseUrl = rawBaseUrl.endsWith('/') ? rawBaseUrl : `${rawBaseUrl}/`;
  const localesUrl = `${baseUrl}locales/`;

  console.log('localesUrl: ', localesUrl);

  await i18next.use(HttpBackend).init({
    supportedLngs: SUPPORTED_LANGUAGES,
    lng: DEFAULT_LANGUAGE,
    fallbackLng: 'en',
    defaultNS: NAME_SPACE,
    ns: [NAME_SPACE],
    backend: {
      //Path to fetch files from /src/assets/locales
      loadPath: `${localesUrl}{{lng}}/{{ns}}.json`
    },
    interpolation: {
      escapeValue: false
    },
    // Lazy Loading configuration
    preload: [] // We intentionally do NOT preload other languages
  });

  return i18next;
};
