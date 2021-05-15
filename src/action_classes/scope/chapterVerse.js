module.exports = [

    {
        test: (context, data) => {
            return data.subType=== "start" && data.payload.startsWith("chapter");
        },
        action: (renderer, context, data) => {
            process.stdout.write(`\n+ CH ${data.payload.split("/")[1]} +\n`);
        }
    },

    {
        test: (context, data) => {
            return data.subType=== "start" && data.payload.startsWith("verses");
        },
        action: (renderer, context, data) => {
            process.stdout.write(`[v${data.payload.split("/")[1]}] `);
        }
    }

];