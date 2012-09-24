// =============================================================================
// WATCH MODE
// =============================================================================
(function(output){

    var global    = require("./global"),
        errors    = require("./errors"),
        builder   = require("./build"),
        schematic = require("./schematic"),
        parse     = require("./parser").parse,
        itemTypes = require("./itemtypes"),
        colorize  = require("./style").colorize,
        exec      = require("child_process").exec,
        wrench    = require("wrench"),
        path      = require("path"),
        fs        = require("fs"),

    stdout             = global.stdout,
    buildOrder         = builder.buildOrder,
    buildItem          = builder.buildItem,
    build              = builder.build,
    publish            = schematic.publish,
    publishIssues      = schematic.publishIssues;
    publishBuildOrders = schematic.publishBuildOrders,

    program        = null,
    allBuildOrders = null,
    allWatchers    = null,
    baseDir        = null,
    inputDir       = null,
    outputDir      = null;


    function start(input, configPath, programInstance) {

        baseDir        = input.baseDir;
        inputDir       = input.inputDir;
        outputDir      = input.outputDir;
        allBuildOrders = input.buildOrders;
        program        = programInstance;

        // Kill any previous watchers.
        // Will only happen if the config was changed during watchmode.
        stop();

        watchBuildOrder(input.defaultBuildOrder);

        watchConfig(configPath);

    }

    function watchConfig(path) {
        // Watch config file for changes
        var configWatcher = fs.watch(path, { persistent: false }, function (event, filename) {

            switch (event) {

                case "rename" : break;
                case "change" :

                    if (!program.quiet) {

                        stdout(colorize("[" + new Date().toLocaleTimeString() + "]", "grey"), "config changed.");

                    }

                    // Parse changed config
                    var result     = parse(path, program),
                        majorIssue = false;

                    // if any major errors are encountered, do not continue but keep watch
                    if (result.errors.length > 0) {

                        for (var i = 0, len = result .errors.length; i < len; i++) {

                            switch (result.errors[i].id) {

                                case errors.INVALID_CONFIGURATION:
                                case errors.FILE_NOT_FOUND:
                                case errors.READ_ERROR:

                                    publishIssues(result, program);

                                    majorIssue = true;

                                    break;

                            }

                        }

                    }

                    configWatcher.close();

                    // No deal-breakers found. Continue with build
                    if (!majorIssue) {

                        stop();

                        build(result, program, function (buildResult) {

                            start(result, path, program);

                        });

                    // Config error, cannot continue. Just watch.
                    } else {

                        watchConfig(path);

                    }

                    break;

            }

        });
    }

    function watchBuildItem(input) {

        var files = global.flatten(input.input);

        for (var i = 0, len = files.length; i < len; i++) {

            (function (item, list, index) {

                // Get proper prefix
                var prefix = colorize("+", "grey",  "black", "inverse");
                if (item.type == itemTypes.DIRECTORY) { prefix = colorize("/", "black", "white"); }
                else if (item.minify) {                 prefix = colorize("%", "black", "cyan");  }
                else if (!!item.compiler) {             prefix = colorize("+", "black", "green"); }

                try {

                    var fswatch = null;

                    if (item.type == itemTypes.DIRECTORY) {

                        fswatch = watchFolder(list[index], { persistent: true}, function (event) {

                            buildItem(item, program, inputDir, outputDir, function (result) {

                                if (!program.quiet) {

                                    stdout(colorize("[" + new Date().toLocaleTimeString() + "]", "grey"), prefix, path.relative(baseDir, item.output));

                                }

                            });

                        });

                    } else {

                        fswatch = fs.watch(list[index], { persistent: true }, function (event, filename) {

                            switch (event) {

                                case "rename" :

                                    // No need to act upon rename, watch will still run.

                                    break;

                                case "change" :

                                    buildItem(item, program, inputDir, outputDir, function (result) {

                                        if (!program.quiet) {

                                            stdout(colorize("[" + new Date().toLocaleTimeString() + "]", "grey"), prefix, path.relative(baseDir, item.output));

                                        }

                                    });

                                    break;

                            }

                        });

                    }

                    allWatchers.push(fswatch);

                } catch (e) {

                    // ignore, we most likely hit a tmp file
                    console.log("error",e);

                }

            })(input, files, i);

        };

    }

    function watchBuildOrder(input) {

        var targetBuildOrder = null,
            item             = null,
            len              = allBuildOrders.length,
            i                = 0;

        if (typeof input == "string") {

            // find build order
            for ( ; i < len; i++) {

                if (allBuildOrders[i].id == input) {

                    targetBuildOrder = allBuildOrders[i];

                }

            }

        } else {

            targetBuildOrder = input;

        }

        for (i = 0, len = targetBuildOrder.items.length; i < len; i++) {

            item = targetBuildOrder.items[i];

            switch (item.type) {

                case itemTypes.DIRECTORY :
                case itemTypes.FILE :

                    watchBuildItem(item);

                    break;

                case itemTypes.EXEC :

                     // cannot listen for this change...

                    break;

                case itemTypes.BUILD_ORDER :

                    // listen for sub items
                    for (var j = 0; j < item.buildOrder.length; j++) {

                        watchBuildOrder(item.buildOrder[j]);

                    }

                    break;

                default :

                    // ignore

                    break;

            }

        }

    }

    function stop() {
        if (allWatchers != null) {

            for (var i = 0, len = allWatchers.length; i < len; i++) {

                allWatchers[i].close();

            }

        }

        allWatchers = [];
    }

    function watchFolder(folderPath, options, callback) {

        var result = (function(folderPath, options, callback) {

            var api = {},
                interval = null,
                previous = null;

            function check() {
                exec("ls -la \"" + folderPath + "\" | md5", {env: process.env}, function(error, result) {

                    if (!!previous) {
                        if (previous != result) {

                            callback("change");

                            if (options.persistent !== true) {

                                stop();

                            }

                        }
                    }
                    previous = result;

                });
            }

            function close() {

                clearInterval(interval);

            }

            setInterval(check, 1000);

            api.close = close;

            return api;

        })(folderPath, options || {}, callback);

        return result;

    }

    output.start = start;
    output.stop  = stop;

})(exports);