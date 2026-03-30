let allHeroes = [];
let allItems = {};
let allAbilities = {};
let selectedStats = ["str", "agi", "int", "all"];

document.addEventListener("DOMContentLoaded", async () => {
    // Carga inicial de datos masivos
    const [hRes, iRes, aRes] = await Promise.all([
        fetch("/api/heroes").then(r => r.json()),
        fetch("https://api.opendota.com/api/constants/items").then(r => r.json()),
        fetch("https://api.opendota.com/api/constants/abilities").then(r => r.json())
    ]);
    allHeroes = hRes;
    allItems = iRes;
    allAbilities = aRes;

    renderHeroes(allHeroes);
    setupEventListeners();
});

function setupEventListeners() {
    document.getElementById("send-button").onclick = sendMessage;
    document.getElementById("search-button").onclick = performSearch;
    
    // Filtros de atributos
    document.querySelectorAll(".stat-filter").forEach(btn => {
        btn.onclick = () => {
            const stat = btn.dataset.stat;
            btn.classList.toggle("active");
            if (selectedStats.includes(stat)) selectedStats = selectedStats.filter(s => s !== stat);
            else selectedStats.push(stat);
            filterHeroes();
        };
    });
}

function filterHeroes() {
    const term = document.getElementById("search-input").value.toLowerCase();
    const filtered = allHeroes.filter(h => {
        const attr = h.primary_attr === "str" ? "str" : h.primary_attr === "agi" ? "agi" : h.primary_attr === "int" ? "int" : "all";
        return selectedStats.includes(attr) && h.localized_name.toLowerCase().includes(term);
    });
    renderHeroes(filtered);
}

function renderHeroes(heroes) {
    const container = document.getElementById("heroes-container");
    container.innerHTML = heroes.map(h => `
        <div class="hero-card" onclick="showHeroDetail(${h.id})">
            <img src="https://cdn.cloudflare.steamstatic.com${h.img}">
            <div class="hero-info">${h.localized_name}</div>
        </div>
    `).join("");
}

function showHeroDetail(heroId) {
    const hero = allHeroes.find(h => h.id === heroId);
    const container = document.getElementById("heroes-container");
    
    // Lógica de Items Reales basada en Atributos/Roles
    const isSupport = hero.roles.includes("Support");
    const itemKeys = isSupport ? ["ward_observer", "arcane_boots", "force_staff", "glimmer_cape"] : ["power_treads", "black_king_bar", "manta", "blink"];
    
    const itemsHTML = itemKeys.map(key => {
        const item = Object.values(allItems).find(i => i.img.includes(key));
        return item ? `<img src="https://cdn.cloudflare.steamstatic.com${item.img}" class="build-icon" title="${item.dname}" onclick="showDescription('${item.dname}', '${item.hint || 'Sin descripción'}', ${item.cost})">` : '';
    }).join("");

    container.innerHTML = `
        <div class="hero-detail-view">
            <button onclick="renderHeroes(allHeroes)" class="back-btn">← Volver</button>
            <div class="detail-header">
                <img src="https://cdn.cloudflare.steamstatic.com${hero.img}" class="main-img">
                <h2>${hero.localized_name}</h2>
            </div>
            
            <h3>Habilidades</h3>
            <div class="abilities-row">
                ${allHeroes.find(h => h.id === heroId).roles.slice(0,4).map(r => `<div class="skill-tag">${r}</div>`).join("")}
            </div>

            <h3 style="margin-top:20px">Core Meta Build</h3>
            <div class="item-icons-row">${itemsHTML}</div>
        </div>
    `;
}

function showDescription(name, desc, cost = null) {
    const gold = cost ? `<br><span style="color:#ffd700">Costo: ${cost} oro</span>` : "";
    // Usamos un modal o un alert estilizado
    const infoBox = document.createElement("div");
    infoBox.className = "info-overlay";
    infoBox.innerHTML = `
        <div class="info-modal">
            <h4>${name}</h4>
            <p>${desc}</p>
            ${gold}
            <button onclick="this.parentElement.parentElement.remove()">Cerrar</button>
        </div>
    `;
    document.body.appendChild(infoBox);
}

function injectIcons(text) {
    // Markdown básico + Iconos dinámicos
    let html = marked.parse(text);
    const regex = /\[([\w\s'!-]+)\]/g;

    return html.replace(regex, (match, name) => {
        const hero = allHeroes.find(h => h.localized_name.toLowerCase() === name.toLowerCase());
        const item = Object.values(allItems).find(i => i.dname && i.dname.toLowerCase() === name.toLowerCase());
        
        if (hero) return `<span class="icon-text"><img src="https://cdn.cloudflare.steamstatic.com${hero.img}"> ${hero.localized_name}</span>`;
        if (item) return `<span class="icon-text"><img src="https://cdn.cloudflare.steamstatic.com${item.img}"> ${item.dname}</span>`;
        return `<strong>${name}</strong>`;
    });
}

async function sendMessage() {
    const input = document.getElementById("chat-input");
    if(!input.value.trim()) return;
    addMessage(input.value, "user");
    
    const r = await fetch("/api/chat", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({ message: input.value })
    });
    const data = await r.json();
    addMessage(data.reply, "ai");
    input.value = "";
}

function addMessage(content, sender) {
    const div = document.createElement("div");
    div.className = `message ${sender}-message`;
    div.innerHTML = sender === "ai" ? injectIcons(content) : content;
    const chat = document.getElementById("chat-messages");
    chat.appendChild(div);
    chat.scrollTop = chat.scrollHeight;
}

function toggleChat() {
    document.getElementById("chat-aside").classList.toggle("open");
}
