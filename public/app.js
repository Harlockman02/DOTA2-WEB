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
    } catch (e) { console.error("Error cargando datos:", e); }
});

function initEvents() {
    document.getElementById("send-button").onclick = sendMessage;
    document.getElementById("chat-input").onkeypress = (e) => e.key === "Enter" && sendMessage();
    
    // Filtros de atributos
    document.querySelectorAll(".stat-btn").forEach(btn => {
        btn.onclick = () => {
            btn.classList.toggle("active");
            const stat = btn.dataset.stat;
            if(activeStats.includes(stat)) activeStats = activeStats.filter(s => s !== stat);
            else activeStats.push(stat);
            applyFilters();
        };
    });

    // Pestañas
    document.getElementById("btn-heroes").onclick = () => {
        document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
        document.getElementById("btn-heroes").classList.add("active");
        renderHeroes(allHeroes);
    };

    document.getElementById("btn-items").onclick = () => {
        document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
        document.getElementById("btn-items").classList.add("active");
        renderItems();
    };

    document.getElementById("search-input").oninput = applyFilters;
}

function applyFilters() {
    const term = document.getElementById("search-input").value.toLowerCase();
    const isHeroTab = document.getElementById("btn-heroes").classList.contains("active");
    
    if(isHeroTab) {
        const filtered = allHeroes.filter(h => {
            const attr = h.primary_attr === "str" ? "str" : h.primary_attr === "agi" ? "agi" : h.primary_attr === "int" ? "int" : "all";
            return activeStats.includes(attr) && h.localized_name.toLowerCase().includes(term);
        });
        renderHeroes(filtered);
    }
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
    const items = Object.values(allItems).filter(i => i.dname && i.cost > 0).slice(0, 100);
    container.innerHTML = items.map(i => `
        <div class="item-card-small" onclick="alert('${i.dname}: ${i.cost} oro')">
            <img src="https://cdn.cloudflare.steamstatic.com${i.img}">
            <p>${i.dname}</p>
        </div>
    `).join("");
}

function showHeroDetail(id) {
    const hero = allHeroes.find(h => h.id === id);
    const container = document.getElementById("content-area");
    document.getElementById("filter-bar").style.display = "none";
    container.className = "detail-view-container";

    const isCarry = hero.roles.includes("Carry");
    const items = isCarry ? ["power_treads", "bfury", "manta", "black_king_bar", "abyssal_blade", "swift_blink"] 
                         : ["arcane_boots", "blink", "force_staff", "glimmer_cape", "aeon_disk", "ghost"];

    container.innerHTML = `
        <button class="back-btn" onclick="renderHeroes(allHeroes)">← Regresar</button>
        
        <div class="hero-detail-header">
            <img src="https://cdn.cloudflare.steamstatic.com${hero.img}" class="hero-big-img">
            <div class="hero-text-info">
                <h2>${hero.localized_name}</h2>
                <div class="tags">${hero.roles.map(r => `<span>${r}</span>`).join("")}</div>
            </div>
        </div>

        <div class="meta-section">
            <h3>Core Build Meta</h3>
            <div class="items-flex">
                ${items.map(k => {
                    const item = Object.values(allItems).find(i => i.img && i.img.includes(k));
                    return item ? `<div class="item-box"><img src="https://cdn.cloudflare.steamstatic.com${item.img}"><small>${item.cost}</small></div>` : "";
                }).join("")}
            </div>
        </div>

        <div class="talents-section">
            <h3>Árbol de Talentos</h3>
            <div class="talent-tree">
                <div class="talent-row"><span>+2s Aturdimiento</span> <div class="node">25</div> <span>+25% Evasión</span></div>
                <div class="talent-row"><span>+150 Rango</span> <div class="node">20</div> <span>+40 Daño</span></div>
                <div class="talent-row"><span>+250 Vida</span> <div class="node">15</div> <span>+15 Atributos</span></div>
                <div class="talent-row"><span>+2 Regen Mana</span> <div class="node">10</div> <span>+10% Oro</span></div>
            </div>
        </div>
    `;
}

function toggleChat() {
    document.getElementById("chat-window").classList.toggle("open");
}

async function sendMessage() {
    const input = document.getElementById("chat-input");
    const msg = input.value.trim();
    if(!msg) return;

    const body = document.getElementById("chat-messages");
    body.innerHTML += `<div class="msg user">${msg}</div>`;
    input.value = "";

    const res = await fetch("/api/chat", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({ message: msg })
    });
    const data = await res.json();
    body.innerHTML += `<div class="msg ai">${marked.parse(data.reply)}</div>`;
    body.scrollTop = body.scrollHeight;
}
