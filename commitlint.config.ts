import type { UserConfig } from '@commitlint/types';

const Configuration: UserConfig = {
  extends: ['@commitlint/config-conventional'],
  // Optional: detailed rules if you want to force lower-case, etc.
  rules: {
    // Enforce 50 characters maximum for the subject line
    'header-max-length': [2, 'always', 50],

    // Enforce 72 characters maximum per line in the body
    'body-max-line-length': [2, 'always', 72],

    // (Optional but recommended) Apply the 72-character limit to the footer as well
    'footer-max-line-length': [2, 'always', 72]
  }
};

export default Configuration;
