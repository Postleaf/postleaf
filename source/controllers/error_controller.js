'use strict';

// Node modules
const HttpCodes = require('http-codes');

module.exports = {

  //
  // Renders the Application Error page
  //
  applicationError: (err, req, res, next) => { // eslint-disable-line
    const I18n = req.app.locals.I18n;
    let template, viewData;

    switch(res.statusCode) {
    // Not found
    case HttpCodes.NOT_FOUND:
      template = 'not_found';
      viewData = {
        title: I18n.term('not_found'),
        message: req.xhr ?
          I18n.term('the_requested_resource_could_not_be_found') :
          I18n.term('the_requested_page_could_not_be_found')
      };
      break;

    // Forbidden
    case HttpCodes.UNAUTHORIZED:
      template = 'application_error';
      viewData = {
        title: I18n.term('unauthorized'),
        message: I18n.term('you_are_not_authorized_to_make_this_request')
      };
      break;

    // Application error
    default:
      template = 'application_error';
      viewData = {
        title: I18n.term('application_error'),
        message: process.env.NODE_ENV !== 'production' ?
          err.message :
          I18n.term('sorry_but_something_isnt_working_right_at_the_moment')
      };
      // Log dev error messages
      if(process.env.NODE_ENV !== 'production') {
        console.error(err);
      }
      break;
    }

    if(req.xhr) {
      // Response to XHR requests
      res.send({ message: viewData.message });
    } else {
      // Render the appropriate error template
      res.render(template, viewData);
    }
  },

  //
  // Renders the Not Found page
  //
  notFound: (req, res, next) => {
    res.status(HttpCodes.NOT_FOUND);
    return next('Page Not Found');
  }

};
