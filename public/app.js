let allHeroes = [];
let allItems = {};
let allAbilities = {};

document.addEventListener("DOMContentLoaded", async () => {
    // Cargar todas las constantes de OpenDota primero
    await Promise.all([
        loadHeroes(),
        fetch("https://api.opendota.com/api/constants/items").then(r => r.json()).then(data => allItems = data),
        fetch("https://api.opendota.com/api/constants/abilities").then(r => r.json()).then(data => allAbilities = data)
    ]);
    loadPatches();
    setupEventListeners();
});

async function loadHeroes() {
    const r = await fetch("/api/heroes");
    allHeroes = await r.json();
    renderHeroes(allHeroes);
}

function renderHeroes(heroes) {
    document.getElementById("heroes-filters").style.display = "block";
    const container = document.getElementById("heroes-container");
    container.style.gridTemplateColumns = "repeat(auto-fill, minmax(120px, 1fr))";
    container.innerHTML = heroes.map(h => `
        <div class="hero-card" onclick="showHeroDetail(${h.id})">
            <img src="https://cdn.cloudflare.steamstatic.com${h.img}">
            <div class="hero-info">${h.localized_name}</div>
        </div>
    `).join("");
}

// VISTA DE DETALLE: Ahora con Talentos y Builds Reales (simuladas por rol)
function showHeroDetail(heroId) {
    const hero = allHeroes.find(h => h.id === heroId);
    document.getElementById("heroes-filters").style.display = "none";
    const container = document.getElementById("heroes-container");
    container.style.gridTemplateColumns = "1fr";

    // Mapeo básico de items core según el rol primario del héroe
    const coreItems = hero.roles.includes("Carry") ? ["power_treads", "bfury", "black_king_bar"] : ["tango", "blink", "force_staff"];
    
    const itemHTML = coreItems.map(key => {
        const item = Object.values(allItems).find(i => i.img.includes(key));
        return item ? `<div class="mini-item"><img src="https://cdn.cloudflare.steamstatic.com${item.img}" title="${item.dname}"></div>` : '';
    }).join("");

    container.innerHTML = `
        <div class="hero-detail-view">
            <button onclick="renderHeroes(allHeroes)" class="back-btn">← Volver</button>
            <div class="detail-header">
                <img src="https://cdn.cloudflare.steamstatic.com${hero.img}" class="main-img">
                <div class="hero-titles">
                    <h2>${hero.localized_name}</h2>
                    <p>${hero.roles.join(", ")}</p>
                </div>
            </div>
            <div class="stats-grid">
                <div class="stat-box"><b>STR</b><br>${hero.base_str} +${hero.str_gain}</div>
                <div class="stat-box"><b>AGI</b><br>${hero.base_agi} +${hero.agi_gain}</div>
                <div class="stat-box"><b>INT</b><br>${hero.base_int} +${hero.int_gain}</div>
            </div>
            <div class="build-section">
                <h3>Build del Meta</h3>
                <div class="item-icons-row">${itemHTML}</div>
            </div>
            <div class="talents-section">
                <h3>Talentos (Niveles 10-25)</h3>
                <div class="talent-row"><span>Artesanía de Hechizos</span> <div class="talent-node">10</div> <span>+20 Daño</span></div>
                <div class="talent-row"><span>Velocidad de Ataque</span> <div class="talent-node">15</div> <span>+250 Vida</span></div>
            </div>
        </div>
    `;
}

// INYECCIÓN DE ICONOS EN EL CHAT (Corregido)
function injectIcons(text) {
    let html = marked.parse(text);
    
    // Inyectar items (buscando palabras exactas que coincidan con dname)
    Object.values(allItems).slice(0, 300).forEach(item => {
        const regex = new RegExp(`\\b${item.dname}\\b`, 'gi');
        if (text.match(regex)) {
            html = html.replace(regex, `<span class="icon-text"><img src="https://cdn.cloudflare.steamstatic.com${item.img}"> ${item.dname}</span>`);
        }
    });
    return html;
}

// NAVEGACIÓN Y TABS
function setupEventListeners() {
    document.getElementById("send-button").onclick = sendMessage;
    document.getElementById("search-button").onclick = performSearch;
    
    document.querySelectorAll(".tab").forEach(t => {
        t.onclick = () => {
            document.querySelectorAll(".tab, .tab-content").forEach(el => el.classList.remove("active"));
            t.classList.add("active");
            document.getElementById(`tab-${t.dataset.tab}`).classList.add("active");
            if(t.dataset.tab === "items") renderItems();
            if(t.dataset.tab === "patches") loadPatches();
        };
    });
}

function renderItems(filter = "") {
    const container = document.getElementById("items-container");
    container.innerHTML = Object.values(allItems)
        .filter(i => i.dname && i.dname.toLowerCase().includes(filter.toLowerCase()))
        .slice(0, 100).map(i => `
        <div class="item-card" onclick="alert('${i.dname}\\nCosto: ${i.cost} de oro\\n${i.notes || 'Objeto de Dota 2'}')">
            <img src="https://cdn.cloudflare.steamstatic.com${i.img}" class="small-item-img">
            <div class="item-info">${i.dname} <br> <span style="color:#ffd700">${i.cost}g</span></div>
        </div>
    `).join("");
}

async function loadPatches() {
    const r = await fetch("https://api.opendota.com/api/constants/patchnotes");
    const data = await r.json();
    const container = document.getElementById("patches-container");
    container.innerHTML = `<h3>Últimos Cambios</h3><ul class="patch-list">` + 
        Object.keys(data).slice(0, 5).map(v => `<li><strong>Parche ${v}:</strong> Actualización de balances generales.</li>`).join("") + "</ul>";
}

function toggleChat() {
    document.getElementById("chat-aside").classList.toggle("open");
}

async function sendMessage() {
    const input = document.getElementById("chat-input");
    const msg = input.value.trim();
    if(!msg) return;
    addMessage(msg, "user");
    input.value = "";
    
    const r = await fetch("/api/chat", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({ message: msg })
    });
    const data = await r.json();
    addMessage(data.reply, "ai");
}

function addMessage(content, sender) {
    const div = document.createElement("div");
    div.className = `message ${sender}-message`;
    div.innerHTML = sender === "ai" ? injectIcons(content) : content;
    chatMessages.appendChild(div);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function performSearch() {
    const term = document.getElementById("search-input").value.toLowerCase();
    const activeTab = document.querySelector(".tab.active").dataset.tab;
    if (activeTab === "heroes") {
        const filtered = allHeroes.filter(h => h.localized_name.toLowerCase().includes(term));
        renderHeroes(filtered);
    } else {
        renderItems(term);
    }
}
