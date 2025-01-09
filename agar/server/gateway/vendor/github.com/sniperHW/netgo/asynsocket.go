package netgo

import (
	"context"
	"errors"
	"net"
	"sync"
	"sync/atomic"
	"time"

	"github.com/sniperHW/netgo/poolbuff"
)

var (
	ErrRecvTimeout            error = errors.New("recvTimeout")
	ErrPushToSendQueueTimeout error = errors.New("pushToSendQueueTimeout")
	ErrSendQueueFull          error = errors.New("sendQueueFull")
	ErrAsynSendTimeout        error = errors.New("asynSendTimeout")
	ErrSocketClosed           error = errors.New("socketClosed")
)

var MaxSendBlockSize int = 65535

type ObjCodec interface {
	Decode([]byte) (interface{}, error)
	Encode(net.Buffers, interface{}) (net.Buffers, int)
}

type AsynSocketOption struct {
	Codec            ObjCodec
	SendChanSize     int
	AsyncSendTimeout time.Duration
	AutoRecv         bool          //处理完packet后自动调用Recv
	AutoRecvTimeout  time.Duration //自动调用Recv时的超时时间
	Context          context.Context
}

type defaultCodec struct {
}

func (codec *defaultCodec) Encode(buffs net.Buffers, o interface{}) (net.Buffers, int) {
	if b, ok := o.([]byte); ok {
		return append(buffs, b), len(b)
	} else {
		return buffs, 0
	}
}

func (codec *defaultCodec) Decode(buff []byte) (interface{}, error) {
	packet := make([]byte, len(buff))
	copy(packet, buff)
	return packet, nil
}

type wrCounter struct {
	sync.Mutex
	w int
	r int
}

func (c *wrCounter) addW(v int) (w int, r int) {
	c.Lock()
	c.w += v
	w = c.w
	r = c.r
	c.Unlock()
	return w, r
}

func (c *wrCounter) addR(v int) (w int, r int) {
	c.Lock()
	c.r += v
	w = c.w
	r = c.r
	c.Unlock()
	return w, r
}

func (c *wrCounter) getWR() (w int, r int) {
	c.Lock()
	w = c.w
	r = c.r
	c.Unlock()
	return w, r
}

// asynchronize encapsulation for Socket
type AsynSocket struct {
	socket           Socket
	codec            ObjCodec
	die              chan struct{}
	recvReq          chan time.Time
	sendReq          chan interface{}
	sendOnce         sync.Once
	recvOnce         sync.Once
	wrCounter        wrCounter
	closeOnce        sync.Once
	closeReason      atomic.Value
	doCloseOnce      sync.Once
	closeCallBack    atomic.Value //func(*AsynSocket, error),call when wrCounter.w == 0 && wrCounter.r == 0
	handlePakcet     atomic.Value //func(context.Context, *AsynSocket, interface{}) error
	onRecvTimeout    atomic.Value //func(*AsynSocket)
	asyncSendTimeout time.Duration
	autoRecv         bool
	autoRecvTimeout  time.Duration
	context          context.Context
}

func NewAsynSocket(socket Socket, option AsynSocketOption) *AsynSocket {

	if option.SendChanSize <= 0 {
		option.SendChanSize = 1
	}

	s := &AsynSocket{
		socket:           socket,
		die:              make(chan struct{}),
		recvReq:          make(chan time.Time, 1),
		sendReq:          make(chan interface{}, option.SendChanSize),
		asyncSendTimeout: option.AsyncSendTimeout,
		autoRecv:         option.AutoRecv,
		autoRecvTimeout:  option.AutoRecvTimeout,
		codec:            option.Codec,
		context:          option.Context,
	}

	if s.codec == nil {
		s.codec = &defaultCodec{}
	}

	if s.context == nil {
		s.context = context.Background()
	}

	s.closeCallBack.Store(func(*AsynSocket, error) {

	})

	s.onRecvTimeout.Store(func(*AsynSocket) {
		s.close(ErrRecvTimeout, false)
	})

	s.handlePakcet.Store(func(context.Context, *AsynSocket, interface{}) error {
		s.Recv()
		return nil
	})

	return s
}

func (s *AsynSocket) SetCloseCallback(closeCallBack func(*AsynSocket, error)) *AsynSocket {
	if closeCallBack != nil {
		s.closeCallBack.Store(closeCallBack)
	}
	return s
}

func (s *AsynSocket) SetRecvTimeoutCallback(onRecvTimeout func(*AsynSocket)) *AsynSocket {
	if onRecvTimeout != nil {
		s.onRecvTimeout.Store(onRecvTimeout)
	}
	return s
}

// make sure to SetPacketHandler before the first Recv
//
// after Recv start recvloop, packethandler can't be change anymore
func (s *AsynSocket) SetPacketHandler(handlePakcet func(context.Context, *AsynSocket, interface{}) error) *AsynSocket {
	if handlePakcet != nil {
		s.handlePakcet.Store(handlePakcet)
	}
	return s
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
	once := false
	s.doCloseOnce.Do(func() {
		once = true
	})
	if once {
		s.socket.Close()
		reason, _ := s.closeReason.Load().(error)
		s.closeCallBack.Load().(func(*AsynSocket, error))(s, reason)
	}
}

func (s *AsynSocket) close(err error, closeBySendRoutine bool) {
	s.closeOnce.Do(func() {
		if nil != err {
			s.closeReason.Store(err)
		}
		close(s.die)
		if closeBySendRoutine {
			s.socket.Close()
		}
	})
}

