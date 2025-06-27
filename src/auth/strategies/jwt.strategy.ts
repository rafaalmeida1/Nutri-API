import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { envConfig } from '../../config/env.config';

export interface JwtPayload {
  sub: string; // user id
  email: string;
  role: string;
  tenantId?: string;
  iat?: number;
  exp?: number;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: envConfig.jwt.secret,
    });
  }

  async validate(payload: JwtPayload) {
    // Aqui você pode adicionar validações extras como:
    // - Verificar se o usuário ainda existe
    // - Verificar se o usuário ainda está ativo
    // - Verificar se o tenant ainda está ativo
    
    return {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
      tenantId: payload.tenantId,
    };
  }
} 