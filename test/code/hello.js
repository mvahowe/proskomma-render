const test = require('tape');

const {pkWithDoc} = require('../lib/load');
const doModelQuery = require('../../model_query');
const ScriptureParaResultModel = require("../../scripture_para_result_model");
const tokenActions = require("../../action_classes/token/consoleLog");

const testGroup = "The Basics";

const pk = pkWithDoc("../test_data/rut.usfm", {lang: "eng", abbr: "web"})[0];

test(
    `Build a Model (${testGroup})`,
    async function (t) {
        try {
            t.plan(2);
            const result = await doModelQuery(pk);
            t.ok(result);
            const model = new ScriptureParaResultModel(result);
            t.ok(model);
            model.render({actions: {token: tokenActions}});
        } catch (err) {
            console.log(err)
        }
    }
);
