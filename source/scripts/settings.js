/* eslint-env browser, jquery */
'use strict';

const NProgress = require('nprogress');

$(() => {

  function serializeSettings() {
    return $('#settings-form').serialize();
  }

  let changesSaved = $('#settings-form').attr('data-changes-saved');
  let cleanState = JSON.stringify(serializeSettings());
  let saveConfirmation = $('#settings-form').attr('data-save-confirmation');

  // Update hash on tab change
  $('#sidebar').find('[data-toggle="tab"]').on('show.bs.tab', function() {
    var href = this.href;

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

  // Enable image controls
  $('.image-control').each(function() {
    $(this)
      .imageControl()
      .on('uploadProgress.imageControl', (event, percent) => NProgress.set(percent * .9))
      .on('uploadComplete.imageControl', () => NProgress.done(false));
  });

  // Handle theme selection
  $('#theme').selectable({
    items: '.card',
    click: (value, el, event) => {
      $('#theme :input').val(value);

      // Don't let the selection get removed
      if($(el).is('.selected')) {
        event.preventDefault();
      }
    },
    doubleClick: (value, el, event) => {
      // Don't let the selection get removed
      event.preventDefault();
    }
  });

  // Create a backup
  $('[data-create-backup]').on('click', function() {
    let action = $(this).attr('data-action');
    let options = [];

    // Append backup options as a query string
    $('[data-backup-options] :input').each(function() {
      options.push(encodeURIComponent(this.value) + '=' + $(this).prop('checked'));
    });

    location.href = action + '?' + options.join('&');
  });

  // Restore a backup
  $('[data-restore-backup]').on('change', function(event) {
    let input = this;
    let action = $(input).attr('data-action');
    let formData = new FormData();

    // Append file to form data
    formData.append('file', event.target.files[0]);

    // Upload the image
    NProgress.start();
    $.ajax({
      url: action,
      type: 'PUT',
      data: formData,
      dataType: 'json',
      contentType: false,
      processData: false,
      cache: false,
      progress: function(event) {
        if(event.lengthComputable) {
          // 50% when the upload completes
          NProgress.set(event.loaded / event.total * .5);
        }
      }
    })
      .done((res) => {
        // Show success message and force a reload
        if(res.message) {
          $.announce
            .success(res.message)
            .then(() => location.reload());
        }
      })
      .fail((jqXHR) => {
        let res = jqXHR.responseJSON;

        // Show error message
        if(res.message) {
          $.announce.warning(res.message);
        }
      })
      .always(() => {
        // 100% when the restore completes
        NProgress.done();

        // Reset the input
        $(input).val('');
      });
  });

  // Handle the form
  $('#settings-form').ajaxSubmit({
    before: NProgress.start,
    after: NProgress.done,
    data: () => serializeSettings(),
    error: (res) => $.announce.warning(res.message),
    success: () => {
      // Show a success message
      $.announce.success(changesSaved);

      // Update clean state
      cleanState = JSON.stringify(serializeSettings());
    }
  });

  // Save button
  $('[data-save]').on('click', () => $('#settings-form').submit());

  // Watch for unsaved changes
  window.onbeforeunload = () => {
    if(JSON.stringify(serializeSettings()) !== cleanState) {
      return saveConfirmation;
    }
  };
});
