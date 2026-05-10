# ADR [Number]: [Decision Summary - e.g., Adopt OAuth 2.0 for User Authentication]

// See: Documenting Architecture Decisions
// https://cognitect.com/blog/2011/11/15/documenting-architecture-decisions
// Michael Nygard - November 15, 2011, i.e. the following model:

## 1. Status

Status: **[Proposed | Accepted | Superseded by ADR XXX | Deprecated]**

Date: [YYYY-MM-DD]

## 2. Context

[Describe the problem or context. What are the drivers, constraints, and current state that necessitate a decision? For example: "The current system uses basic session-based authentication, which is not scalable for third-party integrations and requires manual handling of token expiration. We need a standard protocol to enable secure, delegated access."]

## 3. Decision

[State the final decision clearly. **Example: We will use OAuth 2.0, specifically the Authorization Code Grant flow, hosted by a dedicated identity provider (e.g., Auth0/Okta).**]

## 4. Consequences

### Good

- [Benefit 1: e.g., Offloads complex security management to a dedicated provider.]
- [Benefit 2: e.g., Industry standard protocol, making integration with other services straightforward.]
- [Benefit 3: e.g., Provides a clear mechanism for token refresh and revocation.]

### Bad

- [Drawback 1: e.g., Introduces a hard dependency on the external identity provider.]
- [Drawback 2: e.g., Increased latency for initial user authentication due to external call.]
- [Drawback 3: e.g., Requires developer training on OAuth 2.0 concepts and flows.]

## 5. Considered Alternatives (Optional but Recommended)

- **Alternative 1 (e.g., Using API Keys):** [Why was this rejected? e.g., API keys are less secure as they are long-lived and difficult to revoke without coordination.]
- **Alternative 2 (e.g., Using SAML):** [Why was this rejected? e.g., SAML is overly complex for our primary use case (B2C), which is better suited for OAuth 2.0.]

## 6. More reading (Optional but Recommended)
