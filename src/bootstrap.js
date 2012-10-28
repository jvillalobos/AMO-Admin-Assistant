/**
 * Copyright 2012 Jorge Villalobos
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

const RE_DOMAINS = /(?:mozilla|allizom)\.(?:org|com)/i;
const RE_LISTING_PAGE =
  /^(?:https\:\/\/addons(?:-dev)?\.(?:mozilla|allizom)\.org)?\/(?:z\/)?(?:[a-z]{2}(?:\-[a-z]{2})?\/)?(?:(?:firefox|thunderbird|seamonkey|mobile|android)\/)?addon\/([^\/]+)/i;
const RE_EDIT_PAGE =
  /^(?:https\:\/\/addons(?:-dev)?\.(?:mozilla|allizom)\.org)?\/(?:z\/)?(?:[a-z]{2}(?:\-[a-z]{2})?\/)?developers\/addon\/([^\/]+)/i;
const RE_IS_PREVIEW = /^https\:\/\/addons-dev\.allizom\.org/i;
const RE_FILE_VIEWER =
  /^(?:https\:\/\/addons(?:-dev)?\.(?:mozilla|allizom)\.org)?\/(?:z\/)?(?:[a-z]{2}(?:\-[a-z]{2})?\/)?(?:(?:firefox|thunderbird|seamonkey|mobile|android)\/)?files\//i;
const RE_ADDONS_MXR = /^https:\/\/mxr\.mozilla\.org\/addons\//i;
const RE_MXR_LINK = /\/addons\/source\/([0-9]+)\//;

function install(aData, aReason) {}

function uninstall(aData, aReason) {}

function startup(aData, aReason) {
  AAA.init();
}

function shutdown(aData, aReason) {
  AAA.uninit();
}

let AAA = {
  windowListener :
    {
      addListener : function(aWindow) {
        aWindow.AAAListener =
          function(aEvent) { AAA.handleLoad(aEvent); };
        aWindow.gBrowser.addEventListener(
          "load", aWindow.AAAListener, true, true);
      },

      removeListener : function(aWindow) {
        aWindow.gBrowser.removeEventListener(
          "load", aWindow.AAAListener, true, true);
        aWindow.AAAListener = null;
      },

      onOpenWindow : function(xulWindow) {
        // A new window has opened.
        let that = this;
        let domWindow =
          xulWindow.QueryInterface(Ci.nsIInterfaceRequestor).
          getInterface(Ci.nsIDOMWindowInternal);

        // Wait for it to finish loading
        domWindow.addEventListener(
          "load",
          function listener() {
            domWindow.removeEventListener("load", listener, false);
            // If this is a browser window then setup its UI
            if (domWindow.document.documentElement.getAttribute("windowtype") ==
                "navigator:browser") {
              that.addListener(domWindow);
            }
        }, false);
      },
      onCloseWindow : function(xulwindow) {},
      onWindowTitleChange: function(xulWindow, newTitle) {}
    },

  init : function() {
    let wm =
      Cc["@mozilla.org/appshell/window-mediator;1"].
        getService(Ci.nsIWindowMediator);
    let enumerator = wm.getEnumerator("navigator:browser");

    while (enumerator.hasMoreElements()) {
      this.windowListener.addListener(enumerator.getNext());
    }

    wm.addListener(this.windowListener);
  },

  uninit : function() {
    let wm =
      Cc["@mozilla.org/appshell/window-mediator;1"].
        getService(Ci.nsIWindowMediator);
    let enumerator = wm.getEnumerator("navigator:browser");

    wm.removeListener(this.windowListener);

    while (enumerator.hasMoreElements()) {
      this.windowListener.removeListener(enumerator.getNext());
    }
  },

  handleLoad : function (aEvent) {
    let doc = aEvent.originalTarget;

    // do a quick domain test to filter out pages were aren't interested in.
    if (RE_DOMAINS.test(doc.location.hostname)) {
      let handler = new AAAHandler(doc);

      handler.run();
    }
  }
};

function AAAHandler(aDocument) {
  this._doc = aDocument;
  this._href = aDocument.location.href;
};

AAAHandler.prototype = {
  /**
   * Runs the AAA handler in the given document.
   */
  run : function() {
    let matchListing = this._href.match(RE_LISTING_PAGE, "ig");

    if (matchListing && (2 <= matchListing.length)) {
      this._log("Found an AMO listing page.");
      // this is an AMO listing page. matchListing[1] is the add-on slug.
      this._modifyListingPage(matchListing[1]);
    } else {
      let matchEdit = this._href.match(RE_EDIT_PAGE, "ig");

      if (matchEdit && (2 <= matchEdit.length)) {
        this._log("Found an AMO edit page.");
        // this is an AMO listing page. matchEdit[1] is the add-on slug.
        this._modifyEditPage(matchEdit[1]);
      } else if (RE_ADDONS_MXR.test(this._href)) {
        this._log("Found an add-ons MXR page.");
        this._addLinksToMXR();
      } else if (RE_FILE_VIEWER.test(this._href)) {
        this._log("Found a source viewer page.");
        this._widenSourceViewer();
      }
    }
  },

  /**
   * Adds a few useful admin links to listing pages, and exposes the internal
   * add-on id.
   */
  _modifyListingPage : function(aSlug) {
    let addonNode = this._doc.getElementById("addon");
    let is404 = (null == addonNode);
    let adminLink = this._createAdminLink(aSlug);
    let reviewLink = this._createReviewLink(aSlug);
    let insertionPoint = null;

    if (!is404) {
      this._showAddonId(addonNode);
      insertionPoint = this._getSingleXPath("//div[@class='widgets']");

      if (null == insertionPoint) {
        this._log("There's no widgets section!");
      }
    } else {
      this._log("There is no add-on node. This may be a 404 page.");

      let aside = this._getSingleXPath("//aside[@class='secondary']");

      if (null != aside) {
        insertionPoint = this._doc.createElement("div");
        insertionPoint.setAttribute("style", "margin-top: 1em;");
        aside.appendChild(insertionPoint);
      }
    }

    if (null != insertionPoint) {
      adminLink.setAttribute("class", "collection-add widget collection");
      insertionPoint.appendChild(adminLink);

      if (is404) {
        insertionPoint.appendChild(this._doc.createElement("br"));
      }

      reviewLink.setAttribute("class", "collection-add widget collection");
      insertionPoint.appendChild(reviewLink);

      if (is404) {
        let editLink = this._createEditLink(aSlug);

        editLink.setAttribute("class", "collection-add widget collection");
        insertionPoint.appendChild(this._doc.createElement("br"));
        insertionPoint.appendChild(editLink);
      }
    } else {
      this._log("Insertion point could not be found.");
    }
  },

  /**
   * Adds a few useful admin links to edit pages, and exposes the internal
   * add-on id.
   */
  _modifyEditPage : function(aSlug) {
    let result =
      this._getSingleXPath(
        "//ul[@class='refinements'][2]/li/a[contains(@href, '/addon/" + aSlug + "/')]");
    let insertionPoint = result.parentNode;

    if (null != insertionPoint) {
      let adminLink = this._createAdminLink(aSlug);
      let reviewLink = this._createReviewLink(aSlug);
      let container = this._doc.createElement("li");

      container.appendChild(adminLink);
      insertionPoint.insertBefore(
        container, insertionPoint.firstChild.nextSibling);

      container = this._doc.createElement("li");
      container.appendChild(reviewLink);
      insertionPoint.insertBefore(
        container, insertionPoint.firstChild.nextSibling);
    } else {
      this._log("Insertion point could not be found.");
    }
  },

  /**
   * Makes the numeric add-on id visible in add-on listing pages.
   * @param aAddonNode the node that holds the numeric add-on id.
   */
  _showAddonId : function(aAddonNode) {
    let addonId = aAddonNode.getAttribute("data-id");
    let titleNode = this._getSingleXPath("//h1[@class='addon']");
    let numberSpan = this._doc.createElement("span");
    let spanContent = this._doc.createTextNode("[" + addonId + "]");

    numberSpan.appendChild(spanContent);
    numberSpan.setAttribute("class", "version-number");
    titleNode.appendChild(numberSpan);
  },

  /**
   * Makes the source code viewer much wider so it is easier to read.
   */
  _widenSourceViewer : function() {
    if (RE_FILE_VIEWER.test(this._doc.defaultView.location.href)) {
      let rootNode = this._doc.body.firstElementChild;
      let contentNode = this._doc.getElementById("content-wrapper");

      rootNode.setAttribute("style", "width: 90%; max-width: inherit;");
      contentNode.style.paddingLeft = "15%";
    }
  },

  /**
   * Adds add-on links to AMO from the add-ons MXR.
   */
  _addLinksToMXR : function() {
    try {
      let xpath =
        Cc["@mozilla.org/dom/xpath-evaluator;1"].
          createInstance(Ci.nsIDOMXPathEvaluator);
      let result =
        xpath.evaluate(
        "//a[number(substring-before(substring(@href,16), '/')) > 0 and " +
        "string-length(substring-after(substring(@href,16), '/')) = 0]",
      this._doc, null, Ci.nsIDOMXPathResult.UNORDERED_NODE_SNAPSHOT_TYPE, null);
      let link;
      let editLink;
      let match;

      for (let i = 0 ; i < result.snapshotLength ; i++) {
        link = result.snapshotItem(i);
        match = link.getAttribute("href").match(RE_MXR_LINK, "ig");

        if (match && (2 <= match.length)) {
          editLink = this._createEditLink(match[1], "[Edit on AMO]");
          editLink.setAttribute("style", "margin-left: 0.4em;");
          link.parentNode.insertBefore(editLink, link.nextSibling);
        } else {
          this._log("Error getting add-on id from link.");
        }
      }
    } catch (e) {
      this._log("_addLinksToMXR error:\n" + e);
    }
  },

  _isPreview : function() {
    return RE_IS_PREVIEW.test(this._href);
  },

  _createAdminLink : function(aId) {
    let link =
      this._createLink(
        "Admin this Add-on", "/admin/addon/manage/$(PARAM)", aId);

    return link;
  },

  _createEditLink : function(aId, aText) {
    let link =
      this._createLink(
        ((null != aText) ? aText : "Edit this Add-on"),
        "/developers/addon/$(PARAM)/edit/", aId);

    return link;
  },

  _createReviewLink : function(aId) {
    let link =
      this._createLink(
        "Review this Add-on", "/editors/review/$(PARAM)", aId);

    return link;
  },

  _createLink : function(aText, aPath, aParameter) {
    let isPreview = this._isPreview();
    let link = this._doc.createElement("a");
    let linkContent = this._doc.createTextNode(aText);
    let domain = (!isPreview ? "addons.mozilla.org" : "addons-dev.allizom.org");
    let href = "https://" + domain + aPath;

    href = href.replace("$(PARAM)", aParameter);
    link.setAttribute("href", href);
    link.appendChild(linkContent);

    return link;
  },

  /**
   * Gets a single node using an XPath expression.
   */
  _getSingleXPath : function(aXPathExp) {
    let node = null;

    try {
      let xpath =
        Cc["@mozilla.org/dom/xpath-evaluator;1"].
          createInstance(Ci.nsIDOMXPathEvaluator);
      let xpathResult =
        xpath.evaluate(
          aXPathExp, this._doc.documentElement, null,
          Ci.nsIDOMXPathResult.FIRST_ORDERED_NODE_TYPE, null);

      node = xpathResult.singleNodeValue;
    } catch (e) {
      this._log("Error getting node using XPATH:\n" + e);
    }

    return node;
  },

  _log : function (aText) {
    this._doc.defaultView.console.log(aText);
  }
};
