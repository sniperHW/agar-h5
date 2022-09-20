package network

import (
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

//convert obj from binary buff
type ObjDecoder interface {
	Decode([]byte) (interface{}, error)
}

//converto obj to binary packet for send
type ObjPacker interface {

	// Example:
	//
	// Pack(buff []byte, o interface{}) ([]byte,error) {
	//	if b,err := encode2Packet(o) {
	//		return append(buff,b...)
	//	} else {
	//		return buff
	//	}
	//}
	Pack([]byte, interface{}) []byte
}

type ReadAble interface {
	Read([]byte) (int, error)
	SetReadDeadline(time.Time) error
}

//recv a completely packet from ReadAble
type PacketReceiver interface {
	Recv(ReadAble, time.Time) ([]byte, error)
}

//interface for stream oriented socket
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

//default PacketReceiver,all data from each read is returned as a packet
func (dr *defaultPacketReceiver) Recv(r ReadAble, deadline time.Time) ([]byte, error) {
	var (
		n   int
		err error
	)

	buff := make([]byte, 4096)

	if deadline.IsZero() {
		r.SetReadDeadline(time.Time{})
		n, err = r.Read(buff)
	} else {
		r.SetReadDeadline(deadline)
		n, err = r.Read(buff)
	}
	return buff[:n], err
}
