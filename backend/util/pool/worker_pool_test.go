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

func TestExecuteBatchWithTimeout_ReturnsWhenRunningTaskIgnoresTimeout(t *testing.T) {
	blockingTaskStarted := make(chan struct{})
	releaseBlockingTask := make(chan struct{})
	defer close(releaseBlockingTask)

	tasks := []Task{
		func() interface{} {
			close(blockingTaskStarted)
			<-releaseBlockingTask
			return "late"
		},
	}

	done := make(chan []interface{}, 1)
	start := time.Now()

	go func() {
		done <- ExecuteBatchWithTimeout(tasks, 1, 20*time.Millisecond)
	}()

	select {
	case <-blockingTaskStarted:
	case <-time.After(500 * time.Millisecond):
		t.Fatal("阻塞任务没有按预期启动")
	}

	select {
	case results := <-done:
		if len(results) != 0 {
			t.Fatalf("超时后不应等待阻塞任务结果，实际返回 %d 个结果", len(results))
		}
		if elapsed := time.Since(start); elapsed > 300*time.Millisecond {
			t.Fatalf("超时返回过慢: %s", elapsed)
		}
	case <-time.After(500 * time.Millisecond):
		t.Fatal("运行中的任务忽略取消时，批处理仍被阻塞")
	}
}

func TestExecuteBatchWithTimeoutDetailed_ReturnsPartialResultsWhenTaskIgnoresTimeout(t *testing.T) {
	blockingTaskStarted := make(chan struct{})
	releaseBlockingTask := make(chan struct{})
	defer close(releaseBlockingTask)

	tasks := []Task{
		func() interface{} {
			return "ready"
		},
		func() interface{} {
			close(blockingTaskStarted)
			<-releaseBlockingTask
			return "late"
		},
	}

	type outcome struct {
		results        []interface{}
		submittedTasks int
		timedOut       bool
	}

	done := make(chan outcome, 1)
	start := time.Now()

	go func() {
		results, submittedTasks, timedOut := ExecuteBatchWithTimeoutDetailed(tasks, 2, 80*time.Millisecond)
		done <- outcome{
			results:        results,
			submittedTasks: submittedTasks,
			timedOut:       timedOut,
		}
	}()

	select {
	case <-blockingTaskStarted:
	case <-time.After(500 * time.Millisecond):
		t.Fatal("阻塞任务没有按预期启动")
	}

	select {
	case got := <-done:
		if !got.timedOut {
			t.Fatal("期望 detailed 返回超时标记")
		}
		if got.submittedTasks != 2 {
			t.Fatalf("期望提交 2 个任务，实际提交 %d 个", got.submittedTasks)
		}
		if len(got.results) != 1 || got.results[0] != "ready" {
			t.Fatalf("期望保留超时前的部分结果，实际为 %#v", got.results)
		}
		if elapsed := time.Since(start); elapsed > 300*time.Millisecond {
			t.Fatalf("detailed 超时返回过慢: %s", elapsed)
		}
	case <-time.After(500 * time.Millisecond):
		t.Fatal("detailed 路径在任务忽略取消时仍被阻塞")
	}
}
