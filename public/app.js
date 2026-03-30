let allHeroes = [];
let allItems = [];
const heroesContainer = document.getElementById("heroes-container");
const itemsContainer = document.getElementById("items-container");
const chatMessages = document.getElementById("chat-messages");

document.addEventListener("DOMContentLoaded", async () => {
    await Promise.all([loadHeroes(), loadItems()]);
    setupEventListeners();
});

async function loadHeroes() {
    const r = await fetch("/api/heroes");
    allHeroes = await r.json();
    renderHeroes(allHeroes);
}

async function loadItems() {
    const r = await fetch("https://api.opendota.com/api/constants/items");
    allItems = await r.json();
}

function renderHeroes(heroes) {
    document.getElementById("heroes-filters").style.display = "block";
    heroesContainer.style.gridTemplateColumns = "repeat(auto-fill, minmax(140px, 1fr))";
    heroesContainer.innerHTML = heroes.map(h => `
        <div class="hero-card" onclick="showHeroDetail(${h.id})">
            <img src="https://cdn.cloudflare.steamstatic.com${h.img}">
            <div class="hero-info">${h.localized_name}</div>
        </div>
    `).join("");
}

// BUSCADOR MEJORADO
function performSearch() {
    const term = document.getElementById("search-input").value.toLowerCase();
    const activeTab = document.querySelector(".tab.active").dataset.tab;

    if (activeTab === "heroes") {
        const filtered = allHeroes.filter(h => h.localized_name.toLowerCase().includes(term));
        renderHeroes(filtered);
    } else if (activeTab === "items") {
        renderItems(term);
    }
}

// VISTA DE DETALLE CON ICONOS DE BUILD
function showHeroDetail(heroId) {
    const hero = allHeroes.find(h => h.id === heroId);
    document.getElementById("heroes-filters").style.display = "none";
    heroesContainer.style.gridTemplateColumns = "1fr";

    // Build visual (Ejemplo con items comunes)
    const buildIcons = ['blink', 'black_king_bar', 'tpscroll'].map(iname => {
        const item = Object.values(allItems).find(i => i.img.includes(iname));
        return item ? `<img src="https://cdn.cloudflare.steamstatic.com${item.img}" title="${item.dname}" class="build-icon">` : '';
    }).join("");

    heroesContainer.innerHTML = `
        <div class="hero-detail-view">
            <button onclick="renderHeroes(allHeroes)" class="back-btn">← Volver</button>
            <div class="detail-header">
                <img src="https://cdn.cloudflare.steamstatic.com${hero.img}" class="main-img">
                <h2>${hero.localized_name}</h2>
            </div>
            <div class="stats-grid">
                <div class="stat-box"><b>STR</b><br>${hero.base_str} +${hero.str_gain}</div>
                <div class="stat-box"><b>AGI</b><br>${hero.base_agi} +${hero.agi_gain}</div>
                <div class="stat-box"><b>INT</b><br>${hero.base_int} +${hero.int_gain}</div>
            </div>
            <div class="build-section">
                <h3>Sugerencia de Items Core</h3>
                <div class="item-icons-row">${buildIcons}</div>
            </div>
        </div>
    `;
}

// INYECCIÓN DE ICONOS EN EL CHAT
function injectIcons(text) {
    let html = marked.parse(text);
    // Buscar nombres de héroes y poner icono
    allHeroes.slice(0, 20).forEach(h => {
        const regex = new RegExp(`\\b${h.localized_name}\\b`, 'gi');
        html = html.replace(regex, `<span class="icon-text"><img src="https://cdn.cloudflare.steamstatic.com${h.img}"> ${h.localized_name}</span>`);
    });
    return html;
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

function setupEventListeners() {
    document.getElementById("send-button").onclick = sendMessage;
    document.getElementById("search-button").onclick = performSearch;
    
    document.querySelectorAll(".tab").forEach(t => {
        t.onclick = () => {
            document.querySelectorAll(".tab, .tab-content").forEach(el => el.classList.remove("active"));
            t.classList.add("active");
            document.getElementById(`tab-${t.dataset.tab}`).classList.add("active");
            if(t.dataset.tab === "items") renderItems();
        };
    });
}

function renderItems(filter = "") {
    itemsContainer.innerHTML = Object.values(allItems)
        .filter(i => i.dname && i.dname.toLowerCase().includes(filter))
        .slice(0, 50).map(i => `
        <div class="item-card">
            <img src="https://cdn.cloudflare.steamstatic.com${i.img}">
            <div class="hero-info" style="font-size:0.7rem">${i.dname}</div>
        </div>
    `).join("");
}
