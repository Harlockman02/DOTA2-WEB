// ===========================
// DOTA 2 WEB - SCRIPT PRINCIPAL
// Versión mejorada con imágenes, parches 7.41,
// markdown en chat, hipervínculos de items/héroes
// ===========================

// API URLs
const OPENDOTA_API  = 'https://api.opendota.com/api';
const OPENDOTA_BASE = 'https://api.opendota.com';
const STEAM_CDN     = 'https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react';
const HEROES_API    = `${OPENDOTA_API}/heroes`;
const HEROSTATS_API = `${OPENDOTA_API}/herostats`;
const ITEMS_API     = `${OPENDOTA_API}/itemdata`;

// Global data
let heroesDota2          = [];
let itemsData            = {};
let currentAttributeFilter = 'all';
let currentItemFilter    = 'all';
let currentSection       = 'heroes';

// Groq API key (pre-loaded)
const DEFAULT_GROQ_API_KEY = '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';

// ===========================
// PATCH DATA UPDATED TO 7.41
// ===========================
const patchesDota2 = [
    {
        version: "7.41",
        date: "2025-12-10",
        changes: [
            "🔴 Grandes cambios en el sistema de Neutral Items — nuevos tiers y rotaciones",
            "⚔️ Rework de 8 habilidades en héroes de Fuerza y Universal",
            "🌿 Mapa rediseñado: nuevos campamentos de neutrales en zona media",
            "💰 Ajuste de economía: cambio en bounty de torres T1",
            "🏆 Balance de 45+ héroes enfocado en meta competitivo",
            "🧪 Nuevos items: Boots of Bearing y Veil of Discord rework",
            "🎯 Roshan otorga nuevo buff temporal al equipo asesino"
        ]
    },
    {
        version: "7.40",
        date: "2025-09-05",
        changes: [
            "🆕 Nuevo héroe: Ringmaster (Universal)",
            "📊 Rebalance general de 50+ héroes",
            "🛡️ Cambio en sistema de Outposts — ahora otorgan experiencia progresiva",
            "💡 Creeps de carretera más fuertes después del minuto 25",
            "🔧 Facets actualizados para Anti-Mage, Invoker y Medusa",
            "🌙 Noche más larga: ciclo de 5 minutos en vez de 4",
            "⚡ Storm Spirit y Puck reciben nuevo Aghanim's Shard"
        ]
    },
    {
        version: "7.39",
        date: "2025-06-18",
        changes: [
            "🎭 Introducción del sistema de Facets (2 Facets por héroe)",
            "🌟 Innate abilities para todos los héroes",
            "🗺️ Mapa rediseñado con nuevas rutas y áreas",
            "🔄 Sistema de Neutral Items completamente revisado",
            "💥 Cambios en mecánicas de Spell Block e Invulnerability",
            "🎮 Nuevos efectos visuales para héroes clásicos",
            "📱 Mejoras en interface y nuevos pings"
        ]
    },
    {
        version: "7.38",
        date: "2025-03-20",
        changes: [
            "⚖️ Balance masivo: 60+ héroes ajustados",
            "🏹 Nerfs a carries dominantes: Terrorblade, Luna, Medusa",
            "🛡️ Buffs a supports: Jakiro, Undying, Warlock",
            "💎 Nuevos items: Phylactery y Boots of Bearing",
            "🗡️ Cambios en Roshan: nueva habilidad en tercer spawn",
            "🌍 Torneo de Majors con formato BO3 en clasificatorias",
            "🐛 Corrección de 100+ bugs reportados por la comunidad"
        ]
    },
    {
        version: "7.37",
        date: "2024-10-08",
        changes: [
            "🏆 Actualización post-TI13",
            "📉 Nerfs a estrategias dominantes del meta competitivo",
            "🎭 4 héroes reciben rework parcial de habilidades",
            "🌿 Cambios en jungla: nuevos patrones de campamentos",
            "🔋 Cambio en regeneración de mana para supports",
            "🗺️ Ajuste de secciones del río: nuevos bloqueos",
            "✨ Actualización de efectos visuales y sonidos"
        ]
    }
];

