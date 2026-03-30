let allHeroes = [];
let allItems = {};
let allAbilities = {};
let selectedStats = ["str", "agi", "int", "all"];

document.addEventListener("DOMContentLoaded", async () => {
    const [h, i, a] = await Promise.all([
        fetch("/api/heroes").then(res => res.json()),
        fetch("https://api.opendota.com/api/constants/items").then(res => res.json()),
        fetch("https://api.opendota.com/api/constants/abilities").then(res => res.json())
    ]);
    allHeroes = h; allItems = i; allAbilities = a;
    renderHeroes(allHeroes);
    setupEvents();
});

function setupEvents() {
    document.getElementById("send-button").onclick = sendMessage;
    document.getElementById("search-button").onclick = () => filterData();
    document.querySelectorAll(".stat-filter").forEach(btn => {
        btn.onclick = () => {
            btn.classList.toggle("active");
            const s = btn.dataset.stat;
            selectedStats = btn.classList.contains("active") ? [...selectedStats, s] : selectedStats.filter(x => x !== s);
            filterData();
        };
    });
}

function renderHeroes(heroes) {
    const container = document.getElementById("main-content");
    container.innerHTML = heroes.map(h => `
        <div class="card hero-card" onclick="showHeroDetail(${h.id})">
            <img src="https://cdn.cloudflare.steamstatic.com${h.img}">
            <div class="info">${h.localized_name}</div>
        </div>
    `).join("");
}

function showHeroDetail(id) {
    const hero = allHeroes.find(h => h.id === id);
    const container = document.getElementById("main-content");
    document.getElementById("hero-filters").style.display = "none";

    // Builds Reales Basadas en Roles
    const build = hero.roles.includes("Carry") 
        ? ["power_treads", "bfury", "manta", "black_king_bar", "abyssal_blade", "swift_blink"]
        : ["arcane_boots", "blink", "force_staff", "glimmer_cape", "aeon_disk", "octarine_core"];

    container.innerHTML = `
        <div class="detail-view">
            <button class="back-btn" onclick="location.reload()">← Volver</button>
            <div class="header">
                <img src="https://cdn.cloudflare.steamstatic.com${hero.img}">
                <h2>${hero.localized_name}</h2>
            </div>
            
            <h3>Core Build Meta</h3>
            <div class="build-grid">
                ${build.map(key => {
                    const item = Object.values(allItems).find(i => i.img && i.img.includes(key));
                    return item ? `<img src="https://cdn.cloudflare.steamstatic.com${item.img}" title="${item.dname}" onclick="alert('${item.dname}: ${item.cost} oro')">` : '';
                }).join("")}
            </div>

            <h3>Talentos</h3>
            <div class="talent-tree">
                <div class="t-row"><span>+Resistencia</span><div class="node">25</div><span>+Daño Skill</span></div>
                <div class="t-row"><span>+HP</span><div class="node">20</div><span>+Oro/min</span></div>
            </div>
        </div>
    `;
}

function toggleChat() {
    const chat = document.getElementById("chat-window");
    chat.classList.toggle("open");
}

async function sendMessage() {
    const input = document.getElementById("chat-input");
    const msg = input.value.trim();
    if(!msg) return;

    const chat = document.getElementById("chat-messages");
    chat.innerHTML += `<div class="message user">${msg}</div>`;
    input.value = "";

    const res = await fetch("/api/chat", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({ message: msg })
    });
    const data = await res.json();
    
    // Inyectar iconos en respuesta IA
    let reply = marked.parse(data.reply);
    reply = reply.replace(/\[([\w\s'!-]+)\]/g, (m, name) => {
        const item = Object.values(allItems).find(i => i.dname && i.dname.toLowerCase() === name.toLowerCase());
        return item ? `<span class="chat-icon-text"><img src="https://cdn.cloudflare.steamstatic.com${item.img}"> ${item.dname}</span>` : `**${name}**`;
    });

    chat.innerHTML += `<div class="message ai">${reply}</div>`;
    chat.scrollTop = chat.scrollHeight;
}
