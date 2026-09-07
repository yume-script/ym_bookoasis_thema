// plugins/metadata/theme_previewer/script.js
//
// BookOasis 실제 테마 저장소는 브라우저 localStorage['app_dashboard_theme']이며,
// <head>의 부트 스크립트가 이 값을 읽어 <html data-app-theme="..."> 로 반영합니다.
// 이 파일은 그 값을 직접 읽고 씁니다(서버 API 호출 없음).
//
// 미리보기는 메인 페이지를 직접 바꾸지 않고, 실제 사이트 CSS(/static/css/style.css,
// /api/media/settings/custom-themes.css)를 불러오는 별도 iframe 문서 안에서
// data-app-theme만 바꿔서 진짜 색상으로 상세한 목업을 렌더링합니다.
// 모든 치수는 vw 단위라 iframe 실제 렌더 크기가 달라져도 비율대로 자동 확대/축소됩니다.
(function () {
    var STORAGE_KEY = 'app_dashboard_theme';
    var CSS_HREFS = [
        '/static/css/style.css',
        '/api/media/settings/custom-themes.css'
    ];

    var THEMES = [
        { value: 'purple', label: '퍼플 (Purple)', desc: 'BookOasis 시그니처 기본 테마입니다.' },
        { value: 'dark', label: '다크 (Dark)', desc: 'OLED 화면에 어울리는 클래식 다크 테마입니다.' },
        { value: 'light', label: '라이트 (Light)', desc: '밝고 깔끔한 화이트 테마입니다.' },
        { value: 'sepia', label: '세피아 (Sepia)', desc: '따뜻한 갈색 톤의 클래식 세피아 테마입니다.' },
        { value: 'blue', label: '블루 (Blue)', desc: '차분한 딥 네이비 톤의 블루 테마입니다.' },
        { value: 'aquamarine', label: '아쿠아마린 (Aquamarine)', desc: '청록/오렌지 포인트의 테마입니다.' },
        { value: 'ironman', label: '아이언맨 (Ironman)', desc: '레드&골드 포인트의 강렬한 테마입니다.' },
        { value: 'epaper', label: '이페이퍼 (E-paper)', desc: '전자종이 리더기용 고대비 흑백 테마입니다.' }
    ];

    var VIEWS = ['dashboard', 'detail'];
    var VIEW_LABELS = { dashboard: '대시보드', detail: '상세 화면' };
    var SIDEBAR_MENU = ['Home', '최근 읽은 도서', '즐겨찾기', '컬렉션', '스마트 추천', '플러그인', '전체보기'];
    var BOOK_TITLES = ['나 혼자만 레벨업', '움직이지 않는 그림자', '그는 친구', 'I LOVE YOU', '오모리', '완간 미드나잇', '오늘만 사는 기사', '아내는 나를'];

    // ---- 커스텀 테마 만들기 ----
    // README.md 실제 규격: vars에 아래 15개 키가 전부 있어야 하며 그 외 키는 허용되지 않음.
    // kind: 'hex'는 #rrggbb 색상, 'rgb'는 "R, G, B" 정수 3개(콤마 구분, 알파 없음) 형식.
    // UI에서는 둘 다 동일한 색상 picker로 다루고, 저장/내보내기 시점에만 kind에 맞게 변환한다.
    var CUSTOM_STORAGE_KEY = 'app_custom_theme_colors';
    var CUSTOM_META_STORAGE_KEY = 'app_custom_theme_meta';
    var BUILTIN_IDS = ['purple', 'dark', 'light', 'sepia', 'blue', 'aquamarine', 'ironman', 'epaper'];
    var CUSTOM_TOKENS = [
        { key: 'app-bg-main', label: '메인 배경', sub: '전체 배경색', kind: 'hex' },
        { key: 'app-bg-sidebar', label: '사이드바 배경', sub: '사이드바 · 상단바', kind: 'hex' },
        { key: 'app-bg-card', label: '카드 배경', sub: '위젯 · 표 · 폼 박스', kind: 'hex' },
        { key: 'app-bg-card-hover', label: '카드 호버 배경', sub: '마우스 오버 시', kind: 'hex' },
        { key: 'app-text-primary', label: '기본 텍스트', sub: '제목 · 본문', kind: 'hex' },
        { key: 'app-text-muted', label: '보조 텍스트', sub: '설명 · 타임스탬프', kind: 'hex' },
        { key: 'app-text-secondary', label: '강조 보조 텍스트', sub: '서브 타이틀', kind: 'hex' },
        { key: 'app-accent', label: '강조색', sub: '버튼 · 활성 탭', kind: 'hex' },
        { key: 'app-accent-hover', label: '강조 호버색', sub: '버튼 마우스 오버', kind: 'hex' },
        { key: 'app-accent-contrast', label: '강조색 위 글자색', sub: 'accent 배경 위 텍스트 (밝으면 어둡게, 어두우면 흰색)', kind: 'hex' },
        { key: 'app-border', label: '테두리', sub: '카드 · 입력창 테두리', kind: 'hex' },
        { key: 'app-border-light', label: '연한 테두리', sub: '항목 구분선', kind: 'hex' },
        { key: 'app-input-bg', label: '입력창 배경', sub: 'input · select', kind: 'hex' },
        { key: 'app-panel-rgb', label: '반투명 패널 배경', sub: 'rgba(var(--app-panel-rgb), a) 용', kind: 'rgb' },
        { key: 'app-panel-border-rgb', label: '반투명 패널 테두리', sub: 'rgba(var(--app-panel-border-rgb), a) 용', kind: 'rgb' }
    ];
    var DEFAULT_CUSTOM_COLORS = {
        'app-bg-main': '#0f172a',
        'app-bg-sidebar': '#111827',
        'app-bg-card': '#1e293b',
        'app-bg-card-hover': '#243044',
        'app-text-primary': '#f1f5f9',
        'app-text-muted': '#94a3b8',
        'app-text-secondary': '#cbd5e1',
        'app-accent': '#a855f7',
        'app-accent-hover': '#9333ea',
        'app-accent-contrast': '#ffffff',
        'app-border': '#334155',
        'app-border-light': '#1e293b',
        'app-input-bg': '#1e293b',
        'app-panel-rgb': '#1e293b',
        'app-panel-border-rgb': '#ffffff'
    };
    var DEFAULT_CUSTOM_META = { id: 'my_custom_theme', label: '내 커스텀 테마' };

    var customState = {
        colors: null,
        meta: null,
        viewIndex: 0
    };

    var state = {
        savedTheme: null,
        selectedTheme: null,
        viewIndex: 0
    };

    function readSavedTheme() {
        try { return localStorage.getItem(STORAGE_KEY) || 'purple'; } catch (e) { return 'purple'; }
    }

    function writeSavedTheme(themeName) {
        try { localStorage.setItem(STORAGE_KEY, themeName); return true; } catch (e) { return false; }
    }

    function findTheme(value) {
        for (var i = 0; i < THEMES.length; i++) { if (THEMES[i].value === value) return THEMES[i]; }
        return THEMES[0];
    }

    function coverStyle(index) {
        // 테마의 accent 색 하나로도 색조를 돌려 여러 권의 표지처럼 보이게 함
        var hue = (index * 47) % 360;
        return 'background:var(--app-accent,#a855f7); filter:hue-rotate(' + hue + 'deg) saturate(0.85);';
    }

    // ---- 공통 스타일 (vw 기반이라 iframe 실제 크기에 비례해서 자동으로 세밀하게 표시됨) ----
    var BASE_CSS =
        'html,body{margin:0;padding:0;height:100%;width:100%;overflow:hidden;background:var(--app-bg-main,#0f172a);}' +
        '*{box-sizing:border-box;font-family:-apple-system,BlinkMacSystemFont,"Pretendard","Malgun Gothic",sans-serif;}' +
        '.mk-shell{display:flex;height:100%;width:100%;}' +
        '.mk-sidebar{width:15vw;flex-shrink:0;background:var(--app-bg-sidebar,#111827);padding:1.1vw 0.8vw;display:flex;flex-direction:column;gap:0.35vw;}' +
        '.mk-logo{color:var(--app-text-primary,#f1f5f9);font-weight:800;font-size:1.05vw;padding:0 0.3vw 0.7vw 0.3vw;white-space:nowrap;overflow:hidden;}' +
        '.mk-menu{display:flex;align-items:center;gap:0.5vw;height:1.9vw;border-radius:0.4vw;padding:0 0.55vw;color:var(--app-text-muted,#94a3b8);font-size:0.68vw;white-space:nowrap;overflow:hidden;}' +
        '.mk-menu .dot{width:0.45vw;height:0.45vw;border-radius:50%;background:currentColor;opacity:0.6;flex-shrink:0;}' +
        '.mk-menu.active{background:color-mix(in srgb, var(--app-accent,#a855f7) 22%, transparent);color:var(--app-text-primary,#f1f5f9);font-weight:700;}' +
        '.mk-menu.active .dot{background:var(--app-accent,#a855f7);opacity:1;}' +
        '.mk-main{flex:1;padding:1vw 1.2vw;display:flex;flex-direction:column;gap:0.9vw;min-width:0;overflow:hidden;}' +
        '.mk-topbar{display:flex;align-items:center;gap:0.7vw;}' +
        '.mk-search{flex:1;height:1.8vw;border-radius:0.5vw;background:var(--app-input-bg,#1e293b);border:1px solid var(--app-border,#334155);display:flex;align-items:center;padding:0 0.6vw;color:var(--app-text-muted,#94a3b8);font-size:0.62vw;}' +
        '.mk-toggle{height:1.8vw;border-radius:0.5vw;background:var(--app-bg-card,#1e293b);border:1px solid var(--app-border,#334155);padding:0 0.7vw;display:flex;align-items:center;font-size:0.6vw;color:var(--app-text-muted,#94a3b8);white-space:nowrap;}' +
        '.mk-toggle.active{background:var(--app-accent,#a855f7);color:#fff;border-color:transparent;font-weight:700;}' +
        '.mk-insights{display:flex;gap:0.7vw;}' +
        '.mk-insight-card{flex:1;background:var(--app-bg-card,#1e293b);border:1px solid var(--app-border,#334155);border-radius:0.6vw;padding:0.55vw 0.65vw;display:flex;flex-direction:column;gap:0.3vw;}' +
        '.mk-insight-title{font-size:0.56vw;color:var(--app-text-muted,#94a3b8);font-weight:700;}' +
        '.mk-insight-value{font-size:1vw;font-weight:800;color:var(--app-text-primary,#f1f5f9);}' +
        '.mk-section-header{display:flex;align-items:center;justify-content:space-between;}' +
        '.mk-section-title{font-size:0.72vw;font-weight:800;color:var(--app-text-primary,#f1f5f9);display:flex;align-items:center;gap:0.35vw;}' +
        '.mk-section-title .bar{width:0.28vw;height:0.72vw;border-radius:2px;background:var(--app-accent,#a855f7);}' +
        '.mk-nav-dot{width:1.1vw;height:1.1vw;border-radius:50%;background:var(--app-bg-card,#1e293b);border:1px solid var(--app-border,#334155);}' +
        '.mk-book-row{display:flex;gap:0.6vw;}' +
        '.mk-book{width:5.4vw;display:flex;flex-direction:column;gap:0.3vw;}' +
        '.mk-cover{width:5.4vw;height:7.6vw;border-radius:0.35vw;}' +
        '.mk-book-title{font-size:0.52vw;color:var(--app-text-primary,#f1f5f9);opacity:0.85;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}' +
        '.mk-book-sub{font-size:0.46vw;color:var(--app-text-muted,#94a3b8);}' +
        '.mk-detail-top{display:flex;align-items:center;gap:0.4vw;color:var(--app-text-muted,#94a3b8);font-size:0.6vw;}' +
        '.mk-detail-layout{display:flex;gap:1.2vw;flex:1;min-height:0;}' +
        '.mk-detail-cover{width:9vw;height:13vw;border-radius:0.5vw;flex-shrink:0;}' +
        '.mk-detail-info{flex:1;display:flex;flex-direction:column;gap:0.5vw;min-width:0;}' +
        '.mk-detail-title{font-size:1vw;font-weight:800;color:var(--app-text-primary,#f1f5f9);}' +
        '.mk-detail-badges{display:flex;gap:0.4vw;}' +
        '.mk-chip{font-size:0.55vw;padding:0.15vw 0.55vw;border-radius:999px;background:var(--app-bg-card,#1e293b);border:1px solid var(--app-border,#334155);color:var(--app-text-muted,#94a3b8);}' +
        '.mk-stars{color:var(--app-accent,#a855f7);font-size:0.75vw;letter-spacing:0.1vw;}' +
        '.mk-line{height:0.5vw;border-radius:0.2vw;background:var(--app-text-muted,#94a3b8);opacity:0.28;}' +
        '.mk-volume-row{display:flex;align-items:center;gap:0.5vw;background:var(--app-bg-card,#1e293b);border:1px solid var(--app-border,#334155);border-radius:0.4vw;padding:0.35vw 0.55vw;}' +
        '.mk-volume-thumb{width:1.6vw;height:2.2vw;border-radius:0.25vw;flex-shrink:0;}' +
        '.mk-volume-title{flex:1;font-size:0.58vw;color:var(--app-text-primary,#f1f5f9);opacity:0.9;}' +
        '.mk-progress-track{width:3.2vw;height:0.4vw;border-radius:999px;background:var(--app-border-light,#334155);overflow:hidden;flex-shrink:0;}' +
        '.mk-progress-fill{height:100%;background:var(--app-accent,#a855f7);}' +
        '.mk-glass-panel{position:absolute;top:0.8vw;right:0.8vw;padding:0.3vw 0.6vw;border-radius:0.5vw;font-size:0.5vw;color:var(--app-text-primary,#f1f5f9);background:rgba(var(--app-panel-rgb,30,41,59),0.6);border:1px solid rgba(var(--app-panel-border-rgb,255,255,255),0.18);backdrop-filter:blur(4px);}' +
        '.mk-main{position:relative;}';

    function hexToRgbTriplet(hex) {
        var m = /^#?([0-9a-fA-F]{2})([0-9a-fA-F]{2})([0-9a-fA-F]{2})$/.exec(hex || '');
        if (!m) return '0, 0, 0';
        return parseInt(m[1], 16) + ', ' + parseInt(m[2], 16) + ', ' + parseInt(m[3], 16);
    }

    function rgbTripletToHex(triplet) {
        var parts = String(triplet || '').split(',').map(function (s) { return parseInt(s.trim(), 10) || 0; });
        function toHex(n) { n = Math.max(0, Math.min(255, n)); var h = n.toString(16); return h.length === 1 ? '0' + h : h; }
        if (parts.length < 3) return '#ffffff';
        return '#' + toHex(parts[0]) + toHex(parts[1]) + toHex(parts[2]);
    }

    // colors 오브젝트는 UI 편의상 전부 hex로 저장하고, kind:'rgb' 토큰만 실제 CSS
    // 변수로 내보낼 때 "R, G, B" 형식으로 변환한다 (README.md 실제 규격).
    function buildVarsCssText(colors) {
        return CUSTOM_TOKENS.map(function (t) {
            var raw = colors[t.key] || DEFAULT_CUSTOM_COLORS[t.key];
            var value = t.kind === 'rgb' ? hexToRgbTriplet(raw) : raw;
            return '--' + t.key + ':' + value + ';';
        }).join('');
    }

    function buildMockupHtml(themeValue, view) {
        var cssLinks = CSS_HREFS.map(function (href) {
            return '<link rel="stylesheet" href="' + href + '">';
        }).join('');
        var body = view === 'detail' ? buildDetailMockupBody() : buildDashboardMockupBody();
        return (
            '<!DOCTYPE html><html data-app-theme="' + themeValue + '">' +
            '<head><meta charset="UTF-8">' + cssLinks + '<style>' + BASE_CSS + '</style></head>' +
            '<body>' + body + '</body></html>'
        );
    }

    function buildCustomMockupHtml(colors, view) {
        var varsCss = ':root{' + buildVarsCssText(colors) + '}';
        var body = view === 'detail' ? buildDetailMockupBody() : buildDashboardMockupBody();
        return (
            '<!DOCTYPE html><html>' +
            '<head><meta charset="UTF-8"><style>' + varsCss + BASE_CSS + '</style></head>' +
            '<body>' + body + '</body></html>'
        );
    }

    function buildSidebar(activeIndex) {
        var items = SIDEBAR_MENU.map(function (label, i) {
            return '<div class="mk-menu' + (i === activeIndex ? ' active' : '') + '"><span class="dot"></span>' + label + '</div>';
        }).join('');
        return '<div class="mk-sidebar"><div class="mk-logo">📚 BookOasis</div>' + items + '</div>';
    }

    function buildCovers(count, startIndex) {
        var out = '';
        for (var i = 0; i < count; i++) {
            var idx = startIndex + i;
            out +=
                '<div class="mk-book">' +
                '<div class="mk-cover" style="' + coverStyle(idx) + '"></div>' +
                '<div class="mk-book-title">' + (BOOK_TITLES[idx % BOOK_TITLES.length]) + '</div>' +
                '<div class="mk-book-sub">이어읽기 ' + ((idx * 13) % 90 + 1) + 'p</div>' +
                '</div>';
        }
        return out;
    }

    function buildDashboardMockupBody() {
        return (
            '<div class="mk-shell">' +
            buildSidebar(0) +
            '<div class="mk-main">' +
            '<div class="mk-glass-panel">패널 (panel-rgb)</div>' +
            '<div class="mk-topbar">' +
            '<div class="mk-search">🔍 제목 · 시리즈 · 작가 검색...</div>' +
            '<div class="mk-toggle active">일반 도서</div>' +
            '<div class="mk-toggle">성인 도서</div>' +
            '<div class="mk-toggle">오디오북</div>' +
            '</div>' +
            '<div class="mk-insights">' +
            '<div class="mk-insight-card"><div class="mk-insight-title">🔥 연속 독서 일수</div><div class="mk-insight-value">5일</div></div>' +
            '<div class="mk-insight-card"><div class="mk-insight-title">📖 현재 읽는 중</div><div class="mk-insight-value">60%</div></div>' +
            '<div class="mk-insight-card"><div class="mk-insight-title">🎯 연간 목표</div><div class="mk-insight-value">15/30권</div></div>' +
            '<div class="mk-insight-card"><div class="mk-insight-title">📊 선호 장르</div><div class="mk-insight-value">만화 40%</div></div>' +
            '</div>' +
            '<div class="mk-section-header"><div class="mk-section-title"><span class="bar"></span>최근 읽은 도서</div><div style="display:flex;gap:0.35vw;"><div class="mk-nav-dot"></div><div class="mk-nav-dot"></div></div></div>' +
            '<div class="mk-book-row">' + buildCovers(6, 0) + '</div>' +
            '<div class="mk-section-header"><div class="mk-section-title"><span class="bar"></span>신규 추가 도서</div><div style="display:flex;gap:0.35vw;"><div class="mk-nav-dot"></div><div class="mk-nav-dot"></div></div></div>' +
            '<div class="mk-book-row">' + buildCovers(6, 6) + '</div>' +
            '</div>' +
            '</div>'
        );
    }

    function buildDetailMockupBody() {
        var volumeRows = '';
        for (var i = 0; i < 4; i++) {
            volumeRows +=
                '<div class="mk-volume-row">' +
                '<div class="mk-volume-thumb" style="' + coverStyle(i) + '"></div>' +
                '<div class="mk-volume-title">' + (i + 1) + '권</div>' +
                '<div class="mk-progress-track"><div class="mk-progress-fill" style="width:' + (30 + i * 20) + '%;"></div></div>' +
                '</div>';
        }
        return (
            '<div class="mk-shell">' +
            buildSidebar(-1) +
            '<div class="mk-main">' +
            '<div class="mk-detail-top">← 목록으로 돌아가기</div>' +
            '<div class="mk-detail-layout">' +
            '<div class="mk-detail-cover" style="' + coverStyle(2) + '"></div>' +
            '<div class="mk-detail-info">' +
            '<div class="mk-detail-title">나 혼자만 레벨업</div>' +
            '<div class="mk-detail-badges"><span class="mk-chip">추공</span><span class="mk-chip">디앤씨미디어</span></div>' +
            '<div class="mk-stars">★★★★★</div>' +
            '<div class="mk-line" style="width:92%;"></div>' +
            '<div class="mk-line" style="width:85%;"></div>' +
            '<div class="mk-line" style="width:60%;"></div>' +
            '<div class="mk-section-title" style="margin-top:0.4vw;"><span class="bar"></span>단행본 목록</div>' +
            volumeRows +
            '</div>' +
            '</div>' +
            '</div>' +
            '</div>'
        );
    }

    // ---- 렌더링 ----
    function renderList() {
        var listEl = document.getElementById('tp-list');
        if (!listEl) return;
        listEl.innerHTML = '';

        var banner = document.getElementById('tp-custom-active-banner');
        if (banner) banner.style.display = state.savedTheme === 'custom' ? 'flex' : 'none';

        THEMES.forEach(function (theme) {
            var item = document.createElement('div');
            item.className = 'tp-list-item';
            item.setAttribute('data-theme', theme.value);
            if (theme.value === state.selectedTheme) item.classList.add('is-selected');

            var badges = '';
            if (theme.value === state.savedTheme) badges += '<span class="tp-badge tp-badge-active">적용됨</span>';
            if (theme.value === 'purple') badges += '<span class="tp-badge tp-badge-default">기본값</span>';

            item.innerHTML =
                '<div class="tp-list-item-name">' + theme.label + '</div>' +
                '<div class="tp-list-item-badges">' + badges + '</div>';

            item.addEventListener('click', function () {
                state.selectedTheme = theme.value;
                state.viewIndex = 0;
                renderList();
                renderDetail();
            });

            listEl.appendChild(item);
        });
    }

    function renderDetail() {
        var theme = findTheme(state.selectedTheme);
        var nameEl = document.getElementById('td-name');
        var descEl = document.getElementById('td-desc');
        var applyBtn = document.getElementById('td-apply-btn');

        if (nameEl) nameEl.textContent = theme.label;
        if (descEl) descEl.textContent = theme.desc;
        if (applyBtn) {
            var isAlreadyApplied = theme.value === state.savedTheme;
            applyBtn.disabled = isAlreadyApplied;
            applyBtn.innerHTML = isAlreadyApplied
                ? '<i class="fa-solid fa-check"></i> 현재 적용된 테마'
                : '<i class="fa-solid fa-check"></i> 이 테마 적용';
        }
        renderPreviewFrame();
    }

    function renderPreviewFrame() {
        var iframe = document.getElementById('td-preview-iframe');
        var label = document.getElementById('td-preview-label');
        var view = VIEWS[state.viewIndex];
        if (iframe) iframe.srcdoc = buildMockupHtml(state.selectedTheme, view);
        if (label) label.textContent = VIEW_LABELS[view];
    }

    function setStatus(message, type) {
        var el = document.getElementById('tp-apply-status');
        if (!el) return;
        el.textContent = message || '';
        el.classList.remove('is-success', 'is-error');
        if (type) el.classList.add(type);
    }

    function applySelectedTheme() {
        var theme = state.selectedTheme;
        if (!theme || theme === state.savedTheme) return;

        var ok = writeSavedTheme(theme);
        if (!ok) {
            setStatus('저장 실패: 이 브라우저에서 로컬 저장소를 사용할 수 없습니다.', 'is-error');
            return;
        }

        // 이전에 커스텀 테마 오버라이드가 씌워져 있었다면 제거
        var customStyleEl = document.getElementById('tp-custom-theme-style');
        if (customStyleEl) customStyleEl.remove();

        document.documentElement.setAttribute('data-app-theme', theme);
        state.savedTheme = theme;
        renderList();
        renderDetail();
        setStatus('"' + findTheme(theme).label + '" 테마가 적용되었습니다.', 'is-success');
    }

    function navigatePreview(delta) {
        state.viewIndex = (state.viewIndex + delta + VIEWS.length) % VIEWS.length;
        renderPreviewFrame();
    }

    // ================= 커스텀 테마 만들기 탭 =================
    function readCustomColors() {
        try {
            var raw = localStorage.getItem(CUSTOM_STORAGE_KEY);
            if (!raw) return null;
            var parsed = JSON.parse(raw);
            var merged = {};
            CUSTOM_TOKENS.forEach(function (t) { merged[t.key] = parsed[t.key] || DEFAULT_CUSTOM_COLORS[t.key]; });
            return merged;
        } catch (e) {
            return null;
        }
    }

    function writeCustomColors(colors) {
        try { localStorage.setItem(CUSTOM_STORAGE_KEY, JSON.stringify(colors)); return true; } catch (e) { return false; }
    }

    function renderColorFields() {
        var wrap = document.getElementById('tp-color-fields');
        if (!wrap) return;
        wrap.innerHTML = '';

        CUSTOM_TOKENS.forEach(function (token) {
            var row = document.createElement('div');
            row.className = 'tp-color-field';
            row.innerHTML =
                '<div><span class="tp-color-field-label">' + token.label + '</span>' +
                '<span class="tp-color-field-sub">' + token.sub + '</span></div>';

            var input = document.createElement('input');
            input.type = 'color';
            input.value = customState.colors[token.key];
            input.setAttribute('data-token', token.key);
            input.addEventListener('input', function () {
                customState.colors[token.key] = input.value;
                renderCustomPreviewFrame();
            });

            row.appendChild(input);
            wrap.appendChild(row);
        });
    }

    function renderCustomPreviewFrame() {
        var iframe = document.getElementById('tc-preview-iframe');
        var label = document.getElementById('tc-preview-label');
        var view = VIEWS[customState.viewIndex];
        if (iframe) iframe.srcdoc = buildCustomMockupHtml(customState.colors, view);
        if (label) label.textContent = VIEW_LABELS[view];
    }

    function setCustomStatus(message, type) {
        var el = document.getElementById('tc-apply-status');
        if (!el) return;
        el.textContent = message || '';
        el.classList.remove('is-success', 'is-error');
        if (type) el.classList.add(type);
    }

    function navigateCustomPreview(delta) {
        customState.viewIndex = (customState.viewIndex + delta + VIEWS.length) % VIEWS.length;
        renderCustomPreviewFrame();
    }

    // 임의의 CSS 색상값(hex/rgb/hsl/색이름 등)을 <input type="color">가 요구하는 #rrggbb로 정규화
    function normalizeToHex(doc, win, rawValue) {
        if (!rawValue) return null;
        var trimmed = rawValue.trim();
        if (/^#[0-9a-fA-F]{6}$/.test(trimmed)) return trimmed;
        try {
            var probe = doc.createElement('span');
            probe.style.color = trimmed;
            doc.body.appendChild(probe);
            var rgb = win.getComputedStyle(probe).color;
            doc.body.removeChild(probe);
            var m = rgb.match(/rgba?\(([^)]+)\)/);
            if (!m) return null;
            var parts = m[1].split(',').map(function (s) { return parseInt(s.trim(), 10); });
            function toHex(n) { var h = (n || 0).toString(16); return h.length === 1 ? '0' + h : h; }
            return '#' + toHex(parts[0]) + toHex(parts[1]) + toHex(parts[2]);
        } catch (e) {
            return null;
        }
    }

    // 빌트인 테마(purple/dark/... )가 실제로 사용하는 CSS 변수값을, 숨겨진 iframe에
    // 실제 사이트 스타일시트를 로드해서 그대로 읽어온다(추정치가 아니라 진짜 값).
    function importFromBuiltinTheme(themeValue, onDone) {
        var cssLinks = CSS_HREFS.map(function (href) {
            return '<link rel="stylesheet" href="' + href + '">';
        }).join('');

        var frame = document.createElement('iframe');
        frame.style.cssText = 'position:fixed;left:-9999px;top:-9999px;width:10px;height:10px;visibility:hidden;';
        frame.setAttribute('sandbox', 'allow-same-origin');
        document.body.appendChild(frame);

        frame.addEventListener('load', function () {
            try {
                var doc = frame.contentDocument;
                var win = frame.contentWindow;
                var computed = win.getComputedStyle(doc.documentElement);
                var colors = {};
                CUSTOM_TOKENS.forEach(function (t) {
                    var raw = computed.getPropertyValue('--' + t.key).trim();
                    var hex;
                    if (t.kind === 'rgb') {
                        hex = raw ? rgbTripletToHex(raw) : DEFAULT_CUSTOM_COLORS[t.key];
                    } else {
                        hex = normalizeToHex(doc, win, raw) || DEFAULT_CUSTOM_COLORS[t.key];
                    }
                    colors[t.key] = hex;
                });
                onDone(colors, null);
            } catch (e) {
                onDone(null, e);
            } finally {
                document.body.removeChild(frame);
            }
        });

        frame.srcdoc =
            '<!DOCTYPE html><html data-app-theme="' + themeValue + '">' +
            '<head><meta charset="UTF-8">' + cssLinks + '</head><body></body></html>';
    }

    // 단순 "key: value" 라인 파서 — README.md 실제 형식(id / label / vars 아래 키들)을 인식한다.
    // vars의 각 키는 hex(#rrggbb) 또는 "R, G, B" 형식 둘 다 허용해서 유연하게 읽는다.
    function parseThemeFileText(text) {
        var colors = {};
        var meta = {};
        var lines = text.split(/\r?\n/);
        var hexPattern = /^\s*"?([a-zA-Z0-9_-]+)"?\s*:\s*"?(#[0-9a-fA-F]{3,8})"?\s*,?\s*$/;
        var rgbPattern = /^\s*"?([a-zA-Z0-9_-]+)"?\s*:\s*"?(\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3})"?\s*,?\s*$/;
        var metaPattern = /^\s*(id|label)\s*:\s*"?([^"#]+?)"?\s*$/;

        lines.forEach(function (line) {
            if (/^\s*#/.test(line)) return; // 주석 줄은 건너뜀

            var hm = line.match(hexPattern);
            if (hm) {
                var hKey = hm[1];
                var isKnownHex = CUSTOM_TOKENS.some(function (t) { return t.key === hKey; });
                if (isKnownHex) {
                    var hv = hm[2];
                    colors[hKey] = hv.length === 4 ? expandShortHex(hv) : hv;
                    return;
                }
            }

            var rm = line.match(rgbPattern);
            if (rm) {
                var rKey = rm[1];
                var isKnownRgb = CUSTOM_TOKENS.some(function (t) { return t.key === rKey; });
                if (isKnownRgb) {
                    colors[rKey] = rgbTripletToHex(rm[2]);
                    return;
                }
            }

            var mm = line.match(metaPattern);
            if (mm && (mm[1] === 'id' || mm[1] === 'label')) {
                meta[mm[1]] = mm[2].trim();
            }
        });

        return { colors: colors, meta: meta };
    }

    function expandShortHex(hex) {
        // #abc -> #aabbcc
        var m = hex.match(/^#([0-9a-fA-F])([0-9a-fA-F])([0-9a-fA-F])$/);
        if (!m) return hex;
        return '#' + m[1] + m[1] + m[2] + m[2] + m[3] + m[3];
    }

    function importFromFile(file, onDone) {
        var reader = new FileReader();
        reader.onload = function () {
            try {
                var text = String(reader.result || '');
                onDone(parseThemeFileText(text), null);
            } catch (e) {
                onDone(null, e);
            }
        };
        reader.onerror = function () { onDone(null, reader.error); };
        reader.readAsText(file);
    }

    function setImportStatus(message, type) {
        var el = document.getElementById('tc-import-status');
        if (!el) return;
        el.textContent = message || '';
        el.classList.remove('is-success', 'is-error');
        if (type) el.classList.add(type);
    }

    function sanitizeThemeId(raw) {
        var lowered = String(raw || '').toLowerCase().replace(/[^a-z0-9_-]/g, '_');
        return lowered.slice(0, 32) || 'my_custom_theme';
    }

    function readCustomMeta() {
        try {
            var raw = localStorage.getItem(CUSTOM_META_STORAGE_KEY);
            if (!raw) return null;
            var parsed = JSON.parse(raw);
            return {
                id: sanitizeThemeId(parsed.id || DEFAULT_CUSTOM_META.id),
                label: (parsed.label || DEFAULT_CUSTOM_META.label).slice(0, 60)
            };
        } catch (e) {
            return null;
        }
    }

    function writeCustomMeta(meta) {
        try { localStorage.setItem(CUSTOM_META_STORAGE_KEY, JSON.stringify(meta)); return true; } catch (e) { return false; }
    }

    function renderMetaFields() {
        var idInput = document.getElementById('tc-meta-id');
        var labelInput = document.getElementById('tc-meta-label');
        if (idInput) idInput.value = customState.meta.id;
        if (labelInput) labelInput.value = customState.meta.label;
    }

    function mergeIntoCustomColors(partialColors) {
        var count = 0;
        Object.keys(partialColors || {}).forEach(function (key) {
            var isKnown = CUSTOM_TOKENS.some(function (t) { return t.key === key; });
            if (isKnown && partialColors[key]) {
                customState.colors[key] = partialColors[key];
                count++;
            }
        });
        renderColorFields();
        renderCustomPreviewFrame();
        return count;
    }

    function mergeIntoCustomMeta(partialMeta) {
        if (!partialMeta) return;
        if (partialMeta.id) customState.meta.id = sanitizeThemeId(partialMeta.id);
        if (partialMeta.label) customState.meta.label = partialMeta.label;
        renderMetaFields();
    }

    // 실제 페이지(:root)에 커스텀 색을 주입 — 코어가 'custom' 값을 인식하지 못하므로
    // data-app-theme 속성이 아니라 인라인 <style>로 변수를 직접 덮어써서 적용한다.
    function applyCustomOverrideToPage(colors) {
        var styleEl = document.getElementById('tp-custom-theme-style');
        if (!styleEl) {
            styleEl = document.createElement('style');
            styleEl.id = 'tp-custom-theme-style';
            document.head.appendChild(styleEl);
        }
        styleEl.textContent = ':root{' + buildVarsCssText(colors) + '}';
    }

    function applyCustomTheme() {
        var ok1 = writeCustomColors(customState.colors);
        var ok2 = writeSavedTheme('custom');
        writeCustomMeta(customState.meta);
        if (!ok1 || !ok2) {
            setCustomStatus('저장 실패: 이 브라우저에서 로컬 저장소를 사용할 수 없습니다.', 'is-error');
            return;
        }
        applyCustomOverrideToPage(customState.colors);
        state.savedTheme = 'custom';
        renderList();
        setCustomStatus('이 브라우저 화면에 임시로 적용했습니다. (서버에 등록된 게 아니라 미리보기 성격이며, 새로고침하면 풀립니다. 이 플러그인 탭을 다시 열면 자동으로 재적용을 시도합니다.)', 'is-success');
    }

    function resetCustomColors() {
        customState.colors = Object.assign({}, DEFAULT_CUSTOM_COLORS);
        renderColorFields();
        renderCustomPreviewFrame();
        setCustomStatus('기본 색상으로 초기화했습니다.', null);
    }

    function exportCustomThemeYaml() {
        var id = sanitizeThemeId(customState.meta.id);
        var label = customState.meta.label || DEFAULT_CUSTOM_META.label;
        var idCollides = BUILTIN_IDS.indexOf(id) !== -1;

        var lines = [
            '# BookOasis 커스텀 테마 — theme_previewer 플러그인에서 생성',
            '# themes/README.md 실제 규격(id / label / vars, vars 15개 키 고정)에 맞춰 작성됨.',
            'id: ' + id,
            'label: "' + label.replace(/"/g, '\\"') + '"',
            'vars:'
        ];
        CUSTOM_TOKENS.forEach(function (t) {
            var raw = customState.colors[t.key] || DEFAULT_CUSTOM_COLORS[t.key];
            var value = t.kind === 'rgb' ? hexToRgbTriplet(raw) : raw;
            lines.push('  ' + t.key + ': "' + value + '"');
        });
        var text = lines.join('\n') + '\n';

        var blob = new Blob([text], { type: 'text/yaml' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = id + '.yaml';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        if (idCollides) {
            setCustomStatus(id + '.yaml 파일을 다운로드했습니다. 단, id "' + id + '"는 내장 테마와 겹쳐 서버가 거부하니 id를 바꿔서 다시 저장해주세요. (다운로드만 된 상태이며 서버에는 아직 아무 변화가 없습니다.)', 'is-error');
        } else {
            setCustomStatus(id + '.yaml 파일을 다운로드했습니다. 서버에 정식 등록하려면, 이 파일을 서버의 themes/ 폴더에 직접 넣고 설정 > 일반 탭의 "커스텀 테마 다시 스캔"을 눌러주세요 (지금은 다운로드만 된 상태입니다).', 'is-success');
        }
    }

    // ================= 탭 전환 =================
    function switchTab(tabName) {
        var selectPanel = document.getElementById('tp-panel-select');
        var createPanel = document.getElementById('tp-panel-create');
        var selectTabBtn = document.getElementById('tp-tab-select');
        var createTabBtn = document.getElementById('tp-tab-create');

        var isCreate = tabName === 'create';
        if (selectPanel) selectPanel.style.display = isCreate ? 'none' : 'block';
        if (createPanel) createPanel.style.display = isCreate ? 'block' : 'none';
        if (selectTabBtn) selectTabBtn.classList.toggle('active', !isCreate);
        if (createTabBtn) createTabBtn.classList.toggle('active', isCreate);
    }

    function init() {
        var listEl = document.getElementById('tp-list');
        if (!listEl || listEl.dataset.tpInit === '1') return;
        listEl.dataset.tpInit = '1';

        state.savedTheme = readSavedTheme();
        state.selectedTheme = state.savedTheme === 'custom' ? 'purple' : state.savedTheme;

        renderList();
        renderDetail();

        var prevBtn = document.getElementById('td-prev');
        var nextBtn = document.getElementById('td-next');
        var applyBtn = document.getElementById('td-apply-btn');
        if (prevBtn) prevBtn.addEventListener('click', function () { navigatePreview(-1); });
        if (nextBtn) nextBtn.addEventListener('click', function () { navigatePreview(1); });
        if (applyBtn) applyBtn.addEventListener('click', applySelectedTheme);

        // 커스텀 테마 탭 초기화
        customState.colors = readCustomColors() || Object.assign({}, DEFAULT_CUSTOM_COLORS);
        customState.meta = readCustomMeta() || Object.assign({}, DEFAULT_CUSTOM_META);
        renderColorFields();
        renderMetaFields();
        renderCustomPreviewFrame();

        var metaIdInput = document.getElementById('tc-meta-id');
        var metaLabelInput = document.getElementById('tc-meta-label');
        if (metaIdInput) {
            metaIdInput.addEventListener('input', function () { customState.meta.id = metaIdInput.value; });
            metaIdInput.addEventListener('blur', function () {
                customState.meta.id = sanitizeThemeId(metaIdInput.value);
                metaIdInput.value = customState.meta.id;
            });
        }
        if (metaLabelInput) {
            metaLabelInput.addEventListener('input', function () {
                customState.meta.label = metaLabelInput.value.slice(0, 60);
            });
        }

        // "기존 테마에서 색 불러오기" 드롭다운 채우기
        var importSelect = document.getElementById('tc-import-theme-select');
        if (importSelect) {
            importSelect.innerHTML = THEMES.map(function (t) {
                return '<option value="' + t.value + '">' + t.label + '</option>';
            }).join('');
        }

        var importThemeBtn = document.getElementById('tc-import-theme-btn');
        if (importThemeBtn) {
            importThemeBtn.addEventListener('click', function () {
                var value = importSelect ? importSelect.value : 'purple';
                setImportStatus('불러오는 중...', null);
                importFromBuiltinTheme(value, function (colors, err) {
                    if (err || !colors) {
                        setImportStatus('불러오기 실패: 실제 테마 CSS를 읽지 못했습니다.', 'is-error');
                        return;
                    }
                    var count = mergeIntoCustomColors(colors);
                    setImportStatus('"' + findTheme(value).label + '" 테마에서 색상 ' + count + '개를 불러왔습니다. 자유롭게 수정해 보세요.', 'is-success');
                });
            });
        }

        var importFileInput = document.getElementById('tc-import-file-input');
        if (importFileInput) {
            importFileInput.addEventListener('change', function () {
                var file = importFileInput.files && importFileInput.files[0];
                if (!file) return;
                setImportStatus('파일을 읽는 중...', null);
                importFromFile(file, function (result, err) {
                    if (err) {
                        setImportStatus('파일을 읽지 못했습니다: ' + err, 'is-error');
                        return;
                    }
                    var colors = (result && result.colors) || {};
                    var meta = (result && result.meta) || {};
                    var count = Object.keys(colors).length;
                    if (count === 0 && !meta.id && !meta.label) {
                        setImportStatus('이 파일에서 인식 가능한 값을 찾지 못했습니다. "app-accent: #rrggbb" 같은 줄이 있는지 확인해 주세요.', 'is-error');
                        return;
                    }
                    mergeIntoCustomColors(colors);
                    mergeIntoCustomMeta(meta);
                    setImportStatus('파일에서 색상 ' + count + '개를 불러왔습니다' + (meta.id ? ' (id: ' + meta.id + ')' : '') + '.', 'is-success');
                });
                importFileInput.value = '';
            });
        }

        var tcPrevBtn = document.getElementById('tc-prev');
        var tcNextBtn = document.getElementById('tc-next');
        var tcApplyBtn = document.getElementById('tc-apply-btn');
        var tcResetBtn = document.getElementById('tc-reset-btn');
        var tcExportBtn = document.getElementById('tc-export-btn');
        if (tcPrevBtn) tcPrevBtn.addEventListener('click', function () { navigateCustomPreview(-1); });
        if (tcNextBtn) tcNextBtn.addEventListener('click', function () { navigateCustomPreview(1); });
        if (tcApplyBtn) tcApplyBtn.addEventListener('click', applyCustomTheme);
        if (tcResetBtn) tcResetBtn.addEventListener('click', resetCustomColors);
        if (tcExportBtn) tcExportBtn.addEventListener('click', exportCustomThemeYaml);

        // 탭 전환 버튼
        var selectTabBtn = document.getElementById('tp-tab-select');
        var createTabBtn = document.getElementById('tp-tab-create');
        if (selectTabBtn) selectTabBtn.addEventListener('click', function () { switchTab('select'); });
        if (createTabBtn) createTabBtn.addEventListener('click', function () { switchTab('create'); });

        // 이전에 커스텀 테마를 적용해둔 상태였다면(같은 세션 내 재방문 등) 다시 씌워준다.
        // 단, 브라우저를 완전히 새로고침한 뒤에는 코어 부트 스크립트가 이 사실을 모르므로
        // 이 플러그인 탭을 다시 열기 전까지는 원래 저장된(purple 등) 테마로 보일 수 있다.
        if (state.savedTheme === 'custom' && customState.colors) {
            applyCustomOverrideToPage(customState.colors);
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
