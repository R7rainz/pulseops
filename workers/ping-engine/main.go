package main

import (
	"context"
	"encoding/json"
	"os"
	"os/signal"
	"strconv"
	"strings"
	"syscall"

	"pulseops/ping-engine/engine"

	"github.com/joho/godotenv"
	"github.com/segmentio/kafka-go"
	"go.uber.org/zap"
)

func main() {
	logger, _ := zap.NewDevelopment()
	defer logger.Sync()
	sugar := logger.Sugar()

	_ = godotenv.Load()

	brokers := strings.Split(os.Getenv("KAFKA_BROKERS"), ",")
	targetsTopic := os.Getenv("KAFKA_TARGETS_TOPIC")
	metricsTopic := os.Getenv("KAFKA_METRICS_TOPIC")
	groupID := os.Getenv("KAFKA_CONSUMER_GROUP")

	workersCfg := os.Getenv("CONCURRENT_WORKERS")
	workerCount, err := strconv.Atoi(workersCfg)
	if err != nil || workerCount <= 0 {
		workerCount = 20
	}

	dispatcher := engine.NewDispatcher(workerCount, sugar)
	dispatcher.Run()

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	writer := &kafka.Writer{
		Addr:         kafka.TCP(brokers...),
		Topic:        metricsTopic,
		Balancer:     &kafka.LeastBytes{},
		RequiredAcks: kafka.RequireOne,
		Async:        true,
	}

	defer writer.Close()

	go func() {
		for result := range dispatcher.ResultChan {
			payload, err := json.Marshal(result)
			if err != nil {
				sugar.Errorf("Failed to marshal metrics payload: %v", err)
				continue
			}

			err = writer.WriteMessages(ctx, kafka.Message{
				Key:   []byte(strconv.Itoa(result.WorkspaceID)),
				Value: payload,
			})
			if err != nil {
				sugar.Errorf("Failed to push telemetry to Kafka firehouse: %v", err)
			} else {
				sugar.Debugf("[KAFKA PRODUCER] Streamed metrics for Target %d", result.TargetID)
			}
		}
	}()

	reader := kafka.NewReader(kafka.ReaderConfig{
		Brokers:  brokers,
		GroupID:  groupID,
		Topic:    targetsTopic,
		MinBytes: 10,
		MaxBytes: 10e6,
	})
	defer reader.Close()

	go func() {
		sugar.Infof("Kafka consumer streaming targets from topic : %s", targetsTopic)

		for {
			msg, err := reader.ReadMessage(ctx)
			if err != nil {
				if ctx.Err() != nil {
					return
				}
				sugar.Errorf("Error reading target from Kafka stream: %v", err)
				continue
			}

			var target engine.Target
			if err := json.Unmarshal(msg.Value, &target); err != nil {
				sugar.Errorf("Corrupted payload dropped from stream : %v", err)
				continue
			}
			dispatcher.TargetChan <- target
		}
	}()

	signChan := make(chan os.Signal, 1)
	signal.Notify(signChan, syscall.SIGINT, syscall.SIGTERM)
	<-signChan

	sugar.Info("Shutdown signal intercepted. Draining remaining workers and flushing buffers...")
	cancel()
}
