//
// Add a progress callback for XHR uploads
//

/* eslint-env browser, jquery */
(function addXhrProgressEvent($) {
  var originalXhr = $.ajaxSettings.xhr;
  $.ajaxSetup({
    progress: function() { },
    xhr: function() {
      var xhr = originalXhr();
      var req = this;

      if(xhr.upload) {
        if(typeof xhr.upload.addEventListener === 'function') {
          xhr.upload.addEventListener('progress', (evt) => {
            req.progress(evt);
          }, false);
        }
      }

      return xhr;
    }
  });
})(jQuery);
