(function () {
  'use strict';

  var modal = document.getElementById('topTabsModal');
  var backdrop = document.getElementById('topTabsModalBackdrop');
  var btnEditTabs = document.getElementById('btnEditTabs');
  var btnCloseModal = document.getElementById('topTabsModalClose');
  var listEl = document.getElementById('topTabsList');
  var btnAddTopTab = document.getElementById('btnAddTopTab');
  var form = document.getElementById('topTabForm');
  var formTitle = document.getElementById('topTabFormTitle');
  var inputId = document.getElementById('topTabId');
  var inputLabel = document.getElementById('topTabLabelInput');
  var inputIcon = document.getElementById('topTabIcon');
  var inputOrder = document.getElementById('topTabOrder');
  var topTabSectionTitleInput = document.getElementById('topTabSectionTitleInput');
  var topTabSearchPlaceholderInput = document.getElementById('topTabSearchPlaceholderInput');
  var btnFormCancel = document.getElementById('topTabFormCancel');
  var topTabFormPlaceholder = document.getElementById('topTabFormPlaceholder');

  var editingId = null;

  function getCurrentLang() {
    return (window.HelpLang && window.HelpLang.getCurrentLanguage()) ? window.HelpLang.getCurrentLanguage() : 'ko';
  }

  function getFullData() {
    var embed = document.getElementById('help-data');
    var full = {};
    if (embed && embed.textContent && embed.textContent.trim()) {
      try {
        var parsed = JSON.parse(embed.textContent.trim());
        if (parsed) {
          if (parsed.topTabs || parsed.bodyContent) full = { ko: parsed };
          else full = parsed;
        }
      } catch (e) {}
    }
    if (Object.keys(full).length === 0) {
      var ids = ['ko', 'ja', 'en', 'zh-CN', 'zh-TW'];
      for (var i = 0; i < ids.length; i++) {
        var el = document.getElementById('help-data-' + ids[i]);
        if (el && el.textContent && el.textContent.trim()) {
          try {
            full[ids[i]] = JSON.parse(el.textContent.trim());
          } catch (e) {}
        }
      }
    }
    return Object.keys(full).length ? full : null;
  }

  function getData() {
    var full = getFullData();
    if (!full) return null;
    var lang = getCurrentLang();
    return full[lang] || full.ko || full;
  }

  function setData(langData) {
    var embed = document.getElementById('help-data');
    if (!embed) return;
    var full = getFullData();
    if (!full) full = {};
    if (full.topTabs || full.bodyContent) full = { ko: full };
    var lang = getCurrentLang();
    full[lang] = langData;
    var jsonStr = JSON.stringify(full);
    embed.textContent = jsonStr;
    if (window.HelpApp && typeof window.HelpApp.reloadFromEmbed === 'function') {
      window.HelpApp.reloadFromEmbed();
    }
  }

  function openModal() {
    if (!modal) return;
    modal.hidden = false;
    renderList();
    form.hidden = true;
    if (topTabFormPlaceholder) topTabFormPlaceholder.hidden = false;
    editingId = null;
  }

  function closeModal() {
    if (!modal) return;
    modal.hidden = true;
    form.hidden = true;
    if (topTabFormPlaceholder) topTabFormPlaceholder.hidden = false;
    editingId = null;
  }

  function renderList() {
    var data = getData();
    if (!data || !data.topTabs) {
      listEl.innerHTML = '';
      return;
    }
    var sorted = data.topTabs.slice().sort(function (a, b) { return (a.order || 0) - (b.order || 0); });
    listEl.innerHTML = '';
    sorted.forEach(function (tab) {
      var li = document.createElement('li');
      li.dataset.tabId = tab.id;
      if (tab.id === editingId) li.classList.add('selected');
      var info = document.createElement('div');
      info.className = 'tab-info';
      info.innerHTML = '<span class="tab-id">' + escapeHtml(tab.id) + '</span><span class="tab-label">' + escapeHtml(tab.label || '') + '</span> <span class="tab-order">(순서: ' + (tab.order != null ? tab.order : '') + ')</span>';
      li.appendChild(info);
      var btnDel = document.createElement('button');
      btnDel.type = 'button';
      btnDel.className = 'btn-delete-one';
      btnDel.textContent = '삭제';
      btnDel.dataset.tabId = tab.id;
      li.appendChild(btnDel);
      listEl.appendChild(li);
    });
  }

  function escapeHtml(s) {
    if (s == null) return '';
    var div = document.createElement('div');
    div.textContent = s;
    return div.innerHTML;
  }

  /** ID 형식: 영문·숫자·밑줄·하이픈만 허용 (pattern 대신 JS 검증) */
  function isValidId(s) {
    if (typeof s !== 'string' || !s) return false;
    return /^[a-zA-Z0-9_-]+$/.test(s);
  }

  function showForm(tab) {
    editingId = tab ? tab.id : null;
    formTitle.textContent = tab ? '탭 수정' : '탭 추가';
    inputId.value = tab ? tab.id : '';
    inputLabel.value = tab ? (tab.label || '') : '';
    inputIcon.value = tab ? (tab.icon || '') : (tab === null ? 'assets/icons/' : '');
    inputOrder.value = tab && tab.order != null ? tab.order : (getData().topTabs.length + 1);
    var data = getData();
    var mid = tab && data && data.midTabs && data.midTabs[tab.id] ? data.midTabs[tab.id] : { sectionTitle: '', searchPlaceholder: 'Q 검색...', items: [] };
    if (topTabSectionTitleInput) topTabSectionTitleInput.value = mid.sectionTitle || '';
    if (topTabSearchPlaceholderInput) topTabSearchPlaceholderInput.value = mid.searchPlaceholder || 'Q 검색...';
    inputId.disabled = false;
    form.hidden = false;
    if (topTabFormPlaceholder) topTabFormPlaceholder.hidden = true;
  }

  function hideForm() {
    form.hidden = true;
    if (topTabFormPlaceholder) topTabFormPlaceholder.hidden = false;
    editingId = null;
  }

  function getNextOrder(data) {
    var max = 0;
    (data.topTabs || []).forEach(function (t) { if ((t.order || 0) > max) max = t.order; });
    return max + 1;
  }

  function saveTab() {
    var data = getData();
    if (!data) return;
    data.topTabs = data.topTabs || [];
    data.midTabs = data.midTabs || {};

    var id = (inputId.value || '').trim().replace(/\s+/g, '_');
    var label = (inputLabel.value || '').trim();
    var icon = (inputIcon.value || '').trim();
    var order = parseInt(inputOrder.value, 10) || 1;

    if (!id) {
      alert('ID를 입력하세요.');
      return;
    }
    if (!isValidId(id)) {
      alert('ID는 영문, 숫자, 밑줄(_), 하이픈(-)만 사용할 수 있습니다.');
      return;
    }

    // 최상단 탭 순서가 다른 탭과 겹치는지 확인 (order 값 기반)
    var topOrderDuplicate = data.topTabs.some(function (t) {
      return t.order === order && (editingId ? t.id !== editingId : true);
    });
    if (topOrderDuplicate) {
      alert('같은 순서(' + order + ')가 이미 있어 순서가 겹칩니다. 다른 순서를 입력하세요.');
      return;
    }

    var sectionTitle = (topTabSectionTitleInput && topTabSectionTitleInput.value) ? topTabSectionTitleInput.value.trim() : '';
    var searchPlaceholder = (topTabSearchPlaceholderInput && topTabSearchPlaceholderInput.value) ? topTabSearchPlaceholderInput.value.trim() : 'Q 검색...';

    if (editingId) {
      var idx = data.topTabs.findIndex(function (t) { return t.id === editingId; });
      if (idx >= 0) {
        var oldTopId = editingId;
        var idChanged = (id !== oldTopId);
        if (idChanged && data.topTabs.some(function (t) { return t.id === id; })) {
          alert('이미 같은 ID의 탭이 있습니다.');
          return;
        }
        data.topTabs[idx] = { id: id, label: label, icon: icon || data.topTabs[idx].icon, order: order };
        data.midTabs[oldTopId] = data.midTabs[oldTopId] || { sectionTitle: '', searchPlaceholder: 'Q 검색...', items: [] };
        data.midTabs[oldTopId].sectionTitle = sectionTitle;
        data.midTabs[oldTopId].searchPlaceholder = searchPlaceholder;
        if (idChanged) {
          data.midTabs[id] = data.midTabs[oldTopId];
          delete data.midTabs[oldTopId];
          var items = data.midTabs[id].items || [];
          items.forEach(function (item) {
            var midOrder = item.order != null ? item.order : 1;
            item.id = id + '-' + midOrder;
            item.bodyId = getBodyIdByRule(id, midOrder, 1);
          });
          data.bodyContent = data.bodyContent || [];
          data.bodyContent.forEach(function (body) {
            if (body.id && body.id.indexOf(oldTopId + '-') === 0) {
              body.id = id + body.id.substring(oldTopId.length);
            }
          });
        }
      }
      hideForm();
    } else {
      if (data.topTabs.some(function (t) { return t.id === id; })) {
        alert('이미 같은 ID의 탭이 있습니다.');
        return;
      }
      var defaultIcon = icon || 'assets/icons/';
      data.topTabs.push({ id: id, label: label, icon: defaultIcon, order: order });
      data.midTabs[id] = { sectionTitle: sectionTitle, searchPlaceholder: searchPlaceholder, items: [] };
      hideForm();
    }
    setData(data);
    renderList();
  }

  function deleteTab(tabId) {
    var data = getData();
    if (!data) return;
    if (!confirm('최상단 탭 "' + tabId + '"을(를) 삭제하면 해당 탭의 중단 목록도 함께 삭제됩니다. 계속할까요?')) return;
    data.topTabs = (data.topTabs || []).filter(function (t) { return t.id !== tabId; });
    if (data.midTabs && data.midTabs[tabId]) delete data.midTabs[tabId];
    setData(data);
    renderList();
    hideForm();
  }

  function getCurrentTopTabIdForEdit() {
    var active = document.querySelector('.top-tab.active');
    return active ? (active.dataset.topTabId || null) : null;
  }

  function openModalAndEditCurrentTab() {
    var topTabId = getCurrentTopTabIdForEdit();
    if (!topTabId) return;
    var data = getData();
    if (!data || !data.topTabs) return;
    var tab = data.topTabs.find(function (t) { return t.id === topTabId; });
    if (!tab) return;
    openModal();
    showForm(tab);
  }

  var headerTopTabLabel = document.getElementById('topTabLabel');
  if (headerTopTabLabel) headerTopTabLabel.addEventListener('click', openModalAndEditCurrentTab);

  window.addEventListener('editTopTab', function (e) {
    var topTabId = e.detail && e.detail.topTabId;
    if (!topTabId) return;
    var data = getData();
    if (!data || !data.topTabs) return;
    var tab = data.topTabs.find(function (t) { return t.id === topTabId; });
    if (!tab) return;
    openModal();
    showForm(tab);
  });

  if (btnEditTabs) btnEditTabs.addEventListener('click', openModal);
  if (backdrop) backdrop.addEventListener('click', closeModal);
  if (btnCloseModal) btnCloseModal.addEventListener('click', closeModal);
  if (btnAddTopTab) btnAddTopTab.addEventListener('click', function () { showForm(null); });

  listEl.addEventListener('click', function (e) {
    var li = e.target.closest('li');
    if (!li || !li.dataset.tabId) return;
    var tabId = li.dataset.tabId;
    var data = getData();
    var tab = data && data.topTabs ? data.topTabs.find(function (t) { return t.id === tabId; }) : null;
    if (e.target.classList.contains('btn-delete-one')) {
      deleteTab(tabId);
    } else {
      showForm(tab);
      renderList();
    }
  });

  if (form) form.addEventListener('submit', function (e) { e.preventDefault(); saveTab(); });
  if (btnFormCancel) btnFormCancel.addEventListener('click', hideForm);

  // 아이콘 파일 선택 버튼
  var topTabIconFile = document.getElementById('topTabIconFile');
  var topTabIconBrowse = document.getElementById('topTabIconBrowse');
  if (topTabIconBrowse && topTabIconFile) {
    topTabIconBrowse.addEventListener('click', function () {
      topTabIconFile.click();
    });
    topTabIconFile.addEventListener('change', function (e) {
      var file = e.target.files && e.target.files[0];
      if (file) {
        var relativePath = filePathToRelativeFromHtmlBase(e.target.value);
        if (!relativePath) relativePath = 'assets/icons/' + file.name;
        if (inputIcon) inputIcon.value = relativePath;
      }
    });
  }

  /* ===== 중단 탭 관리 ===== */
  function getCurrentTopTabId() {
    var active = document.querySelector('.top-tab.active');
    return active ? active.dataset.topTabId || null : null;
  }

  var midModal = document.getElementById('midTabsModal');
  var midBackdrop = document.getElementById('midTabsModalBackdrop');
  var btnEditMidTabs = document.getElementById('btnEditMidTabs');
  var midModalClose = document.getElementById('midTabsModalClose');
  var midTabsList = document.getElementById('midTabsList');
  var midTabsModalHint = document.getElementById('midTabsModalHint');
  var btnAddMidTab = document.getElementById('btnAddMidTab');
  var midForm = document.getElementById('midTabForm');
  var midFormTitle = document.getElementById('midTabFormTitle');
  var midItemIdDisplay = document.getElementById('midItemIdDisplay');
  var midBodyIdDisplay = document.getElementById('midBodyIdDisplay');
  var midInputTitle = document.getElementById('midItemTitle');
  var midItemOrderInput = document.getElementById('midItemOrderInput');
  var midFormCancel = document.getElementById('midTabFormCancel');
  var midTabFormPlaceholder = document.getElementById('midTabFormPlaceholder');
  var midItemBottomTabsList = document.getElementById('midItemBottomTabsList');
  var btnAddBottomTab = document.getElementById('btnAddBottomTab');
  var editingMidId = null;

  /** 본문 ID 드롭다운 옵션 채우기 (바텀탭용) */
  function populateBodySelectForBottomTabs(selectEl) {
    if (!selectEl) return;
    var data = getData();
    var bodies = (data && data.bodyContent) ? data.bodyContent : [];
    selectEl.innerHTML = '<option value="">본문 선택</option>';
    bodies.forEach(function (b) {
      var opt = document.createElement('option');
      opt.value = b.id || '';
      opt.textContent = (b.title || b.id || '') + ' (' + (b.id || '') + ')';
      selectEl.appendChild(opt);
    });
  }

  /** 바텀탭 한 행 DOM 생성 (title, bodyId, order, 삭제) */
  function createBottomTabRow(bt, index) {
    var li = document.createElement('li');
    li.className = 'bottom-tab-row';
    li.dataset.index = String(index);
    var titleInput = document.createElement('input');
    titleInput.type = 'text';
    titleInput.className = 'editor-input bt-title';
    titleInput.placeholder = '탭 제목';
    titleInput.value = (bt && bt.title) ? bt.title : '';
    var bodySelect = document.createElement('select');
    bodySelect.className = 'editor-input bt-body';
    populateBodySelectForBottomTabs(bodySelect);
    if (bt && bt.bodyId) bodySelect.value = bt.bodyId;
    var orderInput = document.createElement('input');
    orderInput.type = 'number';
    orderInput.className = 'editor-input bt-order';
    orderInput.min = 1;
    orderInput.value = (bt && (bt.order != null)) ? bt.order : (index + 1);
    var btnRemove = document.createElement('button');
    btnRemove.type = 'button';
    btnRemove.className = 'btn-remove-bt';
    btnRemove.textContent = '삭제';
    btnRemove.addEventListener('click', function () {
      li.remove();
    });
    li.appendChild(titleInput);
    li.appendChild(bodySelect);
    li.appendChild(orderInput);
    li.appendChild(btnRemove);
    return li;
  }

  /** 바텀탭 목록 렌더 (폼에 표시) */
  function renderBottomTabsList(bottomTabs) {
    midItemBottomTabsList.innerHTML = '';
    var list = Array.isArray(bottomTabs) ? bottomTabs : [];
    list.forEach(function (bt, index) {
      midItemBottomTabsList.appendChild(createBottomTabRow(bt, index));
    });
  }

  /** 폼에서 바텀탭 배열 수집 (바텀탭 ID: 최상단탭ID-중단탭순서-바텀탭순서, 순서는 1-based 인덱스) */
  function collectBottomTabsFromForm() {
    var rows = midItemBottomTabsList.querySelectorAll('.bottom-tab-row');
    var topTabId = getCurrentTopTabId();
    var midOrder = editingMidId ? getMidOrderFromMidId(editingMidId) : (parseInt(midItemOrderInput && midItemOrderInput.value ? midItemOrderInput.value : 1, 10) || 1);
    var arr = [];
    rows.forEach(function (row, index) {
      var titleEl = row.querySelector('.bt-title');
      var bodyEl = row.querySelector('.bt-body');
      var orderEl = row.querySelector('.bt-order');
      var title = titleEl && titleEl.value ? titleEl.value.trim() : '';
      var bodyId = bodyEl && bodyEl.value ? bodyEl.value.trim() : '';
      var order = (orderEl && orderEl.value) ? parseInt(orderEl.value, 10) : (index + 1);
      if (isNaN(order)) order = index + 1;
      if (!title && !bodyId) return;
      var bottomOrderInId = index + 1;
      var id = getBottomTabIdByRule(topTabId, midOrder, bottomOrderInId);
      arr.push({ id: id, title: title || '바텀탭 ' + (index + 1), bodyId: bodyId || '', order: order });
    });
    return arr.sort(function (a, b) { return (a.order != null ? a.order : 999) - (b.order != null ? b.order : 999); });
  }

  function openMidModal() {
    var topTabId = getCurrentTopTabId();
    if (!topTabId) {
      alert('먼저 상단에서 대분류 탭을 선택하세요.');
      return;
    }
    if (!midModal) return;
    midModal.hidden = false;
    midTabsModalHint.textContent = '현재 대분류: ' + topTabId;
    renderMidList(topTabId);
    midForm.hidden = true;
    if (midTabFormPlaceholder) midTabFormPlaceholder.hidden = false;
    editingMidId = null;
  }

  function closeMidModal() {
    if (!midModal) return;
    midModal.hidden = true;
    midForm.hidden = true;
    if (midTabFormPlaceholder) midTabFormPlaceholder.hidden = false;
    editingMidId = null;
  }

  function renderMidList(topTabId) {
    var data = getData();
    if (!data || !data.midTabs || !topTabId) {
      midTabsList.innerHTML = '';
      return;
    }
    var mid = data.midTabs[topTabId];
    var items = (mid && mid.items) ? mid.items.slice().sort(function (a, b) { return (a.order != null ? a.order : 999) - (b.order != null ? b.order : 999); }) : [];
    midTabsList.innerHTML = '';
    items.forEach(function (item) {
      var li = document.createElement('li');
      li.dataset.midId = item.id;
      if (item.id === editingMidId) li.classList.add('selected');
      var info = document.createElement('div');
      info.className = 'tab-info';
      info.innerHTML = '<span class="tab-id">' + escapeHtml(item.id) + '</span><span class="tab-label">' + escapeHtml(item.title || '') + '</span> → ' + escapeHtml(item.bodyId || '') + ' <span class="tab-order">(순서: ' + (item.order != null ? item.order : '-') + ')</span>';
      li.appendChild(info);
      var btnDel = document.createElement('button');
      btnDel.type = 'button';
      btnDel.className = 'btn-delete-one';
      btnDel.textContent = '삭제';
      btnDel.dataset.midId = item.id;
      li.appendChild(btnDel);
      midTabsList.appendChild(li);
    });
  }

  function getMidItemsMaxOrder(topTabId) {
    var data = getData();
    if (!data || !data.midTabs || !data.midTabs[topTabId] || !data.midTabs[topTabId].items) return 0;
    var max = 0;
    data.midTabs[topTabId].items.forEach(function (i) { if ((i.order || 0) > max) max = i.order; });
    return max;
  }

  /** 본문 ID 규칙: 최상단탭ID-중단순서-본문순서 (예: tutorial-1-1, tutorial-1-2) */
  function getBodyIdByRule(topTabId, midOrder, bodyOrder) {
    var order = (bodyOrder != null && bodyOrder >= 1) ? bodyOrder : 1;
    return topTabId + '-' + midOrder + '-' + order;
  }

  /** 중단탭 ID에서 순서 추출 (예: operate-1 → 1) */
  function getMidOrderFromMidId(midId) {
    if (!midId || midId.indexOf('-') < 0) return 1;
    return parseInt(midId.substring(midId.indexOf('-') + 1), 10) || 1;
  }

  /** 바텀탭 ID 규칙: 최상단탭ID-중단탭순서-바텀탭순서 (예: operate-1-1, operate-1-2) */
  function getBottomTabIdByRule(topTabId, midOrder, bottomOrder) {
    var order = (bottomOrder != null && bottomOrder >= 1) ? bottomOrder : 1;
    return topTabId + '-' + midOrder + '-' + order;
  }

  /** 바텀탭 소속 본문 ID 규칙: 최상단탭ID-중단탭순서-바텀탭순서-본문순서 (예: operate-1-1-1) */
  function getBodyIdByRuleForBottomTab(topTabId, midOrder, bottomOrder, bodyOrder) {
    var order = (bodyOrder != null && bodyOrder >= 1) ? bodyOrder : 1;
    return topTabId + '-' + midOrder + '-' + bottomOrder + '-' + order;
  }

  function updateMidItemIdDisplay() {
    var topTabId = getCurrentTopTabId();
    if (!topTabId) return;
    var orderVal = (midItemOrderInput && midItemOrderInput.value) ? parseInt(midItemOrderInput.value, 10) : 1;
    if (isNaN(orderVal) || orderVal < 1) orderVal = 1;
    var midId = topTabId + '-' + orderVal;
    var bodyId = getBodyIdByRule(topTabId, orderVal, 1);
    if (midItemIdDisplay) midItemIdDisplay.textContent = '(예: ' + midId + ')';
    if (midBodyIdDisplay) midBodyIdDisplay.textContent = '(예: ' + bodyId + ', tutorial-1-2 …)';
  }

  function showMidForm(item) {
    editingMidId = item ? item.id : null;
    midFormTitle.textContent = item ? '항목 수정' : '항목 추가';
    midInputTitle.value = item ? (item.title || '') : '';
    var topTabId = getCurrentTopTabId();
    var orderVal = item && (item.order != null) ? item.order : (topTabId ? getMidItemsMaxOrder(topTabId) + 1 : 1);
    if (midItemOrderInput) midItemOrderInput.value = orderVal;
    updateMidItemIdDisplay();
    renderBottomTabsList(item && item.bottomTabs ? item.bottomTabs : []);
    midForm.hidden = false;
    if (midTabFormPlaceholder) midTabFormPlaceholder.hidden = true;
  }

  function hideMidForm() {
    midForm.hidden = true;
    if (midTabFormPlaceholder) midTabFormPlaceholder.hidden = false;
    editingMidId = null;
  }

  function saveMidItem() {
    var topTabId = getCurrentTopTabId();
    if (!topTabId) return;
    var data = getData();
    if (!data) return;
    data.midTabs = data.midTabs || {};
    data.midTabs[topTabId] = data.midTabs[topTabId] || { sectionTitle: '', searchPlaceholder: 'Q 검색...', items: [] };
    data.bodyContent = data.bodyContent || [];

    var title = (midInputTitle.value || '').trim();
    var order = parseInt(midItemOrderInput && midItemOrderInput.value ? midItemOrderInput.value : 1, 10) || 1;
    var id = topTabId + '-' + order;
    var bodyId = getBodyIdByRule(topTabId, order, 1);

    if (!title) {
      alert('표시 제목을 입력하세요.');
      return;
    }

    var items = data.midTabs[topTabId].items;
    // 순서가 다른 중단 탭과 겹치는지 확인 (ID가 아닌 order로 확인)
    var isOrderDuplicate = items.some(function (i) { 
      return i.order === order && i.id !== editingMidId; 
    });
    if (isOrderDuplicate) {
      alert('같은 순서(' + order + ')가 이미 있어 순서가 겹칩니다. 다른 순서를 입력하세요.');
      return;
    }

    if (editingMidId) {
      var idx = items.findIndex(function (i) { return i.id === editingMidId; });
      if (idx >= 0) {
        var oldItem = items[idx];
        var oldOrder = oldItem.order != null ? oldItem.order : 1;
        
        // 순서가 변경된 경우
        if (oldOrder !== order) {
          // 해당 중단 탭에 소속된 모든 본문의 ID를 변경
          var oldMidPrefix = topTabId + '-' + oldOrder + '-';
          var newMidPrefix = topTabId + '-' + order + '-';
          
          data.bodyContent.forEach(function(body) {
            if (body.id && body.id.startsWith(oldMidPrefix)) {
              // 본문 ID의 중단 탭 순서 부분만 변경
              var bodyIdParts = body.id.split('-');
              if (bodyIdParts.length >= 3) {
                var bodyOrder = bodyIdParts[2];
                body.id = newMidPrefix + bodyOrder;
              }
            }
          });
          
          // 중단 탭의 bodyId도 새 순서의 첫 번째 본문 ID로 업데이트
          bodyId = getBodyIdByRule(topTabId, order, 1);
        } else {
          // 순서가 변경되지 않은 경우 기존 bodyId 유지
          bodyId = oldItem.bodyId || bodyId;
        }
        
        var bottomTabs = collectBottomTabsFromForm();
        items[idx] = { id: id, title: title, bodyId: bodyId, order: order };
        if (bottomTabs.length > 0) items[idx].bottomTabs = bottomTabs;
        else delete items[idx].bottomTabs;
      }
      hideMidForm();
    } else {
      var bottomTabs = collectBottomTabsFromForm();
      var firstBodyIdForMid = bodyId;
      if (bottomTabs.length === 0) {
        var bottomTabId = getBottomTabIdByRule(topTabId, order, 1);
        var firstBodyIdForBottom = getBodyIdByRuleForBottomTab(topTabId, order, 1, 1);
        if (!data.bodyContent.some(function (b) { return b.id === firstBodyIdForBottom; })) {
          var defaultImage = topTabId ? 'assets/help/images/' + topTabId + '/No_Images.png' : 'assets/help/images/No_Images.png';
          data.bodyContent.push({ id: firstBodyIdForBottom, title: title, image: defaultImage, description: '', pages: null });
        }
        bottomTabs = [{ id: bottomTabId, title: '바텀탭 1', bodyIds: [firstBodyIdForBottom], order: 1 }];
        firstBodyIdForMid = firstBodyIdForBottom;
        bodyId = firstBodyIdForBottom;
      }
      var newItem = { id: id, title: title, bodyId: firstBodyIdForMid, order: order, bottomTabs: bottomTabs };
      items.push(newItem);
      hideMidForm();
    }
    if (!data.bodyContent.some(function (b) { return b.id === bodyId; })) {
      var defaultImage = topTabId ? 'assets/help/images/' + topTabId + '/No_Images.png' : 'assets/help/images/No_Images.png';
      data.bodyContent.push({ id: bodyId, title: title, image: defaultImage, description: '', pages: null });
    }
    items.sort(function (a, b) { return (a.order != null ? a.order : 999) - (b.order != null ? b.order : 999); });
    setData(data);
    renderMidList(topTabId);
  }

  /** 중단 항목에 따른 예상 본문 ID (규칙: 최상단탭ID-중단순서-본문순서) */
  function getExpectedBodyIdForMidItem(topTabId, item, bodyOrder) {
    if (!topTabId || !item) return null;
    var order = item.order != null ? item.order : 1;
    return getBodyIdByRule(topTabId, order, bodyOrder != null ? bodyOrder : 1);
  }

  /** 선택된 중단 탭에 속한 본문들의 페이지 순서 중 다음 순서 반환 (없으면 1) */
  function getNextBodyOrderForMidTab(topTabId, midTabId) {
    if (!topTabId || !midTabId) return 1;
    var data = getData();
    if (!data || !data.bodyContent || !data.midTabs || !data.midTabs[topTabId]) return 1;
    var mid = data.midTabs[topTabId];
    var items = mid.items || [];
    var selectedItem = items.find(function (item) { return item.id === midTabId; });
    if (!selectedItem || selectedItem.order == null) return 1;
    var midOrder = selectedItem.order;
    var prefix = topTabId + '-' + midOrder + '-';
    var maxOrder = 0;
    data.bodyContent.forEach(function (b) {
      if (!b.id || b.id.indexOf(prefix) !== 0) return;
      var order = b.order != null ? b.order : (function () {
        var parts = b.id.split('-');
        if (parts.length >= 3) {
          var n = parseInt(parts[2], 10);
          return isNaN(n) ? 0 : n;
        }
        return 0;
      })();
      if (order > maxOrder) maxOrder = order;
    });
    return maxOrder + 1;
  }

  function deleteMidItem(midId) {
    var topTabId = getCurrentTopTabId();
    if (!topTabId) return;
    if (!confirm('이 항목을 삭제할까요?')) return;
    var data = getData();
    if (!data || !data.midTabs || !data.midTabs[topTabId]) return;
    data.midTabs[topTabId].items = data.midTabs[topTabId].items.filter(function (i) { return i.id !== midId; });
    setData(data);
    renderMidList(topTabId);
    hideMidForm();
  }

  if (btnEditMidTabs) btnEditMidTabs.addEventListener('click', openMidModal);
  if (midBackdrop) midBackdrop.addEventListener('click', closeMidModal);
  if (midModalClose) midModalClose.addEventListener('click', closeMidModal);
  if (btnAddMidTab) btnAddMidTab.addEventListener('click', function () { showMidForm(null); });

  var headerSectionTitle = document.getElementById('midSectionTitle');
  if (headerSectionTitle) headerSectionTitle.addEventListener('click', openModalAndEditCurrentTab);

  window.addEventListener('editMidItem', function (e) {
    var midId = e.detail && e.detail.midId;
    if (!midId) return;
    var topTabId = getCurrentTopTabId();
    if (!topTabId) return;
    var data = getData();
    if (!data || !data.midTabs || !data.midTabs[topTabId]) return;
    var item = (data.midTabs[topTabId].items || []).find(function (i) { return i.id === midId; });
    if (!item) return;
    openMidModal();
    showMidForm(item);
  });

  window.addEventListener('editBottomTab', function (e) {
    var midId = e.detail && e.detail.midId;
    var bottomTabId = e.detail && e.detail.bottomTabId;
    if (!midId || !bottomTabId) return;
    var topTabId = getCurrentTopTabId();
    if (!topTabId) return;
    var data = getData();
    if (!data || !data.midTabs || !data.midTabs[topTabId]) return;
    var item = (data.midTabs[topTabId].items || []).find(function (i) { return i.id === midId; });
    if (!item || !item.bottomTabs || !item.bottomTabs.some(function (b) { return b.id === bottomTabId; })) return;
    openBottomTabsModal(midId, bottomTabId);
  });

  if (midTabsList) {
    midTabsList.addEventListener('click', function (e) {
      var li = e.target.closest('li');
      if (!li || !li.dataset.midId) return;
      var midId = li.dataset.midId;
      var topTabId = getCurrentTopTabId();
      if (!topTabId) return;
      var data = getData();
      var mid = data && data.midTabs && topTabId ? data.midTabs[topTabId] : null;
      var item = mid && mid.items ? mid.items.find(function (i) { return i.id === midId; }) : null;
      if (e.target.classList.contains('btn-delete-one')) deleteMidItem(midId);
      else { showMidForm(item); renderMidList(topTabId); }
    });
  }
  if (midForm) midForm.addEventListener('submit', function (e) { e.preventDefault(); saveMidItem(); });
  if (midFormCancel) midFormCancel.addEventListener('click', hideMidForm);
  if (midItemOrderInput) midItemOrderInput.addEventListener('input', updateMidItemIdDisplay);
  if (midItemOrderInput) midItemOrderInput.addEventListener('change', updateMidItemIdDisplay);
  if (btnAddBottomTab) btnAddBottomTab.addEventListener('click', function () {
    var count = midItemBottomTabsList.querySelectorAll('.bottom-tab-row').length;
    midItemBottomTabsList.appendChild(createBottomTabRow(null, count));
    var lastRow = midItemBottomTabsList.lastElementChild;
    if (lastRow) populateBodySelectForBottomTabs(lastRow.querySelector('.bt-body'));
  });

  /* ===== 바텀 탭 관리 모달 ===== */
  var bottomTabsModal = document.getElementById('bottomTabsModal');
  var bottomTabsModalBackdrop = document.getElementById('bottomTabsModalBackdrop');
  var btnEditBottomTabs = document.getElementById('btnEditBottomTabs');
  var bottomTabsModalClose = document.getElementById('bottomTabsModalClose');
  var bottomTabsModalHint = document.getElementById('bottomTabsModalHint');
  var bottomTabsMidList = document.getElementById('bottomTabsMidList');
  var bottomTabsList = document.getElementById('bottomTabsList');
  var btnAddBottomTabInModal = document.getElementById('btnAddBottomTabInModal');
  var bottomTabFormPlaceholder = document.getElementById('bottomTabFormPlaceholder');
  var bottomTabForm = document.getElementById('bottomTabForm');
  var bottomTabFormTitle = document.getElementById('bottomTabFormTitle');
  var bottomTabTitleInput = document.getElementById('bottomTabTitleInput');
  var bottomTabOrderInput = document.getElementById('bottomTabOrderInput');
  var bottomTabBodyIdsList = document.getElementById('bottomTabBodyIdsList');
  var btnAddBodyToBottomTab = document.getElementById('btnAddBodyToBottomTab');
  var bottomTabFormCancel = document.getElementById('bottomTabFormCancel');
  var selectedMidIdForBottomTabs = null;
  var editingBottomTabId = null;

  function openBottomTabsModal(optionalMidId, optionalBottomTabId) {
    var topTabId = getCurrentTopTabId();
    if (!topTabId) {
      alert('먼저 상단에서 대분류 탭을 선택하세요.');
      return;
    }
    if (!bottomTabsModal) return;
    bottomTabsModal.hidden = false;
    if (bottomTabsModalHint) bottomTabsModalHint.textContent = '대분류(중단 탭 ID): 현재 ' + topTabId;
    selectedMidIdForBottomTabs = optionalMidId || null;
    editingBottomTabId = null;
    renderBottomTabsMidList();
    if (optionalMidId) {
      renderBottomTabsListForModal(optionalMidId);
      var data = getData();
      var topTabId = getCurrentTopTabId();
      var mid = data && data.midTabs && topTabId ? data.midTabs[topTabId] : null;
      var midItem = mid && mid.items ? mid.items.find(function (i) { return i.id === optionalMidId; }) : null;
      var bottomTabs = (midItem && midItem.bottomTabs) ? midItem.bottomTabs.slice().sort(function (a, b) { return (a.order != null ? a.order : 999) - (b.order != null ? b.order : 999); }) : [];
      var btToShow = optionalBottomTabId ? bottomTabs.find(function (b) { return b.id === optionalBottomTabId; }) : null;
      if (btToShow) {
        editingBottomTabId = btToShow.id;
        showBottomTabForm(optionalMidId, btToShow);
      } else if (bottomTabs.length > 0) {
        editingBottomTabId = bottomTabs[0].id;
        showBottomTabForm(optionalMidId, bottomTabs[0]);
      } else {
        bottomTabForm.hidden = true;
        if (bottomTabFormPlaceholder) bottomTabFormPlaceholder.hidden = false;
      }
    } else {
      bottomTabsList.innerHTML = '';
      bottomTabForm.hidden = true;
      if (bottomTabFormPlaceholder) bottomTabFormPlaceholder.hidden = false;
    }
  }

  function closeBottomTabsModal() {
    if (!bottomTabsModal) return;
    bottomTabsModal.hidden = true;
    bottomTabForm.hidden = true;
    if (bottomTabFormPlaceholder) bottomTabFormPlaceholder.hidden = false;
    selectedMidIdForBottomTabs = null;
    editingBottomTabId = null;
  }

  function renderBottomTabsMidList() {
    bottomTabsMidList.innerHTML = '';
    var topTabId = getCurrentTopTabId();
    var data = getData();
    if (!data || !data.midTabs || !topTabId) return;
    var mid = data.midTabs[topTabId];
    var items = (mid && mid.items) ? mid.items.slice().sort(function (a, b) { return (a.order != null ? a.order : 999) - (b.order != null ? b.order : 999); }) : [];
    items.forEach(function (item) {
      var li = document.createElement('li');
      li.dataset.midId = item.id;
      if (item.id === selectedMidIdForBottomTabs) li.classList.add('selected');
      var info = document.createElement('div');
      info.className = 'tab-info';
      info.innerHTML = '<span class="tab-id">' + escapeHtml(item.id) + '</span><span class="tab-label">' + escapeHtml(item.title || '') + '</span>';
      li.appendChild(info);
      li.addEventListener('click', function () {
        selectedMidIdForBottomTabs = item.id;
        editingBottomTabId = null;
        renderBottomTabsMidList();
        renderBottomTabsListForModal(item.id);
        bottomTabForm.hidden = true;
        if (bottomTabFormPlaceholder) bottomTabFormPlaceholder.hidden = false;
      });
      bottomTabsMidList.appendChild(li);
    });
  }

  function renderBottomTabsListForModal(midId) {
    bottomTabsList.innerHTML = '';
    var data = getData();
    if (!data || !data.midTabs) return;
    var topTabId = getCurrentTopTabId();
    var mid = topTabId ? data.midTabs[topTabId] : null;
    var item = mid && mid.items ? mid.items.find(function (i) { return i.id === midId; }) : null;
    var bottomTabs = (item && item.bottomTabs) ? item.bottomTabs.slice().sort(function (a, b) { return (a.order != null ? a.order : 999) - (b.order != null ? b.order : 999); }) : [];
    bottomTabs.forEach(function (bt) {
      var li = document.createElement('li');
      li.dataset.midId = midId;
      li.dataset.bottomTabId = bt.id;
      if (bt.id === editingBottomTabId) li.classList.add('selected');
      var info = document.createElement('div');
      info.className = 'tab-info';
      var bodyIds = bt.bodyIds && bt.bodyIds.length > 0 ? bt.bodyIds : (bt.bodyId ? [bt.bodyId] : []);
      info.innerHTML = '<span class="tab-id">' + escapeHtml(bt.id) + '</span><span class="tab-label">' + escapeHtml(bt.title || '') + '</span> (' + bodyIds.length + '개 본문)';
      li.appendChild(info);
      var btnDel = document.createElement('button');
      btnDel.type = 'button';
      btnDel.className = 'btn-delete-one';
      btnDel.textContent = '삭제';
      btnDel.addEventListener('click', function (e) {
        e.stopPropagation();
        if (!confirm("이 바텀 탭을 삭제할까요?")) return;
        var d = getData();
        if (!d || !d.midTabs || !topTabId) return;
        var m = d.midTabs[topTabId];
        var it = m && m.items ? m.items.find(function (i) { return i.id === midId; }) : null;
        if (!it) return;
        it.bottomTabs = (it.bottomTabs || []).filter(function (b) { return b.id !== bt.id; });
        setData(d);
        renderBottomTabsListForModal(midId);
        if (editingBottomTabId === bt.id) {
          editingBottomTabId = null;
          bottomTabForm.hidden = true;
          if (bottomTabFormPlaceholder) bottomTabFormPlaceholder.hidden = false;
        }
      });
      li.appendChild(btnDel);
      li.addEventListener('click', function (e) {
        if (e.target.classList.contains('btn-delete-one')) return;
        showBottomTabForm(midId, bt);
      });
      bottomTabsList.appendChild(li);
    });
  }

  /** 바텀탭 연결 본문 한 행 DOM (본문 표시 + 수정/삭제) */
  function createBottomTabBodyIdRow(bodyId, index) {
    var li = document.createElement('li');
    li.className = 'bottom-tab-row';
    li.dataset.index = String(index);
    li.dataset.bodyId = bodyId || '';
    var data = getData();
    var body = data && data.bodyContent ? data.bodyContent.find(function (b) { return b.id === bodyId; }) : null;
    var label = body ? ((body.title || '').trim() || bodyId) + ' (' + bodyId + ')' : bodyId;
    var span = document.createElement('span');
    span.className = 'bt-body-label';
    span.textContent = label;
    var btnEdit = document.createElement('button');
    btnEdit.type = 'button';
    btnEdit.className = 'btn-edit-one';
    btnEdit.textContent = '수정';
    btnEdit.title = '본문 관리에서 수정';
    btnEdit.addEventListener('click', function (e) {
      e.stopPropagation();
      if (bodyId) openBodyModalAndShowBody(bodyId);
    });
    var btnRemove = document.createElement('button');
    btnRemove.type = 'button';
    btnRemove.className = 'btn-remove-bt';
    btnRemove.textContent = '삭제';
    btnRemove.title = '이 바텀탭 연결 목록에서 제거';
    btnRemove.addEventListener('click', function (e) {
      e.stopPropagation();
      li.remove();
    });
    li.appendChild(span);
    li.appendChild(btnEdit);
    li.appendChild(btnRemove);
    return li;
  }

  function renderBottomTabBodyIdsList(bodyIds) {
    if (!bottomTabBodyIdsList) return;
    bottomTabBodyIdsList.innerHTML = '';
    var list = Array.isArray(bodyIds) ? bodyIds : [];
    list.forEach(function (bodyId, index) {
      bottomTabBodyIdsList.appendChild(createBottomTabBodyIdRow(bodyId, index));
    });
  }

  function collectBottomTabBodyIdsFromForm() {
    if (!bottomTabBodyIdsList) return [];
    var rows = bottomTabBodyIdsList.querySelectorAll('.bottom-tab-row');
    var arr = [];
    rows.forEach(function (row) {
      var bodyId = (row.dataset && row.dataset.bodyId) ? row.dataset.bodyId.trim() : '';
      if (bodyId) arr.push(bodyId);
    });
    return arr;
  }

  /** 본문 관리 모달을 열고 지정한 본문 수정 폼 표시 (바텀탭 연결 본문 수정용) */
  function openBodyModalAndShowBody(bodyId) {
    if (!bodyModal || !bodyId) return;
    var data = getData();
    var body = data && data.bodyContent ? data.bodyContent.find(function (b) { return b.id === bodyId; }) : null;
    if (!body) return;
    bodyModal.hidden = false;
    bodyContentForm.hidden = true;
    if (bodyContentFormPlaceholder) bodyContentFormPlaceholder.hidden = false;
    editingBodyId = bodyId;
    editingPageIndex = -1;
    populateFilterDropdowns();
    var ref = getTopMidBottomFromBodyId(bodyId);
    if (ref.topTabId && bodyContentFilterTopTab) {
      bodyContentFilterTopTab.value = ref.topTabId;
      updateFilterMidTabDropdown();
      if (bodyContentFilterMidTab) bodyContentFilterMidTab.value = ref.midTabId || '';
      updateFilterBottomTabDropdown();
      if (bodyContentFilterBottomTab) bodyContentFilterBottomTab.value = ref.bottomTabId || '';
    }
    renderBodyList();
    showBodyForm(body, null);
  }

  function showBottomTabForm(midId, bt) {
    editingBottomTabId = bt ? bt.id : null;
    bottomTabFormTitle.textContent = bt ? '바텀 탭 수정' : '바텀 탭 추가';
    bottomTabTitleInput.value = bt ? (bt.title || '') : '';
    bottomTabOrderInput.value = (bt && (bt.order != null)) ? bt.order : ((getData() && getData().midTabs) ? (function () {
      var m = getData().midTabs[getCurrentTopTabId()];
      var it = m && m.items ? m.items.find(function (i) { return i.id === midId; }) : null;
      var bts = (it && it.bottomTabs) ? it.bottomTabs : [];
      return bts.length + 1;
    }()) : 1);
    var bodyIds = (bt && bt.bodyIds && bt.bodyIds.length > 0) ? bt.bodyIds : (bt && bt.bodyId ? [bt.bodyId] : []);
    renderBottomTabBodyIdsList(bodyIds);
    bottomTabForm.hidden = false;
    if (bottomTabFormPlaceholder) bottomTabFormPlaceholder.hidden = true;
    renderBottomTabsListForModal(midId);
  }

  function hideBottomTabForm() {
    bottomTabForm.hidden = true;
    if (bottomTabFormPlaceholder) bottomTabFormPlaceholder.hidden = false;
    editingBottomTabId = null;
    if (selectedMidIdForBottomTabs) renderBottomTabsListForModal(selectedMidIdForBottomTabs);
  }

  function saveBottomTabFromModal(e) {
    e.preventDefault();
    var topTabId = getCurrentTopTabId();
    if (!topTabId || !selectedMidIdForBottomTabs) {
      alert('중단 탭을 먼저 선택하세요.');
      return;
    }
    var data = getData();
    if (!data || !data.midTabs || !data.midTabs[topTabId]) return;
    var items = data.midTabs[topTabId].items || [];
    var item = items.find(function (i) { return i.id === selectedMidIdForBottomTabs; });
    if (!item) return;
    item.bottomTabs = item.bottomTabs || [];
    var title = (bottomTabTitleInput.value || '').trim();
    var order = parseInt(bottomTabOrderInput.value, 10) || 1;
    var bodyIds = collectBottomTabBodyIdsFromForm();
    if (!title) {
      alert('바텀 탭 제목을 입력하세요.');
      return;
    }
    var midOrder = getMidOrderFromMidId(selectedMidIdForBottomTabs);
    if (editingBottomTabId) {
      var idx = item.bottomTabs.findIndex(function (b) { return b.id === editingBottomTabId; });
      if (idx >= 0) {
        item.bottomTabs[idx] = { id: editingBottomTabId, title: title, bodyIds: bodyIds, order: order };
      }
    } else {
      var nextBottomOrder = item.bottomTabs.length + 1;
      var newId = getBottomTabIdByRule(topTabId, midOrder, nextBottomOrder);
      if (bodyIds.length === 0) {
        var firstBodyId = getBodyIdByRuleForBottomTab(topTabId, midOrder, nextBottomOrder, 1);
        if (!data.bodyContent) data.bodyContent = [];
        if (!data.bodyContent.some(function (b) { return b.id === firstBodyId; })) {
          var defaultImage = topTabId ? 'assets/help/images/' + topTabId + '/No_Images.png' : 'assets/help/images/No_Images.png';
          data.bodyContent.push({ id: firstBodyId, title: title, image: defaultImage, description: '', pages: null });
        }
        bodyIds = [firstBodyId];
      }
      item.bottomTabs.push({ id: newId, title: title, bodyIds: bodyIds, order: order });
    }
    item.bottomTabs.sort(function (a, b) { return (a.order != null ? a.order : 999) - (b.order != null ? b.order : 999); });
    setData(data);
    hideBottomTabForm();
    renderBottomTabsListForModal(selectedMidIdForBottomTabs);
  }

  if (btnEditBottomTabs) btnEditBottomTabs.addEventListener('click', openBottomTabsModal);
  if (bottomTabsModalBackdrop) bottomTabsModalBackdrop.addEventListener('click', closeBottomTabsModal);
  if (bottomTabsModalClose) bottomTabsModalClose.addEventListener('click', closeBottomTabsModal);
  if (btnAddBodyToBottomTab) btnAddBodyToBottomTab.addEventListener('click', function () {
    if (!bottomTabBodyIdsList || !selectedMidIdForBottomTabs) return;
    var topTabId = getCurrentTopTabId();
    if (!topTabId) return;
    var data = getData();
    if (!data || !data.midTabs || !data.midTabs[topTabId]) return;
    var midOrder = getMidOrderFromMidId(selectedMidIdForBottomTabs);
    var bottomOrder = 1;
    if (editingBottomTabId) {
      var parts = editingBottomTabId.split('-');
      if (parts.length >= 3) bottomOrder = parseInt(parts[2], 10) || 1;
    }
    var currentBodyIds = collectBottomTabBodyIdsFromForm();
    var nextBodyOrder = currentBodyIds.length + 1;
    var newBodyId = getBodyIdByRuleForBottomTab(topTabId, midOrder, bottomOrder, nextBodyOrder);
    if (!data.bodyContent) data.bodyContent = [];
    if (data.bodyContent.some(function (b) { return b.id === newBodyId; })) return;
    var defaultImage = topTabId ? 'assets/help/images/' + topTabId + '/No_Images.png' : 'assets/help/images/No_Images.png';
    var newTitle = (bottomTabTitleInput && bottomTabTitleInput.value) ? bottomTabTitleInput.value.trim() : '바텀탭 1';
    data.bodyContent.push({ id: newBodyId, title: newTitle || '본문 ' + nextBodyOrder, image: defaultImage, description: '', pages: null });
    setData(data);
    currentBodyIds.push(newBodyId);
    renderBottomTabBodyIdsList(currentBodyIds);
  });
  if (btnAddBottomTabInModal) btnAddBottomTabInModal.addEventListener('click', function () {
    if (!selectedMidIdForBottomTabs) {
      alert('먼저 왼쪽에서 중단 탭을 선택하세요.');
      return;
    }
    showBottomTabForm(selectedMidIdForBottomTabs, null);
  });
  if (bottomTabForm) bottomTabForm.addEventListener('submit', saveBottomTabFromModal);
  if (bottomTabFormCancel) bottomTabFormCancel.addEventListener('click', hideBottomTabForm);

  /* ===== 본문 관리 (선택된 중단 탭의 본문만) ===== */
  function getCurrentBodyId() {
    // 바텀탭이 있을 때 선택된 항목은 .mid-subitem.active (bodyId 있음)
    var sub = document.querySelector('.mid-subitem.active');
    if (sub) return (sub.dataset.bodyId || '').trim() || null;
    // 바텀탭이 없을 때는 .mid-item.active
    var active = document.querySelector('.mid-item.active');
    return active ? (active.dataset.bodyId || '').trim() || null : null;
  }

  function getCurrentMidTabId() {
    var sub = document.querySelector('.mid-subitem.active');
    if (sub) return (sub.dataset.midId || '').trim() || null;
    var active = document.querySelector('.mid-item.active');
    return active ? (active.dataset.midId || '').trim() || null : null;
  }

  var bodyModal = document.getElementById('bodyContentModal');
  var bodyModalBackdrop = document.getElementById('bodyContentModalBackdrop');
  var btnEditBody = document.getElementById('btnEditBody');
  var bodyModalClose = document.getElementById('bodyContentModalClose');
  var bodyContentList = document.getElementById('bodyContentList');
  var bodyContentModalHint = document.getElementById('bodyContentModalHint');
  var bodyContentFilterTopTab = document.getElementById('bodyContentFilterTopTab');
  var bodyContentFilterMidTab = document.getElementById('bodyContentFilterMidTab');
  var bodyContentFilterBottomTab = document.getElementById('bodyContentFilterBottomTab');
  var bodyContentForm = document.getElementById('bodyContentForm');
  var bodyContentFormTitle = document.getElementById('bodyContentFormTitle');
  var bodyContentIdInputRow = document.getElementById('bodyContentIdInputRow');
  var bodyContentIdDisplay = document.getElementById('bodyContentIdDisplay');
  var bodyContentIdHint = document.getElementById('bodyContentIdHint');
  var bodyContentIdPreview = document.getElementById('bodyContentIdPreview');
  var bodyInputTopTab = document.getElementById('bodyContentTopTab');
  var bodyInputMidTab = document.getElementById('bodyContentMidTab');
  var bodyInputTitle = document.getElementById('bodyContentTitle');
  var bodyInputImage = document.getElementById('bodyContentImage');
  var bodyContentImageFile = document.getElementById('bodyContentImageFile');
  var bodyContentImageBrowse = document.getElementById('bodyContentImageBrowse');
  var bodyContentImagesContainer = document.getElementById('bodyContentImagesContainer');
  var bodyContentAddImage = document.getElementById('bodyContentAddImage');
  var bodyInputDescription = document.getElementById('bodyContentDescription');
  var bodyInputOrder = document.getElementById('bodyContentOrder');
  var bodyFormCancel = document.getElementById('bodyContentFormCancel');
  var bodyFormMainFields = document.getElementById('bodyContentFormMainFields');
  var bodyContentFormPlaceholder = document.getElementById('bodyContentFormPlaceholder');
  var editingBodyId = null;
  var editingPageIndex = -1;

  function populateFilterDropdowns() {
    var data = getData();
    if (!data) return;

    // 최상단 탭 필터 드롭다운 채우기
    if (bodyContentFilterTopTab) {
      bodyContentFilterTopTab.innerHTML = '<option value="">전체</option>';
      if (data.topTabs) {
        var sorted = data.topTabs.slice().sort(function (a, b) { return (a.order || 0) - (b.order || 0); });
        sorted.forEach(function (tab) {
          var option = document.createElement('option');
          option.value = tab.id;
          option.textContent = (tab.label || tab.id) + ' (' + tab.id + ')';
          bodyContentFilterTopTab.appendChild(option);
        });
      }
    }

    // 중단 탭 필터 드롭다운 채우기
    updateFilterMidTabDropdown();
    updateFilterBottomTabDropdown();
  }

  /** 본문 ID로 소속 최상단탭·중단탭·바텀탭 ID 반환 (필터 설정용) */
  function getTopMidBottomFromBodyId(bodyId) {
    if (!bodyId) return { topTabId: '', midTabId: '', bottomTabId: null };
    var parts = bodyId.split('-');
    if (parts.length < 3) return { topTabId: '', midTabId: '', bottomTabId: null };
    var topTabId = parts[0];
    var midOrder = parseInt(parts[1], 10);
    if (isNaN(midOrder)) return { topTabId: '', midTabId: '', bottomTabId: null };
    var midTabId = topTabId + '-' + midOrder;
    if (parts.length >= 4) {
      var bottomOrder = parseInt(parts[2], 10);
      if (!isNaN(bottomOrder)) return { topTabId: topTabId, midTabId: midTabId, bottomTabId: getBottomTabIdByRule(topTabId, midOrder, bottomOrder) };
    }
    return { topTabId: topTabId, midTabId: midTabId, bottomTabId: null };
  }

  function updateFilterBottomTabDropdown() {
    if (!bodyContentFilterBottomTab) return;
    var data = getData();
    if (!data) return;
    var topTabId = bodyContentFilterTopTab ? bodyContentFilterTopTab.value : '';
    var midTabId = bodyContentFilterMidTab ? bodyContentFilterMidTab.value : '';
    bodyContentFilterBottomTab.innerHTML = '<option value="">전체</option>';
    if (!topTabId || !midTabId) return;
    var mid = data.midTabs && data.midTabs[topTabId] ? data.midTabs[topTabId] : null;
    var midItem = mid && mid.items ? mid.items.find(function (i) { return i.id === midTabId; }) : null;
    if (!midItem || !midItem.bottomTabs || midItem.bottomTabs.length === 0) return;
    var bottomTabs = midItem.bottomTabs.slice().sort(function (a, b) { return (a.order != null ? a.order : 999) - (b.order != null ? b.order : 999); });
    bottomTabs.forEach(function (bt) {
      var option = document.createElement('option');
      option.value = bt.id;
      option.textContent = (bt.title || bt.id) + ' (' + bt.id + ')';
      bodyContentFilterBottomTab.appendChild(option);
    });
  }

  function updateFilterMidTabDropdown() {
    if (!bodyContentFilterMidTab) return;
    var data = getData();
    if (!data) return;

    var topTabId = bodyContentFilterTopTab ? bodyContentFilterTopTab.value : '';
    bodyContentFilterMidTab.innerHTML = '<option value="">전체</option>';

    if (!topTabId) {
      // 최상단 탭이 선택되지 않았으면 모든 중단 탭 표시
      if (data.midTabs) {
        var allMidItems = [];
        Object.keys(data.midTabs).forEach(function (topId) {
          var mid = data.midTabs[topId];
          if (mid && mid.items) {
            mid.items.forEach(function (item) {
              allMidItems.push({ item: item, topTabId: topId });
            });
          }
        });
        // 최상단 탭 order 맵 생성
        var topTabOrderMap = {};
        if (data.topTabs) {
          data.topTabs.forEach(function (tab) {
            topTabOrderMap[tab.id] = tab.order != null ? tab.order : 999;
          });
        }
        
        allMidItems.sort(function (a, b) {
          // 최상단 탭 order로 먼저 정렬
          var aTopOrder = topTabOrderMap[a.topTabId] != null ? topTabOrderMap[a.topTabId] : 999;
          var bTopOrder = topTabOrderMap[b.topTabId] != null ? topTabOrderMap[b.topTabId] : 999;
          if (aTopOrder !== bTopOrder) return aTopOrder - bTopOrder;
          
          // 같은 최상단 탭이면 중단 탭 order로 정렬
          var aMidOrder = a.item.order != null ? a.item.order : 999;
          var bMidOrder = b.item.order != null ? b.item.order : 999;
          if (aMidOrder !== bMidOrder) return aMidOrder - bMidOrder;
          
          // order도 같으면 제목으로 정렬
          var aTitle = (a.item.title || a.item.id || '').trim();
          var bTitle = (b.item.title || b.item.id || '').trim();
          return aTitle.localeCompare(bTitle, 'ko', { numeric: true, sensitivity: 'base' });
        });
        allMidItems.forEach(function (entry) {
          var option = document.createElement('option');
          option.value = entry.item.id;
          option.textContent = (entry.item.title || entry.item.id) + ' (' + entry.topTabId + '-' + (entry.item.order != null ? entry.item.order : '-') + ')';
          bodyContentFilterMidTab.appendChild(option);
        });
      }
    } else {
      // 선택된 최상단 탭의 중단 탭만 표시
      var mid = data.midTabs && data.midTabs[topTabId] ? data.midTabs[topTabId] : null;
      if (mid && mid.items) {
        var items = mid.items.slice().sort(function (a, b) {
          var aOrder = a.order != null ? a.order : 999;
          var bOrder = b.order != null ? b.order : 999;
          if (aOrder !== bOrder) return aOrder - bOrder;
          // order가 같으면 제목으로 정렬
          var aTitle = (a.title || a.id || '').trim();
          var bTitle = (b.title || b.id || '').trim();
          return aTitle.localeCompare(bTitle, 'ko', { numeric: true, sensitivity: 'base' });
        });
        items.forEach(function (item) {
          var option = document.createElement('option');
          option.value = item.id;
          option.textContent = (item.title || item.id) + ' (순서: ' + (item.order != null ? item.order : '-') + ')';
          bodyContentFilterMidTab.appendChild(option);
        });
      }
    }
  }

  function openBodyModal() {
    if (!bodyModal) return;
    bodyModal.hidden = false;
    bodyContentForm.hidden = true;
    if (bodyContentFormPlaceholder) bodyContentFormPlaceholder.hidden = false;
    
    // 현재 열린 본문 정보 가져오기
    var currentBodyId = null;
    var currentBodyPageIndex = -1;
    if (window.HelpApp && typeof window.HelpApp.getCurrentBodyId === 'function') {
      currentBodyId = window.HelpApp.getCurrentBodyId();
    }
    if (window.HelpApp && typeof window.HelpApp.getCurrentBodyPageIndex === 'function') {
      currentBodyPageIndex = window.HelpApp.getCurrentBodyPageIndex();
    }
    
    // 현재 열린 본문이 있으면 editingBodyId 설정 (본문 관리에서는 항상 '본문 수정' 모드로 열기)
    if (currentBodyId) {
      var data = getData();
      if (data && data.bodyContent) {
        var foundBody = data.bodyContent.find(function (b) { return b.id === currentBodyId; });
        if (foundBody) {
          editingBodyId = foundBody.id;
        } else {
          var searchId = currentBodyId;
          if (searchId.indexOf('body-') === 0) {
            searchId = searchId.substring(5);
            if (searchId.indexOf('-') >= 0) {
              var prefix = searchId + '-';
              foundBody = data.bodyContent.find(function (b) { return b.id && b.id.indexOf(prefix) === 0; });
            } else {
              foundBody = data.bodyContent.find(function (b) { return b.id === searchId; });
            }
          }
          if (foundBody) editingBodyId = foundBody.id;
          else editingBodyId = currentBodyId;
        }
      } else {
        editingBodyId = currentBodyId;
      }
      editingPageIndex = -1;
    } else {
      editingBodyId = null;
      editingPageIndex = -1;
    }
    
    // editingBodyId와 editingPageIndex를 임시 저장 (필터 변경 시 유지하기 위해)
    var savedEditingBodyId = editingBodyId;
    var savedEditingPageIndex = editingPageIndex;
    
    populateFilterDropdowns();
    
    // 현재 본문(editingBodyId)이 소속된 최상단탭·중단탭·바텀탭으로 필터 자동 적용
    var filterFromBody = savedEditingBodyId ? getTopMidBottomFromBodyId(savedEditingBodyId) : null;
    if (filterFromBody && filterFromBody.topTabId && bodyContentFilterTopTab) {
      bodyContentFilterTopTab.value = filterFromBody.topTabId;
      updateFilterMidTabDropdown();
      if (bodyContentFilterMidTab) bodyContentFilterMidTab.value = filterFromBody.midTabId || '';
      updateFilterBottomTabDropdown();
      if (bodyContentFilterBottomTab) bodyContentFilterBottomTab.value = filterFromBody.bottomTabId || '';
    } else {
      var currentTopTabId = getCurrentTopTabId();
      var currentMidTabId = getCurrentMidTabId();
      if (currentTopTabId && bodyContentFilterTopTab) {
        bodyContentFilterTopTab.value = currentTopTabId;
        updateFilterMidTabDropdown();
        if (currentMidTabId && bodyContentFilterMidTab) bodyContentFilterMidTab.value = currentMidTabId;
        updateFilterBottomTabDropdown();
      }
    }
    
    // 필터 변경 후에도 editingBodyId와 editingPageIndex 유지
    editingBodyId = savedEditingBodyId;
    editingPageIndex = savedEditingPageIndex;
    
    renderBodyList();
    
    // 본문이 선택되어 있으면 항상 '본문 수정' 폼으로 표시 (최신 데이터로 갱신)
    if (editingBodyId) {
      var data = getData();
      if (data && data.bodyContent) {
        var body = data.bodyContent.find(function (b) { return b.id === editingBodyId; });
        if (body) {
          showBodyForm(body, null);
        }
      }
    }
  }

  function closeBodyModal() {
    if (!bodyModal) return;
    bodyModal.hidden = true;
    bodyContentForm.hidden = true;
    if (bodyContentFormPlaceholder) bodyContentFormPlaceholder.hidden = false;
    editingBodyId = null;
    editingPageIndex = -1;
  }

  function renderBodyList() {
    var currentBodyId = getCurrentBodyId();
    if (bodyContentModalHint) bodyContentModalHint.textContent = '';
    bodyContentList.innerHTML = '';

    // 디버깅: editingBodyId와 editingPageIndex 확인
    // console.log('renderBodyList - editingBodyId:', editingBodyId, 'editingPageIndex:', editingPageIndex, 'type of editingPageIndex:', typeof editingPageIndex);

    var data = getData();
    if (!data) return;
    var bodies = (data.bodyContent || []).slice();

    // 필터 적용
    var filterTopTabId = bodyContentFilterTopTab ? bodyContentFilterTopTab.value : '';
    var filterMidTabId = bodyContentFilterMidTab ? bodyContentFilterMidTab.value : '';
    var filterBottomTabId = bodyContentFilterBottomTab ? bodyContentFilterBottomTab.value : '';

    if (filterBottomTabId) {
      var bodyIdsInBottomTab = [];
      if (data.midTabs) {
        outer: for (var topId in data.midTabs) {
          var mid = data.midTabs[topId];
          if (!mid || !mid.items) continue;
          for (var i = 0; i < mid.items.length; i++) {
            var item = mid.items[i];
            if (!item.bottomTabs) continue;
            var bt = item.bottomTabs.find(function (b) { return b.id === filterBottomTabId; });
            if (bt) {
              bodyIdsInBottomTab = (bt.bodyIds && bt.bodyIds.length > 0) ? bt.bodyIds : (bt.bodyId ? [bt.bodyId] : []);
              break outer;
            }
          }
        }
      }
      bodies = bodies.filter(function (body) { return body.id && bodyIdsInBottomTab.indexOf(body.id) >= 0; });
    } else if (filterTopTabId || filterMidTabId) {
      bodies = bodies.filter(function (body) {
        if (!body.id) return false;
        var parts = body.id.split('-');
        if (parts.length < 3) return false;

        var bodyTopTabId = parts[0];
        var bodyMidOrder = parseInt(parts[1], 10);

        // 최상단 탭 필터
        if (filterTopTabId && bodyTopTabId !== filterTopTabId) return false;

        // 중단 탭 필터
        if (filterMidTabId) {
          var mid = data.midTabs && data.midTabs[bodyTopTabId] ? data.midTabs[bodyTopTabId] : null;
          if (!mid || !mid.items) return false;
          var midItem = mid.items.find(function (item) { return item.id === filterMidTabId; });
          if (!midItem || midItem.order !== bodyMidOrder) return false;
        }

        return true;
      });
    }

    // 정렬
    bodies.sort(function (a, b) {
      var ai = (a.id || '').toLowerCase();
      var bi = (b.id || '').toLowerCase();
      return ai < bi ? -1 : ai > bi ? 1 : 0;
    });

    if (bodies.length === 0) {
      if (bodyContentModalHint) {
        if (filterTopTabId || filterMidTabId || filterBottomTabId) {
          bodyContentModalHint.textContent = '필터 조건에 맞는 본문이 없습니다.';
        } else {
          bodyContentModalHint.textContent = '등록된 본문이 없습니다. 아래 「+ 본문 추가」로 추가하세요.';
        }
      }
      return;
    }

    // 본문당 목록 1개만 표시 (이미지가 여러 개여도 페이지 수는 늘어나지 않음)
    bodies.forEach(function (body) {
      var isLinked = body.id === currentBodyId;
      var isBodySelected = body.id === editingBodyId;
      var desc = (body.description || '').substring(0, 60);
      if ((body.description || '').length > 60) desc += '…';
      var li = document.createElement('li');
      li.dataset.bodyId = body.id;
      li.dataset.pageIndex = '-1';
      if (isBodySelected) li.classList.add('selected');
      if (isLinked) li.classList.add('linked');
      var info = document.createElement('div');
      info.className = 'tab-info';
      info.innerHTML = '<span class="tab-id">' + escapeHtml(body.id) + '</span><span class="tab-label">' + escapeHtml(body.title || '') + '</span><br><span class="tab-order">' + escapeHtml(desc) + '</span>';
      li.appendChild(info);
      var btnDel = document.createElement('button');
      btnDel.type = 'button';
      btnDel.className = 'btn-delete-one';
      btnDel.textContent = '삭제';
      btnDel.dataset.bodyId = body.id;
      btnDel.dataset.pageIndex = '-1';
      li.appendChild(btnDel);
      bodyContentList.appendChild(li);
    });
  }

  function updateBodyIdPreview() {
    if (!bodyContentIdPreview || !bodyInputTopTab || !bodyInputMidTab || !bodyInputOrder) return;
    var topTabId = bodyInputTopTab.value;
    var midTabId = bodyInputMidTab.value;
    var bodyOrder = bodyInputOrder.value ? parseInt(bodyInputOrder.value, 10) : 1;
    if (topTabId && midTabId && bodyOrder >= 1) {
      var data = getData();
      if (data && data.midTabs && data.midTabs[topTabId]) {
        var mid = data.midTabs[topTabId];
        var items = mid.items || [];
        var selectedItem = items.find(function (item) { return item.id === midTabId; });
        if (selectedItem && selectedItem.order != null) {
          var midOrder = selectedItem.order;
          var id = getBodyIdByRule(topTabId, midOrder, bodyOrder);
          bodyContentIdPreview.textContent = id;
          return;
        }
      }
    }
    bodyContentIdPreview.textContent = '';
  }

  function populateMidTabSelect(topTabId) {
    if (!bodyInputMidTab) return;
    bodyInputMidTab.innerHTML = '<option value="">선택하세요</option>';
    if (!topTabId) {
      bodyInputMidTab.innerHTML = '<option value="">최상단 탭을 먼저 선택하세요</option>';
      return;
    }
    var data = getData();
    if (!data || !data.midTabs || !data.midTabs[topTabId]) {
      bodyInputMidTab.innerHTML = '<option value="">중단 탭이 없습니다</option>';
      return;
    }
    var mid = data.midTabs[topTabId];
    var items = (mid.items || []).slice().sort(function (a, b) {
      var aOrder = a.order != null ? a.order : 999;
      var bOrder = b.order != null ? b.order : 999;
      if (aOrder !== bOrder) return aOrder - bOrder;
      // order가 같으면 제목으로 정렬
      var aTitle = (a.title || a.id || '').trim();
      var bTitle = (b.title || b.id || '').trim();
      return aTitle.localeCompare(bTitle, 'ko', { numeric: true, sensitivity: 'base' });
    });
    items.forEach(function (item) {
      var option = document.createElement('option');
      option.value = item.id;
      option.textContent = (item.title || item.id) + ' (순서: ' + (item.order != null ? item.order : '-') + ')';
      bodyInputMidTab.appendChild(option);
    });
    if (items.length === 0) {
      bodyInputMidTab.innerHTML = '<option value="">중단 탭이 없습니다</option>';
    }
  }

  function populateTopTabSelect() {
    if (!bodyInputTopTab) return;
    var data = getData();
    if (!data || !data.topTabs) return;
    bodyInputTopTab.innerHTML = '<option value="">선택하세요</option>';
    var sorted = data.topTabs.slice().sort(function (a, b) { return (a.order || 0) - (b.order || 0); });
    sorted.forEach(function (tab) {
      var option = document.createElement('option');
      option.value = tab.id;
      option.textContent = (tab.label || tab.id) + ' (' + tab.id + ')';
      bodyInputTopTab.appendChild(option);
    });
  }

  function showBodyForm(body, pageIndex) {
    editingBodyId = body ? body.id : null;
    editingPageIndex = pageIndex == null ? -1 : parseInt(pageIndex, 10);
    var isPageEdit = editingPageIndex >= 0;
    var isAdd = !body;
    if (bodyFormMainFields) bodyFormMainFields.style.display = (isPageEdit || isAdd) ? (isAdd ? 'block' : 'none') : 'block';
    bodyInputTitle.required = !isPageEdit;
    if (isAdd) {
      bodyContentFormTitle.textContent = '본문 추가';
      if (bodyContentIdDisplay) { bodyContentIdDisplay.style.display = 'none'; bodyContentIdDisplay.textContent = ''; }
      if (bodyContentIdHint) bodyContentIdHint.style.display = 'block';
      if (bodyInputTopTab) {
        bodyInputTopTab.style.display = 'block';
        populateTopTabSelect();
        var currentTopTabId = getCurrentTopTabId() || (bodyContentFilterTopTab ? bodyContentFilterTopTab.value : '') || '';
        bodyInputTopTab.value = currentTopTabId;
        if (bodyInputMidTab) {
          bodyInputMidTab.style.display = 'block';
          populateMidTabSelect(currentTopTabId);
          var currentMidTabId = getCurrentMidTabId() || '';
          if (currentMidTabId) bodyInputMidTab.value = currentMidTabId;
        }
      }
      bodyInputTitle.value = '';
      bodyInputDescription.value = '';
      if (bodyInputOrder) {
        var topTabId = bodyInputTopTab ? bodyInputTopTab.value : '';
        var midTabId = bodyInputMidTab ? bodyInputMidTab.value : '';
        bodyInputOrder.value = String(getNextBodyOrderForMidTab(topTabId, midTabId));
      }
      renderBodyImages([getBodyImageBasePath() + 'No_Images.png']);
      updateBodyIdPreview();
    } else {
      bodyContentFormTitle.textContent = isPageEdit ? (editingPageIndex + 1) + '페이지 수정' : '본문 수정';
      if (bodyContentIdDisplay) {
        bodyContentIdDisplay.style.display = 'block';
        var parts = (body.id || '').split('-');
        var idRuleDesc = parts.length >= 4
          ? '최상단탭ID-중단순서-바텀순서-본문순서'
          : '최상단탭ID-중단순서-본문순서';
        bodyContentIdDisplay.textContent = 'ID: ' + (body.id || '') + ' (' + idRuleDesc + ', 페이지 순서 변경 시 자동 갱신)';
      }
      if (bodyContentIdHint) bodyContentIdHint.style.display = 'none';
      if (bodyInputTopTab) {
        bodyInputTopTab.style.display = 'none';
        var topTabIdFromBody = (body.id || '').split('-')[0];
        if (topTabIdFromBody) bodyInputTopTab.value = topTabIdFromBody;
      }
      if (bodyInputMidTab) bodyInputMidTab.style.display = 'none';
      bodyInputTitle.value = body.title || '';
      if (isPageEdit && body.pages && body.pages[editingPageIndex]) {
        var page = body.pages[editingPageIndex];
        bodyInputDescription.value = page.description || '';
        // 페이지 수정 시에는 이미지 추가 불가
        renderBodyImages([]);
      } else {
        // 본문 수정 시: pages 배열에서 이미지 추출 (최대 3개)
        var images = [];
        if (body.pages && Array.isArray(body.pages)) {
          images = body.pages.map(function(p) { return p.image || (getBodyImageBasePath() + 'No_Images.png'); }).slice(0, 3);
        } else if (body.image) {
          images = [body.image];
        }
        if (images.length === 0) {
          images = [getBodyImageBasePath() + 'No_Images.png'];
        }
        renderBodyImages(images);
        bodyInputDescription.value = body.description || '';
        if (bodyInputOrder) bodyInputOrder.value = body.order != null ? body.order : '1';
      }
    }
    bodyContentForm.hidden = false;
    if (bodyContentFormPlaceholder) bodyContentFormPlaceholder.hidden = true;
  }

  function hideBodyForm() {
    bodyContentForm.hidden = true;
    if (bodyContentFormPlaceholder) bodyContentFormPlaceholder.hidden = false;
    editingBodyId = null;
    editingPageIndex = -1;
    if (bodyContentImagesContainer) bodyContentImagesContainer.innerHTML = '';
  }

  function renderBodyImages(images) {
    if (!bodyContentImagesContainer) return;
    bodyContentImagesContainer.innerHTML = '';
    
    var maxImages = 3;
    var currentImages = images || [];
    
    // 이미지가 없으면 기본 이미지 1개 표시 (assets/help/images/{최상단탭ID}/No_Images.png)
    if (currentImages.length === 0) {
      currentImages = [getBodyImageBasePath() + 'No_Images.png'];
    }
    
    // 기존 이미지 표시
    currentImages.forEach(function(imagePath, index) {
      var imageItem = createImageItem(imagePath, index);
      bodyContentImagesContainer.appendChild(imageItem);
    });
    
    // 이미지 추가 버튼 업데이트
    if (bodyContentAddImage) {
      bodyContentAddImage.disabled = currentImages.length >= maxImages;
      bodyContentAddImage.textContent = currentImages.length >= maxImages 
        ? '이미지 추가 (최대 3개)' 
        : '+ 이미지 추가 (' + currentImages.length + '/' + maxImages + ')';
    }
  }

  /** 현재 HTML(index.html / Help_Editor.HTML) 파일이 있는 디렉터리 경로 (끝에 / 포함). 상대 경로 계산용 */
  function getHtmlBaseDirectory() {
    var baseUrl = document.baseURI || window.location.href || '';
    baseUrl = baseUrl.replace(/\\/g, '/');
    var pathPart = baseUrl.replace(/^file:\/\/\/?/i, '').replace(/^\/+/, '');
    var lastSlash = pathPart.lastIndexOf('/');
    if (lastSlash >= 0) pathPart = pathPart.substring(0, lastSlash + 1);
    else pathPart = pathPart + '/';
    return pathPart;
  }

  /** 파일 선택 시 input.value에 전체 경로가 있으면 HTML 기준 상대 경로로 변환. 없으면 null */
  function filePathToRelativeFromHtmlBase(fileInputValue) {
    if (!fileInputValue || typeof fileInputValue !== 'string') return null;
    var raw = fileInputValue.trim().replace(/\\/g, '/');
    if (!raw) return null;
    var baseDir = getHtmlBaseDirectory();
    if (raw.indexOf(baseDir) === 0) return raw.substring(baseDir.length).replace(/^\/+/, '');
    var baseDirNoTrailing = baseDir.replace(/\/$/, '');
    if (raw.indexOf(baseDirNoTrailing) === 0) return raw.substring(baseDirNoTrailing.length).replace(/^\/+/, '');
    return null;
  }

  /** 본문 이미지 기본 경로: assets/help/images/{최상단탭ID}/ (본문 수정 폼·필터·편집 중 본문 ID 기준) */
  function getBodyImageBasePath() {
    var topTabId = (bodyInputTopTab && bodyInputTopTab.value) ? (bodyInputTopTab.value || '').trim() : '';
    if (!topTabId && bodyContentFilterTopTab) topTabId = (bodyContentFilterTopTab.value || '').trim();
    if (!topTabId && editingBodyId) topTabId = (String(editingBodyId).split('-')[0] || '').trim();
    if (!topTabId) return 'assets/help/images/';
    return 'assets/help/images/' + topTabId + '/';
  }

  function createImageItem(imagePath, index) {
    var item = document.createElement('div');
    item.className = 'editor-image-item';
    item.style.cssText = 'display: flex; gap: 8px; align-items: center; margin-bottom: 8px;';
    
    var basePath = getBodyImageBasePath();
    var defaultPath = basePath + 'No_Images.png';
    var input = document.createElement('input');
    input.type = 'text';
    input.className = 'editor-input';
    input.value = imagePath || defaultPath;
    input.placeholder = defaultPath;
    input.style.cssText = 'flex: 1;';
    input.dataset.imageIndex = String(index);
    
    var fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/png,image/jpeg,image/jpg,image/gif,image/webp';
    fileInput.style.display = 'none';
    fileInput.dataset.imageIndex = String(index);
    
    var browseBtn = document.createElement('button');
    browseBtn.type = 'button';
    browseBtn.className = 'editor-btn-browse';
    browseBtn.textContent = '📁';
    browseBtn.title = '이미지 파일 선택';
    browseBtn.dataset.imageIndex = String(index);
    
    var deleteBtn = document.createElement('button');
    deleteBtn.type = 'button';
    deleteBtn.className = 'editor-btn-delete';
    deleteBtn.textContent = '삭제';
    deleteBtn.title = '이미지 삭제';
    deleteBtn.dataset.imageIndex = String(index);
    deleteBtn.style.cssText = 'padding: 8px 12px; background: rgba(255, 0, 0, 0.2); color: var(--help-text); border: 1px solid rgba(255, 0, 0, 0.4); border-radius: var(--help-radius-sm); cursor: pointer;';
    
    browseBtn.addEventListener('click', function() {
      fileInput.click();
    });
    
    fileInput.addEventListener('change', function(e) {
      var file = e.target.files && e.target.files[0];
      if (file) {
        var fileName = file.name;
        var currentVal = (input.value || '').trim().replace(/\\/g, '/');
        var baseDir = getBodyImageBasePath();
        if (currentVal && currentVal.indexOf('/') !== -1) {
          var lastSlash = currentVal.lastIndexOf('/');
          baseDir = currentVal.substring(0, lastSlash + 1);
        }
        input.value = baseDir + fileName;
        input.focus();
        input.select();
        updateAddImageButton();
      }
    });
    
    // 이미지 삭제는 bodyContentImagesContainer 캡처 위임으로만 처리 (2개일 때도 확실히 동작)
    item.appendChild(input);
    item.appendChild(browseBtn);
    item.appendChild(deleteBtn);
    
    return item;
  }

  function updateAddImageButton() {
    if (!bodyContentImagesContainer || !bodyContentAddImage) return;
    var currentImages = bodyContentImagesContainer.querySelectorAll('.editor-image-item');
    var maxImages = 3;
    bodyContentAddImage.disabled = currentImages.length >= maxImages;
    bodyContentAddImage.textContent = currentImages.length >= maxImages 
      ? '이미지 추가 (최대 3개)' 
      : '+ 이미지 추가 (' + currentImages.length + '/' + maxImages + ')';
  }

  function saveBodyContent() {
    var data = getData();
    if (!data) return;
    data.bodyContent = data.bodyContent || [];

    var title = (bodyInputTitle.value || '').trim();
    var description = (bodyInputDescription.value || '').trim();
    var order = bodyInputOrder ? (parseInt(bodyInputOrder.value, 10) || 1) : 1;
    
    // 이미지 경로 수집 (최대 3개) - .editor-image-item 내부 input만 사용
    var images = [];
    if (bodyContentImagesContainer) {
      var imageItems = bodyContentImagesContainer.querySelectorAll('.editor-image-item');
      imageItems.forEach(function(item) {
        var input = item.querySelector('input[type="text"]');
        if (input) {
          var imgPath = (input.value || '').trim();
          if (imgPath) images.push(imgPath);
        }
      });
    }
    // 이미지가 없으면 기본 이미지 사용
    if (images.length === 0) {
      images = [getBodyImageBasePath() + 'No_Images.png'];
    }
    var image = images[0] || (getBodyImageBasePath() + 'No_Images.png');

    if (editingBodyId == null) {
      if (!title) {
        alert('제목을 입력하세요.');
        return;
      }
      var topTabId = bodyInputTopTab ? bodyInputTopTab.value : '';
      var midTabId = bodyInputMidTab ? bodyInputMidTab.value : '';
      if (!topTabId) {
        alert('최상단 탭을 선택하세요.');
        return;
      }
      if (!midTabId) {
        alert('중단 탭을 선택하세요.');
        return;
      }
      var mid = data.midTabs && data.midTabs[topTabId] ? data.midTabs[topTabId] : null;
      var items = mid && mid.items ? mid.items : [];
      var selectedItem = items.find(function (item) { return item.id === midTabId; });
      if (!selectedItem || selectedItem.order == null) {
        alert('선택한 중단 탭의 순서를 찾을 수 없습니다.');
        return;
      }
      var midOrder = selectedItem.order;
      var id = getBodyIdByRule(topTabId, midOrder, order);
      if (data.bodyContent.some(function (b) { return b.id === id; })) {
        alert('이미 같은 ID의 본문이 있습니다. (ID: ' + id + ')');
        return;
      }
      // 이미지가 여러 개면 pages 배열로 저장
      var pages = null;
      if (images.length > 1) {
        pages = images.map(function(img) {
          return { image: img, description: '' };
        });
      }
      data.bodyContent.push({ id: id, title: title, image: image, description: description, order: order, pages: pages });
      hideBodyForm();
      setData(data);
      renderBodyList();
      return;
    }

    var bodyIdx = data.bodyContent.findIndex(function (b) { return b.id === editingBodyId; });
    if (bodyIdx < 0) return;

    // 저장 전에 현재 편집 중인 본문 정보 저장
    var savedBodyId = editingBodyId;
    var savedPageIndex = editingPageIndex;
    
    if (editingPageIndex >= 0) {
      var body = data.bodyContent[bodyIdx];
      if (!body.pages || !body.pages[editingPageIndex]) return;
      body.pages[editingPageIndex] = { image: image, description: description };
    } else {
      if (!title) {
        alert('제목을 입력하세요.');
        return;
      }
      var existing = data.bodyContent[bodyIdx];
      // 페이지 순서 변경 시 ID도 규칙에 맞게 갱신 (3부: 중단탭 본문, 4부: 바텀탭 소속 본문)
      var newId = existing.id;
      var bodyIdParts = (existing.id || '').split('-');
      if (bodyIdParts.length >= 4) {
        var topTabIdFromBody = bodyIdParts[0];
        var midOrderFromBody = parseInt(bodyIdParts[1], 10);
        var bottomOrderFromBody = parseInt(bodyIdParts[2], 10);
        if (!isNaN(midOrderFromBody) && !isNaN(bottomOrderFromBody)) {
          newId = getBodyIdByRuleForBottomTab(topTabIdFromBody, midOrderFromBody, bottomOrderFromBody, order);
          if (newId !== existing.id) {
            if (data.bodyContent.some(function (b) { return b.id === newId && b !== existing; })) {
              alert('이미 같은 순서의 본문 ID가 있습니다. (ID: ' + newId + ')');
              return;
            }
            Object.keys(data.midTabs || {}).forEach(function (topId) {
              var items = (data.midTabs[topId] && data.midTabs[topId].items) || [];
              items.forEach(function (item) {
                if (item.bodyId === editingBodyId) item.bodyId = newId;
                if (item.bottomTabs) item.bottomTabs.forEach(function (bt) {
                  if (bt.bodyId === editingBodyId) bt.bodyId = newId;
                  if (bt.bodyIds && bt.bodyIds.indexOf(editingBodyId) >= 0) {
                    bt.bodyIds = bt.bodyIds.map(function (id) { return id === editingBodyId ? newId : id; });
                  }
                });
              });
            });
            savedBodyId = newId;
            editingBodyId = newId;
          }
        }
      } else if (bodyIdParts.length >= 3) {
        var topTabIdFromBody = bodyIdParts[0];
        var midOrderFromBody = parseInt(bodyIdParts[1], 10);
        if (!isNaN(midOrderFromBody)) {
          newId = getBodyIdByRule(topTabIdFromBody, midOrderFromBody, order);
          if (newId !== existing.id) {
            if (data.bodyContent.some(function (b) { return b.id === newId && b !== existing; })) {
              alert('이미 같은 순서의 본문 ID가 있습니다. (ID: ' + newId + ')');
              return;
            }
            Object.keys(data.midTabs || {}).forEach(function (topId) {
              var items = (data.midTabs[topId] && data.midTabs[topId].items) || [];
              items.forEach(function (item) {
                if (item.bodyId === editingBodyId) item.bodyId = newId;
              });
            });
            savedBodyId = newId;
            editingBodyId = newId;
          }
        }
      }
      // 이미지는 항상 현재 폼(DOM)에서 수집한 개수로 저장 (삭제 반영)
      var pages = null;
      if (images.length > 1) {
        pages = images.map(function(img) {
          return { image: img, description: '' };
        });
      }
      data.bodyContent[bodyIdx] = { id: newId, title: title, image: image, description: description, order: order, pages: pages };
    }
    setData(data);
    
    // 저장된 본문 ID로부터 중단 탭 ID 찾기
    var currentMidTabId = null;
    var currentBodyId = savedBodyId;
    
    if (savedBodyId) {
      var savedBody = data.bodyContent.find(function (b) { return b.id === savedBodyId; });
      if (savedBody) {
        // 본문 ID 형식: 3부 topTabId-midOrder-bodyOrder, 4부 topTabId-midOrder-bottomOrder-bodyOrder
        var bodyIdParts = savedBodyId.split('-');
        if (bodyIdParts.length >= 3) {
          var topTabId = bodyIdParts[0];
          var midOrder = parseInt(bodyIdParts[1], 10);
          var mid = data.midTabs && data.midTabs[topTabId] ? data.midTabs[topTabId] : null;
          if (mid && mid.items) {
            var midItem = mid.items.find(function (i) { return i.order === midOrder; });
            if (midItem) {
              currentMidTabId = midItem.id;
              currentBodyId = savedBodyId;
            }
          }
        }
      }
    }
    
    // 메인 화면 업데이트
    if (window.HelpApp && typeof window.HelpApp.reloadFromEmbed === 'function') {
      window.HelpApp.reloadFromEmbed();
      
      // reloadFromEmbed 후에 저장된 본문(수정된 본문) 다시 표시
      setTimeout(function () {
        if (currentMidTabId && currentBodyId && window.HelpApp && typeof window.HelpApp.selectMidItem === 'function') {
          window.HelpApp.selectMidItem(currentMidTabId, currentBodyId);
        } else if (currentBodyId && window.HelpApp && typeof window.HelpApp.showBody === 'function') {
          window.HelpApp.showBody(currentBodyId);
        }
      }, 150);
    }
    
    // 저장 후 모달 닫기
    hideBodyForm();
    renderBodyList();
    closeBodyModal();
  }

  function getMidItemsReferencingBodyId(bodyId) {
    var data = getData();
    if (!data || !data.midTabs) return [];
    var refs = [];
    Object.keys(data.midTabs).forEach(function (topId) {
      var items = (data.midTabs[topId] && data.midTabs[topId].items) || [];
      items.forEach(function (item) {
        if (item.bodyId === bodyId) refs.push({ topId: topId, title: item.title });
        if (item.bottomTabs) item.bottomTabs.forEach(function (bt) {
          var used = bt.bodyId === bodyId || (bt.bodyIds && bt.bodyIds.indexOf(bodyId) >= 0);
          if (used) refs.push({ topId: topId, title: item.title + ' > ' + (bt.title || bt.id) });
        });
      });
    });
    return refs;
  }

  function deleteBodyContent(bodyId, pageIndex) {
    var data = getData();
    if (!data || !data.bodyContent) return;
    var body = data.bodyContent.find(function (b) { return b.id === bodyId; });
    if (!body) return;

    var pi = pageIndex == null ? -1 : parseInt(pageIndex, 10);
    if (pi >= 0 && body.pages && body.pages.length > 0) {
      if (!confirm((pi + 1) + '페이지를 삭제할까요?')) return;
      body.pages.splice(pi, 1);
      if (body.pages.length === 0) body.pages = null;
      setData(data);
      renderBodyList();
      hideBodyForm();
      return;
    }

    var refs = getMidItemsReferencingBodyId(bodyId);
    if (refs.length > 0) {
      if (!confirm('이 본문을 참조하는 중단 탭이 ' + refs.length + '개 있습니다. 삭제하면 해당 항목에서 본문이 보이지 않습니다. 삭제할까요?')) return;
    } else {
      if (!confirm('이 본문을 삭제할까요?')) return;
    }
    data.bodyContent = data.bodyContent.filter(function (b) { return b.id !== bodyId; });
    setData(data);
    renderBodyList();
    hideBodyForm();
  }

  // 이미지만 빠르게 수정하는 함수
  function updateBodyImageDirectly(bodyId, imageIndex, newImagePath) {
    var data = getData();
    if (!data || !data.bodyContent) return false;
    
    var body = data.bodyContent.find(function (b) { return b.id === bodyId; });
    if (!body) return false;
    
    // pages 배열이 있는 경우
    if (body.pages && Array.isArray(body.pages) && body.pages.length > 0) {
      if (imageIndex >= 0 && imageIndex < body.pages.length) {
        body.pages[imageIndex].image = newImagePath;
        setData(data);
        // 화면 업데이트
        if (window.HelpApp && typeof window.HelpApp.showBody === 'function') {
          window.HelpApp.showBody(bodyId);
        }
        return true;
      }
    } else {
      // pages 배열이 없는 경우 (단일 이미지)
      if (imageIndex === 0) {
        body.image = newImagePath;
        setData(data);
        // 화면 업데이트
        if (window.HelpApp && typeof window.HelpApp.showBody === 'function') {
          window.HelpApp.showBody(bodyId);
        }
        return true;
      }
    }
    
    return false;
  }

  var bodyFigureEditBtn = document.getElementById('bodyFigureEditBtn');
  if (bodyFigureEditBtn) {
    // 숨겨진 파일 입력 생성
    var quickImageFileInput = document.createElement('input');
    quickImageFileInput.type = 'file';
    quickImageFileInput.accept = 'image/png,image/jpeg,image/jpg,image/gif,image/webp';
    quickImageFileInput.style.display = 'none';
    document.body.appendChild(quickImageFileInput);
    
    // 편집 버튼을 누른 시점의 이미지 인덱스를 저장할 변수
    var editingImageIndex = 0;
    var isFileSelecting = false; // 파일 선택 중인지 추적
    
    // 파일 선택 또는 취소 후 슬라이드쇼 재개
    function resumeSlideshowAfterFileSelect() {
      if (!isFileSelecting) return;
      isFileSelecting = false;
      setTimeout(function() {
        if (window.HelpApp && typeof window.HelpApp.resumeSlideshow === 'function') {
          window.HelpApp.resumeSlideshow();
        }
      }, 100);
    }
    
    quickImageFileInput.addEventListener('change', function(e) {
      var file = e.target.files && e.target.files[0];
      
      if (file) {
        var fileName = file.name;
        var bodyId = getCurrentBodyId();
        var currentPath = '';
        var topTabId = bodyId ? (bodyId.split('-')[0] || '') : '';
        if (bodyId) {
          var data = getData();
          var body = data && data.bodyContent ? data.bodyContent.find(function (b) { return b.id === bodyId; }) : null;
          if (body && body.pages && body.pages[editingImageIndex]) {
            currentPath = (body.pages[editingImageIndex].image || '').trim().replace(/\\/g, '/');
          } else if (body && body.image) {
            currentPath = (body.image || '').trim().replace(/\\/g, '/');
          }
        }
        var baseDir = topTabId ? 'assets/help/images/' + topTabId + '/' : 'assets/help/images/';
        if (currentPath && currentPath.indexOf('/') !== -1) {
          var lastSlash = currentPath.lastIndexOf('/');
          baseDir = currentPath.substring(0, lastSlash + 1);
        }
        var relativePath = baseDir + fileName;
        
        if (!bodyId) {
          alert('본문을 찾을 수 없습니다.');
          quickImageFileInput.value = '';
          resumeSlideshowAfterFileSelect();
          return;
        }
        
        // 저장된 이미지 인덱스 사용 (버튼을 누른 시점의 인덱스)
        // 이미지 업데이트
        if (updateBodyImageDirectly(bodyId, editingImageIndex, relativePath)) {
          // 성공 메시지는 표시하지 않음 (자동 저장)
        } else {
          alert('이미지 업데이트에 실패했습니다.');
        }
      }
      
      // 파일 입력 리셋 및 슬라이드쇼 재개
      quickImageFileInput.value = '';
      resumeSlideshowAfterFileSelect();
    });
    
    // 파일 선택 취소 감지: 대화상자 닫히면 window에 focus 복귀 → 슬라이드쇼 재개
    window.addEventListener('focus', function() {
      if (!isFileSelecting) return;
      setTimeout(function() {
        if (document.hasFocus()) {
          resumeSlideshowAfterFileSelect();
        }
      }, 150);
    });
    
    bodyFigureEditBtn.addEventListener('click', function () {
      var bodyId = getCurrentBodyId();
      if (!bodyId) return;
      
      // 버튼을 누른 시점의 이미지 인덱스 저장
      if (window.HelpApp && window.HelpApp.state && typeof window.HelpApp.state.currentImageIndex !== 'undefined') {
        editingImageIndex = window.HelpApp.state.currentImageIndex;
      } else {
        editingImageIndex = 0;
      }
      
      // 슬라이드쇼 일시정지 (버튼 클릭 시점에 즉시)
      isFileSelecting = true;
      if (window.HelpApp) {
        if (typeof window.HelpApp.pauseSlideshow === 'function') {
          window.HelpApp.pauseSlideshow();
        }
      }
      
      // 바로 파일 선택 창 열기
      setTimeout(function() {
        quickImageFileInput.click();
      }, 10); // 약간의 지연을 두어 일시정지가 먼저 적용되도록
      
      // 취소 시 focus가 오지 않는 환경을 위한 fallback: 일정 시간 후에도 선택 중이면 재개
      setTimeout(function() {
        if (isFileSelecting) {
          resumeSlideshowAfterFileSelect();
        }
      }, 2000);
    });

  }

  if (btnEditBody) btnEditBody.addEventListener('click', openBodyModal);
  if (bodyModalBackdrop) bodyModalBackdrop.addEventListener('click', closeBodyModal);
  if (bodyModalClose) bodyModalClose.addEventListener('click', closeBodyModal);
  var btnAddBodyContent = document.getElementById('btnAddBodyContent');
  if (btnAddBodyContent) btnAddBodyContent.addEventListener('click', function () { showBodyForm(null); });

  if (bodyContentList) {
    bodyContentList.addEventListener('click', function (e) {
      var li = e.target.closest('li');
      if (!li || li.dataset.bodyId == null) return;
      var bodyId = li.dataset.bodyId;
      var pageIndex = li.dataset.pageIndex;
      var data = getData();
      var body = data && data.bodyContent ? data.bodyContent.find(function (b) { return b.id === bodyId; }) : null;
      if (e.target.classList.contains('btn-delete-one')) deleteBodyContent(bodyId, pageIndex);
      else {
        var ref = getTopMidBottomFromBodyId(bodyId);
        if (ref.topTabId && bodyContentFilterTopTab) {
          bodyContentFilterTopTab.value = ref.topTabId;
          updateFilterMidTabDropdown();
          if (bodyContentFilterMidTab) bodyContentFilterMidTab.value = ref.midTabId || '';
          updateFilterBottomTabDropdown();
          if (bodyContentFilterBottomTab) bodyContentFilterBottomTab.value = ref.bottomTabId || '';
        }
        showBodyForm(body, pageIndex != null ? (pageIndex === '-1' ? -1 : parseInt(pageIndex, 10)) : null);
        renderBodyList();
      }
    });
  }
  if (bodyContentForm) bodyContentForm.addEventListener('submit', function (e) { e.preventDefault(); saveBodyContent(); });
  if (bodyFormCancel) bodyFormCancel.addEventListener('click', hideBodyForm);
  if (bodyContentFilterTopTab) {
    bodyContentFilterTopTab.addEventListener('change', function () {
      var savedEditingBodyId = editingBodyId;
      var savedEditingPageIndex = editingPageIndex;
      updateFilterMidTabDropdown();
      updateFilterBottomTabDropdown();
      if (bodyContentFilterMidTab) bodyContentFilterMidTab.value = '';
      if (bodyContentFilterBottomTab) bodyContentFilterBottomTab.value = '';
      editingBodyId = savedEditingBodyId;
      editingPageIndex = savedEditingPageIndex;
      renderBodyList();
    });
  }
  if (bodyContentFilterMidTab) {
    bodyContentFilterMidTab.addEventListener('change', function () {
      var savedEditingBodyId = editingBodyId;
      var savedEditingPageIndex = editingPageIndex;
      updateFilterBottomTabDropdown();
      if (bodyContentFilterBottomTab) bodyContentFilterBottomTab.value = '';
      editingBodyId = savedEditingBodyId;
      editingPageIndex = savedEditingPageIndex;
      renderBodyList();
    });
  }
  if (bodyContentFilterBottomTab) {
    bodyContentFilterBottomTab.addEventListener('change', function () {
      var savedEditingBodyId = editingBodyId;
      var savedEditingPageIndex = editingPageIndex;
      editingBodyId = savedEditingBodyId;
      editingPageIndex = savedEditingPageIndex;
      renderBodyList();
    });
  }
  if (bodyInputTopTab) {
    bodyInputTopTab.addEventListener('change', function () {
      var topTabId = bodyInputTopTab.value;
      if (bodyInputMidTab) {
        populateMidTabSelect(topTabId);
        bodyInputMidTab.value = '';
      }
      updateBodyIdPreview();
    });
    bodyInputTopTab.addEventListener('input', function () {
      var topTabId = bodyInputTopTab.value;
      if (bodyInputMidTab) {
        populateMidTabSelect(topTabId);
        bodyInputMidTab.value = '';
      }
      updateBodyIdPreview();
    });
  }
  if (bodyInputMidTab) {
    bodyInputMidTab.addEventListener('change', function () {
      if (editingBodyId == null && bodyInputTopTab && bodyInputOrder) {
        var topTabId = bodyInputTopTab.value || '';
        var midTabId = bodyInputMidTab.value || '';
        bodyInputOrder.value = String(getNextBodyOrderForMidTab(topTabId, midTabId));
      }
      updateBodyIdPreview();
    });
    bodyInputMidTab.addEventListener('input', updateBodyIdPreview);
  }
  if (bodyInputOrder) {
    bodyInputOrder.addEventListener('change', updateBodyIdPreview);
    bodyInputOrder.addEventListener('input', updateBodyIdPreview);
  }
  // 이미지 추가 버튼
  if (bodyContentAddImage) {
    bodyContentAddImage.addEventListener('click', function() {
      var currentImages = bodyContentImagesContainer ? bodyContentImagesContainer.querySelectorAll('.editor-image-item') : [];
      if (currentImages.length >= 3) {
        alert('이미지는 최대 3개까지 추가할 수 있습니다.');
        return;
      }
      var newImageItem = createImageItem(getBodyImageBasePath(), currentImages.length);
      if (bodyContentImagesContainer) {
        bodyContentImagesContainer.appendChild(newImageItem);
        updateAddImageButton();
      }
    });
  }
  // 이미지 삭제: mousedown + data-image-index로 1·2·3번째 모두 동일하게 삭제
  if (bodyContentImagesContainer) {
    bodyContentImagesContainer.addEventListener('mousedown', function(e) {
      var btn = e.target.closest('.editor-btn-delete');
      if (!btn) return;
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      var items = bodyContentImagesContainer.querySelectorAll('.editor-image-item');
      var index = parseInt(btn.dataset.imageIndex, 10);
      if (!isNaN(index) && index >= 0 && items[index]) {
        items[index].remove();
        updateAddImageButton();
      } else {
        var item = btn.closest('.editor-image-item');
        if (item) {
          item.remove();
          updateAddImageButton();
        }
      }
    }, true);
  }

  /* ===== 언어 선택 드롭다운 + 언어 추가 (Help_Editor 전용) ===== */
  var langSelect = document.getElementById('langSelect');
  function refreshLangSelect() {
    if (!langSelect || !window.HelpLang) return;
    var list = window.HelpLang.getLanguages();
    var current = window.HelpLang.getCurrentLanguage();
    langSelect.innerHTML = '';
    list.forEach(function (item) {
      var opt = document.createElement('option');
      opt.value = item.id;
      opt.textContent = item.label;
      langSelect.appendChild(opt);
    });
    if (list.some(function (item) { return item.id === current; })) langSelect.value = current;
    // 에디터에서는 항상 표시
    langSelect.style.display = '';
  }
  if (langSelect && window.HelpLang) {
    refreshLangSelect();
    langSelect.addEventListener('change', function () {
      window.HelpLang.setCurrentLanguage(langSelect.value);
      if (window.HelpApp && typeof window.HelpApp.reloadFromEmbed === 'function') {
        window.HelpApp.reloadFromEmbed();
      }
    });
  }

  var addLangModal = document.getElementById('addLangModal');
  var addLangModalBackdrop = document.getElementById('addLangModalBackdrop');
  var addLangModalClose = document.getElementById('addLangModalClose');
  var addLangList = document.getElementById('addLangList');
  var addLangFormPlaceholder = document.getElementById('addLangFormPlaceholder');
  var addLangFormTitle = document.getElementById('addLangFormTitle');
  var addLangForm = document.getElementById('addLangForm');
  var addLangId = document.getElementById('addLangId');
  var addLangLabel = document.getElementById('addLangLabel');
  var addLangFormCancel = document.getElementById('addLangFormCancel');
  var addLangJsonFile = document.getElementById('addLangJsonFile');
  var addLangJsonBrowse = document.getElementById('addLangJsonBrowse');
  var btnAddLang = document.getElementById('btnAddLang');
  var btnAddLangInModal = document.getElementById('btnAddLangInModal');
  var editingLangId = null;

  function renderAddLangList() {
    if (!addLangList || !window.HelpLang) return;
    var list = window.HelpLang.getLanguages();
    addLangList.innerHTML = '';
    list.forEach(function (item) {
      var li = document.createElement('li');
      li.dataset.langId = item.id;
      if (item.id === editingLangId) li.classList.add('selected');
      var info = document.createElement('div');
      info.className = 'tab-info';
      info.innerHTML = '<span class="tab-id">' + escapeHtml(item.id) + '</span><span class="tab-label">' + escapeHtml(item.label || '') + '</span>';
      li.appendChild(info);
      var btnDel = document.createElement('button');
      btnDel.type = 'button';
      btnDel.className = 'btn-delete-one';
      btnDel.textContent = '삭제';
      btnDel.dataset.langId = item.id;
      li.appendChild(btnDel);
      addLangList.appendChild(li);
    });
  }

  function openAddLangModal() {
    if (!addLangModal) return;
    addLangModal.hidden = false;
    editingLangId = null;
    addLangForm.hidden = true;
    if (addLangFormPlaceholder) addLangFormPlaceholder.hidden = false;
    renderAddLangList();
  }
  function closeAddLangModal() {
    if (!addLangModal) return;
    addLangModal.hidden = true;
    addLangForm.hidden = true;
    if (addLangFormPlaceholder) addLangFormPlaceholder.hidden = false;
    editingLangId = null;
  }

  function showAddLangForm(item) {
    editingLangId = item ? item.id : null;
    if (addLangFormTitle) addLangFormTitle.textContent = item ? '언어 수정' : '언어 추가';
    addLangId.value = item ? item.id : '';
    addLangLabel.value = item ? (item.label || '') : '';
    addLangId.disabled = !!item;
    addLangForm.hidden = false;
    if (addLangFormPlaceholder) addLangFormPlaceholder.hidden = true;
    
    // 파일 입력 리셋 (JSON 불러오기를 다시 사용할 수 있도록)
    if (addLangJsonFile) {
      addLangJsonFile.value = '';
    }
  }
  function hideAddLangForm() {
    addLangForm.hidden = true;
    if (addLangFormPlaceholder) addLangFormPlaceholder.hidden = false;
    editingLangId = null;
    
    // 파일 입력 리셋 (JSON 불러오기를 다시 사용할 수 있도록)
    if (addLangJsonFile) {
      addLangJsonFile.value = '';
    }
  }

  function saveAddLang() {
    if (!window.HelpLang) return;
    var id = (addLangId.value || '').trim().replace(/\s+/g, '_');
    var label = (addLangLabel.value || '').trim();
    if (!id || !label) {
      alert('언어 ID와 표시 이름을 입력하세요.');
      return;
    }
    if (!isValidId(id)) {
      alert('언어 ID는 영문, 숫자, 밑줄(_), 하이픈(-)만 사용할 수 있습니다.');
      return;
    }
    var list = window.HelpLang.getLanguages();
    if (editingLangId) {
      var idx = list.findIndex(function (item) { return item.id === editingLangId; });
      if (idx >= 0) {
        list[idx] = { id: list[idx].id, label: label };
        window.HelpLang.saveLanguages(list);
        refreshLangSelect();
        renderAddLangList();
        hideAddLangForm();
      }
      return;
    }
    if (list.some(function (item) { return item.id === id; })) {
      alert('이미 같은 ID의 언어가 있습니다.');
      return;
    }
    list.push({ id: id, label: label });
    window.HelpLang.saveLanguages(list);
    refreshLangSelect();
    renderAddLangList();
    hideAddLangForm();
  }

  function deleteLang(langId) {
    if (!window.HelpLang) return;
    var list = window.HelpLang.getLanguages();
    if (list.length <= 1) {
      alert('언어는 최소 1개 이상 있어야 합니다.');
      return;
    }
    if (!confirm('이 언어를 목록에서 삭제할까요?')) return;
    list = list.filter(function (item) { return item.id !== langId; });
    window.HelpLang.saveLanguages(list);
    var current = window.HelpLang.getCurrentLanguage();
    if (current === langId) {
      window.HelpLang.setCurrentLanguage(list[0] ? list[0].id : 'ko');
    }
    refreshLangSelect();
    renderAddLangList();
    hideAddLangForm();
    
    // 파일 입력 리셋 (JSON 불러오기를 다시 사용할 수 있도록)
    if (addLangJsonFile) {
      addLangJsonFile.value = '';
    }
  }

  if (btnAddLang) btnAddLang.addEventListener('click', openAddLangModal);
  if (btnAddLangInModal) btnAddLangInModal.addEventListener('click', function () { showAddLangForm(null); });
  if (addLangModalBackdrop) addLangModalBackdrop.addEventListener('click', closeAddLangModal);
  if (addLangModalClose) addLangModalClose.addEventListener('click', closeAddLangModal);
  if (addLangList) {
    addLangList.addEventListener('click', function (e) {
      var li = e.target.closest('li');
      if (!li || !li.dataset.langId) return;
      var langId = li.dataset.langId;
      var list = window.HelpLang ? window.HelpLang.getLanguages() : [];
      var item = list.find(function (l) { return l.id === langId; });
      if (e.target.classList.contains('btn-delete-one')) deleteLang(langId);
      else { showAddLangForm(item); renderAddLangList(); }
    });
  }
  // JSON 파일 불러오기 기능
  if (addLangJsonBrowse && addLangJsonFile) {
    addLangJsonBrowse.addEventListener('click', function() {
      addLangJsonFile.click();
    });
    
    addLangJsonFile.addEventListener('change', function(e) {
      var file = e.target.files && e.target.files[0];
      if (!file) return;
      
      var fileName = file.name;
      // 파일명에서 언어 ID 추출: help-data-{langId}.json 형식
      var langIdMatch = fileName.match(/help-data-([^.]+)\.json$/i);
      var langId = langIdMatch ? langIdMatch[1] : null;
      
      if (!langId) {
        alert('파일명 형식이 올바르지 않습니다. help-data-{언어ID}.json 형식이어야 합니다.\n예: help-data-ko.json, help-data-en.json');
        return;
      }
      
      var reader = new FileReader();
      reader.onload = function(e) {
        try {
          var jsonData = JSON.parse(e.target.result);
          
          // 언어 ID 설정
          addLangId.value = langId;
          
          // 표시 이름 추출 시도
          // 1. 기본 언어 목록에서 찾기
          var defaultLang = window.HelpLang && window.HelpLang.DEFAULT_LANGUAGES 
            ? window.HelpLang.DEFAULT_LANGUAGES.find(function(l) { return l.id === langId; })
            : null;
          
          if (defaultLang && defaultLang.label) {
            addLangLabel.value = defaultLang.label;
          } else {
            // 2. 기본 언어 목록에 없으면 파일명 기반으로 추론
            var langNames = {
              'ko': '한국어',
              'ja': '일본어',
              'en': '영어',
              'zh-CN': '중국어 간체',
              'zh-TW': '중국어 번체',
              'fr': '프랑스어',
              'de': '독일어',
              'es': '스페인어',
              'ru': '러시아어'
            };
            addLangLabel.value = langNames[langId] || langId.toUpperCase();
          }
          
          // 입력 필드에 포커스
          addLangLabel.focus();
          
          // 파일 입력 리셋 (같은 파일을 다시 선택할 수 있도록)
          if (addLangJsonFile) {
            addLangJsonFile.value = '';
          }
        } catch (err) {
          alert('JSON 파일을 읽는 중 오류가 발생했습니다: ' + err.message);
          // 오류 발생 시에도 파일 입력 리셋
          if (addLangJsonFile) {
            addLangJsonFile.value = '';
          }
        }
      };
      reader.onerror = function() {
        alert('파일을 읽는 중 오류가 발생했습니다.');
        // 오류 발생 시에도 파일 입력 리셋
        if (addLangJsonFile) {
          addLangJsonFile.value = '';
        }
      };
      reader.readAsText(file);
    });
  }
  
  // 제목만 빠르게 수정하는 함수
  function updateBodyTitleDirectly(bodyId, newTitle) {
    var data = getData();
    if (!data || !data.bodyContent) return false;
    
    var body = data.bodyContent.find(function (b) { return b.id === bodyId; });
    if (!body) return false;
    
    body.title = newTitle || '';
    setData(data);
    
    // 화면 업데이트
    if (window.HelpApp && typeof window.HelpApp.showBody === 'function') {
      window.HelpApp.showBody(bodyId);
    }
    
    return true;
  }

  // 제목 편집 버튼 기능
  var bodyTitleEditBtn = document.getElementById('bodyTitleEditBtn');
  var isTitleEditing = false;
  
  function getBodyTitleElement() {
    return document.getElementById('bodyTitle');
  }
  
  if (bodyTitleEditBtn) {
    bodyTitleEditBtn.addEventListener('click', function() {
      if (isTitleEditing) return; // 이미 편집 중이면 무시
      
      var bodyTitle = getBodyTitleElement();
      if (!bodyTitle) return;
      
      var bodyId = getCurrentBodyId();
      if (!bodyId) return;
      
      var currentTitle = bodyTitle.textContent || '';
      
      // 제목을 입력 필드로 전환
      isTitleEditing = true;
      var titleInput = document.createElement('input');
      titleInput.type = 'text';
      titleInput.value = currentTitle;
      titleInput.style.cssText = 'font-size: clamp(1.15rem, 1.6vw, 1.4rem); font-weight: 700; color: var(--help-text); text-align: center; background: rgba(90, 155, 213, 0.15); border: 1px solid var(--help-accent); border-radius: var(--help-radius-sm); padding: 4px 8px; width: 100%; max-width: 600px; outline: none;';
      
      // 제목 요소를 입력 필드로 교체 (원본 참조 유지 → 저장 시 선택 바뀌었으면 현재 본문으로 복원)
      var titleContainer = bodyTitle.parentElement;
      titleContainer.replaceChild(titleInput, bodyTitle);
      
      titleInput.focus();
      titleInput.select();
      
      function saveTitle() {
        if (!isTitleEditing) return;
        var newTitle = (titleInput.value || '').trim();
        if (!newTitle) newTitle = currentTitle;
        
        if (!updateBodyTitleDirectly(bodyId, newTitle)) {
          alert('제목 업데이트에 실패했습니다.');
        }
        titleContainer.replaceChild(bodyTitle, titleInput);
        var currentBodyId = getCurrentBodyId();
        if (currentBodyId === bodyId) {
          bodyTitle.textContent = newTitle;
        } else {
          var data = getData();
          var currentBody = data && data.bodyContent ? data.bodyContent.find(function (b) { return b.id === currentBodyId; }) : null;
          bodyTitle.textContent = currentBody ? (currentBody.title || '') : '';
          if (window.HelpApp && typeof window.HelpApp.showBody === 'function') {
            window.HelpApp.showBody(currentBodyId);
          }
        }
        isTitleEditing = false;
      }
      
      titleInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
          e.preventDefault();
          saveTitle();
        } else if (e.key === 'Escape') {
          e.preventDefault();
          titleContainer.replaceChild(bodyTitle, titleInput);
          var currentBodyId = getCurrentBodyId();
          if (currentBodyId === bodyId) {
            bodyTitle.textContent = currentTitle;
          } else {
            var data = getData();
            var currentBody = data && data.bodyContent ? data.bodyContent.find(function (b) { return b.id === currentBodyId; }) : null;
            bodyTitle.textContent = currentBody ? (currentBody.title || '') : '';
            if (window.HelpApp && typeof window.HelpApp.showBody === 'function') {
              window.HelpApp.showBody(currentBodyId);
            }
          }
          isTitleEditing = false;
        }
      });
      
      // blur 시 저장
      titleInput.addEventListener('blur', function() {
        setTimeout(function() {
          if (isTitleEditing) {
            saveTitle();
          }
        }, 200); // 다른 버튼 클릭을 위해 약간의 지연
      });
    });
  }

  // 본문(설명)만 빠르게 수정하는 함수
  function updateBodyDescriptionDirectly(bodyId, newDescription) {
    var data = getData();
    if (!data || !data.bodyContent) return false;
    
    var body = data.bodyContent.find(function (b) { return b.id === bodyId; });
    if (!body) return false;
    
    body.description = newDescription || '';
    setData(data);
    
    // 화면 업데이트
    if (window.HelpApp && typeof window.HelpApp.showBody === 'function') {
      window.HelpApp.showBody(bodyId);
    }
    
    return true;
  }

  // 본문(설명) 편집 버튼 기능
  var bodyDescriptionEditBtn = document.getElementById('bodyDescriptionEditBtn');
  var isDescriptionEditing = false;
  var editingDescriptionRef = null;
  var editingDescriptionBodyId = null; // 편집 중인 본문 ID (다른 미들탭으로 이동해도 올바른 본문에만 저장)
  
  function getBodyDescriptionElement() {
    return document.getElementById('bodyDescription');
  }
  
  if (bodyDescriptionEditBtn) {
    bodyDescriptionEditBtn.addEventListener('click', function() {
      var bodyDescription = getBodyDescriptionElement();
      // 편집 중에 수정 아이콘을 누르면 저장 후 닫기 (편집 시작 시의 본문 ID로만 저장)
      if (isDescriptionEditing && editingDescriptionRef && editingDescriptionBodyId) {
        var textareaInBlock = document.querySelector('.body-text-block textarea');
        if (textareaInBlock) {
          var newDescription = textareaInBlock.value || '';
          if (updateBodyDescriptionDirectly(editingDescriptionBodyId, newDescription)) {
            textareaInBlock.parentElement.removeChild(textareaInBlock);
            editingDescriptionRef.hidden = false;
            editingDescriptionRef.style.display = '';
            var currentBodyId = getCurrentBodyId();
            if (currentBodyId === editingDescriptionBodyId) {
              editingDescriptionRef.innerHTML = newDescription;
              if (window.HelpApp && typeof window.HelpApp.showBody === 'function') {
                window.HelpApp.showBody(editingDescriptionBodyId);
              }
            } else {
              var data = getData();
              var currentBody = data && data.bodyContent ? data.bodyContent.find(function (b) { return b.id === currentBodyId; }) : null;
              var desc = currentBody ? (currentBody.description || '') : '';
              editingDescriptionRef.innerHTML = desc || '';
              if (window.HelpApp && typeof window.HelpApp.showBody === 'function') {
                window.HelpApp.showBody(currentBodyId);
              }
            }
          }
        }
        isDescriptionEditing = false;
        editingDescriptionRef = null;
        editingDescriptionBodyId = null;
        return;
      }
      if (!bodyDescription) return;
      
      var bodyId = getCurrentBodyId();
      if (!bodyId) return;
      
      var data = getData();
      var body = data && data.bodyContent ? data.bodyContent.find(function (b) { return b.id === bodyId; }) : null;
      var currentDescription = body ? (body.description || '') : (bodyDescription.innerHTML || '');
      
      isDescriptionEditing = true;
      editingDescriptionRef = bodyDescription;
      editingDescriptionBodyId = bodyId;
      var descriptionTextarea = document.createElement('textarea');
      descriptionTextarea.value = currentDescription;
      descriptionTextarea.style.cssText = 'font-size: var(--help-font-size); line-height: 1.7; color: var(--help-text); text-align: center; background: var(--help-bg-panel); border: 1px solid var(--help-accent); border-radius: var(--help-radius-sm); padding: 8px 12px; width: 100%; max-width: 600px; min-height: 80px; outline: none; resize: vertical; font-family: inherit; white-space: pre-line; box-shadow: 0 0 0 2px var(--help-accent-glow);';
      
      var descriptionContainer = bodyDescription.parentElement;
      var originalInnerHTML = currentDescription;
      bodyDescription.hidden = true;
      bodyDescription.style.display = 'none';
      descriptionContainer.insertBefore(descriptionTextarea, bodyDescription.nextSibling);
      
      descriptionTextarea.focus();
      descriptionTextarea.select();
      
      function saveDescription() {
        if (!isDescriptionEditing) return;
        var newDescription = descriptionTextarea.value || '';
        
        if (!updateBodyDescriptionDirectly(bodyId, newDescription)) {
          alert('본문 업데이트에 실패했습니다.');
        }
        descriptionContainer.removeChild(descriptionTextarea);
        bodyDescription.hidden = false;
        bodyDescription.style.display = '';
        var currentBodyId = getCurrentBodyId();
        if (currentBodyId === bodyId) {
          bodyDescription.innerHTML = newDescription;
          if (window.HelpApp && typeof window.HelpApp.showBody === 'function') {
            window.HelpApp.showBody(bodyId);
          }
        } else {
          var data = getData();
          var currentBody = data && data.bodyContent ? data.bodyContent.find(function (b) { return b.id === currentBodyId; }) : null;
          var desc = currentBody ? (currentBody.description || '') : '';
          bodyDescription.innerHTML = desc || '';
          if (window.HelpApp && typeof window.HelpApp.showBody === 'function') {
            window.HelpApp.showBody(currentBodyId);
          }
        }
        isDescriptionEditing = false;
        editingDescriptionRef = null;
        editingDescriptionBodyId = null;
      }
      
      descriptionTextarea.addEventListener('keydown', function(e) {
        if ((e.key === 'Enter' && (e.ctrlKey || e.metaKey)) || (e.key === 'Enter' && e.shiftKey === false && e.target.value.split('\n').length === 1)) {
          e.preventDefault();
          saveDescription();
        } else if (e.key === 'Escape') {
          e.preventDefault();
          descriptionContainer.removeChild(descriptionTextarea);
          bodyDescription.hidden = false;
          bodyDescription.style.display = '';
          var currentBodyId = getCurrentBodyId();
          if (currentBodyId === bodyId) {
            bodyDescription.innerHTML = originalInnerHTML;
          } else {
            var data = getData();
            var currentBody = data && data.bodyContent ? data.bodyContent.find(function (b) { return b.id === currentBodyId; }) : null;
            var desc = currentBody ? (currentBody.description || '') : '';
            bodyDescription.innerHTML = desc || '';
            if (window.HelpApp && typeof window.HelpApp.showBody === 'function') {
              window.HelpApp.showBody(currentBodyId);
            }
          }
          isDescriptionEditing = false;
          editingDescriptionRef = null;
          editingDescriptionBodyId = null;
        }
      });
      
      descriptionTextarea.addEventListener('blur', function() {
        setTimeout(function() {
          if (isDescriptionEditing) {
            saveDescription();
          }
        }, 200);
      });
    });
  }

  if (addLangForm) addLangForm.addEventListener('submit', function (e) { e.preventDefault(); saveAddLang(); });
  if (addLangFormCancel) addLangFormCancel.addEventListener('click', hideAddLangForm);

  /* ===== 버전 히스토리 모달 ===== */
  var versionHistoryModal = document.getElementById('versionHistoryModal');
  var versionHistoryModalBackdrop = document.getElementById('versionHistoryModalBackdrop');
  var versionHistoryModalClose = document.getElementById('versionHistoryModalClose');
  var versionHistoryContent = document.getElementById('versionHistoryContent');
  var editorVersionBadge = document.querySelector('.editor-version-badge');
  
  // 버전 히스토리 데이터
  var VERSION_HISTORY = [
    {
      version: 'V1.14',
      date: '2026-02-03',
      changes: [
        'JSON 저장 시 들여쓰기 포맷 적용 (JSON.stringify(data, null, 2)), 번역·수정 시 가독성 향상'
      ]
    },
    {
      version: 'V1.13',
      date: '2026-02-03',
      changes: [
        '검색: 바텀탭 제목도 검색 대상에 포함 (미들탭 제목 또는 하위 바텀탭 제목 일치 시 해당 미들탭 표시)',
        '검색 시 미들탭(부모)이 펼쳐진 상태로 표시 (검색어가 있을 때 바텀탭이 있는 미들탭 자동 펼침)'
      ]
    },
    {
      version: 'V1.12',
      date: '2026-02-03',
      changes: [
        '바텀탭: 미들탭 하위 탭(아코디언 UI), 바텀탭 관리 모달, 4부 본문 ID 규칙(최상단-중단-바텀-본문), 본문 관리 필터·연결 본문 추가/수정/삭제 지원',
        '본문 연필 아이콘(이미지/제목/설명 수정) 버튼이 바텀탭 선택 시에도 작동하도록 수정 (getCurrentBodyId/getCurrentMidTabId에서 .mid-subitem.active 지원)',
        '페이지네이션(이전/다음 페이지)을 본문 바로 밑에 붙이도록 변경 (margin-top: auto·translateY 제거, 본문 흐름에 따라 배치)',
        '본문이 길어질 때 본문 영역에 스크롤 생기도록 수정 (.body-inner flex-shrink: 0, .help-root·help-main 그리드 minmax(0,1fr), .body-content flex: 1 1 0·overflow)'
      ]
    },
    {
      version: 'V1.11',
      date: '2026-02-02',
      changes: [
        'localStorage(임시 저장) 제거: 데이터는 편집 시 DOM(#help-data)에만 반영',
        '뷰어/편집기 모두 HTML 내장(embed) 데이터만 사용, getDraftFullData 제거',
        'ZIP 공유 시 다운로드한 index.html·Help_Editor.HTML로 교체하면 동일 화면 표시'
      ]
    },
    {
      version: 'V1.10',
      date: '2026-02-02',
      changes: [
        'index.html·Help_Editor.HTML 저장을 다운로드 방식으로 변경 (편집 데이터 포함 파일 다운로드)',
        'index.html 다운로드 / Help_Editor.HTML 다운로드 버튼 분리',
        '다운로드한 파일을 프로젝트 폴더에 덮어쓰면 공유 시 동일한 상태로 표시'
      ]
    },
    {
      version: 'V1.09',
      date: '2026-02-02',
      changes: [
        '본문 이미지 로드 경로: assets/help/images/{최상단탭ID}/ (뷰어 getBodyImagePath 적용)',
        '본문 수정에서 이미지 경로 규칙 적용 (getBodyImageBasePath, placeholder·찾아보기·저장·슬라이드쇼 빠른 수정)',
        '이미지 추가 시 assets/help/images/{topTabId}/ 표시 (필터·편집 중 본문 ID fallback)'
      ]
    },
    {
      version: 'V1.08',
      date: '2026-02-02',
      changes: [
        '본문 이미지 크로스페이드 후 깜빡임 제거 (nextEl.src 비우지 않고 opacity만 0 유지)',
        '본문 이미지 업로드를 이전 방식으로 복원 (폴더 선택/상대 경로 우회 제거, 파일명만 사용)',
        '파일 선택 대화상자에서 취소 시 슬라이드쇼 재개 (window focus 감지 + 2초 fallback)'
      ]
    },
    {
      version: 'V1.07',
      date: '2026-02-02',
      changes: [
        '같은 중단 탭 본문 판별 시 prefix 대신 parseBodyId로 topTabId·midOrder 비교 (defense-1 vs defense-10 구분)',
        'getBodiesInSameMidTab / getBodiesInMidTab 정확한 midOrder 매칭으로 본문 1개인데 2페이지로 보이던 현상 수정',
        '페이지네이션: 본문 전환 시 항상 현재 본문 기준으로 DOM 갱신 (다른 본문 갔다 돌아오면 이전 본문 개수로 남던 현상 수정)'
      ]
    },
    {
      version: 'V1.06',
      date: '2026-02-02',
      changes: [
        '본문 설명 수정 시 [키워드] 강조 유지 및 수정 아이콘 정상 동작 (bodyDescription DOM 유지 방식)',
        '본문 설명/제목 강조 스타일에 볼드(bold) 적용',
        'reloadFromEmbed 시 미들탭 선택 유지 (applyDataAndRender에서 savedMidId/savedBodyId 사용)',
        '제목/설명 편집 중 다른 미들탭 이동 시: 편집 중인 본문에만 저장, 화면은 현재 선택된 본문으로 갱신',
        '편집 중인 본문 ID 고정(editingDescriptionBodyId)으로 잘못된 본문에 저장되는 문제 수정',
        '최상단 탭 순서 중복 방지 검증 추가 (order 값 기반, 저장 시 겹치면 알림)'
      ]
    },
    {
      version: 'V1.05',
      date: '2026-02-02',
      changes: [
        '중단 탭 순서 변경 시 중단 탭 ID 자동 갱신 기능 추가',
        '중단 탭 순서 변경 시 소속 본문 ID 자동 갱신 기능 추가',
        '중단 탭 순서 중복 방지 검증 강화 (order 값 기반 검증)'
      ]
    },
    {
      version: 'V1.04',
      date: '2026-02-02',
      changes: [
        '슬라이드쇼 이미지 로드 실패 시 Error.png 표시 기능 추가',
        '이미지 경로 공백 처리 개선 (trim() 추가)',
        '이미지 로드 실패 시 무한 루프 방지 로직 개선 (에러 카운터 추가)',
        '예제 데이터의 placeholder.png를 No_Images.png로 변경',
        'ESC 키로 모든 모달 창 닫기 기능 추가'
      ]
    },
    {
      version: 'V1.03',
      date: '2026-02-02',
      changes: [
        '도움말 및 편집기 스킨 변경 (라이트 테마, 오렌지 강조 색상)',
        '이미지 경로 해결 로직 개선 (Windows 경로 지원, 백슬래시 처리)',
        '탭 아이콘만 .svg로 변환, 본문 이미지는 .png 유지',
        'placeholder 대신 No_Images.png 사용으로 통일',
        '이미지 경로 로드 로직 개선 (빈 문자열 처리 개선, trim() 추가)',
        '본문 설명 키워드 강조 기능 추가 ([키워드] 형식)',
        '슬라이드쇼 이미지 로드 실패 시 Error.png 표시 기능 추가',
        '이미지 로드 실패 시 무한 루프 방지 로직 개선 (에러 카운터 추가)'
      ]
    },
    {
      version: 'V1.02',
      date: '2026-02-02',
      changes: [
        '이미지 편집 버튼 클릭 시 현재 이미지 즉시 수정 기능 추가',
        '파일 선택 중 슬라이드쇼 일시정지 기능 추가',
        '제목 편집 버튼 추가 및 즉시 편집 기능',
        '본문(설명 텍스트) 편집 버튼 추가 및 즉시 편집 기능'
      ]
    },
    {
      version: 'V1.01',
      date: '2026-02-02',
      changes: [
        '이미지 경로 해석 로직 개선 (file:// 프로토콜 지원)',
        '언어 삭제 후 JSON 불러오기 문제 수정',
        '파일 입력 리셋 기능 추가'
      ]
    },
    {
      version: 'V1.0',
      date: '2026-02-02',
      changes: [
        '도움말 편집기 초기 릴리스',
        '본문 이미지 경로 자동 설정 기능 추가',
        '언어 관리 기능 추가',
        'JSON 파일 불러오기 기능 추가',
        '버전 히스토리 기능 추가'
      ]
    }
  ];
  
  function renderVersionHistory() {
    if (!versionHistoryContent) return;
    
    var html = '<div style="padding: 16px;">';
    html += '<p style="margin-bottom: 20px; color: var(--help-text-muted);">현재 버전: <strong style="color: var(--help-accent);">V1.14</strong></p>';
    html += '<div style="display: flex; flex-direction: column; gap: 20px;">';
    
    VERSION_HISTORY.forEach(function(item, index) {
      html += '<div style="border-left: 3px solid var(--help-accent); padding-left: 16px; margin-left: 8px;">';
      html += '<div style="display: flex; align-items: center; gap: 12px; margin-bottom: 8px;">';
      html += '<span style="font-size: 1.1rem; font-weight: bold; color: var(--help-accent);">' + item.version + '</span>';
      html += '<span style="color: var(--help-text-muted); font-size: 0.9rem;">' + item.date + '</span>';
      if (index === 0) {
        html += '<span style="background: rgba(90, 155, 213, 0.2); color: var(--help-accent); padding: 2px 8px; border-radius: 4px; font-size: 0.8rem;">현재</span>';
      }
      html += '</div>';
      html += '<ul style="margin: 0; padding-left: 20px; color: var(--help-text);">';
      item.changes.forEach(function(change) {
        html += '<li style="margin-bottom: 4px;">' + change + '</li>';
      });
      html += '</ul>';
      html += '</div>';
    });
    
    html += '</div>';
    html += '</div>';
    
    versionHistoryContent.innerHTML = html;
  }
  
  function openVersionHistoryModal() {
    if (!versionHistoryModal) return;
    renderVersionHistory();
    versionHistoryModal.hidden = false;
  }
  
  function closeVersionHistoryModal() {
    if (!versionHistoryModal) return;
    versionHistoryModal.hidden = true;
  }
  
  if (editorVersionBadge) {
    editorVersionBadge.style.cursor = 'pointer';
    editorVersionBadge.addEventListener('click', openVersionHistoryModal);
  }
  
  if (versionHistoryModalBackdrop) {
    versionHistoryModalBackdrop.addEventListener('click', closeVersionHistoryModal);
  }
  
  if (versionHistoryModalClose) {
    versionHistoryModalClose.addEventListener('click', closeVersionHistoryModal);
  }

  /* ===== ESC 키로 모달 닫기 ===== */
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' || e.keyCode === 27) {
      // 현재 열려있는 모달 확인 및 닫기
      if (versionHistoryModal && !versionHistoryModal.hidden) {
        closeVersionHistoryModal();
      } else if (addLangModal && !addLangModal.hidden) {
        closeAddLangModal();
      } else if (bodyModal && !bodyModal.hidden) {
        closeBodyModal();
      } else if (bottomTabsModal && !bottomTabsModal.hidden) {
        closeBottomTabsModal();
      } else if (midModal && !midModal.hidden) {
        closeMidModal();
      } else if (modal && !modal.hidden) {
        closeModal();
      }
    }
  });

  /* ===== embed가 비어 있으면 언어별 help-data-{lang}.json 로드 (편집기 전용) ===== */
  (function ensureDataLoaded() {
    var full = getFullData();
    if (full && (full.ko || full.ja || full.topTabs)) return;
    var embed = document.getElementById('help-data');
    if (!embed) return;
    var list = (window.HelpLang && window.HelpLang.getLanguages()) ? window.HelpLang.getLanguages() : [{ id: 'ko', label: '한국어' }];
    var fullData = {};
    var pending = list.length;
    if (pending === 0) {
      if (window.HelpApp && typeof window.HelpApp.reloadFromEmbed === 'function') window.HelpApp.reloadFromEmbed();
      return;
    }
    list.forEach(function (item) {
      var url = 'help-data-' + item.id + '.json';
      fetch(url)
        .then(function (res) { return res.ok ? res.json() : Promise.reject(); })
        .then(function (json) {
          fullData[item.id] = json;
        })
        .catch(function () {
          fullData[item.id] = { topTabs: [], midTabs: {}, bodyContent: [] };
        })
        .then(function () {
          pending--;
          if (pending === 0) {
            try {
              var jsonStr = JSON.stringify(fullData);
              if (embed) embed.textContent = jsonStr;
            } catch (e) {}
            if (window.HelpApp && typeof window.HelpApp.reloadFromEmbed === 'function') {
              window.HelpApp.reloadFromEmbed();
            }
          }
        });
    });
  })();

  /* ===== JSON 파일로 저장 (다운로드) - 현재 언어만 help-data-{lang}.json ===== */
  var btnSaveJson = document.getElementById('btnSaveJson');
  function downloadJson() {
    var data = getData();
    if (!data) {
      alert('저장할 데이터가 없습니다.');
      return;
    }
    try {
      var lang = getCurrentLang();
      var jsonStr = JSON.stringify(data, null, 2);
      var blob = new Blob([jsonStr], { type: 'application/json' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = 'help-data-' + lang + '.json';
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      alert('다운로드에 실패했습니다: ' + (e && e.message));
    }
  }
  if (btnSaveJson) btnSaveJson.addEventListener('click', downloadJson);

  /* ===== index.html에 저장 - 편집된 데이터로 index.html 파일 직접 저장 (File System Access API 또는 다운로드) ===== */
  var btnSaveIndexHtml = document.getElementById('btnSaveIndexHtml');
  var INDEX_HTML_PREFIX = '<!DOCTYPE html>\n<html lang="ko">\n<head>\n  <meta charset="UTF-8">\n  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n  <title>도움말 / 튜토리얼</title>\n  <link rel="stylesheet" href="styles.css">\n</head>\n<body>\n  <div class="help-root">\n    <!-- 최상단 탭 영역 -->\n    <header class="help-header" role="banner">\n      <nav class="top-tabs" role="tablist" aria-label="도움말 대분류">\n        <div class="top-tabs-inner" id="topTabsContainer"></div>\n        <div class="top-tab-label" id="topTabLabel" aria-live="polite"></div>\n      </nav>\n    </header>\n\n    <!-- 우측 상단: 언어 선택 + 닫기 -->\n    <div class="help-header-right">\n      <select id="langSelect" class="lang-select" aria-label="언어 선택"></select>\n      <button type="button" class="btn-close" id="btnClose" aria-label="닫기">×</button>\n    </div>\n\n    <!-- 메인: 좌측 중단 탭 + 우측 본문 -->\n    <main class="help-main" role="main">\n      <!-- 좌측: 검색 + 중단 탭 목록 -->\n      <aside class="mid-panel" role="complementary">\n        <div class="mid-search-wrap">\n          <input type="search" class="mid-search" id="midSearch" placeholder="" aria-label="항목 검색" autocomplete="off">\n        </div>\n        <h2 class="mid-section-title" id="midSectionTitle"></h2>\n        <div class="mid-list-wrap">\n          <ul class="mid-list" id="midList" role="list"></ul>\n        </div>\n      </aside>\n\n      <!-- 우측: 본문 -->\n      <section class="body-panel" role="region" aria-label="도움말 본문">\n        <div class="body-content" id="bodyContent">\n          <div class="body-placeholder" id="bodyPlaceholder">항목을 선택하면 내용이 표시됩니다.</div>\n          <div class="body-inner" id="bodyInner" hidden>\n            <figure class="body-figure">\n              <div class="body-image-wrap">\n                <img class="body-image body-image-current" id="bodyImage" src="" alt="">\n                <img class="body-image body-image-next" id="bodyImageNext" src="" alt="" aria-hidden="true">\n              </div>\n              <div class="body-slideshow-indicator" id="bodySlideshowIndicator" aria-hidden="true" hidden></div>\n            </figure>\n            <div class="body-text-block">\n              <h3 class="body-title" id="bodyTitle"></h3>\n              <div class="body-description" id="bodyDescription"></div>\n            </div>\n            <nav class="body-pagination" id="bodyPagination" aria-label="본문 페이지" hidden>\n              <button type="button" class="btn-prev" id="btnPrev">이전 페이지</button>\n              <span class="body-pagination-dot" aria-hidden="true"></span>\n              <button type="button" class="btn-next" id="btnNext">다음 페이지</button>\n            </nav>\n          </div>\n        </div>\n      </section>\n    </main>\n\n  </div>\n  <!-- 데이터는 HTML 내장(help-data-XX) / localStorage(draft) / 또는 http에서 help-data-XX.json -->\n  ';
  var INDEX_HTML_SUFFIX = '<script type="application/json" id="help-data">{}</script>\n  <script src="lang.js"></script>\n  <script src="app.js"></script>\n</body>\n</html>';
  function buildIndexHtmlContent() {
    var full = getFullData();
    if (!full || (!full.ko && !full.topTabs)) return null;
    var langIds = ['ko', 'ja', 'en', 'zh-CN', 'zh-TW'];
    var fallback = full.ko || full.ja || full;
    var html = INDEX_HTML_PREFIX;
    for (var i = 0; i < langIds.length; i++) {
      var langId = langIds[i];
      var langData = full[langId] || fallback;
      html += '<script type="application/json" id="help-data-' + langId + '">' + JSON.stringify(langData) + '</script>\n  ';
    }
    html += INDEX_HTML_SUFFIX;
    return html;
  }
  function buildHelpEditorHtmlContent() {
    var full = getFullData();
    if (!full || (!full.ko && !full.topTabs)) return null;
    var html = document.documentElement.outerHTML;
    var langIds = ['ko', 'ja', 'en', 'zh-CN', 'zh-TW'];
    var fallback = full.ko || full.ja || full;
    for (var i = 0; i < langIds.length; i++) {
      var langId = langIds[i];
      var langData = full[langId] || fallback;
      var escaped = langId.replace(/-/g, '\\-');
      var regex = new RegExp('(id="help-data-' + escaped + '">)([\\s\\S]*?)(<\\/script>)');
      html = html.replace(regex, '$1' + JSON.stringify(langData) + '$3');
    }
    html = html.replace(/(id="help-data">)([\s\S]*?)(<\/script>)/, '$1{}$3');
    return html;
  }
  function saveIndexHtml() {
    var indexHtml = buildIndexHtmlContent();
    if (!indexHtml) {
      alert('저장할 도움말 데이터가 없습니다. 먼저 본문을 편집·저장하세요.');
      return;
    }
    try {
      var blob = new Blob([indexHtml], { type: 'text/html;charset=utf-8' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = 'index.html';
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      alert('index.html 다운로드에 실패했습니다: ' + (e && e.message));
    }
  }
  if (btnSaveIndexHtml) btnSaveIndexHtml.addEventListener('click', saveIndexHtml);

  var btnSaveHelpEditorHtml = document.getElementById('btnSaveHelpEditorHtml');
  function saveHelpEditorHtml() {
    var helpEditorHtml = buildHelpEditorHtmlContent();
    if (!helpEditorHtml) {
      alert('저장할 도움말 데이터가 없습니다. 먼저 본문을 편집·저장하세요.');
      return;
    }
    try {
      var blob = new Blob([helpEditorHtml], { type: 'text/html;charset=utf-8' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = 'Help_Editor.HTML';
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      alert('Help_Editor.HTML 다운로드에 실패했습니다: ' + (e && e.message));
    }
  }
  if (btnSaveHelpEditorHtml) btnSaveHelpEditorHtml.addEventListener('click', saveHelpEditorHtml);
})();
