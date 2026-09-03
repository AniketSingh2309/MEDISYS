(function (global) {
  'use strict';

  var SUPPORTED_LANGUAGES = [
    { code: 'en-IN', name: 'English', shortCode: 'EN', flag: '🇮🇳' },
    { code: 'hi-IN', name: 'हिन्दी', shortCode: 'HI', flag: '🇮🇳' },
    { code: 'pa-IN', name: 'ਪੰਜਾਬੀ', shortCode: 'PA', flag: '🇮🇳' },
    { code: 'kn-IN', name: 'ಕನ್ನಡ', shortCode: 'KN', flag: '🇮🇳' },
    { code: 'mr-IN', name: 'मराठी', shortCode: 'MR', flag: '🇮🇳' },
    { code: 'gu-IN', name: 'ગુજરાતી', shortCode: 'GU', flag: '🇮🇳' },
    { code: 'bn-IN', name: 'বাংলা', shortCode: 'BN', flag: '🇮🇳' },
    { code: 'ta-IN', name: 'தமிழ்', shortCode: 'TA', flag: '🇮🇳' },
    { code: 'te-IN', name: 'తెలుగు', shortCode: 'TE', flag: '🇮🇳' },
    { code: 'ml-IN', name: 'മലയാളം', shortCode: 'ML', flag: '🇮🇳' },
    { code: 'or-IN', name: 'ଓଡ଼ିਆ', shortCode: 'OR', flag: '🇮🇳' },
    { code: 'as-IN', name: 'অসমীয়া', shortCode: 'AS', flag: '🇮🇳' }
  ];

  var DEFAULT_LANG = 'en-IN';
  var STORAGE_KEY = 'medisys_lang';

  var state = {
    currentLang: DEFAULT_LANG,
    resources: {},
    fallbackResources: null,
    isInitialized: false,
    initPromise: null
  };

  function resolveNestedKey(obj, path) {
    if (!obj || !path) return null;
    if (typeof obj[path] === 'string') return obj[path];
    var keys = path.split('.');
    var current = obj;
    for (var i = 0; i < keys.length; i++) {
      if (current === undefined || current === null) return null;
      current = current[keys[i]];
    }
    return typeof current === 'string' ? current : null;
  }

  function fetchLocaleResource(langCode) {
    var url = '/locales/' + langCode + '.json';
    return fetch(url)
      .then(function (res) {
        if (!res.ok) {
          throw new Error('Failed to load locale resource: ' + langCode);
        }
        return res.json();
      })
      .catch(function (err) {
        console.warn('[i18n] Error loading resource for ' + langCode + ':', err);
        return null;
      });
  }

  function detectInitialLanguage() {
    // 1. URL parameter (?lang=hi-IN)
    try {
      var params = new URLSearchParams(window.location.search);
      var urlLang = params.get('lang');
      if (urlLang && isSupported(urlLang)) {
        return urlLang;
      }
    } catch (e) {}

    // 2. Saved localStorage preference
    try {
      var saved = localStorage.getItem(STORAGE_KEY);
      if (saved && isSupported(saved)) {
        return saved;
      }
    } catch (e) {}

    // 3. Browser language detection
    try {
      var navLang = (navigator.language || navigator.userLanguage || '').toLowerCase();
      for (var i = 0; i < SUPPORTED_LANGUAGES.length; i++) {
        var code = SUPPORTED_LANGUAGES[i].code;
        if (code.toLowerCase() === navLang || code.split('-')[0].toLowerCase() === navLang.split('-')[0]) {
          return code;
        }
      }
    } catch (e) {}

    // 4. Default fallback (en-IN)
    return DEFAULT_LANG;
  }

  function isSupported(langCode) {
    for (var i = 0; i < SUPPORTED_LANGUAGES.length; i++) {
      if (SUPPORTED_LANGUAGES[i].code === langCode) return true;
    }
    return false;
  }

  function interpolate(template, params) {
    if (!params || typeof params !== 'object') return template;
    return template.replace(/\{(\w+)\}/g, function (match, key) {
      return params[key] !== undefined ? params[key] : match;
    });
  }

  var LanguageManager = {
    getSupportedLanguages: function () {
      return SUPPORTED_LANGUAGES.slice();
    },

    getCurrentLanguage: function () {
      return state.currentLang;
    },

    init: function (customLang) {
      if (state.initPromise) return state.initPromise;

      var targetLang = customLang && isSupported(customLang) ? customLang : detectInitialLanguage();
      state.currentLang = targetLang;

      state.initPromise = Promise.all([
        fetchLocaleResource(DEFAULT_LANG),
        targetLang !== DEFAULT_LANG ? fetchLocaleResource(targetLang) : Promise.resolve(null)
      ]).then(function (results) {
        state.fallbackResources = results[0] || {};
        if (targetLang === DEFAULT_LANG) {
          state.resources[DEFAULT_LANG] = state.fallbackResources;
        } else if (results[1]) {
          state.resources[targetLang] = results[1];
        } else {
          state.currentLang = DEFAULT_LANG;
          state.resources[DEFAULT_LANG] = state.fallbackResources;
        }

        state.isInitialized = true;
        LanguageManager.applyTranslations();

        return state.currentLang;
      });

      return state.initPromise;
    },

    setLanguage: function (langCode) {
      if (!isSupported(langCode)) {
        console.warn('[i18n] Unsupported language requested:', langCode);
        return Promise.reject(new Error('Unsupported language'));
      }

      if (state.currentLang === langCode && state.resources[langCode]) {
        LanguageManager.applyTranslations();
        return Promise.resolve(langCode);
      }

      var loadPromise = state.resources[langCode]
        ? Promise.resolve(state.resources[langCode])
        : fetchLocaleResource(langCode);

      return loadPromise.then(function (data) {
        if (!data && langCode !== DEFAULT_LANG) {
          console.warn('[i18n] Failed to load ' + langCode + ', falling back to ' + DEFAULT_LANG);
          langCode = DEFAULT_LANG;
        }

        if (data) {
          state.resources[langCode] = data;
        }

        state.currentLang = langCode;
        try {
          localStorage.setItem(STORAGE_KEY, langCode);
        } catch (e) {}

        LanguageManager.applyTranslations();

        // Dispatch custom event for dynamic components
        var event;
        if (typeof CustomEvent === 'function') {
          event = new CustomEvent('i18n:languageChanged', { detail: { lang: langCode } });
        } else {
          event = document.createEvent('CustomEvent');
          event.initCustomEvent('i18n:languageChanged', true, true, { lang: langCode });
        }
        window.dispatchEvent(event);

        return langCode;
      });
    },

    t: function (key, params) {
      if (!key) return '';

      var activeResource = state.resources[state.currentLang];
      var val = resolveNestedKey(activeResource, key);

      // Fallback to en-IN if key missing in target language
      if (!val && state.currentLang !== DEFAULT_LANG) {
        val = resolveNestedKey(state.fallbackResources, key);
      }

      if (!val) {
        if (window.MEDISYS_DEBUG_I18N) {
          console.warn('[i18n] Missing translation key: "' + key + '" for lang: ' + state.currentLang);
        }
        return key;
      }

      return interpolate(val, params);
    },

    applyTranslations: function (root) {
      var container = root || document;

      // Update HTML lang and direction attributes
      var currentRes = state.resources[state.currentLang] || state.fallbackResources;
      if (currentRes && currentRes._meta) {
        if (document.documentElement) {
          document.documentElement.setAttribute('lang', currentRes._meta.code || state.currentLang);
          document.documentElement.setAttribute('dir', currentRes._meta.direction || 'ltr');
        }
      }

      // 1. data-i18n (Text Content)
      var textElements = container.querySelectorAll('[data-i18n]');
      for (var i = 0; i < textElements.length; i++) {
        var el = textElements[i];
        var key = el.getAttribute('data-i18n');
        if (key) {
          var translated = LanguageManager.t(key);
          if (translated !== key || !el.textContent) {
            el.textContent = translated;
          }
        }
      }

      // 2. data-i18n-placeholder
      var placeholderElements = container.querySelectorAll('[data-i18n-placeholder]');
      for (var j = 0; j < placeholderElements.length; j++) {
        var pEl = placeholderElements[j];
        var pKey = pEl.getAttribute('data-i18n-placeholder');
        if (pKey) {
          pEl.placeholder = LanguageManager.t(pKey);
        }
      }

      // 3. data-i18n-title
      var titleElements = container.querySelectorAll('[data-i18n-title]');
      for (var k = 0; k < titleElements.length; k++) {
        var tEl = titleElements[k];
        var tKey = tEl.getAttribute('data-i18n-title');
        if (tKey) {
          tEl.title = LanguageManager.t(tKey);
        }
      }

      // 4. data-i18n-aria-label
      var ariaElements = container.querySelectorAll('[data-i18n-aria-label]');
      for (var l = 0; l < ariaElements.length; l++) {
        var aEl = ariaElements[l];
        var aKey = aEl.getAttribute('data-i18n-aria-label');
        if (aKey) {
          aEl.setAttribute('aria-label', LanguageManager.t(aKey));
        }
      }

      // 5. data-i18n-label — for elements whose visible text lives in a
      // `label` attribute rather than textContent (e.g. <optgroup label="...">
      // inside a <select>, which can't hold child text nodes at all).
      var labelAttrElements = container.querySelectorAll('[data-i18n-label]');
      for (var m = 0; m < labelAttrElements.length; m++) {
        var lEl = labelAttrElements[m];
        var lKey = lEl.getAttribute('data-i18n-label');
        if (lKey) {
          lEl.setAttribute('label', LanguageManager.t(lKey));
        }
      }
    }
  };

  // Expose global i18n
  global.i18n = LanguageManager;

  // Auto-init on DOMContentLoaded if script loaded in head/body
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      LanguageManager.init();
    });
  } else {
    LanguageManager.init();
  }

})(typeof window !== 'undefined' ? window : this);
