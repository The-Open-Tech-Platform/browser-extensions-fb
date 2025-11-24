(() => {
  "use strict";

  const DEFAULT_BLOCKED_EVENTS = [
    "visibilitychange",
    "webkitvisibilitychange",
    "mozvisibilitychange",
    "msvisibilitychange",
    "blur",
    "focus",
    "focusin",
    "focusout",
  ];

  const DEFAULT_BLACKLIST_DOMAINS = [];
  const DEFAULT_THEME = "light";

  let extensionEnabled = true;
  let blockEventsEnabled = true;
  let copyHelperEnabled = true;
  let currentTheme = DEFAULT_THEME;

  // Check if current domain is blacklisted
  function checkBlacklist(blacklistDomains) {
    return new Promise((resolve) => {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]) {
          try {
            const url = new URL(tabs[0].url);
            const currentHost = url.hostname;

            const isBlacklisted = blacklistDomains.some((pattern) => {
              const regexPattern = pattern.replace(/\./g, "\\.").replace(/\*/g, ".*");
              const regex = new RegExp(`^${regexPattern}$`);
              return regex.test(currentHost);
            });

            resolve(!isBlacklisted); // Extension works everywhere EXCEPT blacklisted domains
          } catch (e) {
            resolve(true); // If URL parsing fails, assume enabled
          }
        } else {
          resolve(true);
        }
      });
    });
  }

  // Load settings
  function loadSettings() {
    chrome.storage.sync.get(
      ["blockedEvents", "blacklistDomains", "highlightEnabled", "extensionEnabled", "theme"],
      async (result) => {
        const blockedEvents = result.blockedEvents || DEFAULT_BLOCKED_EVENTS;
        const blacklistDomains = result.blacklistDomains || DEFAULT_BLACKLIST_DOMAINS;
        extensionEnabled = result.extensionEnabled !== undefined ? result.extensionEnabled : true;
        blockEventsEnabled = blockedEvents.length > 0;
        copyHelperEnabled = result.highlightEnabled !== undefined ? result.highlightEnabled : true;
        currentTheme = result.theme || DEFAULT_THEME;

        // Check if extension should be enabled for current tab
        const shouldBeEnabled = await checkBlacklist(blacklistDomains);
        // Only disable if explicitly disabled OR blacklisted
        if (result.extensionEnabled === false) {
          extensionEnabled = false;
        } else {
          extensionEnabled = shouldBeEnabled;
        }

        updateUI();
        applyTheme();
      }
    );
  }

  // Update UI based on settings
  function updateUI() {
    const extensionToggle = document.getElementById("extensionEnabled");
    const blockEventsToggle = document.getElementById("blockEvents");
    const copyHelperToggle = document.getElementById("copyHelper");
    const statusText = document.getElementById("statusText");

    if (extensionEnabled) {
      extensionToggle.classList.add("active");
    } else {
      extensionToggle.classList.remove("active");
    }

    if (blockEventsEnabled) {
      blockEventsToggle.classList.add("active");
    } else {
      blockEventsToggle.classList.remove("active");
    }

    if (copyHelperEnabled) {
      copyHelperToggle.classList.add("active");
    } else {
      copyHelperToggle.classList.remove("active");
    }

    statusText.textContent = extensionEnabled
      ? "Расширение активно"
      : "Расширение отключено";
  }

  // Apply theme
  function applyTheme() {
    if (currentTheme === "dark") {
      document.body.classList.add("dark-theme");
    } else {
      document.body.classList.remove("dark-theme");
    }
  }

  // Save settings
  function saveSettings() {
    const blockedEvents = blockEventsEnabled ? DEFAULT_BLOCKED_EVENTS : [];
    
    chrome.storage.sync.set(
      {
        extensionEnabled,
        blockedEvents,
        highlightEnabled: copyHelperEnabled,
      },
      () => {
        updateUI();
        // Reload current tab to apply changes
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          if (tabs[0]) {
            chrome.tabs.reload(tabs[0].id);
          }
        });
      }
    );
  }

  // Event listeners
  document.getElementById("extensionEnabled").addEventListener("click", function () {
    extensionEnabled = !extensionEnabled;
    saveSettings();
  });

  document.getElementById("blockEvents").addEventListener("click", function () {
    blockEventsEnabled = !blockEventsEnabled;
    saveSettings();
  });

  document.getElementById("copyHelper").addEventListener("click", function () {
    copyHelperEnabled = !copyHelperEnabled;
    saveSettings();
  });

  document.getElementById("openSettings").addEventListener("click", function () {
    chrome.runtime.openOptionsPage();
  });

  // Load settings on popup open
  loadSettings();

  // Listen for storage changes
  chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === "sync") {
      loadSettings();
    }
  });
})();

