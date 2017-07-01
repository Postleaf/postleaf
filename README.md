# <img src="http://postleaf.s3.amazonaws.com/website/images/postleaf_wordmark.svg" alt="Postleaf" width="300">

**Simple, beautiful publishing.**

![Postleaf on a laptop, tablet, and phone](http://postleaf.s3.amazonaws.com/website/images/devices.png)

Postleaf is a beautifully designed open source blogging platform built for the modern publisher.

Created by [Cory LaViska](https://twitter.com/claviska)

- Website: [postleaf.org](https://www.postleaf.org/)
- Twitter: [@postleafapp](https://twitter.com/postleafapp)

This software is dedicated to my daughter, Sophia, and my son, Calvin. Chase your dreams, lil’ ones. 💙💚

## Documentation

Detailed instructions for installing, updating, and creating themes can be found at [postleaf.org/docs](https://www.postleaf.org/docs).

## Installation for Developers

This guide assumes you're installing Postleaf locally for development purposes. Please make sure the following dependencies are installed on your system before continuing:

- Node 7 (lower versions have not been tested and are not supported)
- npm
- Git
- SQLite 3
- GraphicsMagick

**You will also need access to an SMTP server for sending emails.** Otherwise, you won't be able to create users, perform password resets, etc. If you don't already have a transactional email service, the folks over at Discourse have put together a great [list of email providers](https://github.com/discourse/discourse/blob/master/docs/INSTALL-email.md) — many of which offer free plans.

To install Postleaf in a development environment, follow these instructions.

1. Open a terminal and clone the project and default theme:
  ```
  git clone https://github.com/Postleaf/postleaf.git
  git clone https://github.com/Postleaf/empower-theme.git themes/empower-theme
  ```
2. Make a copy of `.env.example` and name it `.env`. Open it and change `AUTH_SECRET` to a random string to secure your app. Then add your SMTP credentials so email can be sent. You also need to set the `APP_URL` to `http://localhost:3000/`.
3. Install dependencies and run the build script:
  ```
  npm install
  sudo npm install -g gulp-cli
  gulp build
  ```
4. Now launch the app:
  ```
  node app.js
  ```

At this point, you should be able to see Postleaf running by pointing your browser to `http://localhost:3000/`.

## Themes

To install a theme, simply add it to the `themes` directory. There are a few additional themes located in the [main repo](https://github.com/Postleaf).

To learn how to create your own theme, refer to the [theme documentation](https://www.postleaf.org/themes-overview).

## Support

Please **do not** use the issue tracker for personal support requests. Instead, visit postleaf.org/support for support.

## License

©2017 A Beautiful Site, LLC

This software is copyrighted. You may use it under the terms of the MIT license. See LICENSE.md for details.

All code is copyrighted by A Beautiful Site, LLC except where noted. Third-party libraries are copyrighted and licensed by their respective owners.

Postleaf is maintained under the [Semantic Versioning guidelines](http://semver.org/) and we adhere to them as closely as possible.

---

*“The starting point of all achievement is desire.” — Napoleon Hill*
