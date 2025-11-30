import type { ChromeMessage, ChromeStorageData, ChromeBackgroundMessage } from '../types';

/**
 * Chrome extension utility functions
 */

/**
 * Load learning mode from Chrome storage
 */
export const loadLearningMode = (): Promise<boolean> => {
    return new Promise((resolve) => {
        try {
            if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
                chrome.storage.local.get("learningMode", (data: ChromeStorageData) => {
                    resolve(data?.learningMode ?? false);
                });
            } else {
                console.warn("chrome.storage not available, using default state.");
                resolve(false);
            }
        } catch (e) {
            console.warn("Error accessing chrome.storage", e);
            resolve(false);
        }
    });
};

/**
 * Check if the active tab is YouTube or PDF
 */
export const checkActiveTabType = (): Promise<{ isYouTube: boolean; isPdf: boolean }> => {
    return new Promise((resolve) => {
        try {
            if (typeof chrome !== "undefined" && chrome.tabs) {
                chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                    if (tabs.length > 0 && tabs[0].url) {
                        const url = tabs[0].url;
                        const isYouTube = url.includes("youtube.com/watch");
                        const isPdf = url.toLowerCase().endsWith(".pdf");
                        resolve({ isYouTube, isPdf });
                    } else {
                        resolve({ isYouTube: false, isPdf: false });
                    }
                });
            } else {
                console.warn("chrome.tabs not available.");
                resolve({ isYouTube: false, isPdf: false });
            }
        } catch (e) {
            console.warn("Error accessing chrome.tabs", e);
            resolve({ isYouTube: false, isPdf: false });
        }
    });
};

/**
 * Send warning message to content script
 */
export const sendWarningMessage = (
    action: 'PAUSE' | 'RESUME',
    isYouTubeActive: boolean,
    isPdfActive: boolean
): void => {
    if (!isYouTubeActive && !isPdfActive) {
        console.log("Ostrzeżenie: Aktywna karta nie jest ani YouTube, ani PDF. Ignorowanie PAUSE/RESUME.");
        return;
    }

    const targetUrl = isPdfActive ? "*://*/*.pdf" : "*://www.youtube.com/*";

    if (typeof chrome !== "undefined" && chrome.tabs) {
        chrome.tabs.query({ active: true, currentWindow: true, url: targetUrl }, (tabs) => {
            if (tabs.length > 0 && tabs[0].id) {
                const tabId = tabs[0].id;
                
                chrome.tabs.sendMessage(tabId, { action: action } as ChromeMessage, (response) => {
                    if (chrome.runtime.lastError) {
                        // Ignorujemy błędy Content Script
                    } else if (response) {
                        console.log("Odebrano odpowiedź z Content Script:", response.status);
                    }
                });
            }
        });
    }
};

/**
 * Update learning mode in Chrome storage and send message to background script
 */
export const updateLearningMode = (value: boolean): void => {
    try {
        const message: ChromeBackgroundMessage = {
            type: "SET_LEARNING_MODE",
            value
        };
        
        chrome.runtime.sendMessage(message);
        chrome.storage.local.set({ learningMode: value } as ChromeStorageData);
    } catch (e) {
        console.warn("Failed to send message to background", e);
    }
};