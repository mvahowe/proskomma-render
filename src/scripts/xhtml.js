const fse = require('fs-extra');
const path = require('path');

const {ProsKomma} = require('proskomma');
const doModelQuery = require('../model_query');
const renderModel = require('../xhtmlResultModel');

const books = ["2JN"];

const bookMatches = str => {
    for (const book of books) {
        if (str.includes(book) || str.includes(book.toLowerCase())) {
            return true;
        }
    }
    return false;
}

const dp = process.argv[2];
const fqdp = path.resolve(__dirname, dp);
const pk = new ProsKomma();
for (const filePath of fse.readdirSync(fqdp)) {
    if (bookMatches(filePath)) {
        const content = fse.readFileSync(path.join(fqdp, filePath));
        const contentType = filePath.split('.').pop();
        pk.importDocument(
            {lang: "xxx", abbr: "yyy"},
            contentType,
            content,
            {}
        );
    }
}


const doRender = async pk => {
    await doModelQuery(pk)
        .then(result => {
                const model = new renderModel(result);
                model.render();
            }
        )
};

doRender(pk).then(() => {
    console.log()
});