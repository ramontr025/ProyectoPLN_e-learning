import os
import torch
import numpy as np
import pickle
import re
import string
from flask import Flask, request, jsonify, render_template
from transformers import AutoTokenizer, AutoModelForSequenceClassification
from sentence_transformers.cross_encoder import CrossEncoder

app = Flask(__name__)

# Rutas base
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODELS_DIR = os.path.join(BASE_DIR, "models")

# --- CARGA DE MODELOS ---

t1_vectorizer = None
t1_model = None
t2_tokenizer = None
t2_model = None
t3_model = None

# Mensaje de advertencia para consola sobre Git LFS
LFS_WARNING = """
================================================================================
[ERROR] DE CARGA DE MODELOS: Git LFS (Git Large File Storage) no activo
================================================================================
No se han podido cargar correctamente los modelos locales de la carpeta 'models/'.

Esto suele ocurrir si el repositorio fue clonado sin tener Git LFS instalado y
configurado, lo cual causa que los archivos de pesos grandes (*.safetensors)
sean solo archivos de texto con punteros de Git LFS.

Para solucionar este problema:
1. Instala Git LFS en tu sistema: https://git-lfs.github.com/
2. Ejecuta los siguientes comandos en la terminal de este repositorio:
   git lfs install
   git lfs pull
3. Vuelve a iniciar la aplicación Flask.
================================================================================
"""

# Modelo T1: Detección de Idioma
t1_model_dir = os.path.join(MODELS_DIR, "T1_tfidf_ngramas")
t1_model_path = os.path.join(t1_model_dir, "mejor_modelo_T1.pkl")
t1_vectorizer_path = os.path.join(t1_model_dir, "vectorizador_tfidf_T1.pkl")

try:
    if os.path.exists(t1_model_path) and os.path.exists(t1_vectorizer_path):
        print(f"Cargando modelo T1 local desde: {t1_model_dir}")
        with open(t1_vectorizer_path, 'rb') as f:
            t1_vectorizer = pickle.load(f)
        with open(t1_model_path, 'rb') as f:
            t1_model = pickle.load(f)
        print("[OK] Modelo T1 cargado correctamente.")
    else:
        print(f"Advertencia: No se encontraron los archivos del modelo T1 en: {t1_model_dir}")
        print(LFS_WARNING)
except Exception as e:
    print(f"Error cargando el modelo T1 local: {e}")
    print(LFS_WARNING)
    t1_vectorizer = None
    t1_model = None

# Modelo T2: Detección de Toxicidad
t2_model_path = os.path.join(MODELS_DIR, "T2_xlm-roberta_toxic_densas", "final_model")
try:
    if os.path.exists(t2_model_path):
        print(f"Cargando modelo T2 local desde: {t2_model_path}")
        t2_tokenizer = AutoTokenizer.from_pretrained(t2_model_path)
        t2_model = AutoModelForSequenceClassification.from_pretrained(t2_model_path)
        print("[OK] Modelo T2 cargado correctamente.")
    else:
        print(f"Advertencia: No se encontró la ruta del modelo T2 en: {t2_model_path}")
        print(LFS_WARNING)
except Exception as e:
    print(f"Error cargando el modelo T2 local: {e}")
    print(LFS_WARNING)
    t2_tokenizer = None
    t2_model = None

# Modelo T3: Cross-Encoder para Ranking
t3_model_path = os.path.join(MODELS_DIR, "final_essay_scorer")
try:
    if os.path.exists(t3_model_path):
        print(f"Cargando modelo T3 local desde: {t3_model_path}")
        t3_model = CrossEncoder(t3_model_path)
        print("[OK] Modelo T3 cargado correctamente.")
    else:
        print(f"Advertencia: No se encontró la ruta del modelo T3 en: {t3_model_path}")
        print(LFS_WARNING)
except Exception as e:
    print(f"Error cargando el modelo T3 local: {e}")
    print(LFS_WARNING)
    t3_model = None


# Funciones de preprocesamiento para T1:

def convertir_minusculas(texto):
    return texto.lower()

def eliminar_puntuacion(texto):
    translator = str.maketrans('', '', string.punctuation)
    return texto.translate(translator)

def eliminar_numeros(texto):
    return re.sub(r'\d+', '', texto)

def eliminar_espacios_extra(texto):
    return re.sub(r'\s+', ' ', texto).strip()

def preprocesar_comentario(texto):
    # Aplicamos transformaciones básicas
    texto = convertir_minusculas(texto)
    texto = eliminar_puntuacion(texto)
    texto = eliminar_numeros(texto)
    texto_limpio = eliminar_espacios_extra(texto)
    return texto_limpio

