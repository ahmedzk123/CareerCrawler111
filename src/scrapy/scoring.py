import json
import sys
from sentence_transformers import SentenceTransformer
import numpy as np
import pdfplumber as plumber

model = SentenceTransformer('all-mpnet-base-v2')

def compute_embedding(text):
    return model.encode(text)

def compute_similarity(emb1, emb2):
    return float(np.dot(emb1, emb2) / (np.linalg.norm(emb1) * np.linalg.norm(emb2)))

def extract_text(pdf_path):
    text = ""
    with plumber.open(pdf_path) as pdf:
        for page in pdf.pages:
            page_text = page.extract_text()
            if page_text:
                text += page_text + "\n"
    return text

def score_resume(resume_pdf, job_desc_list):
    resume_text = extract_text(resume_pdf)
    resume_emb = compute_embedding(resume_text)
    scores = []

    for job_desc in job_desc_list:
        job_emb = compute_embedding(job_desc)
        scores.append(compute_similarity(resume_emb, job_emb))

    return scores

resume_pdf = sys.argv[1]
job_desc_file = sys.argv[2]

with open(job_desc_file, 'r', encoding='utf-8') as f:
    job_descriptions = json.load(f)

scores = score_resume(resume_pdf, job_descriptions)

print(json.dumps(scores))
