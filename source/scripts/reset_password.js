/* eslint-env browser, jquery */
'use strict';

const NProgress = require('nprogress');

$(() => {

  let redirect = $('#reset-form').attr('data-redirect');

  // Handle the form
  $('#reset-form').ajaxSubmit({
    method: 'POST',
    before: NProgress.start,
    after: NProgress.done,
    error: (res) => {
      if(res.message) {
        $.announce.warning(res.message);
      }
    },
    success: function(res) {
      $(this).ajaxSubmit('disable');
      $.announce
        .success(res.message)
        .then(() => location.href = redirect);
    }
  });
});
