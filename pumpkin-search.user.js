// ==UserScript==
// @name WPlace | Pumpkin Search
// @namespace http://tampermonkey.net/
// @version 1.22
// @description Удобная панель для поиска тыкв, данные берутся из открытой Excel таблицы. Мобильная версия + механизм сворачивания.
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
    let miniButton = null;
    let isDragging = false;
    let dragOffset = { x: 0, y: 0 };
    let currentPos = { x: window.innerWidth - 340, y: 20 };
    let isMinimized = false;

    function utcToMsk(utcHour) {
        return (utcHour + 3) % 24;
    }
    function formatMskHour(utcHour) {
        const msk = utcToMsk(utcHour);
        return `${msk.toString().padStart(2, '0')}:00 МСК`;
    }
    const pumpkinIcon = '<svg width="16" height="16" viewBox="0 0 24 24" fill="#ff6600"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.94-.49-7-3.85-7-7.93s2.61-7.2 6-7.93V17.93zm2-13.86c3.39.46 6 3.39 6 6.86s-2.61 7.2-6 7.93V4.07z"/></svg>';
    const searchIcon = '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg>';
    const refreshIcon = '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M17.65 6.35A7.958 7.958 0 0012 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08A5.99 5.99 0 0112 18c-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/></svg>';
    const minimizeIcon = '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M19 13H5v-2h14v2z"/></svg>';

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
                    <button onclick="toggleMinimize()" class="btn-minimize" title="Скрыть">${minimizeIcon} Скрыть</button>
                </div>
            </div>
            <div class="main-content">
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
            </div>
        `;
        document.body.appendChild(sidebar);
        updateStyles();
        initDrag();
        sidebar.style.left = currentPos.x + 'px';
        sidebar.style.top = currentPos.y + 'px';
    }

    function toggleMinimize() {
        if (isMinimized) {
            showSidebar();
        } else {
            hideSidebar();
        }
    }

    function hideSidebar() {
        isMinimized = true;
        sidebar.style.display = 'none';
        createMiniButton();
    }

    function showSidebar() {
        isMinimized = false;
        sidebar.style.left = currentPos.x + 'px';
        sidebar.style.top = currentPos.y + 'px';
        sidebar.style.display = 'flex';
        if (miniButton) {
            miniButton.remove();
            miniButton = null;
        }
        initDrag();
    }

    function createMiniButton() {
        if (miniButton) return;
        miniButton = document.createElement('div');
        miniButton.id = 'pumpkinMiniButton';
        miniButton.innerHTML = '🎃';
        miniButton.style.cssText = `
            position: absolute;
            left: ${currentPos.x}px;
            top: ${currentPos.y}px;
            width: 40px;
            height: 40px;
            background: linear-gradient(135deg, #ff6600 0%, #e55a00 100%);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            box-shadow: 0 4px 12px rgba(255,102,0,0.4);
            z-index: 10001;
            font-size: 20px;
            color: #fff;
            user-select: none;
            touch-action: manipulation;
            -webkit-user-select: none;
            -webkit-touch-callout: none;
        `;
        miniButton.oncontextmenu = (e) => e.preventDefault();
        document.body.appendChild(miniButton);
        initMiniDrag();
    }

    function initMiniDrag() {
        if (!miniButton) return;
        let miniDragging = false;
        let miniOffset = { x: 0, y: 0 };
        let touchStartX = 0;
        let touchStartY = 0;
        let touchStartTime = 0;
        let startMiniDrag = function(e) {
            e.preventDefault();
            e.stopPropagation();
            if (e.type === 'touchstart') {
                e = e.touches[0];
            }
            touchStartX = e.clientX;
            touchStartY = e.clientY;
            touchStartTime = Date.now();
            const rect = miniButton.getBoundingClientRect();
            miniOffset.x = e.clientX - rect.left;
            miniOffset.y = e.clientY - rect.top;
            miniDragging = true;
        };
        let dragMini = function(e) {
            if (!miniDragging) return;
            e.preventDefault();
            e.stopPropagation();
            if (e.type === 'touchmove') {
                e = e.touches[0];
            }
            currentPos.x = e.clientX - miniOffset.x;
            currentPos.y = e.clientY - miniOffset.y;
            miniButton.style.left = currentPos.x + 'px';
            miniButton.style.top = currentPos.y + 'px';
        };
        let stopMiniDrag = function(e) {
            if (!miniDragging) return;
            miniDragging = false;
            if (e.type === 'touchend') {
                e = e.changedTouches[0];
            }
            const deltaX = Math.abs(e.clientX - touchStartX);
            const deltaY = Math.abs(e.clientY - touchStartY);
            const deltaTime = Date.now() - touchStartTime;
            if (deltaX < 20 && deltaY < 20 && deltaTime < 500) {
                showSidebar();
            }
        };
        miniButton.addEventListener('mousedown', startMiniDrag, { passive: false });
        miniButton.addEventListener('touchstart', startMiniDrag, { passive: false });
        document.addEventListener('mousemove', dragMini, { passive: false });
        document.addEventListener('touchmove', dragMini, { passive: false });
        document.addEventListener('mouseup', stopMiniDrag, { passive: false });
        document.addEventListener('touchend', stopMiniDrag, { passive: false });
    }

    function initDrag() {
        const header = sidebar?.querySelector('.header');
        if (!header) return;
        let dragging = false;
        let offset = { x: 0, y: 0 };
        let startDrag = function(e) {
            if (e.target.closest('.btn-refresh') || e.target.closest('.btn-minimize')) return;
            e.preventDefault();
            e.stopPropagation();
            if (e.type === 'touchstart') {
                e = e.touches[0];
            }
            const rect = sidebar.getBoundingClientRect();
            offset.x = e.clientX - rect.left;
            offset.y = e.clientY - rect.top;
            dragging = true;
        };
        let drag = function(e) {
            if (!dragging) return;
            e.preventDefault();
            e.stopPropagation();
            if (e.type === 'touchmove') {
                e = e.touches[0];
            }
            currentPos.x = e.clientX - offset.x;
            currentPos.y = e.clientY - offset.y;
            sidebar.style.left = currentPos.x + 'px';
            sidebar.style.top = currentPos.y + 'px';
            if (miniButton) {
                miniButton.style.left = currentPos.x + 'px';
                miniButton.style.top = currentPos.y + 'px';
            }
        };
        let stopDrag = function(e) {
            dragging = false;
        };
        header.addEventListener('mousedown', startDrag, { passive: false });
        header.addEventListener('touchstart', startDrag, { passive: false });
        document.addEventListener('mousemove', drag, { passive: false });
        document.addEventListener('touchmove', drag, { passive: false });
        document.addEventListener('mouseup', stopDrag);
        document.addEventListener('touchend', stopDrag);
        header.oncontextmenu = (e) => e.preventDefault();
    }

    function updateStyles() {
        const style = document.createElement('style');
        style.textContent = `
            #pumpkinSidebar {
                position: absolute !important; left: ${currentPos.x}px; top: ${currentPos.y}px; width: 320px; max-width: 90vw; height: 70vh; max-height: 80vh;
                background: rgba(30, 30, 30, 0.65); border-radius: 16px; box-shadow: 0 20px 40px rgba(0,0,0,0.3); overflow: hidden; font-family: system-ui, -apple-system, sans-serif;
                z-index: 10000; opacity: 1; color: #fff;
                backdrop-filter: blur(10px);
                display: flex;
                flex-direction: column;
                touch-action: manipulation;
                -webkit-user-select: none;
                -webkit-touch-callout: none;
            }
            #pumpkinSidebar .main-content { display: flex; flex-direction: column; flex: 1; overflow: hidden; }
            .header {
                display: flex;
                flex-direction: column;
                gap: 12px;
                padding: 16px 16px 12px 16px;
                background: linear-gradient(135deg, #ff6600 0%, #e55a00 100%); cursor: move; user-select: none;
                border-radius: 16px 16px 0 0;
                touch-action: manipulation;
                -webkit-user-select: none;
                -webkit-touch-callout: none;
            }
            .title {
                font-size: 18px;
                font-weight: 600;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 8px;
                margin: 0;
                width: 100%;
            }
            .header-actions {
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 8px;
                width: 100%;
            }
            .btn-refresh, .btn-minimize { background: rgba(255,255,255,0.2); border: none; color: #fff; cursor: pointer; padding: 8px 12px; border-radius: 6px; transition: background 0.2s; display: flex; align-items: center; gap: 4px; flex: 1; max-width: none; }
            .btn-refresh:hover, .btn-minimize:hover { background: rgba(255,255,255,0.3); }
            .btn-minimize:active { transform: scale(0.95); }
            .controls { padding: 16px 16px 4px 16px; background: rgba(42, 42, 42, 0.65); flex-shrink: 0; }
            .control-group { display: flex; gap: 8px; align-items: center; margin-bottom: 4px; }
            .control-group label { color: #ccc; }
            input { flex: 1; padding: 10px 12px; border: 1px solid #444; border-radius: 8px; font-size: 14px; background: #333; color: #fff; transition: border-color 0.2s; }
            input:focus { outline: none; border-color: #ff6600; box-shadow: 0 0 0 2px rgba(255,102,0,0.2); }
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
                width: 6px;
                height: 6px;
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
            .error { text-align: center; padding: 4px; color: #ff6600; background: rgba(42, 42, 42, 0.65); flex-shrink: 0; }
            .list { list-style: none; padding: 0 16px 16px; margin: 0; overflow-y: auto; flex: 1; background: rgba(42, 42, 42, 0.65); }
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
                background: rgba(42, 42, 42, 0.65);
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
            #pumpkinMiniButton:hover {
                transform: scale(1.1);
                box-shadow: 0 6px 16px rgba(255,102,0,0.6);
            }
            @media (max-width: 768px) {
                #pumpkinSidebar {
                    width: 85vw;
                    height: 60vh;
                    left: 5px !important;
                    top: 5px !important;
                    border-radius: 12px;
                    touch-action: manipulation;
                }
                .header {
                    gap: 8px;
                    padding: 12px;
                    touch-action: manipulation;
                }
                .title {
                    justify-content: center;
                    text-align: center;
                }
                .header-actions {
                    justify-content: space-around;
                    gap: 8px;
                }
                .btn-refresh, .btn-minimize {
                    flex: 1;
                    max-width: none;
                    justify-content: center;
                    min-width: 100px;
                }
                .controls { padding: 12px 12px 4px 12px; }
                .control-group { flex-direction: column; align-items: stretch; }
                .control-group label { text-align: center; }
                input { font-size: 16px; padding: 12px; }
                .error { padding: 4px; }
                .list { padding: 0 12px 12px; }
                .list li { padding: 12px; margin: 6px 0; font-size: 14px; }
                .footer { padding: 12px; }
                .telegram-button { padding: 12px 16px; font-size: 16px; }
                #pumpkinMiniButton {
                    width: 50px;
                    height: 50px;
                    font-size: 24px;
                    left: 5px !important;
                    top: 5px !important;
                    touch-action: manipulation;
                }
                .spinner {
                    width: 4px;
                    height: 4px;
                }
            }
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
        if (searchId > 0) {
            filtered = filtered.filter(p => p.id === searchId);
        } else {
            filtered = filtered.sort((a, b) => a.id - b.id);
        }
        displayPumpkinsSB(filtered);
    }

    function displayPumpkinsSB(pumpkins) {
        const list = document.getElementById('pumpkinListSB');
        if (!list) return;
        const errorEl = document.getElementById('errorSB');
        if (allPumpkins.length === 0) {
            list.innerHTML = '';
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
    window.toggleMinimize = toggleMinimize;
})();