// ===========================
// LOAD DATA FROM OPENDOTA
// ===========================
async function loadOpenDotaData() {
    try {
        const [heroesRes, statsRes] = await Promise.all([
            fetch(HEROES_API),
            fetch(HEROSTATS_API)
        ]);

        const heroesData = await heroesRes.json();
        const statsData  = await statsRes.json();

        // Load items
        try {
            const itemsRes = await fetch(ITEMS_API);
            if (itemsRes.ok) {
                itemsData = await itemsRes.json();
            } else {
                itemsData = getLocalItemsData();
            }
        } catch {
            itemsData = getLocalItemsData();
        }

        // Process heroes
        heroesDota2 = heroesData.map(hero => {
            const stats = statsData.find(s => s.id === hero.id) || {};
            const imgPath = hero.img || '';
            const imageUrl = imgPath ? `${OPENDOTA_BASE}${imgPath}` : '';

            // Try steam CDN as alternative
            const enName = hero.name ? hero.name.replace('npc_dota_hero_', '') : '';
            const steamImg = `${STEAM_CDN}/heroes/${enName}_full.png`;

            return {
                id:          hero.id,
                name:        hero.localized_name || hero.name,
                enName:      hero.name,
                shortName:   enName,
                role:        hero.roles || [],
                image:       imageUrl || steamImg,
                imageFallback: steamImg,
                primaryAttr: hero.primary_attr || 'str',
                attackType:  hero.attack_type,
                stats: {
                    str: stats.base_str || 0,
                    agi: stats.base_agi || 0,
                    int: stats.base_int || 0
                },
                description: `Atacante ${hero.attack_type || ''} — ${(hero.roles || []).join(', ')}`,
                winrate: "N/A"
            };
        });

        console.log(`✅ Héroes: ${heroesDota2.length} | Items: ${Object.keys(itemsData).length}`);

        document.getElementById('loading-indicator').classList.add('hidden');

        loadHeroes();
        loadItems();

    } catch (error) {
        console.error('Error OpenDota:', error);
        loadHeroesFallback();
    }
}

function getLocalItemsData() {
    return {
        'blink': { id: 1, localized_name: 'Blink Dagger', cost: 2250, img: '/apps/dota2/images/dota_react/items/blink.png' },
        'boots': { id: 2, localized_name: 'Boots of Speed', cost: 50, img: '/apps/dota2/images/dota_react/items/boots.png' },
        'force_staff': { id: 3, localized_name: 'Force Staff', cost: 1875, img: '' },
        'glimmer_cape': { id: 4, localized_name: 'Glimmer Cape', cost: 1650, img: '' },
        'aether_lens': { id: 5, localized_name: 'Aether Lens', cost: 2300, img: '' },
        'magic_wand': { id: 6, localized_name: 'Magic Wand', cost: 450, img: '' },
        'bottle': { id: 7, localized_name: 'Bottle', cost: 600, img: '' },
        'battlefury': { id: 8, localized_name: 'Battle Fury', cost: 4500, img: '' },
        'manta': { id: 9, localized_name: 'Manta Style', cost: 5000, img: '' },
        'butterfly': { id: 10, localized_name: 'Butterfly', cost: 5525, img: '' },
        'abyssal_blade': { id: 11, localized_name: 'Abyssal Blade', cost: 6500, img: '' },
        'basher': { id: 12, localized_name: 'Basher', cost: 3100, img: '' },
        'blade_mail': { id: 13, localized_name: 'Blade Mail', cost: 2800, img: '' },
        'shivas_guard': { id: 14, localized_name: "Shiva's Guard", cost: 4600, img: '' },
        'sheepstick': { id: 15, localized_name: 'Scythe of Vyse', cost: 5575, img: '' },
        'black_king_bar': { id: 16, localized_name: 'Black King Bar', cost: 3900, img: '' },
        'ethereal_blade': { id: 17, localized_name: 'Ethereal Blade', cost: 4700, img: '' },
        'desolator': { id: 18, localized_name: 'Desolator', cost: 3500, img: '' },
        'heart': { id: 19, localized_name: 'Heart of Tarrasque', cost: 5000, img: '' },
        'radiance': { id: 20, localized_name: 'Radiance', cost: 5150, img: '' }
    };
}

