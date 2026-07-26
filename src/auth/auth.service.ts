import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
  constructor(private readonly jwtService: JwtService) {}

  login(userId: string) {
    return {
      accessToken: this.jwtService.sign({ sub: userId }),
      tokenType: 'Bearer',
    };
  }
}
