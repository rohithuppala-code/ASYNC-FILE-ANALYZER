# Async File Analyzer

A beginner-friendly full-stack project demonstrating asynchronous file processing using **React**, **FastAPI**, **RabbitMQ**, **Celery**, and **Redis**.

This project teaches you how background task processing works in real applications.

## 🎯 Project Overview

The application allows users to:
1. Upload a `.txt` file from the web interface
2. Analyze it asynchronously in the background
3. Track task progress in real-time
4. View analysis results (word count, line count, character count)

## 🏗️ Architecture

```
React Frontend (localhost:5173)
    ↓ (HTTP)
FastAPI Backend (localhost:8000)
    ↓ (AMQP Advanced Message Queuing Protocol for sending messages between FastAPI and Celery)
RabbitMQ Message Broker (localhost:5672)
    ↓ (AMQP)
Celery Worker
    ↓ (Redis protocol for storing results)
Redis Result Backend (localhost:6379)
    ↑
    └─ Stores task status and results
```

## 📁 Project Structure

```
Async File Analyzer/
├── frontend/                  # React + Vite + Tailwind CSS
│   ├── src/
│   │   ├── components/
│   │   │   ├── FileUpload.jsx
│   │   │   ├── TaskStatus.jsx
│   │   │   └── ResultCard.jsx
│   │   ├── services/
│   │   │   └── api.js
│   │   └── App.jsx
│   └── package.json
│
├── backend/                   # FastAPI
│   ├── app/
│   │   ├── routes/
│   │   │   └── file_routes.py
│   │   ├── services/
│   │   │   └── task_service.py
│   │   ├── config.py
│   │   └── main.py
│   ├── requirements.txt
│   └── .env
│
├── worker/                    # Celery Worker
│   ├── tasks/
│   │   └── file_tasks.py
│   ├── utils/
│   │   └── analyzer.py
│   ├── celery_app.py
│   ├── requirements.txt
│   └── .env
│
├── docs/                      # Educational documentation
│   ├── REDIS_EXPLANATION.md
│   ├── RABBITMQ_EXPLANATION.md
│   ├── CELERY_EXPLANATION.md
│   └── FLOW_EXPLANATION.md
│
└── docker-compose.yml         # Docker services
```

## 🚀 Quick Start

### Prerequisites

- Docker and Docker Compose
- Node.js 16+ (for frontend)
- Python 3.8+ (for backend and worker)

### 1. Start Docker Services

Open a terminal and start Redis and RabbitMQ:

```bash
docker-compose up -d
```

This starts:
- **Redis**: http://localhost:6379 (in-memory storage)
- **RabbitMQ**: http://localhost:15672 (management UI, guest/guest)

Verify they're running:

```bash
docker-compose ps
```

### 2. Start Frontend

Open a new terminal:

```bash
cd frontend
npm install              # Only needed first time
npm run dev
```

Frontend runs at: **http://localhost:5173**

### 3. Start Backend

Open another terminal:

```bash
cd backend
python -m venv venv
source venv/Scripts/activate  # On Windows: venv\Scripts\activate

pip install -r requirements.txt
python -m uvicorn app.main:app --reload --port 8000
```

Backend API docs: **http://localhost:8000/docs**

### 4. Start Celery Worker

Open another terminal:

```bash
cd worker
python -m venv venv
source venv/Scripts/activate  # On Windows: venv\Scripts\activate

pip install -r requirements.txt
celery -A celery_app worker --loglevel=info --pool=solo
```

**Note on Windows:** Use `--pool=solo` flag for compatibility. This uses a single-process worker instead of multiprocessing.

You should see:
```
[*] Connected to amqp://guest:guest@localhost:5672//
[*] Waiting for tasks...
```

Each file takes **5 seconds to process** to demonstrate async task processing.

## 📖 How to Use

1. Open **http://localhost:5173** in your browser
2. Upload a `.txt` file and click "Analyze File"
3. While processing, upload another file to see **parallel async processing**
4. Watch task status update: Queued → Processing → Completed
5. View results for each file independently

**Key Features:**
- ✅ Files are processed **in-memory** (no disk storage needed)
- ✅ Each file takes ~5 seconds to process (for demo purposes)
- ✅ Upload multiple files while others are processing
- ✅ View multiple results at the same time
- ✅ The frontend stays responsive while background tasks process in parallel

## 🧠 Learning Resources

Read the documentation files in the `docs/` folder to understand each component:

### For Beginners

1. Start with **FLOW_EXPLANATION.md** - Understand the complete flow
2. Then read **RABBITMQ_EXPLANATION.md** - Learn about message queuing
3. Then read **CELERY_EXPLANATION.md** - Learn about background tasks
4. Finally read **REDIS_EXPLANATION.md** - Learn about result storage

### Quick Explanations

| File | Topic | Time |
|------|-------|------|
| FLOW_EXPLANATION.md | How everything connects | 15 min |
| RABBITMQ_EXPLANATION.md | Message broker concept | 10 min |
| CELERY_EXPLANATION.md | Background task processing | 10 min |
| REDIS_EXPLANATION.md | In-memory data store | 10 min |

## 🔍 Monitoring

### RabbitMQ Management UI

Access at: **http://localhost:15672**
- Username: `guest`
- Password: `guest`

See:
- Active queues
- Messages in queues
- Connected workers
- Queue statistics

### FastAPI Documentation

Access at: **http://localhost:8000/docs**

Try the endpoints:
- `POST /api/upload` - Upload a file
- `GET /api/status/{task_id}` - Check task status

### Celery Worker Logs