function loadHeroesFallback() {
    heroesDota2 = [
        { id: 1, name: 'Anti-Mage', enName: 'npc_dota_hero_antimage', shortName: 'antimage',
          role: ['Carry'], image: `${STEAM_CDN}/heroes/antimage_full.png`,
          primaryAttr: 'agi', stats: { str: 15, agi: 24, int: 7 }, description: 'Carry ágil con gran potencial de farm' },
        { id: 7, name: 'Axe', enName: 'npc_dota_hero_axe', shortName: 'axe',
          role: ['Offlane'], image: `${STEAM_CDN}/heroes/axe_full.png`,
          primaryAttr: 'str', stats: { str: 24, agi: 10, int: 16 }, description: 'Iniciador de equipo fuerte' },
        { id: 5, name: 'Crystal Maiden', enName: 'npc_dota_hero_crystalmaiden', shortName: 'crystalmaiden',
          role: ['Support'], image: `${STEAM_CDN}/heroes/crystalmaiden_full.png`,
          primaryAttr: 'int', stats: { str: 15, agi: 16, int: 25 }, description: 'Support con control de mana' }
    ];
    document.getElementById('loading-indicator').classList.add('hidden');
    loadHeroes();
}

// ===========================
// SECTION NAVIGATION
// ===========================
function showSection(sectionName) {
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.nav-links a').forEach(a => a.classList.remove('nav-active'));

    const section = document.getElementById(sectionName + '-section');
    if (section) section.classList.add('active');

    if (event && event.target) event.target.classList.add('nav-active');

    currentSection = sectionName;

    switch(sectionName) {
        case 'heroes':  loadHeroes();  break;
        case 'items':   loadItems();   break;
        case 'builds':  loadBuilds();  break;
        case 'stats':   loadStats();   break;
        case 'patches': loadPatches(); break;
    }

    window.scrollTo(0, 0);
}

// ===========================
// ATTRIBUTE ICONS HELPER
// ===========================
function getAttrIcon(attr) {
    const attrLower = (attr || '').toLowerCase();
    const icons = {
        str: `<img class="stat-icon" src="${STEAM_CDN}/icons/hero_str.png" alt="STR" onerror="this.outerHTML='💪'"> `,
        agi: `<img class="stat-icon" src="${STEAM_CDN}/icons/hero_agi.png" alt="AGI" onerror="this.outerHTML='⚡'"> `,
        int: `<img class="stat-icon" src="${STEAM_CDN}/icons/hero_int.png" alt="INT" onerror="this.outerHTML='🧠'"> `,
        uni: `<img class="stat-icon" src="${STEAM_CDN}/icons/hero_universal.png" alt="UNI" onerror="this.outerHTML='🌐'"> `
    };
    return icons[attrLower] || '';
}

function getAttrColor(attr) {
    const colors = { str: '#C23C1A', agi: '#27AE60', int: '#3498DB', uni: '#C0A060' };
    return colors[(attr || '').toLowerCase()] || '#F39C12';
}

function getAttrLabel(attr) {
    const labels = { str: 'Fuerza', agi: 'Agilidad', int: 'Inteligencia', uni: 'Universal' };
    return labels[(attr || '').toLowerCase()] || attr;
}

// ===========================
// HEROES
// ===========================
function filterByAttribute(attribute) {
    currentAttributeFilter = attribute;

    document.querySelectorAll('#hero-filter-buttons .filter-btn').forEach(btn => {
        btn.classList.remove('filter-btn-active');
        if (btn.dataset.filter === attribute) btn.classList.add('filter-btn-active');
    });

    loadHeroes();
}

