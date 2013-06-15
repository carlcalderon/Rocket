## Change Log

### 0.2.3+0.0.2
JUN 15, 2013

* Schematic approval now defaults to `true`
* `inputDir` and `outputDir` may now be just `input` and `output`
* `defaultBuildOrder` may now be just `default`
* Build Order specific notation using @<buildorder>
* Notation action "replace" is now "compile"
* Updated SASS / SCSS compiler to 3.2.9
* Updated LESS compiler to 1.4.0
* Updated CoffeeScript compiler to 1.6.3
* Fixed issue where custom compilers where ignored

### 0.2.2
OCT 11, 2012

* Updated SASS / SCSS compiler to 3.2.1
* Fixed issue where directories where parsed even if not marked for compression
* Added hooks

### 0.2.1
SEP 28, 2012

* Image compression (optipng and jpegoptim)
* Output JSON through `-j` or `--json`
* Output tokens through `-t` or `--tokens`

### 0.2.0
SEP 24, 2012

* Multiple Build Orders
* Build Order linkage (multiple execution)
* Quiet `-q` mode
* Less aggressive error reports
* Even more clever watch-mode
* Completely rewritten source
* Modular configuration
* Better output type pattern
* Elaborated schematic output
