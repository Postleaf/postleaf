//
// Custom alertable defaults
//

/* eslint-env browser, jquery */
$(() => {
  $.alertable.defaults.show = function() {
    var modal = this.modal;
    var overlay = this.overlay;

    function reposition() {
      var height = $(modal).outerHeight();
      var winHeight = $(window).height();
      var top = (winHeight * .45) - (height / 2); // slightly above halfway up

      $(modal).css('top', top + 'px');
    }

    // Maintain vertical position on resize
    reposition();
    $(window).on('resize.alertable', reposition);

    // Show it
    $(modal).add(overlay).stop(true, true).fadeIn(100);

    // Brief delay before focusing to let the transition show the modal
    setTimeout(() => {
      if($(modal).find('.alertable-prompt').length) {
        // Focus on first prompt input
        $(modal).find('.alertable-prompt :input:first').focus();
      } else {
        // Focus on the submit button
        $(modal).find(':submit').focus();
      }
    }, 10);
  };

  $.alertable.defaults.hide = function() {
    $(window).off('.alertable');
    $(this.modal).add(this.overlay).stop(true, true).fadeOut(100);
  };
});
