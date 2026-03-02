package pool

import (
	"context"
	"sync"
	"time"
)

// Task 表示一个工作任务
type Task func() interface{}

// WorkerPool 工作池结构体
type WorkerPool struct {
	maxWorkers int
	taskQueue  chan Task
	results    chan interface{}
	wg         sync.WaitGroup
	ctx        context.Context
	cancel     context.CancelFunc
	closeOnce  sync.Once
}

// NewWorkerPool 创建一个新的工作池
func NewWorkerPool(maxWorkers int) *WorkerPool {
	ctx, cancel := context.WithCancel(context.Background())

	pool := &WorkerPool{
		maxWorkers: maxWorkers,
		taskQueue:  make(chan Task, maxWorkers*2),        // 任务队列大小为工作者数量的2倍
		results:    make(chan interface{}, maxWorkers*2), // 结果队列大小为工作者数量的2倍
		ctx:        ctx,
		cancel:     cancel,
	}

	// 启动工作者
	pool.startWorkers()

	return pool
}

// NewWorkerPoolWithContext 创建一个带有指定上下文的新工作池
func NewWorkerPoolWithContext(ctx context.Context, maxWorkers int) *WorkerPool {
	ctx, cancel := context.WithCancel(ctx)

	pool := &WorkerPool{
		maxWorkers: maxWorkers,
		taskQueue:  make(chan Task, maxWorkers*2),        // 任务队列大小为工作者数量的2倍
		results:    make(chan interface{}, maxWorkers*2), // 结果队列大小为工作者数量的2倍
		ctx:        ctx,
		cancel:     cancel,
	}

	// 启动工作者
	pool.startWorkers()

	return pool
}

// startWorkers 启动工作者协程
func (p *WorkerPool) startWorkers() {
	for i := 0; i < p.maxWorkers; i++ {
		p.wg.Add(1)
		go func() {
			defer p.wg.Done()

			for {
				select {
				case task, ok := <-p.taskQueue:
					if !ok {
						return
					}

					// 执行任务并发送结果
					result := task()
					select {
					case p.results <- result:
					case <-p.ctx.Done():
						return
					}

				case <-p.ctx.Done():
					return
				}
			}
		}()
	}
}

// Submit 提交一个任务到工作池
func (p *WorkerPool) Submit(task Task) {
	p.taskQueue <- task
}

// GetResults 获取所有任务的结果
func (p *WorkerPool) GetResults(count int) []interface{} {
	results := make([]interface{}, 0, count)

	// 收集指定数量的结果
	for len(results) < count {
		select {
		case result, ok := <-p.results:
			if !ok {
				return results
			}
			results = append(results, result)
		case <-p.ctx.Done():
			// 上下文取消后尽力回收已完成任务的结果，避免丢失可用数据
			for len(results) < count {
				select {
				case result, ok := <-p.results:
					if !ok {
						return results
					}
					results = append(results, result)
				default:
					return results
				}
			}
			return results
		}
	}

	return results
}

// Close 关闭工作池
func (p *WorkerPool) Close() {
	p.closeOnce.Do(func() {
		// 先关闭任务队列，阻止继续提交
		close(p.taskQueue)

		// 再取消上下文，唤醒可能阻塞的发送/接收
		p.cancel()

		// 等待所有工作者完成
		p.wg.Wait()

		// 最后关闭结果队列
		close(p.results)
	})
}

// ExecuteBatch 批量执行任务并返回结果
func ExecuteBatch(tasks []Task, maxWorkers int) []interface{} {
	if len(tasks) == 0 {
		return []interface{}{}
	}

	if maxWorkers <= 0 {
		maxWorkers = 1
	}

	// 如果任务数量少于工作者数量，调整工作者数量
	if len(tasks) < maxWorkers {
		maxWorkers = len(tasks)
	}

	// 创建工作池
	pool := NewWorkerPool(maxWorkers)
	defer pool.Close()

	// 提交所有任务
	for _, task := range tasks {
		pool.Submit(task)
	}

	// 获取所有结果
	return pool.GetResults(len(tasks))
}

// ExecuteBatchWithTimeout 批量执行任务，带有超时控制，并返回结果
func ExecuteBatchWithTimeout(tasks []Task, maxWorkers int, timeout time.Duration) []interface{} {
	results, _, _ := ExecuteBatchWithTimeoutDetailed(tasks, maxWorkers, timeout)
	return results
}

// ExecuteBatchWithTimeoutDetailed 批量执行任务并返回结果与超时元信息
func ExecuteBatchWithTimeoutDetailed(tasks []Task, maxWorkers int, timeout time.Duration) ([]interface{}, int, bool) {
	if len(tasks) == 0 {
		return []interface{}{}, 0, false
	}

	if maxWorkers <= 0 {
		maxWorkers = 1
	}

	// 如果任务数量少于工作者数量，调整工作者数量
	if len(tasks) < maxWorkers {
		maxWorkers = len(tasks)
	}

	// 创建带超时的上下文
	ctx, cancel := context.WithTimeout(context.Background(), timeout)
	defer cancel()

	// 创建工作池
	pool := NewWorkerPoolWithContext(ctx, maxWorkers)
	defer pool.Close()

	submittedTasks := 0

	// 提交所有任务
	for _, task := range tasks {
		select {
		case pool.taskQueue <- task:
			// 任务提交成功
			submittedTasks++
		case <-ctx.Done():
			// 超时或取消，停止提交更多任务
			return pool.GetResults(submittedTasks), submittedTasks, true
		}
	}

	// 获取所有结果，GetResults方法会处理超时情况
	results := pool.GetResults(submittedTasks)
	return results, submittedTasks, ctx.Err() != nil
}
