module.exports = [

    {
        test: (context, data) => {
            return data.itemType=== "startScope" && data.label.startsWith("chapter");
        },
        action: (renderer, context, data) => {
            process.stdout.write(`\n+ CH ${data.label.split("/")[1]} +\n`);
        }
    },

    {
        test: (context, data) => {
            return data.itemType=== "startScope" && data.label.startsWith("verses");
        },
        action: (renderer, context, data) => {
            process.stdout.write(`[v${data.label.split("/")[1]}] `);
        }
    }

];