The worker terminal shows:
- Tasks received
- Task status updates
- Errors and failures
- Processing time

## 📊 API Endpoints

### Upload File

```http
POST /api/upload
Content-Type: multipart/form-data

file: <binary .txt file>
```

Response:
```json
{
  "task_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "filename": "example.txt"
}
```

### Check Status

```http
GET /api/status/{task_id}
```

Responses:

**Pending/Processing:**
```json
{
  "status": "PROCESSING"
}
```

**Completed:**
```json
{
  "status": "SUCCESS",
  "result": {
    "words": 150,
    "lines": 12,
    "characters": 890
  }
}
```

**Failed:**
```json
{
  "status": "FAILURE"
}
```

## 🛠️ Configuration

### Backend (.env)

```env
REDIS_HOST=localhost
REDIS_PORT=6379
RABBITMQ_HOST=localhost
RABBITMQ_PORT=5672
RABBITMQ_USER=guest
RABBITMQ_PASSWORD=guest
```

### Worker (.env)

Same as backend - ensure they match Docker services

## 🐛 Troubleshooting

### "Connection refused" Error

Make sure Docker services are running:
```bash
docker-compose up -d
docker-compose ps
```

All should be **UP**. If not:
```bash
docker-compose down -v
docker-compose up -d
```

### Worker Shows "ValueError" on Windows

Use `--pool=solo` flag:
```bash
celery -A celery_app worker --loglevel=info --pool=solo
```

The `prefork` mode doesn't work well on Windows. `solo` uses single-process worker instead.

### "amqp_types.py" Import Error

Reinstall Celery and Redis:
```bash
pip install celery==5.3.4 redis==5.0.1
```

### Frontend can't reach backend

Check CORS is enabled in backend (it is by default).

### Worker not receiving tasks

1. Check RabbitMQ is running: `docker-compose ps`
2. Check worker terminal for connection messages
3. Verify task queue name matches in FastAPI and Celery

## 📚 Key Files to Study

### Frontend
- `frontend/src/App.jsx` - Main component and state management
- `frontend/src/components/FileUpload.jsx` - File upload component
- `frontend/src/services/api.js` - API communication

### Backend
- `backend/app/main.py` - FastAPI application setup
- `backend/app/routes/file_routes.py` - API endpoints
- `backend/app/services/task_service.py` - Celery task creation

### Worker
- `worker/celery_app.py` - Celery configuration with detailed comments
- `worker/tasks/file_tasks.py` - The actual background task
- `worker/utils/analyzer.py` - File analysis logic

## 🔄 Request Flow

```
1. User uploads file (React)
   ↓
2. FastAPI receives file
   ↓
3. FastAPI saves file locally
   ↓
4. FastAPI sends task to RabbitMQ
   ↓
5. FastAPI returns task_id to React
   ↓
6. React starts polling for status
   ↓
7. Celery worker picks task from RabbitMQ
   ↓
8. Worker analyzes file
   ↓
9. Worker stores result in Redis
   ↓
10. React gets status SUCCESS with results
   ↓
11. Results displayed to user
```

## 🎓 Learning Outcomes

After completing this project, you'll understand:

- ✅ How asynchronous task processing works
- ✅ What message brokers do (RabbitMQ)
- ✅ How Celery distributes work across workers
- ✅ Why Redis is useful for storing results
- ✅ How to build scalable applications
- ✅ Frontend-backend communication patterns
- ✅ Real-time status updates with polling
- ✅ Parallel task execution with async queues

**Special Feature:** Each file takes ~5 seconds to process. This delay is intentional to help you see:
- Frontend stays responsive during processing
- Multiple files can be uploaded while others process
- Tasks queue and execute in parallel
- Real async distributed processing in action!

## 🚀 Next Steps

### To Scale This Project

1. **Add more workers** - Run multiple Celery instances
2. **Add task retry logic** - Handle failures gracefully
3. **Add authentication** - Protect the API
4. **Add database** - Store analysis history
5. **Add WebSockets** - Real-time updates instead of polling

### To Learn More

- Celery Documentation: https://docs.celeryproject.org/
- FastAPI Documentation: https://fastapi.tiangolo.com/
- RabbitMQ Tutorials: https://www.rabbitmq.com/getstarted.html
- Redis Documentation: https://redis.io/documentation

## 📝 Environment Setup Summary

```bash
# Terminal 1 - Docker Services
first manually open docker app on desktop, then run:
docker-compose up -d

# Terminal 2 - Frontend
cd frontend
npm run dev

# Terminal 3 - Backend
cd backend
python -m venv venv
source venv/Scripts/activate
pip install -r requirements.txt
python -m uvicorn app.main:app --reload

# Terminal 4 - Celery Worker (Windows: use --pool=solo)
cd worker
python -m venv venv
source venv/Scripts/activate
pip install -r requirements.txt
celery -A celery_app worker --loglevel=info --pool=solo
```

Then visit **http://localhost:5173**

**Async Demo:** Upload file 1, while it processes (5 seconds), upload file 2. Watch both process in parallel! 🚀

## 🤝 Contributing

This is a learning project. Feel free to:
- Modify the analysis logic
- Add more file types
- Improve the UI
- Add more sophisticated analysis

## 📄 License

MIT License - Feel free to use for learning!

## ❓ Questions?

Read the documentation files:
- `docs/FLOW_EXPLANATION.md` - For overall flow
- `docs/RABBITMQ_EXPLANATION.md` - For learning RabbitMQ
- `docs/CELERY_EXPLANATION.md` - For learning celery
- `docs/REDIS_EXPLANATION.md` - For learning redis

Happy Learning! 🎉
