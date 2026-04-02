import { Logger, ValidationPipe, VersioningType } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';

/** Keep in sync with `swagger-ui-dist` in package-lock.json (vendor UI assets). */
const SWAGGER_UI_DIST_VERSION = '5.31.0';
const SWAGGER_DOCS_PATH = 'api/docs';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api');
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new LoggingInterceptor());
  app.useGlobalInterceptors(new ResponseInterceptor());

  const config = new DocumentBuilder()
    .setTitle('Finance Data Backend API')
    .setDescription('Role-based finance records and dashboard summaries')
    .setVersion('1.0.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);

  // On Vercel, requests for /api/docs/*.js|css often miss the serverless route, so
  // swagger-ui static never runs. Redirect vendor files to unpkg before Nest mounts static.
  const useSwaggerVendorCdn =
    process.env.SWAGGER_UI_CDN === 'true' || Boolean(process.env.VERCEL);
  const adapter = app.getHttpAdapter();
  if (useSwaggerVendorCdn && adapter.getType() === 'express') {
    const expressApp = adapter.getInstance() as import('express').Express;
    const cdn = `https://unpkg.com/swagger-ui-dist@${SWAGGER_UI_DIST_VERSION}`;
    const vendorFiles = [
      'swagger-ui-bundle.js',
      'swagger-ui-standalone-preset.js',
      'swagger-ui.css',
    ] as const;
    for (const file of vendorFiles) {
      expressApp.get(`/${SWAGGER_DOCS_PATH}/${file}`, (_req, res) => {
        res.redirect(302, `${cdn}/${file}`);
      });
    }
  }

  SwaggerModule.setup(SWAGGER_DOCS_PATH, app, document);

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  logger.log(`Finance backend started on port ${port}`);
  logger.log('API base URL: /api/v1');
  logger.log('Health check: /api/v1/health');
  logger.log(`Swagger docs available at /${SWAGGER_DOCS_PATH}`);
}

void bootstrap();
