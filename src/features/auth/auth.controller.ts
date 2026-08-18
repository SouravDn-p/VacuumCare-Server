import {
  Body,
  BadRequestException,
  ConflictException,
  Controller,
  Get,
  InternalServerErrorException,
  Post,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { compare, hash } from 'bcryptjs';
import { createHash, randomBytes } from 'crypto';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { UserRole } from '../../../generated/prisma/enums';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import type { AuthUser } from '../../common/auth/auth.types';
import {
  ApiErrorResponseDto,
  SuccessResponseDto,
} from '../../common/dto/api-response.dto';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { PrismaService } from '../../database/prisma.service';
import {
  ForgotPasswordDto,
  LoginDto,
  RefreshTokenDto,
  ResetPasswordDto,
  ResendVerificationDto,
  SignupDto,
  TechnicianSignupDto,
  VerifyEmailDto,
} from './dto/auth.dto';
import {
  AuthSessionResponseDto,
  ForgotPasswordResponseDto,
  LogoutResponseDto,
  SignupResponseDto,
  ResendVerificationResponseDto,
  VerifyEmailResponseDto,
} from './dto/auth-response.dto';
import { UserProfileResponseDto } from '../users/dto/user-response.dto';
import { EmailVerificationDeliveryService } from './email-verification-delivery.service';
import { PasswordResetDeliveryService } from './password-reset-delivery.service';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly passwordResetDelivery: PasswordResetDeliveryService,
    private readonly emailVerificationDelivery: EmailVerificationDeliveryService,
  ) {}

  @Post('customer/signup')
  @ApiOperation({ summary: 'Register a customer' })
  @ApiCreatedResponse({ type: SignupResponseDto })
  @ApiBadRequestResponse({ type: ApiErrorResponseDto })
  @ApiConflictResponse({
    type: ApiErrorResponseDto,
    description: 'The email address is already registered.',
  })
  signupCustomer(@Body() dto: SignupDto) {
    return this.signup(dto, UserRole.CUSTOMER);
  }

  @Post('technician/signup')
  @ApiOperation({
    summary: 'Register a technician with skills and service area',
  })
  @ApiCreatedResponse({ type: SignupResponseDto })
  @ApiBadRequestResponse({ type: ApiErrorResponseDto })
  @ApiConflictResponse({
    type: ApiErrorResponseDto,
    description: 'The email address is already registered.',
  })
  signupTechnician(@Body() dto: TechnicianSignupDto) {
    return this.signup(dto, UserRole.TECHNICIAN);
  }

  private async signup(dto: SignupDto | TechnicianSignupDto, role: UserRole) {
    if (!dto.acceptTerms)
      throw new BadRequestException(
        'Terms acceptance is required to create an account',
      );
    if (
      await this.prisma.user.findUnique({
        where: { email: dto.email.toLowerCase() },
      })
    )
      throw new ConflictException('Email already registered');
    const technician =
      role === UserRole.TECHNICIAN ? (dto as TechnicianSignupDto) : undefined;
    const user = await this.prisma.user.create({
      data: {
        role,
        email: dto.email.toLowerCase(),
        passwordHash: await hash(dto.password, 12),
        firstName: dto.firstName,
        lastName: dto.lastName,
        phone: dto.phone,
        termsAcceptedAt: new Date(),
        termsVersion: dto.termsVersion,
        isActive: dto.requireEmailVerification ? false : true,
        addresses: {
          create: {
            line1: dto.address,
            apartment: dto.apartment,
            city: dto.city,
            state: dto.state,
            zipCode: dto.zipCode,
            isPrimary: true,
          },
        },
        technician: technician
          ? {
              create: {
                serviceArea: technician.serviceArea,
                skills: technician.skills,
                employeeId: technician.employeeId,
                licenseNumber: technician.licenseNumber,
                yearsExperience: technician.yearsExperience,
                bio: technician.bio,
              },
            }
          : undefined,
      },
      include: { addresses: true, technician: true },
    });
    if (dto.requireEmailVerification) {
      await this.issueEmailVerification(user.id, user.email);
      return {
        emailVerificationRequired: true,
      };
    }
    return this.session(user);
  }

  @Post('login')
  @ApiOperation({ summary: 'Login any customer, technician, or admin' })
  @ApiCreatedResponse({ type: AuthSessionResponseDto })
  @ApiBadRequestResponse({ type: ApiErrorResponseDto })
  @ApiUnauthorizedResponse({
    type: ApiErrorResponseDto,
    description: 'Credentials are invalid or the account is inactive.',
  })
  async login(@Body() dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
      include: { technician: true },
    });
    if (
      !user ||
      !user.isActive ||
      !(await compare(dto.password, user.passwordHash))
    )
      throw new UnauthorizedException('Invalid credentials');
    return this.session(user);
  }

  @Post('refresh')
  @ApiOperation({ summary: 'Exchange a refresh token for a new session' })
  @ApiCreatedResponse({ type: AuthSessionResponseDto })
  @ApiBadRequestResponse({ type: ApiErrorResponseDto })
  @ApiUnauthorizedResponse({
    type: ApiErrorResponseDto,
    description: 'The refresh token is invalid, expired, or revoked.',
  })
  async refresh(@Body() dto: RefreshTokenDto) {
    const tokenHash = createHash('sha256').update(dto.refreshToken).digest('hex');
    const stored = await this.prisma.refreshToken.findFirst({
      where: {
        tokenHash,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      include: { user: true },
    });
    if (!stored?.user?.isActive)
      throw new UnauthorizedException('Invalid refresh token');
    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });
    return this.session(stored.user);
  }

  @Post('logout')
  @ApiOperation({ summary: 'Revoke the current refresh token' })
  @ApiCreatedResponse({ type: LogoutResponseDto })
  @ApiBadRequestResponse({ type: ApiErrorResponseDto })
  @ApiUnauthorizedResponse({
    type: ApiErrorResponseDto,
    description: 'The refresh token is invalid, expired, or already revoked.',
  })
  async logout(@Body() dto: RefreshTokenDto) {
    const tokenHash = createHash('sha256').update(dto.refreshToken).digest('hex');
    const stored = await this.prisma.refreshToken.findFirst({
      where: { tokenHash, revokedAt: null },
    });
    if (!stored)
      throw new UnauthorizedException('Invalid refresh token');
    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });
    return { success: true };
  }

  @Post('verify-email')
  @ApiOperation({ summary: 'Verify an email address with a one-time token' })
  @ApiCreatedResponse({ type: VerifyEmailResponseDto })
  @ApiBadRequestResponse({ type: ApiErrorResponseDto })
  @ApiUnauthorizedResponse({
    type: ApiErrorResponseDto,
    description: 'The verification token is invalid, expired, or already used.',
  })
  async verifyEmail(@Body() dto: VerifyEmailDto) {
    const tokenHash = createHash('sha256').update(dto.token).digest('hex');
    const verification = await this.prisma.emailVerificationToken.findFirst({
      where: { tokenHash, usedAt: null, expiresAt: { gt: new Date() } },
    });
    if (!verification)
      throw new UnauthorizedException('Invalid or expired verification token');
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: verification.userId },
        data: { isActive: true },
      }),
      this.prisma.emailVerificationToken.update({
        where: { id: verification.id },
        data: { usedAt: new Date() },
      }),
    ]);
    return { success: true };
  }

  @Post('resend-verification')
  @ApiOperation({ summary: 'Resend the signup verification OTP' })
  @ApiCreatedResponse({ type: ResendVerificationResponseDto })
  @ApiBadRequestResponse({ type: ApiErrorResponseDto })
  async resendVerification(@Body() dto: ResendVerificationDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
      include: { emailVerificationTokens: true },
    });
    if (!user || user.isActive) {
      return {
        message:
          'If that account exists and still needs verification, a new code has been sent.',
      };
    }
    await this.prisma.emailVerificationToken.updateMany({
      where: { userId: user.id, usedAt: null },
      data: { usedAt: new Date() },
    });
    const token = randomBytes(32).toString('hex');
    const created = await this.prisma.emailVerificationToken.create({
      data: {
        userId: user.id,
        tokenHash: createHash('sha256').update(token).digest('hex'),
        expiresAt: new Date(Date.now() + 24 * 60 * 60_000),
      },
    });
    try {
      await this.emailVerificationDelivery.send(user.email, token);
    } catch {
      await this.prisma.emailVerificationToken.delete({ where: { id: created.id } });
      throw new InternalServerErrorException(
        'Email verification could not be sent',
      );
    }
    return {
      message:
        'If that account exists and still needs verification, a new code has been sent.',
      ...(process.env.NODE_ENV !== 'production' ? { token } : {}),
    };
  }

  @Post('forgot-password')
  @ApiOperation({ summary: 'Request a password-reset token' })
  @ApiCreatedResponse({ type: ForgotPasswordResponseDto })
  @ApiBadRequestResponse({ type: ApiErrorResponseDto })
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });
    if (!user)
      return { message: 'If that account exists, a reset code has been sent.' };
    const token = randomBytes(32).toString('hex');
    const reset = await this.prisma.$transaction(async (tx) => {
      await tx.passwordResetToken.updateMany({
        where: { userId: user.id, usedAt: null },
        data: { usedAt: new Date() },
      });
      return tx.passwordResetToken.create({
        data: {
          userId: user.id,
          tokenHash: createHash('sha256').update(token).digest('hex'),
          expiresAt: new Date(Date.now() + 15 * 60_000),
        },
      });
    });
    try {
      await this.passwordResetDelivery.send(user.email, token);
    } catch {
      await this.prisma.passwordResetToken.delete({ where: { id: reset.id } });
      throw new InternalServerErrorException(
        'Password reset email could not be sent',
      );
    }
    return {
      message: 'If that account exists, a reset code has been sent.',
      ...(process.env.NODE_ENV !== 'production' ? { token } : {}),
    };
  }

  @Post('reset-password')
  @ApiOperation({ summary: 'Reset password with a one-time token' })
  @ApiCreatedResponse({ type: SuccessResponseDto })
  @ApiBadRequestResponse({ type: ApiErrorResponseDto })
  @ApiUnauthorizedResponse({
    type: ApiErrorResponseDto,
    description: 'The reset token is invalid, expired, or already used.',
  })
  async resetPassword(@Body() dto: ResetPasswordDto) {
    const tokenHash = createHash('sha256').update(dto.token).digest('hex');
    const reset = await this.prisma.passwordResetToken.findFirst({
      where: { tokenHash, usedAt: null, expiresAt: { gt: new Date() } },
    });
    if (!reset)
      throw new UnauthorizedException('Invalid or expired reset token');
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: reset.userId },
        data: { passwordHash: await hash(dto.password, 12) },
      }),
      this.prisma.passwordResetToken.update({
        where: { id: reset.id },
        data: { usedAt: new Date() },
      }),
    ]);
    return { success: true };
  }

  @Get('me')
  @ApiOperation({ summary: 'Get the authenticated user profile' })
  @ApiBearerAuth()
  @ApiOkResponse({ type: UserProfileResponseDto })
  @ApiUnauthorizedResponse({ type: ApiErrorResponseDto })
  @UseGuards(JwtAuthGuard)
  me(@CurrentUser() user: AuthUser) {
    return this.prisma.user.findUnique({
      where: { id: user.id },
      omit: { passwordHash: true },
      include: { addresses: true, technician: true },
    });
  }

  private async session(
    user: { id: string; email: string; role: UserRole },
    issueRefreshToken = true,
  ) {
    const accessToken = this.jwt.sign({
      sub: user.id,
      email: user.email,
      role: user.role,
    });
    if (!issueRefreshToken) {
      return {
        accessToken,
        user: { id: user.id, email: user.email, role: user.role },
      };
    }
    const refreshToken = randomBytes(48).toString('hex');
    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: createHash('sha256').update(refreshToken).digest('hex'),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60_000),
      },
    });
    return {
      accessToken,
      user: { id: user.id, email: user.email, role: user.role },
      refreshToken,
    };
  }

  private async issueEmailVerification(userId: string, email: string) {
    const token = randomBytes(32).toString('hex');
    await this.prisma.emailVerificationToken.create({
      data: {
        userId,
        tokenHash: createHash('sha256').update(token).digest('hex'),
        expiresAt: new Date(Date.now() + 24 * 60 * 60_000),
      },
    });
    await this.emailVerificationDelivery.send(email, token);
  }
}
