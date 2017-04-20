/* eslint-env browser, jquery */
'use strict';

const NProgress = require('nprogress');

$(() => {

  let redirect = $('#login-form').attr('data-redirect');

  // Handle the form
  $('#login-form').ajaxSubmit({
    before: NProgress.start,
    after: NProgress.done,
    error: () => $('#login-form').animateCSS('shake'),
    success: () => location.href = redirect
  });

});
