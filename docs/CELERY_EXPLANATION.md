# Celery Explanation

## What is Celery?

Celery is a **Distributed Task Queue** library for Python. It allows you to execute functions asynchronously and schedule them to run on one or more worker nodes.

**Think of Celery like delegating work:**
- Boss (FastAPI): "I need you to analyze this file"
- Employee (Celery Worker): "I'll do it in the background"
- Boss continues doing other things

## Key Concepts

### Task
A Python function that you want to run asynchronously. In this project:
```python
@celery_app.task
def analyze_file_task(file_path):
    # Runs in the background
    return result
```

### Worker
A process that executes tasks. It:
- Connects to the message broker (RabbitMQ)
- Waits for tasks
- Executes them
- Stores results in the result backend (Redis)

### Broker
The message queue service. In this project: **RabbitMQ**

### Result Backend
Where task results are stored. In this project: **Redis**

## Why Celery is Used in This Project

1. **Non-Blocking**: FastAPI doesn't wait for file analysis
2. **Background Processing**: Heavy work happens separately
3. **Scalability**: Can add more workers to process more tasks
4. **Reliability**: Tasks are retried if they fail

## Real-World Analogy

**Think of Celery like a restaurant:**

```
Customer (Frontend)    Waiter (FastAPI)      Kitchen (Celery Worker)
    │                        │                        │
    │─ "I want food" ───────→│                        │
    │                        │─ "Cook this!" ───────→│
    │  (get receipt)         │← (receipt with #)     │ Cooking...
    │  "Order #123"          │                        │ (background)
    │                        │                        │
    │  (can check status)    │                        │
    │─ "Status of #123?" ──→│─ "Check kitchen" ───→│
    │                        │← "Still cooking"      │
    │                        │                        │
    │  (later)               │                        │
    │─ "Status of #123?" ──→│─ "Check kitchen" ───→│
    │  (food ready!)         │← "DONE!"              │
```

## Task States in Celery

Tasks have different states as they progress:

```
PENDING  → PROCESSING → SUCCESS
         ↘               ↗
           FAILURE/RETRY
```

### Detailed States

| State | Meaning |
|-------|---------|
| PENDING | Task queued, waiting for worker |
| STARTED | Worker started processing |
| PROGRESS | Task is executing |
| SUCCESS | Task completed successfully |
| FAILURE | Task failed |
| RETRY | Task failed but will retry |
| REVOKED | Task was cancelled |

## How Celery Works in This Project

### Step 1: Task Definition
```python
@celery_app.task
def analyze_file_task(file_path):
    # This can run in background
    return analyze_file(file_path)
```

### Step 2: Task Sending (FastAPI)
```python
task = celery_app.send_task(
    'worker.tasks.file_tasks.analyze_file',
    args=[file_path],
    queue='default'
)
return {'task_id': task.id}
```

### Step 3: Task Queuing (RabbitMQ)
```
RabbitMQ Queue:
[Task #1, Task #2, Task #3, ...]
```

### Step 4: Worker Processing
```python
# Worker picks up task from queue
@celery.task
def analyze_file_task(file_path):
    result = analyze_file(file_path)
    return result
    # Result stored in Redis automatically
```

### Step 5: Result Storage (Redis)
```
Redis:
task:id → {
    status: "SUCCESS",
    result: {words: 120, lines: 10, characters: 600}
}
```

### Step 6: Frontend Retrieval
```python
# FastAPI checks Redis
result = celery_app.AsyncResult(task_id).result
return result  # Frontend displays it
```

## Complete Request Flow

```
┌─────────────────────────────────────────────────────────────┐
│ 1. User uploads file in React                              │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. FastAPI receives file in /upload endpoint               │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. FastAPI saves file locally                              │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 4. FastAPI sends task to RabbitMQ                          │
│    celery_app.send_task('analyze_file', args=[path])       │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 5. FastAPI returns task_id to frontend (immediately!)      │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 6. Frontend starts polling /status/{task_id}               │
└─────────────────────────────────────────────────────────────┘
                            ↓
                  [Meanwhile in background...]
┌─────────────────────────────────────────────────────────────┐
│ 7. Celery worker picks task from RabbitMQ                  │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 8. Worker updates status to PROCESSING in Redis            │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 9. Worker calls analyze_file(file_path)                    │
│    - Counts words                                           │
│    - Counts lines                                           │
│    - Counts characters                                      │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 10. Worker stores result in Redis with SUCCESS status      │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 11. Frontend polls and gets SUCCESS status                 │
│     and sees results!                                       │
└─────────────────────────────────────────────────────────────┘
```

