var scriptURIPath = fl.scriptURI.split("/");

var remainingParts =  scriptURIPath.slice(0, scriptURIPath.length - 1);

fl.trace(remainingParts.join("/"))

var _applyScriptPath = remainingParts.join("/") + "/Apply Script.jsfl";
var _publishScriptPath = remainingParts.join("/") + "/publish.jsfl";

fl.runScript(_applyScriptPath);
fl.runScript(_publishScriptPath);