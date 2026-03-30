let allHeroes = [], allItems = {}, allAbilities = {};
let activeStats = ["str", "agi", "int", "all"];

document.addEventListener("DOMContentLoaded", async () => {
    try {
        const [h, i, a] = await Promise.all([
            fetch("/api/heroes").then(r => r.json()),
            fetch("https://api.opendota.com/api/constants/items").then(r => r.json()),
            fetch("https://api.opendota.com/api/constants/abilities").then(r => r.json())
        ]);
        allHeroes = h; allItems = i; allAbilities = a;
        renderHeroes(allHeroes);
        initEvents();
    } catch (e) { console.error("Error cargando la base de datos:", e); }
});

function initEvents() {
    // Eventos de Chat
    document.getElementById("send-button").onclick = sendMessage;
    document.getElementById("chat-input").onkeydown = (e) => e.key === "Enter" && sendMessage();
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

function showHeroDetail(id) {
    const hero = allHeroes.find(h => h.id === id);
    const container = document.getElementById("content-area");
    document.getElementById("filter-bar").style.display = "none";
    container.className = "detail-view";

    // Buscar habilidades reales del heroe
    const shortName = hero.name.replace("npc_dota_hero_", "");
    const skills = Object.values(allAbilities).filter(a => a.name && a.name.includes(shortName)).slice(0, 5);

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
                    <div class="skill-item">
                        <img src="https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react/abilities/${s.name}.png" onerror="this.src='https://via.placeholder.com/64'">
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
    win.style.display = (win.style.display === "flex") ? "none" : "flex";
}

async function sendMessage() {
    const input = document.getElementById("chat-input");
    const text = input.value.trim();
    if(!text) return;

    const chatBody = document.getElementById("chat-messages");
    chatBody.innerHTML += `<div class="msg user">${text}</div>`;
    input.value = "";
    chatBody.scrollTop = chatBody.scrollHeight;

    try {
        const response = await fetch("/api/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message: text })
        });
        const data = await response.json();
        chatBody.innerHTML += `<div class="msg ai">${marked.parse(data.reply)}</div>`;
    } catch (e) {
        chatBody.innerHTML += `<div class="msg ai">Error: No pude conectar con la IA.</div>`;
    }
    chatBody.scrollTop = chatBody.scrollHeight;
}