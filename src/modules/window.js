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

var EXPORTED_SYMBOLS = [ "WindowObserver" ];

const Cc = Components.classes;
const Ci = Components.interfaces;

let WindowObserver = {
  /* Map of added window listeners. */
  _listeners : {},

  /**
   * Adds a window open observer, which is run for every window that has been
   * opened or will be opened.
   * @param aName a unique name for the observer.
   * @param aCallback the callback function that is called for every open window
   * and every window that will be opened.
   */
  add : function(aName, aCallback) {
    let wm =
      Cc["@mozilla.org/appshell/window-mediator;1"].
        getService(Ci.nsIWindowMediator);
    let enumerator = wm.getEnumerator("navigator:browser");
    let windowListener = new WindowListener(aCallback);

    while (enumerator.hasMoreElements()) {
      aCallback(enumerator.getNext());
    }

    wm.addListener(windowListener);
    this._listeners[aName] = windowListener;
  },

  /**
   * Removes a window open observer.
   * @param aName a unique name for the observer.
   * @param aCallback the callback function that is called for every open
   * window (can be null).
   */
  remove : function(aName, aCallback) {
    let wm =
      Cc["@mozilla.org/appshell/window-mediator;1"].
        getService(Ci.nsIWindowMediator);
    let enumerator = wm.getEnumerator("navigator:browser");

    wm.removeListener(this._listeners[aName]);
    this._listeners[aName] = null;

    if (null != aCallback) {
      while (enumerator.hasMoreElements()) {
        aCallback(enumerator.getNext());
      }
    }
  }
};

function WindowListener(aCallback) {
  this._callback = aCallback;
};

WindowListener.prototype = {
    onOpenWindow : function(xulWindow) {
      // A new window has opened.
      let that = this;
      let domWindow =
        xulWindow.QueryInterface(Ci.nsIInterfaceRequestor).
        getInterface(Ci.nsIDOMWindow);

      // Wait for it to finish loading
      domWindow.addEventListener(
        "load",
        function listener() {
          domWindow.removeEventListener("load", listener, false);
          // If this is a browser window then setup its UI
          if (domWindow.document.documentElement.getAttribute("windowtype") ==
              "navigator:browser") {
            that._callback(domWindow);
          }
      }, false);
    },
    onCloseWindow : function(xulwindow) {},
    onWindowTitleChange: function(xulWindow, newTitle) {}
};
