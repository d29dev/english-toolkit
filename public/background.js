chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "GET_ACTIVE_TAB") {
    chrome.tabs.query({ active: true, lastFocusedWindow: true }, (tabs) => {
      const tab = tabs[0];
      sendResponse({
        title: tab?.title || "Unknown",
        url: tab?.url || "",
      });
    });

    return true;
  }
});
const panelState = new Map();

chrome.sidePanel.onOpened.addListener(({ windowId }) => {
  {
    panelState.set(windowId, true);
  }
});

chrome.sidePanel.onClosed.addListener(({ windowId }) => {
  {
    panelState.set(windowId, false);
  }
});

chrome.commands.onCommand.addListener(async (command, tab) => {
  if (command === "toggle-panel") {
    chrome.sidePanel[!panelState.get(tab.windowId) ? "open" : "close"]({ windowId: tab.windowId });
    console.log((tab.windowId))
  }
});
