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

function install(aData, aReason) {}

function uninstall(aData, aReason) {}

function startup(aData, aReason) {
  AAA.init();
}

function shutdown(aData, aReason) {
  AAA.uninit();
}

let AAA = {
  init : function() {
    let gmm =
      Cc["@mozilla.org/globalmessagemanager;1"].
        getService(Ci.nsIMessageListenerManager);

    gmm.loadFrameScript("chrome://amo-admin-scripts/content/aaa.js", true);
  },

  uninit : function() {
    let gmm =
      Cc["@mozilla.org/globalmessagemanager;1"].
        getService(Ci.nsIMessageListenerManager);

    gmm.removeDelayedFrameScript("chrome://amo-admin-scripts/content/aaa.js");
    //gmm.sendAsyncMessage("aaa-unload");
  }
};
