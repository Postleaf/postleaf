/* eslint-env browser, jquery */
'use strict';

const NProgress = require('nprogress');

$(() => {

  let redirect = $('#recover-form').attr('data-redirect');

  // Handle the form
  $('#recover-form').ajaxSubmit({
    before: NProgress.start,
    after: NProgress.done,
    error: (res) => {
      // Shake on error
      $('#recover-form').animateCSS('shake');

      // Show error message
      if(res.message) {
        $.announce.warning(res.message);
      }
    },
    success: function(res) {
      // Disable the form
      $(this).ajaxSubmit('disable', true);

      // Show success message
      if(res.message) {
        $.announce
          .success({
            duration: 5000,
            message: res.message
          })
          .then(() => location.href = redirect);
      }
    }
  });

});
