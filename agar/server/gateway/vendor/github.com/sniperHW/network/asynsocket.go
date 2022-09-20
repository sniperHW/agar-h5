package network

import (
	"errors"
	"net"
	"sync"
	"sync/atomic"
	"time"

	"github.com/sniperHW/network/poolbuff"
)

var (
	ErrRecvTimeout     error = errors.New("RecvTimeout")
	ErrSendTimeout     error = errors.New("SendTimeout")
	ErrAsynSendTimeout error = errors.New("ErrAsynSendTimeout")
	ErrSocketClosed    error = errors.New("SocketClosed")
	ErrSendBusy        error = errors.New("ErrSendBusy")
)

var MaxSendBlockSize int = 65535

type AsynSocketOption struct {
	Decoder          ObjDecoder
	Packer           ObjPacker
	CloseCallBack    func(*AsynSocket, error)
	SendChanSize     int
	HandlePakcet     func(*AsynSocket, interface{})
	OnRecvTimeout    func(*AsynSocket)
	AsyncSendTimeout time.Duration
	PackBuffer       PackBuffer
}

type defaultPacker struct {
}

func (de *defaultPacker) Pack(buff []byte, o interface{}) []byte {
	if b, ok := o.([]byte); ok {
		return append(buff, b...)
	} else {
		return buff
	}
}

type defalutDecoder struct {
}

func (dd *defalutDecoder) Decode(buff []byte) (interface{}, error) {
	packet := make([]byte, len(buff))
	copy(packet, buff)
	return packet, nil
}

//每发送一个对象，都将产生一次Send系统调用，对于大量小对象的情况将严重影响效率
//
//更合理做法是提供一个缓冲区，将待发送对象pack到缓冲区中，当缓冲区累积到一定数量
//
//或后面没有待发送对象，再一次情况将整个缓冲区交给Send
//
//PackBuffer是这种缓冲区的一个接口抽象，可根据具体需要实现PackBuffer
type PackBuffer interface {
	//pack用的缓冲区
	GetBuffer() []byte

	//pack完成后,将更新后的缓冲区交给PackBuffer更新内部缓冲区
	//
	//下次再调用GetBuffer将返回更新后的缓冲区
	OnUpdate([]byte) []byte

	//buff使用完毕后释放
	ReleaseBuffer()

	//sender退出时调用，如果内部buff是从pool获取的,Clear应该将buff归还pool
	Clear()

	ResetBuffer()
}

//asynchronize encapsulation for Socket
type AsynSocket struct {
	socket           Socket
	decoder          ObjDecoder
	packer           ObjPacker
	die              chan struct{}
	recvReq          chan time.Time
	sendReq          chan interface{}
	recvOnce         sync.Once
	sendOnce         sync.Once
	routineCount     int32
	closeOnce        sync.Once
	closeReason      atomic.Value
	doCloseOnce      sync.Once
	closeCallBack    func(*AsynSocket, error) //call when routineCount trun to zero
	handlePakcet     func(*AsynSocket, interface{})
	onRecvTimeout    func(*AsynSocket)
	asyncSendTimeout time.Duration
	packBuffer       PackBuffer
}

func NewAsynSocket(socket Socket, option AsynSocketOption) (*AsynSocket, error) {
	if nil == socket {
		return nil, errors.New("socket is nil")
	}

	if nil == option.HandlePakcet {
		return nil, errors.New("HandlePakcet is nil")
	}

	if option.SendChanSize <= 0 {
		option.SendChanSize = 1
	}

	s := &AsynSocket{
		socket:           socket,
		decoder:          option.Decoder,
		packer:           option.Packer,
		closeCallBack:    option.CloseCallBack,
		die:              make(chan struct{}),
		recvReq:          make(chan time.Time, 1),
		handlePakcet:     option.HandlePakcet,
		asyncSendTimeout: option.AsyncSendTimeout,
		onRecvTimeout:    option.OnRecvTimeout,
		packBuffer:       option.PackBuffer,
	}

	if nil == s.decoder {
		s.decoder = &defalutDecoder{}
	}
	if nil == s.packer {
		s.packer = &defaultPacker{}
	}
	if nil == s.closeCallBack {
		s.closeCallBack = func(*AsynSocket, error) {
		}
	}
	if nil == s.onRecvTimeout {
		s.onRecvTimeout = func(*AsynSocket) {
			s.Close(ErrRecvTimeout)
		}
	}
	if nil == s.packBuffer {
		s.packBuffer = poolbuff.New()
	}

	if option.SendChanSize > 0 {
		s.sendReq = make(chan interface{}, option.SendChanSize)
	} else {
		s.sendReq = make(chan interface{})
	}

	return s, nil
}

func (s *AsynSocket) GetUnderSocket() Socket {
	return s.socket
}

func (s *AsynSocket) LocalAddr() net.Addr {
	return s.socket.LocalAddr()
}

func (s *AsynSocket) RemoteAddr() net.Addr {
	return s.socket.RemoteAddr()
}

