(function (global) {
  'use strict';

  function createLanguageSelectorElement() {
    var languages = window.i18n ? window.i18n.getSupportedLanguages() : [];
    var current = window.i18n ? window.i18n.getCurrentLanguage() : 'en-IN';

    var wrap = document.createElement('div');
    wrap.className = 'medisys-lang-wrap';

    var flagImg = document.createElement('img');
    flagImg.className = 'medisys-lang-flag-img';
    flagImg.src = '/india-flag.svg';
    flagImg.alt = 'India Flag';

    var select = document.createElement('select');
    select.className = 'medisys-lang-select';
    select.setAttribute('aria-label', 'Select Language');

    languages.forEach(function (lang) {
      var opt = document.createElement('option');
      opt.value = lang.code;
      var tag = lang.shortCode || lang.code.split('-')[0].toUpperCase();
      opt.textContent = lang.name + ' (' + tag + ')';
      if (lang.code === current) {
        opt.selected = true;
      }
      select.appendChild(opt);
    });

    var icon = document.createElement('span');
    icon.className = 'medisys-lang-icon';
    icon.innerHTML = '&#9660;';

    wrap.appendChild(flagImg);
    wrap.appendChild(select);
    wrap.appendChild(icon);

    select.addEventListener('change', function (e) {
      if (window.i18n) {
        window.i18n.setLanguage(e.target.value);
      }
    });

    // Listen for language changes triggered elsewhere
    window.addEventListener('i18n:languageChanged', function (e) {
      if (e.detail && e.detail.lang) {
        select.value = e.detail.lang;
      }
    });

    return wrap;
  }

  function mountLanguageSelectors() {
    var containers = document.querySelectorAll('.medisys-lang-container');
    containers.forEach(function (container) {
      if (!container.querySelector('.medisys-lang-select')) {
        container.appendChild(createLanguageSelectorElement());
      }
    });
  }

  global.MedisysLanguageSelector = {
    createElement: createLanguageSelectorElement,
    mount: mountLanguageSelectors
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mountLanguageSelectors);
  } else {
    mountLanguageSelectors();
  }
})(typeof window !== 'undefined' ? window : this);
