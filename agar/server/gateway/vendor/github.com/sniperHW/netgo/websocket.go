package netgo

import (
	"io"
	"net"
	"sync"
	"sync/atomic"
	"time"

	gorilla "github.com/gorilla/websocket"
)

type webSocket struct {
	userData       atomic.Value
	packetReceiver PacketReceiver
	conn           *gorilla.Conn
	reader         io.Reader
	closeOnce      sync.Once
}

var _ Socket = &webSocket{}

func (wc *webSocket) Read(buff []byte) (n int, err error) {
	for {
		if wc.reader == nil {
			_, wc.reader, err = wc.conn.NextReader()
			if err != nil {
				return 0, err
			}
		}

		n, err = wc.reader.Read(buff)
		if err != nil && err != io.EOF {
			return n, err
		} else if err == io.EOF {
			wc.reader = nil
		} else if n > 0 {
			break
		}
	}

	return n, nil
}

func (wc *webSocket) SetReadDeadline(deadline time.Time) error {
	return wc.conn.SetReadDeadline(deadline)
}

func (wc *webSocket) LocalAddr() net.Addr {
	return wc.conn.LocalAddr()
}

func (wc *webSocket) RemoteAddr() net.Addr {
	return wc.conn.RemoteAddr()
}

func (wc *webSocket) SetUserData(ud interface{}) {
	wc.userData.Store(userdata{
		data: ud,
	})
}

func (wc *webSocket) GetUserData() interface{} {
	if ud, ok := wc.userData.Load().(userdata); ok {
		return ud.data
	} else {
		return nil
	}
}

func (wc *webSocket) GetUnderConn() interface{} {
	return wc.conn
}

func (wc *webSocket) Close() {
	wc.closeOnce.Do(func() {
		wc.conn.SetWriteDeadline(time.Now().Add(time.Second))
		wc.conn.WriteMessage(gorilla.CloseMessage, gorilla.FormatCloseMessage(gorilla.CloseNormalClosure, ""))
		wc.conn.Close()
	})
}

func (wc *webSocket) Send(data []byte, deadline ...time.Time) (int, error) {
	var err error
	d := time.Time{}
	if len(deadline) > 0 && !deadline[0].IsZero() {
		d = deadline[0]
	}

	if err = wc.conn.SetWriteDeadline(d); err != nil {
		return 0, err
	} else if err = wc.conn.WriteMessage(gorilla.BinaryMessage, data); err != nil {
		return 0, err
	} else {
		return len(data), nil
	}
}

func (wc *webSocket) Recv(deadline ...time.Time) (packet []byte, err error) {
	if len(deadline) > 0 && !deadline[0].IsZero() {
		packet, err = wc.packetReceiver.Recv(wc, deadline[0])
	} else {
		packet, err = wc.packetReceiver.Recv(wc, time.Time{})
	}
	return
}

func NewWebSocket(conn *gorilla.Conn, packetReceiver ...PacketReceiver) Socket {
	ws := &webSocket{
		conn: conn,
	}
	if len(packetReceiver) == 0 || packetReceiver[0] == nil {
		ws.packetReceiver = &defaultPacketReceiver{}
	} else {
		ws.packetReceiver = packetReceiver[0]

	}
	return ws
}