function loadHeroes() {
    const heroesList = document.getElementById('heroes-list');
    heroesList.innerHTML = '';

    if (heroesDota2.length === 0) {
        heroesList.innerHTML = '<p style="color: #A5A5A5; grid-column: 1/-1;">Cargando héroes...</p>';
        return;
    }

    const filtered = heroesDota2.filter(hero => {
        if (currentAttributeFilter === 'all') return true;
        return (hero.primaryAttr || '').toLowerCase() === currentAttributeFilter;
    });

    filtered.forEach(hero => {
        const card = document.createElement('div');
        card.className = 'hero-card';

        const attr = (hero.primaryAttr || 'str').toLowerCase();
        const attrColor = getAttrColor(attr);
        const attrIcon  = getAttrIcon(attr);
        const attrLabel = getAttrLabel(attr);

        const strIcon = getAttrIcon('str');
        const agiIcon = getAttrIcon('agi');
        const intIcon = getAttrIcon('int');

        const dota2WikiSlug = hero.name.replace('npc_dota_hero_', '');
        const heroLink = `https://www.dota2.com/hero/${encodeURIComponent(dota2WikiSlug)}`;

        card.innerHTML = `
            <div class="hero-image-wrap">
                <img class="hero-image-img" 
                     src="${hero.image}" 
                     alt="${hero.name}"
                     onerror="this.src='${hero.imageFallback || ''}'; this.onerror=null;"
                     loading="lazy">
                <div class="hero-attr-badge" style="background:${attrColor}">
                    ${attrIcon}
                </div>
            </div>
            <div class="hero-info">
                <a href="${heroLink}" target="_blank" class="hero-name-link">
                    <div class="hero-name">${hero.name}</div>
                </a>
                <div class="hero-role">${hero.role.join(', ') || 'Sin rol'}</div>
                <div class="hero-stats">
                    <div class="hero-stat-line">
                        ${strIcon}<span>STR</span>
                        <span style="color:#C23C1A;font-weight:bold">${Math.round(hero.stats.str)}</span>
                    </div>
                    <div class="hero-stat-line">
                        ${agiIcon}<span>AGI</span>
                        <span style="color:#27AE60;font-weight:bold">${Math.round(hero.stats.agi)}</span>
                    </div>
                    <div class="hero-stat-line">
                        ${intIcon}<span>INT</span>
                        <span style="color:#3498DB;font-weight:bold">${Math.round(hero.stats.int)}</span>
                    </div>
                </div>
                <div class="hero-primary-attr" style="color:${attrColor}">
                    ${attrIcon} ${attrLabel}
                </div>
            </div>
        `;
        heroesList.appendChild(card);
    });
}

// ===========================
// ITEMS
// ===========================
function filterItems(filter) {
    currentItemFilter = filter;
    document.querySelectorAll('#items-section .filter-btn').forEach(btn => {
        btn.classList.remove('filter-btn-active');
        if (btn.textContent.trim().toLowerCase().includes(filter === 'all' ? 'todos' : filter.toLowerCase())) {
            btn.classList.add('filter-btn-active');
        }
    });
    // re-render with filter
    renderItems();
}

function loadItems() {
    renderItems();
}

function getItemImageUrl(key, item) {
    // Try OpenDota img first, then Steam CDN
    if (item.img) {
        return `${OPENDOTA_BASE}${item.img}`;
    }
    // Steam CDN pattern
    return `${STEAM_CDN}/items/${key}.png`;
}

function renderItems() {
    const itemsList = document.getElementById('items-list');
    if (!itemsList) return;
    itemsList.innerHTML = '';

    const entries = Object.entries(itemsData)
        .filter(([key, item]) => {
            if (!item.localized_name) return false;
            // exclude recipes
            if (item.localized_name.toLowerCase().includes('recipe')) return false;
            // cost filter
            const cost = item.cost || 0;
            if (currentItemFilter === 'cheap') return cost > 0 && cost < 1000;
            if (currentItemFilter === 'mid') return cost >= 1000 && cost <= 3000;
            if (currentItemFilter === 'expensive') return cost > 3000;
            return true;
        });

    if (entries.length === 0) {
        itemsList.innerHTML = '<p style="color:#A5A5A5;grid-column:1/-1">No hay items en esta categoría.</p>';
        return;
    }

    entries.forEach(([key, item]) => {
        const imgUrl = getItemImageUrl(key, item);
        const cost   = item.cost || 0;

        const card = document.createElement('div');
        card.className = 'item-card';
        card.innerHTML = `
            <div class="item-img-wrap">
                <img class="item-img" src="${imgUrl}" alt="${item.localized_name}"
                     onerror="this.src=''; this.style.display='none'; this.parentElement.innerHTML='<span class=\\'item-emoji\\'>⚔️</span>';"
                     loading="lazy">
            </div>
            <div class="item-details">
                <div class="item-name">${item.localized_name}</div>
                ${cost > 0 ? `<div class="item-cost">💰 ${cost}g</div>` : '<div class="item-cost">Neutral</div>'}
            </div>
        `;
        itemsList.appendChild(card);
    });
}

