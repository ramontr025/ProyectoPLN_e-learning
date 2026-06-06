# Procesamiento del Lenguaje Natural aplicado a E-Learning 

Este repositorio contiene la implementación y el despliegue de un pipeline interactivo de Procesamiento del Lenguaje Natural (PLN) diseñado para plataformas de E-Learning. Su objetivo es automatizar tres de los flujos más críticos en foros y aulas virtuales masivas (LMS/MOOCs):

1. **Detección Automática de Idioma (T1 - Filtro de Coherencia Lingüística)**: Detección y validación del idioma del comentario de los estudiantes para verificar que coincide con el idioma de la pregunta o rúbrica de referencia provista por el profesor (soporta inglés, español, francés, italiano y portugués).
2. **Moderación de Espacios Seguros (T2 - Detección de Toxicidad)**: Filtrado automático de comentarios y respuestas ofensivas, acoso, sarcasmo hostil o lenguaje inapropiado, gestionando el desbalance de clases y protegiendo la variación dialectal para evitar la discriminación.
3. **Evaluación Formativa Inteligente (T3 - Similitud Semántica y Ranking)**: Ordenación (ranking) de las respuestas de los estudiantes en función de su similitud semántica con una respuesta modelo o rúbrica de referencia provista por el profesor, facilitando al docente el proceso de retroalimentación (*feedback*) al priorizar las respuestas por revisar.

El sistema se compone de un clasificador estadístico (T1), dos modelos Transformers ajustados finamente (*fine-tuned* para T2 y T3) y un panel interactivo web glassmórfico desarrollado en **Flask**, que permite simular el comportamiento del pipeline en tiempo real de forma integrada.

---

## Estructura del Repositorio

La arquitectura del proyecto está organizada de la siguiente manera:

```text
ProyectoPLN_e-learning/
├── T1/                                     # Tarea 1: Identificación de Idioma
│   ├── T1_PLN.ipynb                        # Notebook de entrenamiento y validación de T1
│   └── dataset/                            # Corpus de entrenamiento y test (CSV)
├── T2/                                     # Tarea 2: Moderación y Toxicidad
│   ├── Implementación_T2.ipynb             # Notebook de entrenamiento y validación de T2
│   └── data/                               # Datos y corpus de Jigsaw
├── T3/                                     # Tarea 3: Similitud y Evaluación
│   ├── Implementación_T3.ipynb             # Notebook de entrenamiento y validación de T3
│   └── data/                               # Datos de entrenamiento (ASAP-AES)
├── models/                                 # Directorio para almacenar modelos finales entrenados
│   ├── T1_tfidf_ngramas/                   # Carpeta del vectorizador y modelo clasificador T1 (.pkl)
│   │   ├── mejor_modelo_T1.pkl             # Clasificador de Regresión Logística entrenado
│   │   └── vectorizador_tfidf_T1.pkl       # Vectorizador TF-IDF con n-gramas a nivel de carácter
│   ├── T2_xlm-roberta_toxic_densas/        # Carpeta del clasificador de toxicidad T2
│   │   └── final_model/                    # Pesos y tokenizador guardados de T2
│   └── final_essay_scorer/                 # Pesos y tokenizador del Cross-Encoder de T3
├── templates/
│   └── index.html                          # Interfaz de usuario (HTML5 con diseño adaptativo)
├── static/
│   ├── style.css                           # Hojas de estilo modernas (Glassmorphism UI)
│   └── script.js                           # Control de interacción en el cliente y llamadas a la API
├── pipeline_app.py                         # Servidor Flask e integración del pipeline NLP
├── requirements.txt                        # Lista de dependencias del entorno python
└── README.md                               # Documentación del proyecto (este archivo)
```

---

## Requisitos de Entorno y Dependencias

El proyecto se ha desarrollado y evaluado utilizando **Python 3** (entorno estándar de Google Colab). Para asegurar el correcto funcionamiento de los notebooks de entrenamiento y la aplicación web, se recomiendan las siguientes versiones de dependencias:

| Librería | Versión Mínima Recomendada | Propósito |
| :--- | :---: | :--- |
| **PyTorch** (`torch`) | `2.1.0` | Backend de deep learning y tensores. |
| **Transformers** (`transformers`) | `4.35.0` | Carga de XLM-RoBERTa, tokenizadores y APIs de entrenamiento. |
| **Sentence-Transformers** | `3.0.0` | Framework de embeddings de frases y uso de arquitecturas Cross-Encoder. |
| **Datasets** (`datasets`) | `2.15.0` | Carga y mapeo eficiente de datasets de Hugging Face. |
| **Flask** (`flask`) | `2.2.0` | Servidor web para el despliegue del pipeline interactivo. |
| **Pandas** (`pandas`) | `2.0.0` | Manipulación y análisis exploratorio de datos estructurados. |
| **NumPy** (`numpy`) | `1.24.0` | Operaciones matemáticas y vectoriales rápidas. |
| **Scikit-Learn** (`scikit-learn`) | `1.2.0` | Métricas de evaluación (F1-Score, Curvas ROC/PR, splits). |
| **SciPy** (`scipy`) | `1.10.0` | Cálculo de métricas estadísticas de correlación (Spearman). |


