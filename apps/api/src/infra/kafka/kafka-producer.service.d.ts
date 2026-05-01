import { OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ClientKafka } from '@nestjs/microservices';
export declare class KafkaProducerService implements OnModuleInit, OnModuleDestroy {
    private readonly kafka;
    constructor(kafka: ClientKafka);
    onModuleInit(): Promise<void>;
    emit<T>(topic: string, payload: T): Promise<void>;
    onModuleDestroy(): Promise<void>;
}