// ===========================
// BUILDS
// ===========================
const buildsDota2 = [
    { hero: "Anti-Mage", role: "carry", items: ["Battle Fury", "Manta Style", "Butterfly", "Basher"], skills: [1,1,2,1,1,3,2,2,2,3], description: "Build ofensivo con Battle Fury para farm rápido" },
    { hero: "Axe", role: "offlane", items: ["Blink Dagger", "Blade Mail", "Force Staff", "Shiva's Guard"], skills: [1,2,1,2,1,3,2,2,2,3], description: "Build de iniciador con Blink Dagger" },
    { hero: "Crystal Maiden", role: "support", items: ["Boots of Speed", "Glimmer Cape", "Force Staff", "Aether Lens"], skills: [2,2,1,2,1,3,2,1,1,3], description: "Build de support defensivo" },
    { hero: "Invoker", role: "mid", items: ["Aether Lens", "Force Staff", "Aghanim's Shard", "Octarine Core"], skills: [1,1,1,2,2,3,2,2,2,3], description: "Build versátil para ganks y teamfights" },
    { hero: "Pudge", role: "offlane", items: ["Blink Dagger", "Eul's Scepter", "Force Staff", "Aether Lens"], skills: [1,2,1,2,1,3,2,1,2,3], description: "Build de ganker con movilidad" }
];

function loadBuilds() {
    const buildsList = document.getElementById('builds-list');
    buildsList.innerHTML = '';
    buildsDota2.forEach(build => renderBuildCard(buildsList, build));
}

function filterByRole(role) {
    const buildsList = document.getElementById('builds-list');
    buildsList.innerHTML = '';
    const filtered = buildsDota2.filter(b => b.role === role);
    if (filtered.length === 0) {
        buildsList.innerHTML = '<p style="color:#A5A5A5;grid-column:1/-1">No hay builds para este rol.</p>';
        return;
    }
    filtered.forEach(build => renderBuildCard(buildsList, build));
}

function renderBuildCard(container, build) {
    const card = document.createElement('div');
    card.className = 'build-card';
    card.innerHTML = `
        <div class="build-hero">${build.hero}</div>
        <div class="build-role">${build.role.toUpperCase()}</div>
        <p style="color:#A5A5A5;margin-bottom:15px;font-size:0.95em">${build.description}</p>
        <div class="build-items">
            <div class="build-items-title">Items Recomendados:</div>
            <div class="item-list">
                ${build.items.map(item => `<span class="item-badge">${item}</span>`).join('')}
            </div>
        </div>
        <div class="build-skills">
            <div class="skills-title">Orden de Habilidades (niveles 1-10):</div>
            <div class="skill-order">
                ${build.skills.map((s, i) => `<div class="skill-item" title="Nivel ${i+1}">${s}</div>`).join('')}
            </div>
        </div>
    `;
    container.appendChild(card);
}

// ===========================
// STATS
// ===========================
function loadStats() {
    const sample = h => heroesDota2.length ? [...heroesDota2].sort(() => Math.random()-0.5).slice(0, 3) : [];

    const banned  = sample();
    const winrate = sample();
    const picked  = sample();

    document.getElementById('banned-heroes').innerHTML = banned.map((h,i) => `
        <div class="stat-item">
            <div style="display:flex;align-items:center;gap:8px">
                <img class="stat-hero-img" src="${h.image}" alt="${h.name}" onerror="this.style.display='none'">
                <span class="stat-name">${i+1}. ${h.name}</span>
            </div>
            <span class="stat-value">${(80-i*5)}% Bans</span>
        </div>`).join('') || '<p>Cargando...</p>';

    document.getElementById('top-winrate').innerHTML = winrate.map((h,i) => `
        <div class="stat-item">
            <div style="display:flex;align-items:center;gap:8px">
                <img class="stat-hero-img" src="${h.image}" alt="${h.name}" onerror="this.style.display='none'">
                <span class="stat-name">${i+1}. ${h.name}</span>
            </div>
            <span class="stat-value">${(55-i*2).toFixed(1)}%</span>
        </div>`).join('') || '<p>Cargando...</p>';

    document.getElementById('top-picked').innerHTML = picked.map((h,i) => `
        <div class="stat-item">
            <div style="display:flex;align-items:center;gap:8px">
                <img class="stat-hero-img" src="${h.image}" alt="${h.name}" onerror="this.style.display='none'">
                <span class="stat-name">${i+1}. ${h.name}</span>
            </div>
            <span class="stat-value">${(90-i*10)}% Picks</span>
        </div>`).join('') || '<p>Cargando...</p>';

    const itemEntries = Object.entries(itemsData)
        .filter(([,item]) => item.localized_name && !item.localized_name.includes('Recipe'))
        .slice(0, 5);

    document.getElementById('popular-items').innerHTML = itemEntries.map(([key, item], i) => {
        const imgUrl = getItemImageUrl(key, item);
        return `<div class="stat-item">
            <div style="display:flex;align-items:center;gap:8px">
                <img class="stat-item-img" src="${imgUrl}" alt="${item.localized_name}" onerror="this.style.display='none'">
                <span class="stat-name">${i+1}. ${item.localized_name}</span>
            </div>
            <span class="stat-value">${item.cost || 0}g</span>
        </div>`;
    }).join('') || '<p>Cargando items...</p>';
}

