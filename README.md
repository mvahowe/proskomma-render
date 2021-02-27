# proskomma-render
Utilities for rendering rich markup for Scripture from Proskomma

## To set up

You will need Node and NPM.
```
cd proskomma-render
npm install
npm test # Currently not in Windows
```
## To make an epub

```
cd src/epub
node make_epub.js my_config_file.js somewhere/sensible/my_new_ebook.epub
```
See the `src/epub/config` directory for examples of config files
