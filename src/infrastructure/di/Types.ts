
export const DI_TYPES = {
  // Services
  LanguageService: Symbol.for('LanguageService'),
  Logger: Symbol.for('Logger'),

  // Ports
  CsvPort: Symbol.for('CsvPort'),
  EmailPort: Symbol.for('EmailPort'),

  // Use Cases
  MergeMailingListsUseCase: Symbol.for('MergeMailingListsUseCase')
};
