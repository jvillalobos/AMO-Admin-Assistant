/**
 * Copyright 2016 Jorge Villalobos
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

const AAA_RE_AMO_DOMAINS = /addons(?:-dev)?\.(?:mozilla|allizom)\.org/i;
const AAA_RE_LISTING_PAGE =
  /^\/(?:[a-z]{2}(?:\-[a-z]{2})?\/)?(?:(?:firefox|thunderbird|seamonkey|mobile|android)\/)?addon\/([^\/]+)(?:\/)?$/i;
const AAA_RE_EDIT_PAGE =
  /^\/(?:[a-z]{2}(?:\-[a-z]{2})?\/)?developers\/addon\/([^\/]+)(?:\/([^\/]+))?/i;
const AAA_RE_BG_THEME_EDIT_PAGE =
  /^\/(?:[a-z]{2}(?:\-[a-z]{2})?\/)?developers\/theme\/([^\/]+)(?:\/([^\/]+))?/i;
const AAA_RE_USER_PAGE =
  /^\/(?:[a-z]{2}(?:\-[a-z]{2})?\/)?(?:(?:firefox|thunderbird|seamonkey|mobile|android)\/)?user\//i;
const AAA_RE_USER_ADMIN_PAGE =
  /^\/(?:[a-z]{2}(?:\-[a-z]{2})?\/)?admin\/models\/(?:(?:auth\/user\/)|(?:users\/userprofile\/))([0-9]+)?/i;
const AAA_RE_COLLECTION_PAGE =
  /^\/(?:[a-z]{2}(?:\-[a-z]{2})?\/)?(?:(?:firefox|thunderbird|seamonkey|mobile|android)\/)?collections\//i;
const AAA_RE_COLLECTION_ID =
  /^\/(?:[a-z]{2}(?:\-[a-z]{2})?\/)?(?:(?:firefox|thunderbird|seamonkey|mobile|android)\/)?collections\/((?:[^\/]+)\/(?:[^\/]+))/i;
const AAA_RE_GET_NUMBER = /\/([0-9]+)(\/|$)/;
const AAA_RE_FILE_VIEWER =
  /^\/(?:[a-z]{2}(?:\-[a-z]{2})?\/)?(?:(?:firefox|thunderbird|seamonkey|mobile|android)\/)?files\//i;
const AAA_RE_ADDONS_DXR = /^\/addons\//i;
const AAA_RE_DXR_LINK = /\/addons\/source\/([0-9]+)\/?$/;

let AAAContentScript = {
  _path : null,
  _href : null,

  /**
   * Runs the content script on this page.
   */
  run : function() {
    this._path = document.location.pathname;
    this._href = document.location.href;

    if (AAA_RE_AMO_DOMAINS.test(document.location.hostname)) {
      this._runAMO();
    } else if ("dxr.mozilla.org" == document.location.hostname) {
      this._runDXR();
    }
  },

  /**
   * Runs the AMO handler.
   */
  _runAMO : function() {
    // check if this is a listing page.
    let matchListing = this._path.match(AAA_RE_LISTING_PAGE, "ig");

    if (matchListing && (2 <= matchListing.length)) {
      this._log("Found an AMO listing page.");
      // this is an AMO listing page. matchListing[1] is the add-on slug.
      this._modifyListingPage(matchListing[1]);
      // let the record state I hate early returns, but the logic in this
      // function was becoming a bit unruly.
      return;
    }

    // not a listing page, check if this is an edit page.
    let matchEdit = this._path.match(AAA_RE_EDIT_PAGE, "ig");

    if (matchEdit && (2 <= matchEdit.length)) {
      // this excludes validation result pages.
      if ((2 == matchEdit.length) || ("file" != matchEdit[2])) {
        this._log("Found an AMO edit page.");
        // this is an AMO edit page. matchEdit[1] is the add-on slug.
        this._modifyEditPage(matchEdit[1]);
      }

      return;
    }

    // check if this is a bg theme edit page.
    let matchBgEdit = this._path.match(AAA_RE_BG_THEME_EDIT_PAGE, "ig");

    if (matchBgEdit && (2 <= matchBgEdit.length)) {
      this._log("Found an AMO bg theme edit page.");
      // this is an AMO bg theme edit page. matchBgEdit[1] is the add-on slug.
      this._modifyBgThemeEditPage(matchBgEdit[1]);

      return;
    }

    // check if this is a user admin page.
    let matchUserAdmin = this._path.match(AAA_RE_USER_ADMIN_PAGE, "ig");

    if (matchUserAdmin) {
      if (null != matchUserAdmin[1]) {
        this._log("Found a user admin page.");
        // this is a user admin page. matchUserAdmin[1] is the user ID.
        this._modifyUserAdminPage(matchUserAdmin[1]);
      } else {
        this._log("Found a user admin search page.");
        this._modifyUserAdminSearchPage();
      }

      return;
    }

    // nope, test the simpler cases.
    if (AAA_RE_FILE_VIEWER.test(this._path)) {
      this._log("Found a source viewer page.");
      this._widenSourceViewer();
    } else if (AAA_RE_USER_PAGE.test(this._path)) {
      this._log("Found a user profile page.");
      this._addLinksToUserPage();
    } else if (AAA_RE_COLLECTION_PAGE.test(this._path)) {
      this._log("Found a collection page.");
      this._addToCollectionPage();
    }
  },

  /**
   * Run the DXR handler.
   */
  _runDXR : function() {
    if (AAA_RE_ADDONS_DXR.test(this._path)) {
      this._log("Found an add-ons DXR page.");

      try {
        let that = this;
        let contentNode = document.getElementById("content");
        let observer = new MutationObserver(function(aMutations) {
          for (let mutation of aMutations) {
            for (let node of mutation.addedNodes) {
              if (node.ELEMENT_NODE == node.nodeType) {
                that._log("Node: " + node);
                that._addDXRLinks(node);
              }
            }
          }
        });

        // add links to current content (skip it for the front page because
       // it's to link-heavy and it doesn't work very well)
        if ("/addons/source/" != this._path) {
          this._addDXRLinks(document.documentElement);
        }
        // add links to new content being added.
        observer.observe(contentNode, { childList : true });
      } catch (e) {
        this._log("_addLinksToDXR error:\n" + e);
      }
    }
  },

  /**
   * Adds AMO links from DXR pages for all nodes under aNode.
   */
  _addDXRLinks : function(aNode) {
    let result = aNode.querySelectorAll("a");
    let editLink;
    let reviewLink;
    let match;

    for (let link of result) {
      match = link.getAttribute("href").match(AAA_RE_DXR_LINK, "ig");

      if (match && (2 <= match.length)) {
        editLink = this._createEditLink(match[1], "[Edit]");
        link.parentNode.insertBefore(editLink, link.nextSibling);

        reviewLink =
          this._createAMOLink(
            "[Review]", "/editors/review/$(PARAM)", match[1], true);
        reviewLink.setAttribute("style", "margin-left: 0.4em;");
        link.parentNode.insertBefore(reviewLink, link.nextSibling);
      }
    }
  },

  /**
   * Adds a few useful admin links to listing pages, and exposes the internal
   * add-on id.
   */
  _modifyListingPage : function(aSlug) {
    let isPersonaListing =
      (null != document.getElementById("persona-summary"));

    if (isPersonaListing) {
      this._modifyPersonaListing(aSlug);
    } else {
      this._modifyRegularListing(aSlug);
    }
  },

  /**
   * Adds a few useful admin links to Persona listing pages.
   */
  _modifyPersonaListing : function(aSlug) {
    let summaryNode = document.getElementById("persona-summary");
    let personaNode =
      document.querySelector("#persona-summary div.persona-preview > div");

    if (null != personaNode) {
      let personaJSON = personaNode.getAttribute("data-browsertheme");
      let persona = JSON.parse(personaJSON);
      let headerLink = this._createLink("Header", persona.headerURL);
      let footerLink = this._createLink("Footer", persona.footerURL);
      let insertionPoint = document.querySelector("div.widgets");

      if (null != insertionPoint) {
        headerLink.setAttribute("class", "collection-add widget collection");
        insertionPoint.appendChild(headerLink);

        footerLink.setAttribute("class", "collection-add widget collection");
        insertionPoint.appendChild(footerLink);
      } else {
        this._log("Insertion point could not be found.");
      }
    } else {
      this._log("Persona node could not be found.");
    }
  },

  /**
   * Adds a few useful admin links to non-Persona add-on listing pages, and
   * exposes the internal add-on id.
   */
  _modifyRegularListing : function(aSlug) {
    let aside = document.querySelector("aside.secondary");
    let addonNode = document.getElementById("addon");
    let is404 = (null == addonNode);
    let adminLink = this._createAdminLink(aSlug);
    let reviewLink = this._createAMOReviewLink(aSlug);
    let insertionPoint = null;

    if (!is404) {
      this._showAddonId(addonNode);
      insertionPoint = aside;
    } else {
      this._log("There is no add-on node. This may be a 404 page.");

      if (null != aside) {
        // author-disabled add-on page.
        insertionPoint = document.createElement("div");
        insertionPoint.setAttribute("style", "margin-top: 1em;");
        aside.appendChild(insertionPoint);
      } else {
        let errorMessage = document.querySelector("div.primary");

        if (null != errorMessage) {
          // 404 pages (disabled, incomplete, or actually 404).
          insertionPoint = document.createElement("div");
          insertionPoint.setAttribute(
            "style", "margin-top: 1em; margin-bottom: 1em;");
          errorMessage.insertBefore(
            insertionPoint, errorMessage.firstElementChild.nextSibling);
        }
      }
    }

    if (null != insertionPoint) {
      this._appendListingLink(insertionPoint, adminLink, is404);
      this._appendListingLink(insertionPoint, reviewLink, is404);

      if (is404) {
        let editLink = this._createEditLink(aSlug);

        this._appendListingLink(insertionPoint, editLink, is404);
      }
    } else {
      this._log("Insertion point could not be found.");
    }
  },

  /**
   * Makes deletion dialog easier to use.
   * @param aSlug the slug that identifies the add-on.
   */
  _modifyEditPage : function(aSlug) {
    this._fillDeletionDialog();
  },

  /**
   * Adds a review link to background theme edit pages.
   * @param aSlug the slug that identifies the theme.
   */
  _modifyBgThemeEditPage : function(aSlug) {
    let result = document.querySelector("div.info > p:nth-child(2)");

    if (null != result) {
      let insertionPoint = result.parentNode;
      let container = document.createElement("p");
      let reviewLink = this._createThemeReviewLink(aSlug);

      container.appendChild(reviewLink);
      insertionPoint.insertBefore(container, result.nextSibling);
    } else {
      this._log("Insertion point could not be found.");
    }

    this._fillDeletionDialog();
  },

  /**
   * Adds an delete link to user pages.
   */
  _addLinksToUserPage : function() {
    let manageButton = document.getElementById("manage-user");

    if (null != manageButton) {
      let manageURL = manageButton.getAttribute("href");
      let userId = manageURL.substring(manageURL.lastIndexOf("/") + 1);
      let deleteLink = this._createDeleteUserLink(userId);

      deleteLink.setAttribute("class", "button");
      deleteLink.setAttribute(
        "style",
        "background: linear-gradient(rgb(225, 15, 0), rgb(191, 13, 0)) repeat scroll 0% 0% rgb(87, 132, 191)");
      manageButton.parentNode.appendChild(deleteLink);
    } else {
      this._log("Insertion point could not be found.");
    }
  },

  /**
   * Adds delete buttons to collection pages.
   */
  _addToCollectionPage : function() {
    let widgetBoxes =
      document.querySelectorAll("div.collection_widgets.condensed.widgets");

    for (let box of widgetBoxes) {
      let watchURL = box.firstElementChild.getAttribute("href");
      let matchURL = watchURL.match(AAA_RE_COLLECTION_ID, "ig");

      if (matchURL && (2 <= matchURL.length)) {
        let collectionID = matchURL[1];
        let link = document.createElement("a");
        let label = document.createTextNode("Delete");

        link.setAttribute("href", `/collections/${collectionID}/delete`);
        link.appendChild(label);
        box.appendChild(link);
      } else {
        this._log("Invalid collection URL.");
      }
    }
  },

  /**
   * Improve the user administration page.
   * @param aUserID the user ID from the page URL.
   */
  _modifyUserAdminPage : function(aUserID) {
    let result = document.querySelector("a.viewsitelink");

    if (null != result) {
      result.setAttribute("href", ("/user/" + aUserID + "/"));
    } else {
      this._log("View on site button could not be found.");
    }
  },

  /**
   * Adds links to profile pages in user admin search results.
   */
  _modifyUserAdminSearchPage : function() {
    try {
      let result =
        document.querySelectorAll("#result_list > tbody > tr > th > a");
      let match;
      let userID;
      let newLink;

      for (let link of result) {
        match = link.getAttribute("href").match(AAA_RE_GET_NUMBER, "ig");

        if (match && (2 <= match.length)){
          userID = match[1];
          // create a new link that points to the profile page.
          newLink = document.createElement("a");
          newLink.setAttribute("href", ("/user/" + userID + "/"));
          newLink.setAttribute("style", "margin-left: 0.5em;");
          newLink.textContent = "[" + userID + "]";
          link.parentNode.appendChild(newLink);
        }
      }
    } catch (e) {
      this._log("_modifyUserAdminSearchPage error:\n" + e);
    }
  },

  /**
   * Pre-fills the deletion dialog for add-ons, to make it easier for admins.
   */
  _fillDeletionDialog : function() {
    let slugInput = document.querySelector("div.modal-delete input[name=slug]");

    if (null != slugInput) {
      let reason = document.getElementById("id_reason");

      slugInput.value = slugInput.getAttribute("placeholder");

      if (null != reason) {
          reason.value = "I'm an admin, bitch!";
      }
    } else {
      this._log("Delete dialog could not be found.");
    }
  },

  /**
   * Makes the numeric add-on id visible in add-on listing pages.
   * @param aAddonNode the node that holds the numeric add-on id.
   */
  _showAddonId : function(aAddonNode) {
    let addonId = aAddonNode.getAttribute("data-id");
    let titleNode = document.querySelector("h1.addon");
    let numberSpan = document.createElement("span");
    let spanContent = document.createTextNode("[" + addonId + "]");

    numberSpan.appendChild(spanContent);
    numberSpan.setAttribute("class", "version-number");
    titleNode.appendChild(numberSpan);
  },

  /**
   * Makes the source code viewer much wider so it is easier to read.
   */
  _widenSourceViewer : function() {
    let rootNode =
      document.getElementById("tabzilla-wrapper").firstElementChild;
    let contentNode = document.getElementById("content-wrapper");

    rootNode.setAttribute("style", "width: 95%; max-width: inherit;");
    contentNode.style.paddingLeft = "15%";
  },

  /**
   * Inserts a link to a listing page.
   * @param aParent the parent node.
   * @param aLink the link node to insert.
   * @param aIs404 true if this is a 404 page, false otherwise.
   */
  _appendListingLink : function(aParent, aLink, aIs404) {
    let container = document.createElement("p");

    if (aIs404) {
      aLink.setAttribute("class", "collection-add widget collection");
    } else {
      aLink.setAttribute("class", "button prominent");
      container.setAttribute("class", "manage-button");
    }

    container.appendChild(aLink);
    aParent.appendChild(container);
  },

  _createAdminLink : function(aId) {
    let link =
      this._createAMOLink(
        "Admin this Add-on", "/admin/addon/manage/$(PARAM)", aId);

    return link;
  },

  _createEditLink : function(aId, aText) {
    let link =
      this._createAMOLink(
        ((null != aText) ? aText : "Edit this Add-on"),
        "/developers/addon/$(PARAM)/edit/", aId, true);

    return link;
  },

  _createDeleteUserLink : function(aId) {
    let link =
      this._createAMOLink(
        "Delete user", "/admin/models/users/userprofile/$(PARAM)/delete/", aId);

    return link;
  },

  _createAMOReviewLink : function(aId) {
    let link =
      this._createAMOLink(
        "Review this Add-on", "/editors/review/$(PARAM)", aId);

    return link;
  },

  _createThemeReviewLink : function(aId) {
    let link =
      this._createAMOLink(
        "Review this Add-on", "/editors/themes/queue/single/$(PARAM)", aId);

    return link;
  },

  /**
   * Creates an 'a' node pointing to AMO.
   * @param aText the text in the link.
   * @param aPath the relative path to use.
   * @param aParameter the parameter value to replace in the path.
   * @param aForceAMO whether to force if addons.mozilla.org should be the
   * domain in the link.
   */
  _createAMOLink : function(aText, aPath, aParameter, aForceAMO) {
    let href;

    if (aForceAMO) {
      href = "https://addons.mozilla.org" + aPath;
    } else {
      href = aPath;
    }

    return this._createLink(aText, href.replace("$(PARAM)", aParameter));
  },

  /**
   * Creates an 'a' node with the given text and URL.
   * @param aText the text in the link.
   * @param aURL the URL the link points to.
   */
  _createLink : function(aText, aURL) {
    let link = document.createElement("a");
    let linkContent = document.createTextNode(aText);

    link.setAttribute("href", aURL);
    link.appendChild(linkContent);

    return link;
  },

  _log : function (aText) {
    console.log(aText);
  }
};

AAAContentScript.run();
