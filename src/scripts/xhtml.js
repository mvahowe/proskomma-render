const fse = require('fs-extra');
const path = require('path');

const {ProsKomma} = require('proskomma');
const doModelQuery = require('../model_query');
const renderModel = require('../xhtmlResultModel');

const fp = process.argv[2];
const content = fse.readFileSync(path.resolve(__dirname, fp));
const contentType = fp.split('.').pop();
const pk = new ProsKomma();
pk.importDocument(
    {lang: "xxx", abbr: "yyy"},
    contentType,
    content,
    {}
);

const doRender = async pk => {
    await doModelQuery(pk)
        .then(result => {
                const model = new renderModel(result);
                model.render();
            }
        )
};

doRender(pk).then(() => {console.log()});