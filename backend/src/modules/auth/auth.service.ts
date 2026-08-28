import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import * as crypto from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { AuthResponseDto, TokenPairDto, UserResponseDto } from '../users/dto/user-response.dto';
import { JwtPayload } from '../../common/interfaces/jwt-payload.interface';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  /**
   * Hash plain-text using SHA-256 for refresh tokens
   */
  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  /**
   * Format user entity into safe UserResponseDto
   */
  private mapUserResponse(user: any): UserResponseDto {
    return {
      id: user.id,
      email: user.email,
      username: user.username,
      avatarUrl: user.avatarUrl,
      isOnline: user.isOnline,
      lastSeen: user.lastSeen,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  /**
   * Generate Access and Refresh token pair with DB persistence
   */
  private async generateTokens(user: { id: string; email: string; username: string }): Promise<TokenPairDto> {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      username: user.username,
    };

    const accessToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('jwt.accessSecret'),
      expiresIn: this.configService.get<string>('jwt.accessExpiration'),
    });

    const rawRefreshToken = crypto.randomBytes(40).toString('hex');
    const tokenHash = this.hashToken(rawRefreshToken);

    const refreshDays = parseInt(this.configService.get<string>('jwt.refreshExpiration') || '30', 10) || 30;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + refreshDays);

    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt,
      },
    });

    return {
      accessToken,
      refreshToken: rawRefreshToken,
    };
  }

  /**
   * Register a new user
   */
  async register(dto: RegisterDto): Promise<AuthResponseDto> {
    const normalizedEmail = dto.email.toLowerCase().trim();
    const normalizedUsername = dto.username.trim();

    // Check existing email or username
    const existing = await this.prisma.user.findFirst({
      where: {
        OR: [
          { email: normalizedEmail },
          { username: { equals: normalizedUsername, mode: 'insensitive' } },
        ],
      },
    });

    if (existing) {
      if (existing.email === normalizedEmail) {
        throw new ConflictException('A user with this email already exists');
      }
      throw new ConflictException('This username is already taken');
    }

    // Hash password with Argon2
    const passwordHash = await argon2.hash(dto.password, {
      type: argon2.argon2id,
      memoryCost: 2 ** 16, // 64 MB
      timeCost: 3,
      parallelism: 2,
    });

    const user = await this.prisma.user.create({
      data: {
        email: normalizedEmail,
        username: normalizedUsername,
        passwordHash,
      },
    });

    const tokens = await this.generateTokens(user);

    return {
      user: this.mapUserResponse(user),
      tokens,
    };
  }

  /**
   * Quick Name-Only Login (creates user if not exists, or logs in existing user)
   */
  async quickLogin(username: string): Promise<AuthResponseDto> {
    const cleanUsername = username.trim();
    if (!cleanUsername) {
      throw new BadRequestException('Username is required');
    }

    let user = await this.prisma.user.findFirst({
      where: {
        username: { equals: cleanUsername, mode: 'insensitive' },
      },
    });

    if (!user) {
      const email = `${cleanUsername.toLowerCase().replace(/[^a-z0-9_]/g, '')}_${Date.now()}@voicecall.local`;
      const passwordHash = await argon2.hash('QuickDefaultPass123!', {
        type: argon2.argon2id,
      });

      user = await this.prisma.user.create({
        data: {
          username: cleanUsername,
          email,
          passwordHash,
        },
      });
    }

    const tokens = await this.generateTokens(user);

    return {
      user: this.mapUserResponse(user),
      tokens,
    };
  }

  /**
   * Login with email or username + password
   */
  async login(dto: LoginDto): Promise<AuthResponseDto> {
    const identifier = dto.identifier.trim();

    const user = await this.prisma.user.findFirst({
      where: {
        OR: [
          { email: identifier.toLowerCase() },
          { username: { equals: identifier, mode: 'insensitive' } },
        ],
      },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await argon2.verify(user.passwordHash, dto.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const tokens = await this.generateTokens(user);

    return {
      user: this.mapUserResponse(user),
      tokens,
    };
  }

  /**
   * Refresh Token with rotation and reuse prevention
   */
  async refresh(dto: RefreshTokenDto): Promise<TokenPairDto> {
    const tokenHash = this.hashToken(dto.refreshToken);

    const savedToken = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!savedToken) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    if (savedToken.expiresAt < new Date()) {
      await this.prisma.refreshToken.delete({ where: { id: savedToken.id } });
      throw new UnauthorizedException('Refresh token has expired, please log in again');
    }

    // Invalidate the used refresh token immediately (Rotation)
    await this.prisma.refreshToken.delete({
      where: { id: savedToken.id },
    });

    // Generate new token pair
    return this.generateTokens(savedToken.user);
  }

  /**
   * Logout user by invalidating the refresh token
   */
  async logout(dto: RefreshTokenDto): Promise<{ success: boolean }> {
    const tokenHash = this.hashToken(dto.refreshToken);

    await this.prisma.refreshToken.deleteMany({
      where: { tokenHash },
    });

    return { success: true };
  }
}