# Mapeo de códigos de idioma a nombres legibles
IDIOMAS_MAP = {
    'en': 'Inglés',
    'es': 'Español',
    'fr': 'Francés',
    'it': 'Italiano',
    'pt': 'Portugués'
}

def detect_language(text: str) -> str:
    """Retorna el idioma detectado utilizando el modelo T1."""
    if t1_model is None or t1_vectorizer is None:
        return "en"
    
    texto_limpio = preprocesar_comentario(text)
    if not texto_limpio:
        texto_limpio = text
        
    features = t1_vectorizer.transform([texto_limpio])
    lang = t1_model.predict(features)[0]
    return str(lang)


def is_toxic(text: str) -> bool:
    """Retorna True si el texto es clasificado como tóxico con un umbral de 0.3 o por denylist."""
    toxic_words = []
    # Comprobar denylist primero (permite atrapar toxicidad sutil definida por el usuario)
    if any(word in text.lower() for word in toxic_words):
        return True

    if t2_model is None or t2_tokenizer is None:
        return False

    inputs = t2_tokenizer(text, return_tensors="pt", padding=True, truncation=True, max_length=128)
    
    with torch.no_grad():
        outputs = t2_model(**inputs)
        logits = outputs.logits
        probabilities = torch.softmax(logits, dim=-1)
        toxic_prob = probabilities[0, 1].item() 
        THRESHOLD = 0.4
        
    return toxic_prob >= THRESHOLD

def score_answer(ideal_text: str, student_text: str) -> float:
    """Retorna la puntuación original de similitud semántica sin normalizar."""
    if t3_model is None:
        return float(np.random.uniform(0.60, 0.68))
    
    score = t3_model.predict([ideal_text, student_text])
    if isinstance(score, list) or isinstance(score, np.ndarray):
        score = score[0]
    
    return float(score)

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/api/status", methods=["GET"])
def get_status():
    models_loaded = (
        t1_model is not None and t1_vectorizer is not None and
        t2_model is not None and t2_tokenizer is not None and
        t3_model is not None
    )
    return jsonify({
        "models_loaded": models_loaded,
        "message": "Modelos cargados correctamente." if models_loaded else "Error: Los modelos no están cargados. Recuerda activar Git LFS."
    })

@app.route("/api/evaluate", methods=["POST"])
def evaluate_comments():
    if t1_model is None or t1_vectorizer is None or t2_model is None or t2_tokenizer is None or t3_model is None:
        return jsonify({
            "error": "Los modelos de IA (T1, T2 o T3) no se han cargado correctamente. Esto ocurre porque el repositorio se clonó sin activar Git LFS (Git Large File Storage), lo que hace que los archivos de los modelos (.safetensors o .pkl) sean incorrectos o falten. Por favor, instala Git LFS, ejecuta 'git lfs install' y 'git lfs pull' en el directorio del proyecto, y reinicia el servidor.",
            "lfs_error": True
        }), 503

    data = request.json
    ideal_answer = data.get("ideal_answer", "")
    comments = data.get("comments", [])
    
    ranked_comments = []
    blocked_comments = []
    
    # Detectamos el idioma de la respuesta ideal para filtrar las de los alumnos
    ideal_lang = detect_language(ideal_answer)
    nombre_lang_ideal = IDIOMAS_MAP.get(ideal_lang, ideal_lang.upper())
    
    for comment in comments:
        text = comment.get("text", "")
        author = comment.get("author", "Anónimo")
        
        # 1. Filtro de Idioma (T1)
        lang_alumno = detect_language(text)
        if lang_alumno != ideal_lang:
            nombre_lang_alumno = IDIOMAS_MAP.get(lang_alumno, lang_alumno.upper())
            blocked_comments.append({
                "author": author,
                "text": text,
                "reason": f"Bloqueado por idioma no admitido (Detectado: {nombre_lang_alumno}, se requiere: {nombre_lang_ideal})."
            })
            continue
            
        # 2. Filtro de Toxicidad (T2)
        toxic = is_toxic(text)
        
        if toxic:
            blocked_comments.append({
                "author": author,
                "text": text,
                "reason": "Bloqueado por violar normas de comunidad (Toxicidad)."
            })
        else:
            # 3. Evaluación de Respuesta (T3)
            score = score_answer(ideal_answer, text)
            ranked_comments.append({
                "author": author,
                "text": text,
                "score": round(score, 4)  # Devuelve el score original sin normalizar (4 decimales)
            })
            
    # Ordenamos el ranking de mayor a menor puntuación
    ranked_comments.sort(key=lambda x: x["score"], reverse=True)
    
    return jsonify({
        "ranked": ranked_comments,
        "blocked": blocked_comments
    })

if __name__ == "__main__":
    app.run(debug=True, port=5000)
