/* eslint-env browser, jquery */
'use strict';

const NProgress = require('nprogress');

$(() => {

  let redirect = $('#quick-post-form').attr('data-redirect');

  // Save for later
  $('[data-save], [data-publish]').on('click', function() {
    // Set the appropriate status
    let status = $(this).is('[data-save]') ? 'draft' : 'published';
    $('#status').val(status);

    // Submit the form
    $('#quick-post-form').submit();
  });

  // Generate a slug when the title changes
  $('#title').on('change', function() {
    $('#slug').val(Postleaf.Slug($(this).val()));
  });

  // Remember template preference
  $('#template')
    .on('change', function() {
      // Store the last selected template
      localStorage.setItem('quickPostTemplate', $(this).val());
    })
    .find('option').each(function() {
      // Restore the last selected template if there's a match
      if(this.value === localStorage.getItem('quickPostTemplate')) {
        $('#template').val(this.value);
      }
    });

  // Handle the form
  $('#quick-post-form').ajaxSubmit({
    before: () => {
      // Require title before submitting
      if($('#title').val() === '') {
        $('#quick-post-form').animateCSS('shake');
        return false;
      }

      NProgress.start();
    },
    after: NProgress.done,
    error: (res) => {
      $('#quick-post-form').animateCSS('shake');

      if(res.message) {
        $.announce.warning(res.message);
      }
    },
    success: () => location.href = redirect
  });

  // Submit on cmd + enter
  $('#quick-post-form :input').on('keydown', (event) => {
    if(event.keyCode === 13 && (event.metaKey || event.ctrlKey)) {
      $('#quick-post-form').submit();
    }
  });

});