## Starting a Celery Worker

```bash
# Navigate to worker directory
cd worker

# Install dependencies
pip install -r requirements.txt

# Start the worker
# It will connect to RabbitMQ and wait for tasks
celery -A celery_app worker --loglevel=info --queues=default
```

The worker will print something like:
```
[*] Connected to amqp://guest:guest@localhost:5672//
[*] mingle: initial lineup (1 workers)
[*] Waiting for tasks...
```

## Configuration in celery_app.py

```python
celery_app = Celery(
    'file_analyzer',
    broker=RABBITMQ_URL,      # Where to get tasks
    backend=REDIS_URL,         # Where to store results
)

celery_app.conf.update(
    task_serializer='json',   # Use JSON format
    task_time_limit=30 * 60,  # Max 30 minutes per task
    task_soft_time_limit=25 * 60,  # Warn at 25 minutes
)
```

## Task Decorators and Options

```python
@celery_app.task(
    name='unique.task.name',    # Unique identifier
    bind=True,                  # Pass task instance (self)
    time_limit=600,             # Kill if > 600 seconds
    soft_time_limit=500,        # Warn at 500 seconds
    retry_policy={
        'max_retries': 3,       # Try up to 3 times
        'interval_start': 0,    # First retry immediately
        'interval_step': 0.2,   # Exponential backoff
        'interval_max': 0.2,    # Max interval
    }
)
def my_task(self, arg):
    # self.update_state() - update progress
    # self.retry() - retry on failure
    pass
```

## Advantages

✅ Asynchronous task execution
✅ Scales horizontally (add more workers)
✅ Task retries on failure
✅ Progress tracking
✅ Works with many message brokers
✅ Works with many result backends

## Disadvantages

❌ More moving parts (complexity)
❌ Debugging is harder (distributed)
❌ Requires message broker and result backend
❌ Network latency between components

## Multiple Workers & Queuing

### In Real Projects

**NO artificial delay needed!** The actual work takes time naturally:
- Parse large file: 2-5 seconds
- Process data: varies
- Database queries: varies
- Machine learning: minutes/hours

Example:
```
File 1 (10 MB) → 30 seconds naturally
File 2 (5 MB) → 15 seconds naturally
```

### RabbitMQ Queuing with Multiple Workers

RabbitMQ handles queuing automatically:

**Scenario 1: 1 Worker, Multiple Files (Our Scenario for this project)**
```
Upload File 1 → RabbitMQ queue → Worker 1 processes
Upload File 2 → RabbitMQ queue → (waits if Worker 1 busy)
Upload File 3 → RabbitMQ queue → (waits)

Timeline:
- File 1: 0-15 seconds (processing)
- File 2: 15-30 seconds (waiting, then processing)
- File 3: 30-45 seconds (waiting, then processing)
```

**Scenario 2: 3 Workers, Multiple Files**
```
Upload File 1 → RabbitMQ → Worker 1 processes
Upload File 2 → RabbitMQ → Worker 2 processes
Upload File 3 → RabbitMQ → Worker 3 processes
(All process in parallel!)

Timeline:
- File 1, 2, 3: All complete in ~15 seconds
```

### How to Run Multiple Workers

**Terminal 1: Worker**
```bash
celery -A celery_app worker --loglevel=info --pool=solo
```

**Terminal 2: Worker (second instance)**
```bash
celery -A celery_app worker --loglevel=info --pool=solo
```

**Terminal 3: Worker (third instance)**
```bash
celery -A celery_app worker --loglevel=info --pool=solo
```

Now you have **3 workers**! Upload 3 files simultaneously and watch them all process in parallel.

### Comparison Table

| Scenario | Workers | Files | Total Time |
|----------|---------|-------|-----------|
| Sequential | 1 | 10 | ~150 sec |
| Parallel (3 workers) | 3 | 10 | ~50 sec |
| Parallel (10 workers) | 10 | 10 | ~15 sec |

### Production Scaling

In Docker/Production:
```yaml
services:
  worker:
    image: celery-worker
    deploy:
      replicas: 5  # 5 workers automatically!
    environment:
      - CELERY_BROKER_URL=amqp://guest:guest@rabbitmq:5672//
      - CELERY_RESULT_BACKEND=redis://redis:6379/0
```

This starts 5 workers that all pick tasks from the same RabbitMQ queue automatically!

## Summary

Celery is the **"worker"** in your application:
- Takes tasks from RabbitMQ
- Executes them in the background
- Stores results in Redis
- Multiple workers can work in parallel
- Scales your application
