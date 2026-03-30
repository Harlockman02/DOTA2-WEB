let allHeroes = [], allItems = {}, allAbilities = {};
let activeStats = ["str", "agi", "int", "all"];

document.addEventListener("DOMContentLoaded", async () => {
    const [h, i, a] = await Promise.all([
        fetch("/api/heroes").then(r => r.json()),
        fetch("https://api.opendota.com/api/constants/items").then(r => r.json()),
        fetch("https://api.opendota.com/api/constants/abilities").then(r => r.json())
    ]);
    allHeroes = h; allItems = i; allAbilities = a;
    renderHeroes(allHeroes);
    initEvents();
});

function initEvents() {
    document.getElementById("send-button").onclick = sendMessage;
    document.getElementById("chat-input").onkeypress = (e) => e.key === "Enter" && sendMessage();
    
    document.querySelectorAll(".stat-btn").forEach(btn => {
        btn.onclick = () => {
            btn.classList.toggle("active");
            const stat = btn.dataset.stat;
            if(activeStats.includes(stat)) activeStats = activeStats.filter(s => s !== stat);
            else activeStats.push(stat);
            applyFilters();
        };
    });

    document.getElementById("search-input").oninput = applyFilters;
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

function showHeroDetail(id) {
    const hero = allHeroes.find(h => h.id === id);
    const container = document.getElementById("content-area");
    document.getElementById("filter-bar").style.display = "none";
    container.className = "detail-view";

    // Build real por rol
    const isCarry = hero.roles.includes("Carry");
    const items = isCarry ? ["power_treads", "bfury", "manta", "black_king_bar", "abyssal_blade", "swift_blink"] 
                         : ["arcane_boots", "blink", "force_staff", "glimmer_cape", "aeon_disk", "ghost"];

    container.innerHTML = `
        <button class="back-btn" onclick="renderHeroes(allHeroes)">← Regresar</button>
        <div class="detail-header">
            <img src="https://cdn.cloudflare.steamstatic.com${hero.img}" class="hero-portrait">
            <div class="hero-titles">
                <h2>${hero.localized_name}</h2>
                <div class="role-tags">${hero.roles.map(r => `<span>${r}</span>`).join("")}</div>
            </div>
        </div>

        <div class="build-meta">
            <h3>Core Build Meta (6 Items)</h3>
            <div class="items-row">
                ${items.map(k => {
                    const item = Object.values(allItems).find(i => i.img && i.img.includes(k));
                    return item ? `<div class="item-slot" onclick="alert('${item.dname}: ${item.cost} oro')"><img src="https://cdn.cloudflare.steamstatic.com${item.img}"><span>${item.cost}</span></div>` : "";
                }).join("")}
            </div>
        </div>

        <div class="talents-container">
            <h3>Árbol de Talentos</h3>
            <div class="talent-tree">
                <div class="t-row"><span>+25% Evasion</span> <div class="node">25</div> <span>+2s Stun</span></div>
                <div class="t-row"><span>+40 Attack Speed</span> <div class="node">20</div> <span>+150 Cast Range</span></div>
                <div class="t-row"><span>+15 Atributos</span> <div class="node">15</div> <span>+250 Health</span></div>
                <div class="t-row"><span>+10% Gold</span> <div class="node">10</div> <span>+2 Mana Regen</span></div>
            </div>
        </div>
    `;
}

function switchTab(tab) {
    const container = document.getElementById("content-area");
    document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
    event.target.classList.add("active");

    if(tab === "heroes") { renderHeroes(allHeroes); }
    else if(tab === "items") {
        document.getElementById("filter-bar").style.display = "none";
        container.className = "content-grid items";
        container.innerHTML = Object.values(allItems).slice(0, 80).map(i => `
            <div class="item-card-small" onclick="alert('${i.dname}: ${i.cost}g')">
                <img src="https://cdn.cloudflare.steamstatic.com${i.img}">
                <p>${i.dname}</p>
            </div>
        `).join("");
    }
}

// CHAT LOGIC
function toggleChat() { document.getElementById("chat-window").classList.toggle("open"); }

async function sendMessage() {
    const input = document.getElementById("chat-input");
    const text = input.value.trim();
    if(!text) return;

    const chatBody = document.getElementById("chat-messages");
    chatBody.innerHTML += `<div class="msg user">${text}</div>`;
    input.value = "";

    const res = await fetch("/api/chat", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({ message: text })
    });
    const data = await res.json();
    
    // Inyectar iconos en Markdown
    let html = marked.parse(data.reply);
    html = html.replace(/\[([\w\s'!-]+)\]/g, (m, name) => {
        const item = Object.values(allItems).find(i => i.dname && i.dname.toLowerCase() === name.toLowerCase());
        return item ? `<span class="c-icon"><img src="https://cdn.cloudflare.steamstatic.com${item.img}"> ${item.dname}</span>` : `<b>${name}</b>`;
    });

    chatBody.innerHTML += `<div class="msg ai">${html}</div>`;
    chatBody.scrollTop = chatBody.scrollHeight;
}
