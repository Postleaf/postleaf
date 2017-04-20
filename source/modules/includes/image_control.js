/* eslint-env browser, jquery */

if(jQuery) (function($) {
  'use strict';

  $.extend($.fn, {

    imageControl: function() {

      $(this).each(function() {
        let control = this;
        let uploadAction = $(control).attr('data-upload-action');
        let input = $(control).find('input[type="hidden"]');
        let mimeTypes = ['image/gif', 'image/jpeg', 'image/png', 'image/svg+xml'];

        // Hides the dropzone
        function hideDropzone() {
          $(control).removeClass('image-control-dragging');
        }

        // Returns true if the user is dragging an actual file
        function isDraggingFile(event) {
          if(event.originalEvent === undefined) return false;
          if(event.originalEvent.dataTransfer === undefined) return false;
          return $.inArray('Files', event.originalEvent.dataTransfer.types) > -1;
        }

        // Shows the dropzone
        function showDropzone() {
          $(control).addClass('image-control-dragging');
        }

        // Uploads a file
        function upload(file) {
          let input = $(control).find('input[type="hidden"]');
          let formData = new FormData();

          // Append image file
          formData.append('file', file);

          // Upload the image
          $.ajax({
            url: uploadAction,
            type: 'POST',
            data: formData,
            dataType: 'json',
            contentType: false,
            processData: false,
            cache: false,
            progress: function(event) {
              if(event.lengthComputable) {
                // Trigger the uploadProgress event with %
                $(control).trigger('uploadProgress.imageControl', event.loaded / event.total);
              }
            }
          })
            .done((res) => {
              // Update the image
              if(res.upload && mimeTypes.includes(res.upload.mimeType)) {
                let src = res.upload.path;

                $(control).attr('style', 'background-image: url("' + src + '");');
                $(control).find('[data-remove]').prop('hidden', false);
                $(input).val(src).trigger('change');
              }
            })
            .fail((jqXHR) => {
              // Show error message
              if(jqXHR.responseJSON.message) {
                $.announce.warning(jqXHR.responseJSON.message);
              }
            })
            .always(() => {
              // Reset the input
              $(control).find(':file').val('');

              // Trigger the uploadComplete event
              $(control).trigger('uploadComplete.imageControl');
            });
        }

        // Remove images
        $(control)
          .find('[data-remove]').on('click', function() {
            $(this).prop('hidden', true);
            $(control).removeAttr('style');
            $(input).val('');
          });

        // Browse for images
        $(control).find('[data-browse]').on('click', () => {
          Postleaf.FileManager.select({
            mimeTypes: mimeTypes,
            multiSelect: false,
            onSelect: (file) => $(input).val(file.path).trigger('change')
          });
        });

        // Watch for file changes or drag and drop if uploads are enabled
        $(control)
          .on('change', ':file', (event) => {
            // Upload it
            if(event.target.files.length) {
              upload(event.target.files[0]);
            }
          })
          .on('dragover', (event) => {
            event.preventDefault();
            if(isDraggingFile(event)) {
              showDropzone.call(control);
            }
          })
          .on('dragleave', (event) => {
            event.preventDefault();
            hideDropzone.call(control);
          })
          .on('drop', (event) => {
            let file = event.originalEvent.dataTransfer.files[0];
            let image = mimeTypes.includes(file.type);

            hideDropzone.call(control);
            event.preventDefault();

            // Only upload the file if it's an image
            if(!image) return;

            // Upload it
            upload(file);
          });

        // Update the preview when the input changes
        $(input).on('change', () => {
          let path = $(input).val();

          if(path !== '') {
            $(control).attr('style', 'background-image: url("' + path + '");');
            $(control).find('[data-remove]').prop('hidden', false);
          } else {
            $(control).removeAttr('style');
            $(control).find('[data-remove]').prop('hidden', true);
          }

        });
      });

      return this;
    }

  });

})(jQuery);
