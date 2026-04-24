# FEATURES.md

## Core platform features

### User management

- **Status:** done
- **Summary:** Credential login, self-serve signup, email verification, password reset, session handling, account email change, account deletion, and profile updates are implemented.
- **Acceptance criteria:**
  - [x] Registration persists a user and issues a verification token.
  - [x] Verification and password reset flows consume stored tokens.
  - [x] Login creates an app session with role-aware user data.
  - [x] Profile display name and profile image updates persist and refresh session state.
  - [x] Account email change and account deletion validate current password.

### Authorization and admin access

- **Status:** done
- **Summary:** Role-aware helpers, admin/workspace navigation, and protected admin APIs are implemented.
- **Acceptance criteria:**
  - [x] Role helpers cover workspace/admin/report permissions.
  - [x] Admin routes enforce authentication and role checks.
  - [x] Authorization reporting endpoint exposes rate-limited permission state.

### API hardening

- **Status:** done
- **Summary:** Shared rate limiting and audit logging protect public and privileged HTTP endpoints.
- **Acceptance criteria:**
  - [x] Shared security helper handles rate limits and audit outcomes.
  - [x] Auth, account, profile, newsletter, report, data-entry, and admin mutation endpoints use the helper.
  - [x] Audit metadata is sanitized before persistence.

### Example accelerators

- **Status:** done
- **Summary:** Example routes demonstrate forms, storytelling, communication, uploads, and mock REST data under an explicit `/examples/*` namespace.
- **Acceptance criteria:**
  - [x] Example pages are clearly separated from the core app surface.
  - [x] Example REST data is served from `/api/examples/*`.
  - [x] Home and navigation entry points label these routes as examples.
