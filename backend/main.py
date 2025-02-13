import json
import requests
import textract
from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
import shutil
import os
import re

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_FOLDER = "uploads"
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

DEEPSEEK_API_URL = "http://localhost:11434/api/generate"

JOB_DESCRIPTION = [
    {
        "title": "Front-End Developer",
        "description": "Designs and develops user interfaces for web applications, ensuring responsiveness and seamless user experience.",
        "required_skills": ["HTML", "CSS", "JavaScript", "React.js", "Vue.js", "responsive design", "REST APIs", "Git"],
        "experience_required": "1-3 years"
    },
    {
        "title": "Back-End Developer",
        "description": "Builds and maintains the server-side logic, databases, and APIs for web applications.",
        "required_skills": ["Node.js", "Python (Django/Flask)", "Java (Spring Boot)", "SQL", "NoSQL", "authentication (JWT, OAuth)", "cloud services (AWS, Firebase)"],
        "experience_required": "2-5 years"
    },
    {
        "title": "Full-Stack Developer",
        "description": "Works on both front-end and back-end development to create end-to-end web applications.",
        "required_skills": ["React.js", "Angular", "Node.js", "Django", "REST APIs", "databases (MySQL, MongoDB)", "CI/CD"],
        "experience_required": "3-6 years"
    },
    {
        "title": "Software Engineer",
        "description": "Designs, develops, tests, and maintains software applications for various platforms.",
        "required_skills": ["Java", "Python", "C++", "software design patterns", "data structures & algorithms", "debugging"],
        "experience_required": "2-5 years"
    },
    {
        "title": "Mobile App Developer",
        "description": "Develops mobile applications for iOS and Android platforms.",
        "required_skills": ["Flutter", "React Native", "Swift (iOS)", "Kotlin (Android)", "Firebase", "RESTful APIs"],
        "experience_required": "1-4 years"
    },
    {
        "title": "DevOps Engineer",
        "description": "Manages CI/CD pipelines, cloud deployments, and infrastructure automation.",
        "required_skills": ["Docker", "Kubernetes", "Jenkins", "AWS/GCP", "Linux", "Terraform", "Ansible"],
        "experience_required": "3-6 years"
    },
    {
        "title": "Data Scientist",
        "description": "Analyzes large datasets to build predictive models and extract business insights.",
        "required_skills": ["Python", "R", "SQL", "machine learning (Scikit-Learn, TensorFlow)", "data visualization (Tableau, Matplotlib)"],
        "experience_required": "2-5 years"
    },
    {
        "title": "Cybersecurity Analyst",
        "description": "Protects IT infrastructure, networks, and data from cyber threats and vulnerabilities.",
        "required_skills": ["Network security", "penetration testing", "ethical hacking", "SIEM tools", "firewall management"],
        "experience_required": "1-4 years"
    },
    {
        "title": "UI/UX Designer",
        "description": "Creates engaging user interfaces and improves user experience based on research and testing.",
        "required_skills": ["Figma", "Adobe XD", "Sketch", "wireframing", "user research", "prototyping", "usability testing"],
        "experience_required": "1-3 years"
    },
    {
        "title": "Cloud Engineer",
        "description": "Designs, deploys, and manages cloud-based infrastructure and services.",
        "required_skills": ["AWS (EC2, S3, Lambda)", "Azure", "Google Cloud", "containerization (Docker, Kubernetes)", "Terraform"],
        "experience_required": "3-6 years"
    }
]

def extract_text_from_pdf(file_path):
    """Extract text from a PDF file using Textract."""
    resume_text = textract.process(file_path, encoding='utf-8')
    return resume_text.decode("utf-8")

def send_to_llm(resume_text):
    """Send extracted text to the locally running DeepSeek model."""
    
    payload = {
    "model": "deepseek-r1",
    "stream": False,
    "prompt": f"""[
        {{"role": "system", "content": "You are an AI assistant specializing in resume screening. Your task is to analyze resumes and determine if they match the provided job description. Evaluate the resume based on skills, experience, qualifications, and keywords relevant to the job description."}},

        {{"role": "user", "content": "Here is a job description:\n\n{JOB_DESCRIPTION}"}},

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
                          \"job_title\": \"Frontend Developer\",
                          \"job_description\": \"Develop and maintain web applications using React.js, JavaScript, and related technologies.\",
                          \"experience\": \"2+ years\",
                          \"skills\": [\"React.js\", \"JavaScript\", \"HTML\", \"CSS\", \"REST APIs\"]
                      }},
                      {{
                          \"job_title\": \"Software Engineer\",
                          \"job_description\": \"Build scalable web applications with full-stack development expertise.\",
                          \"experience\": \"3+ years\",
                          \"skills\": [\"Node.js\", \"JavaScript\", \"MongoDB\", \"AWS\", \"Express.js\"]
                      }}
                  ]
              }}

            **Match Criteria:**  
            - If the match percentage is **80% or above**, consider it a match.  
            - Evaluate experience, skills, and job role alignment.  

            **Important Notes:**  
            - Ensure the response is always in valid JSON format.  
            - If no matching roles are found, return an empty list for \"matching_roles\".  
            - The \"matching_roles\" field must only contain job titles, job descriptions, experience, and required skills.
        "}}
    ]"""
    }

    print("\n===== Sending Request to DeepSeek =====\n", payload)

    try:
        response = requests.post(DEEPSEEK_API_URL, json=payload)
        response.raise_for_status()

        data = response.json()
        # print("\n===== DeepSeek Raw Response =====\n", data)  # Debugging

        return data.get("response", "No response")
    
    except requests.exceptions.RequestException as e:
        print("Error communication with DeepSeek:", e)
        return "Error processing text with DeepSeek."

def process_llm_response(llm_response):
    print("==== LLM Response ===\n", llm_response)

    try:
        # Extract the JSON part from the response
        json_match = re.search(r"\{.*\}", llm_response, re.DOTALL)
        if not json_match:
            return "Unexpected response format"
        
        response_data = json.loads(json_match.group())  # Load extracted JSON
        print("============== Processed Response =================\n", response_data)

        if response_data.get("status") == "invalid":
            return "The provided document is invalid, please provide the right document"
        elif response_data.get("status") == "no_match":
            return "No match job is found"
        elif response_data.get("status") == "match":
            matching_roles = response_data.get("matching_roles", [])
            
            job_list = "\n".join([f"{idx + 1}. {role['job_title']}" for idx, role in enumerate(matching_roles)])
            
            return f"Based on your resume, these roles closely match your skills and experience. You may consider applying if any of them align with your career goals.\n\n{job_list}"

        else:
            return "Unexpected response format"

    except json.JSONDecodeError:
        return "Unexpected response format"

@app.post("/upload/")
async def upload_pdf(file: UploadFile = File(...)):
    file_path = os.path.join(UPLOAD_FOLDER, file.filename)

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    extracted_text = extract_text_from_pdf(file_path)
    
    # print("\n===== Extracted Text =====\n")
    # print(extracted_text)

    llm_response = send_to_llm(extracted_text[:])

    # print("\n===== LLM Response =====\n", llm_response)

    formatted_response = process_llm_response(llm_response)

    return {
        "llm_response": formatted_response
        }
