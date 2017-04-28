/* eslint-env browser, jquery */
'use strict';

// Node modules
const Clipboard = require('clipboard');
const NProgress = require('nprogress');
const Promise = require('bluebird');

let loadAction = $('#file-manager').attr('data-load-action');
let uploadAction = $('#file-manager').attr('data-upload-action');
let isAvailable = $('#file-manager').length > 0;
let enableSelect = false;
let moreFiles = true;
let multiSelect = true;
let currentPage;
let dropzoneTimeout;
let mimeTypes;
let onSelect;
let searchTimeout;
let lastSearch;
let loadRequest;

//
// Fetches uploaded files from the API.
//
//  page* (int) - The page number to fetch.
//
// Returns a promise that resolves with a response object.
//
function getFiles(page) {
  return new Promise((resolve, reject) => {
    let query = $('#file-manager-search').val();
    let count = 50;
    let offset = (page - 1) * count;

    // Fetch results
    if(loadRequest) loadRequest.abort();
    loadRequest = $.ajax({
      url: loadAction,
      type: 'GET',
      data: {
        search: query,
        mimeType: mimeTypes,
        count: count,
        offset: offset,
        render: 'fileManagerItems'
      }
    })
      .done((res) => {
        loadRequest = null;
        currentPage = page;
        moreFiles = res.totalItems > count * page;

        // Update the file list
        if(res.html) {
          // Reset the list
          if(page === 1) $('#file-manager-items').html('');

          // Append files
          $('#file-manager-items').append(res.html);
        }

        resolve(res);
      })
      .fail((jqXHR) => {
        if(jqXHR.responseJSON) {
          reject(jqXHR.responseJSON);
        }
      })
      .always(() => $('#file-manager').removeClass('loading'));
  });
}

// Hides the file manager
function hide() {
  if(!isAvailable) return false;

  // Don't dismiss if a confirmation modal is showing
  if($('.alertable:visible').length) return false;

  // Remove bindings
  $(document).off('.file-manager');

  // Hide it
  $('html').removeClass('has-modal');
  $('#file-manager-overlay').prop('hidden', true);
  $('#file-manager').animateCSS('slideOutDown', 300, function() {
    $(this).prop('hidden', true);
    reset();
  });
}

//
// Hides the drop zone.
//
// No return value.
//
function hideDropzone() {
  // Hide the dropzone after a short delay to prevent flickering in some browsers when dragging
  // over a child element of the dropzone.
  dropzoneTimeout = setTimeout(() => $('#file-manager-dropzone').prop('hidden', true));
}

// Resets the control to its original state
function reset() {
  $('[data-file-manager-download]').prop('disabled', true);
  $('[data-file-manager-copy]').prop('disabled', true);
  $('[data-file-manager-delete]').prop('disabled', true);
  $('[data-file-manager-select]').prop('disabled', true);
  $('#file-manager-items').prop('hidden', false).html('');
  $('#file-manager-empty').prop('hidden', true);
  $('#file-manager-search').val('');
  clearTimeout(searchTimeout);
  lastSearch = '';
}

//
// Iterates all items passed and returns an array of their parsed data-json attributes.
//
//  items* (element|array) - An element or an array of elements.
//
// Returns an array of uploaded file objects.
//
function parseItemJson(items) {
  let result = [];
  if(!Array.isArray(items)) items = [items];

  // Loop through all selected items
  if(items.length) {
    items.forEach((item) => {
      let json = $(item).attr('data-json');

      try {
        result.push(JSON.parse(json));
      } catch(err) { /* skip */ }
    });
  }

  return result;
}

//
// Runs the onSelect callback and hides the control.
//
//  items* (object|array) - An uploaded file object or an array of file objects.
//
// No return value.
//
function select(items) {
  if(!enableSelect) return;

  hide();

  // Cast to array
  if(!Array.isArray(items)) items = [items];

  // If multi-select is disabled, only return one item
  if(!multiSelect) items = items[0];

  if(typeof onSelect === 'function') {
    onSelect(items);
  }
}

// Shows the file manager
function show() {
  if(!isAvailable) return false;

  // Don't show if there's another modal showing
  if($('html').hasClass('has-modal')) return false;

  // Reset the control
  reset();

  // Toggle select
  $('[data-file-manager-select]').prop('hidden', !enableSelect);

  // Show it
  $('html').addClass('has-modal');
  $('#file-manager').addClass('loading');
  $('#file-manager-overlay').prop('hidden', false);
  $('#file-manager')
    .prop('hidden', false)
    .animateCSS('slideInUp', 300, () => {
      $('#file-manager-search').focus();

      // Load initial items after the animation so images loading won't affect performance
      getFiles(1).then(() => $('#file-manager-items').selectable('change'));
    });

  // Watch for key presses
  $(document).on('keydown.file-manager', (event) => {
    // Escape closes it
    if(event.keyCode === 27) {
      event.preventDefault();
      hide();
    }
  });
}

