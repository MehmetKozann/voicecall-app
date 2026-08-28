import { IsNotEmpty, IsString } from 'class-validator';

export class LoginDto {
  @IsString({ message: 'Identifier (email or username) must be a string' })
  @IsNotEmpty({ message: 'Identifier (email or username) is required' })
  identifier: string;

  @IsString({ message: 'Password must be a string' })
  @IsNotEmpty({ message: 'Password is required' })
  password: string;
}
