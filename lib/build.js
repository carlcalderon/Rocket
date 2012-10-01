// =============================================================================
// BUILD
// =============================================================================
(function(output){

    var fs        = require("fs"),
        util      = require("util"),
        path      = require("path"),
        exec      = require("child_process").exec,
        wrench    = require("wrench"),
        global    = require("./global"),
        itemTypes = require("./itemtypes"),
        errors    = require("./errors"),
        warnings  = require("./warnings"),
        parser    = require("./parser"),
        compilers = require("./compilers"),
        colorize  = require("./style").colorize,
        bold      = require("./style").bold,

        tab         = global.tab,
        stdout      = global.stdout,
        stderr      = global.stderr,
        stdwarn     = global.stdwarn,
        isRaw       = global.isRaw,
        isDirectory = global.isDirectory,

        FILE_SEPARATOR  = "\r\n",

        allBuildOrders = null,
        errorCount     = 0,
        warningCount   = 0;


    function build(input, program, callback) {

        program.buildSuccess = false;
        allBuildOrders       = input.buildOrders;
        errorCount           = 0;
        warningCount         = 0;

        // Announce
        stdout(bold("Compile") + (program.quiet ? "" : "\n"));

        // Find build order matching selection
        for (var i = 0, len = input.buildOrders.length; i < len; i++) {

            if (input.buildOrders[i].id == input.defaultBuildOrder) {

                wrench.mkdirSyncRecursive(input.outputDir);

                buildOrder(input.buildOrders[i], program, input.inputDir, input.outputDir, function (result) {

                    if (result === 0) {

                        program.buildSuccess = true;

                    }

                    stdout("\n" + bold("Complete"), "(errors: " + errorCount + ", warnings: " + warningCount + ")");

                    callback(result);

                });

                break;

            }

        }

    }

    function buildOrder(input, program, inputDir, outputDir, callback) {

        (function next(items, index) {

            (function (item, itemCallback) {

                buildItem(item, program, inputDir, outputDir, itemCallback);

            })(items[index], function (result) {


                // do next
                if ((result === 0 || program.ignore) && index < items.length - 1) {

                    next(items, index + 1);

                } else {

                    callback(result);

                }

            })

        })(input.items, 0);

    }

    function buildItem(input, program, inputDir, outputDir, callback) {

        switch (input.type) {

            case itemTypes.FILE :

                var prefix = null;

                if (input.minify) {          prefix = colorize("%", "black", "cyan");            }
                else if (input.compiler) {   prefix = colorize("+", "black", "green");           }
                else {                       prefix = colorize("+", "grey", "black", "inverse"); }

                // Tell
                if (!program.quiet) {

                    if (!program.watch || (program.watch && !program.buildSuccess)) {

                        stdout(tab(1), prefix, path.relative(outputDir, input.output));

                    }

                }

                // Create output folder
                wrench.mkdirSyncRecursive(path.dirname(input.output));

                // flatten and combine inputs
                var flat      = global.flatten(input.input),
                    content   = [];

                // TODO: combine content / readFileSync if statements. This is ugly...
                for (var i = 0, len = flat.length; i < len; i++) {

                    if (input.notation != null) {

                        if (i < input.notation.length) {

                            if (input.notation[i] != null) {

                                // notation contents
                                content.push(input.notation[i].markup);

                            } else if (isRaw(input.output)) {

                                content.push(fs.readFileSync(flat[i]));

                            } else {

                                content.push(fs.readFileSync(flat[i], "utf8"));

                            }

                        }  else if (isRaw(input.output)) {

                            content.push(fs.readFileSync(flat[i]));

                        } else {

                            content.push(fs.readFileSync(flat[i], "utf8"));

                        }

                    } else if (isRaw(input.output)) {

                        content.push(fs.readFileSync(flat[i]));

                    } else {

                        content.push(fs.readFileSync(flat[i], "utf8"));

                    }

                }

                // File require compilation or minification
                if (!!input.compiler || !!input.minify) {

                    // Write temp file (in first input directory)
                    var filepath = path.resolve(path.dirname(flat[0]), ".tmp_" + path.basename(input.output));

                    if (isRaw(input.output)) {

                        writeRaw(content, filepath);

                    } else {

                        write(content.join(FILE_SEPARATOR), filepath);

                    }

                    if (!!input.compiler) {

                        compilers.compile(filepath, input, function(result, out, issues) {

                            try {

                                fs.unlinkSync(filepath);

                            } catch (e) {

                                // ignore, file already removed

                            }

                            if (result != 0) {

                                out = getError(errors.COMPILE_ERROR, out || issues, program);

                                if (program.ignore || program.watch) { stdout(out); }
                                else { stderr(out); process.exit(1); }

                            }

                            callback(result);

                        });

                    } else if (!!input.minify) {

                        compilers.minify(filepath, input, function(result, out, issues) {

                            try {

                                fs.unlinkSync(filepath);

                            } catch (e) {

                                // ignore

                            }

                            if (result != 0) {

                                out = getError(errors.COMPILE_ERROR, out || issues, program);

                                if (program.ignore) { stdout(out); }
                                else { stderr(out); process.exit(1); }

                            }

                            callback(result);

                        });

                    }

                } else {

                    if (isRaw(input.output)) {

                        writeRaw(content, input.output);

                    } else {

                        write(content.join(FILE_SEPARATOR), input.output);

                    }
                    callback(0);

                }

                break;

            case itemTypes.DIRECTORY :

                // Tell
                if (!program.quiet) {

                    if (!program.watch || (program.watch && !program.buildSuccess)) {

                        stdout(tab(1), colorize("/", "black", "white"), path.relative(outputDir, input.output));

                    }

                }

                try {

                    // Create output directory
                    wrench.mkdirSyncRecursive(input.output);

                    // Get a list of all inputs as files (folders -> files)
                    var i    = 0,
                        len  = input.input.length,
                        item = null,
                        list = [],
                        inputPath  = null,
                        outputPath = null;

                    for (; i < len; i++) {

                        item = input.input[i];

                        if (fs.existsSync(item)) {

                            if (isDirectory(item)) {

                                // Get a list of the complete folder structure,
                                // correct it and append to global list
                                wrench.readdirSyncRecursive(item).forEach(function (filepath) {

                                    inputPath  = path.resolve(item, filepath);

                                    if (!isDirectory(inputPath)) {

                                        outputPath = path.resolve(input.output, filepath);

                                        list.push(parser.parseBuildItem({
                                            input:  inputPath,
                                            output: outputPath,
                                            minify: input.minify
                                        },inputDir, outputDir));

                                    }

                                });

                            } else {

                                inputPath  = item,
                                outputPath = path.resolve(input.output, filepath);

                                list.push(parser.parseBuildItem({
                                    input:  inputPath,
                                    output: outputPath,
                                    minify: input.minify
                                }));

                            }

                        // File or folder does not exist
                        } else {

                            var error = "The file or folder \"" + item + "\" does not exist.";

                            if ((program.watch && program.buildSuccess) || program.ignore) {

                                stdout(getError(errors.FILE_NOT_FOUND, error, program));

                                callback(1);

                                break;

                            } else {

                                stderr(getError(errors.FILE_NOT_FOUND, error, program));

                                process.exit(1);

                            }

                        }

                    }

                    (function step(list, index) {

                        buildItem(list[index], program, inputDir, outputDir, function() {

                            if (index == list.length - 1) {

                                callback(0);

                            } else {

                                step(list, index + 1);

                            }

                        })

                    })(list, 0);

                } catch (error) {

                    if ((program.watch && program.buildSuccess) || program.ignore) {

                        stdout(getError(errors.DIRECTORY_ERROR, error, program));

                        callback(1);

                    } else {

                        stderr(getError(errors.DIRECTORY_ERROR, error, program));

                        process.exit(1);

                    }

                }

                break;

            case itemTypes.EXEC :

                var options = {
                    cwd: inputDir,
                    env: process.env
                };

                if (!program.quiet) {

                    if (!program.watch || (program.watch && !program.buildSuccess)) {

                        if (!!input.output) {

                            stdout(tab(1), colorize("$", "black", "yellow"), path.relative(outputDir, input.output));

                        } else {

                            stdout(tab(1), colorize("$", "black", "yellow"), input.exec);

                        }

                    }

                }

                exec(input.exec, options, function (error, result, issue) {

                    if (!!error) {

                        var error = getError(errors.BUILD_EXEC_FAILED, issue, program);

                        if ((program.watch && program.buildSuccess) || program.ignore) {

                            stdout(error);

                            if (!!input.output && program.ignore) {

                                // Create output folder
                                wrench.mkdirSyncRecursive(path.dirname(input.output));

                                // write file
                                write(issue, input.output);

                            }

                            callback(1);

                        } else {

                            stderr(error);

                            process.exit(1);

                        }

                    } else {

                        if (!!input.output) {

                            // Create output folder
                            wrench.mkdirSyncRecursive(path.dirname(input.output));

                            write(result, input.output);

                        }

                        callback(0);

                    }

                });

                break;

            case itemTypes.BUILD_ORDER :

                (function act(list, index) {

                    for (var i = 0, len = allBuildOrders.length; i < len; i++) {

                        if (allBuildOrders[i].id == list[index]) {

                            if (!program.quiet) {

                                if (!program.watch || (program.watch && !program.buildSuccess)) {

                                    stdout("\n", colorize(">", "green", "black"), allBuildOrders[i].id, "\n");

                                }

                            }

                            buildOrder(allBuildOrders[i], program, inputDir, outputDir, function (result) {

                                if (result !== 0) {

                                    var error = getError(errors.BUILD_ORDER_FAILED, "An error occurred while processing linked build order \"" + targetBuildOrder.id + "\".", program);

                                    if ((program.watch && program.buildSuccess) || program.ignore) {

                                        stdout(error);

                                        if (index == list.length - 1) {

                                            callback(1);

                                        } else {

                                            act(list, index + 1);

                                        }

                                    } else {

                                        stderr(error);

                                        process.exit(1);

                                    }

                                } else {

                                    if (index == list.length - 1) {

                                        callback(result);

                                    } else {

                                        act(list, index + 1);

                                    }

                                }

                            });

                        }

                    }

                })(input.buildOrder, 0);

                break;

        }

    }

    function write(input, file) {

        fs.writeFileSync(file, input);

    }

    function writeRaw(input, file) {

        fs.writeFileSync(file, input[0]);

        var i = 1,
            contentLength = input.length;

        for ( ; i < contentLength; i++) {
            fs.appendFileSync(file, input[i]);
        }

    }

    function getError(id, input, program) {

        errorCount++;

        var result = colorize("ERROR #" + id + ":", "black", "red") + " ";

        if (program.quiet) {

            result += global.splitLines(input)[0];

        } else {

            result += input;

        }

        return result

    }

    function getWarning(id, input, program) {

        warningCount++;

        var result = colorize("WARNING #" + id + ":","black", "yellow") + " " + input;

        if (program.quiet) {

            result += global.splitLines(input)[0];

        } else {

            result += input;

        }

        return result

    }

    output.build      = build;
    output.buildOrder = buildOrder;
    output.buildItem  = buildItem;

})(exports);