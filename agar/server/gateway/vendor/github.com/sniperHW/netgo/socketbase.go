package netgo

import (
	"net"
	"sync"
	"sync/atomic"
	"time"
)

// base of kcpSocket/tcpSocket/unixSocket
type socketBase struct {
	userData       atomic.Value
	packetReceiver PacketReceiver
	conn           net.Conn
	closeOnce      sync.Once
}

func (base *socketBase) init(conn net.Conn, packetReceiver ...PacketReceiver) {
	base.conn = conn
	if len(packetReceiver) == 0 || packetReceiver[0] == nil {
		base.packetReceiver = &defaultPacketReceiver{}
	} else {
		base.packetReceiver = packetReceiver[0]
	}
}

func (base *socketBase) GetUnderConn() interface{} {
	return base.conn
}

func (base *socketBase) Close() {
	base.closeOnce.Do(func() {
		base.conn.Close()
	})
}

func (base *socketBase) LocalAddr() net.Addr {
	return base.conn.LocalAddr()
}

func (base *socketBase) RemoteAddr() net.Addr {
	return base.conn.RemoteAddr()
}

func (base *socketBase) SetUserData(ud interface{}) {
	base.userData.Store(userdata{
		data: ud,
	})
}

func (base *socketBase) GetUserData() interface{} {
	if ud, ok := base.userData.Load().(userdata); ok {
		return ud.data
	} else {
		return nil
	}
}

func (base *socketBase) Send(data []byte, deadline ...time.Time) (int, error) {
	d := time.Time{}
	if len(deadline) > 0 && !deadline[0].IsZero() {
		d = deadline[0]
	}
	if err := base.conn.SetWriteDeadline(d); err != nil {
		return 0, err
	} else {
		return base.conn.Write(data)
	}
}

func (base *socketBase) Recv(deadline ...time.Time) ([]byte, error) {
	if len(deadline) > 0 && !deadline[0].IsZero() {
		return base.packetReceiver.Recv(base.conn, deadline[0])
	} else {
		return base.packetReceiver.Recv(base.conn, time.Time{})
	}
}
