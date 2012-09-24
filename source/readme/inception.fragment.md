## Rocket Inception

Unless running in watch mode, all builds are made in order of input. This provides a unique way of nesting build objects. 

The following example shows how the **output** of one build item can be used as the **input** of the next.

```json
{
    "input_dir": "source",
    "output_dir": "deploy",
    "build": [
        {
            "input": "coffee/library.coffee",
            "output": "js/library.js"
        },
        {
            "input": "../deploy/js/library.js",
            "output": "js/library.min.js",
            "minify": true
        }
    ]
}
```

Pretty awesome right? Now imagine the following scenario:

1. Rocket performs a build which constructs a new configuration file.
2. In the same build, a new Rocket instance is run as a custom compiler with the `-a` flag targeting the generated configuration file.
3. The new Rocket instance could then perform step 1 and so on and so on...