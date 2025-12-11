import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

export function setupSwagger(app: INestApplication) {
  const config = new DocumentBuilder()
    .setTitle('PayVault Wallet Service')
    .setDescription('API documentation for authentication, wallet, payments.')
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'JWT Token from Google Login',
      },
      'jwt-auth',
    )
    .build();

  const doc = SwaggerModule.createDocument(app, config);

  SwaggerModule.setup('docs', app, doc, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });
}
