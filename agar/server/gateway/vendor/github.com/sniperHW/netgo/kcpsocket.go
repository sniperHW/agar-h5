package netgo

import (
	"github.com/xtaci/kcp-go/v5"
)

type kcpSocket struct {
	socketBase
}

var _ Socket = &kcpSocket{}

func NewKcpSocket(conn *kcp.UDPSession, packetReceiver ...PacketReceiver) Socket {
	s := &kcpSocket{}
	s.init(conn, packetReceiver...)
	return s
}
