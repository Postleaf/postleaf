//
// Custom ajaxSubmit defaults
//

/* eslint-env browser, jquery */
$(() => {
  $.ajaxSubmit.defaults.messageSuccessClasses = 'alert alert-success';
  $.ajaxSubmit.defaults.messageErrorClasses = 'alert alert-warning';
});
