/* eslint-env browser, jquery */
'use strict';

const NProgress = require('nprogress');

$(() => {

  function enforceSlugSyntax() {
    $('#username').val(Postleaf.Slug($('#username').val()));
  }

  // Guess username when name changes
  $('#name').on('change paste', function() {
    if(!$('#username').val()) {
      $('#username').val(Postleaf.Slug(this.value));
    }
  });

  let redirect = $('#install-form').attr('data-redirect');

  // Enforce slug syntax
  $('#username').on('change paste', enforceSlugSyntax);

  // Handle the form
  $('#install-form').ajaxSubmit({
    before: NProgress.start,
    after: NProgress.done,
    error: (res) => {
      // Show error message
      if(res.message) {
        $.announce.warning(res.message);
      }
    },
    success: () => location.href = redirect
  });

});
