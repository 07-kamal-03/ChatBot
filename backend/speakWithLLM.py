import requests

url = "http://localhost:11434/api/generate"

# Convert messages into a single text prompt


# Convert chat messages into a formatted prompt string
# prompt = "\n".join(f"{m['role'].capitalize()}: {m['content']}" for m in messages)
text = "hi, how are you?"

data = {
    "model": "deepseek-r1",
    # "prompt": prompt,  # Using `prompt` instead of `messages`
    "prompt" : f"""[
            {{"role": "system", "content": "You are a helpful AI assistant."}},
            {{"role": "user", "content": {text}}}
        ]""",
    "stream": False
}
print("\n===== Sending Request to DeepSeek =====\n", data)

response = requests.post(url, json=data)
print(response.json()["response"])  # Full response at once


def process_job_match(response_data):
    if response_data.get("status") == "match":
        matching_roles = response_data.get("matching_roles", [])

        if not matching_roles:
            return "No matching roles found"

        # Generate the numbered job list
        job_list = "\n".join([f"{idx + 1}. {role['job_title']}" for idx, role in enumerate(matching_roles)])

        # Initial response
        response = f"Based on your resume, these roles closely match your skills and experience. You may consider applying if any of them align with your career goals.\n\n{job_list}\n\nWould you like to apply? (Yes/No)"

        return response, matching_roles  # Return job list for further processing

def handle_user_response(user_input, matching_roles):
    if user_input.lower() == "no":
        return "Thank you for your time. Have a great day!"

    elif user_input.lower() == "yes":
        return "Please enter the number of the listed job you want to apply for:"

    else:
        return "Invalid input. Please type 'Yes' or 'No'."

def handle_job_selection(user_input, matching_roles):
    try:
        job_index = int(user_input) - 1  # Convert input to index
        if 0 <= job_index < len(matching_roles):
            selected_job = matching_roles[job_index]['job_title']
            return f"You have selected '{selected_job}'. Are you sure you want to apply? (Yes/No)", selected_job
        else:
            return "Invalid selection. Please enter a valid job number:", None
    except ValueError:
        return "Invalid input. Please enter a number corresponding to the listed jobs:", None

def confirm_application(user_input, selected_job):
    if user_input.lower() == "yes":
        # Here, you would send the resume to the recruiter's dashboard
        send_resume_to_recruiter(selected_job)  # Function to handle resume submission
        return "Thanks for applying! Our team will get back to you soon."

    elif user_input.lower() == "no":
        return "No problem! Here are the available jobs again:\n\n" + process_job_match({"status": "match", "matching_roles": matching_roles})[0]

    else:
        return "Invalid input. Please type 'Yes' or 'No'."

# Dummy function to simulate sending resume to recruiter
def send_resume_to_recruiter(job_title):
    print(f"Resume submitted for {job_title}")  # Replace this with actual implementation
