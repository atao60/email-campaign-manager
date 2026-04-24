export default {
  defaultNamespace: 'translation',
  lexers: { ts: ['JavascriptLexer'] },
  locales: ['fr', 'en'],
  output: 'locales/$LOCALE/$NAMESPACE.json',
  input: ['src/**/*.{ts,tsx}'],
};