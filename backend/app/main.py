# Main FastAPI application
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes import file_routes

# Initialize FastAPI app
app = FastAPI(
    title='Async File Analyzer API',
    description='Backend API for the Async File Analyzer project',
    version='1.0.0'
)

# Enable CORS so the React frontend can communicate with this API
# The frontend runs on localhost:5173 (Vite dev server)
app.add_middleware(
    CORSMiddleware,
    allow_origins=['*'],  # In production, specify exact origin
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*'],
)

# Include the file routes
app.include_router(file_routes.router)

@app.get('/')
async def root():
    """Root endpoint"""
    return {
        'message': 'Async File Analyzer API',
        'version': '1.0.0',
        'docs': '/docs'
    }

@app.get('/health')
async def health():
    """Health check endpoint"""
    return {'status': 'healthy'}

if __name__ == '__main__':
    import uvicorn
    uvicorn.run(app, host='0.0.0.0', port=8000)
