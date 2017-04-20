# <img src="http://postleaf.s3.amazonaws.com/website/images/postleaf_wordmark.svg" alt="Postleaf" width="300">

**Simple, beautiful publishing.**

![Postleaf on a laptop, tablet, and phone](http://postleaf.s3.amazonaws.com/website/images/devices.png)

Postleaf is a simple, beautiful, decentralized publishing platform that anyone can use. It's free, open source, and built for the modern publisher.

Created by [Cory LaViska](https://twitter.com/claviska)

- Website: [postleaf.org](https://www.postleaf.org/)
- Twitter: [@postleafapp](https://twitter.com/postleafapp)

This software is dedicated to my daughter, Sophia, and my son, Calvin. Chase your dreams, lil’ ones. 💙💚

## Requirements

- Node 7
- SQLite 3
- GraphicsMagick

## Installing

This is the development repo. If you're not a developer, please [check the wiki](https://github.com/Postleaf/postleaf/wiki) for alternative installation methods.

## Developers

Postleaf uses NPM to manage dependencies and Gulp as its task runner. To contribute to this project, you'll need to clone the repository and install the required development tools listed below.

- [Gulp](http://gulpjs.com/) (Install using `npm install -g gulp-cli`)

Please read through our [contributing guidelines](https://github.com/claviska/postleaf/blob/master/.github/CONTRIBUTING.md) before submitting a PR.

Once you have the necessary development tools installed:

1. Open a terminal
2. Navigate to your cloned repo
3. Run the following command:
  ```
  npm install
  gulp build
  ```

This will generate all the assets you need to run Postleaf. Once this is complete, you can launch the app with this command:

```
node app.js
```

Then open http://localhost:3000 in your browser.

### Using Gulp

- Use `gulp build` to build all assets.
- Use `gulp clean` to remove all assets.
- Use `gulp help` to see all available tasks.

## License

©2016 A Beautiful Site, LLC

This software is copyrighted. You may use it under the terms of the MIT license. See LICENSE.md for details.

All code is copyrighted by A Beautiful Site, LLC except where noted. Third-party libraries are copyrighted and licensed by their respective owners.

Postleaf is maintained under the [Semantic Versioning guidelines](http://semver.org/) and we adhere to them as closely as possible.


## Support

Please [visit the community forum](https://community.postleaf.org/) for support. You can also [hop onto the chat](https://gitter.im/Postleaf/postleaf) for assistance.

---

*“The starting point of all achievement is desire.” — Napoleon Hill*
