# Simple Mailing Manager

## 💡 Rational

A lightweight application designed to manage and launch email campaigns, eliminating the need for traditional email clients like Gmail, Outlook, or Thunderbird.
Think of it as a personal, dedicated Email Service Provider (ESP) hosted under your control:

- File-Based Persistence: Operates without a traditional database; all data, including address lists, are stored in text files.
- Flexible List Management: Supports advanced address list operations, including merging and creating mutually exclusive segments.
- Hybrid Execution Engine: Redis and BullMQ as a high-performance runtime engine (queue management, job retries, asynchronous campaigns).
- [GDPR](https://eur-lex.europa.eu/eli/reg/2016/679/oj) Compliance & Consent Lifecycle: Automated management of subscriber consent, including expiration tracking, automated renewal requests, and built-in support for the "Right to be Forgotten" via automated data anonymization.
- Multi-Interface Support: Provides comprehensive control via CLI, REST API, a dedicated programming interface, and a web-based UI.
- SMTP Versatility: Compatible with any standard SMTP provider. For development, the system integrates seamlessly with Maildev.
- _Future Roadmap: An integrated local Mail Transfer Agent (MTA)._

This is also a Proof of Concept (POC) to further explore the convergence of Hexagonal Architecture (Ports and Adapters) and Domain-Driven Design (DDD).
The entire stack — both frontend and backend — is built using TypeScript and Node.js to demonstrate how these architectural patterns can be applied consistently across a unified ecosystem.

## 🏁 Quickstart

The first time, install the application. From a console:

```bash

git clone https://github.com/atao60/email-campaign-manager.git

cd email-campaign-manager

### If `mise` is installed:
mise trust

npm i

```

Now, start the application:

```bash
npm run start:web
```

Then with a browser go to [http://localhost:5173](http://localhost:5173).

### The CLI

Let's use now the CLI interface.

From a second console, go to the project root, then:

```bash
### Merge two lists
npx tsx src/main.ts merge data/merged.csv data/listA.csv data/listB.csv

### Launch a mailing campaign based on this list
npx tsx src/main.ts send-campaign data/merged.csv

```

To check the sent emails: with a browser go to [Maildev Report UI](http://localhost:1080).

It is also possible to send REST requests. Here no need to go to the project root:

```bash
### Check the server.
curl -w "\n" http://localhost:3000/health

### Merge two lists
curl -w "\n" -X POST http://localhost:3000/campaigns/merge \
     -H "Content-Type: application/json" \
     -d '{"inputs": ["./data/listA.csv", "./data/listB.csv"], "output": "./data/merged.csv"}'

### Launch a mailing campaign based on this list
curl -w "\n" -X POST http://localhost:3000/campaigns/send-campaign \
  -H "Content-Type: application/json" \
  -d '{
    "contactsFilePath": "./data/merged.csv",
    "subject": "Welcome to our Newsletter!",
    "templateHtml": "<h1>Hello {{firstName}}!</h1><p>Thanks for joining us.</p>"
  }'

### Check emails sending
curl -w "\n" http://localhost:3000/api/status

```

## 🛠️ Development

See [Contributing Guide](CONTRIBUTING.md).

## 🛡️ License

See [MIT](LICENSE).

Copyright &copy; 2026 [Pierre Raoul](https://github.com/atao60).

## 📜 Credits

[Google Gemini](https://gemini.google.com) has been widely used.

### Reference material

[Hexagonal architecture (Ports and Adapters)](https://alistair.cockburn.us/hexagonal-architecture), Cockburn, A. (2005)

Domain-Driven Design: Tackling Complexity in the Heart of Software, Eric Evans (Addison-Wesley Educational Publishers Inc, 2003)

Implementing Domain-Driven Design. Vernon, V. (Addison-Wesley Professional, 2013)
**Relevance:** Hexagonal, REST, See _Chapter 4 - Architecture_

Agile Software Development, Principles, Patterns and Practices, Robert-C Martin (Pearson Education, 2002)
**Relevance:** A bridge between the philosophy of Agile methodologies and the concrete technical practices required to make Agile work at the code level.
See _Chapters from 8 to 12 - SOLID principles_

Clean Architecture: A Craftsman's Guide to Software Structure and Design, Robert-C Martin (Addison-Wesley, 2017)
**Relevance:** See _Part III - Design Principles about SOLID_

[Architectural Styles and the Design of Network-based Software Architectures](https://roy.gbiv.com/pubs/dissertation/fielding_dissertation.pdf), Roy Thomas Fielding, (thèse 2000)
**Relevance:** See _Chapter 5 - Representational State Transfer (REST)_

[RESTful Web Services](http://restfulwebapis.com/RESTful_Web_Services.pdf), Leonard Richardson and Sam Ruby (O'Reilly Media, 2007)
**Relevance:** Bridges the gap between Fielding's academic dissertation and practical, real-world web development.

### Standards

[RFC 9110 (HTTP Semantics)](https://www.rfc-editor.org/rfc/rfc9110.html):
**Relevance:** This document replaces older RFCs (like RFC 2616 and 7231). It defines the core semantics of HTTP, including HTTP methods (`GET`, `POST`, `PUT`, `DELETE`, etc.) and HTTP status codes, which form the "Uniform Interface" constraint of REST.

[RFC 3986 (Uniform Resource Identifier - URI)](https://www.rfc-editor.org/rfc/rfc3986.html):
**Relevance:** Defines how resources should be identified and addressed on the web, which is fundamental to REST API routing.

[Regulation (EU) 2016/679 of the European Parliament and of the Council of 27 April 2016 on the protection of natural persons with regard to the processing of personal data and on the free movement of such data](https://eur-lex.europa.eu/eli/reg/2016/679/oj), and repealing Directive 95/46/EC **(General Data Protection Regulation)**
