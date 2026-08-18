import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole } from '../../../../generated/prisma/enums';

export class AuthenticatedUserResponseDto {
  @ApiProperty({ example: 'cm6f4m0xw0000s1a2b3c4d5e6' })
  id!: string;

  @ApiProperty({ format: 'email', example: 'alex@example.com' })
  email!: string;

  @ApiProperty({
    enum: UserRole,
    enumName: 'UserRole',
    example: UserRole.CUSTOMER,
  })
  role!: UserRole;
}

export class AuthSessionResponseDto {
  @ApiProperty({
    description:
      'JWT access token. Send it as `Authorization: Bearer <token>`.',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.example.signature',
  })
  accessToken!: string;

  @ApiProperty({ type: () => AuthenticatedUserResponseDto })
  user!: AuthenticatedUserResponseDto;

  @ApiProperty({
    description:
      'Opaque refresh token that can be exchanged for a new access token.',
    example: '7bc1f1c3b5e44d68a5f4b18a6c2f6b0a...',
  })
  refreshToken!: string;
}

export class ForgotPasswordResponseDto {
  @ApiProperty({
    example: 'If that account exists, a reset code has been sent.',
  })
  message!: string;

  @ApiPropertyOptional({
    description:
      'Only included outside production to support local development. Never expose this token in production.',
    example: 'cfa3d4b17a0e4f77b9f0d3b321739c22',
  })
  token?: string;
}

export class VerifyEmailResponseDto {
  @ApiProperty({ example: true })
  success!: boolean;
}

export class SignupResponseDto {
  @ApiPropertyOptional({
    description:
      'Present when the account was created in a pending state and must be verified by email before login.',
    example: true,
  })
  emailVerificationRequired?: boolean;

  @ApiPropertyOptional({
    description:
      'JWT access token returned when email verification is not required.',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.example.signature',
  })
  accessToken?: string;

  @ApiPropertyOptional({ type: () => AuthenticatedUserResponseDto })
  user?: AuthenticatedUserResponseDto;

  @ApiPropertyOptional({
    description:
      'Opaque refresh token returned when email verification is not required.',
    example: '7bc1f1c3b5e44d68a5f4b18a6c2f6b0a...',
  })
  refreshToken?: string;
}

export class LogoutResponseDto {
  @ApiProperty({ example: true })
  success!: boolean;
}

export class ResendVerificationResponseDto {
  @ApiProperty({
    example: 'If that account exists and still needs verification, a new code has been sent.',
  })
  message!: string;

  @ApiPropertyOptional({
    description:
      'Only included outside production to support local development. Never expose this token in production.',
    example: 'f7d1d4c8f4c24f0aa7c0a12c5d8d7a3c',
  })
  token?: string;
}
