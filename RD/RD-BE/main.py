from fastapi import FastAPI
import psycopg2
from pydantic import BaseModel
import chromadb
from typing import List
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

try:
    client = chromadb.PersistentClient(path="db/")
    print("Chroma DB client initialized successfully!")
except Exception as e:
    print(f"Error initializing Chroma DB client: {e}")
    raise

collection = client.get_or_create_collection(name="job_openings")

class JobOpening(BaseModel):
    job_id: int
    job_title: str
    job_description: str
    required_skills: str
    years_of_experience: str

@app.post("/job-openings/")
def add_job_opening(job: JobOpening):
    metadata = {
        "job_title": job.job_title,
        "required_skills": job.required_skills,
        "years_of_experience": job.years_of_experience
    }
    collection.add(
        documents=[job.job_description],
        metadatas=[metadata],
        ids=[str(job.job_id)]
    )

    result = collection.query(
        query_texts=[job.job_description], 
        n_results=1
    )
    
    print(result)
    return {"message": f"Job opening '{job.job_title}' added successfully!"}

@app.get("/job-openings/", response_model=List[JobOpening])
def get_all_job_openings():
    results = collection.get()
    job_openings = []
    for doc, metadata, job_id in zip(results["documents"], results["metadatas"], results["ids"]):
        job_openings.append({
            "job_id": int(job_id),
            "job_title": metadata["job_title"],
            "job_description": doc,
            "required_skills": metadata["required_skills"],
            "years_of_experience": metadata["years_of_experience"]
        })
    return job_openings

@app.delete("/job-openings/{job_id}")
def delete_job_opening(job_id: int):
    collection.delete(ids=[str(job_id)])
    return {"message": f"Job opening with ID '{job_id}' deleted successfully!"}

def get_db_connection():
    try:
        conn = psycopg2.connect(
            dbname="chatbot_database",
            user="myuser",
            password="mypassword",
            host="localhost",
            port="5432"
        )
        print("Database connected successfully")
        return conn
    except psycopg2.Error as e:
        print(f"Database connection failed: {e}")
        return None

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=9000)