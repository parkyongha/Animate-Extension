var doc = fl.getDocumentDOM();

if (!doc) {
	fl.trace("문서를 먼저 열어주세요.");
}

main();

function main() {
	if (gotoMainTimeline() == false) {
		return;
	}

	var fileInfo = loadFiles();

	applyScript(fileInfo);
}

function loadFiles() {
	var fileInfo = {
		actionsPath: "",
		scripts: []
	}

	var path = doc.path;

	var parts = path.split("\\");
	var remainingParts = null;

	path = path.toLowerCase();

	if (path.indexOf(".xfl") !== -1) {
		fl.trace("현재 열린 파일은 XFL 형식입니다.");
		remainingParts = parts.slice(0, parts.length - 2);

	} else if (path.indexOf(".fla") !== -1) {
		fl.trace("현재 열린 파일은 FLA 형식입니다.");
		remainingParts = parts.slice(0, parts.length - 1);
	}

	fileInfo.actionsPath = remainingParts.join("\\") + "\\actions\\";

	fl.trace(fileInfo.actionsPath);

	fileInfo.scripts = FLfile.listFolder(convertWindowsPathToURI(fileInfo.actionsPath), "files");
	fl.trace(fileInfo.scripts);

	return fileInfo;
}

function applyScript(fileInfo) {

	fileInfo.scripts.forEach(function (actionFile) {
		fl.trace("파싱할 Script : " + actionFile);

		if (actionFile.lastIndexOf(".js") == -1) {
			return;
		}



		// 확장자 제거
		var actionFileName = actionFile.slice(0, -3);

		fl.trace(actionFileName);

		// 파일명 파싱 '심볼경로-레이어-프레임번호' 식으로 구성되어 있음
		var actionSep = actionFileName.split("-");

		// 심볼 경로를 구분하기 위해 넣어두었던 구분자를 다시 / 로 바꿈
		var symbolPath = actionSep[0].replace(/_#SS_/g, "/");
		var targetLayer = actionSep[1];
		var frame = actionSep[2];


		if (symbolPath == "Main")
			gotoMainTimeline();
		else
			doc.library.editItem(symbolPath);

		fl.trace("symbolPath : " + symbolPath);

		fl.trace("targetLayer : " + targetLayer);

		var timeline = doc.getTimeline();

		var layers = timeline.layers;

		var selectedLayer = layers.filter(function (layer) {
			fl.trace("레이어 이름 : " + layer.name);
			return (layer.name === targetLayer) && layer.layerType === "normal";
		})[0];

		fl.trace("layer : " + selectedLayer.name);
		fl.trace("frame : " + frame);

		var script = FLfile.read(convertWindowsPathToURI(fileInfo.actionsPath + actionFile));

		if (script) {
			fl.trace("성공 test : " + selectedLayer.frames.length);
			fl.trace("script : " + script);

			selectedLayer.frames[frame].actionScript = script;
		}
	});
}

// Windows 경로를 파일 URL 형식으로 변환하는 함수
function convertWindowsPathToURI(winPath) {
	var uri = winPath.replace(/\\/g, "/");
	if (uri.charAt(1) === ":") {
		uri = "file:///" + uri.charAt(0) + "|" + uri.substring(2);
	} else {
		uri = "file:///" + uri;
	}
	return uri;
}

function gotoMainTimeline() {
	var libraryItems = doc.library.items;
	var movieClipFound = false;

	// 라이브러리 항목 순회
	for (var i = 0; i < libraryItems.length; i++) {
		var item = libraryItems[i];
		if (item.itemType === "movie clip") {
			movieClipFound = true;
			var clipName = item.name;

			doc.library.editItem(clipName);

			break;
		}
	}

	if (!movieClipFound) {
		return false;
	}


	doc.exitEditMode();

	return true;
}