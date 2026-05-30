# Task service to manage Celery task communication
import os
import sys
from celery import Celery
from app.config import CELERY_BROKER_URL, CELERY_RESULT_BACKEND

# Initialize Celery app
# The Celery app is configured to use RabbitMQ as the message broker
# and Redis as the result backend
celery_app = Celery(
    'file_analyzer',
    broker=CELERY_BROKER_URL,
    backend=CELERY_RESULT_BACKEND,
)

def create_analyze_task(file_content):
    """
    Create a Celery task to analyze file content.

    Args:
        file_content: The text content of the file to analyze

    Returns:
        Task ID for tracking the task status
    """
    try:
        # Send the task to the RabbitMQ queue
        # The Celery worker will pick this up and process it
        task = celery_app.send_task(
            'worker.tasks.file_tasks.analyze_file',
            args=[file_content],
            queue='default',
            routing_key='default'
        )
        return task.id
    except Exception as e:
        print(f"Error creating task: {e}")
        raise

def get_task_status(task_id):
    """
    Get the status of a task.

    Args:
        task_id: The ID of the task

    Returns:
        Dictionary with status and result information
    """
    try:
        # Get the task result from Redis (result backend)
        task_result = celery_app.AsyncResult(task_id)

        return {
            'status': task_result.status,
            'result': task_result.result if task_result.status == 'SUCCESS' else None
        }
    except Exception as e:
        print(f"Error getting task status: {e}")
        raise
