// =============================================================================
// VALIDATION
// =============================================================================
(function(output){

    function compiler(data) {
        return (data.executable != null);
    }

    output.compiler = compiler;

})(exports);