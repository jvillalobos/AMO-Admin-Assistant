/**
 * Copyright 2013 Jorge Villalobos
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0

 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 **/

"use strict";

const Cc = Components.classes;
const Ci = Components.interfaces;

const SCRIPT_URL = "chrome://amo-admin-scripts/content/aaa.js";
const UNLOAD_MSG = "amo-admin-unload"

function install(aData, aReason) {}

function uninstall(aData, aReason) {}

function startup(aData, aReason) {
  ContentScript.init();
}

function shutdown(aData, aReason) {
  ContentScript.uninit();
}

let ContentScript = {
  init : function() {
    let gmm =
      Cc["@mozilla.org/globalmessagemanager;1"].
        getService(Ci.nsIMessageListenerManager);

    gmm.loadFrameScript(SCRIPT_URL, true);
  },

  uninit : function() {
    let gmm =
      Cc["@mozilla.org/globalmessagemanager;1"].
        getService(Ci.nsIMessageListenerManager);
    let wm =
      Cc["@mozilla.org/appshell/window-mediator;1"].
        getService(Ci.nsIWindowMediator);
    let enumerator = wm.getEnumerator("navigator:browser");

    // prevent future tabs from loading the script.
    gmm.removeDelayedFrameScript(SCRIPT_URL);

    // deactivate the script in all opened tabs.
    while (enumerator.hasMoreElements()) {
      let win = enumerator.getNext();
      let isMobile = (null == win.gBrowser);
      let browsers =
        (isMobile ? win.BrowserApp.tabs : win.gBrowser.browsers);

      for (let i = 0; i < browsers.length; i++) {
        let browser = (isMobile ? browsers[i].browser : browsers[i]);

        browser.messageManager.sendAsyncMessage(UNLOAD_MSG);
      }
    }
  }
};
