//
// Dropdown animations
//

/* eslint-env browser, jquery */
$(() => {
  $(document)
    .on('show.bs.dropdown', '.dropdown', function() {
      $(this).find('.dropdown-menu').stop(true, true).fadeIn(100);
    })
    .on('hide.bs.dropdown', '.dropdown', function() {
      $(this).find('.dropdown-menu').stop(true, true).fadeOut(100);
    });
});
