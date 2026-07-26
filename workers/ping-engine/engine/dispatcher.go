package engine

import (
	"sync"

	"go.uber.org/zap"
)

type Dispatcher struct {
	WorkerCount int
	TargetChan  chan Target
	ResultChan  chan Result
	Log         *zap.SugaredLogger
	wg          sync.WaitGroup
}

func NewDispatcher(workerCount int, log *zap.SugaredLogger) *Dispatcher {
	return &Dispatcher{
		WorkerCount: workerCount,
		TargetChan:  make(chan Target, 1000),
		ResultChan:  make(chan Result, 1000),
		Log:         log,
	}
}

func (d *Dispatcher) Run() {
	d.Log.Infof("Spawning worker pool with %d concurrent goroutines", d.WorkerCount)

	for i := 1; i <= d.WorkerCount; i++ {
		d.wg.Add(1)
		go func(workerID int) {
			defer d.wg.Done()
			StartWorker(workerID, d.TargetChan, d.ResultChan, d.Log)
		}(i)
	}
}

// Drain stops accepting new targets and blocks until every in-flight check has
// finished and its result has been handed to ResultChan, which it then closes
// so the metrics publisher can finish and exit.
//
// Without this, shutdown cancelled the context immediately and dropped both
// in-flight checks and anything still buffered in the async Kafka writer.
func (d *Dispatcher) Drain() {
	close(d.TargetChan)
	d.wg.Wait()
	close(d.ResultChan)
}
