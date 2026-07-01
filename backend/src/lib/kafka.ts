import { Kafka } from "kafkajs";

const brokers = process.env.KAFKA_BROKERS ? process.env.KAFKA_BROKERS.split(",") : ["localhost:9092"];

export const kafka = new Kafka({
    clientId: "pulseops-backend",
    brokers: brokers,
    retry: {
        initialRetryTime: 300,
        retries: 5,
    },
});

export const kafkaProducer = kafka.producer();
export const kafkaConsumer = kafka.consumer({ groupId: "pulseops-backend-consumers" });

export async function connectKafka() {
    try {
        await kafkaProducer.connect();
        await kafkaConsumer.connect();
        console.log("[KAFKA] Producer and Consumer connected to broker cluster");
    } catch (err) {
        console.error("[KAFKA] Failed to connect — automatic monitor checks will not run until Kafka is reachable:", (err as Error).message);
    }
}
