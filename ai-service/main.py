from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from controllers import api

load_dotenv()

app = FastAPI(title="Flashcards AI Service", version="1.0.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    # TODO: Restrict origins in production
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API router
app.include_router(api.router)


@app.get("/")
def root():
    return {"message": "AI App running..."}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=9052)
