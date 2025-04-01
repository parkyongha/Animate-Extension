# Animate Extension Change Log

### Ver 0.0.7

#### 신규 기능

1. **robotjs를 활용한 JSFL 자동 실행 기능 추가**
   - JSFL 실행 시 경고창이 나타나더라도 자동으로 처리되도록 개선하였습니다.
   - 키보드 명령을 통해 'Run as Command'를 선택한 후 자동 실행합니다.

2. **Apply Script Dirty 적용**
   - VS Code에서 코드가 수정될 때 Dirty 상태를 감지하여, 해당 정보를 script_setting.xml에 저장하도록 개선하였습니다. 이로써 Apply Script 실행 시 Dirty 상태가 true인 스크립트만 적용되어, 변경된 부분에 한정된 스크립트 업데이트가 이루어지도록 최적화하였습니다.


#### 기존 기능 수정

1. **MovieClip.Html 로드 방식 최적화**
   - 기존에 jsdom을 사용하여 HTML을 파싱하던 방식을 cheerio 기반으로 변경하여, HTML 로딩 및 파싱 속도를 크게 개선하였습니다.

2. **JSFL 실행 로그 개선**
   - Apply Script 실행 시 적용된 스크립트 파일명과 실패한 스크립트 파일명을 명확하게 구분하도록 수정하였습니다.
   - 콘솔 로그의 가독성을 향상하였습니다.

#### 버그 수정

1. **Apply Script.jsfl 수정**
   - 스크립트 적용 완료 후 메인 타임라인으로 자동 이동하지 않는 문제를 수정하였습니다.


