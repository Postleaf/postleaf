/* eslint-env browser, jquery */
$(() => {
  'use strict';

  let isAvailable = $('#locater').length > 0;

  // Hides the shortcuts screen
  function hide() {
    // Remove bindings
    $(document).off('.shortcuts');
    $('#shortcuts').off('.shortcuts');

    // Hide it
    $('html').removeClass('has-modal');
    $('#shortcuts, #shortcuts-overlay').animateCSS('fadeOut', 100, function() {
      $(this).prop('hidden', true);
    });
  }

  // Shows the shortcuts screen
  function show() {
    // Don't show if there's another modal showing
    if($('html').hasClass('has-modal')) return false;

    // Show it
    $('html').addClass('has-modal');
    $('#shortcuts, #shortcuts-overlay')
      .prop('hidden', false)
      .css('opacity', 0)
      .animateCSS('fadeIn', 100, function() {
        $(this).css('opacity', 1);
      });

    // Escape or enter closes it
    $(document).on('keydown.shortcuts', (event) => {
      if(event.keyCode === 27 || event.keyCode === 13) {
        event.preventDefault();
        hide();
      }
    });

    // Close when the overlay is clicked. Note that this particular control has certain styles to
    // allow the window scroll when it's too tall, to we actually have to check for clicks on
    // #shortcuts (but not #shortcuts-body).
    $('#shortcuts').on('click.shortcuts', (event) => {
      if(!$(event.target).parents().addBack().is('#shortcuts-body')) {
        hide();
      }
    });
  }

  $(document)
    // Show with f1
    .on('keydown', (event) => {
      if(event.keyCode === 112) {
        event.preventDefault();

        // Only show if shortcuts are available
        if(isAvailable) {
          show();
        }
      }
    })
    // Show when clicking on data-shortcuts="show"
    .on('click', '[data-shortcuts="show"]', (event) => {
      event.preventDefault();
      show();
    })
    // Show when clicking on data-shortcuts="hide"
    .on('click', '[data-shortcuts="hide"]', (event) => {
      event.preventDefault();
      hide();
    });
});
