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
        '.mk-progress-fill{height:100%;background:var(--app-accent,#a855f7);}';

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

    function init() {
        var listEl = document.getElementById('tp-list');
        if (!listEl || listEl.dataset.tpInit === '1') return;
        listEl.dataset.tpInit = '1';

        state.savedTheme = readSavedTheme();
        state.selectedTheme = state.savedTheme;

        renderList();
        renderDetail();

        var prevBtn = document.getElementById('td-prev');
        var nextBtn = document.getElementById('td-next');
        var applyBtn = document.getElementById('td-apply-btn');
        if (prevBtn) prevBtn.addEventListener('click', function () { navigatePreview(-1); });
        if (nextBtn) nextBtn.addEventListener('click', function () { navigatePreview(1); });
        if (applyBtn) applyBtn.addEventListener('click', applySelectedTheme);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