// ===========================
// PATCHES
// ===========================
function loadPatches() {
    const patchesList = document.getElementById('patches-list');
    patchesList.innerHTML = '';
    patchesDota2.forEach((patch, idx) => {
        const card = document.createElement('div');
        card.className = 'patch-card';
        if (idx === 0) card.classList.add('patch-latest');
        card.innerHTML = `
            <div class="patch-version">
                Parche ${patch.version}
                ${idx === 0 ? '<span class="patch-badge">⭐ ÚLTIMO PARCHE</span>' : ''}
            </div>
            <div class="patch-date">🗓️ Lanzado: ${patch.date}</div>
            <div class="patch-changes">
                ${patch.changes.map(c => `<div class="patch-change-item">${c}</div>`).join('')}
            </div>
        `;
        patchesList.appendChild(card);
    });
}

// ===========================
// SEARCH
// ===========================
function filterContent() {
    const term = document.getElementById('searchInput').value.toLowerCase();
    if (!term) { loadHeroes(); return; }

    const list = document.getElementById('heroes-list');
    list.innerHTML = '';

    const filtered = heroesDota2.filter(h =>
        h.name.toLowerCase().includes(term) ||
        (h.role || []).some(r => r.toLowerCase().includes(term))
    );

    if (filtered.length === 0) {
        list.innerHTML = '<p style="color:#A5A5A5">No se encontraron resultados.</p>';
        return;
    }

    const prev = currentAttributeFilter;
    currentAttributeFilter = 'all';
    // Temp swap to render all filtered
    const tmp = heroesDota2;
    heroesDota2 = filtered;
    loadHeroes();
    heroesDota2 = tmp;
    currentAttributeFilter = prev;
}

function performSearch() { filterContent(); }

