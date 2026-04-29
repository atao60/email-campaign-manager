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

### Standards

Domain-Driven Design: Tackling Complexity in the Heart of Software by Eric Evans (Addison-Wesley Educational Publishers Inc, 2003)

Agile Software Development, Principles, Patterns and Practices, Robert-C Martin (Pearson Education, 2002)
**Relevance:** A bridge between the philosophy of Agile methodologies and the concrete technical practices required to make Agile work at the code level.
See _Chapters from 8 to 12 - SOLID principles_

Clean Architecture: A Craftsman's Guide to Software Structure and Design, Robert-C Martin (Addison-Wesley, 2017)
**Relevance:** See _Part III - Design Principles about SOLID_

[Architectural Styles and the Design of Network-based Software Architectures](https://roy.gbiv.com/pubs/dissertation/fielding_dissertation.pdf), Roy Thomas Fielding, (thèse 2000)
**Relevance:** See _Chapter 5 - Representational State Transfer (REST)_

[RESTful Web Services](http://restfulwebapis.com/RESTful_Web_Services.pdf), Leonard Richardson and Sam Ruby (O'Reilly Media, 2007)
**Relevance:** Bridges the gap between Fielding's academic dissertation and practical, real-world web development.

[RFC 9110 (HTTP Semantics)](https://www.rfc-editor.org/rfc/rfc9110.html):
**Relevance:** This document replaces older RFCs (like RFC 2616 and 7231). It defines the core semantics of HTTP, including HTTP methods (`GET`, `POST`, `PUT`, `DELETE`, etc.) and HTTP status codes, which form the "Uniform Interface" constraint of REST.

[RFC 3986 (Uniform Resource Identifier - URI)](https://www.rfc-editor.org/rfc/rfc3986.html):
**Relevance:** Defines how resources should be identified and addressed on the web, which is fundamental to REST API routing.