func (s *AsynSocket) SetUserData(ud interface{}) {
	s.socket.SetUserData(ud)
}

func (s *AsynSocket) GetUserData() interface{} {
	return s.socket.GetUserData()
}

func (s *AsynSocket) GetUnderConn() interface{} {
	return s.socket.GetUnderConn()
}

func (s *AsynSocket) doClose() {
	s.doCloseOnce.Do(func() {
		s.socket.Close()
		reason, _ := s.closeReason.Load().(error)
		s.closeCallBack(s, reason)
	})
}

func (s *AsynSocket) Close(err error) {
	s.closeOnce.Do(func() {
		atomic.AddInt32(&s.routineCount, 1) //add 1,to prevent recvloop and sendloop call closeCallBack
		if nil != err {
			s.closeReason.Store(err)
		}
		close(s.die)
		if atomic.AddInt32(&s.routineCount, -1) == 0 {
			go s.doClose()
		}
	})
}

func (s *AsynSocket) getTimeout(timeout []time.Duration) time.Duration {
	if len(timeout) > 0 {
		return timeout[0]
	} else {
		return 0
	}
}

// send a asynchronize recv request
//
// if there is a packet received before timeout,handlePakcet would be call with packet as a parameter
//
// if recevie timeout,on onReceTimeout would be call
//
// if recvReq is full,drop the request
func (s *AsynSocket) Recv(timeout ...time.Duration) {
	s.recvOnce.Do(s.recvloop)
	deadline := time.Time{}
	if t := s.getTimeout(timeout); t > 0 {
		deadline = time.Now().Add(t)
	}
	select {
	case <-s.die:
	case s.recvReq <- deadline:
	default:
	}
}

func (s *AsynSocket) recvloop() {
	atomic.AddInt32(&s.routineCount, 1)
	go func() {
		defer func() {
			if atomic.AddInt32(&s.routineCount, -1) == 0 {
				s.doClose()
			}
		}()

		var (
			buff   []byte
			err    error
			packet interface{}
		)

		for {
			select {
			case <-s.die:
				return
			case deadline := <-s.recvReq:
				buff, err = s.socket.Recv(deadline)
				select {
				case <-s.die:
					return
				default:
					if nil == err {
						packet, err = s.decoder.Decode(buff)
					}
					if nil == err {
						s.handlePakcet(s, packet)
					} else {
						if IsNetTimeoutError(err) {
							s.onRecvTimeout(s)
						} else {
							s.Close(err)
						}
					}
				}
			}
		}
	}()
}

func (s *AsynSocket) send(buff []byte) error {
	deadline := time.Time{}
	if s.asyncSendTimeout > 0 {
		deadline = time.Now().Add(s.asyncSendTimeout)
	}
	if _, err := s.socket.Send(buff, deadline); nil != err {
		if IsNetTimeoutError(err) {
			err = ErrAsynSendTimeout
		}
		return err
	} else {
		return nil
	}
}

func (s *AsynSocket) sendloop() {
	atomic.AddInt32(&s.routineCount, 1)
	go func() {
		var err error
		defer func() {
			if atomic.AddInt32(&s.routineCount, -1) == 0 {
				s.doClose()
			}
			s.packBuffer.Clear()
		}()
		for {
			select {
			case <-s.die:
				for len(s.sendReq) > 0 {
					o := <-s.sendReq
					buff := s.packBuffer.OnUpdate(s.packer.Pack(s.packBuffer.GetBuffer(), o))
					if len(buff) >= MaxSendBlockSize {
						if s.send(buff) != nil {
							return
						} else {
							s.packBuffer.ResetBuffer()
						}
					}
				}

				if buff := s.packBuffer.GetBuffer(); len(buff) > 0 {
					s.send(buff)
				}
				return
			case o := <-s.sendReq:
				buff := s.packBuffer.OnUpdate(s.packer.Pack(s.packBuffer.GetBuffer(), o))
				l := len(buff)
				if l >= MaxSendBlockSize || (l > 0 && len(s.sendReq) == 0) {
					if err = s.send(buff); nil != err {
						s.Close(err)
						return
					}
					s.packBuffer.ReleaseBuffer()
				}
			}
		}
	}()
}

func (s *AsynSocket) Send(o interface{}, timeout ...time.Duration) error {
	s.sendOnce.Do(s.sendloop)
	if t := s.getTimeout(timeout); t == 0 {
		//if senReq has no space wait forever
		select {
		case <-s.die:
			return ErrSocketClosed
		case s.sendReq <- o:
			return nil
		}
	} else if t > 0 {
		//if sendReq has no space,wait until deadline
		ticker := time.NewTicker(t)
		defer ticker.Stop()
		select {
		case <-s.die:
			return ErrSocketClosed
		case <-ticker.C:
			return ErrSendTimeout
		case s.sendReq <- o:
			return nil
		}
	} else {
		//if sendReq has no space,return busy
		select {
		case <-s.die:
			return ErrSocketClosed
		case s.sendReq <- o:
			return nil
		default:
			return ErrSendBusy
		}
	}
}
