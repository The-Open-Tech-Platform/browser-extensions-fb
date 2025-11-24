// This script runs in the content script context and can access chrome.storage
// It bridges the settings between chrome.storage and the MAIN world content script

const DEFAULT_BLOCKED_EVENTS = [
    "visibilitychange",
    "webkitvisibilitychange",
    "mozvisibilitychange",
    "msvisibilitychange",
    "blur",
    "focus",
    "focusin",
    "focusout"
];

const DEFAULT_BLACKLIST_DOMAINS = [];

// Check if current domain is blacklisted (excluded)
function checkBlacklist(blacklistDomains) {
    const currentHost = window.location.hostname;
    
    return blacklistDomains.some(pattern => {
        // Convert wildcard pattern to regex
        const regexPattern = pattern
            .replace(/\./g, '\\.')
            .replace(/\*/g, '.*');
        const regex = new RegExp(`^${regexPattern}$`);
        return regex.test(currentHost);
    });
}

// Load initial settings
chrome.storage.sync.get(['blockedEvents', 'blacklistDomains', 'extensionEnabled'], (result) => {
    const blockedEvents = result.blockedEvents || DEFAULT_BLOCKED_EVENTS;
    const blacklistDomains = result.blacklistDomains || DEFAULT_BLACKLIST_DOMAINS;
    const extensionEnabled = result.extensionEnabled !== undefined ? result.extensionEnabled : true;
    // Extension works everywhere EXCEPT blacklisted domains AND if extensionEnabled is true
    const isEnabled = extensionEnabled && !checkBlacklist(blacklistDomains);
    
    window.postMessage({ 
        type: 'FOCUS_BLOCKER_SETTINGS', 
        blockedEvents,
        isEnabled
    }, '*');
});

// Listen for changes in settings
chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'sync') {
        chrome.storage.sync.get(['blockedEvents', 'blacklistDomains', 'extensionEnabled'], (result) => {
            const blockedEvents = result.blockedEvents || DEFAULT_BLOCKED_EVENTS;
            const blacklistDomains = result.blacklistDomains || DEFAULT_BLACKLIST_DOMAINS;
            const extensionEnabled = result.extensionEnabled !== undefined ? result.extensionEnabled : true;
            // Extension works everywhere EXCEPT blacklisted domains AND if extensionEnabled is true
            const isEnabled = extensionEnabled && !checkBlacklist(blacklistDomains);
            
            window.postMessage({ 
                type: 'FOCUS_BLOCKER_SETTINGS', 
                blockedEvents,
                isEnabled
            }, '*');
        });
    }
});