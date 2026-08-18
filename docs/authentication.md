# Authentication

This project uses JWT bearer authentication for protected API routes, plus opaque refresh tokens, optional email verification during signup, and separate one-time token flows for email verification and password resets.

## Overview

- Login, signup, refresh, logout, verification resend, email verification, and password reset are handled by `AuthController` under `src/features/auth/`.
- Protected routes use `JwtAuthGuard`, which wraps Passport's `jwt` strategy.
- The authenticated user is available through the `@CurrentUser()` decorator.
- The JWT secret comes from `JWT_SECRET`, with a development fallback for local runs.

## Session model

Successful login returns a session payload:

- `accessToken`: a signed JWT
- `user`: the authenticated user's `id`, `email`, and `role`
- `refreshToken`: an opaque token stored server-side in hashed form

The JWT is signed with:

- `sub`: user id
- `email`: user email
- `role`: user role

The access token currently expires in 30 minutes because `AuthModule` registers `JwtModule` with `signOptions: { expiresIn: '30m' }`.

Clients should send the token as:

```http
Authorization: Bearer <accessToken>
```

## Signup

Two signup endpoints exist:

- `POST /auth/customer/signup`
- `POST /auth/technician/signup`

Both routes:

- require `acceptTerms = true`
- reject duplicate email addresses
- lowercase the email before storing and lookup
- hash the password with `bcryptjs` using 12 rounds
- create the user record
- create a primary address

Technician signup also creates a technician profile with:

- `serviceArea`
- `skills`
- optional `employeeId`
- optional `licenseNumber`
- optional `yearsExperience`
- optional `bio`

Signup supports optional email verification through `requireEmailVerification`.

- When the flag is omitted or `false`, signup returns a normal session object.
- When the flag is `true`, the account is created inactive and a verification email is sent instead of logging the user in.

The verification token is stored hashed in the database and expires after 24 hours.

Required production env vars for verification emails:

- `RESEND_API_KEY`
- `VERIFICATION_EMAIL_FROM` or `RESET_EMAIL_FROM`
- `EMAIL_VERIFICATION_URL`

`EMAIL_VERIFICATION_URL` must point to the frontend verification page. The backend appends `?token=...` before sending the email.

## Login

`POST /auth/login` accepts:

- `email`
- `password`

The controller:

- looks up the user by lowercase email
- checks `isActive`
- compares the password with the stored bcrypt hash
- returns an auth session on success

Invalid credentials and inactive accounts are both rejected with `401 Unauthorized`.

`POST /auth/refresh` exchanges a valid refresh token for a new session.

- Refresh tokens are opaque random strings.
- The server stores only a SHA-256 hash of the token.
- On refresh, the old token is revoked and a new refresh token is issued.
- Expired, revoked, or inactive-account tokens are rejected.
- The refresh token lifetime is 7 days.

`POST /auth/logout` revokes the presented refresh token.

- It only revokes the one token supplied in the request.
- Other sessions for the same account remain active.
- This is the endpoint to use for device-specific logout.

`POST /auth/verify-email` accepts a one-time verification token.

- It activates the user account.
- It marks the token as used.
- After verification, the user can log in normally.

`POST /auth/resend-verification` issues a fresh signup OTP for an account that still needs verification.

- It is safe to call for a missing or already active account.
- It revokes any previous unused verification tokens before issuing a new one.
- In production, the new token is sent by email through the configured delivery service.

If the user did not receive the signup OTP, resend verification instead of starting a new signup.

## Protected requests

The JWT strategy is implemented in `src/features/auth/jwt.strategy.ts`.

Request flow:

1. `JwtAuthGuard` extracts the bearer token from the `Authorization` header.
2. Passport verifies the token signature using `getJwtSecret()`.
3. The strategy loads the user from the database by `payload.sub`.
4. The request is rejected if the user does not exist or is inactive.
5. The validated user object is attached to `request.user`.

`AuthUser` only contains:

- `id`
- `email`
- `role`

`@CurrentUser()` reads that object from the request and injects it into controller handlers.

## Current user endpoint

`GET /auth/me` returns the authenticated user's profile.

It is protected by `JwtAuthGuard` and uses `@ApiBearerAuth()` in Swagger. The response includes the user record without `passwordHash`, plus related `addresses` and `technician` data.

## Password reset

Password reset uses a separate one-time token flow.

### Request a reset token

`POST /auth/forgot-password`

Behavior:

- If the email does not exist, the API still returns the same generic message.
- If the user exists, any previously unused reset tokens for that user are marked used.
- A new reset token is generated with `randomBytes(32)`.
- Only the SHA-256 hash of the token is stored in the database.
- The token expires after 15 minutes.

Response:

- `message`: always the same generic success message
- `token`: included only when `NODE_ENV !== 'production'`

### Delivering the reset token

`PasswordResetDeliveryService` sends the reset link in production using Resend.

Required environment variables:

- `RESEND_API_KEY`
- `RESET_EMAIL_FROM`
- `PASSWORD_RESET_URL`

`PASSWORD_RESET_URL` must be an absolute frontend URL. The service appends the reset token as a query parameter.

If delivery fails, the newly created reset token is deleted so the system does not leave an unusable token active.

### Reset the password

`POST /auth/reset-password`

Behavior:

- hashes the supplied token and searches for a matching unused record
- rejects expired, already used, or unknown tokens with `401 Unauthorized`
- updates the user's password hash with bcrypt
- marks the reset token as used

## JWT secret handling

`getJwtSecret()` enforces two modes:

- Development: falls back to a local secret so fresh checkouts can run
- Production: requires `JWT_SECRET` to be set, at least 32 characters long, and not one of the placeholder values

This keeps local development convenient while preventing accidental deployment with an unsafe signing key.

## Where auth is used

Many feature controllers rely on the same auth stack, including:

- `users`
- `cart`
- `catalog`
- `orders`
- `tracking`
- `chat`
- `calls`
- `payments`
- `notifications`
- `admin`
- `service-requests`

These routes generally combine:

- `@UseGuards(JwtAuthGuard)`
- `@CurrentUser()`
- role-aware authorization checks inside the controller or service layer

## Security notes

- Passwords are never stored in plain text.
- JWTs are bearer tokens and should be treated as secrets.
- Password reset tokens are stored only as hashes.
- Refresh tokens are stored only as hashes.
- In production, password reset tokens are not returned in API responses.
- The backend rechecks `isActive` on every authenticated request, so disabling a user immediately blocks access even if their JWT has not expired.
