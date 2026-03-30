let allHeroes = [];
let allItems = {};

document.addEventListener("DOMContentLoaded", async () => {
    await Promise.all([
        fetch("/api/heroes").then(r => r.json()).then(data => allHeroes = data),
        fetch("https://api.opendota.com/api/constants/items").then(r => r.json()).then(data => allItems = data)
    ]);
    renderHeroes(allHeroes);
    setupEventListeners();
});

function setupEventListeners() {
    document.getElementById("send-button").onclick = sendMessage;
    document.getElementById("search-button").onclick = performSearch;
    document.getElementById("search-input").onkeyup = (e) => { if(e.key === "Enter") performSearch(); };
    
    document.querySelectorAll(".tab").forEach(t => {
        t.onclick = () => {
            document.querySelectorAll(".tab, .tab-content").forEach(el => el.classList.remove("active"));
            t.classList.add("active");
            document.getElementById(`tab-${t.dataset.tab}`).classList.add("active");
            if(t.dataset.tab === "items") renderItems();
        };
    });
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
    
    // Simulación de build según roles para veracidad
    const isCarry = hero.roles.includes("Carry");
    const suggested = isCarry ? ["power_treads", "black_king_bar", "manta"] : ["blink", "force_staff", "ghost"];
    
    const itemIcons = suggested.map(key => {
        const item = Object.values(allItems).find(i => i.img.includes(key));
        return item ? `<img src="https://cdn.cloudflare.steamstatic.com${item.img}" title="${item.dname}" class="build-icon">` : '';
    }).join("");

    container.innerHTML = `
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
            <h3>Core Build del Meta</h3>
            <div class="item-icons-row">${itemIcons}</div>
        </div>
    `;
}

function renderItems(filter = "") {
    const container = document.getElementById("items-container");
    container.innerHTML = Object.values(allItems)
        .filter(i => i.dname && i.dname.toLowerCase().includes(filter.toLowerCase()))
        .slice(0, 80).map(i => `
        <div class="item-card" onclick="alert('${i.dname}: ${i.cost} oro')">
            <img src="https://cdn.cloudflare.steamstatic.com${i.img}" class="small-item-img">
            <div class="item-info">${i.dname}<br><span style="color:#ffd700">${i.cost}g</span></div>
        </div>
    `).join("");
}

function injectIcons(text) {
    // Busca [Nombre] y reemplaza por icono + link
    const regex = /\[([\w\s'!-]+)\]/g;
    return text.replace(regex, (match, name) => {
        const hero = allHeroes.find(h => h.localized_name.toLowerCase() === name.toLowerCase());
        if (hero) return `<span class="icon-text"><img src="https://cdn.cloudflare.steamstatic.com${hero.img}"> ${hero.localized_name}</span>`;
        
        const item = Object.values(allItems).find(i => i.dname && i.dname.toLowerCase() === name.toLowerCase());
        if (item) return `<span class="icon-text"><img src="https://cdn.cloudflare.steamstatic.com${item.img}"> ${item.dname}</span>`;
        
        return `<strong>${name}</strong>`;
    });
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
    document.getElementById("chat-messages").appendChild(div);
    document.getElementById("chat-messages").scrollTop = document.getElementById("chat-messages").scrollHeight;
}

function toggleChat() {
    document.getElementById("chat-aside").classList.toggle("open");
}

function performSearch() {
    const term = document.getElementById("search-input").value;
    const active = document.querySelector(".tab.active").dataset.tab;
    if(active === "heroes") renderHeroes(allHeroes.filter(h => h.localized_name.toLowerCase().includes(term.toLowerCase())));
    else renderItems(term);
}
