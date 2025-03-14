// server.js
const net = require('net');

const PORT = 50313; // 사용할 포트 번호

function startSocketServer() {

    console.log("서버 열게~");

    // 소켓 서버 생성
    const server = net.createServer((socket) => {
        console.log('클라이언트 연결됨.');

        // 클라이언트로부터 데이터 수신
        socket.on('data', (data) => {
            const message = data.toString().trim();
            console.log(`클라이언트 메시지: ${message}`);

            // 메시지 처리 및 응답 전송 예제
            socket.write('메시지 잘 받았습니다!');
        });

        // 클라이언트 연결 종료 이벤트
        socket.on('end', () => {
            console.log('클라이언트 연결 종료됨.');
        });

        // 오류 처리 (옵션)
        socket.on('error', (err) => {
            console.error('소켓 오류:', err);
        });
    });

    // 서버를 지정된 포트에서 대기 상태로 전환
    server.listen(PORT, () => {
        console.log(`서버가 포트 ${PORT}에서 대기 중입니다.`);
    });

}

module.exports = {
    startSocketServer
};