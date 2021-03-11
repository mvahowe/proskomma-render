const doModelQuery = async pk => {
    const result = await pk.gqlQuery(
        '{' +
        '  docSets {' +
        '    id' +
        '    selectors { key value }' +
        '    tags' +
        '    documents {' +
        '      id' +
        '      headers { key value }' +
        '      tags' +
        '      sequences {' +
        '        id' +
        '        type' +
//        '        tags' +
        '        blocks {' +
        '          bs { payload }' +
        '          bg { subType payload }' +
        '          items { type subType payload }' +
        '        }' +
        '      }' +
        '    }' +
        '  }' +
        '}'
    );
    if (result.errors) {
        throw new Error(result.errors);
    }
    return result.data;
}

module.exports = doModelQuery;