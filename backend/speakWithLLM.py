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
