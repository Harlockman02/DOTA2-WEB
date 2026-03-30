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
    document.getElementById("chat-input").addEventListener("keypress", (e) => {
        if(e.key === "Enter") sendMessage();
    });
    
    document.querySelectorAll(".stat-btn").forEach(btn => {
        btn.onclick = () => {
            btn.classList.toggle("active");
            const stat = btn.dataset.stat;
            if(activeStats.includes(stat)) activeStats = activeStats.filter(s => s !== stat);
            else activeStats.push(stat);
            applyFilters();
        };
    });

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
    const items = Object.values(allItems).filter(i => i.dname && i.cost > 0).slice(0, 80);
    container.innerHTML = items.map(i => `
        <div class="item-card-small">
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

    // Habilidades: OpenDota asocia habilidades por nombre de héroe
    const hName = hero.name.replace("npc_dota_hero_", "");
    const skills = Object.values(allAbilities).filter(a => a.name && a.name.startsWith(hName)).slice(0, 4);

    const isCarry = hero.roles.includes("Carry");
    const build = isCarry ? ["power_treads", "bfury", "manta", "black_king_bar", "abyssal_blade", "swift_blink"] 
                         : ["arcane_boots", "blink", "force_staff", "glimmer_cape", "aeon_disk", "ghost"];

    container.innerHTML = `
        <button class="back-btn" onclick="renderHeroes(allHeroes)">← Volver</button>
        <div class="hero-detail-header">
            <img src="https://cdn.cloudflare.steamstatic.com${hero.img}" class="hero-big-img">
            <div class="hero-text-info">
                <h2>${hero.localized_name}</h2>
                <div class="tags">${hero.roles.map(r => `<span>${r}</span>`).join("")}</div>
            </div>
        </div>

        <div class="section">
            <h3>Habilidades de Combate</h3>
            <div class="skills-row">
                ${skills.map(s => `
                    <div class="skill-box">
                        <img src="https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react/abilities/${s.name}.png">
                        <small>${s.dname || "Habilidad"}</small>
                    </div>
                `).join("")}
            </div>
        </div>

        <div class="section">
            <h3>Build Meta Core</h3>
            <div class="items-row">
                ${build.map(k => {
                    const item = Object.values(allItems).find(i => i.img && i.img.includes(k));
                    return item ? `<div class="item-box"><img src="https://cdn.cloudflare.steamstatic.com${item.img}"><small>${item.cost}</small></div>` : "";
                }).join("")}
            </div>
        </div>

        <div class="section">
            <h3>Árbol de Talentos</h3>
            <div class="talent-tree">
                <div class="t-row"><span>Aturdimiento +2s</span> <div class="node">25</div> <span>Evasión +20%</span></div>
                <div class="t-row"><span>Daño +50</span> <div class="node">20</div> <span>Rango +150</span></div>
                <div class="t-row"><span>Vida +250</span> <div class="node">15</div> <span>Atributos +15</span></div>
                <div class="t-row"><span>Regen Mana +3</span> <div class="node">10</div> <span>Oro +10%</span></div>
            </div>
        </div>
    `;
}

function toggleChat() { document.getElementById("chat-window").classList.toggle("open"); }

async function sendMessage() {
    const input = document.getElementById("chat-input");
    const msg = input.value.trim();
    if(!msg) return;

    const chatBody = document.getElementById("chat-messages");
    chatBody.innerHTML += `<div class="msg user">${msg}</div>`;
    input.value = "";

    try {
        const res = await fetch("/api/chat", {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({ message: msg })
        });
        const data = await res.json();
        chatBody.innerHTML += `<div class="msg ai">${marked.parse(data.reply)}</div>`;
        chatBody.scrollTop = chatBody.scrollHeight;
    } catch(e) {
        chatBody.innerHTML += `<div class="msg ai error">Error al conectar con el servidor.</div>`;
    }
}