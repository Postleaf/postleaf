//
// Toggle the mobile menu
//

/* eslint-env browser, jquery */
$(() => {
  // Show/hide the mobile menu with animation
  function toggleMenu(on) {
    // Show/hide with animation
    $('.admin-menu-items')
      .addClass('transition')
      .toggleClass('on', on)
      .on('transitionend', function() {
        $(this).removeClass('transition');
      });

    $('.admin-menu-toggle i')
      .toggleClass('fa-navicon', !on)
      .toggleClass('fa-remove', on);

    // Watch for ESC
    if(on) {
      $(document).on('keydown.admin-menu', (event) => {
        if(event.keyCode === 27) {
          toggleMenu(false);
        }
      });
    } else {
      $(document).off('.admin-menu');
    }
  }

  // Toggle the mobile menu
  $('.admin-menu-toggle').on('click', (event) => {
    event.preventDefault();
    toggleMenu(!$('.admin-menu-items').is('.on'));
  });

  // Keep admin menu dropdown inside the viewport
  $('.admin-menu-user-dropdown').on('shown.bs.dropdown', function() {
    let dropdown = $(this).find('.dropdown-menu');

    $(this)
      // Remove alignment class to check position
      .removeClass('dropup')
      // Assign alignment class if the menu is off-screen
      .toggleClass('dropup', $(dropdown).is(':off-bottom'));
  });

  // Enable tooltips (except for touch devices since tooltips prevent taps)
  if(!('ontouchstart' in document.documentElement)) {
    $('.admin-menu-item').tooltip({
      placement: 'right'
    });
  }
});
