package netgo

import (
	"fmt"
	"net"
	"time"
)

func IsNetTimeoutError(err error) bool {
	if e, ok := err.(net.Error); ok && e.Timeout() {
		return true
	} else {
		return false
	}
}

type ReadAble interface {
	Read([]byte) (int, error)
	SetReadDeadline(time.Time) error
}

type BuffersSender interface {
	SendBuffers(net.Buffers, ...time.Time) (int64, error)
}

// recv a completely packet from ReadAble
type PacketReceiver interface {
	Recv(ReadAble, time.Time) ([]byte, error)
}

// interface for stream oriented socket
type Socket interface {

	//request send buff,if send block,wait unitl deadline
	//
	//if send ok return len(buff),nil. else return 0,reason
	//
	//if send is return with timeout,the first return value may more than zero but less then(len(buff))
	Send([]byte, ...time.Time) (int, error)

	//request receive a completely packet,if no packet avaliable,wait until deadline
	Recv(...time.Time) ([]byte, error)

	LocalAddr() net.Addr

	RemoteAddr() net.Addr

	SetUserData(ud interface{})

	GetUserData() interface{}

	GetUnderConn() interface{}

	Close()
}

type userdata struct {
	data interface{}
}

type defaultPacketReceiver struct {
}

// default PacketReceiver,all data from each read is returned as a packet
func (dr *defaultPacketReceiver) Recv(r ReadAble, deadline time.Time) ([]byte, error) {
	var (
		n   int
		err error
	)
	buff := make([]byte, 4096)
	r.SetReadDeadline(deadline)
	n, err = r.Read(buff)
	fmt.Println(n, err)
	return buff[:n], err
}
