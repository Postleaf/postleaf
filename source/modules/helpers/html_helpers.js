'use strict';

// Node modules
const Extend = require('extend');
const He = require('he');

module.exports = (dust) => {

  //
  // Outputs a custom checkbox element.
  //
  // Examples:
  //  {@htmlCheckbox name="option-name" value="on"}...{/htmlCheckbox}
  //  {@htmlCheckbox class="my-class" id="my-id" name="option-name" value="option-val" checked="true"}...{/htmlCheckbox}
  //  {@htmlCheckbox name="option-name" value="on" radio="true"}...{/htmlCheckbox}
  //
  dust.helpers.htmlCheckbox = (chunk, context, bodies, params) => {
    let id = context.resolve(params.id) || '';
    let className = context.resolve(params.class) || '';
    let name = context.resolve(params.name) || '';
    let value = context.resolve(params.value) || '';
    let checked = (context.resolve(params.checked) + '') === 'true';
    let radio = (context.resolve(params.radio) + '') === 'true';

    let labelClass = 'custom-control custom-' + (radio ? 'radio' : 'checkbox') + ' ' + className;
    let labelType = (radio ? 'radio' : 'checkbox');
    let checkedProp = checked ? ' checked' : '';
    let start = `
      <label class="` + labelClass + `">
        <input
          type="` + labelType + `"
          class="custom-control-input"
          id="` + He.encode(id, { useNamedReferences: true }) + `"
          name="` + He.encode(name, { useNamedReferences: true }) + `"
          value="` + He.encode(value, { useNamedReferences: true }) + `"
          ` + checkedProp + `
        >
        <span class="custom-control-indicator"></span>
        <span class="custom-control-description">
    `;
    let end = `
        </span>
      </label>
    `;

    chunk.write(start);
    chunk.render(bodies.block, context);
    chunk.write(end);

    return chunk;
  };

  //
  // Outputs a custom radio element. Alias of htmlCheckbox with radio="true".
  //
  dust.helpers.htmlRadio = (chunk, context, bodies, params) => {
    return dust.helpers.htmlCheckbox(chunk, context, bodies, Extend(params, { radio: 'true' }));
  };

  //
  // Outputs a post badge.
  //
  // Examples:
  //  {@htmlPostBadge type="draft"/}
  //  {@htmlPostBadge type="published"/}
  //
  dust.helpers.htmlPostBadge = (chunk, context, bodies, params) => {
    const I18n = context.options.locals.I18n;
    let type = context.resolve(params.type);
    let className = 'badge badge-info';
    let html = '';
    let icon;

    switch(type) {
    case 'draft':
      className = 'badge badge-draft';
      icon = 'fa fa-pencil';
      break;
    case 'pending':
      className = 'badge badge-pending';
      icon = 'fa fa-hourglass';
      break;
    case 'rejected':
      className = 'badge badge-rejected';
      icon = 'fa fa-ban';
      break;
    case 'published':
    case 'live':
    case 'scheduled':
      className = 'badge badge-published';
      icon = 'fa fa-rss';
      break;
    case 'page':
      className = 'badge badge-page';
      icon = 'fa fa-file';
      break;
    case 'featured':
      className = 'badge badge-featured';
      icon = 'fa fa-star';
      break;
    case 'sticky':
      className = 'badge badge-sticky';
      icon = 'fa fa-thumb-tack';
      break;
    }

    // Generate the badge
    html += '<span class="' + className + '">';
    if(icon) html += '<i class="' + icon + '"></i> ';
    html += I18n.term(type);
    html += '</span>';

    return chunk.write(html);
  };

};
