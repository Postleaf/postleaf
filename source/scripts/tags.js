/* eslint-env browser, jquery */

const NProgress = require('nprogress');

'use strict';

$(() => {

  let searchAction = $('[data-search]').attr('data-action');

  // Handle tag selection
  $('#tags')
    .selectable({
      items: '.card',
      multiple: true,
      change: function(values) {
        let elements = $(this).selectable('getElements');

        // Toggle toolbar buttons when selection changes
        $('[data-open], [data-edit]').prop('disabled', values.length !== 1);
        $('[data-delete]').prop('disabled', values.length === 0);

        // Toggle tags/empty state
        $('#tags').prop('hidden', elements.length === 0);
        $('#empty').prop('hidden', elements.length !== 0);
      },
      doubleClick: (value, el) => {
        let url = $(el).attr('data-edit-action');

        if(url) {
          location.href = $(el).attr('data-edit-action');
        }
      }
    })
    // Trigger change immediately to update initial view
    .selectable('change');

  // Remove selection when clicking outside of a tag
  $('main').on('click', (event) => {
    if(!$(event.target).parents().addBack().is('.card')) {
      $('#tags').selectable('selectNone');
    }
  });

  // Search
  let lastSearch = '';
  let searchTimeout;
  let searchRequest;
  $('[data-search]').on('change keyup paste', function() {
    let search = this.value;
    let selection = $('#tags').selectable('value');

    clearTimeout(searchTimeout);
    if(search === lastSearch) return;

    searchTimeout = setTimeout(() => {
      // Run the search
      if(searchRequest) searchRequest.abort();
      searchRequest = $.ajax({
        url: searchAction,
        type: 'GET',
        data: {
          search: search,
          render: 'tagCards'
        }
      })
      .done((res) => {
        searchRequest = null;
        lastSearch = search;

        // Update the tag list
        if(res.html) {
          $('#tags')
            .html(res.html)
            .selectable('value', selection);
        }
      });
    }, 300);
  });

  // Open
  $('[data-open]').on('click', () => {
    let url = $('#tags').selectable('getElements', true)[0].getAttribute('data-open-action');

    if(url) {
      location.href = url;
    }
  });

  // Edit
  $('[data-edit]').on('click', () => {
    let url = $('#tags').selectable('getElements', true)[0].getAttribute('data-edit-action');

    if(url) {
      location.href = url;
    }
  });

  // Delete
  $('[data-delete]').on('click', function() {
    let selectedTags = $('#tags').selectable('getElements', true);
    let confirm = $(this).attr('data-confirm');
    let numTags = selectedTags.length;
    let numDeleted = 0;

    // Quick confirmation
    $.alertable.confirm(confirm).then(() => {
      // Start progress
      NProgress.start();

      // Delete each tag
      $.each(selectedTags, (index, el) => {
        let id = $(el).attr('data-value');
        let url = $(el).attr('data-delete-action');

        $.ajax({
          url: url,
          type: 'DELETE'
        })
        .done(() => {
          let tag = $('#tags').selectable('getElements', id);

          // Remove the tag from the list
          $(tag)
            .parent()
            .animateCSS('fadeOut', 300, function() {
              $(this).remove();

              // Update the selectable control
              $('#tags').selectable('change');
            });
        })
        .always(() => NProgress.set(++numDeleted / numTags));
      });
    });
  });

});
