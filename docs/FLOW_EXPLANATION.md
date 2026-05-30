# Complete Project Flow Explanation

## System Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│                         ASYNC FILE ANALYZER                          │
└──────────────────────────────────────────────────────────────────────┘

┌─────────────────┐
│   React UI      │  Frontend
│  (Vite + TS)    │  - File Upload
│  Port: 5173     │  - Task Status
└────────┬────────┘  - Results
         │
         │ HTTP
         ↓
┌─────────────────┐
│   FastAPI       │  Backend
│   Port: 8000    │  - Receive Files
├─────────────────┤  - Create Tasks
│ /upload         │  - Check Status
│ /status/{id}    │
│ /health         │
└────────┬────────┘
         │
         │ AMQP
         ↓
┌─────────────────┐
│   RabbitMQ      │  Message Broker
│   Port: 5672    │  - Queue Tasks
│   UI: 15672     │  - Route to Workers (UI means http://localhost:15672 for management for viewing queues and messages)
└────────┬────────┘
         │
         │ AMQP
         ↓
┌─────────────────┐
│  Celery Worker  │  Background
│  (Python)       │  - Process Tasks
│  (Can run       │  - Analyze Files
│   multiple)     │  - Handle Errors
└────────┬────────┘
         │
         │ Redis
         ↓
┌─────────────────┐
│    Redis        │  Result Backend
│    Port: 6379   │  - Store Results
│    (In-Memory)  │  - Store Status
└────────┬────────┘
         │
         │ Query
         ↓
    FastAPI → React (Display Results)
```

## Detailed Step-by-Step Flow

### Phase 1: User Interaction (Frontend)

```
Step 1: User opens React app in browser
        ↓
        Frontend loads at http://localhost:5173
        - FileUpload component renders
        - Ready to accept .txt files
        ↓
        
Step 2: User selects a .txt file
        ↓
        FileUpload component stores file in state
        Shows: "Selected: myfile.txt"
        ↓
        
Step 3: User clicks "Analyze File" button
        ↓
        Creates FormData with the file
        Makes POST request to FastAPI
```

### Phase 2: File Upload (Frontend → Backend)

```
Step 4: HTTP POST /api/upload
        ↓
        Request: {
            multipart/form-data
            file: <binary .txt file>
        }
        ↓
        Sent to: http://localhost:8000/api/upload
        ↓
```

### Phase 3: File Reception (FastAPI)

```
Step 5: FastAPI /upload endpoint receives file
        ↓
        Code: app/routes/file_routes.py
        
        1. Validate: Is it a .txt file?
        2. Generate unique filename (id)
        3. Save file to: uploads/uploads/{uuid}_filename.txt
        4. File is now stored locally
        ↓
```

### Phase 4: Task Creation (FastAPI → RabbitMQ)

```
Step 6: FastAPI creates a Celery task
        ↓
        Code: app/services/task_service.py
        
        celery_app.send_task(
            'worker.tasks.file_tasks.analyze_file',
            args=[file_path],
            queue='default',
            routing_key='default'
        )
        ↓
        
Step 7: Task message sent to RabbitMQ
        ↓
        RabbitMQ receives the message
        Puts it in the 'default' queue
        
        Message contains:
        {
            task_id: "abc-123-def",
            task_name: "worker.tasks.file_tasks.analyze_file",
            args: ["/path/to/uploads/file.txt"]
        }
        ↓
```

### Phase 5: Task Queuing (RabbitMQ)

```
Step 8: RabbitMQ queue
        ↓
        Queue status:
        ┌──────────────────┐
        │ [Task 1]         │  ← Oldest task
        │ [Task 2]         │
        │ [Task 3] ← NEW   │  ← Newly added
        └──────────────────┘
        
        Waiting for Celery worker to pick them up
        ↓
```

### Phase 6: Response to Frontend

```
Step 9: FastAPI returns response
        ↓
        HTTP 200 OK
        Response: {
            "task_id": "abc-123-def",
            "filename": "myfile.txt"
        }
        ↓
        
Step 10: Frontend receives task_id
         ↓
         Component state updated
         TaskStatus component appears
         Shows status and polls for updates
```

### Phase 7: Celery Worker Processing

```
Step 11: Celery worker picks task from RabbitMQ
         ↓
         Worker process (running in terminal):
         
         celery -A celery_app worker --loglevel=info
         
         ↓
         Worker fetches: Task from RabbitMQ queue
         ↓
         
Step 12: Worker updates status in Redis
         ↓
         Redis now stores:
         {
             task_id: "abc-123-def",
             status: "PROCESSING",
             ...
         }
         ↓
         
Step 13: Worker executes the task
         ↓
         Code: worker/tasks/file_tasks.py
         
         Call: analyze_file(file_path)
         
         Which calls: worker/utils/analyzer.py
         
         Analysis steps:
         1. Open file: /uploads/uuid_filename.txt
         2. Read entire content
         3. Count words: len(content.split())
         4. Count lines: len(content.split('\n'))
         5. Count characters: len(content)
         
         Result:
         {
             "words": 150,
             "lines": 12,
             "characters": 890
         }
         ↓
         
Step 14: Worker stores result in Redis
         ↓
         Redis now stores:
         {
             task_id: "abc-123-def",
             status: "SUCCESS",
             result: {
                 "words": 150,
                 "lines": 12,
                 "characters": 890
             }
         }
         ↓
         
Step 15: Worker deletes uploaded file
         ↓
         File: /uploads/uuid_filename.txt
         Status: Deleted (cleanup)
```

### Phase 8: Frontend Polling

```
Step 16: Frontend continuously polls status
         ↓
         Every 1 second:
         GET http://localhost:8000/api/status/abc-123-def
         ↓
         FastAPI checks Redis
         ↓
         
Polling Timeline:
Time: 0s   → Status: PENDING (waiting for worker)
Time: 1s   → Status: PENDING (worker not started yet)
Time: 2s   → Status: PROCESSING (worker started)
Time: 3s   → Status: PROCESSING (analyzing...)
Time: 4s   → Status: SUCCESS ✓ (done!)

When SUCCESS:
Response from FastAPI:
{
    "status": "SUCCESS",
    "result": {
        "words": 150,
        "lines": 12,
        "characters": 890
    }
}
```

### Phase 9: Result Display (Frontend)

```
Step 17: Frontend receives SUCCESS status
         ↓
         Stop polling
         ↓
         
Step 18: ResultCard component displays results
         ↓
         Shows:
         ┌──────────────┐
         │ Words: 150   │  ← Blue box
         ├──────────────┤
         │ Lines: 12    │  ← Green box
         ├──────────────┤
         │ Chars: 890   │  ← Purple box
         └──────────────┘
         ↓
         
Step 19: User can analyze another file
         ↓
         Click "Analyze Another File" button
         ↓
         Back to Step 1
```

## Complete Timeline

```
Timeline:
─────────────────────────────────────────────────────────────

T=0s    │ User selects file in React
        │
        ├─ User clicks "Analyze"
        │
T=0.5s  ├─ POST /upload to FastAPI
        │ │
        ├ │─ File saved
        │ │
        └ │─ Task sent to RabbitMQ
          │
T=1s    ├─ FastAPI returns task_id
        │ │ Frontend gets task_id
        │ │
        └─ Frontend starts polling
          │
T=1.5s  ├─ Polling: GET /status (returns PENDING)
        │
T=2.5s  ├─ Celery worker picks task from queue
        │ ├─ Updates Redis: PROCESSING
        │ │
T=3s    ├─ Frontend polling: GET /status (returns PROCESSING)
        │ │
T=3.5s  ├─ Worker analyzes file
        │ │ (count words, lines, chars)
        │ │
T=4.5s  ├─ Worker stores result in Redis
        │ ├─ Deletes uploaded file
        │ │
T=5s    ├─ Frontend polling: GET /status (returns SUCCESS + result)
        │ │
        ├─ Frontend stops polling
        │
T=5.2s  ├─ Frontend displays results
        │ │ ┌──────────────┐
        │ │ │ Words: 150   │
        │ │ │ Lines: 12    │
        │ │ │ Chars: 890   │
        │ │ └──────────────┘
        │
─────────────────────────────────────────────────────────────
```

## Data Flow Summary

### What Data Goes Where

```
React Frontend:
├─ Stores: task_id, file, component state
├─ Sends: file (via multipart/form-data)
└─ Receives: task_id, status, results

FastAPI Backend:
├─ Receives: file from React
├─ Stores: file in /uploads
├─ Sends: task_id to React
├─ Sends: task to RabbitMQ
└─ Queries: Redis for status

RabbitMQ:
├─ Receives: task messages from FastAPI
├─ Queues: tasks in 'default' queue
└─ Sends: tasks to Celery worker

Celery Worker:
├─ Receives: task from RabbitMQ
├─ Reads: file from /uploads
├─ Sends: status updates to Redis
├─ Stores: result in Redis
└─ Deletes: uploaded file

Redis:
├─ Stores: task status
├─ Stores: task result
└─ Serves: status queries from FastAPI
```

## Why This Architecture?

| Component | Why |
|-----------|-----|
| React Frontend | User interface, responsive, can poll in real-time |
| FastAPI | Fast web framework, handles HTTP requests, lightweight |
| RabbitMQ | Decouples FastAPI from workers, queues tasks, reliable delivery |
| Celery | Executes tasks in background, handles failures, scalable |
| Redis | Fast result storage, in-memory access, tracks task state |

## Scaling Example

If you had 100 file analysis requests:

### Without RabbitMQ/Celery (Synchronous)
```
FastAPI receives request 1
├─ Analyzes file (5 seconds) ← BLOCKED
├─ Returns result
│
FastAPI receives request 2 (after 5 seconds)
├─ Analyzes file (5 seconds) ← BLOCKED
├─ Returns result

Total time: 100 × 5 seconds = 500 seconds (8+ minutes!)
```

### With RabbitMQ/Celery (Asynchronous)
```
FastAPI receives requests 1-100 (instantly)
├─ All 100 requests queued to RabbitMQ
├─ All return task_id immediately
│
10 Celery workers pick tasks
├─ Worker 1, 2, 3... process in parallel
├─ Complete at same time

Total time: ~5 seconds (only 5 seconds!)
```

## Error Handling

```
If a task fails:

Worker encounters error
├─ Exception raised in analyze_file()
├─ Updates Redis: status = "FAILURE"
├─ Stores: error message
│
Frontend polls and gets FAILURE
├─ Displays error message
├─ User can try again
├─ Upload another file

Redis stores failed task
├─ Can be reviewed later
├─ Helps with debugging
```

## Summary

1. **Frontend**: User uploads file, gets task_id
2. **Backend**: Receives file, creates Celery task
3. **RabbitMQ**: Queues the task
4. **Worker**: Picks task, analyzes file
5. **Redis**: Stores status and results
6. **Frontend**: Polls for status and displays results

The beauty: All happens asynchronously, no blocking, scales easily!
