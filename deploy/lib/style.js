// =============================================================================
// STYLE
// =============================================================================
(function(output){

    var decoration = {
            "clear"      : "0",
            "bold"       : "1",
            "italic"     : "3",
            "underscore" : "4",
            "blink"      : "5",
            "inverse"    : "7",
            "conceal"    : "8"
        },
        foreground = {
            "black"     : "30",
            "red"       : "31",
            "green"     : "32",
            "yellow"    : "33",
            "blue"      : "34",
            "magenta"   : "35",
            "cyan"      : "36",
            "white"     : "37",
            "grey"      : "90"
        },
        background = {
            "black"     : "40",
            "red"       : "41",
            "green"     : "42",
            "yellow"    : "43",
            "blue"      : "44",
            "magenta"   : "45",
            "cyan"      : "46",
            "white"     : "47",
        }

    function colorize(input, color, bg, style) {

        var result = "",
            combo  = [];

        if (!!bg) {

            result += "\033[" + background[bg] + "m";

        }


        if (!!style) {

            combo.push(decoration[style]);

        }

        if (!!color) {

            combo.push(foreground[color]);

        }

        result += "\033[" + combo.join(";") + "m";

        return result + input + "\033[" + decoration.clear + "m";

    }

    function bold(input) {
        return colorize(input, null, null, "bold");
    }

    output.bold = bold;
    output.colorize = colorize;


})(exports);