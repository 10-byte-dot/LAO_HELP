/* 라스트오리진 도움말 추가 동작 (틀의 app.js 는 건드리지 않는다)
   1) 키보드 왼쪽·오른쪽 화살표로 이전·다음 쪽 넘기기
   2) 본문이 바뀌면 글을 맨 위에서부터 보여 주기
   3) 글이 칸을 넘치면 글자를 조금씩 줄여 맞추기(번역 대비) */
(function () {
  'use strict';

  function byId(id) { return document.getElementById(id); }

  // 글자를 입력하는 중에는 화살표 키를 가로채지 않는다.
  function isTyping(target) {
    if (!target) return false;
    var tag = (target.tagName || '').toLowerCase();
    return tag === 'input' || tag === 'textarea' || tag === 'select' || target.isContentEditable;
  }

  // 편집 화면의 팝업 창이 열려 있으면 넘기지 않는다.
  function isModalOpen() {
    var modals = document.querySelectorAll('.modal, .editor-modal, [role="dialog"]');
    for (var i = 0; i < modals.length; i++) {
      var m = modals[i];
      if (!m.hidden && m.offsetParent !== null) return true;
    }
    return false;
  }

  document.addEventListener('keydown', function (e) {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
    if (isTyping(e.target) || isModalOpen()) return;
    var nav = byId('bodyPagination');
    if (!nav || nav.hidden) return;
    var btn = byId(e.key === 'ArrowLeft' ? 'btnPrev' : 'btnNext');
    if (!btn || btn.disabled) return;
    e.preventDefault();
    btn.click();
  });

  // 본문 제목이 바뀌면(쪽을 넘기거나 다른 항목을 고르면) 스크롤을 맨 위로 돌린다.
  function watchTitle() {
    var title = byId('bodyTitle') || document.querySelector('.body-title');
    var scroller = byId('bodyContent');
    if (!title || !scroller || typeof MutationObserver === 'undefined') return;
    var last = title.textContent;
    new MutationObserver(function () {
      if (title.textContent === last) return;
      last = title.textContent;
      scroller.scrollTop = 0;
    }).observe(title, { childList: true, characterData: true, subtree: true });
  }

  // ===== 3) 글이 칸을 넘치면 글자를 조금씩 줄여 맞춘다 =====
  // 번역하면 글이 길어지는 언어가 있다. 글 칸(가로 화면) 또는 본문 칸(그 밖)이 넘치면
  // 글 묶음을 95% → 80%까지 5%씩 줄여 본다. 그래도 넘치면 그때만 스크롤을 남긴다.
  var FIT_MIN = 0.8;
  var FIT_STEP = 0.05;

  function textOverflows(block, content) {
    // 가로 화면에서는 글 칸만 따로 스크롤한다(lo-theme.css). 그때는 글 칸을 잰다.
    var own = window.getComputedStyle(block).overflowY;
    if (own === 'auto' || own === 'scroll') return block.scrollHeight > block.clientHeight + 1;
    return content.scrollHeight > content.clientHeight + 1;
  }

  function fitText() {
    var block = document.querySelector('.body-text-block');
    var content = byId('bodyContent');
    if (!block || !content || block.offsetParent === null) return;
    block.style.zoom = '';
    if (!textOverflows(block, content)) return;
    for (var z = 1 - FIT_STEP; z >= FIT_MIN - 0.001; z -= FIT_STEP) {
      block.style.zoom = z.toFixed(2);
      if (!textOverflows(block, content)) return;
    }
  }

  var fitQueued = false;
  function queueFit() {
    if (fitQueued) return;
    fitQueued = true;
    window.requestAnimationFrame(function () {
      fitQueued = false;
      fitText();
    });
  }

  function watchFit() {
    var content = byId('bodyContent');
    if (content && typeof MutationObserver !== 'undefined') {
      // 본문 글·제목이 바뀔 때(쪽 넘김, 항목·언어 바꿈)만 다시 맞춘다. zoom 바꾸기는 속성이라 감시하지 않는다.
      new MutationObserver(queueFit).observe(content, { childList: true, characterData: true, subtree: true });
    }
    window.addEventListener('resize', queueFit);
    window.addEventListener('orientationchange', queueFit);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(queueFit);
    queueFit();
  }

  function start() {
    watchTitle();
    watchFit();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }

  window.LoHelpFitText = fitText; // 점검용
})();
