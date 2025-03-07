from contextlib import asynccontextmanager
from datetime import datetime
import json
from typing import List
import aiohttp
from pydantic import BaseModel
import io
from fastapi import FastAPI, File, UploadFile, Form, HTTPException
from docx import Document
from fastapi.responses import JSONResponse, StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
import shutil
import os
import re
import chromadb
import asyncpg
import asyncio
import time
from uuid import uuid4
from pdfminer.high_level import extract_text


@asynccontextmanager
async def lifespan(app: FastAPI):
    asyncio.create_task(cleanup_expired_sessions())
    yield
    
app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_FOLDER = "uploads"
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

DEEPSEEK_API_URL = "http://rtm-deepseek-llm-service.rtm-client-environment.svc.cluster.local:11434/api/generate"
# DEEPSEEK_API_URL = "http://localhost:11434/api/generate"

user_sessions = {}

SESSION_TIMEOUT = 600

try:
    client = chromadb.PersistentClient(path="db/")
    print("Chroma DB client initialized successfully!")
except Exception as e:
    print(f"Error initializing Chroma DB client: {e}")  
    raise

collection = client.get_or_create_collection(name="resumes")

CHROMA_DB_URL = "http://rtm-dashboard-server-service.rtm-client-environment.svc.cluster.local:9000/job-openings/"

class JobOpening(BaseModel):
    job_id: int
    job_title: str
    job_description: str
    required_skills: str
    years_of_experience: str    

class UserSession:
    """Class to store state for each user session."""
    def __init__(self):
        self.order = False
        self.last_activity_time = None
        self.session_expired = False
        self.waiting_for_job_selection = False
        self.waiting_for_confirmation = False
        self.selected_job = None
        self.matching_roles = []
        self.resume_path = None

async def monitor_session(session_id):
    """Monitor session inactivity after resume processing."""
    global user_sessions
    session = user_sessions[session_id]

    while True:
        if session.last_activity_time and (time.time() - session.last_activity_time) > SESSION_TIMEOUT:
            session.session_expired = True
            print(f"Session {session_id} expired. User must re-upload the resume.")
            break
        await asyncio.sleep(10)

async def cleanup_expired_sessions():
    """Periodically clean up expired sessions."""
    global user_sessions
    while True:
        expired_sessions = [session_id for session_id, session in user_sessions.items() if session.session_expired]
        for session_id in expired_sessions:
            del user_sessions[session_id]
            print(f"Cleaned up expired session: {session_id}")
        await asyncio.sleep(60)  # Clean up every 60 seconds

@app.get("/job-openings", response_model=List[JobOpening])
async def get_all_job_openings():
    try:
        print("inside the get_all_job_openings")
        async with aiohttp.ClientSession() as session:
            async with session.get(CHROMA_DB_URL) as response:
                response.raise_for_status()
                results = await response.json()

        job_openings = []
        for job in results:
            job_openings.append({
                "job_id": job["job_id"],
                "job_title": job["job_title"],
                "job_description": job["job_description"],
                "required_skills": job["required_skills"],
                "years_of_experience": job["years_of_experience"]
            })

        return job_openings
    
    except aiohttp.ClientError as e:
        print(f"Error fetching data from ChromaDB: {e}")
        return []

async def get_relevant_job_openings(resume_text, job_openings):
    try:
        print("inside the get_relevant_job_openings")
        client = chromadb.PersistentClient(path="db/")
        collection = client.get_or_create_collection(name="job_openings")
        existing_jobs = collection.get()
        if "ids" in existing_jobs and existing_jobs["ids"]:
            collection.delete(ids=existing_jobs["ids"])

        for job in job_openings:
            collection.add(
                documents=[job["job_description"]],
                metadatas=[{"job_title": job["job_title"], "required_skills": job["required_skills"], "years_of_experience": job["years_of_experience"]}],
                ids=[str(job["job_id"])]
            )

        results = collection.query(
            query_texts=[resume_text],
            n_results=10
        )

        relevant_jobs = []
        for i, doc in enumerate(results['documents'][0]):
            metadata = results['metadatas'][0][i]
            relevant_jobs.append({
                "job_id": results['ids'][0][i],
                "job_title": metadata["job_title"],
                "job_description": doc,
                "required_skills": metadata["required_skills"],
                "years_of_experience": metadata["years_of_experience"]
            })

        return relevant_jobs
    
    except Exception as e:
        print(f"Error performing similarity search: {e}")
        return []

