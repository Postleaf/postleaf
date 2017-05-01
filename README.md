# <img src="http://postleaf.s3.amazonaws.com/website/images/postleaf_wordmark.svg" alt="Postleaf" width="300">

**Simple, beautiful publishing.**

![Postleaf on a laptop, tablet, and phone](http://postleaf.s3.amazonaws.com/website/images/devices.png)

Postleaf is a simple, beautiful, decentralized publishing platform that anyone can use. It's free, open source, and built for the modern publisher.

Created by [Cory LaViska](https://twitter.com/claviska)

- Website: [postleaf.org](https://www.postleaf.org/)
- Twitter: [@postleafapp](https://twitter.com/postleafapp)

This software is dedicated to my daughter, Sophia, and my son, Calvin. Chase your dreams, lil’ ones. 💙💚

## Alpha testing underway! 🚧

Postleaf is considered feature complete for the 1.0 roadmap, but you may find bugs or see API changes before the stable version is released. This documentation is subject to change as bugs and other issues get ironed out.

Please report bugs to [the issue tracker](https://github.com/Postleaf/postleaf/issues). 🐛

## Dependencies

This guide assumes you're installing Postleaf locally for development purposes. Please make sure the following dependencies are installed on your system before continuing:

- Node 7 (lower versions have not been tested and are not supported)
- npm
- Git
- SQLite 3
- GraphicsMagick

**You will also need access to an SMTP server for sending emails.** Otherwise, you won't be able to create users, perform password resets, etc. If you don't already have a transactional email service, the folks over at Discourse have put together a great [list of email providers](https://github.com/discourse/discourse/blob/master/docs/INSTALL-email.md) — many of which offer free plans.

## Installation

1. Open a terminal and clone the project and default theme:
  ```
  git clone https://github.com/Postleaf/postleaf.git && cd postleaf
  git clone https://github.com/Postleaf/empower-theme.git themes/empower-theme
  ```
2. Make a copy of `.env.example` and name it `.env`. **Open it and change `AUTH_SECRET` to a random string to secure your app.** Then add your SMTP credentials so email can be sent.
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

At this point, you should be able to see Postleaf running by pointing your browser to `http://localhost:3000/`. If not, someone in the [forum](https://community.postleaf.org) or [chat room](https://gitter.im/Postleaf/postleaf) can probably assist.

## Themes

To install more themes, simply add them to the `themes` directory. There are a couple additional themes located in the [main repo](https://github.com/Postleaf).

To create your own theme, start by duplicating the [default theme](https://github.com/Postleaf/empower-theme). The source is commented to help you, and there's some more info on working with Dust.js templates on the website:

- [Themes Overview](https://www.postleaf.org/themes-overview)
- [Helper Reference](https://www.postleaf.org/helper-reference)
- [Filter Reference](https://www.postleaf.org/filter-reference)

## Support

Please [visit the community forum](https://community.postleaf.org/) for support. You can also [hop onto the chat](https://gitter.im/Postleaf/postleaf) for assistance.

## License

©2016 A Beautiful Site, LLC

This software is copyrighted. You may use it under the terms of the MIT license. See LICENSE.md for details.

All code is copyrighted by A Beautiful Site, LLC except where noted. Third-party libraries are copyrighted and licensed by their respective owners.

Postleaf is maintained under the [Semantic Versioning guidelines](http://semver.org/) and we adhere to them as closely as possible.

---

*“The starting point of all achievement is desire.” — Napoleon Hill*
