package netgo

import (
	"github.com/xtaci/smux"
)

type stream struct {
	socketBase
}

var _ Socket = &stream{}

func NewStream(conn *smux.Stream, packetReceiver ...PacketReceiver) Socket {
	s := &stream{}
	s.init(conn, packetReceiver...)
	return s
}
