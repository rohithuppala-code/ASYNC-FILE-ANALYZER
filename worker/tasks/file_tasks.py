# Celery tasks for file analysis
# These are the background jobs that process file analysis requests
import sys
import os

# Add the worker directory to the path so we can import the analyzer
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from celery_app import celery_app
from utils.analyzer import analyze_content

@celery_app.task(name='worker.tasks.file_tasks.analyze_file', bind=True)
def analyze_file_task(self, file_content):
    """
    Celery task to analyze file content in the background.

    This task:
    1. Is picked up by the Celery worker from the RabbitMQ queue
    2. Receives the file content as an argument
    3. Calls the analyzer to count words, lines, and characters
    4. Returns the result, which is stored in Redis
    5. The result is retrieved by the frontend to display results

    Args:
        self: Celery task context (provides task_id, bind=True)
        file_content: The text content to analyze

    Returns:
        Dictionary with analysis results
    """
    try:
        print(f"\n[WORKER DEBUG] Task started: {self.request.id}")
        print(f"[WORKER DEBUG] Content type: {type(file_content)}")
        print(f"[WORKER DEBUG] Content length: {len(file_content)} characters")
        print(f"[WORKER DEBUG] Content preview: {file_content[:200]}")

        # Update task status to PROCESSING
        # This will be stored in Redis
        self.update_state(
            state='PROCESSING',
            meta={
                'current': 0,
                'total': 100,
                'status': 'Analyzing file...'
            }
        )

        # Call the analyzer utility
        result = analyze_content(file_content)

        print(f"[WORKER DEBUG] Result: {result}\n")

        # Return the result
        # Celery will automatically store this in Redis with a SUCCESS status
        return result

    except Exception as e:
        print(f"[WORKER ERROR] {str(e)}\n")
        # If an error occurs, store the error in Redis
        self.update_state(
            state='FAILURE',
            meta={'exc_type': type(e).__name__, 'exc_message': str(e)}
        )
        raise
