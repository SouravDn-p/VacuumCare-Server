# OTP Flow

This project uses one-time password style tokens for:

- signup email verification
- forgot-password recovery

These tokens are not JWTs. They are random, single-use values that are hashed before storage.

## Signup verification OTP

When a user signs up with `requireEmailVerification = true`:

1. The backend creates the `User` record with `isActive = false`.
2. The backend generates a random token with `randomBytes(32)`.
3. The backend stores only the SHA-256 hash in `EmailVerificationToken`.
4. The raw token is sent by email through `EmailVerificationDeliveryService`.
5. The token expires after 24 hours.

Verification endpoint:

- `POST /auth/verify-email`

Resend endpoint:

- `POST /auth/resend-verification`

Both endpoints expect the raw token from the email flow, not the hash.

## Forgot-password OTP

When a password reset is requested:

1. The backend finds the user by email.
2. Any existing unused `PasswordResetToken` records for that user are marked used.
3. The backend generates a random token with `randomBytes(32)`.
4. The backend stores only the SHA-256 hash in `PasswordResetToken`.
5. The raw token is sent by email through `PasswordResetDeliveryService`.
6. The token expires after 15 minutes.

Reset endpoint:

- `POST /auth/reset-password`

## Storage rules

- raw OTP values are never stored in the database
- only SHA-256 hashes are persisted
- used or expired tokens are rejected on lookup
- resend flow invalidates old unused verification tokens before creating a new one

## Code references

- [auth.controller.ts](C:/projects/Full stack projects/vacumeCare-server/src/features/auth/auth.controller.ts)
- [auth.dto.ts](C:/projects/Full stack projects/vacumeCare-server/src/features/auth/dto/auth.dto.ts)
- [auth-response.dto.ts](C:/projects/Full stack projects/vacumeCare-server/src/features/auth/dto/auth-response.dto.ts)
- [schema.prisma](C:/projects/Full stack projects/vacumeCare-server/prisma/schema.prisma)

