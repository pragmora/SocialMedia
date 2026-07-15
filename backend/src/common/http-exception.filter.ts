import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let body: any = { error: { code: 'internal', message: 'Error interno del servidor' } };

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();
      if (typeof res === 'string') {
        body = { error: { code: 'error', message: res } };
      } else if (typeof res === 'object') {
        const r = res as any;
        body = {
          error: {
            code: r.code || 'error',
            message: r.message || exception.message,
            details: r.details || r.errors,
          },
        };
      }
    } else if (exception instanceof Error) {
      console.error('Unhandled error:', exception);
      body = { error: { code: 'internal', message: exception.message } };
    }

    response.status(status).json(body);
  }
}