async def extract_text_from_pdf(file_path):
    """
    Extract text from a PDF file using pdfminer.six.
    """
    try:
        text = await asyncio.to_thread(extract_text, file_path)
        return text
    except Exception as e:
        return f"Error extracting text from PDF: {e}"

async def extract_text_from_docx(file_path):
    """
    Extract text from a .docx file using python-docx.
    """
    try:
        def sync_extract():
            doc = Document(file_path)
            text = "".join([paragraph.text + "\n" for paragraph in doc.paragraphs])
            return text
        text = await asyncio.to_thread(sync_extract)
        return text
    except Exception as e:
        return f"Error extracting text from DOCX: {e}"

async def extract_text_from_file(file_path):
    """
    Extract text from a file (PDF, DOCX, or DOC).
    """
    if file_path.endswith(".pdf"):
        return await extract_text_from_pdf(file_path)
    elif file_path.endswith(".docx"):
        return await extract_text_from_docx(file_path)
    else:
        return "Unsupported file format. Only PDF and DOCX files are supported."

async def send_to_llm(resume_text):
    """Send extracted text to the locally running DeepSeek model."""
    top_job_openings = await get_relevant_job_openings(resume_text, await get_all_job_openings())
    job_descriptions = "\n\n".join([f"Job Title: {job['job_title']}\nJob Description: {job['job_description']}\nRequired skills: {job['required_skills']}\nYear of Experience: {job['years_of_experience']}" for job in top_job_openings])

    payload = {
    "model": "deepseek-r1:7b",
    "stream": False,
    "prompt": f"""[
        {{"role": "system", "content": "You are an AI assistant specializing in resume screening. Your task is to analyze resumes and determine if they match the provided job description. Evaluate the resume based on skills, experience, qualifications, and keywords relevant to the job description. Follow the instructions strictly and ensure the response is accurate and consistent."}},
        {{"role": "user", "content": "Here is a job description:\n\n{job_descriptions}"}},
        {{"role": "user", "content": "Here is a resume:\n\n{resume_text}"}},
        {{"role": "user", "content": "Analyze the resume and determine if it matches the job description. **Return the response strictly in JSON format as shown below:**\n\n
            - If the document is **not a resume**, respond:\n
              {{
                  \"status\": \"invalid\",
                  \"message\": \"The provided document is invalid, please provide the right document\",
                  \"match_percentage\": 0,
                  \"matching_roles\": []
              }}

            - If the document **is a resume but does not match the job description**, respond:\n
              {{
                  \"status\": \"no_match\",
                  \"message\": \"No match job is found\",
                  \"match_percentage\": 0,
                  \"matching_roles\": []
              }}

            - If the resume **matches the job description (match percentage is 80% or above)**, respond in this format:\n
              {{
                  \"status\": \"match\",
                  \"message\": \"Matching jobs found\",
                  \"match_percentage\": [XX],  
                  \"matching_roles\": [
                      {{
                          \"job_title\": \"[Job Title]\",
                          \"job_description\": \"[Job Description]\",
                          \"experience\": \"[Required Experience]\",
                          \"skills\": [\"Skill 1\", \"Skill 2\", \"Skill 3\"]
                      }}
                  ]
              }}

            **Strict Match Criteria:**  
            1. **Skills Alignment**: The resume must contain at least 80% of the skills mentioned in the job description.  
            2. **Experience Alignment**: The resume must meet or exceed the required years of experience specified in the job description.  
            3. **Role Alignment**: The job title in the resume must closely align with the job title in the job description.  

            **Important Notes:**  
            1. Ensure the response is always in valid JSON format.  
            2. If no matching roles are found, return an empty list for \"matching_roles\".  
            3. The \"matching_roles\" field must only contain job titles, job descriptions, experience, and required skills.  
            4. Do not include roles that do not meet the strict match criteria.  
            5. If the resume matches multiple job descriptions, prioritize the all with the highest match percentage.  
            6. If the match percentage is below 80%, return \"no_match\" with an empty list for \"matching_roles\". 
            7. Be strict in evaluating the resume and only return accurate matches.  
        "}}
    ]"""
}
    print("************************payload**************************", payload)
    timeout = aiohttp.ClientTimeout(total=2400)
    async with aiohttp.ClientSession(timeout=timeout) as session:
        try:
            start_time = datetime.now()
            print("================payload==============", payload)
            print("***********************ASYNCHRONOUS**********************")
            async with session.post(DEEPSEEK_API_URL, json=payload) as response:
                response.raise_for_status()
                data = await response.json()
                end_time = datetime.now()
                print("==========response==========", data)
                print(f"Start time: {start_time} && End time: {end_time}")
                return data.get("response", "No response")
        except aiohttp.ClientError as e:
            print("Error communicating with DeepSeek:", e)
            return "Error processing text with DeepSeek."

