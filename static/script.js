// Estado inicial del foro
let comments = [
    {
        id: 1,
        author: "Carlos Gómez",
        text: "Batch processing is for data that is already stored and does not change, like making a report at the end of the month. Stream processing is for real-time data, like detecting stolen cards instantly."
    },
    {
        id: 2,
        author: "Ana López",
        text: "Honestly, stream processing is garbage, batch is much better and those who use stream are idiots who don't know how to program."
    },
    {
        id: 3,
        author: "Laura Martínez",
        text: "I think the main difference is latency. Stream processing has very low latency (milliseconds) and analyzes data in motion. Batch has high latency and processes massive static volumes."
    },
    {
        id: 4,
        author: "Troll99",
        text: "This question is stupid and the teacher is useless, I am not going to answer anything."
    },
    {
        id: 5,
        author: "Pedro Ruiz",
        text: "Batch processing is for large files and databases. Stream processing is for live events and messaging systems."
    },
    {
        id: 6,
        author: "Sofía Castro",
        text: "Batch is bad because it is very slow, and stream is good because it is fast. That's all."
    },
    {
        id: 7,
        author: "Javier Sanz",
        text: "The people who prefer batch processing probably struggle to understand how real-time applications even work."
    },
    {
        id: 8,
        author: "Diego Ferrer",
        text: "It is hilarious how completely wrong some of these answers are, did you guys even study?"
    }
];

// Renderizar comentarios en el foro
function renderComments() {
    const list = document.getElementById('commentsList');
    list.innerHTML = '';
    
    comments.forEach(c => {
        const div = document.createElement('div');
        div.className = 'comment-card';
        div.innerHTML = `
            <div class="comment-author">${c.author}</div>
            <div class="comment-text">${c.text}</div>
        `;
        list.appendChild(div);
    });
}

// Añadir nuevo comentario
document.getElementById('addCommentBtn').addEventListener('click', () => {
    const authorInput = document.getElementById('newAuthorName');
    const textInput = document.getElementById('newCommentText');
    
    if(!authorInput.value.trim() || !textInput.value.trim()) {
        alert("Por favor rellena tu nombre y la respuesta.");
        return;
    }
    
    comments.push({
        id: Date.now(),
        author: authorInput.value.trim(),
        text: textInput.value.trim()
    });
    
    authorInput.value = '';
    textInput.value = '';
    renderComments();
    
    // Ocultar resultados previos si se añade un comentario nuevo
    document.getElementById('resultsContainer').style.display = 'none';
});

// Ejecutar Pipeline IA
document.getElementById('evaluateBtn').addEventListener('click', async () => {
    const btn = document.getElementById('evaluateBtn');
    const idealAnswer = document.getElementById('idealAnswerInput').value;
    
    btn.classList.add('loading');
    btn.innerHTML = '<span>⏳ Evaluando con T2 y T3...</span>';
    
    try {
        const response = await fetch('/api/evaluate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                ideal_answer: idealAnswer,
                comments: comments
            })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            alert(data.error || "Error al procesar la evaluación.");
            btn.classList.remove('loading');
            btn.innerHTML = '<span>🚀 Ejecutar Pipeline IA</span>';
            return;
        }
        
        renderResults(data.ranked, data.blocked);
        document.getElementById('resultsContainer').style.display = 'block';
    } catch (error) {
        alert("Error al conectar con el servidor IA.");
        console.error(error);
    } finally {
        btn.classList.remove('loading');
        btn.innerHTML = '<span>🚀 Ejecutar Pipeline IA</span>';
    }
});

// Renderizar resultados de la IA
function renderResults(ranked, blocked) {
    const rankedList = document.getElementById('rankingList');
    const blockedList = document.getElementById('blockedList');
    
    rankedList.innerHTML = '';
    blockedList.innerHTML = '';
    
    if (ranked.length === 0) {
        rankedList.innerHTML = '<p class="subtitle">No hay respuestas válidas.</p>';
    } else {
        ranked.forEach((item, index) => {
            let rankClass = 'rank-low';
            if (item.score >= 60) {
                rankClass = 'rank-high';
            } else if (item.score >= 30) {
                rankClass = 'rank-medium';
            }
            
            const div = document.createElement('div');
            div.className = `ranked-item ${rankClass}`;
            div.innerHTML = `
                <div class="score-badge">#${index + 1}</div>
                <div class="ranked-content">
                    <h4>${item.author}</h4>
                    <p>${item.text}</p>
                </div>
            `;
            rankedList.appendChild(div);
        });
    }
    
    if (blocked.length === 0) {
        blockedList.innerHTML = '<p class="subtitle">No se detectó toxicidad.</p>';
    } else {
        blocked.forEach(item => {
            const div = document.createElement('div');
            div.className = 'blocked-item';
            div.innerHTML = `
                <div class="ranked-content">
                    <h4>${item.author} <span style="color:var(--danger)">[Bloqueado]</span></h4>
                    <p>${item.text}</p>
                    <div class="blocked-reason">⚠️ ${item.reason}</div>
                </div>
            `;
            blockedList.appendChild(div);
        });
    }
}

// Comprobar estado de los modelos locales
async function checkModelStatus() {
    try {
        const response = await fetch('/api/status');
        const data = await response.json();
        const statusBadge = document.getElementById('aiStatus');
        const errorBanner = document.getElementById('lfsErrorBanner');
        
        if (data.models_loaded) {
            statusBadge.textContent = 'Modelos NLP: Activos';
            statusBadge.style.background = 'rgba(16, 185, 129, 0.1)';
            statusBadge.style.color = 'var(--success)';
            statusBadge.style.borderColor = 'rgba(16, 185, 129, 0.2)';
            if (errorBanner) errorBanner.style.display = 'none';
        } else {
            statusBadge.textContent = 'Modelos NLP: Inactivos (LFS Requerido)';
            statusBadge.style.background = 'rgba(239, 68, 68, 0.1)';
            statusBadge.style.color = 'var(--danger)';
            statusBadge.style.borderColor = 'rgba(239, 68, 68, 0.2)';
            if (errorBanner) errorBanner.style.display = 'flex';
        }
    } catch (error) {
        console.error("Error al comprobar el estado de los modelos:", error);
    }
}

// Init
renderComments();
checkModelStatus();
