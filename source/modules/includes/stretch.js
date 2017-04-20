//
// Stretch helpers (see source/styles/_stretch.scss)
//

/* eslint-env browser, jquery */
$(() => {
  function stretchDown() {
    var winHeight = $(window).height();
    $('.stretch-down').each(function() {
      $(this).outerHeight(winHeight - $(this).offset().top);
    });
  }
  $(window).on('resize.postleaf', stretchDown);
  stretchDown();
});
