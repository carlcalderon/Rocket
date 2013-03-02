## Notation

Rocket (as well as Springboard) provides basic html comment notations to specify inline build actions within files. Rocket recognises both Rocket & Springboard (limited) notation blocks.

### Syntax

```html
<!-- <rocket|sb><@build>: <action> <target|notes> -->
<content>
<!-- end -->
```

### Examples

```html
<!-- rocket: compile js/scripts.js -->
<script type="text/coffeescript" src="coffee/scripts.coffee"></script>
<!-- end -->

<!-- rocket: minify css/styles.css -->
<link rel="stylesheet" type="text/css" href="less/styles.less">
<!-- end -->

<!-- rocket@myBuild: compile js/scripts.js -->
<script type="text/coffeescript" src="coffee/onlyOnMyBuildOrder.coffee"></script>
<!-- end -->

<!-- rocket: remove Debug mode -->
<script type="text/javascript">

    var DEBUG_MODE = true;

</script>
<!-- end -->

<!-- rocket: insert -->
header.html
body.html
footer.html
<!-- end -->
```

### Inline Notation Actions

| Action  | Description                                      |
| :------ | :----------------------------------------------- |
| remove  | Removes the content within the block.            |
| compile | Replaces/compiles either scripts or links (css). |
| concat  | Combines the listed files.                       |
| minify  | As *replace* but also minifies.                  |
| insert  | Reads each separated row as a file to include.   |