async def process_llm_response(llm_response):
    try:
        json_match = re.search(r"\{.*\}", llm_response, re.DOTALL)
        if not json_match:
            return "Unexpected response format", [], False
        
        response_data = json.loads(json_match.group())
        if response_data.get("status") == "invalid":
            return "The provided document is invalid, please provide the right document", [], False
        elif response_data.get("status") == "no_match":
            return "No match job is found", [], False
        elif response_data.get("status") == "match":
            matching_roles = response_data.get("matching_roles", [])
            job_list = "\n".join([f"{idx + 1}. {role['job_title']}" for idx, role in enumerate(matching_roles)])
            response = f"Based on your resume, these roles closely match your skills and experience. You may consider applying if any of them align with your career goals.\n\n{job_list}"
            return response, matching_roles, True
        else:
            return "Unexpected response format", [], False
    except json.JSONDecodeError:
        return "Unexpected response format", [], False

async def handle_user_response(user_input, matching_roles, order, file_path, session):
    if session.waiting_for_job_selection:  
        return await handle_job_selection(user_input, matching_roles, session)
    elif session.waiting_for_confirmation:
        return await confirm_application(user_input, session.selected_job, matching_roles, order, file_path, session)
    elif user_input.lower() == "no":
        session.order = False
        return "Thank you for your time. Have a great day!", session.order
    elif user_input.lower() == "yes":
        session.waiting_for_job_selection = True
        return "Please enter the number of the listed job you want to apply for:", session.order
    else:
        return "Invalid input. Please type 'Yes' or 'No'.", session.order

async def handle_job_selection(user_input, matching_roles, session):
    try:
        job_index = int(user_input) - 1
        if 0 <= job_index < len(matching_roles):
            session.selected_job = matching_roles[job_index]['job_title']
            session.waiting_for_job_selection = False
            session.waiting_for_confirmation = True
            return f"You have selected '{session.selected_job}'. Are you sure you want to apply? (Yes/No/cancel)", True
        else:
            return "Invalid selection. Please enter a valid job number:", True
    except ValueError:
        return "Invalid input. Please enter a number corresponding to the listed jobs:", True

async def confirm_application(user_input, selected_job, matching_roles, order, file_path, session):
    if user_input.lower() == "yes":
        session.waiting_for_confirmation = False
        session.order = False
        try:
            response = await store_resume_in_postgres(selected_job, file_path)
            return response, session.order
        except Exception as e:
            return "We are facing some internal error. Please try again later.", session.order
    elif user_input.lower() == "no":
        session.waiting_for_confirmation = False
        session.waiting_for_job_selection = True
        job_list = "\n".join([f"{idx + 1}. {role['job_title']}" for idx, role in enumerate(matching_roles)])
        response = f"No Problem! Here are the available jobs:\n\n Based on your resume, these roles closely match your skills and experience. You may consider applying if any of them align with your career goals.\n\n{job_list}\n \n Please enter the number of the listed job you want to apply for:"
        return response, session.order
    elif user_input.lower() == "cancel":
        return "Thank you for your time. Have a great day!", False
    else:
        return "Invalid input. Please type 'Yes' or 'No' or 'cancel'.", session.order

async def get_db_connection():
    try:
        conn = await asyncpg.connect(
            dbname="chatbot_database",
            user="myuser",
            password="mypassword",
            host="http://rtm-db-service.rtm-client-environment.svc.cluster.local",
            port="5432"
        )
        print("Database connected successfully")
        return conn
    except Exception as e:
        print(f"Database connection failed: {e}")
        return None

