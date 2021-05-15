const fse = require('fs-extra');
const path = require('path');

const {ProsKomma} = require('proskomma');
const doModelQuery = require('../model_query');
const renderModel = require('../ScriptureParaResultModel');
const tokenActions = require("../action_classes/token/consoleLog");

const fp = process.argv[2];
const lang = process.argv[3];
const abbr = process.argv[4];

const content = fse.readFileSync(path.resolve(__dirname, fp));
const contentType = fp.split('.').pop();
const pk = new ProsKomma();
pk.importDocument(
    {lang, abbr},
    contentType,
    content,
    {}
);

const doRender = async pk => {
    await doModelQuery(pk)
        .then(result => {
                const model = new renderModel(result);
                model.render({
                    actions: {
                        token: tokenActions
                    }
                });
            }
        )
};

doRender(pk).then(() => {console.log()});