> Puedes configurar rápidamente tu entorno de ejecución instalando el archivo `requirements.txt` adjunto en este repositorio:
> ```bash
> pip install -r requirements.txt
> ```

---

## Tiempos Estimados de Ejecución (CPU vs. GPU)

Las demandas computacionales varían significativamente entre la fase de entrenamiento y la fase de despliegue:

### 1. Fase de Entrenamiento (Notebooks `.ipynb`)

* **En GPU (Recomendado - T4 / V100 / A100)**:
  * **T2 (Toxicidad)**: **~1 horas**. El entrenamiento realiza una congelación (*freeze*) del encoder XLM-RoBERTa (12 capas) entrenando únicamente el clasificador pooler (<1% de parámetros), procesando las 5 épocas sobre el conjunto depurado de Jigsaw en ese intervalo.
  * **T3 (Similitud)**: **~2 horas**. Fine-tuning completo de la arquitectura Cross-Encoder de DistilRoBERTa sobre el dataset de ensayos cortos durante 4 épocas con parada temprana (*Early Stopping*).
  * **Total GPU**: **~3 horas** para reproducir ambos notebooks secuencialmente.
* **En CPU**:
  * **T2 / T3**: **Prácticamente inviable (>20-30 horas por notebook)**. Al procesar matrices de alta dimensionalidad y ejecutar propagación hacia atrás sin aceleración de hardware paralela, el tiempo se vuelve prohibitivo para propósitos de desarrollo práctico.

### 2. Fase de Despliegue y Servicio (`pipeline_app.py`)

* **Tiempo de Inicio/Carga de Modelos**:
  * **GPU/CPU**: Carga inicial única de modelos de unos **5 a 10 segundos** al arrancar la aplicación Flask (dependiendo de la velocidad de lectura de disco para leer los pesos pesados de los Transformers).
* **Tiempo de Inferencia (API `/api/evaluate`)**:
  * **En GPU**: **Inmediato (<100 ms por petición)**. El cálculo de toxicidad en paralelo y la clasificación de similitud se ejecutan de manera instantánea.
  * **En CPU**: **Rápido / Interactivo (~1 a 2 segundos por evaluación completa)**. Evaluar una lista de 8-10 respuestas en un hilo de CPU tarda alrededor de 1.5 segundos, lo cual es perfectamente aceptable para una interacción en tiempo real en la interfaz.

---

## Instrucciones de Reproducción

Sigue estos pasos detallados para entrenar los modelos y ejecutar el pipeline interactivo localmente:

### Paso 1: Clonación y Preparación del Entorno (Requiere Git LFS)

Este repositorio almacena los pesos de los modelos de Deep Learning utilizando **Git LFS (Git Large File Storage)**. Antes de clonar el repositorio, debes tener instalado Git LFS en tu sistema para asegurar que los archivos grandes de pesos (`*.safetensors`) se descarguen correctamente en lugar de descargarse como punteros de texto.

