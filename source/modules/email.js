'use strict';

// Node modules
const Nodemailer = require('nodemailer');
const Promise = require('bluebird');

const self = {

  //
  // Sends an email using the SMTP connection.
  //
  //  options* (object)
  //    - to* (object)
  //      - email* (string) - The recipient's email address.
  //      - name (string) - The recipient's name.
  //    - subject* (string) - The subject of the message.
  //    - message* (object)
  //      - html* (string) - The HTML version of the message.
  //      - text* (string) - The text version of the message.
  //    - placeholders (object) - Key/value pairs of placeholders to substitute in the message.
  //
  // Returns a promise.
  //
  send: (options) => {
    return new Promise((resolve, reject) => {
      // Create the transporter
      const transporter = Nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT,
        auth: {
          user: process.env.SMTP_USERNAME,
          pass: process.env.SMTP_PASSWORD
        },
        secure: process.env.SMTP_SECURE.toLowerCase() === 'true'
      });

      // Set placeholders
      if(options.placeholders) {
        for(let key in options.placeholders) {
          if(options.message.text) {
            options.message.text = options.message.text.replace('{' + key + '}', options.placeholders[key]);
          }

          if(options.message.html) {
            options.message.html = options.message.html.replace('{' + key + '}', options.placeholders[key]);
          }
        }
      }

      // Send the email
      transporter.sendMail({
        to: {
          name: options.to.name,
          address: options.to.email
        },
        from: {
          name: process.env.SMTP_FROM_NAME,
          address: process.env.SMTP_FROM_EMAIL
        },
        subject: options.subject,
        html: options.message.html,
        text: options.message.text
      }, (err) => {
        err ? reject(err) : resolve();
      });
    });
  }

};

module.exports = self;
