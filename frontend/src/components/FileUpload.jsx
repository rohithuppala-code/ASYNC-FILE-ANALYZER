import React, { useState } from 'react';
import { uploadFile } from '../services/api';

export default function FileUpload({ onTaskCreated }) {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile && selectedFile.type === 'text/plain') {
      setFile(selectedFile);
      setError(null);
    } else {
      setError('Please select a .txt file');
      setFile(null);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setError('Please select a file first');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await uploadFile(file);
      setFile(null);
      document.getElementById('file-input').value = '';
      onTaskCreated(result.task_id);
    } catch (err) {
      setError(err.message || 'Upload failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-4">Upload File</h2>

      <div className="border-2 border-dashed border-blue-300 rounded-lg p-6 mb-4">
        <input
          id="file-input"
          type="file"
          accept=".txt"
          onChange={handleFileChange}
          className="w-full"
        />
        <p className="text-sm text-gray-600 mt-2">Only .txt files are supported</p>
      </div>

      {file && (
        <div className="bg-blue-50 border border-blue-200 rounded p-3 mb-4">
          <p className="text-sm text-blue-900">Selected: {file.name}</p>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded p-3 mb-4">
          <p className="text-sm text-red-900">{error}</p>
        </div>
      )}

      <button
        onClick={handleUpload}
        disabled={!file || loading}
        className={`w-full py-2 px-4 rounded font-medium transition-colors ${
          !file || loading
            ? 'bg-gray-300 text-gray-600 cursor-not-allowed'
            : 'bg-blue-500 text-white hover:bg-blue-600'
        }`}
      >
        {loading ? 'Uploading...' : 'Analyze File'}
      </button>
    </div>
  );
}
