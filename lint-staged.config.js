export default {
  '**/*.{ts,js,mjs,cjs}': ['eslint --fix', 'prettier --write'],
  '**/*.{json,md}': ['prettier --write']
};
