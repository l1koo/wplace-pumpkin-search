// ==UserScript==
// @name WPlace | Pumpkin Search
// @namespace http://tampermonkey.net/
// @version 1.0
// @description Удобная панель для поиска тыкв, данные берутся из открытой Excel таблицы
// @author l1kko
// @match https://wplace.live/*
// @grant none
// ==/UserScript==
(function() {
    'use strict';
    const SHEET_ID = '1Bb6uTbwmUCAjSA-ySqbAVFoDa8x2Cui5HRbjUb03Zlg';
    const GID = '0';
    const CSV_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${GID}`;
    const TELEGRAM_LINK = 'https://t.me/yaclown1';
    let allPumpkins = [];
    let sidebar = null;
    let isDragging = false;
    let dragOffset = { x: 0, y: 0 };
    let currentPos = { x: window.innerWidth - 340, y: 20 };
    function utcToMsk(utcHour) {
        return (utcHour + 3) % 24;
    }
    function formatMskHour(utcHour) {
        const msk = utcToMsk(utcHour);
        return `${msk.toString().padStart(2, '0')}:00 МСК`;
    }
    const pumpkinIcon = '<svg width="5" height="16" viewBox="0 0 24 24" fill="#ff6600"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.94-.49-7-3.85-7-7.93s2.61-7.2 6-7.93V17.93zm2-13.86c3.39.46 6 3.39 6 6.86s-2.61 7.2-6 7.93V4.07z"/></svg>';
    const searchIcon = '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg>';
    const refreshIcon = '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M17.65 6.35A7.958 7.958 0 0012 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08A5.99 5.99 0 0112 18c-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/></svg>';
    function createSidebar() {
        if (sidebar) return;
        const titleText = `${pumpkinIcon} 🎃 Pumpkin Search`;
        sidebar = document.createElement('div');
        sidebar.id = 'pumpkinSidebar';
        sidebar.innerHTML = `
            <div class="header">
                <span class="title">${titleText}</span>
                <div class="header-actions">
                    <button onclick="loadDataSB()" class="btn-refresh">${refreshIcon} Обновить</button>
                </div>
            </div>
            <div class="controls">
                <div class="control-group">
                    <label>${searchIcon}</label>
                    <input type="number" id="idSearchSB" placeholder="Номер тыквы (1-100)" min="1" max="100">
                </div>
            </div>
            <div id="loadingSB" class="loading">Загрузка... <div class="spinner"></div></div>
            <div id="errorSB" class="error"></div>
            <ul id="pumpkinListSB" class="list"></ul>
            <div class="footer">
                <a href="${TELEGRAM_LINK}" target="_blank" class="telegram-button">Наш Telegram</a>
                <div class="credit">by l1kko</div>
            </div>
        `;
        document.body.appendChild(sidebar);
        updateStyles();
        initDrag();
        sidebar.style.left = currentPos.x + 'px';
        sidebar.style.top = currentPos.y + 'px';
    }
    function initDrag() {
        const header = sidebar?.querySelector('.header');
        if (!header) return;
        header.onmousedown = startDrag;
        document.onmouseup = stopDrag;
        document.onmousemove = drag;
    }
    function startDrag(e) {
        if (e.button !== 0) return;
        isDragging = true;
        const rect = sidebar.getBoundingClientRect();
        dragOffset.x = e.clientX - rect.left;
        dragOffset.y = e.clientY - rect.top;
        e.preventDefault();
    }
    function drag(e) {
        if (!isDragging) return;
        currentPos.x = e.clientX - dragOffset.x;
        currentPos.y = e.clientY - dragOffset.y;
        sidebar.style.left = currentPos.x + 'px';
        sidebar.style.top = currentPos.y + 'px';
    }
    function stopDrag() {
        isDragging = false;
    }
    function updateStyles() {
        const style = document.createElement('style');
        style.textContent = `
            #pumpkinSidebar {
                position: absolute !important; left: ${currentPos.x}px; top: ${currentPos.y}px; width: 320px; max-width: 90vw; height: 70vh; max-height: 80vh;
                background: #1e1e1e; border-radius: 16px; box-shadow: 0 20px 40px rgba(0,0,0,0.3); overflow: hidden; font-family: system-ui, -apple-system, sans-serif;
                transition: all 0.3s ease; z-index: 10000; opacity: 1; color: #fff;
                backdrop-filter: blur(10px);
                display: flex;
                flex-direction: column;
            }
            .header {
                display: flex; justify-content: space-between; align-items: center; padding: 16px 16px 16px 12px;
                background: linear-gradient(135deg, #ff6600 0%, #e55a00 100%); cursor: move; user-select: none;
                border-radius: 16px 16px 0 0;
            }
            .title { font-size: 18px; font-weight: 600; display: flex; align-items: center; gap: 8px; margin-left: -8px; }
            .header-actions { display: flex; align-items: center; gap: 8px; }
            .btn-refresh { background: rgba(255,255,255,0.2); border: none; color: #fff; cursor: pointer; padding: 8px; border-radius: 6px; transition: background 0.2s; display: flex; align-items: center; gap: 4px; }
            .btn-refresh:hover { background: rgba(255,255,255,0.3); }
            .controls { padding: 16px; background: #2a2a2a; flex-shrink: 0; }
            .control-group { display: flex; gap: 8px; align-items: center; margin-bottom: 12px; }
            .control-group label { color: #ccc; }
            select, input { flex: 1; padding: 10px 12px; border: 1px solid #444; border-radius: 8px; font-size: 14px; background: #333; color: #fff; transition: border-color 0.2s; }
            select:focus, input:focus { outline: none; border-color: #ff6600; box-shadow: 0 0 0 2px rgba(255,102,0,0.2); }
            .loading {
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                text-align: center;
                padding: 6px;
                color: #fff;
                font-style: italic;
                font-size: 14px;
                background: linear-gradient(135deg, #ff6600 0%, #e55a00 100%);
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 6px;
                z-index: 10001;
                border-radius: 10px;
                box-shadow: 0 4px 12px rgba(255,102,0,0.4);
                width: 70%;
                max-width: 200px;
                animation: loadingPulse 2s ease-in-out infinite;
            }
            .spinner {
                width: 10px;
                height: 10px;
                border: 2px solid rgba(255,255,255,0.3);
                border-top: 2px solid #fff;
                border-radius: 50%;
                animation: spin 1s linear infinite;
            }
            @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
            @keyframes loadingPulse {
                0%, 100% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
                50% { opacity: 0.8; transform: translate(-50%, -50%) scale(1.05); }
            }
            .error { text-align: center; padding: 12px; color: #ff6600; background: #2a2a2a; flex-shrink: 0; }
            .list { list-style: none; padding: 0 16px 16px; margin: 0; overflow-y: auto; flex: 1; background: #2a2a2a; }
            .list li {
                margin: 8px 0; padding: 12px; background: #333; border-radius: 12px; border-left: 4px solid #ff6600;
                transition: all 0.3s ease; animation: fadeIn 0.5s ease;
            }
            .list li:hover { transform: translateX(4px); box-shadow: 0 8px 20px rgba(255,102,0,0.2); }
            .list a { color: #ff6600; text-decoration: none; font-weight: 500; }
            .list a:hover { text-decoration: underline; }
            @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
            .footer {
                padding: 16px;
                background: #2a2a2a;
                text-align: center;
                border-top: 1px solid #444;
                flex-shrink: 0;
            }
            .telegram-button {
                display: inline-block;
                padding: 10px 20px;
                background: linear-gradient(135deg, #ff6600 0%, #e55a00 100%);
                color: #fff;
                text-decoration: none;
                border-radius: 8px;
                font-weight: 500;
                transition: all 0.3s ease;
                box-shadow: 0 2px 10px rgba(255, 102, 0, 0.3);
                transform: translateY(0);
                margin-bottom: 8px;
                display: block;
            }
            .telegram-button:hover {
                background: linear-gradient(135deg, #e55a00 0%, #cc4f00 100%);
                transform: translateY(-2px) scale(1.02);
                box-shadow: 0 6px 20px rgba(255, 102, 0, 0.5);
            }
            @keyframes telegramGlow {
                0% { box-shadow: 0 2px 10px rgba(255, 102, 0, 0.3); }
                50% { box-shadow: 0 2px 10px rgba(255, 102, 0, 0.6); }
                100% { box-shadow: 0 2px 10px rgba(255, 102, 0, 0.3); }
            }
            .telegram-button:active {
                animation: telegramGlow 0.6s ease-in-out;
            }
            .credit {
                font-size: 12px;
                color: #999;
                font-style: italic;
            }
            @media (max-width: 768px) { #pumpkinSidebar { width: 90vw; height: 85vh; left: 5px !important; top: 5px !important; } .header { flex-direction: column; gap: 8px; } .header-actions { justify-content: center; } }
            @media (prefers-color-scheme: light) { #pumpkinSidebar { background: #f5f5f5; color: #333; } .controls, .list, .footer { background: #fff; } select, input { background: #fff; border-color: #ddd; } .btn-refresh { background: #f0f0f0; color: #666; } .telegram-button { background: linear-gradient(135deg, #ff6600 0%, #e55a00 100%); color: #fff; box-shadow: 0 2px 10px rgba(255, 102, 0, 0.3); } .telegram-button:hover { background: linear-gradient(135deg, #e55a00 0%, #cc4f00 100%); box-shadow: 0 6px 20px rgba(255, 102, 0, 0.5); } .credit { color: #666; } }
        `;
        document.head.appendChild(style);
    }
    async function loadDataSB() {
        const loadingEl = document.getElementById('loadingSB');
        const errorEl = document.getElementById('errorSB');
        if (loadingEl) loadingEl.style.display = 'flex';
        if (errorEl) errorEl.style.display = 'none';
        const listEl = document.getElementById('pumpkinListSB');
        if (listEl) listEl.innerHTML = '';
        try {
            console.log('Загрузка CSV из:', CSV_URL);
            const response = await fetch(CSV_URL);
            if (!response.ok) throw new Error('Доступ запрещён (403). Сделайте таблицу публичной: Share → Anyone with link → Viewer');
            const csvText = await response.text();
            console.log('CSV загружен, длина:', csvText.length);
            allPumpkins = parseCSV(csvText);
            if (errorEl) {
                if (allPumpkins.length > 0) {
                    errorEl.innerHTML = `${allPumpkins.length} тыкв загружено!`;
                    errorEl.style.color = '#4caf50';
                } else {
                    errorEl.innerHTML = 'Пока тыквы не найдены, подождите';
                    errorEl.style.color = '#ff6600';
                }
                errorEl.style.display = 'block';
            }
        } catch (error) {
            console.error('Ошибка загрузки:', error);
            if (errorEl) {
                errorEl.innerHTML = `Ошибка: ${error.message}`;
                errorEl.style.color = '#ff0000';
                errorEl.style.display = 'block';
            }
            allPumpkins = [];
        } finally {
            if (loadingEl) loadingEl.style.display = 'none';
            filterPumpkinsSB();
        }
    }
    function parseCSV(csvText) {
        const lines = csvText.trim().split('\n');
        if (lines.length < 2) return [];
        const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
        console.log('Заголовки:', headers);
        const data = [];
        for (let i = 1; i < lines.length && data.length < 100; i++) {
            const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
            if (values.length >= 3) {
                const idIdx = headers.indexOf('ID') !== -1 ? headers.indexOf('ID') : 0;
                const hourIdx = headers.indexOf('Hour') !== -1 ? headers.indexOf('Hour') : 1;
                const linkIdx = headers.indexOf('Link') !== -1 ? headers.indexOf('Link') : 2;
                const pumpkin = {
                    id: parseInt(values[idIdx]) || 0,
                    hour: parseInt(values[hourIdx]) || 0,
                    link: values[linkIdx] || ''
                };
                if (pumpkin.id > 0 && pumpkin.id <= 100 && pumpkin.link.includes('wplace.live')) data.push(pumpkin);
            }
        }
        return data.sort((a, b) => a.id - b.id);
    }
    function filterPumpkinsSB() {
        const input = document.getElementById('idSearchSB');
        if (!input) return;
        const searchId = parseInt(input.value) || 0;
        let filtered = allPumpkins.filter(p => p.id <= 100);
        if (searchId) filtered = filtered.filter(p => p.id === searchId);
        displayPumpkinsSB(filtered);
    }
    function displayPumpkinsSB(pumpkins) {
        const list = document.getElementById('pumpkinListSB');
        if (!list) return;
        const errorEl = document.getElementById('errorSB');
        if (allPumpkins.length === 0) {
            const message = errorEl ? errorEl.innerHTML : 'Пока тыквы не найдены, подождите';
            const color = errorEl ? (errorEl.style.color || '#ff6600') : '#ff6600';
            list.innerHTML = `<li style="text-align:center; color:${color};">${message}</li>`;
            return;
        }
        if (pumpkins.length === 0) {
            list.innerHTML = '<li style="text-align:center; color:#999;">Нет тыкв по фильтру (проверьте ID 1-100)</li>';
            return;
        }
        list.innerHTML = pumpkins.map(p => `
            <li>
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
                    <strong>ID ${p.id}</strong>
                    <small style="color:#ccc;">${formatMskHour(p.hour)}</small>
                </div>
                <a href="${p.link}" target="_blank">Открыть позицию на карте 🎃</a>
            </li>
        `).join('');
    }
    if (window.location.hostname === 'wplace.live') {
        createSidebar();
        loadDataSB();
        setInterval(loadDataSB, 3600000);
        const input = document.getElementById('idSearchSB');
        if (input) input.oninput = filterPumpkinsSB;
    }
    window.loadDataSB = loadDataSB;
    window.filterPumpkinsSB = filterPumpkinsSB;
})();