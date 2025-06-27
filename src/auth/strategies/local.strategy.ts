import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-local';
import { AuthService } from '../auth.service';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor(private authService: AuthService) {
    super({
      usernameField: 'email', // Usar email como username
      passwordField: 'password',
      passReqToCallback: true, // Permitir acesso ao req para pegar tenantSubdomain
    });
  }

  async validate(
    req: any,
    email: string,
    password: string,
  ): Promise<any> {
    const tenantSubdomain = req.body.tenantSubdomain;
    
    const user = await this.authService.validateUser(email, password, tenantSubdomain);
    
    if (!user) {
      throw new UnauthorizedException('Credenciais inválidas');
    }
    
    return user;
  }
} 