//
// Shows the drop zone.
//
// No return value.
//
function showDropzone() {
  clearTimeout(dropzoneTimeout);
  $('#file-manager-dropzone').prop('hidden', false);
}

//
// Uploads one or more files.
//
//  files* (array) - An array of files to upload.
//
// Returns a promise that resolves with an array of upload objects.
//
function upload(files) {
  return new Promise((resolve, reject) => {
    let uploadQueue = [];
    let newUploads = [];

    if(!files || !files.length) return;
    event.preventDefault();

    // Reset the UI and add a loading state while the uploads process
    hideDropzone();
    reset();
    $('#file-manager').addClass('loading');

    // Build an upload queue
    for(let i = 0; i < files.length; i++) {
      uploadQueue.push(
        new Promise((resolve, reject) => {
          let formData = new FormData();

          // Append image file
          formData.append('file', files[i]);

          // Upload the image
          $.ajax({
            url: uploadAction,
            type: 'POST',
            data: formData,
            dataType: 'json',
            contentType: false,
            processData: false,
            cache: false
          })
            .done((res) => resolve(res))
            .fail((jqXHR) => reject(jqXHR.responseJSON));
        })
      );
    }

    Promise
      // Wait for all uploads to complete
      .all(uploadQueue)
      // Get a list of the new uploads
      .then((responses) => {
        responses.forEach((response) => {
          newUploads.push(response.upload.id);
        });
      })
      // Refresh items to show the newest ones
      .then(() => {
        return getFiles(1).then(() => $('#file-manager-items').selectable('change'));
      })
      // Set selection on the new uploads
      .then(() => {
        $('#file-manager-items').selectable('value', newUploads);

        resolve(newUploads);
      })
      .catch((err) => reject(err));
  });
}

