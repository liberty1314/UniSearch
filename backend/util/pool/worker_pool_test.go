package pool

import (
	"testing"
	"time"
)

func TestExecuteBatchWithTimeout_DoesNotDeadlockOnTimeout(t *testing.T) {
	tasks := make([]Task, 0, 5000)
	for i := 0; i < 5000; i++ {
		tasks = append(tasks, func() interface{} {
			return i
		})
	}

	done := make(chan []interface{}, 1)
	start := time.Now()

	go func() {
		done <- ExecuteBatchWithTimeout(tasks, 50, 2*time.Millisecond)
	}()

	select {
	case results := <-done:
		if len(results) > len(tasks) {
			t.Fatalf("unexpected results length: got=%d want<=%d", len(results), len(tasks))
		}
		if elapsed := time.Since(start); elapsed > 2*time.Second {
			t.Fatalf("ExecuteBatchWithTimeout returned too slow: %s", elapsed)
		}
	case <-time.After(3 * time.Second):
		t.Fatal("ExecuteBatchWithTimeout blocked on timeout path")
	}
}
