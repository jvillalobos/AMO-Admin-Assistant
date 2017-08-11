const RE_AMO =
  /^https\:\/\/addons(?:-dev)?\.(?:mozilla|allizom)\.org(\/.*)?$/i;
const ADMIN_SERVER = "https://addons-internal.prod.mozaws.net";

browser.browserAction.onClicked.addListener(function() {
  let tabsPromise = browser.tabs.query({ active: true, currentWindow: true });

  tabsPromise.then((tabs) => {
    let currentTab = tabs[0];

    if ((currentTab != null) && currentTab.url.match(RE_AMO)) {
      let newURL = currentTab.url.replace(RE_AMO, ADMIN_SERVER + "$1");

      browser.tabs.update(currentTab.id, { url: newURL });
    }
  });
});
