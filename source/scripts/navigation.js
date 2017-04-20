/* eslint-env browser, jquery */
'use strict';

const NProgress = require('nprogress');
const Sortable = require('sortablejs');
const UndoManager = require('undo-manager');

$(() => {

  // Adds an undo state
  function addUndo(before, after) {
    undoManager.add({
      undo: () => setItems(before),
      redo: () => setItems(after)
    });
  }

  // Destroys the autocomplete control
  function disableAutocomplete(items) {
    items = items || '[data-autocomplete]';

    $(items).each(function() {
      $(this).typeahead('destroy');
    });
  }

  // Disables sorting
  function disableSorting() {
    sortable.destroy();
  }

  // Enables the autocomplete control
  function enableAutocomplete(items) {
    items = items || '[data-autocomplete]';

    $(items).each(function() {
      let input = this;

      // Enable typeahead on each input
      $(input).typeahead({
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
            case 'upload':
              return '<div><i class="fa fa-file-o"></i> ' + item.label + '</div>';
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
    });
  }

  // Enables sorting
  function enableSorting() {
    let after;
    let before;

    sortable = Sortable.create($('#nav-items').get(0), {
      animation: 150,
      filter: 'input, button, .twitter-typeahead',
      preventOnFilter: false,
      onChoose: function() {
        // Snapshot the list before dragging starts
        before = getItems();
      },
      onUpdate: function() {
        // Add undo state
        after = getItems();
        addUndo(before, after);
      }
    });
  }

  // Gets the nav items DOM state
  function getItems() {
    hideAutocomplete();
    return $('#nav-items').clone();
  }

  // Hides the autocomplete control
  function hideAutocomplete(items) {
    items = items || '[data-autocomplete]';

    $(items).each(function() {
      $(this).typeahead('close');
    });
  }

  // Gets the nav items
  function serializeItems() {
    let items = [];

    $('#nav-items .nav-item').each(function() {
      let label = $(this).find('input[name="label"]').val();
      let link = $(this).find('input[name="link"]').val();
      items.push({ label, link });
    });

    return {
      navigation: items
    };
  }

  // Sets the nav items state
  function setItems(state) {
    // Disable autocomplete and sorting temporarily
    disableAutocomplete();
    disableSorting();

    $('#nav-items').replaceWith(state);

    // Re-enable autocomplete and sorting
    enableAutocomplete();
    enableSorting();
  }

  let changesSaved = $('#navigation-form').attr('data-changes-saved');
  let cleanState = JSON.stringify(serializeItems());
  let linkSuggestions = JSON.parse($('#navigation-form').attr('data-link-suggestions'));
  let saveConfirmation = $('#navigation-form').attr('data-save-confirmation');
  let sortable;

  // Initialize the undo manager
  const undoManager = new UndoManager();
  undoManager.setCallback(() => {
    $('[data-undo]').prop('disabled', !undoManager.hasUndo());
    $('[data-redo]').prop('disabled', !undoManager.hasRedo());
  });

  // Enable autocomplete and sorting
  enableAutocomplete();
  enableSorting();
  toggleEmptyState();

  // Delete
  $(document).on('click', '[data-remove]', function() {
    let after;
    let before = getItems();

    // Remove the menu item
    $(this).closest('.nav-item').animateCSS('fadeOut', 300, function() {
      $(this).remove();

      // Add undo state
      after = getItems();
      addUndo(before, after);

      toggleEmptyState();
    });
  });

  // Toggles the empty state
  function toggleEmptyState(state) {
    if(typeof state === 'undefined') state = $('#nav-items .nav-item').length === 0;
    $('#empty').prop('hidden', !state);
    $('#nav-items').prop('hidden', state);
  }

  // Create
  $('[data-create]').on('click', () => {
    let template = $('#nav-item-template').html();
    let after;
    let before = getItems();

    // Toggle empty state
    toggleEmptyState(false);

    // Create the menu item
    $(template)
      .appendTo('#nav-items')
      .animateCSS('fadeIn', 300, function() {
        let labelInput = $(this).find('input[name="label"]');
        let linkInput = $(this).find('[data-autocomplete]');

        // Add undo state
        after = getItems();
        addUndo(before, after);

        // Enable autocomplete for the new field
        enableAutocomplete(linkInput);

        // Set focus
        $(labelInput).focus();
      });
  });

  // Handle input changes
  $(document).on('change', '#nav-items :input', function() {
    let input = this;
    let newVal = $(input).typeahead('val');
    let lastVal = input.defaultValue;
    let after;
    let before;

    // Get previous state
    $(input).typeahead('val', lastVal);
    before = getItems();

    // Revert back to new state
    $(input).typeahead('val', newVal);
    input.defaultValue = newVal;

    // Add undo state
    after = getItems();
    addUndo(before, after);
  });

  // Undo
  $('[data-undo]').on('click', () => undoManager.undo());

  // Redo
  $('[data-redo]').on('click', () => undoManager.redo());

  // Undo/redo shortcuts
  $(document).on('keydown', (event) => {
    if((event.metaKey || event.ctrlKey) && event.keyCode === 90) {
      if(event.shiftKey) {
        undoManager.redo();
      } else {
        undoManager.undo();
      }
    }
  });

  // Handle the form
  $('#navigation-form').ajaxSubmit({
    before: () => {
      let invalid = false;

      // Look for empty inputs
      $('#nav-items .nav-item').each(function() {
        let item = this;
        let label = $(item).find('input[name="label"]').val();
        let link = $(item).find('input[name="link"]').val();

        // Toggle warning class
        $(item).toggleClass('has-warning', !label.length || !link.length);

        // Shake on error
        if(!label.length || !link.length) {
          $(item).animateCSS('shake');
          invalid = true;
        }
      });

      // Don't submit if any fields are invalid
      if(invalid) {
        // Scroll to first invalid
        let el = $('#nav-items .has-warning:first');
        if($(el).is(':off-screen')) {
          // Scroll to invalid element (centered vertically)
          $('.main-container').animate({
            scrollTop:
              ($(el).offset().top - $(el).height() / 2) +
              ($('.main-container').offset().top - $(window).height() / 2) +
              $('.main-container').scrollTop()
          }, 300);
        }

        return false;
      }

      NProgress.start();
    },
    after: NProgress.done,
    data: () => serializeItems(),
    error: (res) => $.announce.warning(res.message),
    success: () => {
      // Update clean state
      cleanState = JSON.stringify(serializeItems());

      // Show a success message
      $.announce.success(changesSaved);
    }
  });

  // Save button
  $('[data-save]').on('click', () => $('#navigation-form').submit());

  // Watch for unsaved changes
  window.onbeforeunload = () => {
    if(JSON.stringify(serializeItems()) !== cleanState) {
      return saveConfirmation;
    }
  };
});
