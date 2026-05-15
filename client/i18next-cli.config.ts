import { defineConfig } from 'i18next-cli';

export default defineConfig({
  locales: ['fr', 'en'],
  extract: {
    input: 'src/**/*.ts',
    output: '../locales/{{language}}/web/{{namespace}}.json',
    // ns: ['web'],
    // // @ts-expect-error- The runtime requires this to prevent cross-file nesting
    // namespaces: ['web'],
    defaultNS: 'web',
    // defaultNamespace: 'web',
    keySeparator: '.',
    removeUnusedKeys: false
  }
});
