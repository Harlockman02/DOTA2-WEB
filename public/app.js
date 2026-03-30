let allHeroes = [], allItems = {}, allAbilities = {};
let activeStats = ["str", "agi", "int", "all"];

function escapeHtml(str) {
    if (!str) return "";
    return str.replace(/[&<>"]+/g, s => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[s]));
}

function addIconsToText(text) {
    if (!text) return "";

    return text.replace(/\[([^\]]+)\]/g, (full, name) => {
        const nameLower = name.toLowerCase().trim();
        const hero = allHeroes.find(h => h.localized_name && h.localized_name.toLowerCase() === nameLower);
        if (hero) {
            return `<img src="https://cdn.cloudflare.steamstatic.com${hero.img}" class="chat-inline-icon" alt="${escapeHtml(hero.localized_name)}" title="${escapeHtml(hero.localized_name)}"> ${escapeHtml(name)}`;
        }
        const item = Object.values(allItems).find(i => i.dname && i.dname.toLowerCase() === nameLower);
        if (item) {
            return `<img src="https://cdn.cloudflare.steamstatic.com${item.img}" class="chat-inline-icon" alt="${escapeHtml(item.dname)}" title="${escapeHtml(item.dname)}"> ${escapeHtml(name)}`;
        }
        return escapeHtml(full);
    });
}

document.addEventListener("DOMContentLoaded", async () => {
    try {
        const [h, i, a] = await Promise.all([
            fetch("/api/heroes").then(r => r.json()),
            fetch("https://api.opendota.com/api/constants/items").then(r => r.json()),
            fetch("/api/abilities").then(r => r.json())
        ]);
        allHeroes = h; allItems = i; allAbilities = a;
        renderHeroes(allHeroes);
        initEvents();
    } catch (e) { console.error("Error cargando la base de datos:", e); }
});

function translateDesc(text) {
    if (!text) return text;
    return fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text })
    }).then(r => r.json()).then(d => d.translation).catch(() => text);
}

function initEvents() {
    // Eventos de Chat
    document.getElementById("send-button").onclick = sendMessage;
    document.getElementById("chat-input").onkeydown = (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };
    document.getElementById("fab-open-chat").onclick = toggleChat;
    document.getElementById("chat-close-btn").onclick = toggleChat;

    // Tabs
    document.getElementById("btn-heroes").onclick = () => {
        setActiveTab("btn-heroes");
        renderHeroes(allHeroes);
    };
    document.getElementById("btn-items").onclick = () => {
        setActiveTab("btn-items");
        renderItems();
    };

    // Filtros
    document.querySelectorAll(".stat-btn").forEach(btn => {
        btn.onclick = () => {
            btn.classList.toggle("active");
            const stat = btn.dataset.stat;
            activeStats = activeStats.includes(stat) ? activeStats.filter(s => s !== stat) : [...activeStats, stat];
            applyFilters();
        };
    });

    document.getElementById("search-input").oninput = applyFilters;
}

function setActiveTab(id) {
    document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
    document.getElementById(id).classList.add("active");
}

function applyFilters() {
    const term = document.getElementById("search-input").value.toLowerCase();
    const filtered = allHeroes.filter(h => {
        const attr = h.primary_attr === "str" ? "str" : h.primary_attr === "agi" ? "agi" : h.primary_attr === "int" ? "int" : "all";
        return activeStats.includes(attr) && h.localized_name.toLowerCase().includes(term);
    });
    renderHeroes(filtered);
}

function renderHeroes(data) {
    const container = document.getElementById("content-area");
    container.className = "content-grid";
    document.getElementById("filter-bar").style.display = "flex";
    container.innerHTML = data.map(h => `
        <div class="hero-card" onclick="showHeroDetail(${h.id})">
            <img src="https://cdn.cloudflare.steamstatic.com${h.img}">
            <p>${h.localized_name}</p>
        </div>
    `).join("");
}

