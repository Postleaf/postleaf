//
// A simple panel implementation.
//
// Usage:
//
//  <button data-panel-show="#my-panel">Show Panel</button>
//
//  <div id="my-panel" class="panel panel-right">
//    ...
//  </div>
//
// Notes:
//  - You can watch for events on the panel element
//    - show.panel - fires before the panel is shown.
//    - shown.panel - fires after the panel is shown.
//    - hide.panel - fires before the panel is hidden.
//    - hidden.panel - fires after the panel is hidden.
//
// Wishlist:
//  - This would probably make a great micro-plugin.
//

/* eslint-env browser, jquery */
if(jQuery) (function($) {
  'use strict';

  //
  // Shows the specified panel.
  //
  //  panel* (string) - A selector targetting the panel to show.
  //
  // No return value.
  //
  function show(panel) {
    // Don't show if there's a modal showing
    if($('html').hasClass('has-modal')) return false;

    // Hide existing panels
    hide();

    // Fire the show.panel event
    let event = $.Event('show.panel');
    $(panel).trigger(event);
    if(event.isDefaultPrevented()) return false;

    // Show the specified panel
    $(panel)
      .on('transitionend.panel', () => {
        $(panel)
          .off('transitionend.panel')
          .trigger('shown.panel');
      })
      .addClass('active');

    $(document)
      // Watch for keypresses or clicks outside the panel
      .on('touchstart.panel keydown.panel mousedown.panel', (event) => {
        if(
          // Is it outside the panel?
          !$(event.target).parents().addBack().is(panel) &&
          // Ignore modifier keypresses
          !(event.metaKey || event.cmdKey || event.shiftKey)
        ) {
          hide();
        }
      })
      // Watch for the escape key
      .on('keydown.panel', (event) => {
        if(event.keyCode === 27) {
          event.preventDefault();
          hide();
        }
      });

    // Watch for form submission
    $(panel).find('form').on('submit.panel', (event) => {
      event.preventDefault();
      hide();
    });

    // Watch for clicks on the close button
    $(panel).find('[data-panel-hide]').on('click.panel', (event) => {
      event.preventDefault();
      hide();
    });
  }

  //
  // Hides the specified panel or all panels.
  //
  // No return value.
  //
  function hide() {
    let panel = '.panel.active';

    // Fire the hide.panel event
    let event = $.Event('hide.panel');
    $(panel).trigger(event);
    if(event.isDefaultPrevented()) return false;

    // Don't hide the panel if there's an active alertable modal. We do this because we don't want
    // interactions made while an alertable (alert, confirm, prompt) is open to hide the active
    // panel.
    if($('.alertable:visible').length) return;

    // Remove bindings
    $(panel).find('[data-panel-hide]').off('.panel');
    $(document).off('.panel');

    // Hide the panel
    $(panel)
      .on('transitionend.panel', () => {
        $(panel)
          .off('transitionend.panel')
          .trigger('hidden.panel');
      })
      .removeClass('active');
  }

  // Expose the API
  $.extend($.fn, {
    panel: function(method) {
      switch(method) {
      case 'show':
        show(this);
        break;
      case 'hide':
        hide();
        break;
      }
    }
  });

  // Wait for the DOM
  $(() => {
    // Show panels when any element with data-toggle="panel" is selected
    $(document).on('click', '[data-panel-show]', function(event) {
      event.preventDefault();
      show($(this).attr('data-panel-show'));
    });
  });
})(jQuery);
