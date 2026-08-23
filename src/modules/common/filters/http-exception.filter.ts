import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response, Request } from 'express';
import { StructuredLoggerService } from '../logger/structured-logger.service';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new StructuredLoggerService(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | object = 'Internal server error';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();
      message = typeof res === 'object' ? res : { message: res };
    } else if (exception instanceof Error) {
      message = { message: exception.message };
    }

    if (status >= 500) {
      this.logger.error(`HTTP ${status} on ${request.method} ${request.url}`, exception instanceof Error ? exception.stack : undefined);
    } else if (status === 404) {
      this.logger.debug(`HTTP 404 Not Found: ${request.method} ${request.url}`);
    } else {
      this.logger.warn(`HTTP ${status} on ${request.method} ${request.url}`);
    }

    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      error: message,
    });
  }
}
