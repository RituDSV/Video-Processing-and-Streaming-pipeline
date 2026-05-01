import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { KafkaProducerService } from './kafka-producer.service';

@Module({
  imports: [
    ConfigModule, // ensures ConfigService is available

    ClientsModule.registerAsync([
      {
        name: 'KAFKA_CLIENT',
        imports: [ConfigModule],           // ✅ IMPORTANT
        inject: [ConfigService],           // ✅ IMPORTANT
        useFactory: (config: ConfigService) => {
          const brokers = config.get<string>('KAFKA_BROKERS');

          if (!brokers) {
            throw new Error('KAFKA_BROKERS is not defined');
          }

          return {
            transport: Transport.KAFKA,
            options: {
              client: {
                clientId: 'video-api',
                brokers: brokers.split(','),
              },
            },
          };
        },
      },
    ]),
  ],

  providers: [KafkaProducerService],
  exports: [KafkaProducerService, ClientsModule],
})
export class KafkaModule {}