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
        '          bs {label}' +
        '          bg {subType sequenceId}' +
        '          items {' +
        '            ... on Token { itemType subType chars }' +
        '            ... on Scope { itemType label }' +
        '            ... on Graft { itemType subType sequenceId }' +
        '          }' +
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