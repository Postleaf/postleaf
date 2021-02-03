# A note from the author

Postleaf — at least in its current form — has been discontinued. In the future, I'd like to bring it back as something different. Maybe an open source project. Maybe a SaaS product. I'm not sure at this point.

The world still needs a simple platform to encourage blogging and the decentralization of publishing. Unfortunately, This version of Postleaf didn't fill that gap because it was too difficult and expensive for the majority of users to install and host. Aside from that, the world of web hosting has changed significantly in recent years.

For now, I'm taking some time to focus on other projects and interests. I hope to revisit Postleaf again when the time is right for me, but I'm not exactly sure when that might be.

That said, I'm archiving the Postleaf repository. Anyone is welcome to fork the project and carry the torch, but I'm hanging onto the "Postleaf" name, U.S. trademark, and website, so new maintainers will need to release it under a different name.

Thanks for the many years of encouragement. While my vision for Postleaf wasn't fully realized, I've learned so much from this project and its community. I'm still excited for Postleaf's future.

— Cory

---

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
