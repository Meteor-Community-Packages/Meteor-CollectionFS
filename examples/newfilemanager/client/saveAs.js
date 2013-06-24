// source: https://gist.github.com/MrSwitch/3552985
// window.saveAs
// Shims the saveAs method, using saveBlob in IE10.
// And for when Chrome and FireFox get round to implementing saveAs we have their vendor prefixes ready.
// But otherwise this creates a object URL resource and opens it on an anchor tag which contains the "download" attribute (Chrome)
// ... or opens it in a new tab (FireFox)
// @author Andrew Dodson
// @copyright MIT, BSD. Free to clone, modify and distribute for commercial and personal use.

window.saveAs || (window.saveAs = (window.navigator.msSaveBlob ? function(b, n) {
    return window.navigator.msSaveBlob(b, n);
} : false) || window.webkitSaveAs || window.mozSaveAs || window.msSaveAs || (function() {

    // URL's
    window.URL || (window.URL = window.webkitURL);

    if (!window.URL) {
        return false;
    }

    return function(blob, name) {
        var url = URL.createObjectURL(blob);

        // Test for download link support
        if ("download" in document.createElement('a')) {

            var a = document.createElement('a');
            a.setAttribute('href', url);
            a.setAttribute('download', name);

            // Create Click event
            var clickEvent = document.createEvent("MouseEvent");
            clickEvent.initMouseEvent("click", true, true, window, 0,
                    event.screenX, event.screenY, event.clientX, event.clientY,
                    event.ctrlKey, event.altKey, event.shiftKey, event.metaKey,
                    0, null);

            // dispatch click event to simulate download
            a.dispatchEvent(clickEvent);

        }
        else {
            // fallover, open resource in new tab.
            window.open(url, '_blank', '');
        }
    };

})());