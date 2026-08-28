import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserResponseDto } from './dto/user-response.dto';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

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

  async findById(id: string): Promise<UserResponseDto> {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.mapUserResponse(user);
  }

  async update(id: string, dto: UpdateUserDto): Promise<UserResponseDto> {
    if (dto.username) {
      const existing = await this.prisma.user.findFirst({
        where: {
          username: { equals: dto.username, mode: 'insensitive' },
          NOT: { id },
        },
      });

      if (existing) {
        throw new ConflictException('Username is already taken');
      }
    }

    const updated = await this.prisma.user.update({
      where: { id },
      data: {
        ...(dto.username ? { username: dto.username } : {}),
        ...(dto.avatarUrl !== undefined ? { avatarUrl: dto.avatarUrl } : {}),
      },
    });

    return this.mapUserResponse(updated);
  }

  async searchUsers(query: string, currentUserId: string): Promise<UserResponseDto[]> {
    const trimmed = (query || '').trim();

    const users = await this.prisma.user.findMany({
      where: {
        AND: [
          { id: { not: currentUserId } },
          trimmed
            ? {
                OR: [
                  { username: { contains: trimmed, mode: 'insensitive' } },
                  { email: { contains: trimmed, mode: 'insensitive' } },
                ],
              }
            : {},
        ],
      },
      orderBy: [{ isOnline: 'desc' }, { updatedAt: 'desc' }],
      take: 30,
    });

    return users.map((u) => this.mapUserResponse(u));
  }
}
