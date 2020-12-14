module.exports = [

    {
        test: (context, data) => {
            return true;
        },
        action: (context, data) => {
            process.stdout.write(data.chars);
        }
    }

];