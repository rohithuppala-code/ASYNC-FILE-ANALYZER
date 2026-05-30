# File upload and status check routes
from fastapi import APIRouter, UploadFile, File, HTTPException
import uuid
from app.services.task_service import create_analyze_task, get_task_status

router = APIRouter(prefix='/api')

@router.post('/upload')
async def upload_file(file: UploadFile = File(...)):
    """
    Upload a file for analysis.

    Steps:
    1. Receive the file from the React frontend
    2. Read file content into memory
    3. Create a Celery task with the content
    4. Return the task ID for tracking

    Args:
        file: The uploaded file

    Returns:
        JSON with task_id for tracking
    """
    try:
        # Validate file type (only .txt files)
        if not file.filename.endswith('.txt'):
            raise HTTPException(status_code=400, detail='Only .txt files are supported')

        # Read file content into memory (no disk storage)
        contents = await file.read()

        print(f"\n[DEBUG] File received: {file.filename}")
        print(f"[DEBUG] Raw bytes: {len(contents)} bytes")

        file_content = contents.decode('utf-8')

        print(f"[DEBUG] Decoded content: {len(file_content)} characters")
        print(f"[DEBUG] Content preview: {file_content[:200]}")
        print(f"[DEBUG] Word count in backend: {len(file_content.split())}")

        # Create a Celery task with the file content
        task_id = create_analyze_task(file_content)

        print(f"[DEBUG] Task created with ID: {task_id}\n")

        return {
            'task_id': task_id,
            'filename': file.filename
        }

    except UnicodeDecodeError:
        raise HTTPException(status_code=400, detail='File must be valid UTF-8 text')
    except Exception as e:
        print(f"[ERROR] {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get('/status/{task_id}')
async def check_status(task_id: str):
    """
    Check the status of a file analysis task.

    Steps:
    1. Receive the task ID from the frontend
    2. Query Redis for the task status and result
    3. Return the status

    Possible statuses:
    - PENDING: Task is waiting to be processed
    - PROCESSING: Task is currently being processed
    - SUCCESS: Task completed successfully
    - FAILURE: Task failed

    Args:
        task_id: The ID of the task to check

    Returns:
        JSON with status and optional result
    """
    try:
        status_info = get_task_status(task_id)
        return status_info
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
