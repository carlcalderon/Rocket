#### Custom Compilers

An **awesome** feature of Rocket is custom compiler configuration.

If you have some CoffeeScript that needs to be compiled with the bare flag (-b), you can specify a custom compiler like so:

```json
{
    "inputDir": "source",
    "outputDir": "deploy",
    "compilers": {
        "coffeescript-bare": {
            "executable": "coffee",
            "arguments": "-cb -o {output} {input}"
        }
    },
    "buildOrders": [
        {
            "id": "compile",
            "items": [
                {
                    "input": "coffee/scripts.coffee",
                    "output": "js/scripts.js",
                    "compiler": "coffeescript-bare"
                }
            ]
        }
    ]
}
```

The above example declares a custom compiler with an ID of `coffeescript-bare` and specifies the executable and bespoke arguments. The custom `coffeescript-bare` compiler is then referenced in a build object to be used to compile **scripts.coffee** into **scripts.js**.

The custom compiler can contain any number of custom fields which are shared between the arguments string and the build object it self (**NOTE:** `{input}` and `{output}` are reserved). This allows for shared compiler setups but file-to-file specific arguments. 

The following example shows how a single custom compiler can produce different results by using a custom `message` field:

```json
{
    "inputDir": "source",
    "outputDir": "deploy",
    "compilers": {
        "coffeescript-custom": {
            "executable": "coffee",
            "returnsOutput": true,
            "arguments": "-pe {message}"
        }
    },
    "buildOrders": [
        {
            "id": "compile",
            "items": [
                {
                    "compiler": "coffeescript-custom", // Link to custom compiler
                    "message": "### Hello! ###",  // Custom message
                    "output": "js/hello.js"
                },
                {
                    "compiler": "coffeescript-custom", // Link to custom compiler
                    "message": "### World! ###", // Custom message
                    "output": "js/world.js"
                }
            ]
        }
    ]
}
```

#### Custom Compiler Fields

| Field         | Description                                              | Optional |
| :------------ | :------------------------------------------------------- | :------: |
| executable    | Path to executable.                                      | false    |
| arguments     | Command line arguments.                                  | false    |
| prefix        | Command line arguments placed prior to executable path.  | true     |
| returnsOutput | True if compiler output results.                         | true     |
| extension     | File-extension used to match input files.                | true     |
| minifies      | File-extension used to match input files when minifying. | true     |
