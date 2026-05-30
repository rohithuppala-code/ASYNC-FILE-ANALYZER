# Celery application configuration and setup
from celery import Celery
import os
from dotenv import load_dotenv

load_dotenv()

# Redis Configuration
# Redis is used as the result backend to store task results and status
REDIS_HOST = os.getenv('REDIS_HOST', 'localhost')
REDIS_PORT = int(os.getenv('REDIS_PORT', 6379))
REDIS_DB = int(os.getenv('REDIS_DB', 0))
REDIS_URL = f'redis://{REDIS_HOST}:{REDIS_PORT}/{REDIS_DB}'

# RabbitMQ Configuration
# RabbitMQ is the message broker that sends tasks from FastAPI to workers
RABBITMQ_HOST = os.getenv('RABBITMQ_HOST', 'localhost')
RABBITMQ_PORT = int(os.getenv('RABBITMQ_PORT', 5672))
RABBITMQ_USER = os.getenv('RABBITMQ_USER', 'guest')
RABBITMQ_PASSWORD = os.getenv('RABBITMQ_PASSWORD', 'guest')
RABBITMQ_URL = f'amqp://{RABBITMQ_USER}:{RABBITMQ_PASSWORD}@{RABBITMQ_HOST}:{RABBITMQ_PORT}//'

# Initialize Celery app
# This is the core of the task queue system
celery_app = Celery(
    'file_analyzer',
    # broker is the message queue (RabbitMQ)
    broker=RABBITMQ_URL,
    # backend stores task results (Redis)
    backend=REDIS_URL,
)

# Celery configuration
celery_app.conf.update(
    # Task serialization format (JSON is most common)
    task_serializer='json',
    # Accept JSON serialized tasks
    accept_content=['json'],
    # Result serialization format
    result_serializer='json',
    # Timezone
    timezone='UTC',
    # Enable UTC timezone for task scheduling
    enable_utc=True,
    # Task time limit (in seconds) - tasks will be killed if they take longer
    task_time_limit=30 * 60,  # 30 minutes
    # Soft time limit - task gets a warning before hard limit
    task_soft_time_limit=25 * 60,  # 25 minutes
    # Define the queues that workers will listen to
    task_queues={
        'default': {
            'exchange': 'tasks',
            'routing_key': 'default',
        },
    },
    # Task routing
    task_routes={
        'worker.tasks.file_tasks.analyze_file': {'queue': 'default'},
    },
)

# Register the tasks
# This tells Celery about the tasks that exist
# Import tasks explicitly to register them
from tasks import file_tasks  # noqa
