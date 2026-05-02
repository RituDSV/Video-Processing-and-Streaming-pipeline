import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule,

    ClientsModule.registerAsync([
      {
        name: 'KAFKA_CLIENT',
        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: (config: ConfigService) => {
          const brokers = config.get<string>('KAFKA_BROKERS');

          if (!brokers) {
            throw new Error('KAFKA_BROKERS is not defined');
          }

          return {
            transport: Transport.KAFKA,
            options: {
              client: {
                clientId: 'video-worker',
                brokers: brokers.split(','),
              },
            },
          };
        },
      },
    ]),
  ],

  // ✅ EXPORT THE MODULE, NOT THE TOKEN
  exports: [ClientsModule],
})
export class KafkaModule {}