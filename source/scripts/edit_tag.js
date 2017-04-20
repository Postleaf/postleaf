/* eslint-env browser, jquery */
'use strict';

const Marked = require('marked');
const NProgress = require('nprogress');

$(() => {

  function getState() {
    return $('#tag-form').serialize();
  }

  function enforceSlugSyntax() {
    $('#slug').val(Postleaf.Slug($('#slug').val()));
  }

  function updatePreview() {
    let slug = $('#slug').val();
    let name = $.trim($('#name').val());
    let description = $(Marked($.trim($('#description').val()))).text();
    let metaTitle = $.trim($('#meta-title').val());
    let metaDescription = $.trim($('#meta-description').val());

    $('.search-engine-preview .slug').text(slug);
    $('.search-engine-preview-title').text(metaTitle || name);
    $('.search-engine-preview-description').text(metaDescription || description);
  }

  let changesSaved = $('#tag-form').attr('data-changes-saved');
  let cleanState = getState();
  let createAction = $('#tag-form').attr('data-create-action');
  let saveConfirmation = $('#tag-form').attr('data-save-confirmation');
  let tagCreated = $('#tag-form').attr('data-tag-created');
  let tagId = $('#tag-form').attr('data-tag-id');
  let updateAction = $('#tag-form').attr('data-update-action');

  // Guess slug when name changes
  $('#name').on('change paste', function() {
    if(!$('#slug').val()) {
      $('#slug').val(Postleaf.Slug(this.value));
    }
  });

  // Enforce slug syntax
  $('#slug').on('change paste', enforceSlugSyntax);

  // Enable image controls
  $('.image-control')
    .imageControl()
    .on('uploadProgress.imageControl', (event, percent) => NProgress.set(percent * .9))
    .on('uploadComplete.imageControl', () => NProgress.done(false));

  // Update preview
  $('#name, #description, #slug, #meta-title, #meta-description').on('change keyup paste', updatePreview);
  updatePreview();

  // Handle the form
  $('#tag-form').ajaxSubmit({
    url: () => tagId ? updateAction.replace(':id', tagId) : createAction,
    method: () => tagId ? 'PUT' : 'POST',
    before: NProgress.start,
    after: NProgress.done,
    error: (res) => {
      // Show error message
      if(res.message) {
        $.announce.warning(res.message);
      }
    },
    success: (res) => {
      if(res.tag) {
        // Show a success message
        let message = tagId ? changesSaved : tagCreated.replace(':name', res.tag.name);
        $.announce.success(message);

        // Set tag ID for future saves
        tagId = res.tag.id;

        // Update clean state
        cleanState = getState();
      }
    }
  });

  // Save button
  $('[data-save]').on('click', () => $('#tag-form').submit());

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
