# Simple Mailing Manager from command line

## 💡 Rational

Small command-line application to launch mailings from address lists stored in text files.
No more need for Gmail, Outlook, Thunderbird, or other email clients.

Work with any SMTP server such as Gmail one. Will use `Maildev` in dev mode.

## 🏁 Quickstart

From a first console:

```bash
npm run start:dev
```

From a second console:

```bash
npx tsx src/main.ts merge data/merged.csv data/listA.csv data/listB.csv

npx tsx src/main.ts send-campaign data/merged.csv

```

To check the sent emails, with a browser go to [Maildev Report UI](http://localhost:1080).

## 🛠️ Development

See [Contributing Guide](CONTRIBUTING.md).

## 🛡️ License

See [MIT](LICENSE).

Copyright &copy; 2026 [Pierre Raoul](https://github.com/atao60).

## 📜 Credits

Google Gemini has been widely used.

Domain-Driven Design: Tackling Complexity in the Heart of Software by Eric Evans (Addison-Wesley Educational Publishers Inc, 2003)

Agile Software Development, Principles, Patterns and Practices, Robert-C Martin (Pearson Education, 2002)

Clean Architecture: A Craftsman's Guide to Software Structure and Design, Robert-C Martin (Addison-Wesley, 2017), see Part III - Design Principles about SOLID
