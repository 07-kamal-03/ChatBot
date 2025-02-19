import chromadb
from chromadb.utils import embedding_functions

client = chromadb.Client()
collection = client.create_collection(name="my-collections")

sentences = [
    "The quick brown fox jumps over the lazy dog.",
    "I love to learn new technologies.",
    "Chroma DB is a great tool for similarity search.",
    "Machine learning is fascinating.",
    "Python is my favorite programming language.",
    "The sky is blue.",
    "I enjoy hiking in the mountains.",
    "Artificial intelligence is changing the world.",
    "Data science is an exciting field.",
    "I like to read books in my free time."
]

for i, sentence in enumerate(sentences):
    collection.add(
        documents=[sentence],
        metadatas=[{"source": "user_input"}],
        ids=[f"id{i}"]
    )

query = "I enjoy learning about AI."


results = collection.query(
    query_texts=[query],
    n_results=3
)

for i, result in enumerate(results['documents'][0]):
    print(f"Result {i+1}: {result}")