function renderItems() {
    const container = document.getElementById("content-area");
    document.getElementById("filter-bar").style.display = "none";
    container.className = "content-grid";
    const items = Object.values(allItems).filter(i => i.dname && i.cost > 0).slice(0, 60);
    container.innerHTML = items.map(i => `
        <div class="hero-card">
            <img src="https://cdn.cloudflare.steamstatic.com${i.img}">
            <p>${i.dname} <br> <span style="color:#ffd700">${i.cost}</span></p>
        </div>
    `).join("");
}

async function showHeroDetail(id) {
    const hero = allHeroes.find(h => h.id === id);
    const container = document.getElementById("content-area");
    document.getElementById("filter-bar").style.display = "none";
    container.className = "detail-view";

    // Buscar habilidades reales del heroe
    const shortName = hero.name.replace("npc_dota_hero_", "");
    let skills = Object.entries(allAbilities).filter(([key, value]) => key.startsWith(shortName + "_") && !key.includes("special_bonus")).map(([key, value]) => ({ name: key, ...value })).slice(0, 5);
    
    // Traducir descripciones
    skills = await Promise.all(skills.map(async s => ({ ...s, desc: await translateDesc(s.desc) })));

    container.innerHTML = `
        <button class="back-btn" onclick="renderHeroes(allHeroes)">← Volver</button>
        <div class="detail-header">
            <img src="https://cdn.cloudflare.steamstatic.com${hero.img}" class="portrait">
            <div>
                <h2>${hero.localized_name}</h2>
                <div class="roles">${hero.roles.map(r => `<span>${r}</span>`).join("")}</div>
            </div>
        </div>

        <div class="section">
            <h3>Habilidades Principales</h3>
            <div class="flex-row">
                ${skills.map(s => `
                    <div class="skill-item" title="${s.desc || 'Descripción no disponible'}">
                        <img src="https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react/abilities/${s.name}.png" onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjQiIGhlaWdodD0iNjQiIHZpZXdCb3g9IjAgMCA2NCA2NCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjY0IiBoZWlnaHQ9IjY0IiBmaWxsPSIjY2NjIi8+Cjx0ZXh0IHg9IjMyIiB5PSIzNCIgZm9udC1zaXplPSIxNiIgZmlsbD0iIzk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSI+U2tpbGw8L3RleHQ+Cjwvc3ZnPg=='">
                        <small>${s.dname || 'Skill'}</small>
                    </div>
                `).join("")}
            </div>
        </div>

        <div class="section">
            <h3>Talentos</h3>
            <div class="talent-box">
                <div class="t-line"><span>+2s Stun</span> <b>25</b> <span>+25% Evasion</span></div>
                <div class="t-line"><span>+50 Damage</span> <b>20</b> <span>+150 Range</span></div>
                <div class="t-line"><span>+250 Health</span> <b>15</b> <span>+15 All Stats</span></div>
            </div>
        </div>
    `;
}

// LÓGICA DEL CHAT
function toggleChat() {
    const win = document.getElementById("chat-window");
    const isVisible = win.style.display === "flex";
    win.style.display = isVisible ? "none" : "flex";
    if (!isVisible) {
        setTimeout(() => {
            const input = document.getElementById("chat-input");
            input.focus();
            input.select();
        }, 100);
    }
}

async function sendMessage() {
    const input = document.getElementById("chat-input");
    const text = input.value.trim();
    if (!text) return;

    const chatBody = document.getElementById("chat-messages");
    const userMessage = addIconsToText(escapeHtml(text));
    chatBody.innerHTML += `<div class="msg user">${userMessage}</div>`;
    input.value = "";
    chatBody.scrollTop = chatBody.scrollHeight;

    try {
        const response = await fetch("/api/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message: text })
        });
        const data = await response.json();
        const aiRaw = data.reply || "";
        const aiWithIcons = addIconsToText(escapeHtml(aiRaw));
        chatBody.innerHTML += `<div class="msg ai">${aiWithIcons}</div>`;
    } catch (e) {
        chatBody.innerHTML += `<div class="msg ai">Error: No pude conectar con la IA.</div>`;
    }
    chatBody.scrollTop = chatBody.scrollHeight;
}