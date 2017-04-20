// Show/hide password fields when [data-toggle-password=".input-selector"]

/* eslint-env browser, jquery */
$(() => {
  $(document).on('click', '[data-toggle-password]', function() {
    let trigger = this;
    let icon = $(trigger).find('.fa-eye, .fa-eye-slash');
    let target = $(trigger).attr('data-toggle-password');
    let type = $(target).prop('type') === 'password' ? 'text' : 'password';

    // Toggle the field type
    $(target).prop('type', type);

    // Toggle the icon
    $(icon)
      .toggleClass('fa-eye', type === 'password')
      .toggleClass('fa-eye-slash', type !== 'password');
  });
});