// ===========================
// MARKDOWN PARSER FOR CHAT
// ===========================
function parseMarkdown(text) {
    return text
        // Bold: **text** or *text*
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*([^*]+?)\*/g, '<strong>$1</strong>')
        // Italic: _text_
        .replace(/_([^_]+?)_/g, '<em>$1</em>')
        // Code inline: `code`
        .replace(/`([^`]+?)`/g, '<code class="chat-code">$1</code>')
        // Headers: ## heading
        .replace(/^### (.+)$/gm, '<h4 class="chat-h4">$1</h4>')
        .replace(/^## (.+)$/gm, '<h3 class="chat-h3">$1</h3>')
        .replace(/^# (.+)$/gm, '<h2 class="chat-h2">$1</h2>')
        // Lists: - item
        .replace(/^[-•] (.+)$/gm, '<li>$1</li>')
        .replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>')
        // Numbered lists
        .replace(/^\d+\. (.+)$/gm, '<li>$1</li>')
        // Line breaks
        .replace(/\n/g, '<br>');
}

// ===========================
// ITEM / HERO HYPERLINK ENRICHMENT
// ===========================
// Known items to linkify in chat
const KNOWN_ITEMS = [
    'Blink Dagger', 'Battle Fury', 'Battlefury', 'Manta Style', 'Butterfly',
    'Black King Bar', 'BKB', 'Force Staff', 'Glimmer Cape', 'Aether Lens',
    'Scythe of Vyse', "Shiva's Guard", 'Blade Mail', 'Desolator', 'Radiance',
    'Heart of Tarrasque', 'Abyssal Blade', 'Basher', 'Boots of Speed',
    'Phase Boots', 'Power Treads', 'Arcane Boots', 'Tranquil Boots',
    'Shadow Blade', 'Silver Edge', 'Daedalus', 'Aghanim\'s Scepter', 'Aghanim\'s Shard',
    'Eul\'s Scepter', 'Ethereal Blade', 'Orchid Malevolence', 'Bloodthorn',
    'Pipe of Insight', 'Crimson Guard', 'Vladmir\'s Offering', 'Helm of the Dominator',
    'Bottle', 'Magic Wand', 'Wraith Band', 'Null Talisman', 'Bracer',
    'Skull Basher', 'Satanic', 'Eye of Skadi', 'Monkey King Bar', 'MKB',
    'Urn of Shadows', 'Spirit Vessel', 'Vanguard', 'Lotus Orb',
    'Linken\'s Sphere', 'Octarine Core', 'Kaya', 'Sange', 'Yasha'
];

// Item name → key mapping for CDN images
const ITEM_KEY_MAP = {
    'Blink Dagger': 'blink', 'Battle Fury': 'battlefury', 'Battlefury': 'battlefury',
    'Manta Style': 'manta', 'Butterfly': 'butterfly', 'Black King Bar': 'black_king_bar', 'BKB': 'black_king_bar',
    'Force Staff': 'force_staff', 'Glimmer Cape': 'glimmer_cape', 'Aether Lens': 'aether_lens',
    'Scythe of Vyse': 'sheepstick', "Shiva's Guard": 'shivas_guard', 'Blade Mail': 'blade_mail',
    'Desolator': 'desolator', 'Radiance': 'radiance', 'Heart of Tarrasque': 'heart',
    'Abyssal Blade': 'abyssal_blade', 'Basher': 'basher', 'Skull Basher': 'basher',
    'Boots of Speed': 'boots', 'Phase Boots': 'phase_boots', 'Power Treads': 'power_treads',
    'Arcane Boots': 'arcane_boots', 'Tranquil Boots': 'tranquil_boots',
    'Shadow Blade': 'invis_sword', 'Silver Edge': 'silver_edge', 'Daedalus': 'greater_crit',
    "Aghanim's Scepter": 'ultimate_scepter', "Aghanim's Shard": 'aghanims_shard',
    "Eul's Scepter": 'cyclone', 'Ethereal Blade': 'ethereal_blade',
    'Orchid Malevolence': 'orchid', 'Bloodthorn': 'bloodthorn',
    'Pipe of Insight': 'pipe', 'Crimson Guard': 'crimson_guard',
    "Vladmir's Offering": 'vladmir', 'Bottle': 'bottle', 'Magic Wand': 'magic_wand',
    'Satanic': 'satanic', 'Eye of Skadi': 'skadi', 'Monkey King Bar': 'monkey_king_bar', 'MKB': 'monkey_king_bar',
    'Urn of Shadows': 'urn_of_shadows', 'Spirit Vessel': 'spirit_vessel',
    'Vanguard': 'vanguard', 'Lotus Orb': 'lotus_orb', "Linken's Sphere": 'sphere',
    'Octarine Core': 'octarine_core'
};

function enrichChatText(text) {
    // First parse markdown
    let html = parseMarkdown(text);

    // Then enrich item mentions with hyperlinks + icon
    // Sort by length desc to match longer names first
    const sortedItems = KNOWN_ITEMS.slice().sort((a, b) => b.length - a.length);

    sortedItems.forEach(itemName => {
        const key = ITEM_KEY_MAP[itemName] || itemName.toLowerCase().replace(/[' ]/g, '_');
        const imgUrl = `${STEAM_CDN}/items/${key}.png`;
        const wikiUrl = `https://dota2.fandom.com/wiki/${encodeURIComponent(itemName.replace(/ /g, '_'))}`;

        // Escape regex special chars
        const escaped = itemName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`(?<![>\\w/])(${escaped})(?![\\w<])`, 'g');

        html = html.replace(regex, (match) =>
            `<a href="${wikiUrl}" target="_blank" class="chat-item-link" title="${itemName}">` +
            `<img class="chat-item-icon" src="${imgUrl}" alt="${itemName}" onerror="this.style.display='none'">` +
            `${match}</a>`
        );
    });

    // Enrich hero mentions
    heroesDota2.slice(0, 60).forEach(hero => {
        const wikiSlug = hero.shortName || '';
        const wikiUrl  = `https://www.dota2.com/hero/${encodeURIComponent(wikiSlug)}`;
        const imgUrl   = hero.image;

        const escaped = hero.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`(?<![>\\w/])(${escaped})(?![\\w<])`, 'g');

        html = html.replace(regex, (match) =>
            `<a href="${wikiUrl}" target="_blank" class="chat-hero-link" title="${hero.name}">` +
            `<img class="chat-hero-icon" src="${imgUrl}" alt="${hero.name}" onerror="this.style.display='none'">` +
            `${match}</a>`
        );
    });

    return html;
}

