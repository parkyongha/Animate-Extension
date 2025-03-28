// 소켓 서버접속
// 현재 실행 중인 JSFL 스크립트의 파일명(확장자 제외)만 가져오는 예시 코드입니다.
var message = Animate_C_Extension.startSocketClient();

const responsePrefix = "response:";

fl.trace(message);

var scriptURI = fl.scriptURI;
var scriptPath = FLfile.uriToPlatformPath(scriptURI); // URI -> 플랫폼 경로로 변환

// Windows 기준으로 경로를 나누어 마지막 요소가 실제 파일명
var pathSegments = scriptPath.split("\\");
var fileName = pathSegments[pathSegments.length - 1];

// .jsfl 확장자 제거
fileName = fileName.replace(/\.jsfl$/i, "");

var msg = Animate_C_Extension.getMessage(fileName);
fl.trace(msg);



Animate_C_Extension.sendMessage(responsePrefix + "true");