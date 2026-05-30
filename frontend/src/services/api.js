// API service for communicating with FastAPI backend
const API_BASE_URL = 'http://localhost:8000/api';

export async function uploadFile(file) {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${API_BASE_URL}/upload`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    throw new Error('Upload failed');
  }

  return response.json();
}

export async function checkStatus(taskId) {
  const response = await fetch(`${API_BASE_URL}/status/${taskId}`);

  if (!response.ok) {
    throw new Error('Failed to fetch status');
  }

  return response.json();
}