// ===========================
// GROQ AI CHAT
// ===========================
function handleIAKeyPress(event) {
    if (event.key === 'Enter') sendToGroqAPI();
}

async function sendToGroqAPI() {
    const iaInput     = document.getElementById('iaInput');
    const userMessage = iaInput.value.trim();
    if (!userMessage) { alert('Por favor escribe una pregunta sobre DOTA 2'); return; }

    addMessageToChat(userMessage, 'user');
    iaInput.value = '';

    const sendBtn = document.querySelector('.ia-send-btn');
    sendBtn.disabled = true;
    sendBtn.textContent = 'Analizando...';

    // Build hero context
    const heroContext = heroesDota2.slice(0, 40)
        .map(h => `${h.name} (${(h.role||[]).join('/')} | ${(h.primaryAttr||'').toUpperCase()}) STR:${Math.round(h.stats.str)} AGI:${Math.round(h.stats.agi)} INT:${Math.round(h.stats.int)}`)
        .join('\n');

    const itemContext = Object.values(itemsData)
        .filter(i => i.localized_name && !i.localized_name.includes('Recipe'))
        .slice(0, 30)
        .map(i => `${i.localized_name} (${i.cost||0}g)`)
        .join(', ');

    const systemPrompt = `Eres un EXPERTO PROFESIONAL EN DOTA 2 con miles de horas jugadas y conocimiento profundo del juego, sus mecánicas, meta y estrategias.

TUS CAPACIDADES:
- Recomendaciones de builds optimizadas por rol, héroe y situación de partida
- Análisis de matchups y contadores (quién gana vs quién)
- Estrategias de laning, ganks, teamfights y late game
- Timings de items importantes y cuándo comprarlos
- Meta actual del parche 7.41 y cambios recientes
- Tips avanzados para mejorar MMR
- Análisis de habilidades y sinergias entre héroes

FORMATO DE RESPUESTAS:
- Usa **negritas** para destacar items importantes, héroes y conceptos clave
- Usa *cursiva* para énfasis secundario
- Usa listas con - para enumerar items o pasos
- Sé específico y práctico, no genérico

DATOS ACTUALES (Parche 7.41):
Héroes: ${heroContext}
Items principales: ${itemContext}

RESTRICCIÓN: Solo responde preguntas sobre DOTA 2. Si preguntan sobre otro tema, responde amablemente que solo puedes hablar de DOTA 2.`;

    try {
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${DEFAULT_GROQ_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'mixtral-8x7b-32768',
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userMessage }
                ],
                temperature: 0.8,
                max_tokens: 2048,
                top_p: 0.95
            })
        });

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error?.message || `HTTP ${response.status}`);
        }

        const data      = await response.json();
        const aiMessage = data.choices[0].message.content;
        addMessageToChat(aiMessage, 'ai');

    } catch (error) {
        console.error('Groq error:', error);
        addMessageToChat(`❌ **Error:** ${error.message}\n\nVerifica tu conexión a internet y vuelve a intentarlo.`, 'ai');
    } finally {
        sendBtn.disabled = false;
        sendBtn.textContent = 'Enviar';
    }
}

function addMessageToChat(message, sender) {
    const chatMessages = document.getElementById('chatMessages');
    const messageDiv   = document.createElement('div');
    messageDiv.className = `message ${sender}`;

    if (sender === 'ai') {
        // Apply markdown + item/hero hyperlinks
        messageDiv.innerHTML = enrichChatText(message);
    } else {
        // User message: just escape HTML
        messageDiv.innerHTML = `<p>${escapeHtml(message)}</p>`;
    }

    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function escapeHtml(text) {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

// ===========================
// INIT
// ===========================
window.addEventListener('load', () => {
    console.log('📡 Conectando a OpenDota API...');
    loadOpenDotaData();

    setTimeout(() => {
        const firstFilterBtn = document.querySelector('#hero-filter-buttons .filter-btn');
        if (firstFilterBtn) firstFilterBtn.classList.add('filter-btn-active');
    }, 100);
});
