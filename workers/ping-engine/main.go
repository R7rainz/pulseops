package main

import (
	"context"
	"encoding/json"
	"os"
	"os/signal"
	"strconv"
	"strings"
	"syscall"
	"time"

	"pulseops/ping-engine/engine"

	"github.com/joho/godotenv"
	"github.com/segmentio/kafka-go"
	"go.uber.org/zap"
)

// How long to wait for in-flight checks to finish and their results to reach
// Kafka before giving up and exiting anyway.
const shutdownTimeout = 30 * time.Second

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
		// Synchronous writes so a result is durable before we consider it sent.
		// With Async:true, Close() could return while messages were still
		// buffered, silently dropping the tail on every deploy.
		Async: false,
	}

	// Signals the metrics publisher has finished flushing every result.
	publisherDone := make(chan struct{})

	go func() {
		defer close(publisherDone)

		// Ranges until Drain() closes ResultChan. Deliberately uses a
		// background context, not ctx: on shutdown we still want the already
		// collected results written out rather than cancelled.
		for result := range dispatcher.ResultChan {
			payload, err := json.Marshal(result)
			if err != nil {
				sugar.Errorf("Failed to marshal metrics payload: %v", err)
				continue
			}

			writeCtx, writeCancel := context.WithTimeout(context.Background(), 10*time.Second)
			err = writer.WriteMessages(writeCtx, kafka.Message{
				Key:   []byte(strconv.Itoa(result.WorkspaceID)),
				Value: payload,
			})
			writeCancel()
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

	// Signals the target consumer loop has exited and will not send on
	// TargetChan again — required before Drain() may close it.
	consumerDone := make(chan struct{})

	go func() {
		defer close(consumerDone)
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

			select {
			case dispatcher.TargetChan <- target:
			case <-ctx.Done():
				return
			}
		}
	}()

	signChan := make(chan os.Signal, 1)
	signal.Notify(signChan, syscall.SIGINT, syscall.SIGTERM)
	<-signChan

	sugar.Info("Shutdown signal intercepted. Draining remaining workers and flushing buffers...")

	// Ordered shutdown, bounded by a deadline so a wedged check can't hang the
	// process forever:
	//   1. cancel ctx    -> the target consumer stops reading and exits
	//   2. Drain()       -> closes TargetChan, waits for in-flight checks,
	//                       then closes ResultChan
	//   3. publisherDone -> every collected result has been written to Kafka
	//   4. close writer/reader
	shutdownComplete := make(chan struct{})
	go func() {
		defer close(shutdownComplete)
		cancel()
		<-consumerDone
		dispatcher.Drain()
		<-publisherDone
	}()

	select {
	case <-shutdownComplete:
		sugar.Info("Drain complete — all in-flight checks reported.")
	case <-time.After(shutdownTimeout):
		sugar.Warn("Drain timed out; exiting with checks still in flight.")
	}

	if err := writer.Close(); err != nil {
		sugar.Errorf("Error closing Kafka writer: %v", err)
	}
	if err := reader.Close(); err != nil {
		sugar.Errorf("Error closing Kafka reader: %v", err)
	}

	sugar.Info("Ping engine shut down cleanly.")
}
