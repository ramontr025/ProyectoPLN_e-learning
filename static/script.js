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

// Renderizar comentarios en el foro con sus evaluaciones
function renderComments() {
    const list = document.getElementById('commentsList');
    list.innerHTML = '';
    
    comments.forEach((c, index) => {
        const div = document.createElement('div');
        div.className = 'comment-card';
        
        let evaluationHTML = '';
        if (c.blocked) {
            div.classList.add('comment-blocked');
            evaluationHTML = `
                <span class="danger-badge">⚠️ ${c.reason}</span>
            `;
            div.innerHTML = `
                <div class="comment-header-row">
                    <div class="comment-author">${c.author} <span style="color:var(--danger)">[Filtrado]</span></div>
                    ${evaluationHTML}
                </div>
                <div class="comment-text">${c.text}</div>
            `;
        } else if (c.score !== undefined) {
            let rankClass = 'rank-low';
            if (c.score >= 0.65) {
                rankClass = 'rank-high';
            } else if (c.score >= 0.62) {
                rankClass = 'rank-medium';
            }
            div.classList.add(rankClass);
            
            evaluationHTML = `
                <span class="score-badge-inline ${rankClass}">Puesto #${c.rank}</span>
            `;
            
            div.innerHTML = `
                <div class="comment-header-row">
                    <div class="comment-author">${c.author}</div>
                    ${evaluationHTML}
                </div>
                <div class="comment-text">${c.text}</div>
            `;
        } else {
            div.innerHTML = `
                <div class="comment-author">${c.author}</div>
                <div class="comment-text">${c.text}</div>
            `;
        }
        
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
    
    // Ocultar ordenamiento y resetear estados cuando hay comentarios nuevos no evaluados
    document.getElementById('sortControls').style.display = 'none';
    comments.forEach((c, idx) => {
        c.originalIndex = idx;
        delete c.score;
        delete c.rank;
        delete c.blocked;
        delete c.reason;
    });
    
    renderComments();
});

// Ejecutar Pipeline IA
document.getElementById('evaluateBtn').addEventListener('click', async () => {
    const btn = document.getElementById('evaluateBtn');
    const idealAnswer = document.getElementById('idealAnswerInput').value;
    
    btn.classList.add('loading');
    btn.innerHTML = '<span>⏳ Evaluando con IA...</span>';
    
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
        
        // Mapear resultados de vuelta a nuestros comentarios locales
        comments.forEach((c, index) => {
            if (c.originalIndex === undefined) {
                c.originalIndex = index;
            }
            
            // Buscar si está en blocked
            const blockedMatch = data.blocked.find(b => b.text === c.text);
            if (blockedMatch) {
                c.blocked = true;
                c.reason = blockedMatch.reason;
                c.score = undefined;
                c.rank = undefined;
            } else {
                // Buscar si está en ranked
                const rankedIndex = data.ranked.findIndex(r => r.text === c.text);
                if (rankedIndex !== -1) {
                    c.blocked = false;
                    c.score = data.ranked[rankedIndex].score;
                    c.rank = rankedIndex + 1;
                    c.reason = undefined;
                }
            }
        });
        
        // Mostrar controles de ordenamiento
        document.getElementById('sortControls').style.display = 'flex';
        renderComments();
        
    } catch (error) {
        alert("Error al conectar con el servidor IA.");
        console.error(error);
    } finally {
        btn.classList.remove('loading');
        btn.innerHTML = '<span>🚀 Ejecutar Pipeline IA</span>';
    }
});

// Controles de Ordenamiento
document.getElementById('sortByScoreBtn').addEventListener('click', () => {
    comments.sort((a, b) => {
        const scoreA = a.score !== undefined ? a.score : -1;
        const scoreB = b.score !== undefined ? b.score : -1;
        return scoreB - scoreA;
    });
    renderComments();
});

document.getElementById('sortByOriginalBtn').addEventListener('click', () => {
    comments.sort((a, b) => {
        const idxA = a.originalIndex !== undefined ? a.originalIndex : 0;
        const idxB = b.originalIndex !== undefined ? b.originalIndex : 0;
        return idxA - idxB;
    });
    renderComments();
});

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
