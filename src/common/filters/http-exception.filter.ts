import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const isHttpException = exception instanceof HttpException;
    const prismaCode = this.getPrismaErrorCode(exception);
    const isPrismaKnown = typeof prismaCode === 'string';
    const statusCode = isHttpException
      ? exception.getStatus()
      : isPrismaKnown
        ? this.getPrismaStatusCode(prismaCode)
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const exceptionResponse = isHttpException
      ? exception.getResponse()
      : {
          message: isPrismaKnown
            ? this.getPrismaMessage(prismaCode)
            : 'Internal server error',
        };

    const message =
      typeof exceptionResponse === 'string'
        ? exceptionResponse
        : (exceptionResponse as { message?: string | string[] }).message;

    const payload = {
      success: false,
      statusCode,
      message,
      path: request.url,
      timestamp: new Date().toISOString(),
    };

    const prismaMeta = this.getPrismaMeta(exception);
    this.logger.error(
      `HTTP ${statusCode} ${request.method} ${request.url} - ${Array.isArray(message) ? message.join(', ') : message}${prismaCode ? ` | prismaCode=${prismaCode}` : ''}${prismaMeta ? ` | prismaMeta=${prismaMeta}` : ''}`,
    );

    response.status(statusCode).json(payload);
  }

  private getPrismaStatusCode(code: string | undefined): HttpStatus {
    if (code === 'P2002') {
      return HttpStatus.CONFLICT;
    }

    if (code === 'P2023') {
      return HttpStatus.BAD_REQUEST;
    }

    return HttpStatus.BAD_REQUEST;
  }

  private getPrismaMessage(code: string | undefined): string {
    if (code === 'P2002') {
      return 'Unique constraint failed.';
    }

    if (code === 'P2023') {
      return 'Invalid identifier format.';
    }

    return 'Database request failed.';
  }

  private getPrismaErrorCode(exception: unknown): string | undefined {
    if (
      typeof exception === 'object' &&
      exception !== null &&
      'code' in exception &&
      typeof exception.code === 'string' &&
      'name' in exception &&
      exception.name === 'PrismaClientKnownRequestError'
    ) {
      return exception.code;
    }

    return undefined;
  }

  private getPrismaMeta(exception: unknown): string | undefined {
    if (
      typeof exception === 'object' &&
      exception !== null &&
      'meta' in exception
    ) {
      try {
        return JSON.stringify(exception.meta);
      } catch {
        return 'unserializable-meta';
      }
    }

    return undefined;
  }
}
