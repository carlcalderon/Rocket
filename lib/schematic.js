// =============================================================================
// SCHEMATIC
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

        isDirectory = global.isDirectory,
        stdout      = global.stdout,
        stderr      = global.stderr,
        stdwarn     = global.stdwarn,
        tab         = global.tab,

        allCompilers = null;

    function publishIssues(input, program, ignoreWarnings) {

        var allErrors         = [],
            allWarnings       = [];

        // Collect all warnings and errors from each component
        allErrors   = allErrors.concat(getErrors(input.errors, 1));
        allWarnings = allWarnings.concat(getWarnings(input.warnings, 1));

        if (!!input.buildOrders) {

            for (var i = 0; i < input.buildOrders.length; i++) {

                allErrors   = allErrors.concat(getErrors(input.buildOrders[i].errors, 1));
                allWarnings = allWarnings.concat(getWarnings(input.buildOrders[i].warnings, 1));

                for (var j = 0; j < input.buildOrders[i].items.length; j++) {

                    allErrors   = allErrors.concat(getErrors(input.buildOrders[i].items[j].errors, 1));
                    allWarnings = allWarnings.concat(getWarnings(input.buildOrders[i].items[j].warnings, 1));

                }

            }

        }

        // Separator
        stdout("");

        // Output all errors
        for (var i = 0; i < allErrors.length; i++) {
            stderr(allErrors[i]);
        }

        // Output all warnings
        if (!ignoreWarnings) {
            for (var i = 0; i < allWarnings.length; i++) {
                stdwarn(allWarnings[i]);
            }
        }

        // Add separator if we encounter any error or warning
        if (!!(allErrors.length + ((!!ignoreWarnings) ? 0 : allWarnings.length))) {

            stdout("");

        }

        // Halt upon error unless program.ignore is set
        if (!!allErrors.length && !program.ignore) {

            process.exit(1);

        }

    }

    function publishBuildOrders(input, program) {

        publishIssues(input, program, true);

        stdout(tab(1), bold("Build Orders\n"));

        for (var i = 0, len = input.buildOrders.length; i < len; i++) {
            stdout(tab(2), input.buildOrders[i].id + (input.defaultBuildOrder == input.buildOrders[i].id ? "*" : ""));
        }

        // Separator
        stdout("")

    }

    function publish(input, program) {

        var defaultBuildOrder = input.defaultBuildOrder,
            inputDir          = input.inputDir,
            outputDir         = input.outputDir,
            allCompilers      = input.compilers;

        publishIssues(input, program);

        stdout(bold("Schematic\n"));

        stdout(tab(1), bold("Input directory: "), inputDir);
        stdout(tab(1), bold("Output directory:"), outputDir);

        if (!!program.build) {

            stdout("\n" + tab(1), bold("Selected build order:"), defaultBuildOrder);

        } else {

            stdout("\n" + tab(1), bold("Default build order:"), defaultBuildOrder);

        }

        // Build Orders=========================================================

        var legend  = " " + colorize(">", "green", "black")            + " Build order";
            legend += " " + colorize("$", "black", "yellow")           + " Exec";
            legend += " " + colorize("/", "black", "white")            + " Directory";
            legend += " " + colorize("+", "grey",  "black", "inverse") + " Copy/Concat";
            legend += " " + colorize("+", "black", "green")            + " Compile";
            legend += " " + colorize("%", "black", "cyan")             + " Minify";

        stdout("\n" + tab(1),bold("Build Orders " + legend + "\n"));

        for (var i = 0, len = input.buildOrders.length; i < len; i++) {

            if (!!program.build) {

                if (input.buildOrders[i].id == program.build) {

                    publishBuildOrder(input.buildOrders[i], 2);

                }

            } else {

                publishBuildOrder(input.buildOrders[i], 2);

            }
        }

        function publishBuildOrder(input, tabs) {

            tabs = tabs || 0;

            stdout(tab(tabs),input.id + ((defaultBuildOrder == input.id) ? "*" : ""),"\n");

            for (var i = 0, len = input.items.length; i < len; i++) {
                publishBuildItem(input.items[i], tabs + 1);
            }

            stdout("");

        }

        function publishBuildItem(input, tabs) {

            tabs = tabs || 0;

            var len    = 0,
                i      = 0,
                prefix = " ";

            switch (input.type) {

                case itemTypes.BUILD_ORDER :

                    if (input.buildOrder.length > 0) {

                        prefix = colorize(">", "green", "black");

                        stdout(tab(tabs), prefix, input.buildOrder.join(", "));

                    }

                    break;

                case itemTypes.EXEC :

                    prefix = colorize("$", "black", "yellow");

                    if (!!input.output) {

                        stdout(tab(tabs), prefix, truncate(path.relative(outputDir, input.output)));

                        if (!program.quiet) {

                            stdout(tab(tabs + 2), truncate(colorize(input.exec, "grey")));

                        }

                    } else {

                        stdout(tab(tabs), prefix, truncate(input.exec));

                    }

                    break;

                case itemTypes.DIRECTORY :

                    prefix = colorize("/", "black", "white");

                    stdout(tab(tabs), prefix, truncate(path.relative(outputDir, input.output)));

                    if (!program.quiet) {

                        for (i = 0, len = input.input.length; i < len; i++) {

                            stdout(tab(tabs + 2), truncate(colorize(path.relative(inputDir, input.input[i]),"grey")));

                        }
                    }

                    stdout("");

                    break;

                case itemTypes.FILE :

                    if (input.minify) {

                        prefix = colorize("%", "black", "cyan");

                    } else if (input.compiler) {

                        prefix = colorize("+", "black", "green");

                    } else {

                        prefix = colorize("+", "grey", "black", "inverse");

                    }

                    stdout(tab(tabs), prefix, truncate(path.relative(outputDir, input.output)) + ((!!input.compiler) ? (" (" + input.compiler + ")") : ""));

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

                    if (!program.quiet) {

                        for (i = 0, len = inputs.length; i < len; i++) {

                            if (util.isArray(inputs[i])) {

                                stdout(tab(tabs + 2), truncate(colorize(path.relative(inputDir, path.dirname(inputs[i][0])), "grey")));

                            } else {

                                stdout(tab(tabs + 2), truncate(colorize(path.relative(inputDir, inputs[i]), "grey")));
                            }
                        }

                        stdout("");

                    }

                    break;

                default : // Unrecognized type

                    break;

            }

        }

        // Separator
        stdout("");

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

        return colorize("ERROR #" + id + ":", "black", "red") + " " + input;

    }

    function getWarning(id, input) {

        return colorize("WARNING #" + id + ":","black", "yellow") + " " + input;

    }

    function truncate(input, length) {

        length = length || Infinity;

        var result = global.splitLines(input)[0].substr(0,length);

        if (input != result) {

            return result + colorize("[...]", "black", "white");

        }

        return input;
    }

    output.publish            = publish;
    output.publishBuildOrders = publishBuildOrders;
    output.publishIssues      = publishIssues;


})(exports);