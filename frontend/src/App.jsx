import React, { useState } from 'react';
import FileUpload from './components/FileUpload';
import TaskStatus from './components/TaskStatus';
import ResultCard from './components/ResultCard';

function App() {
  const [tasks, setTasks] = useState([]);

  const handleTaskCreated = (taskId) => {
    setTasks([...tasks, { id: taskId, createdAt: new Date() }]);
  };

  const handleRemoveTask = (taskId) => {
    setTasks(tasks.filter(task => task.id !== taskId));
  };

  const handleClearAll = () => {
    setTasks([]);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">📄 Async File Analyzer</h1>
          <p className="text-gray-600">Upload multiple text files and analyze them asynchronously in parallel</p>
        </div>

        {/* Upload Section */}
        <div className="mb-8">
          <FileUpload onTaskCreated={handleTaskCreated} />
        </div>

        {/* Tasks Section */}
        {tasks.length === 0 ? (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
            <p className="text-blue-900">Upload a .txt file to get started. You can upload multiple files!</p>
          </div>
        ) : (
          <>
            {/* Clear All Button */}
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800">Active Tasks ({tasks.length})</h2>
              <button
                onClick={handleClearAll}
                className="py-2 px-4 bg-red-500 text-white rounded font-medium hover:bg-red-600 transition-colors"
              >
                Clear All
              </button>
            </div>

            {/* Tasks Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {tasks.map((task) => (
                <div
                  key={task.id}
                  className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-indigo-500"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <p className="text-xs text-gray-500">Task ID:</p>
                      <p className="text-sm font-mono text-gray-700 truncate">{task.id}</p>
                    </div>
                    <button
                      onClick={() => handleRemoveTask(task.id)}
                      className="text-red-500 hover:text-red-700 font-bold text-lg"
                      title="Remove this task"
                    >
                      ✕
                    </button>
                  </div>

                  <TaskStatus taskId={task.id} />
                  <div className="mt-4">
                    <ResultCard taskId={task.id} />
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Info Box */}
        <div className="mt-12 bg-white rounded-lg shadow-md p-6">
          <h3 className="font-semibold text-gray-800 mb-2">How it works:</h3>
          <ol className="text-sm text-gray-700 space-y-1 ml-4">
            <li>1. Upload a .txt file</li>
            <li>2. File is sent to FastAPI backend</li>
            <li>3. Task is queued in RabbitMQ</li>
            <li>4. Celery worker processes the file (takes ~5 seconds)</li>
            <li>5. Results stored in Redis</li>
            <li>6. Results displayed in real-time</li>
            <li>7. Upload more files while others are processing!</li>
          </ol>
        </div>
      </div>
    </div>
  );
}

export default App;