1. **Instalar Git LFS** (si aún no lo tienes):
   - Descárgalo e instálalo desde [git-lfs.github.com](https://git-lfs.github.com/) o usa un gestor de paquetes.
   - Abre la terminal e inicialízalo de manera global una sola vez:
     ```bash
     git lfs install
     ```

2. **Clonar el repositorio**:
   ```bash
   git clone https://github.com/ramontr025/ProyectoPLN_e-learning.git
   cd ProyectoPLN_e-learning
   ```
   *(Si ya clonaste el repositorio sin tener instalado Git LFS, puedes descargar los archivos reales de los modelos ejecutando `git lfs pull` dentro de la carpeta del proyecto).*

3. **Crea un entorno virtual e instala las dependencias**:
   ```bash
   python -m venv venv
   # Activar en Windows:
   venv\Scripts\activate
   # Activar en Linux/macOS:
   source venv/bin/activate

   pip install -r requirements.txt
   ```

### Paso 2: Ejecución de los Notebooks (Entrenamiento de Modelos) (NO NECESARIO, YA ESTÁN EJECUTADOS)
Si deseas entrenar los modelos desde cero:
1. Abre los cuadernos en un entorno con Jupyter Notebook o súbelos a **Google Colab** (se sugiere activar el acelerador de hardware por GPU en *Entorno de ejecución > Cambiar tipo de entorno de ejecución > T4 GPU* para T2 y T3).
2. **Notebook T1** (`T1/T1_PLN.ipynb`):
   * Carga el dataset de entrenamiento (`dataset-idiomas-train.csv`) con textos en 5 idiomas.
   * Ejecuta el pipeline de preprocesamiento, genera el vectorizador TF-IDF con n-gramas a nivel de carácter (rango 3-5) y evalúa los clasificadores (Naive Bayes, Regresión Logística y Linear SVM).
   * Tras la validación, exporta el vectorizador (`vectorizador_tfidf_T1.pkl`) y el mejor modelo (`mejor_modelo_T1.pkl`) a la carpeta `models/T1_tfidf_ngramas/`.
3. **Notebook T2** (`T2/Implementación_T2.ipynb`):
   * Carga los datos de Jigsaw correspondientes. El código descargará, procesará y entrenará un modelo clasificador de toxicidad basado en `xlm-roberta-base`.
   * El notebook guardará automáticamente el mejor checkpoint en una ruta local. Asegúrate de mover los archivos resultantes a la carpeta del proyecto en `models/T2_xlm-roberta_toxic_densas/final_model/`.
4. **Notebook T3** (`T3/Implementación_T3.ipynb`):
   * Carga los datos de ASAP-AES (`T3/data/train.tsv`).
   * Evalúa la base *zero-shot* (Spearman: `0.2807`) y entrena el Cross-Encoder (`cross-encoder/stsb-distilroberta-base`).
   * Tras finalizar, el modelo reentrenado mejora el rendimiento logrando una Correlación de Spearman en validación de **`0.8378`**.
   * Guarda los pesos y muévelos a la carpeta `models/final_essay_scorer/`.

> [!IMPORTANT]
> **Requisito de Modelos Locales y Git LFS**:
> Por motivos de consistencia metodológica y para evitar confusiones, la aplicación Flask (`pipeline_app.py`) **no utiliza modelos de simulación alternativos**. Si los archivos locales no están presentes o si sus pesos reales no se descargaron (es decir, si son solo punteros de Git LFS), la aplicación detendrá la ejecución de la evaluación y mostrará una advertencia detallada en la consola del servidor y en la interfaz de usuario web, solicitando la inicialización y descarga de los archivos de modelos vía Git LFS.

### Paso 3: Despliegue de la Aplicación Interactiva Web
Una vez configurados los archivos del modelo (o en modo simulación), ejecuta la aplicación de servicio localmente:
```bash
python pipeline_app.py
```
El servidor web se iniciará por defecto en el puerto `5000`:
* Consola: `* Running on http://127.0.0.1:5000`
* Abre tu navegador preferido e ingresa a **[http://127.0.0.1:5000](http://127.0.0.1:5000)**.

### Paso 4: Pruebas y Validación en la Interfaz
1. **Rúbrica**: En la parte superior de la interfaz, el profesor puede modificar la "Respuesta Ideal" de referencia.
2. **Interactuar con Respuestas**: Puedes escribir y enviar respuestas de nuevos alumnos usando el formulario inferior.
3. **Filtro y Ranking**: Haz clic en el botón **🚀 Ejecutar Pipeline IA**. 
   * La aplicación llamará al endpoint `/api/evaluate`.
   * **Filtro T1 (Detección de Idioma)**: Detecta si el idioma del comentario coincide con el de la respuesta de referencia del profesor. Si son diferentes (ej. el alumno responde en Español a una pregunta en Inglés), marca el comentario directamente como bloqueado con una etiqueta descriptiva.
   * **Filtro T2 (Detección de Toxicidad)**: Identifica y filtra mensajes que violen las normas de convivencia escolar (tales como las respuestas hostiles precargadas de *Ana López* o *Troll99*).
   * **Ranking T3 (Evaluación Semántica)**: Evalúa las respuestas válidas restantes según su similitud con la rúbrica del docente y las muestra ordenadas por nota. Permite ordenar la vista por nota u orden temporal de forma interactiva.

---

## Resumen de Resultados Metodológicos

* **Clasificador de Idioma T1**: Se diseñó una estrategia estadística robusta basada en la combinación de un vectorizador TF-IDF con n-gramas de caracteres de longitud 3 a 5 (analizados a nivel de char para mitigar el efecto de palabras fuera de vocabulario) y un clasificador de Regresión Logística.
  * **Accuracy en Validación**: **0.9796** (superando a Naive Bayes Multinomial y Linear SVM).
  * **Accuracy en Test (Mensajes Nuevos)**: **0.8900** (demostrando una gran robustez ante variaciones lingüísticas y vocabulario no visto).
* **Clasificador de Toxicidad T2**: El uso de `ImbalancedTrainer` resolvió el severo desbalance de la base de Jigsaw Wikipedia, y la congelación del Transformer previno el olvido catastrófico manteniendo F1 robustos en idiomas como español y portugués sin sobreajuste.
* **Evaluador de Respuestas T3**: La transformación del problema de regresión semántica tradicional a una tarea orientada al orden de prioridad (*Ranking*) usando la métrica de Spearman se tradujo en una alíneación excelente con el criterio docente.
  * **Línea base Zero-Shot**: Spearman de **0.2807**
  * **Modelo Ajustado (Fine-Tuned Cross-Encoder)**: Spearman de **0.8378** (Incremento sustancial de alineación).