// Listeners
$(() => {
  // Close when the overlay is clicked
  $('#file-manager-overlay').on('click.locater', () => hide());

  // Enable selections
  $('#file-manager-items')
    .selectable({
      items: '.file-manager-item',
      multiple: true,
      change: function(values) {
        let elements = $('#file-manager-items').selectable('getElements');
        let selectedElements = $('#file-manager-items').selectable('getElements', true);
        let copyText = values.length === 1 ? $(selectedElements[0]).attr('data-copy-action') : '';

        // Toggle toolbar buttons when selection changes
        $('[data-file-manager-download]').prop('disabled', values.length !== 1);
        $('[data-file-manager-copy]').prop('disabled', values.length !== 1);
        $('[data-file-manager-delete]').prop('disabled', values.length === 0);
        $('[data-file-manager-select]')
          .prop('disabled', multiSelect ? values.length === 0 : values.length !== 1);

        // Toggle uploads/empty state
        $('#file-manager-items').prop('hidden', elements.length === 0);
        $('#file-manager-empty').prop('hidden', elements.length !== 0);

        // Set copy text
        $('[data-file-manager-copy]').attr('data-clipboard-text', copyText);
      },
      doubleClick: (value, el) => select(parseItemJson(el))
    });

  // Remove selection when clicking outside of an item
  $('#file-manager-items').on('click', (event) => {
    if(!$(event.target).parents().addBack().is('.file-manager-item')) {
      $('#file-manager-items').selectable('selectNone');
    }
  });

  // Watch for drag and drop if uploads are enabled
  $('#file-manager')
    .on('dragover', (event) => {
      event.preventDefault();
      showDropzone();
    })
    .on('dragleave', (event) => {
      event.preventDefault();
      hideDropzone();
    })
    .on('drop', (event) => {
      upload(event.originalEvent.dataTransfer.files)
        .catch((err) => {
          // Reload files
          getFiles(1);

          if(err.message) {
            $.announce.warning(err.message);
          }
        });
    });

  // Prevent drops on the overlay from redirecting the browser to the file
  $('#file-manager-overlay').on('dragover drop', (event) => event.preventDefault());

  // Watch the search field for changes
  $('#file-manager-search').on('keyup', function() {
    let search = $(this).val();
    let selection = $('#file-manager-items').selectable('value');

    // Debounce requests
    clearTimeout(searchTimeout);
    if(search === lastSearch) return;
    searchTimeout = setTimeout(() => {
      getFiles(1)
        .then(() => {
          // Remember the previous search
          lastSearch = search;

          // Restore selection when possible
          $('#file-manager-items').selectable('value', selection);
        });
    }, 300);
  });

  // Infinite scrolling
  $('#file-manager-items').on('scroll', function() {
    let div = this;
    let scrollPos = $(div).scrollTop() + $(div).height();
    let scrollHeight = div.scrollHeight;
    let threshold = $(window).height() / 2;

    // Load the next page of files
    if(moreFiles && !loadRequest && scrollPos >= scrollHeight - threshold) {
      NProgress.start();
      getFiles(currentPage + 1)
        .then(() => NProgress.done())
        .catch(() => NProgress.done());
    }
  });

  // Upload
  $('[data-file-manager-upload]').on('change', ':file', function(event) {
    let input = $(this);

    upload(event.target.files)
      .then(() => {
        // Reset the input
        $(input).val('');
      })
      .catch((err) => {
        if(err.message) {
          $.announce.warning(err.message);
        }
      });
  });

  // Download
  $('[data-file-manager-download]').on('click', () => {
    let selectedItems = $('#file-manager-items').selectable('getElements', true);
    let url = $(selectedItems[0]).attr('data-download-action');
    location.href = url;
  });

  // Copy
  if(Clipboard.isSupported()) {
    let button = $('[data-file-manager-copy]');
    let copied = $(button).attr('data-copied');
    let clipboard = new Clipboard('[data-file-manager-copy]');

    // Show a brief message when a link is copied
    clipboard.on('success', () => $.announce.info(copied));
  } else {
    $('[data-file-manager-copy]').remove();
  }

  // Delete
  $('[data-file-manager-delete]').on('click', function() {
    let selectedItems = $('#file-manager-items').selectable('getElements', true);
    let confirm = $(this).attr('data-confirm');
    let numItems = selectedItems.length;
    let numDeleted = 0;

    // Quick confirmation
    $.alertable.confirm(confirm).then(() => {

      // Start progress
      NProgress.start();

      // Delete each tag
      $.each(selectedItems, (index, el) => {
        let id = $(el).attr('data-value');
        let url = $(el).attr('data-delete-action');

        $.ajax({
          url: url,
          type: 'DELETE'
        })
        .done(() => {
          let item = $('#file-manager-items').selectable('getElements', id);

          // Remove the item from the list
          $(item)
            .animateCSS('fadeOut', 300, function() {
              $(this).remove();

              // Update the selectable control
              $('#file-manager-items').selectable('change');
            });
        })
        .always(() => NProgress.set(++numDeleted / numItems));
      });
    });
  });

  // Select
  $('[data-file-manager-select]').on('click', () => {
    let selectedItems = $('#file-manager-items').selectable('getElements', true);
    select(parseItemJson(selectedItems));
  });

  // Global shortcuts
  $(document)
    // Toggle with CMD|CTRL + SHIFT + U
    .on('keydown', (event) => {
      if((event.metaKey || event.ctrlKey) && event.shiftKey && event.keyCode === 85) {
        event.preventDefault();
        self.show();
      }
    })
    // Show when clicking [href="#file-manager"]
    .on('click', '[href="#file-manager"]', (event) => {
      event.preventDefault();
      self.show();
    });
});

// Public API
const self = {
  //
  // Shows the file manager.
  //
  // No return value.
  //
  show: () => {
    enableSelect = false;
    multiSelect = true;
    mimeTypes = null;
    onSelect = null;

    show();
  },

  //
  // Hides the file manager.
  //
  // No return value.
  //
  hide: () => hide(),

  //
  // Opens the file manager in selection mode.
  //
  //  options (object)
  //    - mimeTypes (array) - The mime types to show (default all).
  //    - multiSelect (boolean) - Whether or not to allow multiple file selections (default true).
  //    - onSelect (function) - A callback function to run when a file is selected.
  //
  // No return value.
  //
  select: (options) => {
    options = options || '';
    enableSelect = true;
    multiSelect = options.multiSelect;
    mimeTypes = options.mimeTypes;
    onSelect = options.onSelect;

    // Convert mime types array to a CSV string
    if(mimeTypes && mimeTypes.length) {
      mimeTypes = mimeTypes.join(',');
    }

    show();
  }
};

module.exports = self;
