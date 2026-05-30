import React, { useState, useEffect } from 'react';
import { checkStatus } from '../services/api';

export default function ResultCard({ taskId }) {
  const [result, setResult] = useState(null);
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchResult = async () => {
      try {
        const response = await checkStatus(taskId);
        setStatus(response.status);

        // Keep polling until we get SUCCESS
        if (response.status === 'SUCCESS' && response.result) {
          setResult(response.result);
          setLoading(false);
        } else if (response.status === 'FAILURE') {
          setLoading(false);
        } else {
          setLoading(true);
        }
      } catch (err) {
        console.error('Error fetching result:', err);
      }
    };

    // Poll every 500ms to get results
    const interval = setInterval(fetchResult, 500);

    // Initial fetch
    fetchResult();

    return () => clearInterval(interval);
  }, [taskId]);

  if (loading || !result) {
    return null;
  }

  if (status === 'FAILURE') {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-900 font-semibold">❌ Analysis Failed</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg p-4 border border-gray-200">
      <h3 className="text-sm font-semibold text-gray-800 mb-3">Results:</h3>

      <div className="grid grid-cols-3 gap-2">
        <div className="bg-blue-50 border border-blue-200 rounded p-3 text-center">
          <p className="text-xs text-gray-600 mb-1">Words</p>
          <p className="text-2xl font-bold text-blue-600">{result.words}</p>
        </div>

        <div className="bg-green-50 border border-green-200 rounded p-3 text-center">
          <p className="text-xs text-gray-600 mb-1">Lines</p>
          <p className="text-2xl font-bold text-green-600">{result.lines}</p>
        </div>

        <div className="bg-purple-50 border border-purple-200 rounded p-3 text-center">
          <p className="text-xs text-gray-600 mb-1">Characters</p>
          <p className="text-2xl font-bold text-purple-600">{result.characters}</p>
        </div>
      </div>
    </div>
  );
}
