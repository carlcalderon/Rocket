// =============================================================================
// TOKEN
// =============================================================================
(function(output){

    var fs        = require("fs"),
        util      = require("util"),
        path      = require("path"),
        global    = require("./global"),
        itemTypes = require("./itemtypes"),
        compilers = require("./compilers"),
        colorize  = require("./style").colorize,
        bold      = require("./style").bold,

        stdout      = global.stdout,

        allCompilers = null;

    function publishIssues(input, program) {

        var allErrors   = [],
            allWarnings = [],
            i           = 0,
            j           = 0;

        // Collect all warnings and errors from each component
        allErrors   = allErrors.concat(getErrors(input.errors));
        allWarnings = allWarnings.concat(getWarnings(input.warnings));

        if (!!input.buildOrders) {

            for (i = 0; i < input.buildOrders.length; i++) {

                allErrors   = allErrors.concat(getErrors(input.buildOrders[i].errors));
                allWarnings = allWarnings.concat(getWarnings(input.buildOrders[i].warnings));

                for (j = 0; j < input.buildOrders[i].items.length; j++) {

                    allErrors   = allErrors.concat(getErrors(input.buildOrders[i].items[j].errors));
                    allWarnings = allWarnings.concat(getWarnings(input.buildOrders[i].items[j].warnings));

                }

            }

        }

        // Output all errors
        for (i = 0; i < allErrors.length; i++) {
            stdout(allErrors[i]);
        }

        // Output all warnings
        for (i = 0; i < allWarnings.length; i++) {
            stdwarn(allWarnings[i]);
        }

    }

    function tokenize(input, program) {

        var defaultBuildOrder = input.defaultBuildOrder,
            inputDir          = input.inputDir,
            outputDir         = input.outputDir,
            allCompilers      = input.compilers,
            i                 = 0,
            len               = 0,
            compiler          = null;

        publishIssues(input, program);

        stdout("INPUT_DIRECTORY [" + inputDir + "]");
        stdout("OUTPUT_DIRECTORY [" + outputDir + "]");

        if (!!program.build) {

            stdout("SELECTED_BUILD_ORDER [" + defaultBuildOrder + "]");

        } else {

            stdout("DEFAULT_BUILD_ORDER [" + defaultBuildOrder + "]");

        }

        stdout("COMPILERS");

        for (var compilerID in allCompilers) {
            compiler = allCompilers[compilerID];
            stdout("\tCOMPILER [" + compilerID + "]");
            if (!!compiler.prefix) {
                stdout("\t\tPREFIX [" + compiler.prefix + "]");
            }
            stdout("\t\tEXECUTABLE [" + compiler.executable + "]");
            if (!!compiler.arguments) {
                stdout("\t\tARGUMENTS [" + compiler.arguments + "]");
            }
            stdout("\t\tRETURNS_OUTPUT [" + (!!compiler.returnsOutput ? "TRUE" : "FALSE") + "]");
            if (compiler.extensions) {
                stdout("\t\tEXTENSIONS [" + compiler.extensions.join(";") + "]");
            }
            if (compiler.MINIFIES) {
                stdout("\t\tMINIFIES [" + compiler.minifies.join(";") + "]");
            }
            if (compiler.minifier) {
                stdout("\t\tMINIFIER [" + compiler.minifier + "]");
            }
            stdout("\t\tBUILT_IN [" + (compiler.builtIn ? "TRUE" : "FALSE") + "]");
        }

        stdout("BUILD_ORDERS");

        for (i = 0, len = input.buildOrders.length; i < len; i++) {

            if (!!program.build) {

                if (input.buildOrders[i].id == program.build) {

                    publishBuildOrder(input.buildOrders[i]);

                }

            } else {

                publishBuildOrder(input.buildOrders[i]);

            }
        }

        function publishBuildOrder(input) {

            stdout("\tBUILD_ORDER [" + input.id + ";" + ((defaultBuildOrder == input.id) ? "TRUE" : "FALSE") + "]");

            for (var i = 0, len = input.items.length; i < len; i++) {
                publishBuildItem(input.items[i]);
            }

        }

        function publishBuildItem(input) {

            var len    = 0,
                i      = 0;

            switch (input.type) {

                case itemTypes.BUILD_ORDER :

                    if (input.buildOrder.length > 0) {

                        stdout("\t\tBUILD_ORDER_LINK [" + input.buildOrder.join(";") + "]");

                    }

                    break;

                case itemTypes.EXEC :

                    if (!!input.output) {

                        stdout("\t\tEXEC");
                        stdout("\t\t\tOUTPUT [" + input.output + "]");
                        stdout("\t\t\tINPUT [" + input.exec + "]");

                    } else {

                        stdout("\t\tEXEC [" + input.exec + "]");

                    }

                    break;

                case itemTypes.DIRECTORY :

                    prefix = colorize("/", "black", "white");

                    stdout("\t\tDIRECTORY [" + input.output + "]");

                    for (i = 0, len = input.input.length; i < len; i++) {

                        stdout("\t\t\t INPUT [" + input.input[i] + "]");

                    }

                    break;

                case itemTypes.FILE :

                    if (input.minify) {

                        prefix = colorize("%", "black", "cyan");

                    } else if (input.compiler) {

                        prefix = colorize("+", "black", "green");

                    } else {

                        prefix = colorize("+", "grey", "black", "inverse");

                    }

                    stdout("\t\t FILE [" + [input.compiler, input.minify, input.output].join(";") + "]");

                    // Combine found notation sources
                    var inputs = input.input;

                    if (input.notation.length > 0) {

                        for (i = 0, len = input.notation.length; i < len; i++) {

                            if (input.notation[i] != null) {

                                if (input.notation[i].files != null) {

                                    inputs = inputs.concat(input.notation[i].files);

                                }

                            }

                        }

                    }

                    var flat = global.flatten(inputs);
                    for (i = 0, len = flat.length; i < len; i++) {

                        stdout("\t\t\t INPUT [" + flat[i] +  "]");

                    }

                    break;

                default : // Unrecognized type

                    stdout("\t\t UNRECOGNIZED_TYPE [" + input.type +  "]");

                    break;

            }

        }

    }

    function getErrors(input) {

        var len    = input.length,
            i      = 0,
            result = [];

        for ( ; i < len; i++) {

            result.push(getError(input[i].id, input[i].reason));

        }

        return result;
    }

    function getWarnings(input) {

        var len    = input.length,
            i      = 0,
            result = [];

        for ( ; i < len; i++) {

            result.push(getWarning(input[i].id, input[i].reason));

        }

        return result;

    }

    function getError(id, input) {

        return "ERROR [" + id + ";" + input + "]";

    }

    function getWarning(id, input) {

        return "WARNING [" + id + ";" + input + "]";

    }


    output.tokenize           = tokenize;

})(exports);