(function () {
  'use strict';

  var fullData = null;
  var data = null;
  var state = {
    topTabId: null,
    midItemId: null,
    expandedMidId: null, // 아코디언: 펼쳐진 미들탭 ID (바텀탭 리스트 표시)
    bottomTabId: null, // 미들탭 하위 바텀탭 선택 (해당 미들탭에 bottomTabs가 있을 때만 사용)
    bodyId: null,
    bodyPageIndex: 0,
    currentImageIndex: 0 // 현재 표시된 이미지 인덱스 (슬라이드쇼에서)
  };

  var bodySlideshowInterval = null;
  var slideshowState = null; // { bodyId, imageList, body, index, startTime }
  var slideshowPaused = false; // 슬라이드쇼 일시정지 상태

  /** 본문 이미지를 찾을 수 없을 때 표시할 이미지 (에셋 > 헬프 > 이미지즈) */
  var BODY_NO_IMAGE_PATH = 'assets/help/images/No_Images.png';
  /** 슬라이드쇼 이미지 로드 실패 시 표시할 이미지 (에셋 > 헬프 > 이미지즈) */
  var BODY_ERROR_IMAGE_PATH = 'assets/help/images/Error.png';

  var els = {
    topTabsContainer: document.getElementById('topTabsContainer'),
    topTabLabel: document.getElementById('topTabLabel'),
    langSelect: document.getElementById('langSelect'),
    btnClose: document.getElementById('btnClose'),
    midSearch: document.getElementById('midSearch'),
    midSectionTitle: document.getElementById('midSectionTitle'),
    midList: document.getElementById('midList'),
    bottomTabsWrap: document.getElementById('bottomTabsWrap'),
    bottomTabsContainer: document.getElementById('bottomTabsContainer'),
    bodyPlaceholder: document.getElementById('bodyPlaceholder'),
    bodyInner: document.getElementById('bodyInner'),
    bodyImage: document.getElementById('bodyImage'),
    bodyImageNext: document.getElementById('bodyImageNext'),
    bodyTitle: document.getElementById('bodyTitle'),
    bodyDescription: document.getElementById('bodyDescription'),
    bodyPagination: document.getElementById('bodyPagination'),
    btnPrev: document.getElementById('btnPrev'),
    btnNext: document.getElementById('btnNext'),
    bodySlideshowIndicator: document.getElementById('bodySlideshowIndicator')
  };

  /** 이미지 경로를 현재 HTML 파일 기준으로 정규화 (에디터를 다른 경로로 옮겨도 올바르게 로드) */
  function resolveImagePath(path) {
    if (!path) path = BODY_NO_IMAGE_PATH;
    
    // 절대 URL (http://, https://, //)이면 그대로 반환
    if (/^(https?:|\/\/)/.test(path)) return path;
    
    // 절대 경로로 시작하면 그대로 반환 (Windows: C:\, D:\ 등, Unix: /)
    if (/^([a-zA-Z]:|\/)/.test(path) && !path.startsWith('//')) return path;
    
    // 상대 경로 정규화
    // 1. 백슬래시를 슬래시로 변환 (Windows 경로 지원)
    // 2. ./ 제거
    // 3. 중복 슬래시 제거
    var normalizedPath = path.replace(/\\/g, '/').replace(/^\.\//, '').replace(/\/+/g, '/');
    
    // 탭 아이콘만 .png를 .svg로 변환 (assets/icons/ 경로의 파일만)
    // 본문 이미지(assets/help/images/)는 .png 그대로 유지
    if (normalizedPath.endsWith('.png') && normalizedPath.startsWith('assets/icons/')) {
      normalizedPath = normalizedPath.replace(/\.png$/, '.svg');
    }
    
    // 상대 경로는 HTML 파일 위치를 기준으로 브라우저가 자동으로 해결
    // document.baseURI를 사용하여 base URL 얻기 (가장 안정적)
    var baseUrl = document.baseURI || window.location.href;
    
    // 마지막 슬래시 위치 찾기 (파일명 제거하여 디렉토리 경로 얻기)
    var lastSlash = baseUrl.lastIndexOf('/');
    if (lastSlash >= 0) {
      baseUrl = baseUrl.substring(0, lastSlash + 1);
    } else {
      baseUrl = baseUrl + '/';
    }
    
    try {
      // new URL()을 사용하여 상대 경로를 절대 경로로 변환
      var resolvedPath = new URL(normalizedPath, baseUrl).href;
      return resolvedPath;
    } catch (e) {
      // new URL()이 실패한 경우 상대 경로를 그대로 반환
      // 브라우저가 자동으로 HTML 파일 위치를 기준으로 해결합니다
      return normalizedPath;
    }
  }

  /** 본문 이미지 로드 경로: assets/help/images/{topTabId}/ 아래에서 로드 (No_Images/Error는 루트 유지) */
  function getBodyImagePath(rawPath, topTabId) {
    if (!rawPath) return resolveImagePath(BODY_NO_IMAGE_PATH);
    var base = 'assets/help/images/';
    var normalized = String(rawPath).replace(/\\/g, '/').trim();
    if (!normalized) return resolveImagePath(BODY_NO_IMAGE_PATH);
    if (normalized === base + 'No_Images.png' || normalized === BODY_NO_IMAGE_PATH || normalized === base + 'Error.png' || normalized === BODY_ERROR_IMAGE_PATH) {
      return resolveImagePath(normalized);
    }
    if (!topTabId) return resolveImagePath(normalized);
    if (normalized.startsWith(base)) {
      var rest = normalized.substring(base.length);
      if (rest.startsWith(topTabId + '/')) return resolveImagePath(normalized);
      return resolveImagePath(base + topTabId + '/' + rest);
    }
    return resolveImagePath(base + topTabId + '/' + normalized);
  }

  /** 본문 이미지를 크로스페이드(교차 페이드)로 변경 */
  function setBodyImageWithFade(imgEl, imagePath, onerrorHandler) {
    if (!imgEl) return;
    var nextEl = els.bodyImageNext;
    var currentEl = els.bodyImage;
    var hasCurrent = currentEl.src && currentEl.src.length > 0;
    if (!nextEl || !hasCurrent) {
      currentEl.style.opacity = '1';
      currentEl.onload = function () { currentEl.onload = null; };
      currentEl.onerror = onerrorHandler || null;
      currentEl.src = imagePath;
      if (nextEl) nextEl.style.opacity = '0';
      return;
    }
    nextEl.style.opacity = '0';
    nextEl.onload = function () {
      nextEl.onload = null;
      nextEl.style.opacity = '1';
      setTimeout(function () {
        currentEl.src = nextEl.src;
        currentEl.alt = nextEl.alt;
        nextEl.style.opacity = '0';
        nextEl.onerror = null;
        nextEl.onload = null;
        /* nextEl.src 비우지 않음: 비우면 재그리기로 인한 깜빡임 발생 */
      }, 350);
    };
    nextEl.onerror = onerrorHandler || null;
    nextEl.alt = currentEl.alt;
    nextEl.src = imagePath;
  }

  /** 본문 설명 HTML 허용: img(src, width, height, alt), font(size, color)만 허용, 나머지 태그 제거 */
  function sanitizeDescriptionHtml(html) {
    if (typeof html !== 'string' || !html.trim()) return '';
    var div = document.createElement('div');
    div.innerHTML = html;
    var imgAttrs = ['src', 'width', 'height', 'alt'];
    var fontAttrs = ['size', 'color'];
    function escapeAttr(s) {
      return String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }
    function collect(node) {
      var out = [];
      for (var i = 0; i < node.childNodes.length; i++) {
        var n = node.childNodes[i];
        if (n.nodeType === 3) {
          out.push(n.textContent.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'));
          continue;
        }
        if (n.nodeType !== 1) continue;
        var tag = n.tagName ? n.tagName.toLowerCase() : '';
        if (tag === 'img') {
          var a = [];
          imgAttrs.forEach(function (key) {
            var val = n.getAttribute(key);
            if (val != null && val !== '') a.push(key + '="' + escapeAttr(val) + '"');
          });
          out.push('<' + tag + (a.length ? ' ' + a.join(' ') : '') + '>');
        } else if (tag === 'font') {
          var sizeVal = n.getAttribute('size') || n.getAttribute('data-size');
          var colorVal = n.getAttribute('color') || n.getAttribute('data-color');
          var styleParts = [];
          if (sizeVal != null && String(sizeVal).trim() !== '') {
            var num = parseInt(String(sizeVal).trim(), 10);
            styleParts.push('font-size:' + (isNaN(num) ? sizeVal : num + 'px'));
          }
          if (colorVal != null && String(colorVal).trim() !== '') {
            styleParts.push('color:' + escapeAttr(String(colorVal).trim()));
          }
          var styleStr = styleParts.length ? ' style="' + styleParts.join(';') + '"' : '';
          out.push('<' + tag + styleStr + '>');
          out.push(collect(n).join(''));
          out.push('</' + tag + '>');
        } else {
          out.push(collect(n).join(''));
        }
      }
      return out;
    }
    return collect(div).join('');
  }

  function getBodyById(id) {
    if (!data || !data.bodyContent) return null;
    var found = data.bodyContent.find(function (b) { return b.id === id; }) || null;
    if (!found && id) {
      // 디버깅: 찾지 못한 경우 사용 가능한 ID 목록 출력
      // console.log('getBodyById - Not found:', id, 'Available IDs:', data.bodyContent.map(function(b) { return b.id; }).slice(0, 5));
    }
    return found;
  }

  function getTopTabById(id) {
    if (!data || !data.topTabs) return null;
    return data.topTabs.find(function (t) { return t.id === id; }) || null;
  }

  function getMidConfig(topTabId) {
    if (!data || !data.midTabs) return null;
    return data.midTabs[topTabId] || null;
  }

  /** 현재 최상단 탭의 미들탭 항목 하나 반환 (바텀탭 여부 판단용) */
  function getMidItem(midId) {
    var mid = getMidConfig(state.topTabId);
    if (!mid || !mid.items) return null;
    return mid.items.find(function (item) { return item.id === midId; }) || null;
  }

  /** 미들탭 항목의 바텀탭 목록. 없거나 빈 배열이면 바텀탭 미사용 */
  function getBottomTabsForMidItem(midItem) {
    if (!midItem || !Array.isArray(midItem.bottomTabs)) return [];
    return midItem.bottomTabs.slice().sort(function (a, b) { return (a.order != null ? a.order : 999) - (b.order != null ? b.order : 999); });
  }

  /** 바텀탭 영역 렌더. 비어 있으면 숨김 */
  function renderBottomTabs(bottomTabs) {
    if (!els.bottomTabsWrap || !els.bottomTabsContainer) return;
    els.bottomTabsContainer.textContent = '';
    if (!bottomTabs || bottomTabs.length === 0) {
      els.bottomTabsWrap.hidden = true;
      return;
    }
    els.bottomTabsWrap.hidden = false;
    bottomTabs.forEach(function (bt) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'bottom-tab' + (state.bottomTabId === bt.id ? ' active' : '');
      btn.role = 'tab';
      btn.setAttribute('aria-selected', state.bottomTabId === bt.id ? 'true' : 'false');
      btn.dataset.bottomTabId = bt.id;
      var firstBodyId = (bt.bodyIds && bt.bodyIds[0]) || bt.bodyId || '';
      btn.dataset.bodyId = firstBodyId;
      btn.textContent = bt.title || '';
      btn.addEventListener('click', function () {
        selectBottomTab(bt.id, firstBodyId);
      });
      els.bottomTabsContainer.appendChild(btn);
    });
  }

  /** 현재 바텀탭의 연결 본문 목록 (body 객체 배열) */
  function getBodiesForCurrentBottomTab() {
    if (!state.bottomTabId || !data || !data.bodyContent) return [];
    var midItem = getMidItem(state.midItemId);
    var bottomTabs = getBottomTabsForMidItem(midItem);
    var bt = bottomTabs.find(function (b) { return b.id === state.bottomTabId; });
    if (!bt) return [];
    var bodyIds = (bt.bodyIds && bt.bodyIds.length > 0) ? bt.bodyIds : (bt.bodyId ? [bt.bodyId] : []);
    return bodyIds.map(function (id) { return getBodyById(id); }).filter(Boolean);
  }

  /** 페이지네이션용 본문 목록: 바텀탭이면 해당 바텀탭의 bodyIds, 아니면 같은 중단탭 본문 */
  function getBodiesForPagination() {
    if (state.bottomTabId) return getBodiesForCurrentBottomTab();
    return getBodiesInSameMidTab(state.bodyId);
  }

  /** 바텀탭 선택 → 해당 본문(첫 번째) 표시 */
  function selectBottomTab(bottomTabId, firstBodyId) {
    state.bottomTabId = bottomTabId;
    var midItem = getMidItem(state.midItemId);
    var bottomTabs = getBottomTabsForMidItem(midItem);
    renderBottomTabs(bottomTabs);
    showBody(firstBodyId || '');
  }

  function renderTopTabs() {
    if (!data || !data.topTabs) return;
    var isEditor = !!document.getElementById('btnEditTabs');
    var sorted = data.topTabs.slice().sort(function (a, b) { return (a.order || 0) - (b.order || 0); });
    els.topTabsContainer.textContent = '';
    sorted.forEach(function (tab) {
      var item = document.createElement('div');
      item.className = 'top-tab-item' + (state.topTabId === tab.id ? ' active' : '');
      item.dataset.topTabId = tab.id;

      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'top-tab' + (state.topTabId === tab.id ? ' active' : '');
      btn.setAttribute('role', 'tab');
      btn.setAttribute('aria-selected', state.topTabId === tab.id);
      btn.dataset.topTabId = tab.id;

      var icon = tab.icon;
      if (icon && (icon.endsWith('.svg') || icon.endsWith('.png'))) {
        var img = document.createElement('img');
        img.src = resolveImagePath(icon);
        img.alt = tab.label || '';
        img.loading = 'lazy';
        img.onerror = function () { img.style.display = 'none'; };
        btn.appendChild(img);
      } else {
        var span = document.createElement('span');
        span.className = 'tab-icon-svg';
        span.textContent = tab.icon || '?';
        span.setAttribute('aria-hidden', 'true');
        btn.appendChild(span);
      }

      if (isEditor) {
        var wrap = document.createElement('div');
        wrap.className = 'top-tab-wrap';
        wrap.appendChild(btn);
        var btnEdit = document.createElement('button');
        btnEdit.type = 'button';
        btnEdit.className = 'top-tab-edit-btn';
        btnEdit.setAttribute('aria-label', '탭 수정');
        btnEdit.title = '탭 이름·섹션 설정 수정';
        btnEdit.textContent = '✎';
        btnEdit.addEventListener('click', function (e) {
          e.preventDefault();
          e.stopPropagation();
          if (typeof window.dispatchEvent === 'function') {
            window.dispatchEvent(new CustomEvent('editTopTab', { detail: { topTabId: tab.id } }));
          }
        });
        wrap.appendChild(btnEdit);
        item.appendChild(wrap);
      } else {
        item.appendChild(btn);
      }

      var cap = document.createElement('div');
      cap.className = 'top-tab-caption';
      cap.textContent = tab.label || '';
      if (isEditor) cap.classList.add('top-tab-caption-editable');
      item.appendChild(cap);
      if (isEditor) {
        cap.addEventListener('click', function (e) {
          e.preventDefault();
          e.stopPropagation();
          if (typeof window.dispatchEvent === 'function') {
            window.dispatchEvent(new CustomEvent('editTopTab', { detail: { topTabId: tab.id } }));
          }
        });
      }

      els.topTabsContainer.appendChild(item);
    });
    // 선택된 탭 이름을 라벨 영역에도 표시(접근성·이중 표시)
    var cur = state.topTabId ? getTopTabById(state.topTabId) : null;
    if (els.topTabLabel) els.topTabLabel.textContent = cur ? (cur.label || '') : '';
  }

  /** 본문 ID 규칙: 최상단탭ID-중단순서-본문순서 (예: tutorial-1-1, tutorial-1-2). 중단 선택 시 이 ID로 본문 조회 */
  function getBodyIdByRule(topTabId, midOrder, bodyOrder) {
    if (!topTabId || midOrder == null) return null;
    var order = (bodyOrder != null && bodyOrder >= 1) ? bodyOrder : 1;
    return topTabId + '-' + midOrder + '-' + order;
  }

  /** 같은 중단 탭(topTabId-midOrder) 내 본문을 페이지 순서(가장 낮은 것부터) 정렬해 반환. ID에 1번이 없어도 동작 */
  function getBodiesInMidTab(topTabId, midOrder) {
    if (!topTabId || midOrder == null || !data || !data.bodyContent) return [];
    // prefix startsWith 시 'defense-1-'이 'defense-10-1'까지 포함하므로, 파싱해서 topTabId·midOrder가 동일한 것만 포함
    return data.bodyContent
      .filter(function (b) {
        if (!b.id) return false;
        var p = parseBodyId(b.id);
        return p && p.topTabId === topTabId && p.midOrder === midOrder;
      })
      .map(function (b) {
        var p = parseBodyId(b.id);
        var bodyOrder = (p && !isNaN(p.bodyOrder)) ? p.bodyOrder : (b.order != null ? b.order : 999);
        return { body: b, order: bodyOrder };
      })
      .sort(function (a, b) { return a.order - b.order; })
      .map(function (item) { return item.body; });
  }

  function renderMidList(items, searchQuery) {
    els.midList.textContent = '';
    if (!items || !items.length) return;

    items = items.slice().sort(function (a, b) { return (a.order != null ? a.order : 999) - (b.order != null ? b.order : 999); });
    var isEditor = !!document.getElementById('btnEditMidTabs');
    var query = (searchQuery || '').trim().toLowerCase();
    var filtered = query
      ? items.filter(function (item) {
          if ((item.title || '').toLowerCase().indexOf(query) >= 0) return true;
          var bottomTabs = getBottomTabsForMidItem(item);
          return bottomTabs.some(function (bt) { return (bt.title || '').toLowerCase().indexOf(query) >= 0; });
        })
      : items;

    filtered.forEach(function (item) {
      var bodiesInMid = getBodiesInMidTab(state.topTabId, item.order);
      var firstBody = bodiesInMid.length ? bodiesInMid[0] : null;
      var bodyId = firstBody ? firstBody.id : (item.bodyId || '');
      var bottomTabs = getBottomTabsForMidItem(item);
      var hasSublist = bottomTabs.length > 0;

      if (hasSublist) {
        var wrap = document.createElement('li');
        wrap.className = 'mid-item-wrap';
        wrap.setAttribute('role', 'listitem');
        var expanded = state.expandedMidId === item.id || (!!query && hasSublist);

        var header = document.createElement('div');
        header.className = 'mid-item-header' + (expanded ? ' expanded' : '');
        header.dataset.midId = item.id;
        header.setAttribute('role', 'button');
        header.setAttribute('aria-expanded', expanded ? 'true' : 'false');
        var expandIcon = document.createElement('span');
        expandIcon.className = 'mid-item-expand';
        expandIcon.setAttribute('aria-hidden', 'true');
        expandIcon.textContent = expanded ? '▼' : '▶';
        header.appendChild(expandIcon);
        var titleSpan = document.createElement('span');
        titleSpan.className = 'mid-item-title';
        titleSpan.textContent = item.title || '';
        header.appendChild(titleSpan);
        if (isEditor) {
          var btnEdit = document.createElement('button');
          btnEdit.type = 'button';
          btnEdit.className = 'mid-item-edit-btn';
          btnEdit.setAttribute('aria-label', '항목 수정');
          btnEdit.title = '표시 이름·본문 연결 수정';
          btnEdit.dataset.midId = item.id;
          btnEdit.dataset.bodyId = bodyId;
          btnEdit.textContent = '✎';
          btnEdit.addEventListener('click', function (e) {
            e.preventDefault();
            e.stopPropagation();
            if (typeof window.dispatchEvent === 'function') {
              window.dispatchEvent(new CustomEvent('editMidItem', { detail: { midId: item.id, bodyId: item.bodyId || '' } }));
            }
          });
          header.appendChild(btnEdit);
        }
        header.addEventListener('click', function (e) {
          if (e.target.closest('.mid-item-edit-btn')) return;
          state.expandedMidId = expanded ? null : item.id;
          if (!expanded && state.midItemId !== item.id) {
            state.midItemId = item.id;
            state.bottomTabId = bottomTabs[0] ? bottomTabs[0].id : null;
            var firstBtBodyId = bottomTabs[0] ? ((bottomTabs[0].bodyIds && bottomTabs[0].bodyIds[0]) || bottomTabs[0].bodyId || '') : bodyId;
            showBody(firstBtBodyId);
          }
          renderMidList((getMidConfig(state.topTabId) || {}).items || [], els.midSearch ? els.midSearch.value : '');
        });
        wrap.appendChild(header);

        var sublist = document.createElement('ul');
        sublist.className = 'mid-sublist';
        sublist.hidden = !expanded;
        bottomTabs.forEach(function (bt) {
          var subLi = document.createElement('li');
          subLi.className = 'mid-subitem' + (state.midItemId === item.id && state.bottomTabId === bt.id ? ' active' : '');
          subLi.dataset.midId = item.id;
          subLi.dataset.bottomTabId = bt.id;
          subLi.dataset.bodyId = (bt.bodyIds && bt.bodyIds[0]) || bt.bodyId || '';
          var subTitle = document.createElement('span');
          subTitle.className = 'mid-subitem-title';
          subTitle.textContent = bt.title || '';
          subLi.appendChild(subTitle);
          if (isEditor) {
            var btnSubEdit = document.createElement('button');
            btnSubEdit.type = 'button';
            btnSubEdit.className = 'mid-item-edit-btn mid-subitem-edit-btn';
            btnSubEdit.setAttribute('aria-label', '바텀탭 수정');
            btnSubEdit.title = '바텀탭 수정 (해당 중단 항목 폼에서 편집)';
            btnSubEdit.textContent = '✎';
            btnSubEdit.addEventListener('click', function (e) {
              e.preventDefault();
              e.stopPropagation();
              if (typeof window.dispatchEvent === 'function') {
                window.dispatchEvent(new CustomEvent('editBottomTab', { detail: { midId: item.id, bottomTabId: bt.id } }));
              }
            });
            subLi.appendChild(btnSubEdit);
          }
          subLi.addEventListener('click', function (e) {
            if (e.target.closest('.mid-item-edit-btn')) return;
            e.stopPropagation();
            state.midItemId = item.id;
            state.bottomTabId = bt.id;
            renderMidList((getMidConfig(state.topTabId) || {}).items || [], els.midSearch ? els.midSearch.value : '');
            showBody((bt.bodyIds && bt.bodyIds[0]) || bt.bodyId || '');
          });
          sublist.appendChild(subLi);
        });
        wrap.appendChild(sublist);
        els.midList.appendChild(wrap);
      } else {
        var li = document.createElement('li');
        li.className = 'mid-item' + (state.midItemId === item.id ? ' active' : '');
        li.dataset.midId = item.id;
        li.dataset.bodyId = bodyId;
        li.setAttribute('role', 'listitem');

        var ind = document.createElement('span');
        ind.className = 'item-indicator';
        ind.setAttribute('aria-hidden', 'true');
        li.appendChild(ind);
        var title = document.createElement('span');
        title.className = 'mid-item-title';
        title.textContent = item.title || '';
        li.appendChild(title);
        if (isEditor) {
          var btnEdit = document.createElement('button');
          btnEdit.type = 'button';
          btnEdit.className = 'mid-item-edit-btn';
          btnEdit.setAttribute('aria-label', '항목 수정');
          btnEdit.title = '표시 이름·본문 연결 수정';
          btnEdit.dataset.midId = item.id;
          btnEdit.dataset.bodyId = bodyId;
          btnEdit.textContent = '✎';
          btnEdit.addEventListener('click', function (e) {
            e.preventDefault();
            e.stopPropagation();
            if (typeof window.dispatchEvent === 'function') {
              window.dispatchEvent(new CustomEvent('editMidItem', { detail: { midId: item.id, bodyId: item.bodyId || '' } }));
            }
          });
          li.appendChild(btnEdit);
        }
        li.addEventListener('click', function (e) {
          if (e.target.closest('.mid-item-edit-btn')) return;
          selectMidItem(item.id, bodyId);
        });
        els.midList.appendChild(li);
      }
    });
  }

  function showBody(bodyId) {
    if (bodySlideshowInterval) {
      clearInterval(bodySlideshowInterval);
      bodySlideshowInterval = null;
    }

    var body = getBodyById(bodyId);
    if (!body) {
      els.bodyPlaceholder.hidden = false;
      els.bodyInner.hidden = true;
      state.bodyId = null;
      return;
    }

    state.bodyId = body.id;
    state.bodyPageIndex = 0;

    var pages = body.pages && Array.isArray(body.pages) && body.pages.length > 0 ? body.pages : null;
    // 이미지 경로 가져오기: pages가 있으면 첫 번째 페이지의 이미지, 없으면 body.image
    var firstImage = '';
    if (pages && pages[0] && pages[0].image) {
      firstImage = pages[0].image.trim();
    } else if (body.image) {
      firstImage = body.image.trim();
    }
    
    // 이미지 경로: assets/help/images/{topTabId}/ 아래에서 로드
    var imagePath = firstImage ? getBodyImagePath(firstImage, state.topTabId) : getBodyImagePath(BODY_NO_IMAGE_PATH, state.topTabId);
    
    els.bodyPlaceholder.hidden = true;
    els.bodyInner.hidden = false;

    els.bodyImage.alt = body.title || '';
    var imageErrorCount = 0;
    var onBodyImageError = function () {
      imageErrorCount++;
      if (imageErrorCount <= 2) {
        var noImagePath = resolveImagePath(BODY_NO_IMAGE_PATH);
        if (this.src !== noImagePath) {
          setBodyImageWithFade(els.bodyImage, noImagePath, null);
        }
      } else {
        this.onerror = null;
      }
    };
    setBodyImageWithFade(els.bodyImage, imagePath, onBodyImageError);
    els.bodyTitle.textContent = body.title || '';
    var description = body.description || '';
    if (description) {
      els.bodyDescription.innerHTML = sanitizeDescriptionHtml(description);
    } else {
      els.bodyDescription.textContent = '';
    }

    // 이미지가 2개 이상이고 실제 이미지가 있을 때만: 원 + 게이지바 표시 (1장이거나 No image면 게이지바 숨김)
    var hasMultipleRealImages = pages && pages.length > 1 && !!firstImage;
    if (hasMultipleRealImages) {
      if (bodySlideshowInterval) {
        clearInterval(bodySlideshowInterval);
        bodySlideshowInterval = null;
      }
      state.currentImageIndex = 0; // 첫 번째 이미지로 초기화
      slideshowState = { bodyId: body.id, imageList: pages, body: body, index: 0, startTime: Date.now() };
      renderSlideshowIndicator(pages.length, 0);
      startSlideshowTick();
      if (els.bodySlideshowIndicator) {
        els.bodySlideshowIndicator.hidden = false;
        els.bodySlideshowIndicator.setAttribute('aria-hidden', 'false');
      }
    } else {
      state.currentImageIndex = 0; // 이미지가 1개일 때는 0
      slideshowState = null;
      if (els.bodySlideshowIndicator) {
        els.bodySlideshowIndicator.hidden = true;
        els.bodySlideshowIndicator.innerHTML = '';
        els.bodySlideshowIndicator.setAttribute('aria-hidden', 'true');
      }
    }

    // 페이지 수 = 바텀탭이면 해당 바텀탭의 연결 본문 개수, 아니면 같은 중단 탭의 본문 개수
    var bodiesForPagination = getBodiesForPagination();
    var totalPages = bodiesForPagination.length;
    var hasMultipleBodies = totalPages > 1;

    // 항상 현재 본문 기준으로 페이지네이션 DOM 갱신 (다른 본문에서 돌아왔을 때 이전 본문 개수로 남는 현상 방지)
    updatePaginationButtons(totalPages, hasMultipleBodies);
    els.bodyPagination.hidden = totalPages <= 1;
  }

  function updatePaginationButtons(totalPages, hasMultipleBodies) {
    var bodiesForPagination = getBodiesForPagination();
    var currentBodyIndex = bodiesForPagination.findIndex(function(b) { return b.id === state.bodyId; });
    if (currentBodyIndex < 0) currentBodyIndex = 0;
    var canGoPrev = currentBodyIndex > 0;
    var canGoNext = currentBodyIndex < bodiesForPagination.length - 1;
    els.btnPrev.disabled = !canGoPrev;
    els.btnNext.disabled = !canGoNext;
    
    // 기존 인디케이터 모두 제거 (HTML에 있는 것 포함)
    var paginationDots = els.bodyPagination.querySelectorAll('.body-pagination-dot');
    paginationDots.forEach(function(dot) { dot.remove(); });
    
    // 기존 컨테이너 제거
    var oldContainer = els.bodyPagination.querySelector('.body-pagination-dots');
    if (oldContainer) oldContainer.remove();
    
    // 인디케이터 컨테이너 생성
    var dotsContainer = document.createElement('div');
    dotsContainer.className = 'body-pagination-dots';
    
    // btnPrev와 btnNext 사이에 삽입
    els.btnNext.before(dotsContainer);
    
    // 페이지 수만큼 인디케이터 생성
    for (var i = 0; i < totalPages; i++) {
      var dot = document.createElement('span');
      dot.className = 'body-pagination-dot';
      dot.setAttribute('aria-hidden', 'true');
      if (i === currentBodyIndex) dot.classList.add('active');
      dotsContainer.appendChild(dot);
    }
  }

  function renderSlideshowIndicator(count, activeIndex) {
    if (!els.bodySlideshowIndicator) return;
    els.bodySlideshowIndicator.innerHTML = '';
    var track = document.createElement('div');
    track.className = 'body-slideshow-track';
    for (var i = 0; i < count; i++) {
      var circle = document.createElement('button');
      circle.type = 'button';
      circle.className = 'body-slideshow-circle' + (i === activeIndex ? ' active' : '');
      circle.dataset.slideshowIndex = String(i);
      circle.setAttribute('aria-label', (i + 1) + '번째 이미지로 이동');
      track.appendChild(circle);

      var gaugeWrap = document.createElement('div');
      gaugeWrap.className = 'body-slideshow-gauge-wrap' + (i === activeIndex ? ' active' : '');
      gaugeWrap.dataset.gaugeIndex = String(i);
      var gaugeFill = document.createElement('div');
      gaugeFill.className = 'body-slideshow-gauge-fill';
      gaugeFill.style.width = i === activeIndex ? '0%' : '0%';
      gaugeWrap.appendChild(gaugeFill);
      track.appendChild(gaugeWrap);
    }
    els.bodySlideshowIndicator.appendChild(track);

    track.addEventListener('click', function (e) {
      var circle = e.target.closest('.body-slideshow-circle');
      if (!circle || circle.dataset.slideshowIndex == null) return;
      var idx = parseInt(circle.dataset.slideshowIndex, 10);
      if (slideshowState && state.bodyId === slideshowState.bodyId) goToSlideshowIndex(idx);
    });
  }

  function goToSlideshowIndex(idx) {
    if (!slideshowState || state.bodyId !== slideshowState.bodyId) return;
    var list = slideshowState.imageList;
    var body = slideshowState.body;
    if (idx < 0 || idx >= list.length) return;
    slideshowState.index = idx;
    slideshowState.startTime = Date.now();
    state.currentImageIndex = idx; // 현재 이미지 인덱스 업데이트

    var src = '';
    if (list[idx].image) {
      src = list[idx].image.trim();
    } else if (body.image) {
      src = body.image.trim();
    }
    var imagePath = src ? getBodyImagePath(src, state.topTabId) : getBodyImagePath(BODY_NO_IMAGE_PATH, state.topTabId);
    var slideshowErrorCount = 0;
    var onSlideshowImageError = function () {
      slideshowErrorCount++;
      if (slideshowErrorCount <= 2) {
        var errorImagePath = resolveImagePath(BODY_ERROR_IMAGE_PATH);
        if (this.src !== errorImagePath) {
          setBodyImageWithFade(els.bodyImage, errorImagePath, null);
        }
      } else {
        this.onerror = null;
      }
    };
    setBodyImageWithFade(els.bodyImage, imagePath, onSlideshowImageError);

    var track = els.bodySlideshowIndicator && els.bodySlideshowIndicator.querySelector('.body-slideshow-track');
    if (track) {
      var circles = track.querySelectorAll('.body-slideshow-circle');
      var gauges = track.querySelectorAll('.body-slideshow-gauge-wrap');
      circles.forEach(function (c, i) {
        c.classList.toggle('active', i === idx);
      });
      gauges.forEach(function (g, i) {
        g.classList.toggle('active', i === idx);
        var fill = g.querySelector('.body-slideshow-gauge-fill');
        if (fill) fill.style.width = '0%';
      });
    }
  }

  function startSlideshowTick() {
    if (bodySlideshowInterval) clearInterval(bodySlideshowInterval);
    bodySlideshowInterval = setInterval(function () {
      if (!slideshowState || state.bodyId !== slideshowState.bodyId) return;
      if (slideshowPaused) {
        // 일시정지 중이면 게이지바도 업데이트하지 않음
        return;
      }
      var elapsed = Date.now() - slideshowState.startTime;
      var percent = Math.min(100, (elapsed / 2000) * 100);
      var idx = slideshowState.index;
      var track = els.bodySlideshowIndicator && els.bodySlideshowIndicator.querySelector('.body-slideshow-track');
      if (track) {
        var gauges = track.querySelectorAll('.body-slideshow-gauge-wrap');
        if (gauges[idx]) {
          var fill = gauges[idx].querySelector('.body-slideshow-gauge-fill');
          if (fill) fill.style.width = percent + '%';
        }
      }
      if (elapsed >= 2000) {
        var list = slideshowState.imageList;
        var body = slideshowState.body;
        var nextIdx = (idx + 1) % list.length;
        slideshowState.index = nextIdx;
        slideshowState.startTime = Date.now();
        state.currentImageIndex = nextIdx; // 현재 이미지 인덱스 업데이트

        var src = '';
        if (list[nextIdx].image) {
          src = list[nextIdx].image.trim();
        } else if (body.image) {
          src = body.image.trim();
        }
        var imagePath = src ? getBodyImagePath(src, state.topTabId) : getBodyImagePath(BODY_NO_IMAGE_PATH, state.topTabId);
        var slideshowErrorCount = 0;
        var onTickImageError = function () {
          slideshowErrorCount++;
          if (slideshowErrorCount <= 2) {
            var errorImagePath = resolveImagePath(BODY_ERROR_IMAGE_PATH);
            if (this.src !== errorImagePath) {
              setBodyImageWithFade(els.bodyImage, errorImagePath, null);
            }
          } else {
            this.onerror = null;
          }
        };
        setBodyImageWithFade(els.bodyImage, imagePath, onTickImageError);

        if (track) {
          var circles = track.querySelectorAll('.body-slideshow-circle');
          var gauges = track.querySelectorAll('.body-slideshow-gauge-wrap');
          circles.forEach(function (c, i) { c.classList.toggle('active', i === nextIdx); });
          gauges.forEach(function (g, i) {
            g.classList.toggle('active', i === nextIdx);
            var fill = g.querySelector('.body-slideshow-gauge-fill');
            if (fill) fill.style.width = i === nextIdx ? '0%' : '0%';
          });
        }
      }
    }, 50);
  }

  function parseBodyId(bodyId) {
    if (!bodyId) return null;
    var parts = bodyId.split('-');
    if (parts.length < 3) return null;
    var topTabId = parts[0];
    var midOrder = parseInt(parts[1], 10);
    var bodyOrder = parseInt(parts[2], 10);
    if (isNaN(midOrder) || isNaN(bodyOrder)) return null;
    return { topTabId: topTabId, midOrder: midOrder, bodyOrder: bodyOrder };
  }

  function getBodiesInSameMidTab(bodyId) {
    var parsed = parseBodyId(bodyId);
    if (!parsed || !data || !data.bodyContent) return [];
    // prefix로 startsWith 시 'defense-1-'이 'defense-10-1'까지 포함하므로, 파싱해서 topTabId·midOrder가 동일한 것만 포함
    return data.bodyContent
      .filter(function (b) {
        if (!b.id) return false;
        var p = parseBodyId(b.id);
        return p && p.topTabId === parsed.topTabId && p.midOrder === parsed.midOrder;
      })
      .map(function (b) {
        var p = parseBodyId(b.id);
        var order = p && !isNaN(p.bodyOrder) ? p.bodyOrder : 999;
        return { body: b, order: order };
      })
      .sort(function (a, b) { return a.order - b.order; })
      .map(function (item) { return item.body; });
  }

  function checkHasMultipleBodiesInSameMidTab(bodyId) {
    var bodies = getBodiesInSameMidTab(bodyId);
    return bodies.length > 1;
  }

  function getPreviousBodyInSameMidTab(bodyId) {
    var parsed = parseBodyId(bodyId);
    if (!parsed) return null;
    var bodies = getBodiesInSameMidTab(bodyId);
    var currentIndex = bodies.findIndex(function (b) { return b.id === bodyId; });
    if (currentIndex <= 0) return null;
    return bodies[currentIndex - 1];
  }

  function getNextBodyInSameMidTab(bodyId) {
    var parsed = parseBodyId(bodyId);
    if (!parsed) return null;
    var bodies = getBodiesInSameMidTab(bodyId);
    var currentIndex = bodies.findIndex(function (b) { return b.id === bodyId; });
    if (currentIndex < 0 || currentIndex >= bodies.length - 1) return null;
    return bodies[currentIndex + 1];
  }

  function goBodyPage(delta) {
    if (!state.bodyId) return;
    var bodiesForPagination = getBodiesForPagination();
    if (bodiesForPagination.length <= 1) return;
    var currentIndex = bodiesForPagination.findIndex(function(b) { return b.id === state.bodyId; });
    if (currentIndex < 0) currentIndex = 0;
    var nextIndex = currentIndex + delta;
    if (nextIndex >= 0 && nextIndex < bodiesForPagination.length) {
      showBody(bodiesForPagination[nextIndex].id);
    }
  }

  function switchTopTab(topTabId) {
    state.topTabId = topTabId;
    state.expandedMidId = null;
    state.bottomTabId = null;
    var mid = getMidConfig(topTabId);
    if (!mid) {
      els.midSectionTitle.textContent = '';
      els.midSearch.placeholder = '';
      renderMidList([]);
      renderBottomTabs([]);
      els.bodyPlaceholder.hidden = false;
      els.bodyInner.hidden = true;
      state.midItemId = null;
    } else {
      els.midSectionTitle.textContent = mid.sectionTitle || '';
      els.midSearch.placeholder = mid.searchPlaceholder || '검색...';
      renderMidList(mid.items || [], els.midSearch.value);
      state.midItemId = null;
      renderBottomTabs([]);
      els.bodyPlaceholder.hidden = false;
      els.bodyInner.hidden = true;
    }
    renderTopTabs();
  }

  function selectMidItem(midId, bodyId) {
    state.midItemId = midId;
    var midItem = getMidItem(midId);
    var bottomTabs = getBottomTabsForMidItem(midItem);
    if (bottomTabs.length > 0) {
      state.expandedMidId = midId;
      var keep = bottomTabs.some(function (bt) { return bt.id === state.bottomTabId; });
      state.bottomTabId = keep ? state.bottomTabId : (bottomTabs[0] ? bottomTabs[0].id : null);
      var selected = bottomTabs.find(function (bt) { return bt.id === state.bottomTabId; }) || bottomTabs[0];
      var firstBodyId = selected ? ((selected.bodyIds && selected.bodyIds[0]) || selected.bodyId || '') : bodyId;
      renderBottomTabs([]);
      showBody(firstBodyId);
    } else {
      state.expandedMidId = null;
      state.bottomTabId = null;
      renderBottomTabs([]);
      showBody(bodyId);
    }
    renderMidList((getMidConfig(state.topTabId) || {}).items || [], els.midSearch ? els.midSearch.value : '');
  }

  var HELP_DATA_FILE_PREFIX = 'help-data-';
  var HELP_DATA_FILE_SUFFIX = '.json';

  function normalizeFullData(json) {
    if (!json) return null;
    if (json.topTabs || json.bodyContent) return { ko: json };
    return json;
  }

  function getCurrentLang() {
    return (window.HelpLang && window.HelpLang.getCurrentLanguage()) ? window.HelpLang.getCurrentLanguage() : 'ko';
  }

  function getEmbedFullData() {
    var ids = ['ko', 'ja', 'en', 'zh-CN', 'zh-TW'];
    var full = {};
    var embed = document.getElementById('help-data');
    if (embed && embed.textContent && embed.textContent.trim()) {
      try {
        var parsed = JSON.parse(embed.textContent.trim());
        var fromEmbed = normalizeFullData(parsed);
        if (fromEmbed && (fromEmbed.ko || fromEmbed.ja || fromEmbed.topTabs)) {
          for (var k in fromEmbed) { if (fromEmbed.hasOwnProperty(k)) full[k] = fromEmbed[k]; }
        }
      } catch (e) {}
    }
    for (var i = 0; i < ids.length; i++) {
      if (full[ids[i]]) continue;
      var el = document.getElementById('help-data-' + ids[i]);
      if (el && el.textContent && el.textContent.trim()) {
        try {
          full[ids[i]] = JSON.parse(el.textContent.trim());
        } catch (e) {}
      }
    }
    return Object.keys(full).length ? full : null;
  }

  function canUseFetch() {
    return (typeof location !== 'undefined' && (location.protocol === 'http:' || location.protocol === 'https:'));
  }

  function applyDataAndRender(initialLoad) {
    if (!data || !data.topTabs) return;
    var sortedTop = data.topTabs.slice().sort(function (a, b) { return (a.order || 0) - (b.order || 0); });
    var firstTop = sortedTop[0] || null;

    if (initialLoad) {
      state.topTabId = firstTop ? firstTop.id : null;
      state.midItemId = null;
      switchTopTab(state.topTabId);
      return;
    }

    var keepTop = state.topTabId && sortedTop.some(function (t) { return t.id === state.topTabId; });
    state.topTabId = keepTop ? state.topTabId : (firstTop ? firstTop.id : null);

    var mid = state.topTabId && data.midTabs && data.midTabs[state.topTabId] ? data.midTabs[state.topTabId] : null;
    var items = mid && mid.items ? mid.items.slice().sort(function (a, b) { return (a.order != null ? a.order : 999) - (b.order != null ? b.order : 999); }) : [];
    var keepMid = state.midItemId && items.some(function (i) { return i.id === state.midItemId; });
    var firstMid = items[0];
    state.midItemId = keepMid ? state.midItemId : (firstMid ? firstMid.id : null);
    var currentMid = items.find(function (i) { return i.id === state.midItemId; }) || null;
    var bottomTabs = getBottomTabsForMidItem(currentMid);
    var bodyId = null;
    if (bottomTabs.length > 0 && state.bottomTabId) {
      var bt = bottomTabs.find(function (b) { return b.id === state.bottomTabId; });
      bodyId = bt ? ((bt.bodyIds && bt.bodyIds[0]) || bt.bodyId || null) : (bottomTabs[0] ? ((bottomTabs[0].bodyIds && bottomTabs[0].bodyIds[0]) || bottomTabs[0].bodyId) : null);
    }
    if (!bodyId && currentMid) bodyId = currentMid.bodyId || null;
    var savedMidId = state.midItemId;
    var savedBodyId = bodyId;
    var savedBottomTabId = state.bottomTabId;

    switchTopTab(state.topTabId);
    if (savedBodyId && getBodyById(savedBodyId)) {
      state.expandedMidId = null;
      var midItemForRestore = getMidItem(savedMidId);
      var btsForRestore = getBottomTabsForMidItem(midItemForRestore);
      if (btsForRestore.length > 0 && savedBottomTabId && btsForRestore.some(function (b) { return b.id === savedBottomTabId; })) {
        state.expandedMidId = savedMidId;
        state.bottomTabId = savedBottomTabId;
        state.midItemId = savedMidId;
        renderBottomTabs([]);
        showBody(savedBodyId);
        renderMidList((getMidConfig(state.topTabId) || {}).items || [], els.midSearch ? els.midSearch.value : '');
      } else {
        selectMidItem(savedMidId, savedBodyId);
      }
    } else {
      els.bodyPlaceholder.hidden = false;
      els.bodyInner.hidden = true;
    }
  }

  /** 뷰어(index.html) 여부: 편집기가 없으면 뷰어. 뷰어에서는 HTML 내장 데이터를 우선해 공유/ZIP 시 편집 내용이 그대로 보이도록 함 */
  function isViewerOnly() {
    return !document.getElementById('btnEditTabs');
  }

  function loadDataForLang(lang, callback) {
    var embedFull = getEmbedFullData();
    var langData = (embedFull && embedFull[lang]) ? embedFull[lang] : null;
    if (langData) {
      callback(langData);
      return;
    }
    if (!canUseFetch()) {
      if (embedFull && embedFull.ko) callback(embedFull.ko);
      else callback(null);
      return;
    }
    var url = HELP_DATA_FILE_PREFIX + lang + HELP_DATA_FILE_SUFFIX;
    fetch(url)
      .then(function (res) { return res.ok ? res.json() : Promise.reject(new Error('Failed to load ' + url)); })
      .then(callback)
      .catch(function (err) {
        // console.error(err);
        var fallback = getEmbedFullData();
        if (fallback && (fallback[lang] || fallback.ko)) callback(fallback[lang] || fallback.ko);
        else callback(null);
      });
  }

  function loadData(callback) {
    var lang = getCurrentLang();
    loadDataForLang(lang, function (langData) {
      if (!langData) {
        els.topTabLabel.textContent = '데이터를 불러올 수 없습니다.';
        return;
      }
      data = langData;
      fullData = getEmbedFullData();
      callback();
    });
  }

  var isFirstLoad = true;
  function init() {
    loadData(function () {
      applyDataAndRender(isFirstLoad);
      isFirstLoad = false;
    });

    els.topTabsContainer.addEventListener('click', function (e) {
      var btn = e.target.closest('.top-tab');
      if (!btn || !btn.dataset.topTabId) return;
      switchTopTab(btn.dataset.topTabId);
    });

    els.midList.addEventListener('click', function (e) {
      var li = e.target.closest('.mid-item');
      if (!li || !li.dataset.midId) return;
      if (e.target.closest('.mid-item-edit-btn')) return;
      selectMidItem(li.dataset.midId, li.dataset.bodyId || '');
    });

    els.midSearch.addEventListener('input', function () {
      var mid = getMidConfig(state.topTabId);
      renderMidList((mid && mid.items) ? mid.items : [], els.midSearch.value);
    });

    els.btnPrev.addEventListener('click', function () { goBodyPage(-1); });
    els.btnNext.addEventListener('click', function () { goBodyPage(1); });

    els.btnClose.addEventListener('click', function () {
      if (typeof window.onHelpClose === 'function') window.onHelpClose();
      else window.close();
    });

    if (window.HelpLang && els.langSelect) {
      var list = window.HelpLang.getLanguages();
      els.langSelect.innerHTML = '';
      list.forEach(function (item) {
        var opt = document.createElement('option');
        opt.value = item.id;
        opt.textContent = item.label;
        els.langSelect.appendChild(opt);
      });
      els.langSelect.value = getCurrentLang();
      
      // 언어가 1개만 있으면 드롭박스 숨기기 (도움말 화면에서만)
      if (list.length <= 1) {
        els.langSelect.style.display = 'none';
      } else {
        els.langSelect.style.display = '';
      }
      
      els.langSelect.addEventListener('change', function () {
        var newLang = els.langSelect.value;
        window.HelpLang.setCurrentLanguage(newLang);
        loadDataForLang(newLang, function (langData) {
          if (!langData) return;
          data = langData;
          applyDataAndRender();
        });
      });
    }
    window.addEventListener('helpLanguageChange', function (e) {
      if (!e.detail || !e.detail.language) return;
      var newLang = e.detail.language;
      
      // 언어 개수 확인하여 드롭박스 표시/숨김 업데이트
      if (window.HelpLang && els.langSelect) {
        var list = window.HelpLang.getLanguages();
        if (list.length <= 1) {
          els.langSelect.style.display = 'none';
        } else {
          els.langSelect.style.display = '';
        }
      }
      
      loadDataForLang(newLang, function (langData) {
        if (!langData) return;
        data = langData;
        applyDataAndRender();
      });
    });
  }

  window.HelpApp = window.HelpApp || {};
  window.HelpApp.state = state; // state를 외부에서 접근 가능하도록 노출
  window.HelpApp.pauseSlideshow = function() {
    slideshowPaused = true;
    // 게이지바 업데이트도 즉시 중지
    if (bodySlideshowInterval) {
      var track = els.bodySlideshowIndicator && els.bodySlideshowIndicator.querySelector('.body-slideshow-track');
      if (track && slideshowState) {
        var idx = slideshowState.index;
        var gauges = track.querySelectorAll('.body-slideshow-gauge-wrap');
        if (gauges[idx]) {
          var fill = gauges[idx].querySelector('.body-slideshow-gauge-fill');
          if (fill) {
            // 현재 진행률을 유지하되 더 이상 진행하지 않음
            var currentPercent = parseFloat(fill.style.width) || 0;
            fill.style.width = currentPercent + '%';
          }
        }
      }
    }
  };
  window.HelpApp.resumeSlideshow = function() {
    slideshowPaused = false;
    if (slideshowState && state.bodyId === slideshowState.bodyId) {
      slideshowState.startTime = Date.now(); // 일시정지 해제 시 시간 리셋
      // 게이지바도 리셋
      var track = els.bodySlideshowIndicator && els.bodySlideshowIndicator.querySelector('.body-slideshow-track');
      if (track) {
        var idx = slideshowState.index;
        var gauges = track.querySelectorAll('.body-slideshow-gauge-wrap');
        if (gauges[idx]) {
          var fill = gauges[idx].querySelector('.body-slideshow-gauge-fill');
          if (fill) fill.style.width = '0%';
        }
      }
    }
  };
  window.HelpApp.reloadFromEmbed = function () {
    fullData = getEmbedFullData();
    if (fullData) {
      var lang = getCurrentLang();
      data = fullData[lang] || fullData.ko || null;
      if (data) {
        applyDataAndRender();
        return;
      }
    }
    loadDataForLang(getCurrentLang(), function (langData) {
      if (langData) {
        data = langData;
        applyDataAndRender();
      }
    });
  };
  window.HelpApp.selectMidItem = function (midId, bodyId) {
    if (midId && bodyId) {
      selectMidItem(midId, bodyId);
    }
  };
  window.HelpApp.showBody = function (bodyId) {
    if (bodyId) {
      showBody(bodyId);
    }
  };
  window.HelpApp.getCurrentBodyId = function () {
    return state.bodyId || null;
  };
  window.HelpApp.getCurrentBodyPageIndex = function () {
    return state.bodyPageIndex != null ? state.bodyPageIndex : -1;
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
