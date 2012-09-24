#### Packaged Compilers

Rocket comes with a collection of commonly used compilers for your convenience. Furthermore, these compilers are automatically selected and employed by the following schema:

| ID            | Task             | invoke by                       |
| :------------ | :--------------- | :------------------------------ |
| uglify        | Minify           | `{minify: true}` on .js output  |
| yuicompressor | Minify           | `{minify: true}` on .css output |
| closure       | Minify           | `{compiler: "closure"}`         |
| coffeescript  | Compile .coffee  | *.coffee as input               |
| less          | Compile .less    | *.less as input                 |
| scss          | Compile .scss    | *.scss as input                 |
| sass          | Compile .sass    | *.sass as input                 |