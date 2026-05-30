import React, { useState, useEffect } from 'react';
import { checkStatus } from '../services/api';

export default function TaskStatus({ taskId }) {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const result = await checkStatus(taskId);
        setStatus(result);
        setError(null);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    // Fetch immediately
    fetchStatus();

    // Poll every 1 second if still processing
    const interval = setInterval(fetchStatus, 1000);

    return () => clearInterval(interval);
  }, [taskId]);

  const getStatusColor = (state) => {
    switch (state) {
      case 'PENDING':
      case 'QUEUED':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'PROCESSING':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'SUCCESS':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'FAILURE':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusDisplay = (state) => {
    switch (state) {
      case 'PENDING':
        return '⏳ Queued';
      case 'PROCESSING':
        return '⚙️ Processing';
      case 'SUCCESS':
        return '✅ Completed';
      case 'FAILURE':
        return '❌ Failed';
      default:
        return state;
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <p className="text-gray-600">Loading status...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="bg-red-50 border border-red-200 rounded p-4">
          <p className="text-red-900">Error: {error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">Task Status</h3>

      <div className={`border-2 rounded-lg p-4 ${getStatusColor(status.status)}`}>
        <p className="text-lg font-medium">{getStatusDisplay(status.status)}</p>
        <p className="text-sm mt-2">Task ID: {taskId}</p>
      </div>
    </div>
  );
}
