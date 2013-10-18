addEventListener(
  "load",
  function(aEvent) {
    let doc = aEvent.originalTarget;

    if ((null != doc) && (null != doc.location) &&
        (null != doc.location.hostname) &&
        /mozilla\.(org|com)/.test(doc.location.hostname)) {
      content.document.documentElement.setAttribute("style", "display: none !important");
    }
  },
  true);
