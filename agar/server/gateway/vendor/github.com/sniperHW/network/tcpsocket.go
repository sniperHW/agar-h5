package network

import (
	"errors"
	"net"
	"runtime"
	"sync"
	"sync/atomic"
	"time"
)

type tcpSocket struct {
	userData       atomic.Value
	packetReceiver PacketReceiver
	conn           net.Conn
	closeOnce      sync.Once
}

func (tc *tcpSocket) LocalAddr() net.Addr {
	return tc.conn.LocalAddr()
}

func (tc *tcpSocket) RemoteAddr() net.Addr {
	return tc.conn.RemoteAddr()
}

func (tc *tcpSocket) SetUserData(ud interface{}) {
	tc.userData.Store(userdata{
		data: ud,
	})
}

func (tc *tcpSocket) GetUserData() interface{} {
	if ud, ok := tc.userData.Load().(userdata); ok {
		return ud
	} else {
		return nil
	}
}

func (tc *tcpSocket) GetUnderConn() interface{} {
	return tc.conn
}

func (tc *tcpSocket) Close() {
	tc.closeOnce.Do(func() {
		runtime.SetFinalizer(tc, nil)
		tc.conn.Close()
	})
}

func (tc *tcpSocket) Send(data []byte, deadline ...time.Time) (int, error) {
	if len(deadline) > 0 && !deadline[0].IsZero() {
		tc.conn.SetWriteDeadline(deadline[0])
		n, err := tc.conn.Write(data)
		return n, err
	} else {
		tc.conn.SetWriteDeadline(time.Time{})
		return tc.conn.Write(data)
	}
}

func (tc *tcpSocket) Recv(deadline ...time.Time) ([]byte, error) {
	if len(deadline) > 0 && !deadline[0].IsZero() {
		return tc.packetReceiver.Recv(tc.conn, deadline[0])
	} else {
		return tc.packetReceiver.Recv(tc.conn, time.Time{})
	}
}

func NewTcpSocket(conn net.Conn, packetReceiver ...PacketReceiver) (Socket, error) {
	if nil == conn {
		return nil, errors.New("conn is nil")
	}

	switch conn.(type) {
	case *net.TCPConn:
	default:
		return nil, errors.New("conn should be TCPConn")
	}

	s := &tcpSocket{
		conn: conn,
	}

	if len(packetReceiver) == 0 || packetReceiver[0] == nil {
		s.packetReceiver = &defaultPacketReceiver{}
	} else {
		s.packetReceiver = packetReceiver[0]
	}

	runtime.SetFinalizer(s, func(s *tcpSocket) {
		s.Close()
	})

	return s, nil
}
