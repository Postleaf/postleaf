/* eslint-env browser, jquery */
'use strict';

const Cookie = require('js-cookie');
const NProgress = require('nprogress');
const Promise = require('bluebird');

$(() => {

  //
  // Gets a list of posts.
  //
  //  page* (int) - The page number to fetch.
  //
  // Return a promise that resolves with the response object.
  //
  function getPosts(page) {
    return new Promise((resolve, reject) => {
      let search = $('[data-search]').val();
      let count = $('[data-search]').attr('data-items-per-page');
      let offset = (page - 1) * count;
      let status = [];
      let flag = [];

      // Filter by statuses
      $('[data-filter="status"] :checkbox').each(function() {
        if(this.checked) status.push(this.value);
      });

      // Filter by flags
      $('[data-filter="flag"] :checkbox').each(function() {
        if(this.checked) flag.push(this.value);
      });

      // Set a cookie to remember post filters
      Cookie.set('postFilters', [].concat(status, flag).join(','));

      // Unset filters if none are enabled
      status = status.length ? status.join(',') : undefined;
      flag = flag.length ? flag.join(',') : undefined;

      // Fetch posts
      if(postRequest) postRequest.abort();
      postRequest = $.ajax({
        url: searchAction,
        type: 'GET',
        data: {
          search: search,
          status: status,
          flag: flag,
          count: count,
          offset: offset,
          render: 'postItems'
        }
      })
      .done((res) => {
        postRequest = null;
        currentPage = page;
        morePosts = res.totalItems > count * page;

        // Update the post list
        if(res.html) {
          // Reset the list
          if(page === 1) $('#posts').html('');

          // Append posts
          $('#posts').append(res.html);
        }

        resolve(res);
      })
      .fail((jqXHR) => reject(jqXHR.responseJSON));
    });
  }

  let currentPage = 1;
  let morePosts = true;
  let postRequest;
  let searchAction = $('[data-search]').attr('data-action');

  // Restore post filters from cookie
  if(Cookie.get('postFilters')) {
    // Set checked property
    let filters = Cookie.get('postFilters').split(',');
    $('#post-filter :checkbox').each(function() {
      $(this).prop('checked', filters.includes(this.value));
    });

    // Toggle filter icon
    let hasFilter = $('#post-filter :checked').length > 0;
    $('#post-filter').toggleClass('active', hasFilter);
  }

  // Handle post selection
  $('#posts')
    .selectable({
      items: '.post-item',
      multiple: true,
      change: function(values) {
        let elements = $(this).selectable('getElements');
        let selection = $(this).selectable('getElements', true);

        // Update selection count
        $('.num-selected').text(values.length);

        // Toggle toolbar buttons when selection changes
        $('[data-open], [data-edit]').prop('disabled', values.length !== 1);
        $('[data-delete]').prop('disabled', values.length === 0);

        // Toggle preview/selection state
        $('#preview').prop('hidden', values.length !== 1);
        $('#none-selected').prop('hidden', values.length !== 0);
        $('#many-selected').prop('hidden', values.length < 2);

        // Update preview
        if(values.length === 1) {
          $('#preview').addClass('loading');
          $('#preview-frame')
            .prop('src', $(selection).attr('data-preview-action'))
            .one('load', function() {
              let frame = this;

              $('#preview').removeClass('loading');

              // Disable user interaction and selection on all elements in the frame
              $('html *', frame.contentWindow.document)
                .css('pointer-events', 'none')
                .css('user-select', 'none');

              // Show a pointer cursor and open the post for editing when clicked
              $('html', frame.contentWindow.document)
                .css('cursor', 'pointer')
                .on('mousedown', (event) => event.preventDefault())
                .on('click', (event) => {
                  let url = $('#posts').selectable('getElements', true)[0].getAttribute('data-edit-action');
                  location.href = url;
                  event.preventDefault();
                });
            });
        }

        // Toggle posts/empty state
        $('#posts').prop('hidden', elements.length === 0);
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

  // Remove selection when clicking outside of a post
  $('main').on('click', (event) => {
    if(!$(event.target).parents().addBack().is('.post-item')) {
      $('#posts').selectable('selectNone');
    }
  });

  // Search
  let lastSearch = '';
  let searchTimeout;
  $('[data-search]').on('change keyup paste', function() {
    let search = this.value;
    let selection = $('#posts').selectable('value');

    // Debounce requests as the user types
    clearTimeout(searchTimeout);
    if(search === lastSearch) return;
    searchTimeout = setTimeout(() => {
      // Run the search
      getPosts(1).then(() => {
        // Remember the previous search
        lastSearch = search;

        // Restore selection when possible
        $('#posts').selectable('value', selection);
      });
    }, 300);
  });

  // Infinite scrolling
  $('#posts').on('scroll', function() {
    let div = this;
    let scrollPos = $(div).scrollTop() + $(div).height();
    let scrollHeight = div.scrollHeight;
    let threshold = $(window).height() / 2;

    // Load the next page of posts
    if(morePosts && !postRequest && scrollPos >= scrollHeight - threshold) {
      NProgress.start();
      getPosts(currentPage + 1)
        .then(NProgress.done)
        .catch(NProgress.done);
    }
  });

  // Post filter
  $('#post-filter')
    // Prevent the dropdown from closing when toggling filters
    .find('.dropdown-item').on('click', (event) => event.stopPropagation()).end()
    // Apply filters
    .find(':checkbox').on('change', () => {
      let hasFilter = $('#post-filter :checked').length > 0;

      // Toggle filter icon
      $('#post-filter').toggleClass('active', hasFilter);

      // Update posts
      getPosts(1).then(() => {
        // Trigger UI update
        $('#posts').selectable('change');
      });
    });

  // Keep the filter dropdown on screen
  $('#post-filter').on('shown.bs.dropdown', function() {
    let dropdown = $(this).find('.dropdown-menu');

    $(dropdown)
      // Remove alignment class to check position
      .removeClass('dropdown-menu-right')
      // Assign alignment class if the menu is off-screen
      .toggleClass('dropdown-menu-right', $(dropdown).is(':off-right'));
  });

  // Open
  $('[data-open]').on('click', () => {
    let url = $('#posts').selectable('getElements', true)[0].getAttribute('data-open-action');

    if(url) {
      location.href = url;
    }
  });

  // Edit
  $('[data-edit]').on('click', () => {
    let url = $('#posts').selectable('getElements', true)[0].getAttribute('data-edit-action');

    if(url) {
      location.href = url;
    }
  });

  // Delete
  $('[data-delete]').on('click', function() {
    let selectedPosts = $('#posts').selectable('getElements', true);
    let confirm = $(this).attr('data-confirm');
    let numPosts = selectedPosts.length;
    let numDeleted = 0;

    // Quick confirmation
    $.alertable.confirm(confirm).then(() => {
      NProgress.start();

      // Delete each post
      $.each(selectedPosts, (index, el) => {
        let id = $(el).attr('data-value');
        let url = $(el).attr('data-delete-action');

        $.ajax({
          url: url,
          type: 'DELETE'
        })
        .done(() => {
          let post = $('#posts').selectable('getElements', id);

          // Remove the post from the list
          $(post)
            .animateCSS('fadeOut', 300, function() {
              $(this).remove();

              // Update the selectable control
              $('#posts').selectable('change');
            });
        })
        .always(() => NProgress.set(++numDeleted / numPosts));
      });
    });
  });
});
