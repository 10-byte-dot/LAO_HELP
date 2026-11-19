(function () {
  'use strict';

  var STORAGE_LANGUAGES = 'helpLanguages';
  var STORAGE_CURRENT = 'helpLanguage';

  var DEFAULT_LANGUAGES = [
    { id: 'ko', label: '한국어' },
    { id: 'ja', label: '일본어' },
    { id: 'en', label: '영어' },
    { id: 'zh-CN', label: '중국어 간체' },
    { id: 'zh-TW', label: '중국어 번체' }
  ];

  function getLanguages() {
    try {
      var saved = localStorage.getItem(STORAGE_LANGUAGES);
      if (saved) {
        var list = JSON.parse(saved);
        if (Array.isArray(list) && list.length > 0) return list;
      }
    } catch (e) {}
    return DEFAULT_LANGUAGES.slice();
  }

  function saveLanguages(list) {
    try {
      localStorage.setItem(STORAGE_LANGUAGES, JSON.stringify(list));
    } catch (e) {}
  }

  function getCurrentLanguage() {
    try {
      var id = localStorage.getItem(STORAGE_CURRENT);
      if (id) return id;
    } catch (e) {}
    return 'ko';
  }

  function setCurrentLanguage(id) {
    try {
      localStorage.setItem(STORAGE_CURRENT, id);
      if (typeof window.dispatchEvent === 'function') {
        window.dispatchEvent(new CustomEvent('helpLanguageChange', { detail: { language: id } }));
      }
    } catch (e) {}
  }

  window.HelpLang = window.HelpLang || {};
  window.HelpLang.getLanguages = getLanguages;
  window.HelpLang.saveLanguages = saveLanguages;
  window.HelpLang.getCurrentLanguage = getCurrentLanguage;
  window.HelpLang.setCurrentLanguage = setCurrentLanguage;
  window.HelpLang.DEFAULT_LANGUAGES = DEFAULT_LANGUAGES;
})();
