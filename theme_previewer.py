# -*- coding: utf-8 -*-
"""
테마 미리보기 & 선택기 (theme_previewer)

BookOasis가 실제로 테마를 결정하는 방식은 <head>의 부트 스크립트가
localStorage['app_dashboard_theme']를 읽어 document.documentElement의
data-app-theme 속성에 반영하는 것입니다(서버/플러그인 설정이 아님).

그래서 이 플러그인은 서버 쪽 설정(config_schema/save-config)을 전혀 쓰지 않고,
카테고리 레벨 풀페이지 UI(index.html/script.js)에서 브라우저 localStorage를
직접 읽고 쓰는 순수 클라이언트 사이드 전환기로 동작합니다.
- 미리보기: data-app-theme 속성만 임시로 바꿈 (새로고침하면 원복)
- 저장: localStorage['app_dashboard_theme']에 기록 (다음 로드부터 그 값으로 부팅)

관리자 권한이 필요 없고, 사용자별이 아니라 "이 브라우저" 단위로 저장됩니다.
"""
from plugins.metadata.base import BaseMetadataProvider


class ThemePreviewerProvider(BaseMetadataProvider):
    id = "theme_previewer"
    name = "테마 미리보기 & 선택기"
    is_searchable = False
    config_schema = []

    # 좌측 사이드바 1등 시민 카테고리 메뉴 등록 (모든 세션에 노출)
    category_tab = {
        "title": "테마 미리보기",
        "icon": "fa-solid fa-palette",
        "order": 85,
        "sessions": "all",
    }

    # --- 필수 계약: 이 플러그인은 검색/메타데이터 적용 기능이 없음 ---
    def search(self, db_type, query):
        return {"success": True, "items": []}

    def apply(self, db_type, book_id, item_data):
        return False, "이 플러그인은 메타데이터 검색/적용 기능이 없습니다."
