export class UserResponseDto {
  id: string;
  email: string;
  username: string;
  avatarUrl: string | null;
  isOnline: boolean;
  lastSeen: Date;
  createdAt: Date;
  updatedAt: Date;
}

export class AuthResponseDto {
  user: UserResponseDto;
  tokens: {
    accessToken: string;
    refreshToken: string;
  };
}

export class TokenPairDto {
  accessToken: string;
  refreshToken: string;
}
