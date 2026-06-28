import { kafkaConsumer } from "../../lib/kafka";

export async function startMetricsConsumer() {
  try {
    await kafkaConsumer.subscribe({
      topic: process.env.KAFKA_METRICS_TOPIC!,
      fromBeginning: false,
    });

    console.log("[METRICS CONSUMER] Listening for telemetry results from Go ping engine");

    kafkaConsumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        try {
          const payload = JSON.parse(message.value!.toString());
          console.log("[METRICS CONSUMER] Received telemetry:", payload);
        } catch (error) {
          console.error("[METRICS CONSUMER] Failed to process telemetry message:", error);
        }
      },
    });
  } catch (err) {
    console.error("[METRICS CONSUMER] Not available — Kafka not connected:", (err as Error).message);
  }
}
