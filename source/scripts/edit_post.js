/* eslint-env browser, jquery */
'use strict';

const Cookie = require('js-cookie');
const NProgress = require('nprogress');
const Screenfull = require('screenfull');
const Editor = require('../modules/editor.js');
const Promise = require('bluebird');

$(() => {

  //
  // Disables or enables the toolbar.
  //
  //  disabled* (boolean) - True to disable, false to enable.
  //
  // No return value.
  //
  function disableToolbar(disabled) {
    $('.admin-toolbar').toggleClass('disabled', disabled);
  }

  //
  // Called when the user double clicks something in the content editor.
  //
  // No return value.
  //
  function handleDoubleClick(event) {
    // Show appropriate panels on double-click
    if($(event.target).is('a[href]')) $('#link-panel').panel('show');
    if($(event.target).is('figure.image, img')) $('#image-panel').panel('show');
    if($(event.target).is('[data-embed]')) $('#embed-panel').panel('show');
  }

  //
  // Called when the user drags something off of the page.
  //
  //  event* (object) - A drag event.
  //
  // No return value.
  //
  function handleDragLeave(event) {
    event.preventDefault();
    hideDropzone();
  }

  //
  // Called when the user drags something onto page.
  //
  //  event* (object) - A drag event.
  //
  // No return value.
  //
  function handleDragOver(event) {
    // Don't show the dropzone if the file manager is activated
    if($('#file-manager').is(':visible')) return;

    event.preventDefault();

    if(isDraggingFile(event)) {
      showDropzone(event.target);
    }
  }

  //
  // Called when files are dropped into the page.
  //
  //  event* (object) - A drop event.
  //
  // No return value.
  //
  function handleDrop(event) {
    let target = $(event.target).closest('.dropzone-target').attr('data-target');

    event.preventDefault();
    hideDropzone();

    // Don't do anything if the file was dropped outside of a target
    if(!target) return;

    // Upload the dropped file
    if(isDraggingFile(event)) {
      upload({
        file: event.originalEvent.dataTransfer.files[0],
        action: uploadAction,
        method: 'POST'
      })
        .then((res) => {
          // Insert an image
          if(res.upload && res.upload.filename.match(/\.(gif|jpg|jpeg|png|svg)$/i)) {
            if(target === 'post:image') {
              // Set post image
              $('#image').val(res.upload.path).trigger('change');

              // Update preview
              loadPreview(serializePost());
              return;
            } else {
              // Insert into post content
              contentEditor.insertImage(res.upload.path);
              return;
            }
          }

          // Insert a link
          if(res.upload && target === 'post:content') {
            contentEditor.insertContent(
              $('<a>')
                .attr('href', res.upload.path)
                .text(res.upload.filename)
                .get(0)
                .outerHTML
            );
            return;
          }
        })
        .catch((res) => {
          // Show error message
          if(res.message) {
            $.announce.warning(res.message);
          }
        });
    }
  }

  //
  // Called when a key is pressed in the content editor. Handles editor-specific keyboard shortcuts
  // and commands.
  //
  //  event* (object) - A keydown event.
  //
  // No return value.
  //
  function handleKeyDown(event) {
    let isMac = $('html').is('.mac');
    let cmd = isMac ? event.metaKey : event.ctrlKey;

    // Link (CMD + K)
    if(cmd && event.keyCode === 75) {
      event.preventDefault();
      $('#link-panel').panel('show');
    }

    // Image (CMD + SHIFT + I)
    if(cmd && event.shiftKey && event.keyCode === 73) {
      event.preventDefault();
      $('#image-panel').panel('show');
    }

    // Embed (CMD + SHIFT + E)
    if(cmd && event.shiftKey && event.keyCode === 69) {
      event.preventDefault();
      $('#embed-panel').panel('show');
    }

    // New section (CMD + ENTER)
    if(cmd && event.keyCode === 13) {
      this.insertContent('<hr/>');
    }

    // Update word count
    clearTimeout(wordCountTimeout);
    wordCountTimeout = setTimeout(updateWordCount, 500);
  }

  //
  // Called when the selection changes in the content editor.
  //
  // No return value.
  //
  function handleSelectionChange() {
    updateToolbar();
  }

  //
  // Called when content is pasted into the content editor. Converts image URLs to images and grabs
  // embed code from various providers.
  //
  //  event* (object) - A paste event.
  //
  // No return value.
  //
  function handlePaste(event) {
    let pastedData = event.content;

    // Check for anything that looks like a URL
    if(pastedData.match(/^https?:\/\//i)) {
      event.stopPropagation();
      event.preventDefault();

      // Generate embed code from URL
      insertContentFromUrl(pastedData);
    }
  }

  //
  // Hides the drop zone.
  //
  // No return value.
  //
  function hideDropzone() {
    // Hide the dropzone after a short delay to prevent flickering in some browsers when dragging
    // over a child element of the dropzone.
    dropzoneTimeout = setTimeout(() => {
      $('#dropzone').prop('hidden', true);
      $('#dropzone .dropzone-target').removeClass('active');
    }, 10);
  }

  //
  // Fetches metadata from the specified URL and inserts an embed based on that info.
  //
  //  url* (string) - The URL to fetch metadata from.
  //  callback* (function) - A callback function with
  //
  function insertContentFromUrl(url) {
    // Check for images and insert them directly into the editor
    if(url.match(/^https?:\/\/(.*?)\.(gif|jpg|jpeg|png|svg)$/i)) {
      return contentEditor.insertImage(url);
    }

    // Fetch embed code
    NProgress.start();
    $.ajax({
      url: embedAction,
      type: 'GET',
      data: {
        url: url
      }
    })
    .done((res) => {
      if(res.embed && res.embed.html) {
        // An embed provider was found, insert the HTML
        return contentEditor.insertEmbed(res.embed.html, { provider: res.site_name });
      } else if(res.preview) {
        // No embed provider, insert a preview instead
        return contentEditor.insertEmbed(res.preview);
      }
    })
    .always(() => NProgress.done());
  }

  //
  // Tells if the editor's state has unsaved changes.
  //
  // Returns a boolean.
  //
  function isDirty() {
    return cleanState !== JSON.stringify(serializePost());
  }

  //
  // Tells if the user is dragging a file (as opposed to an HTML element).
  //
  // Returns a boolean.
  //
  function isDraggingFile(event) {
    if(event.originalEvent === undefined) return false;
    if(event.originalEvent.dataTransfer === undefined) return false;
    return $.inArray('Files', event.originalEvent.dataTransfer.types) > -1;
  }

  //
  // Called when the frame loads. Disables certain interactions and initializes content editors.
  //
  // No return value.
  //
  function loadFrame() {
    // Keep a reference to the frame's document object
    frameDoc = $('#editor-frame').get(0).contentWindow.document;

    // Hide the loader
    $('.main-container').removeClass('loading');

    // Check for missing helpers by scanning for their output
    for(let helper of [
      { code: '{@head/}', selector: '[data-postleaf-editor="styles"]' },
      { code: '{@foot/}', selector: '[data-postleaf-editor="scripts"]' },
      { code: '{@title editable="true"/}', selector: '[data-postleaf-region="title"]' },
      { code: '{@content editable="true/}', selector: '[data-postleaf-region="content"]' }
    ]) {
      if(!$(helper.selector, frameDoc).length) {
        $('#missing-helper')
          .find('code').text(helper.code).end()
          .prop('hidden', false);
        return;
      }
    }

    // Show the frame
    $('#editor-frame').prop('hidden', false);

    $(frameDoc)
      // Prevent links from loading other pages
      .on('click mousedown', 'a, area', function(event) {
        // Skip [data-postleaf] elements
        if(!$(this).parents().addBack().is('[data-postleaf-region]')) {
          event.preventDefault();
        }
      })
      // Prevent form submissions
      .on('submit', 'form', (event) => event.preventDefault())
      // Pass these events through to the main document
      .on('click keydown mousedown touchstart', (event) => $(document).trigger(event));

    // Watch for drag and drop on the main document or the frame if uploads are enabled
    $(document).add(frameDoc)
      .on('dragover', handleDragOver)
      .on('dragleave', handleDragLeave)
      .on('drop', handleDrop);

    // Title region
    titleEditor = new Editor({
      element: $('[data-postleaf-region="title"]', frameDoc).get(0),
      baseUrl: $('#editor-frame').attr('data-base-url'),
      placeholder: $('#editor-frame').attr('data-default-title'),
      textOnly: true,
      allowNewlines: false,
      onReady: () => {
        makeClean();
        titleEditor.focus();
      }
    });

    // Content region
    contentEditor = new Editor({
      element: $('[data-postleaf-region="content"]', frameDoc).get(0),
      baseUrl: $('#editor-frame').attr('data-base-url'),
      captionPlaceholder: $('#editor-frame').attr('data-caption-placeholder'),
      convertMarkdown: true,
      placeholder: $('#editor-frame').attr('data-default-content'),
      onDoubleClick: handleDoubleClick,
      onKeyDown: handleKeyDown,
      onPaste: handlePaste,
      onSelectionChange: handleSelectionChange,
      onReady: () => {
        makeClean();
        disableToolbar(false);
        updateToolbar();
        updateWordCount();
      }
    });
  }

  //
  // Renders and loads a preview with a smooth transition. This method essentially wraps
  // renderPreview but takes care of the loading state and fade in/out animations.
  //
  // Returns a promise that resolves after the preview loads and all animations are complete.
  //
  function loadPreview(postData) {
    return new Promise((resolve) => {
      // Show the loader
      $('.main-container').addClass('loading');

      // Fade the frame out while we switch templates. This provides a smooth transition as styles
      // and other resources are loaded.
      $('#editor-frame').animateCSS('fadeOut', 100, function() {
        $(this).css('opacity', 0);

        // Render the updated preview
        renderPreview(postData).then(() => {
          // Hide the loader
          $('.main-container').removeClass('loading');

          // Fade the frame back in once the preview has loaded
          $('#editor-frame').animateCSS('fadeIn', 100, function() {
            $(this).css('opacity', 1);

            resolve();
          });
        });
      });
    });
  }

  //
  // Resets the clean state.
  //
  // No return value.
  //
  function makeClean() {
    cleanState = JSON.stringify(serializePost());
  }

  //
  // Renders a preview using the specified post data and hot swaps the page in the editor.
  //
  //  postData* (object) - The data to render the post with.
  //
  // Returns a promise.
  //
  function renderPreview(postData) {
    return new Promise((resolve) => {
      //
      // How it works:
      //
      //  1. Create a dummy form and insert the cmd, options, and post data
      //  2. Create a dummy iframe that will receive the form
      //  3. Trigger the form to submit to the iframe
      //  4. Swap out the head and body elements
      //  5. Replace the new content regions with the old editor instances
      //  6. Magic!
      //
      // Capture title and content elements. We do this because they are linked to the editor and
      // we don't want to reinitialize the editors and lose their undo/redo history. We're
      // basically hot swapping the editors from one template to another.
      //
      let title = titleEditor.element;
      let content = contentEditor.element;
      let form = $('<form>');

      // Remove any pending requests that might still be around
      $('form[target="dummy_frame"], iframe[name="dummy_frame"]').remove();

      // Create a dummy frame
      $('<iframe>')
        .hide()
        .attr('name', 'dummy_frame')
        .appendTo('body')
        .one('load', function() {
          // Replace HTML classes
          $('html', frameDoc).attr('class', this.contentWindow.document.documentElement.className);

          // Replace head
          $('head', frameDoc).replaceWith(this.contentWindow.document.head);

          // Replace body
          $('body', frameDoc).replaceWith(this.contentWindow.document.body);

          // Reinsert title/content elements
          $('[data-postleaf-region="title"]', frameDoc).replaceWith(title);
          $('[data-postleaf-region="content"]', frameDoc).replaceWith(content);

          // Remove the frame
          $(this).remove();

          resolve();
        });

      // Create a dummy form and submit it
      $(form)
        .hide()
        .attr('action', previewAction + '?isEditor=true&isZenMode=' + zenMode)
        .attr('method', 'post')
        .attr('target', 'dummy_frame')
        .append($('<input type="hidden" name="post">').val(JSON.stringify(postData)))
        .appendTo('body')
        .submit()
        .remove();
    });
  }

  //
  // Saves changes.
  //
  function save() {
    NProgress.start();

    // Clear error states
    $('.form-group').removeClass('has-warning');

    $.ajax({
      url: postId ? updateAction.replace(':id', postId) : createAction,
      type: postId ? 'PUT' : 'POST',
      data: serializePost(),
      dataType: 'json'
    })
      .done((res) => {
        // Reset dirty state
        makeClean();

        if(res.post) {
          // Show a success message
          let message = postId ? changesSaved : postCreated.replace(':name', res.post.title);
          $.announce.success(message);

          // Set post ID for future saves
          postId = res.post.id;
        }

        // Update the toolbar
        updateToolbar();

        // Update the revisions table
        updateRevisionsTable(true);
      })
      .fail((jqXHR) => {
        let res = jqXHR.responseJSON;

        // Show error states
        if(res.invalid) {
          for(let i in res.invalid) {
            $(':input[name="' + res.invalid[i] + '"]').closest('.form-group').addClass('has-warning');
          }
        }

        // Show error message
        if(res.message) {
          $.announce.warning(res.message);
        }
      })
      .always(NProgress.done);
  }

  //
  // Serializes all post data.
  //
  // Returns an object.
  //
  function serializePost() {
    return {
      title: titleEditor.isReady ? titleEditor.getContent() : null,
      content: contentEditor.isReady ? contentEditor.getContent() : null,
      slug: $('#slug').val() || Postleaf.Slug(titleEditor.getContent()),
      'published-at': $('#pub-date').val() + ' ' + $('#pub-time').val(),
      template: $('#template').val(),
      tags: $('#tags').get(0).selectize.items,
      'user-id': $('#author').val(),
      status: $('#status').val(),
      'is-featured': $('#is-featured').prop('checked'),
      'is-sticky': $('#is-sticky').prop('checked'),
      'is-page': $('#is-page').prop('checked'),
      'meta-title': $('#meta-title').val(),
      'meta-description': $('#meta-description').val(),
      image: $('#image').val()
    };
  }

  //
  // Shows the drop zone.
  //
  //  target* (element) - The target element from a drag event.
  //
  // No return value.
  //
  function showDropzone(target) {
    target = $(target).parents().addBack();
    clearTimeout(dropzoneTimeout);

    // Add the active class to the appropriate target
    ['post:image', 'post:content'].forEach((zone) => {
      $('#dropzone [data-target="' + zone + '"]')
        .toggleClass('active', $(target).is('[data-target="' + zone + '"]'));
    });

    $('#dropzone').prop('hidden', false);
  }

  //
  // Toggles fullscreen mode on and off.
  //
  function toggleFullscreen() {
    if(Screenfull.enabled) {
      Screenfull.toggle();
    }
  }

  //
  // Toggles word count on and off.
  //
  function toggleWordCount() {
    wordCount = !wordCount;
    Cookie.set('wordCount', wordCount + '');

    $('#word-count').prop('hidden', !wordCount);

    updateToolbar();
  }

  //
  // Toggles zen mode on and off.
  //
  function toggleZenMode(state) {
    // Set status
    zenMode = state;
    Cookie.set('zenMode', state);

    // Show/hide theme toggle
    $('#zen-mode-theme').prop('hidden', !zenMode);

    if(contentEditor && contentEditor.isReady) {
      loadPreview(serializePost());
      updateToolbar();
    }
  }

  //
  // Sets the theme for zen mode.
  //
  function toggleZenTheme(theme) {
    Cookie.set('zenTheme', theme);
    $('[data-zen-theme]').attr('data-zen-theme', theme);

    // Set the theme on the editor frame's body
    $(frameDoc.body).attr('data-theme', theme);
  }

  //
  // Refreshes the revision table and its empty state based on the number of items.
  //
  //  reload (boolean) - If true, the revisions table will be reloadd.
  //
  // Returns a promise that resolves when the table has been updated.
  //
  function updateRevisionsTable(reload) {
    return new Promise((resolve, reject) => {
      // Update empty state
      let hasRevisions = $('#revisions').find('tr').length > 0;
      $('#revisions').find('table').prop('hidden', !hasRevisions);
      $('#no-revisions').prop('hidden', hasRevisions);

      // Reload the table (only if we're editing an existing post)
      if(postId && reload) {
        $.ajax({
          url: revisionTableAction,
          type: 'GET',
          data: {
            postId: postId,
            render: 'revisionsTable'
          }
        })
          .done((res) => {
            // Update the HTML
            if(res.html) {
              $('#revisions').html(res.html);
            }

            resolve();
          })
          .fail((jqXHR) => reject(jqXHR.responseJSON));
      }
    });
  }

  //
  // Updates the toolbar by toggling enabled states for buttons and dropdowns.
  //
  // No return value.
  //
  function updateToolbar() {
    // View options
    $('[data-zen-mode]').toggleClass('enabled', zenMode);
    if(Screenfull.enabled) {
      $('[data-fullscreen]').toggleClass('enabled', Screenfull.isFullscreen);
    }
    $('[data-word-count]').toggleClass('enabled', wordCount);

    // Undo/redo
    $('[data-editor="command:undo"]').prop('disabled', !contentEditor.hasUndo());
    $('[data-editor="command:redo"]').prop('disabled', !contentEditor.hasRedo());

    // Formats
    $('[data-editor^="format:"]').each(function() {
      let format = $(this).attr('data-editor').split(':')[1];
      $(this).toggleClass('enabled', contentEditor.hasFormat(format));
    });

    // Lists
    $('[data-editor="command:toggleOrderedList"]').toggleClass('enabled', contentEditor.isOrderedList());
    $('[data-editor="command:toggleUnorderedList"]').toggleClass('enabled', contentEditor.isUnorderedList());

    // Image, link, and embed
    $('[data-editor="panel:image"]').toggleClass('enabled', contentEditor.isImage());
    $('[data-editor="panel:link"]').toggleClass('enabled', contentEditor.isLink());
    $('[data-editor="panel:embed"]').toggleClass('enabled', contentEditor.isEmbed());

    // Highlight dropdown buttons if at least one menu item is enabled
    $('.dropdown-menu').each(function() {
      let menu = this;
      let button = $(menu).closest('.dropdown').find('[data-toggle="dropdown"]');

      $(button).toggleClass('enabled', $(menu).find('.enabled').length > 0);
    });
  }

  //
  // Updates the current word count.
  //
  function updateWordCount() {
    let count = contentEditor.getWordCount();
    $('#word-count').prop('hidden', !wordCount);
    $('.word-count-none').prop('hidden', count > 0);
    $('.word-count-one').prop('hidden', count !== 1);
    $('.word-count-many').prop('hidden', count <= 1);
    $('.word-count').text(count);
  }

  //
  // Uploads a file.
  //
  //  options* (object)
  //    - file* (object) - The file to upload.
  //    - action* (string) - The URL to send the request to.
  //    - method (string) - The HTTP method to use (default 'POST').
  //    - data (object) - Additional form data to send to the server (default null).
  //
  // Returns a promise that resolve with an API response.
  //
  function upload(options) {
    return new Promise((resolve, reject) => {
      options = options || {};
      let formData = new FormData();

      // Append custom data
      if(typeof options.data === 'object') {
        for(let key in options.data) {
          formData.append(key, options.data[key]);
        }
      }

      // Append image file
      formData.append('file', options.file);

      // Upload the image
      $.ajax({
        url: options.action,
        type: options.method || 'POST',
        data: formData,
        dataType: 'json',
        contentType: false,
        processData: false,
        cache: false,
        progress: function(event) {
          if(event.lengthComputable) {
            NProgress.set(event.loaded / event.total);
          }
        }
      })
        .done((res) => resolve(res))
        .fail((jqXHR) => reject(jqXHR.responseJSON));
    });
  }

  let changesSaved = $('#editor-frame').attr('data-changes-saved');
  let createAction = $('#editor-frame').attr('data-create-action');
  let embedAction = $('#editor-frame').attr('data-embed-action');
  let linkSuggestions = JSON.parse($('#editor-frame').attr('data-link-suggestions'));
  let postId = $('#editor-frame').attr('data-post-id');
  let postCreated = $('#editor-frame').attr('data-post-created');
  let previewAction = $('#editor-frame').attr('data-preview-action');
  let revisionTableAction = $('#editor-frame').attr('data-revision-table-action');
  let updateAction = $('#editor-frame').attr('data-update-action');
  let uploadAction = $('#editor-frame').attr('data-upload-action');
  let wordCount = Cookie.get('wordCount') === 'true';
  let zenMode = false;
  let cleanState;
  let contentEditor;
  let dropzoneTimeout;
  let frameDoc;
  let titleEditor;
  let wordCountTimeout;

  // Initial load
  updateRevisionsTable(true);

  // Enable image controls
  $('.image-control')
    .imageControl()
    .on('uploadProgress.imageControl', (event, percent) => NProgress.set(percent * .9))
    .on('uploadComplete.imageControl', () => NProgress.done(false));

  // Dropdowns
  $('.dropdown')
    // Move focus to the content editor when opening a dropdown. This prevents text selections from
    // getting grayed out when working with dropdowns and ensures that formatters are applied to the
    // correct content region.
    .on('shown.bs.dropdown', () => contentEditor.focus())
    // Keep dropdowns inside the viewport
    .on('shown.bs.dropdown', function() {
      let dropdown = $(this).find('.dropdown-menu');

      $(dropdown)
        // Remove alignment class to check position
        .removeClass('dropdown-menu-right')
        // Assign alignment class if the menu is off-screen
        .toggleClass('dropdown-menu-right', $(dropdown).is(':off-right'));
    });

  // Prevent clicks on the toolbar from stealing the frame's focus. This will also prevent text
  // selections from getting grayed out when clicking on toolbar buttons.
  $('.admin-toolbar').on('mousedown', (event) => event.preventDefault());

  // Load the editor frame
  $('#editor-frame')
    .attr('src', $('#editor-frame').attr('data-src'))
    .one('load', loadFrame);

  // Fullscreen
  $('[data-fullscreen]')
    // Hide the fullscreen button if the browser doesn't suppor it
    .prop('hidden', !Screenfull.enabled)
    // Toggle on click
    .on('click', toggleFullscreen);

  // Listen for fullscreen changes
  if(Screenfull.enabled) {
    Screenfull.onchange(updateToolbar);
  }

  // Word count
  $('[data-word-count]').on('click', toggleWordCount);

  // Zen mode
  $('[data-zen-mode]').on('click', () => toggleZenMode(!zenMode));
  $('[data-zen-theme]').on('click', function() {
    let currentTheme = $(this).attr('data-zen-theme');
    toggleZenTheme(currentTheme === 'night' ? 'day' : 'night');
  });

  // Set initial zen mode state
  if(Cookie.get('zenMode') === 'true') toggleZenMode(true);

  // Enforce slug syntax
  $('#slug').on('change', function() {
    this.value = Postleaf.Slug(this.value);
  });

  // Re-render the post when settings are changed
  $('#settings-panel')
    .on('show.panel', function() {
      // Remember settings clean state
      $(this).data('cleanState', JSON.stringify(serializePost()));
    })
    .on('hide.panel', function(event) {
      let postData = serializePost();
      let cleanState = $(this).data('cleanState');

      // Don't hide the panel if the file manager is showing
      if($('#file-manager').is(':visible')) {
        event.preventDefault();
        return;
      }

      // If the clean state has changed, we need to render a new preview
      if(JSON.stringify(postData) !== cleanState) {
        loadPreview(postData);
      }
    });

  // Initialize selectize control for tags
  $('#tags').selectize({
    items: JSON.parse($('#tags').attr('data-current-tags') || '[]').map((tag) => tag.id),
    options: JSON.parse($('#tags').attr('data-all-tags') || '[]'),
    valueField: 'id',
    labelField: 'name',
    searchField: ['slug', 'name'],
    delimiter: ',',
    highlight: false
  });

  // Enable typeahead on each input
  $('[data-autocomplete="links"]').typeahead({
    hint: false,
    minLength: 1,
    highlight: false
  }, {
    name: 'linkSuggestions',
    limit: 5,
    display: 'url',
    templates: {
      // Templates for displaying results
      suggestion: function(item) {
        switch(item.type) {
        case 'post':
          return '<div><i class="fa fa-file-text"></i> ' + item.label + '</div>';
        case 'tag':
          return '<div><i class="fa fa-tag"></i> ' + item.label + '</div>';
        case 'user':
          return '<div><i class="fa fa-user"></i> ' + item.label + '</div>';
        default:
          return '<div>' + item.label + '</div>';
        }
      }
    },
    source: function(items) {
      // Simple search using string matching
      return function findMatches(query, callback) {
        let matches = [];
        let regex = new RegExp(query, 'i');

        $.each(items, (key, item) => {
          if(regex.test(item.searchText)) {
            matches.push(item);
          }
        });

        callback(matches);
      };
    }(linkSuggestions)
  });

  // Open revisions
  $(document).on('click', '[data-open-revision]', function() {
    let url = $(this).attr('data-open-revision');

    window.open(url);
  });

  // Edit revisions
  $(document).on('click', '[data-edit-revision]', function() {
    let url = $(this).attr('data-edit-revision');

    // Fade the editor out while the revision loads
    $('.main-container').addClass('loading');
    $('#editor-frame').animateCSS('fadeOut', 100, function() {
      $(this).css('opacity', 0);

      // Fetch the revision
      $.ajax({
        url: url,
        type: 'GET'
      })
        .done((res) => {
          if(res.revision) {
            // Restore the content
            titleEditor.setContent(res.revision.title);
            contentEditor.setContent(res.revision.content);

            // Reset the dirty state and undo levels
            makeClean();
            contentEditor.resetUndo();
          }
        })
        .always(() => {
          // Fade the frame back in
          $('.main-container').removeClass('loading');
          $('#editor-frame').animateCSS('fadeIn', 100, function() {
            $(this).css('opacity', 1);
          });
        });
    });
  });

  // Delete revisions
  $(document).on('click', '[data-delete-revision]', function() {
    let tr = (this).closest('tr');
    let confirm = $(this).attr('data-confirm');
    let url = $(this).attr('data-delete-revision');

    // Quick confirmation
    $.alertable.confirm(confirm).then(() => {
      // Start progress
      NProgress.start();

      $.ajax({
        url: url,
        type: 'DELETE'
      })
      .done(() => {
        // Remove it
        $(tr).animateCSS('fadeOut', 300, function() {
          $(this).remove();
          updateRevisionsTable(false);
        });
      })
      .always(() => NProgress.done());
    });
  });

  //////////////////////////////////////////////////////////////////////////////////////////////////
  // Editor commands
  //////////////////////////////////////////////////////////////////////////////////////////////////

  $(document).on('click', '[data-editor]', function() {
    let split = $(this).attr('data-editor').split(':');
    let type = split[0];
    let name = split[1];

    switch(type) {
    // Insert arbitrary content
    case 'insert':
      contentEditor.insertContent($(this).attr('data-content'));
      break;

    // Toggle a format
    case 'format':
      contentEditor.toggleFormat(name);
      break;

    // Execute a command
    case 'command':
      if(typeof contentEditor[name] === 'function') {
        contentEditor[name]();
      }
    }
  });

  //////////////////////////////////////////////////////////////////////////////////////////////////
  // Keyboard shortcuts
  //////////////////////////////////////////////////////////////////////////////////////////////////

  $(document).on('keydown', (event) => {
    let isMac = $('html').is('.mac');
    let cmd = isMac ? event.metaKey : event.ctrlKey;

    // Fullscreen (alt + shift + f)
    if(event.altKey && event.shiftKey && event.keyCode === 70) {
      event.preventDefault();
      toggleFullscreen();
    }

    // Zen mode (alt + shift + z)
    if(event.altKey && event.shiftKey && event.keyCode === 90) {
      event.preventDefault();
      toggleZenMode(!zenMode);
    }

    // Word Count (alt + shift + w)
    if(event.altKey && event.shiftKey && event.keyCode === 87) {
      event.preventDefault();
      toggleWordCount();
    }

    // Settings (cmd + ,)
    if(cmd && event.keyCode === 188) {
      event.preventDefault();
      $('#settings-panel').panel('show');
    }

    // Save (cmd + s)
    if(cmd && event.keyCode === 83) {
      event.preventDefault();
      save();
    }
  });

  // Save button
  $('[data-save]').on('click', save);

  // Watch for unsaved changes
  window.onbeforeunload = () => {
    if(cleanState && isDirty()) {
      return $('#editor-frame').attr('data-save-confirmation');
    }
  };

  //////////////////////////////////////////////////////////////////////////////////////////////////
  // Post settings panel
  //////////////////////////////////////////////////////////////////////////////////////////////////

  (() => {
    // Update the search engine preview
    function updateSearchEnginePreview() {
      let slug = $('#slug').val();
      let title = $.trim($('#meta-title').val()) || $.trim(titleEditor.getContent());
      let description = $.trim($('#meta-description').val()) || $.trim($(contentEditor.getContent()).text());

      $('.search-engine-preview-slug').text(slug);
      $('.search-engine-preview-title').text(title);
      $('.search-engine-preview-description').text(description);
    }

    // Update search engine preview
    $('#settings-panel').on('show.panel', () => updateSearchEnginePreview());
    $('#slug, #meta-title, #meta-description').on('change keyup paste', updateSearchEnginePreview);
  })();

  //////////////////////////////////////////////////////////////////////////////////////////////////
  // Link panel
  //////////////////////////////////////////////////////////////////////////////////////////////////

  (() => {
    let location;
    let link;

    $('#link-panel')
      .on('show.panel', () => {
        let href;
        let title;

        // Get location and selected element
        location = contentEditor.getLocation();
        link = $(contentEditor.getSelectedElement()).closest('a');

        // Get attributes
        href = decodeURI($(link).attr('href') || '');
        title = $(link).attr('title') || '';

        // Set fields
        $('#link-href').typeahead('val', href);
        $('#link-title').val(title);
        $('[data-link="remove"]').prop('hidden', !link.length);
      })
      .on('shown.panel', () => $('#link-href').focus())
      .on('hide.panel', (event) => {
        // Don't hide the panel if the file manager is showing
        if($('#file-manager').is(':visible')) {
          event.preventDefault();
          return;
        }

        contentEditor.focus();
      });

    // Insert a link
    $('#link-panel form').on('submit', (event) => {
      let href = encodeURI($('#link-href').typeahead('val'));
      let title = $('#link-title').val();

      event.preventDefault();

      // Restore location
      contentEditor.setLocation(location);

      // Insert a link
      if(href.length) {
        contentEditor.insertLink(href, {
          title: title
        });
      } else {
        contentEditor.removeLink();
      }
    });

    // Remove a link
    $('[data-link="remove"]').on('click', () => {
      contentEditor.removeLink();
      $('#link-panel').panel('hide');
    });

    // Browse for a file
    $('[data-link="browse"]').on('click', () => {
      Postleaf.FileManager.select({
        multiSelect: false,
        onSelect: (file) => $('#link-href').typeahead('val', file.path)
      });
    });

    // Upload a file
    $('#link-panel').on('change', ':file', function(event) {
      let input = this;
      if(!event.target.files.length) return;

      upload({
        file: event.target.files[0],
        action: uploadAction,
        method: 'POST'
      })
        .then((res) => {
          // Reset the input so future changes trigger it (even if you select the same file)
          $(input).val('');

          // Set the URL to the new file
          if(res.upload) {
            $('#link-href').typeahead('val', res.upload.path);
          }
        })
        .catch((res) => {
          // Show error message
          if(res.message) {
            $.announce.warning(res.message);
          }
        });
    });
  })();

  //////////////////////////////////////////////////////////////////////////////////////////////////
  // Image panel
  //////////////////////////////////////////////////////////////////////////////////////////////////

  (function() {
    let location;
    let figure;
    let image;

    $('#image-panel')
      .on('show.panel', () => {
        let src;
        let href;
        let alt;

        // Get location and selected element
        location = contentEditor.getLocation();
        figure = $(contentEditor.getSelectedElement()).closest('figure');
        image = figure.length ? $(figure).find('img') : $(contentEditor.getSelectedElement()).closest('img');

        // Get attributes
        src = decodeURI($(image).attr('src') || '');
        href = decodeURI($(image).parent().is('a') ? $(image).parent().attr('href') : '');
        alt = $(image).attr('alt') || '';

        // Set fields
        $('#image-src').val(src);
        $('#image-href').val(href);
        $('#image-alt').val(alt);
        $('#image-caption').prop('checked', $(figure).find('figcaption').length > 0);
        $('[data-image="delete"]').prop('hidden', !image.length);

        // Set alignment
        $('#image-align-none').trigger('click');
        if(image) {
          if(contentEditor.isAlignLeft()) $('#image-align-left').trigger('click');
          if(contentEditor.isAlignCenter()) $('#image-align-center').trigger('click');
          if(contentEditor.isAlignRight()) $('#image-align-right').trigger('click');
        }
      })
      .on('shown.panel', () => $('#image-src').focus())
      .on('hide.panel', (event) => {
        // Don't hide the panel if the file manager is showing
        if($('#file-manager').is(':visible')) {
          event.preventDefault();
          return;
        }

        contentEditor.focus();
      });

    // Insert an image
    $('#image-panel form').on('submit', (event) => {
      let src = encodeURI($('#image-src').val());
      let alt = $('#image-alt').val();
      let caption = $('#image-caption').prop('checked');
      let align = $('#image-panel').find('input[name="align"]:checked').val();

      event.preventDefault();

      // Restore location
      contentEditor.setLocation(location);

      // Insert an image
      if(src.length) {
        contentEditor.insertImage(src, {
          src: src,
          alt: alt,
          caption: caption,
          align: align
        });
      } else {
        contentEditor.removeElement(figure || image);
      }
    });

    // Remove an image
    $('[data-image="delete"]').on('click', () => {
      contentEditor.removeElement(figure || image);
      $('#image-panel').panel('hide');
    });

    // Browse for a file
    $('[data-image="browse"]').on('click', () => {
      Postleaf.FileManager.select({
        mimeTypes: ['image/gif', 'image/jpeg', 'image/png', 'image/svg+xml'],
        multiSelect: false,
        onSelect: (file) => $('#image-src').val(file.path)
      });
    });

    // Upload an image
    $('#image-panel').on('change', ':file', function(event) {
      let input = this;
      if(!event.target.files.length) return;

      upload({
        file: event.target.files[0],
        action: uploadAction,
        method: 'POST'
      })
        .then((res) => {
          // Reset the input so future changes trigger it (even if you select the same file)
          $(input).val('');

          // Set the URL to the new image
          if(res.upload) {
            $('#image-src').val(res.upload.path).trigger('change');
          }
        }).catch((res) => {
          // Show error message
          if(res.message) {
            $.announce.warning(res.message);
          }
        });
    });
  })();

  //////////////////////////////////////////////////////////////////////////////////////////////////
  // Embed panel
  //////////////////////////////////////////////////////////////////////////////////////////////////

  (function() {
    let location;
    let embed;

    $('#embed-panel')
      .on('show.panel', () => {
        let code;

        // Get location and selected element
        location = contentEditor.getLocation();
        embed = $(contentEditor.getSelectedElement()).closest('[data-embed]');

        // Get attributes
        code = $(embed).attr('data-embed') || '';

        // Set fields
        $('#embed-code').val(code);
        $('[data-embed="delete"]').prop('hidden', !embed.length);
      })
      .on('shown.panel', () => $('#embed-code').focus())
      .on('hide.panel', () => contentEditor.focus());

    // Insert an embed
    $('#embed-panel form').on('submit', (event) => {
      let code = $('#embed-code').val();
      let provider = embed ? $(embed).attr('data-embed-provider') : '';

      event.preventDefault();

      // Restore location
      contentEditor.setLocation(location);

      // Insert an embed
      if(code.length) {
        // Check for anything that looks like a URL
        if(code.match(/^https?:\/\//i)) {
          // Generate embed code from URL
          insertContentFromUrl(code);
        } else {
          // Insert as-is
          contentEditor.insertEmbed(code, { provider: provider });
        }
      } else {
        contentEditor.removeElement(embed);
      }
    });

    // Delete an embed
    $('[data-embed="delete"]').on('click', () => {
      contentEditor.removeElement(embed);
      $('#embed-panel').panel('hide');
    });
  })();

  //////////////////////////////////////////////////////////////////////////////////////////////////
  // iOS Admin Toolbar Fix
  //////////////////////////////////////////////////////////////////////////////////////////////////

  (function() {
    function positionToolbar() {
      // Move the frame down so the toolbar doesn't block content at the top
      $('#editor-frame').css('marginTop', $('.admin-toolbar').outerHeight());

      // Position the toolbar in the viewport
      $('.admin-toolbar').css('top', $(window).scrollTop());
    }

    let iosToolbarTimeout;

    if($('html').is('.ios')) {
      // Use absolute positioning
      $('.admin-toolbar')
        .css({
          position: 'absolute',
          zIndex: 2,
          top: 0,
          left: 0,
          width: '100%'
        });

      // Update when the editor frame loads
      $('#editor-frame').on('load', positionToolbar);

      // Update on orientation changes
      $(window).on('orientationchange', positionToolbar);

      // Update on scroll
      $(window).on('scroll', () => {
        // Hide while scrolling
        $('.admin-toolbar').prop('hidden', true);

        // Debounce scroll events
        clearTimeout(iosToolbarTimeout);
        iosToolbarTimeout = setTimeout(() => {
          $('.admin-toolbar').prop('hidden', false);
          positionToolbar();
        }, 100);
      });
    }
  })();
});
