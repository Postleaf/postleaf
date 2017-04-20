/* eslint-env browser, jquery */
'use strict';

const NProgress = require('nprogress');

$(() => {

  function getState() {
    return $('#user-form').serialize();
  }

  function enforceSlugSyntax() {
    $('#username').val(Postleaf.Slug($('#username').val()));
  }

  let changesSaved = $('#user-form').attr('data-changes-saved');
  let cleanState = getState();
  let createAction = $('#user-form').attr('data-create-action');
  let saveConfirmation = $('#user-form').attr('data-save-confirmation');
  let userCreated = $('#user-form').attr('data-user-created');
  let userId = $('#user-form').attr('data-user-id');
  let updateAction = $('#user-form').attr('data-update-action');

  // Guess username when name changes
  $('#name').on('change paste', function() {
    if(!$('#username').val()) {
      $('#username').val(Postleaf.Slug(this.value));
    }
  });

  // Enforce slug syntax
  $('#username').on('change paste', enforceSlugSyntax);

  // Enable image controls
  $('.image-control').each(function() {
    $(this)
      .imageControl()
      .on('uploadProgress.imageControl', (event, percent) => NProgress.set(percent * .9))
      .on('uploadComplete.imageControl', () => NProgress.done(false));
  });

  // Handle the form
  $('#user-form').ajaxSubmit({
    url: () => userId ? updateAction.replace(':id', userId) : createAction,
    method: () => userId ? 'PUT' : 'POST',
    before: NProgress.start,
    after: NProgress.done,
    error: (res) => {
      // Show error message
      if(res.message) {
        $.announce.warning(res.message);
      }
    },
    success: (res) => {
      if(res.user) {
        // Show a success message
        let message = userId ? changesSaved : userCreated.replace(':name', res.user.name);
        $.announce.success(message);

        // Set user ID for future saves
        userId = res.user.id;

        // Update clean state
        cleanState = getState();
      }
    }
  });

  // Save button
  $('[data-save]').on('click', () => $('#user-form').submit());

  // Update hash on tab change
  $('#sidebar').find('[data-toggle="tab"]').on('show.bs.tab', function() {
    let href = this.href;

    // Remove hash for the first tab (initial state)
    if($(this).index() === 0) href = href.split('#')[0];

    window.history.replaceState({}, '', href);
  });

  // Set tab on page load
  if(location.hash) {
    $('#sidebar').find('[data-toggle="tab"][href="' + location.hash + '"]').each(function() {
      $(this).tab('show');
    });
  }

  // Watch for unsaved changes
  window.onbeforeunload = () => {
    if(getState() !== cleanState) {
      return saveConfirmation;
    }
  };
});