async def create_table_if_not_exists():
    conn = await get_db_connection()
    if conn:
        try:
            await conn.execute("""
                CREATE TABLE IF NOT EXISTS resumes (
                    id SERIAL PRIMARY KEY,
                    job_title VARCHAR(255),
                    resume BYTEA,
                    filename VARCHAR(255),
                    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            print("Table checked/created successfully!")
        finally:
            await conn.close()

async def store_resume_in_postgres(job_title, file_path):
    await create_table_if_not_exists()
    conn = await get_db_connection()
    if conn:
        try:
            with open(file_path, 'rb') as file:
                resume_data = file.read()
            await conn.execute("""
                INSERT INTO resumes (job_title, resume, filename)
                VALUES ($1, $2, $3)
            """, job_title, resume_data, os.path.basename(file_path))
            return "Thanks for applying! Our concent team will get back to you soon."
        finally:
            await conn.close()

@app.post("/upload/")
async def upload_pdf(file: UploadFile = File(None), text: str = Form(None), session_id: str = Form(None)):
    global user_sessions

    bot_response = None
    formatted_response = None

    if not session_id:
        session_id = str(uuid4())
        user_sessions[session_id] = UserSession()

    session = user_sessions[session_id]

    if file:
        session.order = True
        file_path = os.path.join(UPLOAD_FOLDER, file.filename)
        session.resume_path = file_path
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        extracted_text = await extract_text_from_file(file_path)
        llm_response = await send_to_llm(extracted_text[:10000])
        asyncio.create_task(monitor_session(session_id))
        formatted_response, session.matching_roles, session.order = await process_llm_response(llm_response)
        session.last_activity_time = time.time()
    elif session.order and text:
        if session.session_expired:
            return {"bot_response": "Session expired. Please re-upload your resume.", "session_id": session_id}

        session.last_activity_time = time.time()
        bot_response, session.order = await handle_user_response(text, session.matching_roles, session.order, session.resume_path, session)
    else:
        return {"bot_response": "Please upload the resume.", "session_id": session_id}

    return {
        "llm_response": formatted_response,
        "bot_response": bot_response,
        "session_id": session_id
    }

@app.get("/applications")
async def get_resumes():
    conn = await get_db_connection()
    if conn:
        try:
            resumes = await conn.fetch("SELECT id, job_title, filename, uploaded_at FROM resumes")
            resumes_list = [{
                'id': resume['id'],
                'job_title': resume['job_title'],
                'filename': resume['filename'],
                "uploaded_at": resume['uploaded_at'].isoformat() if resume['uploaded_at'] else None
            } for resume in resumes]
            return JSONResponse(content=resumes_list)
        finally:
            await conn.close()

@app.get("/applications/{resume_id}/download")
async def download_resume(resume_id: int):
    conn = await get_db_connection()
    if not conn:
        raise HTTPException(status_code=500, detail="Database connection failed")

    try:
        resume = await conn.fetchrow("SELECT resume, filename FROM resumes WHERE id = $1", resume_id)
        if not resume:
            raise HTTPException(status_code=404, detail="Resume not found")

        file_data = io.BytesIO(resume['resume'])
        filename = resume['filename']

        if filename.endswith(".pdf"):
            media_type = "application/pdf"
            content_disposition = f'inline; filename="{filename}"'
        else:
            media_type = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            content_disposition = f'attachment; filename="{filename}"'

        return StreamingResponse(
            file_data,
            media_type=media_type,
            headers={"Content-Disposition": content_disposition}
        )
    finally:
        await conn.close()

@app.get("/applications/{resume_id}")
async def get_resume_metadata(resume_id: int):
    conn = await get_db_connection()
    if not conn:
        raise HTTPException(status_code=500, detail="Database connection failed")

    try:
        query = "SELECT resume, filename FROM resumes WHERE id = $1"
        resume = await conn.fetchrow(query, resume_id)
        if not resume:
            raise HTTPException(status_code=404, detail="Resume not found")

        return {"filename": resume["filename"]}

    finally:
        await conn.close()


@app.delete('/applications/delete/{resume_id}')
async def delete_resume(resume_id: int):
    conn = await get_db_connection()
    if not conn:
        raise HTTPException(status_code=500, detail="Database connection failed")

    try:
        query = "DELETE FROM resumes WHERE id = $1"
        await conn.execute(query, resume_id)
        return {"message": "Application deleted successfully."}
    finally:
        await conn.close()
