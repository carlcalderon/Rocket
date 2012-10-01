// =============================================================================
// PARSER
// =============================================================================
(function(output){

    // Dependencies
    var global     = require("./global"),
        validation = require("./validation"),
        errors     = require("./errors"),
        warnings   = require("./warnings"),
        lawnmower  = require("./lawnmower"),
        itemTypes  = require("./itemtypes"),
        compilers  = require("./compilers"),
        notation   = require("./notation"),
        util       = require("util"),
        path       = require("path"),
        fs         = require("fs")

    // Shorthands
    isDirectory   = global.isDirectory,
    isAssumedFile = global.isAssumedFile,

    // Storage
    allCompilers = null,
    buildOrderIDs = null;

    function parse(filepath, program) {

        var data              = null,
            rawData           = null,
            workingDir        = null,
            baseDir           = null,
            inputDir          = null,
            outputDir         = null,
            defaultBuildOrder = null,
            targetBuildOrder  = null,
            buildOrders       = [],
            result            = {
                errors:   [],
                warnings: []
            };

        // Normalize file path
        filepath = path.normalize(filepath);

        // Make sure the configuration file exist
        if (fs.existsSync(filepath)) {

            // If the input is a directory, search for the config file.
            if (isDirectory(filepath)) {

                filepath = path.resolve(filepath, "rocket-config.json");

            }

            // Extract the config directory path
            workingDir = path.dirname(path.resolve(".", filepath));

            try {

                // Extract the data from the configuration file
                rawData = fs.readFileSync(filepath, global.ENCODING);

            } catch(error) {

                result.errors.push({
                    id: errors.READ_ERROR,
                    reason: "Could not read from \"" + filepath + "\". Missing permissions?"
                });

                // Return immediately if the configuration is missing
                return result;

            }

        } else {

            result.errors.push({
                id: errors.FILE_NOT_FOUND,
                reason: "File not found: \"" + filepath + "\""
            });

            // Return immediately if the configuration is missing
            return result;
        }

        // Clean input string
        rawData = lawnmower.removeECMAScriptComments(rawData);

        // Parse the input data
        try {

            data = JSON.parse(rawData);

        } catch (error) {

            result.errors.push({
                id: errors.INVALID_CONFIGURATION,
                reason: "Parse error. Invalid JSON."
            });

            // Return immediately if we encounter a parse error
            return result;
        }

        // Extract basic information (support for < 0.1.14)
        // If none of the paths are defined, run from configuration
        // file path but send warning if input and output are the same.
        baseDir   = data.baseDir   || data.base_dir    || ".";
        inputDir  = data.inputDir  || data.input_dir   || baseDir;
        outputDir = data.outputDir || data.output_dir  || baseDir;

        if (inputDir == outputDir) {
            result.warnings.push({
                id: warnings.INPUT_DIRECTORY_IS_OUTPUT_DIRECTORY,
                reason: "Input directory is the same as the output directory."
            });
        }

        // Convert paths to absolute
        baseDir   = path.resolve(workingDir, baseDir);
        inputDir  = path.resolve(baseDir, inputDir);
        outputDir = path.resolve(baseDir, outputDir);

        // Concatenate builtIn compilers
        allCompilers = {};

        // Get a list of the built in compilers
        var builtInCompilers = compilers.getList();

        for (var i = 0, len = builtInCompilers.length; i < len; i++) {
            allCompilers[builtInCompilers[i]] = compilers[builtInCompilers[i]];
        };

        // Parse compilers
        if (data.compilers != null) {

            for (var compilerID in data.compilers) {

                if (validation.compiler(data.compilers[compilerID])) {

                    // Compiler validates
                    allCompilers[compilerID] = data.compilers[compilerID];

                } else {

                    // Compiler error
                    result.errors.push({
                        id: errors.INVALID_COMPILER,
                        reason: "Invalid compiler \"" + compilerID + "\". Missing executable field."
                    });

                    return result;

                }

            }

        }

        buildOrderIDs = [];

        // Parse build orders
        if (data.build != null) {

            // Probably < 0.1.14, convert to build order
            if (util.isArray(data.build)) {

                // Convert to build order
                buildOrders.push(parseBuildOrder({id:"build", items:data.build}, inputDir, outputDir));

                // Set the default build order to the above id
                defaultBuildOrder = "build";

                result.warnings.push({
                    id: warnings.DEPRECATED,
                    reason: "\"build\" field is DEPRECATED. Please refer to documentation."
                });

            }

        } else {

            // Make sure we have build orders
            if (data.buildOrders != null) {

                // Make sure it is an Array
                if (util.isArray(data.buildOrders)) {

                    // Make sure we have orders in the Array
                    if (data.buildOrders.length > 0) {

                        var len = 0,
                            i = 0;

                        for (i = 0, len = data.buildOrders.length; i < len; i++) {

                            // Push parsed build order to buildOrders list
                            buildOrderIDs.push(data.buildOrders[i].id);

                        }

                        for (i = 0, len = data.buildOrders.length; i < len; i++) {

                            // Push parsed build order to buildOrders list
                            buildOrders.push(parseBuildOrder(data.buildOrders[i], inputDir, outputDir));

                        }

                    } else {

                        result.errors.push({
                            id: errors.MISSING_BUILD_ORDER,
                            reason: "No build order(s) found."
                        });

                        return result;

                    }

                } else {

                    result.errors.push({
                        id: errors.INVALID_BUILD_ORDER_FIELD_TYPE,
                        reason: "Build order field \"buildOrders\" must be an Array."
                    });

                    return result;
                }

            } else {

                result.errors.push({
                    id: errors.MISSING_BUILD_ORDER_FIELD,
                    reason: "No build order(s) field found."
                });

                return result;

            }

            // Get default or selected build order
            if (!!program.build) {

                targetBuildOrder = program.build;

            } else if (typeof data.defaultBuildOrder == "string") {

                targetBuildOrder = data.defaultBuildOrder;

            }

            // Find specified build order
            for (var i = 0, len = data.buildOrders.length; i < len; i++) {

                if (data.buildOrders[i].id == targetBuildOrder) {

                    defaultBuildOrder = targetBuildOrder;
                    break;

                }

            }

            // No build order matched or missing.
            if (defaultBuildOrder == null) {

                result.warnings.push({
                    id: warnings.BUILD_ORDER_ID_NOT_FOUND,
                    reason: "No build order with id \"" + targetBuildOrder + "\" found. Using \"" + data.buildOrders[0].id + "\" instead."
                });

                defaultBuildOrder = data.buildOrders[0].id;

            }

        }

        result.baseDir           = baseDir;
        result.inputDir          = inputDir;
        result.outputDir         = outputDir;
        result.buildOrders       = buildOrders;
        result.compilers         = allCompilers;
        result.defaultBuildOrder = defaultBuildOrder;

        return result;

    }

    function parseBuildOrder(input, inputDir, outputDir) {

        var id     = input.id,
            items  = [],
            result = {
                id: id,
                errors: [],
                warnings: [],
                items: []
            };

        if (id == null) {

            result.warnings.push({
                id: warnings.MISSING_BUILD_ORDER_ID,
                reason: "Build order \"id\" is missing."
            });

            return result;

        }

        if (input.items != null) {

            if (util.isArray(input.items)) {

                if (input.items.length > 0) {

                    for (var i = 0, len = input.items.length; i < len; i++) {

                        items.push(parseBuildItem(input.items[i], inputDir, outputDir));

                    }

                } else {

                    result.warnings.push({
                        id: warnings.BUILD_ORDER_EMPTY,
                        reason: "Build order \"" + id + "\" is empty."
                    });

                    return result;

                }

            } else {

                result.errors.push({
                    id: errors.INVALID_BUILD_ORDER_ITEMS_TYPE,
                    reason: "Build order \"" + id + "\" field \"items\" is not an Array."
                });

                return result;

            }

        } else {

            result.warnings.push({
                id: warnings.MISSING_BUILD_ORDER_ITEMS,
                reason: "Build order \"" + id + "\" field \"items\" is missing."
            });

            return result;

        }

        result.items = items;

        return result;

    }

    function parseBuildItem(item, inputDir, outputDir) {

        // Construct result
        var result = {
            type: null,
            warnings: [],
            errors: [],
            notation: []
        };

        if (typeof item == "string") {

            var convertedItem = {
                input: null,
                output: null,
                type: null
            };

            // String is path to folder
            if (isDirectory(path.resolve(inputDir, item))) {

                convertedItem.type = itemTypes.DIRECTORY;

            } else {

                convertedItem.type = itemTypes.FILE;

            }

            // Resolve path and append to result
            // TODO: If input is coffee, should the output automatically be js?
            convertedItem.input  = [path.resolve(inputDir, item)];
            convertedItem.output = path.resolve(outputDir, item);

            item = convertedItem;
        }

        // Exec type
        if (!!item.exec) {

            if (typeof item.exec == "string") {

                result.type = itemTypes.EXEC;
                result.exec = item.exec;

                if (!!item.output) {

                    result.output = path.resolve(outputDir, item.output);

                }

            } else {

                result.errors.push({
                    id: errors.INVALID_BUILD_ITEM_FIELD_TYPE,
                    reason: "Exec \"" + item.exec + "\" is not a String."
                });

                return result;

            }

        // Build Order link
        } else if (!!item.buildOrder) {

            result.type = itemTypes.BUILD_ORDER;

            var buildOrders = [];

            if (typeof item.buildOrder == "string" || util.isArray(item.buildOrder)) {

                if (typeof item.buildOrder == "string") {

                    buildOrders = [item.buildOrder];

                } else {

                    buildOrders = item.buildOrder;
                }

                result.buildOrder = [];

                for (var i = 0, len = buildOrders.length; i < len; i++) {

                    if (buildOrderIDs.indexOf(buildOrders[i]) == -1) {

                        result.warnings.push({
                            id: warnings.INVALID_BUILD_ORDER_ID,
                            reason: "No Build Order with id \"" + buildOrders[i] + "\" found, ignored."
                        });

                    } else {

                        result.buildOrder.push(buildOrders[i]);

                    }

                }

            } else {

                result.errors.push({
                    id: errors.INVALID_BUILD_ITEM_FIELD_TYPE,
                    reason: "Build item field \"buildOrder\" must be a String or Array, not \"" + (typeof item.input) + "\"."
                });

                return result;
            }

        // Regular file / folder
        } else if (!!item.input && !!item.output) {

            // Convert minify field to Boolean and ignore if they wrote
            // false wrong or made it a string. Insert RTFM here.
            result.minify = Boolean(item.minify);

            var inputPaths = [];

            // Single input
            if (typeof item.input == "string") {

                inputPaths = [path.resolve(inputDir, item.input)];

            // Multiple inputs
            } else if (util.isArray(item.input)) {

                for (var i = 0, len = item.input.length; i < len; i++) {

                    inputPaths.push(path.resolve(inputDir, item.input[i]));

                }

            } else {

                result.errors.push({
                    id: errors.INVALID_BUILD_ITEM_FIELD_TYPE,
                    reason: "Build item field \"input\" must be a String or Array, not \"" + (typeof item.input) + "\"."
                });

                return result;

            }

            // Output is assumed to be a file
            if (isAssumedFile(item.output)) {

                result.type = itemTypes.FILE;

                var inputPath = null;

                // Loop through all defined inputs and recursively construct
                // arrays of folders which contain children.
                for (var i = 0, len = inputPaths.length; i < len; i++) {

                    inputPath = inputPaths[i];

                    // Check if the input path exist right now
                    if (fs.existsSync(inputPath)) {

                        // if it's a directory, replace the current input item with
                        // an array of the children instead.
                        function getCompletePaths(inputPath) {

                            var result = inputPath,
                                list   = null;

                            if (isDirectory(inputPath)) {

                                result = [];

                                list = fs.readdirSync(inputPath);

                                if (list.length) {

                                    for (var j = 0, llen = list.length; j < llen; j++) {

                                        result.push(getCompletePaths(path.resolve(inputPath, list[j])));

                                    }

                                }

                            }

                            return result;

                        }

                        inputPaths[i] = getCompletePaths(inputPath);

                    }

                }

                // Find out if any of the input files require compilation
                if (!item.compiler) {

                    item.compiler = compilers.match(inputPaths);

                }

                // Check if the item has a defined compiler and that it exist.
                // REMOVED: If so, create a link to that compiler directly.
                if (!!item.compiler) {

                    if (!allCompilers[item.compiler]) {

                        result.errors.push({
                            id: errors.INVALID_COMPILER_REFERENCE,
                            reason: "No compiler with id \"" + item.compiler + "\" found."
                        });

                        return result;

                    }

                }

                // Notation parser
                var len            = inputPaths.length,
                    i              = 0,
                    extension      = null,
                    filecontent    = null,
                    inputPath      = null,
                    notationResult = null;

                for ( ; i < len; i++) {

                    inputPath      = inputPaths[i];
                    notationResult = null;

                    if (notation.match(inputPath)) {

                        try {

                            filecontent = fs.readFileSync(inputPath, "utf8");

                        } catch(error) {

                            result.errors.push({
                                id: errors.READ_ERROR,
                                reason: "Could not read from \"" + inputPath + "\". Missing permissions?"
                            });

                            return result;

                        }

                        notationResult = notation.parse(filecontent, inputPath);

                        if (notationResult != null) {


                            if (notationResult.errors.length) {

                                result.errors = result.errors.concat(notationResult.errors);

                                return result;

                            } else if (notationResult.warnings.length) {

                                result.warnings = result.warnings.concat(notationResult.warnings);

                            }

                        }

                    }

                    result.notation.push(notationResult);

                }

                result.input = inputPaths;

            // Output is assumed to be a folder
            } else {

                result.type  = itemTypes.DIRECTORY;
                result.input = inputPaths;

            }

            // Append keys not already in the result.
            // These keys are mainly used for custom compiler variables.
            for (var key in item) {

                if (item.hasOwnProperty(key)) {

                    // Not using `this = this || that` due to potential
                    // large size key values.
                    if (!result[key]) {

                        result[key] = item[key];

                    }

                }

            }

            result.output = path.resolve(outputDir, item.output);

        } else {

            result.errors.push({
                id: errors.INVALID_BUILD_ITEM,
                reason: "Invalid build item: \"" + JSON.stringify(item) + "\"."
            });

            return result;

        }

        return result;

    }

    output.parse          = parse;
    output.parseBuildItem = parseBuildItem;

})(exports);