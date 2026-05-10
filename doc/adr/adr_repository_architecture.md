# ADR xxx: Repository Architecture

**Date:** 2026-05-08

**Status:** Accepted

## 1. Context

Currently, the codebase mixes two distinct architectural patterns for handling data persistence, which creates cognitive load and structural inconsistency:

- **Hexagonal Architecture (Ports & Adapters):** Used in the `FailedEmail` feature (e.g., `domain/ports/FailedEmailRepository.ts`, `infrastructure/adapters/JsonFailedEmailRepositoryAdapter.ts`).
- **Classic Domain-Driven Design (DDD):** Used in the `CampaignHistory` feature (e.g., `domain/repositories/CampaignHistoryRepository.ts`, `infrastructure/repositories/FileSystemCampaignHistoryRepository.ts`).

Maintaining dual conventions makes the codebase harder to navigate, complicates onboarding, and blurs the lines of our intended system boundaries. We need a unified approach that respects both domain purity and strict infrastructure isolation.

## 2. Decision

We will standardize on a **Clean Architecture hybrid approach**. This combines the readable, business-focused modeling of Classic DDD with the strict boundary enforcement of Hexagonal Architecture.

### Rules of Implementation

1. **Domain Layer (Interfaces):**

- **Location:** `backend/src/domain/repositories/`
- **Naming:** Interfaces will use the `Repository` suffix but will drop the `Port` terminology to maintain pure business language.
- _Examples:_ `FailedEmailRepository.ts`, `CampaignHistoryRepository.ts`

1. **Infrastructure Layer (Implementations):**

- **Location:** `backend/src/infrastructure/adapters/repositories/`
- **Naming:** Classes must append `Adapter` to explicitly signal that they are technical translations of a domain concept.
- _Examples:_ `JsonFailedEmailRepositoryAdapter.ts`, `FileSystemCampaignHistoryRepositoryAdapter.ts`

## 3. Consequences

### Positive

- **Consistency:** A single, unified mental model for all data access patterns moving forward.
- **Domain Purity:** The domain layer is freed from technical jargon like "Ports", aligning closer with ubiquitous business language.
- **Explicit Boundaries:** Placing implementations inside an `adapters/` folder clearly communicates their technical, non-business nature to developers. Sub-categorizing into `adapters/repositories/` ensures the infrastructure layer remains organized as it scales to include other adapters (e.g., controllers, external APIs).

### Negative (Trade-offs)

- **Verbosity:** Implementation class and file names will become significantly longer (e.g., `InMemoryCampaignHistoryRepositoryAdapter.ts`).
- **Mitigation:** We accept this trade-off. The architectural clarity gained far outweighs the character count, and modern IDE auto-completion (VS Code) minimizes the typing burden.
