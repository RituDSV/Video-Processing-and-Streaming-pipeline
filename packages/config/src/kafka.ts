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
      },
      consumer: {
        groupId: params.groupId,
      },
    },
  };
}