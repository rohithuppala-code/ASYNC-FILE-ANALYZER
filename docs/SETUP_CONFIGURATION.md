# Setup & Configuration Guide

## Docker-Compose Explained

### What is Docker-Compose?

Docker-Compose is a tool that runs **multiple services** (Redis, RabbitMQ, etc.) with a single command.

Instead of installing Redis and RabbitMQ separately on your computer, Docker-Compose handles everything!

### docker-compose.yml - Line by Line

```yaml
version: '3.8'
```
**Version:** The format version (don't worry about this)

---

```yaml
services:
```
**Services:** The list of applications to run. We have 2:
1. Redis
2. RabbitMQ

---

```yaml
  redis:
    image: redis:7-alpine
    container_name: async_file_analyzer_redis
```
**Redis Service:**
- `image`: What to download and run (Redis version 7, lightweight)
- `container_name`: The name of the running container

---

```yaml
    ports:
      - "6379:6379"
```
**Ports:** Map container port to your computer
- `6379` (inside container) → `6379` (on your computer)
- Access Redis at: `localhost:6379`

---

```yaml
    volumes:
      - redis_data:/data
```
**Volumes:** Store data so it doesn't disappear when container stops
- `redis_data`: Volume name (location on computer)
- `/data`: Where Redis saves data (inside container)

---

```yaml
    command: redis-server --appendonly yes
```
**Command:** Tell Redis to save changes to disk (persistence)
- Without this: Restart Docker = lose all data
- With this: Data survives restart

---

```yaml
    networks:
      - async_network
```
**Network:** Connect Redis to other services
- Redis and RabbitMQ talk to each other through this network

---

```yaml
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 3s
      retries: 5
```
**Healthcheck:** Verify Redis is running
- Tests every 5 seconds
- If unhealthy after 5 retries → mark as down
- Ensures everything is working

---

```yaml
  rabbitmq:
    image: rabbitmq:3.12-management-alpine
    ports:
      - "5672:5672"      # AMQP protocol (workers connect)
      - "15672:15672"    # Management UI (web interface)
```
**RabbitMQ Service:**
- Port 5672: Worker connects here
- Port 15672: Web UI at `http://localhost:15672`

---

```yaml
    environment:
      RABBITMQ_DEFAULT_USER: guest
      RABBITMQ_DEFAULT_PASS: guest
```
**Environment Variables:** Login credentials for RabbitMQ
- Username: `guest`
- Password: `guest`

---

```yaml
networks:
  async_network:
    driver: bridge
```
**Network Definition:** Creates a bridge network for services to communicate

---

```yaml
volumes:
  redis_data:
  rabbitmq_data:
```
**Volume Storage:** Persistent storage for Redis and RabbitMQ data

---

## Backend .env Explained

### What is .env?

Environment variables file. Stores configuration settings **without hardcoding** them in code.

### backend/.env - Line by Line

```env
# Redis Configuration
REDIS_HOST=localhost
```
**REDIS_HOST:** Where Redis is running
- `localhost` = your computer
- `redis` = inside Docker
- We use `localhost` because we're running locally

---

```env
REDIS_PORT=6379
```
**REDIS_PORT:** The port Redis listens on
- Port 6379 is Redis's default port
- Must match `docker-compose.yml` port

---

```env
REDIS_DB=0
```
**REDIS_DB:** Which database (Redis has 16 databases: 0-15)
- Database 0 = default
- Different apps can use different databases to not interfere

---

```env
# RabbitMQ Configuration
RABBITMQ_HOST=localhost
```
**RABBITMQ_HOST:** Where RabbitMQ is running
- `localhost` = your computer

---

```env
RABBITMQ_PORT=5672
```
**RABBITMQ_PORT:** The port RabbitMQ listens on
- 5672 is RabbitMQ's AMQP protocol port
- 15672 is for the web UI (not used in code)

---

```env
RABBITMQ_USER=guest
RABBITMQ_PASSWORD=guest
```
**RABBITMQ_USER & RABBITMQ_PASSWORD:** Login credentials
- Must match `docker-compose.yml` credentials
- Default credentials (change in production!)

---

## The Data losing and not losing(imp)?

When you run `docker-compose up -d`:

```
Your Computer:
├── Redis Container (runs on port 6379)
│   ├── In-memory database
│   ├── Stores Celery results
│   └── Data saved to disk
│
└── RabbitMQ Container (runs on ports 5672 & 15672)
    ├── Message broker
    ├── Queues tasks
    └── Web UI at http://localhost:15672
```

## Connection Flow

```
Backend App (localhost:8000)
    ↓ (using REDIS_HOST=localhost, REDIS_PORT=6379)
Redis (localhost:6379)

Backend App (localhost:8000)
    ↓ (using RABBITMQ_HOST=localhost, RABBITMQ_PORT=5672)
RabbitMQ (localhost:5672)

Celery Worker
    ↓ (same settings from backend .env)
RabbitMQ (localhost:5672)
    ↓
Redis (localhost:6379)
```

## Common Issues

### "Connection refused" Error
**Cause:** Docker containers not running
**Fix:**
```bash
docker-compose up -d
docker-compose ps  # Verify running
```

### Can't access RabbitMQ UI at localhost:15672
**Cause:** Container not fully started
**Fix:** Wait 10 seconds, then try again

### Redis Data Loss - When Does It Happen?

**WITHOUT Persistence (`--appendonly yes`):**
```
Step 1: You run docker-compose up
        Redis stores data in RAM (memory)
        
Step 2: You restart Docker
        Docker stops
        RAM is cleared
        ALL DATA LOST ❌
        
Step 3: docker-compose up again
        Redis starts fresh (empty)
        Old data gone!
```

**WITH Persistence (`--appendonly yes`):**
```
Step 1: You run docker-compose up
        Redis stores data in RAM (memory)
        ALSO saves to disk automatically
        
Step 2: You restart Docker
        Docker stops
        Data on disk is saved ✅
        
Step 3: docker-compose up again
        Redis starts
        Reads data from disk
        OLD DATA RESTORED ✅
```

**OUR SETUP:**
```yaml
command: redis-server --appendonly yes
```
✅ **We have persistence enabled!** Your data survives restarts!

**Example:**
```
Session 1:
- Upload file 1
- Task completed
- Result in Redis

Restart Docker (Stop & Start)

Session 2:
- Old result STILL there! ✅
- Can query it again
- No data loss!
```

### Redis Data Lost Scenarios

❌ **Data WILL be lost if:**
1. You delete the Docker volume: `docker volume rm redis_data`
2. You use `--appendonly no` (no persistence)
3. Hard drive failure
4. Server power loss (physical crash)

✅ **Data WON'T be lost if:**
1. You restart Docker (`docker-compose restart`)
2. You restart your computer
3. You restart the worker
4. You stop and start services normally

**In Production:**
Use persistent storage + backups to be 100% safe!

## Summary

| File | Purpose | Key Settings |
|------|---------|--------------|
| docker-compose.yml | Defines services | Ports, volumes, networks |
| backend/.env | Configuration | Redis & RabbitMQ locations |
| worker/.env | Configuration | Same as backend (must match) |



AND everything is being stored in docker containing the redis results, so you can restart everything and continue working! if docker not there you can install redis and run it locally, but make sure to update the connection settings in your code to point to your local Redis instance.



Everything is connected and working! 🚀