func (s *AsynSocket) Close(err error) {
	s.closeOnce.Do(func() {
		if nil != err {
			s.closeReason.Store(err)
		}
		close(s.die)
		w, r := s.wrCounter.getWR()
		if w == 0 {
			if r == 0 {
				//读写routine均未启动,直接doClose
				go s.doClose()
			} else {
				//写routine尚未启动，读routine可能阻塞在s.socket.Recv(deadline),调用Close以解除可能的阻塞
				s.socket.Close()
			}
		}
	})
}

// send a asynchronize recv request
//
// if there is a packet received before timeout,handlePakcet would be call with packet as a parameter
//
// if recevie timeout,on onReceTimeout would be call
//
// if recvReq is full,drop the request
func (s *AsynSocket) Recv(deadline ...time.Time) *AsynSocket {
	s.recvOnce.Do(s.recvloop)
	d := time.Time{}
	if len(deadline) > 0 {
		d = deadline[0]
	}
	select {
	case <-s.die:
	case s.recvReq <- d:
	default:
	}
	return s
}

func (s *AsynSocket) recvloop() {
	s.wrCounter.addR(1)
	packetHandler := s.handlePakcet.Load().(func(context.Context, *AsynSocket, interface{}) error)
	go func() {
		defer func() {
			w, _ := s.wrCounter.addR(-1)
			if w == 0 {
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
						packet, err = s.codec.Decode(buff)
					}
					if nil == err {
						if err = packetHandler(s.context, s, packet); err != nil {
							s.close(err, false)
							return
						}
					} else if IsNetTimeoutError(err) {
						s.onRecvTimeout.Load().(func(*AsynSocket))(s)
					} else {
						s.close(err, false)
						return
					}

					if s.autoRecv {
						var readdeadline time.Time
						if s.autoRecvTimeout > 0 {
							readdeadline = time.Now().Add(s.autoRecvTimeout)
						}
						select {
						case s.recvReq <- readdeadline:
						default:
						}
					}
				}
			}
		}
	}()
}

func (s *AsynSocket) sendBuffs(buffs net.Buffers) (err error) {
	deadline := time.Time{}
	if s.asyncSendTimeout > 0 {
		deadline = time.Now().Add(s.asyncSendTimeout)
	}

	if buffersSender, ok := s.socket.(BuffersSender); ok {
		_, err = buffersSender.SendBuffers(buffs, deadline)
	} else {
		outputBuffer := poolbuff.Get()
		defer poolbuff.Put(outputBuffer)
		for _, v := range buffs {
			outputBuffer = append(outputBuffer, v...)
		}
		_, err = s.socket.Send(outputBuffer, deadline)
	}

	if nil != err && IsNetTimeoutError(err) {
		err = ErrAsynSendTimeout
	}

	return err
}

func (s *AsynSocket) sendloop() {
	s.wrCounter.addW(1)
	go func() {
		var (
			err error
		)
		defer func() {
			_, r := s.wrCounter.addW(-1)
			if r == 0 {
				s.doClose()
			} else {
				//recvloop可能阻塞在s.socket.Recv(deadline),close socket让调用返回错误
				s.socket.Close()
			}
		}()

		maxBuffSize := 1024
		total := 0
		n := 0
		buffs := make(net.Buffers, 0, 8)
		for {
			select {
			case <-s.die:
				for len(s.sendReq) > 0 {
					o := <-s.sendReq
					buffs, n = s.codec.Encode(buffs, o)
					total += n
					if total >= MaxSendBlockSize || len(buffs) >= maxBuffSize {
						if s.sendBuffs(buffs) != nil {
							return
						} else {
							buffs = buffs[:0]
							total = 0
						}
					}
				}

				if total > 0 {
					s.sendBuffs(buffs)
				}
				return
			case o := <-s.sendReq:
				buffs, n = s.codec.Encode(buffs, o)
				total += n
				if (total >= MaxSendBlockSize || len(buffs) >= maxBuffSize) || (total > 0 && len(s.sendReq) == 0) {
					if err = s.sendBuffs(buffs); nil != err {
						s.close(err, true)
						return
					}
					if cap(buffs) < 64 {
						for i := 0; i < len(buffs); i++ {
							buffs[i] = nil
						}
						buffs = buffs[:0]
					} else {
						buffs = make(net.Buffers, 0, 8)
					}
					total = 0
				}
			}
		}
	}()
}

func (s *AsynSocket) getTimeout(deadline []time.Time) time.Duration {
	if len(deadline) > 0 {
		if deadline[0].IsZero() {
			return -1
		} else {
			return time.Until(deadline[0])
		}
	} else {
		return 0
	}
}

// deadline: 如果不传递，当发送chan满一直等待
// deadline.IsZero() || deadline.Before(time.Now):当chan满立即返回ErrSendBusy
// 否则当发送chan满等待到deadline,返回ErrPushToSendQueueTimeout
func (s *AsynSocket) Send(o interface{}, deadline ...time.Time) error {
	s.sendOnce.Do(s.sendloop)
	if timeout := s.getTimeout(deadline); timeout == 0 {
		//if senReq has no space wait forever
		select {
		case <-s.die:
			return ErrSocketClosed
		case s.sendReq <- o:
			return nil
		}
	} else if timeout > 0 {
		//if sendReq has no space,wait until deadline
		ticker := time.NewTicker(timeout)
		defer ticker.Stop()
		select {
		case <-s.die:
			return ErrSocketClosed
		case <-ticker.C:
			return ErrPushToSendQueueTimeout
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
			return ErrSendQueueFull
		}
	}
}

func (s *AsynSocket) SendWithContext(ctx context.Context, o interface{}) error {
	s.sendOnce.Do(s.sendloop)
	select {
	case <-s.die:
		return ErrSocketClosed
	case s.sendReq <- o:
		return nil
	case <-ctx.Done():
		return ctx.Err()
	}
}
