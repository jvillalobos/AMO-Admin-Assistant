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
const UNLOAD_MSG = "aaa@xulforge.com:unload"

function install(aData, aReason) {}

function uninstall(aData, aReason) {}

function startup(aData, aReason) {
  ContentScript.init();
}

function shutdown(aData, aReason) {
  ContentScript.uninit();
}

let ContentScript = {
  _scriptURL : null,

  init : function() {
    let gmm =
      Cc["@mozilla.org/globalmessagemanager;1"].
        getService(Ci.nsIMessageListenerManager);

    this._scriptURL = SCRIPT_URL + "?" + Math.random();

    gmm.loadFrameScript(this._scriptURL, true);
  },

  uninit : function() {
    let gmm =
      Cc["@mozilla.org/globalmessagemanager;1"].
        getService(Ci.nsIMessageListenerManager);

    // prevent future tabs from loading the script.
    gmm.removeDelayedFrameScript(this._scriptURL);
    gmm.broadcastAsyncMessage(UNLOAD_MSG, this._scriptURL);
  }
};
