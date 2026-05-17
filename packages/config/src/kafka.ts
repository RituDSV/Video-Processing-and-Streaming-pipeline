import { KafkaOptions, Transport } from '@nestjs/microservices';

export function createKafkaOptions(params: {
  clientId: string;
  groupId: string;
}): KafkaOptions {
  return {
    transport: Transport.KAFKA,
    options: {
      client: {
        clientId: params.clientId,
        brokers: process.env.KAFKA_BROKERS!.split(','),
        retry: {
          retries: 10,
          initialRetryTime: 3000,
        },
      },
      consumer: {
        groupId: params.groupId,
      },
    },
  };
}