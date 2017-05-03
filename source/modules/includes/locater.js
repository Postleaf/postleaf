/* eslint-env browser, jquery */
$(() => {
  'use strict';

  let isAvailable = $('#locater').length > 0;
  let action = $('#locater').attr('data-action');
  let searchTimeout;
  let lastQuery;
  let request;

  // Hides the locater control
  function hide() {
    // Remove bindings
    $(document).off('.locater');
    $('#locater-overlay').off('.locater');
    $('#locater-input').off('.locater');

    // Hide it
    $('html').removeClass('has-modal');
    $('#locater, #locater-overlay').animateCSS('fadeOut', 100, function() {
      $(this).prop('hidden', true);
    });
  }

  // Ensures the selected item is visible
  function keepInView(direction) {
    let selected = $('#locater-results').find('.active');
    let height = $('#locater-results').outerHeight();
    let scrollTop = $('#locater-results').scrollTop();
    let selectedTop = $(selected).position().top + scrollTop;
    let selectedHeight = $(selected).outerHeight();

    // Is it partially hidden?
    if(selectedTop < scrollTop || selectedTop + selectedHeight > scrollTop + height) {
      if(direction === 'up') {
        $('#locater-results').scrollTop(selectedTop);
      } else {
        $('#locater-results').scrollTop(selectedTop - height + selectedHeight);
      }
    }
  }

  // Moves the selection up or down
  function move(direction) {
    let items = $('#locater-results a');
    let selected = $('#locater-results .active');

    if($(selected).length) {
      // Clear selection
      $(items).removeClass('active');

      if(direction === 'up') {
        if($(selected).prev('a').length) {
          // Select adjacent item
          $(selected).prev('a').addClass('active');
        } else {
          // Cycle to last item
          $(items).last().addClass('active');
        }
      } else {
        if($(selected).next('a').length) {
          // Select adjacent item
          $(selected).next('a').addClass('active');
        } else {
          // Cycle to first item
          $(items).first().addClass('active');
        }
      }
    }

    keepInView(direction);
  }

  // Resets the control to its original state
  function reset() {
    $('#locater').removeClass('loading');
    $('#locater-input').val('');
    $('#locater-results').html('').prop('hidden', true);
    lastQuery = '';
  }

  // Shows the locater control
  function show() {
    // Don't show if there's another modal showing
    if($('html').hasClass('has-modal')) return false;

    // Reset it
    reset();

    // Show it
    $('html').addClass('has-modal');
    $('#locater, #locater-overlay')
      .prop('hidden', false)
      .css('opacity', 0)
      .animateCSS('fadeIn', 100, function() {
        $(this).css('opacity', 1);
        $('#locater-input').focus();
      });

    // Watch for key presses
    $(document).on('keydown.locater', (event) => {
      // Escape closes it
      if(event.keyCode === 27) {
        event.preventDefault();
        hide();
      }

      // Enter selects it
      if(event.keyCode === 13) {
        event.preventDefault();

        // Go to the selected item
        if($('#locater-results .active').length) {
          location.href = $('#locater-results .active').attr('href');
        }

        hide();
      }

      // Move up / down
      if(event.keyCode === 38 || event.keyCode === 40) {
        event.preventDefault();
        move(event.keyCode === 38 ? 'up' : 'down');
      }
    });

    // Close when the overlay is clicked
    $('#locater-overlay').on('click.locater', hide);

    // Watch the search field for changes
    $('#locater-input').on('keyup.locater', function() {
      let query = $(this).val();

      // Debounce requests
      clearTimeout(searchTimeout);
      if(request) request.abort();

      // Reset the UI when the search is cleared
      if(query === '') {
        reset();
        return;
      }

      // Nothing to do if the query hasn't changed
      if(query === lastQuery) {
        $('#locater').removeClass('loading');
        return;
      }

      // Fetch results
      $('#locater').addClass('loading');
      searchTimeout = setTimeout(() => {
        request = $.ajax({
          url: action,
          type: 'GET',
          data: {
            search: query,
            render: 'locaterResults'
          }
        })
          .done((res) => {
            request = null;
            lastQuery = query;

            // Show the results, or clear them if none were found
            if(res.html && res.results.length) {
              $('#locater-results').html(res.html).prop('hidden', false);
              $('#locater-results a:first').addClass('active');
            } else {
              $('#locater-results').html('').prop('hidden', true);
            }
          })
          .always(() => $('#locater').removeClass('loading'));
      }, 300);
    });
  }

  $(document)
    // Toggle with CMD|CTRL + SHIFT + F
    .on('keydown', (event) => {
      if((event.metaKey || event.ctrlKey) && event.shiftKey && event.keyCode === 70) {
        event.preventDefault();

        // Only show if the locater is available
        if(isAvailable) {
          $('#locater').is(':visible') ? hide() : show();
        }
      }
    })
    // Show when clicking [href="#locater"]
    .on('click', '[href="#locater"]', (event) => {
      event.preventDefault();

      // Only show if the locater is available
      if(isAvailable) {
        $('#locater').is(':visible') ? hide() : show();
      }
    });
});
