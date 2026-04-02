import {
  CallHandler,
  ExecutionContext,
  HttpException,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Request, Response } from 'express';
import { Observable, catchError, tap, throwError } from 'rxjs';
import { REQUEST_ID_HEADER } from '../constants/request-id.constant';

type RequestWithId = Request & { requestId?: string };

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const httpContext = context.switchToHttp();
    const request = httpContext.getRequest<RequestWithId>();
    const response = httpContext.getResponse<Response>();

    const startedAt = Date.now();
    const requestId =
      (request.header(REQUEST_ID_HEADER) ?? '').trim() || randomUUID();

    request.requestId = requestId;
    response.setHeader(REQUEST_ID_HEADER, requestId);

    const logContext = `${request.method} ${request.originalUrl || request.url}`;
    this.logger.log(`Incoming request [${requestId}] ${logContext}`);

    return next.handle().pipe(
      tap(() => {
        const durationMs = Date.now() - startedAt;
        this.logger.log(
          `Completed request [${requestId}] ${logContext} ${response.statusCode} ${durationMs}ms`,
        );
      }),
      catchError((error: unknown) => {
        const durationMs = Date.now() - startedAt;
        const statusCode =
          error instanceof HttpException
            ? error.getStatus()
            : response.statusCode >= 400
              ? response.statusCode
              : 500;
        this.logger.error(
          `Failed request [${requestId}] ${logContext} ${statusCode} ${durationMs}ms`,
        );

        return throwError(() => error);
      }),
    );
  }
}
