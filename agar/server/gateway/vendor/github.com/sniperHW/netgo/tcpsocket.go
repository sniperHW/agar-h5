package netgo

import (
	"net"
	"time"
)

type tcpSocket struct {
	socketBase
}

func (tc *tcpSocket) SendBuffers(buffs net.Buffers, deadline ...time.Time) (int64, error) {
	d := time.Time{}
	if len(deadline) > 0 && !deadline[0].IsZero() {
		d = deadline[0]
	}
	if err := tc.conn.SetWriteDeadline(d); err != nil {
		return 0, err
	} else {
		return buffs.WriteTo(tc.conn.(*net.TCPConn))
	}
}

var _ Socket = &tcpSocket{}

func NewTcpSocket(conn *net.TCPConn, packetReceiver ...PacketReceiver) Socket {
	s := &tcpSocket{}
	s.init(conn, packetReceiver...)
	return s
}

func ListenTCP(nettype string, service string, onNewclient func(*net.TCPConn)) (net.Listener, func(), error) {
	tcpAddr, err := net.ResolveTCPAddr(nettype, service)
	if nil != err {
		return nil, nil, err
	}
	listener, err := net.ListenTCP(nettype, tcpAddr)
	if nil != err {
		return nil, nil, err
	}

	serve := func() {
		for {
			conn, e := listener.Accept()
			if e == nil {
				onNewclient(conn.(*net.TCPConn))
			} else if ne, ok := e.(*net.OpError); ok && ne.Temporary() {
				time.Sleep(time.Millisecond * 10)
				continue
			} else {
				return
			}
		}
	}

	return listener, serve, nil

}
