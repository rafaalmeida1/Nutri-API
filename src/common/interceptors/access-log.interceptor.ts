import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AccessLog, AccessLogDocument } from '../../logs/schemas/access-log.schema';
import { Request } from 'express';

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
    tenantId?: string;
  };
}

@Injectable()
export class AccessLogInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AccessLogInterceptor.name);

  constructor(
    @InjectModel(AccessLog.name)
    private readonly accessLogModel: Model<AccessLogDocument>,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const startTime = Date.now();

    // Captura informações da requisição
    const logData = {
      method: request.method,
      resource: request.url,
      ipAddress: this.getClientIp(request),
      userAgent: request.headers['user-agent'] || 'Unknown',
      timestamp: new Date(),
    };

    return next.handle().pipe(
      tap(async (response) => {
        // Log de sucesso
        await this.createLog({
          ...logData,
          userId: request.user?.id || 'anonymous',
          userEmail: request.user?.email || 'anonymous',
          userRole: request.user?.role || 'anonymous',
          tenantId: request.user?.tenantId,
          action: this.getActionFromMethod(request.method),
          success: true,
          metadata: {
            responseTime: Date.now() - startTime,
            statusCode: context.switchToHttp().getResponse().statusCode,
            requestBody: this.sanitizeRequestBody(request.body),
            queryParams: request.query,
          },
        });
      }),
      catchError(async (error) => {
        // Log de erro
        await this.createLog({
          ...logData,
          userId: request.user?.id || 'anonymous',
          userEmail: request.user?.email || 'anonymous',
          userRole: request.user?.role || 'anonymous',
          tenantId: request.user?.tenantId,
          action: this.getActionFromMethod(request.method),
          success: false,
          errorMessage: error.message,
          metadata: {
            responseTime: Date.now() - startTime,
            statusCode: error.status || 500,
            requestBody: this.sanitizeRequestBody(request.body),
            queryParams: request.query,
            stackTrace: error.stack,
          },
        });

        throw error; // Re-throw para não interferir no flow
      }),
    );
  }

  private async createLog(logData: any): Promise<void> {
    try {
      const log = new this.accessLogModel(logData);
      await log.save();
    } catch (error) {
      this.logger.error('Erro ao salvar log de acesso', error);
    }
  }

  private getClientIp(request: AuthenticatedRequest): string {
    return (
      request.headers['x-forwarded-for'] as string ||
      request.headers['x-real-ip'] as string ||
      request.connection?.remoteAddress ||
      request.socket?.remoteAddress ||
      'unknown'
    );
  }

  private getActionFromMethod(method: string): string {
    const actionMap = {
      GET: 'read',
      POST: 'create',
      PUT: 'update',
      PATCH: 'update',
      DELETE: 'delete',
    };
    return actionMap[method] || 'unknown';
  }

  private sanitizeRequestBody(body: any): any {
    if (!body) return undefined;

    // Remove dados sensíveis
    const sanitized = { ...body };
    if (sanitized.password) sanitized.password = '[REDACTED]';
    if (sanitized.refreshToken) sanitized.refreshToken = '[REDACTED]';
    if (sanitized.accessToken) sanitized.accessToken = '[REDACTED]';

    return sanitized;
  }
} 