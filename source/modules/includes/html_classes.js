//
// Helper classes
//

/* eslint-env browser, jquery */
$(() => {
  // Platform classes on <html>
  $('html')
    .toggleClass('ios', /iPad|iPhone|iPod/.test(navigator.platform))
    .toggleClass('mac', navigator.appVersion.indexOf('Mac') > -1)
    .toggleClass('linux', navigator.appVersion.indexOf('Linux') > -1)
    .toggleClass('windows', navigator.appVersion.indexOf('Windows') > -1);

  // Remove preload class to prevent transitions (see _overrides.scss)
  $('body').removeClass('preload');
});
